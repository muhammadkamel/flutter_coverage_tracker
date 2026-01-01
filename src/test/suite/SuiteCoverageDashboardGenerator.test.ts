import * as assert from 'assert';
import { SuiteCoverageDashboardGenerator } from '../../features/suite-coverage/SuiteCoverageDashboardGenerator';
import { SuiteCoverageData, FileCoverage, AggregateSuiteCoverage } from '../../features/suite-coverage/types';

suite('SuiteCoverageDashboardGenerator Test Suite', () => {
    let generator: SuiteCoverageDashboardGenerator;

    setup(() => {
        generator = new SuiteCoverageDashboardGenerator();
    });

    suite('generateSuiteCoverageSection', () => {
        test('should generate dashboard HTML', () => {
            const suites = new Map<string, SuiteCoverageData>([
                ['downloads_test.dart', createMockSuite('downloads_test.dart', 92)],
                ['auth_test.dart', createMockSuite('auth_test.dart', 78)]
            ]);

            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 85,
                totalLines: 200,
                totalCoveredLines: 170,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should include section
            assert.ok(html.includes('id="suite-coverage"'));
            assert.ok(html.includes('Coverage by Test Suite'));

            // Should include controls
            assert.ok(html.includes('id="suite-search"'));
            assert.ok(html.includes('id="suite-filter"'));
            assert.ok(html.includes('id="suite-sort"'));
        });

        test('should display summary cards', () => {
            const suites = new Map<string, SuiteCoverageData>([
                ['suite1', createMockSuite('suite1', 95)],
                ['suite2', createMockSuite('suite2', 85)],
                ['suite3', createMockSuite('suite3', 65)]
            ]);

            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 81.7,
                totalLines: 300,
                totalCoveredLines: 245,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should show total suites
            assert.ok(html.includes('>3<'));

            // Should show overall coverage
            assert.ok(html.includes('81.7%'));

            // Should include summary cards
            assert.ok(html.includes('Total Suites'));
            assert.ok(html.includes('Overall Coverage'));
            assert.ok(html.includes('High Coverage Suites'));
            assert.ok(html.includes('Low Coverage Suites'));
        });

        test('should generate suite table rows', () => {
            const suites = new Map<string, SuiteCoverageData>([
                ['downloads_test.dart', createMockSuite('downloads_test.dart', 92)]
            ]);

            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 92,
                totalLines: 100,
                totalCoveredLines: 92,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should include suite name
            assert.ok(html.includes('downloads_test.dart'));

            // Should include coverage badge
            assert.ok(html.includes('92.0%'));
            assert.ok(html.includes('coverage-high'));

            // Should include action buttons
            assert.ok(html.includes('Details'));
            assert.ok(html.includes('View Files'));
        });

        test('should categorize coverage levels correctly', () => {
            const suites = new Map<string, SuiteCoverageData>([
                ['high', createMockSuite('high', 95)],
                ['medium', createMockSuite('medium', 80)],
                ['low', createMockSuite('low', 60)]
            ]);

            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 78.3,
                totalLines: 300,
                totalCoveredLines: 235,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should have high coverage badge
            assert.ok(html.includes('coverage-high'));

            // Should have medium coverage badge
            assert.ok(html.includes('coverage-medium'));

            // Should have low coverage badge
            assert.ok(html.includes('coverage-low'));
        });

        test('should include JavaScript functionality', () => {
            const suites = new Map<string, SuiteCoverageData>();
            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 0,
                totalLines: 0,
                totalCoveredLines: 0,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);
            const script = SuiteCoverageDashboardGenerator.getSuiteCoverageScript();

            // Should include filter function in script
            assert.ok(script.includes('filterSuites'));

            // Should include sort function in script
            assert.ok(script.includes('sortSuites'));

            // Should include toggle function in script
            assert.ok(script.includes('toggleSuiteDetails'));

            // Should include vscode message posting in script
            assert.ok(script.includes('vscode.postMessage'));
        });

        test('should include CSS styles', () => {
            const suites = new Map<string, SuiteCoverageData>();
            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 0,
                totalLines: 0,
                totalCoveredLines: 0,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should include styles
            assert.ok(html.includes('<style>'));
            assert.ok(html.includes('.coverage-section'));
            assert.ok(html.includes('.suite-table'));
            assert.ok(html.includes('.coverage-badge'));
        });

        test('should handle empty suites', () => {
            const suites = new Map<string, SuiteCoverageData>();
            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 0,
                totalLines: 0,
                totalCoveredLines: 0,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should still generate structure
            assert.ok(html.includes('id="suite-coverage"'));

            // Should show zero suites
            assert.ok(html.includes('>0<'));
        });

        test('should display file list for each suite', () => {
            const coveredFiles = new Map<string, FileCoverage>([
                [
                    'lib/service.dart',
                    {
                        filePath: 'lib/service.dart',
                        totalLines: 50,
                        coveredLines: [1, 2, 3],
                        uncoveredLines: [4, 5],
                        coveragePercent: 60
                    }
                ]
            ]);

            const suite: SuiteCoverageData = {
                suiteName: 'test_suite',
                suitePath: 'test/test_suite.dart',
                totalLines: 50,
                coveredLines: 30,
                coveragePercent: 60,
                coveredFiles
            };

            const suites = new Map<string, SuiteCoverageData>([['test_suite', suite]]);
            const aggregate: AggregateSuiteCoverage = {
                suites,
                totalCoveragePercent: 60,
                totalLines: 50,
                totalCoveredLines: 30,
                uncoveredFiles: [],
                analyzedAt: new Date()
            };

            const html = generator.generateSuiteCoverageSection(suites, aggregate);

            // Should include file path
            assert.ok(html.includes('lib/service.dart'));

            // Should include file coverage
            assert.ok(html.includes('60.0%'));
        });
    });
});

function createMockSuite(name: string, coveragePercent: number): SuiteCoverageData {
    const totalLines = 100;
    const coveredLines = Math.floor((totalLines * coveragePercent) / 100);

    return {
        suiteName: name,
        suitePath: `test/${name}`,
        totalLines,
        coveredLines,
        coveragePercent,
        coveredFiles: new Map(),
        lastRun: new Date()
    };
}
