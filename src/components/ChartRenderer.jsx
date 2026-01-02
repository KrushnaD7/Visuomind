import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Radar, Scatter } from "react-chartjs-2";
import { useMemo, useRef } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Filler
);

// --- UTILS ---

// Robust number parser: handles "$1,200.50", "50%", "1,000"
// Robust number parser: handles "$1,200.50", "50%", "1,000"
const cleanNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;

    const str = val.toString();
    // 1. replace all commas (assuming 1,000.00 format)
    // 2. remove non-numeric chars except dot and minus
    const clean = str.replace(/,/g, "").replace(/[^0-9.-]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

// Generate simplified statistics
const calculateKPIs = (data, numberKeys) => {
    return numberKeys.map(key => {
        const values = data.map(d => cleanNumber(d[key]));
        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length;
        return {
            label: key,
            total: total.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            avg: avg.toLocaleString(undefined, { maximumFractionDigits: 1 })
        };
    }).slice(0, 4); // Limit to top 4 metrics
};

const generateColors = (count, alpha = 0.7) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 137.508) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, ${alpha})`);
    }
    return colors;
};

// Generate automated descriptive text
const generateSummary = (data, numberKeys, xKey) => {
    if (!numberKeys.length) return [];

    const key = numberKeys[0];
    const values = data.map(d => cleanNumber(d[key]));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);

    return [
        `The dataset contains ${data.length} records.`,
        `Analysis based on "${xKey}" vs "${key}".`,
        `Highest ${key}: ${max.toLocaleString()} (${data[maxIndex]?.[xKey]}).`,
        `Lowest ${key}: ${min.toLocaleString()} (${data[minIndex]?.[xKey]}).`,
        `Range: ${min.toLocaleString()} - ${max.toLocaleString()}.`
    ];
};

const SummaryCard = ({ summary }) => (
    <div className="summary-card">
        <h3>📊 Executive Summary</h3>
        <ul>
            {summary.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
    </div>
);

// --- COMPONENTS ---

const KPICard = ({ label, total, avg }) => (
    <div className="kpi-card">
        <h4>{label}</h4>
        <div className="kpi-value">{total}</div>
        <div className="kpi-sub">Avg: {avg}</div>
    </div>
);

const ChartCard = ({ title, Component, data, options }) => {
    const chartRef = useRef(null);
    const downloadChart = () => {
        if (chartRef.current) {
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_')}.png`;
            link.href = chartRef.current.toBase64Image();
            link.click();
        }
    };

    return (
        <div className="chart-card">
            <div className="chart-header">
                <h3>{title}</h3>
                <button className="btn-icon" onClick={downloadChart} title="Download">📥</button>
            </div>
            <div className="chart-wrapper">
                <Component ref={chartRef} data={data} options={options} />
            </div>
        </div>
    );
};

export default function ChartRenderer({ data }) {
    if (!data || !data.length) return <div className="empty-state">Upload data to visualize</div>;

    // 1. DATA DISCOVERY & CLEANING
    const keys = Object.keys(data[0]);

    // Find category key: preferably "Name", "Date", "Category", or first string
    const xKey = keys.find(k =>
        ['name', 'date', 'month', 'year', 'category', 'product'].includes(k.toLowerCase())
    ) || keys.find(k => typeof data[0][k] === 'string') || keys[0];

    // Find number keys: check if values LOOK like numbers even if they are strings
    const numberKeys = keys.filter(k => {
        const val = data[0][k];
        if (val === null || val === undefined) return false;

        // If it's already a number, great
        if (typeof val === 'number') return true;

        // If it's a string, try to clean it
        const str = val.toString().replace(/,/g, "").replace(/[^0-9.-]/g, "");
        const num = parseFloat(str);

        // It's a number key if it yields a valid number AND the string wasn't empty
        return str.length > 0 && !isNaN(num);
    });

    if (!numberKeys.length) return (
        <div className="error-msg">
            No numeric data found. Please check your file formatting (e.g. remove complex currency symbols).
        </div>
    );

    // 2. PREPARE PRO CHARTS
    const { kpis, multiData, radarData, piezoData, scatterData, summary } = useMemo(() => {
        const labels = data.map(d => d[xKey]);
        const cleanData = data.map(row => {
            const newRow = { ...row };
            numberKeys.forEach(k => newRow[k] = cleanNumber(row[k]));
            return newRow;
        });

        // KPIs & Summary
        const kpis = calculateKPIs(data, numberKeys);
        const summary = generateSummary(data, numberKeys, xKey);

        // Main Dataset (Bar/Line)
        const multiData = {
            labels,
            datasets: numberKeys.slice(0, 3).map((key, i) => ({
                label: key,
                data: cleanData.map(d => d[key]),
                backgroundColor: generateColors(3, 0.6)[i],
                borderColor: generateColors(3, 1)[i],
                borderWidth: 2,
                tension: 0.4, // Smooth curves
                fill: true
            }))
        };

        // Radar (Compare first 5 items across metrics)
        const radarData = {
            labels: numberKeys.slice(0, 5),
            datasets: cleanData.slice(0, 3).map((row, i) => ({
                label: row[xKey],
                data: numberKeys.slice(0, 5).map(k => row[k]),
                backgroundColor: `rgba(99, 102, 241, 0.2)`,
                borderColor: `rgba(99, 102, 241, 1)`,
                pointBackgroundColor: '#fff'
            }))
        };

        // Doughnut (Distribution of first metric)
        const piezoData = {
            labels,
            datasets: [{
                label: numberKeys[0],
                data: cleanData.map(d => d[numberKeys[0]]),
                backgroundColor: generateColors(data.length),
                borderWidth: 0
            }]
        };

        // Scatter (Correlation if 2+ metrics)
        let scatterData = null;
        if (numberKeys.length >= 2) {
            scatterData = {
                datasets: [{
                    label: `${numberKeys[0]} vs ${numberKeys[1]}`,
                    data: cleanData.map(d => ({ x: d[numberKeys[0]], y: d[numberKeys[1]] })),
                    backgroundColor: '#ec4899'
                }]
            };
        }

        return { kpis, multiData, radarData, piezoData, scatterData, summary };
    }, [data, xKey, numberKeys]);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, title: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: '#334155' } } }
    };

    return (
        <div className="dashboard-container">
            {/* KPI SECTION */}
            <div className="kpi-grid">
                {kpis.map((k, i) => <KPICard key={i} {...k} />)}
            </div>

            {/* SUMMARY SECTION */}
            <SummaryCard summary={summary} />

            {/* CHARTS GRID */}
            <div className="pro-charts-grid">
                <ChartCard title={`Trends by ${xKey}`} Component={Line} data={multiData} options={commonOptions} />
                <ChartCard title="Metric Comparison" Component={Bar} data={multiData} options={commonOptions} />

                {scatterData && (
                    <ChartCard title="Correlation Analysis" Component={Scatter} data={scatterData} options={commonOptions} />
                )}

                <ChartCard title={`Distribution (${numberKeys[0]})`} Component={Doughnut} data={piezoData} options={commonOptions} />

                <ChartCard title="Multi-Metric Radar" Component={Radar} data={radarData} options={commonOptions} />
            </div>
        </div>
    );
}
