import * as vscode from 'vscode';
import { CoverageResult } from '../../shared/coverage/Coverage';
import { Platform } from '../platform-coverage/PlatformCoverageManager';

export interface CoverageSnapshot {
    timestamp: number;
    overallPercentage: number;
    linesHit: number;
    linesFound: number;
    platform: string;
    files: FileSnapshotData[];
}

export interface FileSnapshotData {
    file: string;
    percentage: number;
    linesHit: number;
    linesFound: number;
}

export interface CoverageTrend {
    direction: 'improving' | 'declining' | 'stable';
    change: number; // percentage points
    timespan: string;
}

export interface HistoryStats {
    current: number;
    peak: number;
    low: number;
    average: number;
    totalSnapshots: number;
}

/**
 * Manages coverage history with local persistence using VS Code WorkspaceState.
 * Records snapshots, calculates trends, and provides historical analysis.
 */
export class CoverageHistoryManager {
    private static readonly STORAGE_KEY = 'coverageHistory';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.pruneIfNeeded();
    }

    /**
     * Record a new coverage snapshot
     */
    public async recordSnapshot(coverage: CoverageResult, platform: Platform = Platform.All): Promise<void> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const enabled = config.get<boolean>('historyEnabled', true);

        if (!enabled) {
            return;
        }

        const snapshot: CoverageSnapshot = {
            timestamp: Date.now(),
            overallPercentage: coverage.overall.percentage,
            linesHit: coverage.overall.linesHit,
            linesFound: coverage.overall.linesFound,
            platform: platform.toString(),
            files: coverage.files.map(f => ({
                file: f.file,
                percentage: f.percentage,
                linesHit: f.linesHit,
                linesFound: f.linesFound
            }))
        };

        const history = this.getHistory();
        history.push(snapshot);

        // Check max snapshots limit
        const maxSnapshots = config.get<number>('historyMaxSnapshots', 1000);
        if (history.length > maxSnapshots) {
            history.splice(0, history.length - maxSnapshots);
        }

        await this.saveHistory(history);
    }

    /**
     * Get coverage history snapshots
     */
    public getHistory(limit?: number): CoverageSnapshot[] {
        const history = this.context.workspaceState.get<CoverageSnapshot[]>(
            CoverageHistoryManager.STORAGE_KEY,
            []
        );

        // Sort by timestamp descending (newest first)
        history.sort((a, b) => b.timestamp - a.timestamp);

        if (limit) {
            return history.slice(0, limit);
        }

        return history;
    }

    /**
     * Get snapshots within a time range
     */
    public getHistoryInRange(days: number): CoverageSnapshot[] {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return this.getHistory().filter(s => s.timestamp >= cutoff);
    }

    /**
     * Calculate coverage trend
     */
    public getTrend(days: number = 7): CoverageTrend | null {
        const snapshots = this.getHistoryInRange(days);

        if (snapshots.length < 2) {
            return null;
        }

        // Sort by timestamp ascending
        snapshots.sort((a, b) => a.timestamp - b.timestamp);

        const oldest = snapshots[0];
        const newest = snapshots[snapshots.length - 1];

        const change = newest.overallPercentage - oldest.overallPercentage;
        const threshold = 0.1; // 0.1% threshold for "stable"

        let direction: 'improving' | 'declining' | 'stable';
        if (Math.abs(change) < threshold) {
            direction = 'stable';
        } else if (change > 0) {
            direction = 'improving';
        } else {
            direction = 'declining';
        }

        return {
            direction,
            change: Math.round(change * 10) / 10,
            timespan: days === 1 ? '1 day' : `${days} days`
        };
    }

    /**
     * Get historical statistics
     */
    public getStats(): HistoryStats | null {
        const history = this.getHistory();

        if (history.length === 0) {
            return null;
        }

        const percentages = history.map(s => s.overallPercentage);
        const current = history[0].overallPercentage; // Newest first
        const peak = Math.max(...percentages);
        const low = Math.min(...percentages);
        const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

        return {
            current: Math.round(current * 10) / 10,
            peak: Math.round(peak * 10) / 10,
            low: Math.round(low * 10) / 10,
            average: Math.round(average * 10) / 10,
            totalSnapshots: history.length
        };
    }

    /**
     * Prune old snapshots based on retention settings
     */
    public async pruneHistory(retentionDays?: number): Promise<number> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const days = retentionDays || config.get<number>('historyRetentionDays', 90);

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const history = this.getHistory();
        const originalLength = history.length;

        const pruned = history.filter(s => s.timestamp >= cutoff);
        await this.saveHistory(pruned);

        return originalLength - pruned.length;
    }

    /**
     * Clear all history
     */
    public async clearHistory(): Promise<void> {
        await this.saveHistory([]);
    }

    /**
     * Export history to JSON
     */
    public exportToJSON(): string {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Export history to CSV
     */
    public exportToCSV(): string {
        const history = this.getHistory();

        if (history.length === 0) {
            return '';
        }

        // Header
        let csv = 'Timestamp,Date,Platform,Overall %,Lines Hit,Lines Found\n';

        // Rows
        for (const snapshot of history) {
            const date = new Date(snapshot.timestamp).toISOString();
            csv += `${snapshot.timestamp},${date},${snapshot.platform},${snapshot.overallPercentage},${snapshot.linesHit},${snapshot.linesFound}\n`;
        }

        return csv;
    }

    /**
     * Get chart data for visualization
     */
    public getChartData(days: number = 30): { labels: string[], data: number[] } {
        const snapshots = this.getHistoryInRange(days);

        // Sort by timestamp ascending
        snapshots.sort((a, b) => a.timestamp - b.timestamp);

        const labels = snapshots.map(s => {
            const date = new Date(s.timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const data = snapshots.map(s => s.overallPercentage);

        return { labels, data };
    }

    private async saveHistory(history: CoverageSnapshot[]): Promise<void> {
        await this.context.workspaceState.update(
            CoverageHistoryManager.STORAGE_KEY,
            history
        );
    }

    private async pruneIfNeeded(): Promise<void> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const enabled = config.get<boolean>('historyEnabled', true);

        if (!enabled) {
            return;
        }

        // Auto-prune on initialization
        await this.pruneHistory();
    }
}
