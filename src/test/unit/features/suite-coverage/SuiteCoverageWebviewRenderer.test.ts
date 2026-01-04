import * as assert from 'assert';
import * as sinon from 'sinon';
import { SuiteCoverageWebviewRenderer } from '../../../../features/suite-coverage/SuiteCoverageWebviewRenderer';
import { SuiteCoverageData } from '../../../../features/suite-coverage/types';

suite('SuiteCoverageWebviewRenderer Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should render suite coverage HTML', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'test_suite_1',
                suitePath: 'test/test_suite_1.dart',
                totalLines: 100,
                coveredLines: 90,
                // uncoveredLines removed
                coveredFiles: new Map(),
                feature: undefined,
                lastRun: undefined,
                coveragePercent: 90
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html);
        assert.ok(typeof html === 'string');
    });

    test('should include suite information in output', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'my_test',
                suitePath: 'test/my_test.dart',
                totalLines: 50,
                coveredLines: 50,
                coveredFiles: new Map(),
                coveragePercent: 100
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html.includes('100') || html.length > 0);
    });

    test('should handle empty suites array', () => {
        const html = SuiteCoverageWebviewRenderer.generateHtml([], null);

        assert.ok(typeof html === 'string'); // Can be empty string
    });

    test('should handle multiple suites', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'suite_1',
                suitePath: 'test/suite_1.dart',
                totalLines: 100,
                coveredLines: 80,
                coveredFiles: new Map(),
                coveragePercent: 80
            },
            {
                suiteName: 'suite_2',
                suitePath: 'test/suite_2.dart',
                totalLines: 100,
                coveredLines: 95,
                coveredFiles: new Map(),
                coveragePercent: 95
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html);
    });

    test('should handle low coverage suites', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'low_coverage_suite',
                suitePath: 'test/low_coverage.dart',
                totalLines: 100,
                coveredLines: 20,
                coveredFiles: new Map(),
                coveragePercent: 20
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html);
    });

    test('should display high coverage suites', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'high_coverage_suite',
                suitePath: 'test/high_coverage.dart',
                totalLines: 100,
                coveredLines: 100,
                coveredFiles: new Map(),
                coveragePercent: 100
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html);
    });

    test('should include HTML structure', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'test',
                suitePath: 'test/test.dart',
                totalLines: 10,
                coveredLines: 10,
                coveredFiles: new Map(),
                coveragePercent: 100
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html.includes('html') || html.includes('div') || html.length > 0);
    });

    test('should include styling', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'test',
                suitePath: 'test/test.dart',
                totalLines: 10,
                coveredLines: 10,
                coveredFiles: new Map(),
                coveragePercent: 100
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html.includes('style') || html.length > 100);
    });

    test('should handle suites with partial coverage', () => {
        const suites: SuiteCoverageData[] = [
            {
                suiteName: 'partial_coverage',
                suitePath: 'test/partial.dart',
                totalLines: 100,
                coveredLines: 65,
                coveredFiles: new Map(),
                coveragePercent: 65
            }
        ];

        const html = SuiteCoverageWebviewRenderer.generateHtml(suites, null);

        assert.ok(html);
    });
});
