import { calculateCorrelation } from './DataProcessor';

/**
 * Generates ranked chart recommendations.
 * @param {Object} data - Processed data array
 * @param {Array} columns - Column metadata
 * @returns {Array} Array of recommended chart configs
 */
export const getRecommendations = (data, columns) => {
    const recommendations = [];

    const numericCols = columns.filter(c => c.type === 'number');
    const categoryCols = columns.filter(c => c.type === 'category' || c.type === 'text');
    const dateCols = columns.filter(c => c.type === 'date');

    // 1. Distribution Analysis (Histogram/Box Proxy)
    // Rule: High variance numeric columns are interesting.
    numericCols.forEach(col => {
        if (col.stats.stdDev > 0) {
            const score = 50 + (col.stats.variance > 1000 ? 20 : 0); // Boost for spread
            recommendations.push({
                type: 'bar', // Histogram-like (binned in renderer or treated as categorical if few unique)
                xAxis: col.key,
                yAxis: col.key, // Count of self
                title: `Distribution of ${col.label}`,
                description: `Shows how ${col.label} is spread across the dataset.`,
                score,
                isHistogram: true
            });
        }
    });

    // 2. Trend Analysis (Line Chart)
    // Rule: Date + Numeric is almost always a winner.
    if (dateCols.length > 0 && numericCols.length > 0) {
        const dateCol = dateCols[0];
        numericCols.forEach(numCol => {
            recommendations.push({
                type: 'line',
                xAxis: dateCol.key,
                yAxis: numCol.key,
                title: `${numCol.label} over Time`,
                description: `Track ${numCol.label} trends based on ${dateCol.label}.`,
                score: 90 // High priority
            });
        });
    }

    // 3. Category Comparison (Bar / Pie)
    // Rule: Bar for many categories, Pie ONLY for few (<= 6) & Positive.
    if (categoryCols.length > 0 && numericCols.length > 0) {
        categoryCols.forEach(catCol => {
            const uniqueCount = catCol.stats.uniqueCount;
            // Skip if too many categories (unless we handle top-N)
            if (uniqueCount > 50) return;

            numericCols.forEach(numCol => {
                // Check Pie eligibility
                const isPieEligible = uniqueCount <= 6 && numCol.stats.min >= 0;

                if (isPieEligible) {
                    recommendations.push({
                        type: 'pie',
                        xAxis: catCol.key,
                        yAxis: numCol.key,
                        title: `${numCol.label} Share by ${catCol.label}`,
                        description: `Part-of-whole view for ${numCol.label}.`,
                        score: 75
                    });
                }

                // Standard Bar (always reliable)
                recommendations.push({
                    type: 'bar',
                    xAxis: catCol.key,
                    yAxis: numCol.key,
                    title: `${numCol.label} by ${catCol.label}`,
                    description: `Compare ${numCol.label} across different ${catCol.label}.`,
                    score: 80
                });
            });
        });
    }

    // 4. Correlation (Scatter)
    // Rule: 2 Numeric columns with |r| >= 0.3
    if (numericCols.length >= 2) {
        for (let i = 0; i < numericCols.length; i++) {
            for (let j = i + 1; j < numericCols.length; j++) {
                const colA = numericCols[i];
                const colB = numericCols[j];

                // Extract values for correlation
                const valsA = data.map(d => d[colA.key]);
                const valsB = data.map(d => d[colB.key]);

                const correlation = calculateCorrelation(valsA, valsB);

                if (Math.abs(correlation) >= 0.3) {
                    const strength = Math.abs(correlation) > 0.7 ? "Strong" : "Moderate";
                    const direction = correlation > 0 ? "positive" : "negative";

                    // Standard Scatter
                    recommendations.push({
                        type: 'scatter',
                        xAxis: colA.key,
                        yAxis: colB.key,
                        title: `${colA.label} vs ${colB.label}`,
                        description: `${strength} ${direction} correlation (r=${correlation.toFixed(2)}).`,
                        score: 70 + (Math.abs(correlation) * 30)
                    });

                    // 5. Multivariate (Bubble)
                    // Try to find a third variable for Size
                    const sizeCol = numericCols.find(c => c.key !== colA.key && c.key !== colB.key && c.stats.variance > 0);
                    if (sizeCol) {
                        recommendations.push({
                            type: 'bubble',
                            xAxis: colA.key,
                            yAxis: colB.key,
                            sizeAxis: sizeCol.key,
                            title: `Multivariate: ${colA.label} vs ${colB.label} vs ${sizeCol.label}`,
                            description: `Complex system analysis: Relationship between ${colA.label} and ${colB.label}, sized by ${sizeCol.label}.`,
                            score: 85 + (Math.abs(correlation) * 10) // Boost score for complexity
                        });
                    }
                }
            }
        }
    }

    // Sort by score and de-duplicate (keep highest score per title)
    recommendations.sort((a, b) => b.score - a.score);

    const uniqueRecs = [];
    const seenTitles = new Set();

    recommendations.forEach(rec => {
        if (!seenTitles.has(rec.title)) {
            uniqueRecs.push(rec);
            seenTitles.add(rec.title);
        }
    });

    return uniqueRecs.slice(0, 4); // Strictly Top 4
};
