import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState, useCallback, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FileUpload({ setData, onUpload }) {
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const extractTableFromPDF = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let allRows = [];

        // Basic extraction: assumes table rows are lines of text separated by newlines
        // This is a heuristic and won't work for complex layouts
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Simple strategy: Join strings into one big text and then CSV parse
            // Or just treat lines as potential rows
            const strings = textContent.items.map(item => item.str);
            const pageText = strings.join(" "); // This loses structure often

            // Better strategy: Sort by Y position to find lines
            // But for MVP, let's try to find numeric patterns or just dump text
            // Actually, let's try a row-based reconstruction by Y coord
            const items = textContent.items.map(item => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5]
            }));

            // Group by Y (approximate line detection with tolerance)
            const tolerance = 10; // Increased tolerance for better row detection
            const rows = [];
            items.forEach(item => {
                const existingRow = rows.find(r => Math.abs(r.y - item.y) < tolerance);
                if (existingRow) {
                    existingRow.items.push(item);
                } else {
                    rows.push({ y: item.y, items: [item] });
                }
            });

            // Sort rows top-to-bottom
            rows.sort((a, b) => b.y - a.y);

            // Convert rows to arrays of strings (columns sorted by X)
            const tableData = rows.map(r => {
                r.items.sort((a, b) => a.x - b.x);
                return r.items.map(i => i.str.trim()).filter(s => s);
            }).filter(r => r.length > 0); // Keep rows with even single items to capture data

            // Convert to array of objects object if header exists
            if (tableData.length) {
                allRows = [...allRows, ...tableData];
            }
        }

        console.log("PDF Extracted Rows:", allRows); // Debugging

        if (allRows.length < 2) {
            // Fallback: If we found some text but not structured rows, maybe return a single dummy object so it doesn't fail hard? 
            // Better to fail if we truly can't parse, but let's be lenient.
            console.warn("PDF parsing found few rows", allRows);
            if (allRows.length === 0) return [];
        }

        // Assume first row is header
        const headers = allRows[0];
        const jsonData = allRows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = row[i] || "";
            });
            return obj;
        });

        return jsonData;
    };

    const handleFile = async (file) => {
        if (!file) return;
        setLoading(true);

        const fileType = file.name.split('.').pop().toLowerCase();

        try {
            if (fileType === "csv") {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: res => {
                        setData(res.data);
                        if (onUpload) onUpload(res.data);
                        setLoading(false);
                    },
                    error: (err) => {
                        console.error("CSV Error:", err);
                        alert("Error parsing CSV");
                        setLoading(false);
                    }
                });
            } else if (["xlsx", "xls"].includes(fileType)) {
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        const wb = XLSX.read(e.target.result, { type: "binary" });
                        const sheet = wb.Sheets[wb.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(sheet);
                        setData(jsonData);
                        if (onUpload) onUpload(jsonData);
                    } catch (err) {
                        console.error("Excel Error:", err);
                        alert("Error parsing Excel file");
                    } finally {
                        setLoading(false);
                    }
                };
                reader.readAsBinaryString(file);
            } else if (fileType === "pdf") {
                try {
                    const jsonData = await extractTableFromPDF(file);
                    if (jsonData.length > 0) {
                        setData(jsonData);
                        if (onUpload) onUpload(jsonData);
                    } else {
                        alert("Could not detect structured table data in this PDF. Please try a CSV or Excel file.");
                    }
                } catch (err) {
                    console.error("PDF Error:", err);
                    alert("Error processing PDF. Ensure it contains text-based tables.");
                } finally {
                    setLoading(false);
                }
            } else {
                alert("Unsupported file type. Please upload .csv, .xlsx, or .pdf");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <div
                className={`upload-box ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag} // Fixed event
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <label htmlFor="file-upload" className="upload-label">
                    {loading ? "Processing..." : "Select Data File (CSV / Excel / PDF)"}
                </label>
                <input
                    id="file-upload"
                    type="file"
                    accept=".csv, .xlsx, .xls, .pdf"
                    onChange={e => handleFile(e.target.files[0])}
                    className="file-input"
                />
                <p className="upload-hint">
                    Drag and drop your file here or click to browse
                    <br />
                    Supported formats: .csv, .xlsx, .pdf (simple tables)
                </p>
            </div>
        </div>
    );
}
