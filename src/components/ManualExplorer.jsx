import { useState, useMemo, useEffect } from 'react';
import ChartRenderer from './ChartRenderer';
import { aggregateData, calculateCorrelation, sampleData } from '../utils/DataProcessor';
import { validateChart, suggestSmartConfig } from '../utils/ChartValidator';

export default function ManualExplorer({ data, columns }) {
    const [config, setConfig] = useState({
        type: 'bar',
        xAxis: '',
        yAxis: '',
        aggregation: 'mean'
    });

    const [hint, setHint] = useState("");

    // Resolve column types
    const xCol = columns.find(c => c.key === config.xAxis);
    const yCol = columns.find(c => c.key === config.yAxis);

    // --- 1. Auto-Correction & State Management ---
    const handleAxisChange = (axis, value) => {
        // Create the provisional config
        let newConfig = { ...config, [axis === 'x' ? 'xAxis' : 'yAxis']: value };

        // Resolve keys and columns
        const newXKey = axis === 'x' ? value : config.xAxis;
        const newYKey = axis === 'y' ? value : config.yAxis;

        const newXCol = columns.find(c => c.key === newXKey);
        const newYCol = columns.find(c => c.key === newYKey);

        let newHint = "";

        // Check Smart Config immediately
        if (newXCol && newYCol) {
            const smart = suggestSmartConfig(newXCol, newYCol);

            if (smart) {
                // Check if current (provisional) choice is invalid with the *old* type
                // or if the validator suggests an AUTO_FIX.
                const currentValidation = validateChart(newConfig.type, newXCol, newYCol);

                if (!newConfig.type || !currentValidation.valid || currentValidation.severity === 'AUTO_FIX') {
                    // Apply Smart Switch
                    newConfig.type = smart.type;
                    if (smart.aggregation) newConfig.aggregation = smart.aggregation;

                    if (smart.type === 'scatter') {
                        newHint = "Auto-switched to Scatter because both axes are numeric.";
                    } else if (smart.type === 'line') {
                        newHint = "Auto-switched to Line for time-series trend.";
                    }
                }
            }
        }

        setConfig(newConfig);
        setHint(newHint);
    };

    // --- 2. Validation ---
    const validation = useMemo(() => {
        return validateChart(config.type, xCol, yCol);
    }, [config.type, xCol, yCol]);

    const typeAvailability = useMemo(() => {
        const types = ['bar', 'line', 'pie', 'doughnut', 'scatter'];
        return types.reduce((acc, t) => {
            acc[t] = validateChart(t, xCol, yCol);
            return acc;
        }, {});
    }, [xCol, yCol]);

    // --- 3. Smart Data Preparation (Sampling / Aggregation) ---
    const { preparedData, samplingInfo } = useMemo(() => {
        if (!xCol || !yCol) return { preparedData: null, samplingInfo: null };
        if (!validation.valid && validation.severity === 'BLOCK') return { preparedData: null, samplingInfo: null };

        // SCATTER: Sample if > 1000 rows
        if (config.type === 'scatter') {
            const SCATTER_LIMIT = 1000;
            const SAMPLE_SIZE = 500;

            if (data.length > SCATTER_LIMIT) {
                const sampled = sampleData(data, SAMPLE_SIZE);
                return {
                    preparedData: sampled,
                    samplingInfo: `ℹ️ Showing a random sample of ${SAMPLE_SIZE} out of ${data.length} records for clarity.`
                };
            }
            return { preparedData: data, samplingInfo: null };
        }

        // AGGREGATION (Bar, Line, Pie)
        if (config.aggregation && xCol.type !== 'number') {
            let limit = null;
            let info = null;

            if (config.type === 'pie' || config.type === 'doughnut') limit = 6;

            if (config.type === 'bar' && xCol.stats.uniqueCount > 20) {
                limit = 20;
                info = `ℹ️ Data aggregated to Top 20 categories for better readability.`;
            }

            return {
                preparedData: aggregateData(data, config.xAxis, config.yAxis, config.aggregation, limit),
                samplingInfo: info
            };
        }

        return { preparedData: data, samplingInfo: null };
    }, [data, config, xCol, yCol, validation]);

    // --- 4. Insight / Info Text ---
    const statsText = useMemo(() => {
        if (!preparedData || !xCol || !yCol) return "Select axes to explore.";

        // Show Auto-Switch Hint if active
        if (hint) return hint;

        // Scatter Correlation (Computed on SAMPLED data)
        if (config.type === 'scatter') {
            const valsA = preparedData.map(d => d[config.xAxis]);
            const valsB = preparedData.map(d => d[config.yAxis]);
            const r = calculateCorrelation(valsA, valsB).toFixed(2);
            return `Correlation: ${r}`;
        }

        if (validation.severity === 'WARN') {
            return `Note: ${validation.reason}`;
        }

        return `${config.aggregation ? config.aggregation + ' of ' : ''}${yCol.label} by ${xCol.label}`;
    }, [xCol, yCol, config, preparedData, hint, validation]);


    return (
        <div className="manual-explorer fade-in" style={{ marginTop: '1rem' }}>
            <h2 className="section-title">Explore Relationships</h2>
            <p className="section-subtitle">Explore relationships between two variables using strict BI rules.</p>

            <div className="chart-card">
                <div className="chart-controls">
                    {/* Axes */}
                    <div className="control-group">
                        <label>Axes Selection</label>
                        <div className="select-row">
                            <select
                                value={config.xAxis}
                                onChange={e => handleAxisChange('x', e.target.value)}
                                className="chart-select"
                            >
                                <option value="" disabled>Select X-Axis</option>
                                {columns.map(c => (
                                    <option key={c.key} value={c.key}>
                                        {c.label} ({c.type})
                                    </option>
                                ))}
                            </select>
                            <span className="arrow">→</span>
                            <select
                                value={config.yAxis}
                                onChange={e => handleAxisChange('y', e.target.value)}
                                className="chart-select"
                            >
                                <option value="" disabled>Select Y-Axis</option>
                                {columns.filter(c => c.type === 'number').map(c => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Aggregation (Hidden for Scatter) */}
                    {config.type !== 'scatter' && xCol && xCol.type !== 'number' && (
                        <div className="control-group">
                            <label>Aggregation</label>
                            <select
                                value={config.aggregation}
                                onChange={e => setConfig({ ...config, aggregation: e.target.value })}
                                className="chart-select"
                            >
                                <option value="mean">Average</option>
                                <option value="sum">Total Sum</option>
                                <option value="count">Count</option>
                                <option value="median">Median</option>
                            </select>
                        </div>
                    )}

                    {/* Chart Type Buttons */}
                    <div className="control-group">
                        <label>Visualization Type</label>
                        <div className="chart-type-selector">
                            {['bar', 'line', 'pie', 'doughnut', 'scatter'].map(type => {
                                const status = typeAvailability[type] || { valid: true };
                                const isBlocked = status.severity === 'BLOCK' || status.severity === 'AUTO_FIX';

                                return (
                                    <button
                                        key={type}
                                        className={`type-btn ${config.type === type ? 'active' : ''}`}
                                        onClick={() => !isBlocked && setConfig({ ...config, type })}
                                        disabled={isBlocked}
                                        title={isBlocked ? `Disabled: ${status.reason}` : type}
                                        style={isBlocked ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Render Area */}
                <div className="explorer-canvas">
                    {xCol && yCol ? (
                        <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                            {/* Validation Block */}
                            {validation.valid !== false || validation.severity === 'WARN' ? (
                                <>
                                    {/* Info Banner for Sampling/Aggregation */}
                                    {samplingInfo && (
                                        <div className="info-banner" style={{
                                            background: 'rgba(59, 130, 246, 0.05)',
                                            color: '#93c5fd',
                                            padding: '0.4rem',
                                            borderRadius: '0.4rem',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.8rem',
                                            textAlign: 'center',
                                            border: '1px solid rgba(59, 130, 246, 0.1)'
                                        }}>
                                            {samplingInfo.replace('ℹ️ ', '')}
                                        </div>
                                    )}

                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <ChartRenderer
                                            data={preparedData}
                                            forcedConfig={config}
                                            hideControls={true}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state-canvas" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: '#94a3b8',
                                    fontSize: '0.9rem',
                                    background: 'rgba(255,255,255,0.01)',
                                    borderRadius: '0.5rem'
                                }}>
                                    <p>{validation.reason || "Select options to adapt chart"}</p>
                                </div>
                            )}
                            <p className="chart-desc" style={{ textAlign: 'center', marginTop: '0.5rem', color: '#64748b' }}>
                                {statsText.replace('⚠️ ', 'Note: ')}
                            </p>
                        </div>
                    ) : (
                        <div className="empty-state-canvas">
                            <p>Select axes to generate visualization</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const getChartIcon = (type) => {
    // Unused, but keeping function to avoid breakage if referenced elsewhere, active rendering uses text now.
    return type;
};
