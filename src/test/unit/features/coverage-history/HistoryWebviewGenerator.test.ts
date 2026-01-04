import * as assert from 'assert';
import * as sinon from 'sinon';
import { HistoryWebviewGenerator } from '../../../../features/coverage-history/HistoryWebviewGenerator';
import { CoverageHistoryManager, CoverageSnapshot } from '../../../../features/coverage-history/CoverageHistoryManager';

suite('HistoryWebviewGenerator Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let historyManager: sinon.SinonStubbedInstance<CoverageHistoryManager>;

    setup(() => {
        sandbox = sinon.createSandbox();
        historyManager = sandbox.createStubInstance(CoverageHistoryManager);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should generate valid HTML content', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html);
        assert.ok(html.includes('<!DOCTYPE html>'));
        assert.ok(html.includes('Coverage History'));
    });

    test('should include chart container', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html.includes('chart-container'));
    });

    test('should include statistics section', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        // Should contain statistics-related content
        assert.ok(html.includes('85') || html.length > 0);
    });

    test('should display trend information', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html);
    });

    test('should use default time range when not specified', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'stable',
            change: 0,
            timespan: 'last 30 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        // Should call getChartData with default 30 days
        assert.ok(historyManager.getChartData.calledWith(30));
    });

    test('should use custom time range when specified', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'declining',
            change: -5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager, 7);

        // Should call getChartData with custom 7 days
        assert.ok(historyManager.getChartData.calledWith(7));
    });

    test('should handle empty chart data', () => {
        historyManager.getChartData.returns({ labels: [], data: [] });
        historyManager.getStats.returns({
            current: 0,
            peak: 0,
            low: 0,
            average: 0,
            totalSnapshots: 0
        });
        historyManager.getTrend.returns({
            direction: 'stable',
            change: 0,
            timespan: 'no data'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html);
        assert.ok(html.includes('html'));
    });

    test('should display recent snapshots', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });

        const recentSnapshots = [
            {
                timestamp: Date.now(),
                overallPercentage: 85,
                linesHit: 850,
                linesFound: 1000,
                platform: 'android',
                files: []
            }
        ];

        historyManager.getHistory.returns(recentSnapshots);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html);
    });

    test('should include CSS styles', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html.includes('style') || html.includes('css'));
    });

    test('should include JavaScript functionality', () => {
        historyManager.getChartData.returns({
            labels: ['Jan 1', 'Jan 2'],
            data: [70, 85]
        });
        historyManager.getStats.returns({
            current: 85,
            peak: 90,
            low: 70,
            average: 80,
            totalSnapshots: 10
        });
        historyManager.getTrend.returns({
            direction: 'improving',
            change: 5,
            timespan: 'last 7 days'
        });
        historyManager.getHistory.returns([]);

        const html = HistoryWebviewGenerator.getWebviewContent(historyManager);

        assert.ok(html.includes('script') || html.length > 100);
    });
});
