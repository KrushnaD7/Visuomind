import { format } from 'date-fns';

/**
 * Main function to process raw data.
 * @param {Array} rawData - Array of objects from CSV/Excel
 * @returns {Object} { cleanData, columns, stats }
 */
export const processData = (rawData) => {
    if (!rawData || rawData.length === 0) return null;

    // 1. Get raw headers
    const rawKeys = Object.keys(rawData[0]);
    const rowCount = rawData.length;

    // 2. Initial Column Analysis (Type Inference)
    const columnMetadata = rawKeys.map(key => analyzeColumnType(rawData, key));

    // 3. Clean Data based on inferred types
    const cleanData = rawData.map(row => {
        const newRow = {};
        columnMetadata.forEach(meta => {
            newRow[meta.key] = parseValue(row[meta.key], meta.type);
        });
        return newRow;
    });

    // 4. Generate Statistics
    const columns = columnMetadata.map(meta => {
        const values = cleanData.map(row => row[meta.key]);
        const stats = calculateStats(values, meta.type);
        return { ...meta, stats };
    });

    return {
        data: cleanData, // Uses the cleaned values
        columns,         // Metadata structure
        rowCount
    };
};

// --- Helpers ---

const analyzeColumnType = (data, key) => {
    let numericCount = 0;
    let dateCount = 0;
    let validCount = 0;
    const uniqueValues = new Set();
    const sampleSize = Math.min(data.length, 500); // Analyze first 500 rows for speed

    for (let i = 0; i < sampleSize; i++) {
        const val = data[i][key];
        if (val === null || val === undefined || val === '') continue;
        validCount++;
        uniqueValues.add(val);

        if (isNumeric(val)) numericCount++;
        if (isDate(val)) dateCount++;
    }

    if (validCount === 0) return { key, type: 'text', label: formatLabel(key) };

    const numericRatio = numericCount / validCount;
    const dateRatio = dateCount / validCount;
    const uniqueRatio = uniqueValues.size / validCount;

    let type = 'text';

    // Heuristics
    if (numericRatio > 0.8) {
        type = 'number';
    } else if (dateRatio > 0.8) {
        type = 'date';
    } else if (uniqueValues.size <= 20 || (uniqueRatio < 0.2 && uniqueValues.size < 50)) {
        // Low cardinality = categorical
        type = 'category';
    }

    return { key, type, label: formatLabel(key) };
};

const isNumeric = (val) => {
    if (typeof val === 'number') return true;
    if (typeof val !== 'string') return false;
    // Remove comma, currency, %, spaces
    const clean = val.replace(/[^0-9.-]/g, '');
    return !isNaN(parseFloat(clean)) && clean.length > 0;
};

const isDate = (val) => {
    if (val instanceof Date) return true;
    if (typeof val !== 'string') return false;
    // Simple check: must have at least one delimiter and parseable
    const hasDelimiter = /[-/.]/.test(val);
    if (!hasDelimiter) return false;
    const timestamp = Date.parse(val);
    return !isNaN(timestamp);
};

const parseValue = (val, type) => {
    if (val === null || val === undefined || val === '') return null;

    if (type === 'number') {
        if (typeof val === 'number') return val;
        // Clean string numbers
        const clean = val.toString().replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? null : num;
    }

    if (type === 'date') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date; // Returns Date object or null
    }

    return val; // Text/Category return as-is
};

const calculateStats = (values, type) => {
    const validValues = values.filter(v => v !== null && v !== undefined);
    const nullCount = values.length - validValues.length;

    if (validValues.length === 0) return { nullCount };

    if (type === 'number') {
        const min = Math.min(...validValues);
        const max = Math.max(...validValues);
        const sum = validValues.reduce((a, b) => a + b, 0);
        const mean = sum / validValues.length;

        // Median
        const sorted = [...validValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        // Variance & Standard Deviation
        const variance = validValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / validValues.length;
        const stdDev = Math.sqrt(variance);

        return { min, max, mean, median, sum, stdDev, variance, nullCount };
    }

    if (type === 'category' || type === 'text') {
        const counts = {};
        validValues.forEach(v => counts[v] = (counts[v] || 0) + 1);

        // Top 10 frequent (Need more for analysis)
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 10).map(([val, count]) => ({ val, count }));
        const uniqueCount = sorted.length;

        return { uniqueCount, top, nullCount };
    }

    if (type === 'date') {
        const timestamps = validValues.map(d => d.getTime());
        const min = new Date(Math.min(...timestamps));
        const max = new Date(Math.max(...timestamps));
        return { min, max, nullCount };
    }

    return { nullCount };
};

export const calculateCorrelation = (xValues, yValues) => {
    const n = xValues.length;
    if (n !== yValues.length || n === 0) return 0;

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;

    for (let i = 0; i < n; i++) {
        const xDiff = xValues[i] - xMean;
        const yDiff = yValues[i] - yMean;
        numerator += xDiff * yDiff;
        xDenom += xDiff * xDiff;
        yDenom += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenom * yDenom);
    if (denominator === 0) return 0;

    return numerator / denominator;
};

/**
 * Aggregates data by a grouping column.
 * @param {Array} data - Raw data array
 * @param {String} groupByCol - Column to group by (X-Axis)
 * @param {String} metricCol - Column to calculate (Y-Axis)
 * @param {String} method - 'mean', 'sum', 'count', 'median'
 * @param {Number} limit - Optional limit for top items
 * @returns {Array} Aggregated data sorted by value descending
 */
export const aggregateData = (data, groupByCol, metricCol, method = 'mean', limit = null) => {
    const groups = {};

    data.forEach(row => {
        const key = row[groupByCol];
        const val = row[metricCol];

        if (key === undefined || key === null || val === undefined || val === null) return;

        if (!groups[key]) groups[key] = [];
        groups[key].push(Number(val));
    });

    const result = Object.entries(groups).map(([key, values]) => {
        let value = 0;
        if (method === 'count') {
            value = values.length;
        } else if (method === 'sum') {
            value = values.reduce((a, b) => a + b, 0);
        } else if (method === 'mean') {
            value = values.reduce((a, b) => a + b, 0) / values.length;
        } else if (method === 'median') {
            const sorted = values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            value = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }

        return { [groupByCol]: key, [metricCol]: value };
    });

    // Sort by value desc
    result.sort((a, b) => b[metricCol] - a[metricCol]);

    // Apply limit
    if (limit && limit > 0 && result.length > limit) {
        return result.slice(0, limit);
    }

    return result;
};

/**
 * Randomly samples the dataset to a specific limit.
 * @param {Array} data - Raw data
 * @param {Number} limit - Max rows to return
 * @returns {Array} Sampled data
 */
export const sampleData = (data, limit) => {
    if (!data || data.length <= limit) return data;

    // Fisher-Yates Shuffle (Partial) or just simple random pick
    // For visual sampling, we want to maintain distribution.

    const sample = [];
    const indices = new Set();
    const total = data.length;

    // Guard against infinite loops if limit > total (checked above but good practice)
    if (limit >= total) return data;

    while (indices.size < limit) {
        const idx = Math.floor(Math.random() * total);
        indices.add(idx);
    }

    indices.forEach(i => sample.push(data[i]));
    return sample;
};

// Turn "customer_id" -> "Customer Id"
const formatLabel = (key) => {
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};
