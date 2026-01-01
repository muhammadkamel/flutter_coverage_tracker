import * as assert from 'assert';
import { TestSuggestionEngine } from '../../../../features/test-runner/TestSuggestionEngine';
import { FileCoverageData } from '../../../../shared/coverage/Coverage';

suite('TestSuggestionEngine', () => {
    suite('analyzeCoverage', () => {
        test('should return empty array for empty input', () => {
            const result = TestSuggestionEngine.analyzeCoverage([], '/workspace');
            assert.strictEqual(result.length, 0);
        });

        test('should skip files with 100% coverage', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/perfect.dart',
                    linesFound: 50,
                    linesHit: 50,
                    percentage: 100,
                    uncoveredLines: []
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 0);
        });

        test('should generate suggestions for files with incomplete coverage', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/features/login/login_controller.dart',
                    linesFound: 100,
                    linesHit: 50,
                    percentage: 50,
                    uncoveredLines: [10, 20, 30, 40, 50]
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].file, files[0].file);
            assert.strictEqual(result[0].fileName, 'login_controller.dart');
            assert.strictEqual(result[0].uncoveredCount, 5);
            assert.strictEqual(result[0].coveragePercentage, 50);
        });

        test('should sort suggestions by priority score descending', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/low.dart',
                    linesFound: 20,
                    linesHit: 18,
                    percentage: 90,
                    uncoveredLines: [1, 2]
                },
                {
                    file: '/workspace/lib/high.dart',
                    linesFound: 200,
                    linesHit: 50,
                    percentage: 25,
                    uncoveredLines: Array.from({ length: 50 }, (_, i) => i + 1)
                },
                {
                    file: '/workspace/lib/medium.dart',
                    linesFound: 100,
                    linesHit: 60,
                    percentage: 60,
                    uncoveredLines: Array.from({ length: 20 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].file, '/workspace/lib/high.dart');
            assert.ok(result[0].priorityScore > result[1].priorityScore);
            assert.ok(result[1].priorityScore > result[2].priorityScore);
        });

        test('should limit results to topN parameter', () => {
            const files: FileCoverageData[] = Array.from({ length: 20 }, (_, i) => ({
                file: `/workspace/lib/file${i}.dart`,
                linesFound: 100,
                linesHit: 50 + i,
                percentage: 50 + i,
                uncoveredLines: Array.from({ length: 50 - i }, (_, j) => j + 1)
            }));
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace', 5);
            assert.strictEqual(result.length, 5);
        });
    });

    suite('Priority Calculation', () => {
        test('should assign high priority to files with many uncovered lines', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/high_priority.dart',
                    linesFound: 200,
                    linesHit: 50,
                    percentage: 25,
                    uncoveredLines: Array.from({ length: 100 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].priority, 'high');
            assert.ok(result[0].priorityScore >= 40);
        });

        test('should assign medium priority to moderately uncovered files', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/medium_priority.dart',
                    linesFound: 100,
                    linesHit: 70,
                    percentage: 70,
                    uncoveredLines: Array.from({ length: 15 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].priority, 'medium');
            assert.ok(result[0].priorityScore >= 15);
            assert.ok(result[0].priorityScore < 40);
        });

        test('should assign low priority to mostly covered files', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/low_priority.dart',
                    linesFound: 50,
                    linesHit: 48,
                    percentage: 96,
                    uncoveredLines: [1, 2]
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].priority, 'low');
            assert.ok(result[0].priorityScore < 15);
        });
    });

    suite('Complexity Estimation', () => {
        test('should mark small files as simple', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/simple.dart',
                    linesFound: 50,
                    linesHit: 40,
                    percentage: 80,
                    uncoveredLines: [1, 2, 3, 4, 5]
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].complexity, 'simple');
        });

        test('should mark medium files as moderate', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/moderate.dart',
                    linesFound: 150,
                    linesHit: 100,
                    percentage: 67,
                    uncoveredLines: Array.from({ length: 10 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].complexity, 'moderate');
        });

        test('should mark large files as complex', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/complex.dart',
                    linesFound: 300,
                    linesHit: 200,
                    percentage: 67,
                    uncoveredLines: Array.from({ length: 20 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result[0].complexity, 'complex');
        });
    });

    suite('Suggestion Generation', () => {
        test('should generate widget-specific suggestions for widget files', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/ui/login_widget.dart',
                    linesFound: 50,
                    linesHit: 40,
                    percentage: 80,
                    uncoveredLines: [1, 2, 3]
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            const hasWidgetSuggestion = result[0].suggestions.some(
                s => s.includes('widget') || s.includes('rendering') || s.includes('interactions')
            );
            assert.ok(hasWidgetSuggestion);
        });

        test('should generate repository-specific suggestions for repository files', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/data/user_repository.dart',
                    linesFound: 100,
                    linesHit: 70,
                    percentage: 70,
                    uncoveredLines: Array.from({ length: 10 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            const hasRepoSuggestion = result[0].suggestions.some(
                s => s.includes('data') || s.includes('error handling')
            );
            assert.ok(hasRepoSuggestion);
        });

        test('should generate controller-specific suggestions for controller files', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/features/login/login_controller.dart',
                    linesFound: 80,
                    linesHit: 50,
                    percentage: 62.5,
                    uncoveredLines: Array.from({ length: 15 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            const hasControllerSuggestion = result[0].suggestions.some(
                s => s.includes('state') || s.includes('events')
            );
            assert.ok(hasControllerSuggestion);
        });

        test('should include uncovered lines count in suggestions', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/example.dart',
                    linesFound: 100,
                    linesHit: 80,
                    percentage: 80,
                    uncoveredLines: Array.from({ length: 15 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            const hasUncoveredCount = result[0].suggestions.some(s => s.includes('15'));
            assert.ok(hasUncoveredCount);
        });

        test('should include coverage improvement suggestions', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/example.dart',
                    linesFound: 100,
                    linesHit: 50,
                    percentage: 50,
                    uncoveredLines: Array.from({ length: 50 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            const hasCoverageSuggestion = result[0].suggestions.some(
                s => s.includes('coverage') || s.includes('test cases')
            );
            assert.ok(hasCoverageSuggestion);
        });
    });

    suite('Edge Cases', () => {
        test('should handle file with 0% coverage', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/uncovered.dart',
                    linesFound: 100,
                    linesHit: 0,
                    percentage: 0,
                    uncoveredLines: Array.from({ length: 100 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].priority, 'high');
            assert.strictEqual(result[0].coveragePercentage, 0);
        });

        test('should handle file with 99% coverage', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/almost_perfect.dart',
                    linesFound: 100,
                    linesHit: 99,
                    percentage: 99,
                    uncoveredLines: [50]
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].priority, 'low');
        });

        test('should handle very large uncovered line count', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/huge.dart',
                    linesFound: 500,
                    linesHit: 100,
                    percentage: 20,
                    uncoveredLines: Array.from({ length: 200 }, (_, i) => i + 1)
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].uncoveredCount, 200);
            assert.strictEqual(typeof result[0].priorityScore, 'number');
        });

        test('should handle empty uncovered lines array (should not happen but defensive)', () => {
            const files: FileCoverageData[] = [
                {
                    file: '/workspace/lib/edge.dart',
                    linesFound: 100,
                    linesHit: 90,
                    percentage: 90,
                    uncoveredLines: []
                }
            ];
            const result = TestSuggestionEngine.analyzeCoverage(files, '/workspace');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].uncoveredCount, 0);
        });
    });
});
