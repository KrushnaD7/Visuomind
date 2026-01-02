import { useMemo } from 'react';
import ChartRenderer from './ChartRenderer';
import { aggregateData } from '../utils/DataProcessor';

export default function DataSummary({ analysis, data }) {
    if (!analysis || !data) return null;

    const { rowCount, columns } = analysis;
    const numericCols = columns.filter(c => c.type === 'number');
    const categoryCols = columns.filter(c => c.type === 'category');

    return (
        <div className="data-summary fade-in">
            <h2 className="section-title">Column Insights</h2>
            <p className="section-subtitle">Automatic column-level analysis to understand data distribution.</p>

            <div className="summary-grid">
                {/* Numeric Columns - Histograms/Trend */}
                {numericCols.map(col => (
                    <UnivariateNumericCard key={col.key} col={col} data={data} />
                ))}

                {/* Categorical Columns - Value Counts */}
                {categoryCols.map(col => (
                    <UnivariateCategoryCard key={col.key} col={col} data={data} rowCount={rowCount} />
                ))}
            </div>
        </div>
    );
}

// --- Sub-Components ---

function UnivariateNumericCard({ col, data }) {
    // 1. Prepare Histogram Data (Auto-Binning)
    const chartConfig = useMemo(() => {
        const values = data.map(d => d[col.key]).filter(v => v !== null && v !== undefined);
        if (values.length === 0) return null;

        // Simple Binning
        const binCount = 10;
        const min = col.stats.min;
        const max = col.stats.max;
        const range = max - min;
        const step = range / binCount;

        const bins = Array(binCount).fill(0);
        const labels = Array(binCount).fill('');

        // Generate Labels
        for (let i = 0; i < binCount; i++) {
            const low = min + (i * step);
            const high = low + step;
            labels[i] = `${Math.round(low)}-${Math.round(high)}`;
        }

        // Fill Bins
        values.forEach(v => {
            let idx = Math.floor((v - min) / step);
            if (idx >= binCount) idx = binCount - 1;
            bins[idx]++;
        });

        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderColor: '#6366f1',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false }, // Hide axis for sparkline look
                    y: { display: false }
                }
            }
        };
    }, [col, data]);

    return (
        <div className="summary-card">
            <div className="card-header">
                <span className="badge numeric"># {col.type}</span>
                <h4>{col.label}</h4>
            </div>

            <div className="mini-chart-container" style={{ height: '60px', marginBottom: '1rem' }}>
                {chartConfig && <ChartRenderer forcedConfig={{ isRaw: true, ...chartConfig }} hideControls={true} />}
            </div>

            <div className="stats-list compact">
                <div className="stat-row">
                    <span>Avg</span>
                    <strong>{col.stats.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                </div>
                <div className="stat-row">
                    <span>Min</span>
                    <strong>{col.stats.min.toLocaleString()}</strong>
                </div>
                <div className="stat-row">
                    <span>Max</span>
                    <strong>{col.stats.max.toLocaleString()}</strong>
                </div>
            </div>
        </div>
    );
}

function UnivariateCategoryCard({ col, data, rowCount }) {
    // 1. Prepare Top-N Bar Data
    const chartConfig = useMemo(() => {
        const topN = col.stats.top.slice(0, 5); // Top 5 only for mini-chart

        return {
            type: 'bar',
            data: {
                labels: topN.map(t => t.val),
                datasets: [{
                    axis: 'y', // Horizontal Bar
                    label: 'Count',
                    data: topN.map(t => t.count),
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false } // Hide labels for clean look, or keep? Hide for sparkline feel
                }
            }
        };
    }, [col]);

    return (
        <div className="summary-card">
            <div className="card-header">
                <span className="badge category">Aa {col.type}</span>
                <h4>{col.label}</h4>
            </div>

            {/* Use the manual HTML bars for categories as they are more readable for text labels than a tiny Chart.js canvas without axes */}
            <div className="stats-list" style={{ marginTop: '0.5rem' }}>
                <div className="stat-row">
                    <span>Unique Values:</span>
                    <strong>{col.stats.uniqueCount}</strong>
                </div>
                <div className="divider"></div>

                <div className="top-values">
                    {col.stats.top.slice(0, 3).map((t, i) => (
                        <div key={i} className="mini-bar-row">
                            <span className="label" title={t.val} style={{ maxWidth: '80px' }}>{t.val}</span>
                            <div className="bar-container">
                                <div
                                    className="bar category-bar"
                                    style={{ width: `${(t.count / rowCount) * 100}%` }}
                                ></div>
                            </div>
                            <span className="count">{t.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
