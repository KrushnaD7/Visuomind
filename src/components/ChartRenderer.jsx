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
import { Bar, Line, Doughnut, Scatter, Pie, Bubble } from "react-chartjs-2";
import { useMemo } from 'react';

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

/**
 * Pure Presentation Component
 * @param {Object} data - Processed Data
 * @param {Object} forcedConfig - { type, xAxis, yAxis, color? }
 */
export default function ChartRenderer({ data, forcedConfig }) {
    if (!data || !data.length || !forcedConfig) return null;

    const { type, xAxis, yAxis, color } = forcedConfig;

    if (!xAxis || !yAxis) return null;

    // --- Prepare Chart Data ---
    const chartData = useMemo(() => {
        const labels = data.map(d => d[xAxis]);
        const values = data.map(d => d[yAxis]);

        // Basic color generation or default
        const chartColor = color || '#6366f1';

        let bgColors = chartColor;
        if (type === 'pie' || type === 'doughnut') {
            bgColors = generateColors(data.length);
        }

        let formatData;
        if (type === 'scatter') {
            formatData = data.map(d => ({ x: d[xAxis], y: d[yAxis] }));
        } else if (type === 'bubble') {
            // Scale size axis
            const sizes = data.map(d => d[forcedConfig.sizeAxis]);
            const minS = Math.min(...sizes);
            const maxS = Math.max(...sizes);
            const getR = (v) => {
                if (maxS === minS) return 6;
                return 4 + ((v - minS) / (maxS - minS)) * 20; // 4 to 24px
            };

            formatData = data.map(d => ({
                x: d[xAxis],
                y: d[yAxis],
                r: getR(d[forcedConfig.sizeAxis])
            }));
        } else {
            formatData = values;
        }

        const dataset = {
            label: formatLabel(yAxis),
            data: formatData,
            backgroundColor: bgColors,
            borderColor: chartColor,
            borderWidth: 1,
            pointBackgroundColor: 'rgba(99, 102, 241, 0.6)',
            pointBorderColor: 'transparent',
            pointRadius: 4,
            pointHoverRadius: 6
        };

        return {
            labels: (type === 'scatter' || type === 'bubble') ? [] : labels,
            datasets: [dataset]
        };

    }, [data, type, xAxis, yAxis, color, forcedConfig]);


    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0 // No bouncing
        },
        plugins: {
            legend: {
                position: 'bottom',
                display: type === 'pie' || type === 'doughnut',
                labels: {
                    color: '#94a3b8' // Slate 400
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f1f5f9',
                bodyColor: '#f1f5f9',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 10,
                intersect: false,
                mode: 'index',
            }
        },
        scales: (type !== 'pie' && type !== 'doughnut') ? {
            x: {
                grid: { display: false },
                type: type === 'scatter' || type === 'bubble' ? 'linear' : 'category',
                title: { display: true, text: formatLabel(xAxis), color: '#94a3b8' },
                ticks: {
                    color: '#94a3b8',
                    maxRotation: 45,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10
                }
            },
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' }, // Subtle Slate
                title: { display: true, text: formatLabel(yAxis), color: '#94a3b8' },
                ticks: { color: '#94a3b8' }
            }
        } : {}
    };

    // --- Component Selection ---
    const ChartComponent = {
        bar: Bar,
        line: Line,
        scatter: Scatter,
        pie: Pie,
        doughnut: Doughnut
    }[type] || Bar;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ChartComponent data={chartData} options={options} />
        </div>
    );
}

// Stats & Utils
const generateColors = (count) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 137.508) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
};

const formatLabel = (key) => key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
