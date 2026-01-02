import ChartRenderer from "./ChartRenderer";

export default function RecommendedCharts({ recommendations, data }) {
    if (!recommendations || recommendations.length === 0) {
        return (
            <div className="recommendations-container fade-in">
                <h2 className="section-title">✨ Recommended Insights</h2>
                <div className="empty-state-small">
                    No clear patterns detected for auto-insights. usage manual exploration below!
                </div>
            </div>
        );
    }

    return (
        <div className="recommendations-container fade-in">
            <h2 className="section-title">System Insights</h2>
            <p className="section-subtitle">Key system-level insights automatically detected.</p>
            <div className="pro-charts-grid">
                {recommendations.map((rec, index) => (
                    <div className="chart-card" key={index}>
                        <div className="chart-header">
                            <div>
                                <h3>{rec.title}</h3>
                                <p className="chart-desc">{rec.description}</p>
                            </div>
                            <span className="badge numeric">Score: {Math.round(rec.score)}</span>
                        </div>
                        <div className="chart-wrapper-small">
                            {/* Pass specific config to renderer */}
                            <ChartRenderer
                                data={data}
                                forcedConfig={rec} // Pass config directly
                                hideControls={true} // Hide internal controls
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
