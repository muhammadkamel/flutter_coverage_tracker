import * as vscode from 'vscode';
import { CoverageHistoryManager, CoverageSnapshot, CoverageTrend, HistoryStats } from './CoverageHistoryManager';

/**
 * Generates HTML content for the coverage history dashboard
 */
export class HistoryWebviewGenerator {
    public static getWebviewContent(
        historyManager: CoverageHistoryManager,
        timeRange: number = 30
    ): string {
        const chartData = historyManager.getChartData(timeRange);
        const stats = historyManager.getStats();
        const trend = historyManager.getTrend(timeRange);
        const recentSnapshots = historyManager.getHistory(10);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage History</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0;
            font-size: 24px;
        }
        .export-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
        }
        .export-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .chart-container {
            background: var(--vscode-editor-background);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
        }
        .trend-indicator {
            font-size: 16px;
            margin-top: 5px;
        }
        .improving { color: #22c55e; }
        .declining { color: #ef4444; }
        .stable { color: #6b7280; }
        .snapshots-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            overflow: hidden;
        }
        .snapshots-table th {
            background: var(--vscode-editor-background);
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid var(--vscode-panel-border);
            font-weight: 600;
        }
        .snapshots-table td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .snapshots-table tr:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .platform-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .no-data {
            text-align: center;
            padding: 40px;
            opacity: 0.5;
        }
        canvas {
            max-height: 400px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Coverage History & Trends</h1>
        <button class="export-btn" onclick="exportHistory()">Export</button>
    </div>

    ${stats ? this.renderStats(stats, trend) : '<div class="no-data">No coverage history data available</div>'}
    
    ${chartData.labels.length > 0 ? this.renderChart(chartData) : ''}
    
    ${recentSnapshots.length > 0 ? this.renderSnapshotsTable(recentSnapshots) : ''}

    <script>
        const vscode = acquireVsCodeApi();

        function exportHistory() {
            vscode.postMessage({ type: 'export' });
        }

        ${chartData.labels.length > 0 ? this.getChartScript(chartData) : ''}
    </script>
</body>
</html>`;
    }

    private static renderStats(stats: HistoryStats, trend: CoverageTrend | null): string {
        const trendClass = trend ? trend.direction : 'stable';
        const trendIcon = trend
            ? (trend.direction === 'improving' ? '↗️' : trend.direction === 'declining' ? '↘️' : '→')
            : '→';
        const trendText = trend
            ? `${trendIcon} ${trend.change > 0 ? '+' : ''}${trend.change}% (${trend.timespan})`
            : 'No trend data';

        return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Current Coverage</div>
                <div class="stat-value">${stats.current}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak Coverage</div>
                <div class="stat-value">${stats.peak}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Coverage</div>
                <div class="stat-value">${stats.average}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Trend</div>
                <div class="stat-value trend-indicator ${trendClass}">${trendText}</div>
            </div>
        </div>
        `;
    }

    private static renderChart(chartData: { labels: string[], data: number[] }): string {
        return `
        <div class="chart-container">
            <h2>Coverage Over Time</h2>
            <canvas id="coverageChart"></canvas>
        </div>
        `;
    }

    private static renderSnapshotsTable(snapshots: CoverageSnapshot[]): string {
        const rows = snapshots.map(s => {
            const date = new Date(s.timestamp).toLocaleString();
            return `
            <tr>
                <td>${date}</td>
                <td>${s.overallPercentage}%</td>
                <td>${s.linesHit} / ${s.linesFound}</td>
                <td><span class="platform-badge">${this.getPlatformIcon(s.platform)} ${s.platform}</span></td>
            </tr>
            `;
        }).join('');

        return `
        <h2>Recent Snapshots</h2>
        <table class="snapshots-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Coverage</th>
                    <th>Lines</th>
                    <th>Platform</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        `;
    }

    private static getChartScript(chartData: { labels: string[], data: number[] }): string {
        return `
        const ctx = document.getElementById('coverageChart');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(chartData.labels)},
                datasets: [{
                    label: 'Coverage %',
                    data: ${JSON.stringify(chartData.data)},
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Coverage: ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        `;
    }

    private static getPlatformIcon(platform: string): string {
        switch (platform.toLowerCase()) {
            case 'android': return '📱';
            case 'ios': return '🍎';
            case 'web': return '🌐';
            case 'desktop': return '💻';
            case 'all': return '📊';
            default: return '📋';
        }
    }
}
