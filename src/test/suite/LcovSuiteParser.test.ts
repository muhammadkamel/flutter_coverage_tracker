import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { LcovSuiteParser } from '../../features/suite-coverage/LcovSuiteParser';
import { FileCoverage } from '../../features/suite-coverage/types';

suite('LcovSuiteParser Test Suite', () => {
    let parser: LcovSuiteParser;
    let tempDir: string;

    setup(() => {
        parser = new LcovSuiteParser();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcov-test-'));
    });

    teardown(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    suite('parseLcovContent', () => {
        test('should parse simple LCOV content', () => {
            const lcovContent = `SF:lib/src/service.dart
DA:10,5
DA:11,0
DA:12,3
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);

            assert.strictEqual(result.size, 1);
            assert.ok(result.has('lib/src/service.dart'));

            const coverage = result.get('lib/src/service.dart')!;
            assert.strictEqual(coverage.totalLines, 3);
            assert.strictEqual(coverage.coveredLines.length, 2);
            assert.strictEqual(coverage.uncoveredLines.length, 1);
            assert.deepStrictEqual(coverage.coveredLines, [10, 12]);
            assert.deepStrictEqual(coverage.uncoveredLines, [11]);
        });

        test('should calculate coverage percentage correctly', () => {
            const lcovContent = `SF:lib/test.dart
DA:1,1
DA:2,1
DA:3,0
DA:4,0
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);
            const coverage = result.get('lib/test.dart')!;

            assert.strictEqual(coverage.coveragePercent, 50);
        });

        test('should parse multiple files', () => {
            const lcovContent = `SF:lib/file1.dart
DA:1,1
end_of_record
SF:lib/file2.dart
DA:1,0
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);

            assert.strictEqual(result.size, 2);
            assert.ok(result.has('lib/file1.dart'));
            assert.ok(result.has('lib/file2.dart'));
        });

        test('should track hit counts', () => {
            const lcovContent = `SF:lib/test.dart
DA:10,5
DA:11,10
DA:12,0
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);
            const coverage = result.get('lib/test.dart')!;

            assert.ok(coverage.hitCounts);
            assert.strictEqual(coverage.hitCounts!.get(10), 5);
            assert.strictEqual(coverage.hitCounts!.get(11), 10);
            assert.strictEqual(coverage.hitCounts!.get(12), 0);
        });

        test('should handle empty LCOV content', () => {
            const result = parser.parseLcovContent('');
            assert.strictEqual(result.size, 0);
        });

        test('should handle file with no coverage data', () => {
            const lcovContent = `SF:lib/empty.dart
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);
            const coverage = result.get('lib/empty.dart')!;

            assert.strictEqual(coverage.totalLines, 0);
            assert.strictEqual(coverage.coveragePercent, 0);
        });

        test('should handle 100% coverage', () => {
            const lcovContent = `SF:lib/full.dart
DA:1,1
DA:2,1
DA:3,1
end_of_record`;

            const result = parser.parseLcovContent(lcovContent);
            const coverage = result.get('lib/full.dart')!;

            assert.strictEqual(coverage.coveragePercent, 100);
            assert.strictEqual(coverage.uncoveredLines.length, 0);
        });
    });

    suite('parseLcov', () => {
        test('should parse LCOV file from disk', () => {
            const lcovPath = path.join(tempDir, 'lcov.info');
            const content = `SF:lib/test.dart
DA:1,1
DA:2,0
end_of_record`;
            fs.writeFileSync(lcovPath, content);

            const result = parser.parseLcov(lcovPath);

            assert.strictEqual(result.size, 1);
            assert.ok(result.has('lib/test.dart'));
        });

        test('should return empty map for non-existent file', () => {
            const result = parser.parseLcov('/non/existent/file.lcov');
            assert.strictEqual(result.size, 0);
        });
    });

    suite('mergeCoverage', () => {
        test('should merge coverage from multiple maps', () => {
            const map1 = new Map<string, FileCoverage>([
                [
                    'lib/file.dart',
                    {
                        filePath: 'lib/file.dart',
                        totalLines: 3,
                        coveredLines: [1, 2],
                        uncoveredLines: [3],
                        coveragePercent: 66.67
                    }
                ]
            ]);

            const map2 = new Map<string, FileCoverage>([
                [
                    'lib/file.dart',
                    {
                        filePath: 'lib/file.dart',
                        totalLines: 3,
                        coveredLines: [2, 3],
                        uncoveredLines: [1],
                        coveragePercent: 66.67
                    }
                ]
            ]);

            const merged = parser.mergeCoverage([map1, map2]);
            const coverage = merged.get('lib/file.dart')!;

            // After merge, all lines should be covered
            assert.strictEqual(coverage.totalLines, 3);
            assert.strictEqual(coverage.coveredLines.length, 3);
            assert.strictEqual(coverage.uncoveredLines.length, 0);
            assert.strictEqual(coverage.coveragePercent, 100);
        });

        test('should merge hit counts correctly', () => {
            const map1 = new Map<string, FileCoverage>([
                [
                    'lib/file.dart',
                    {
                        filePath: 'lib/file.dart',
                        totalLines: 2,
                        coveredLines: [1, 2],
                        uncoveredLines: [],
                        coveragePercent: 100,
                        hitCounts: new Map([
                            [1, 5],
                            [2, 3]
                        ])
                    }
                ]
            ]);

            const map2 = new Map<string, FileCoverage>([
                [
                    'lib/file.dart',
                    {
                        filePath: 'lib/file.dart',
                        totalLines: 2,
                        coveredLines: [1, 2],
                        uncoveredLines: [],
                        coveragePercent: 100,
                        hitCounts: new Map([
                            [1, 3],
                            [2, 2]
                        ])
                    }
                ]
            ]);

            const merged = parser.mergeCoverage([map1, map2]);
            const coverage = merged.get('lib/file.dart')!;

            assert.strictEqual(coverage.hitCounts!.get(1), 8); // 5 + 3
            assert.strictEqual(coverage.hitCounts!.get(2), 5); // 3 + 2
        });

        test('should merge different files', () => {
            const map1 = new Map<string, FileCoverage>([
                [
                    'lib/file1.dart',
                    {
                        filePath: 'lib/file1.dart',
                        totalLines: 1,
                        coveredLines: [1],
                        uncoveredLines: [],
                        coveragePercent: 100
                    }
                ]
            ]);

            const map2 = new Map<string, FileCoverage>([
                [
                    'lib/file2.dart',
                    {
                        filePath: 'lib/file2.dart',
                        totalLines: 1,
                        coveredLines: [1],
                        uncoveredLines: [],
                        coveragePercent: 100
                    }
                ]
            ]);

            const merged = parser.mergeCoverage([map1, map2]);

            assert.strictEqual(merged.size, 2);
            assert.ok(merged.has('lib/file1.dart'));
            assert.ok(merged.has('lib/file2.dart'));
        });

        test('should handle empty maps', () => {
            const merged = parser.mergeCoverage([new Map(), new Map()]);
            assert.strictEqual(merged.size, 0);
        });
    });

    suite('filterByFiles', () => {
        test('should filter coverage by file patterns', () => {
            const coverage = new Map<string, FileCoverage>([
                ['lib/downloads/service.dart', createMockCoverage('lib/downloads/service.dart')],
                ['lib/auth/service.dart', createMockCoverage('lib/auth/service.dart')],
                ['lib/player/widget.dart', createMockCoverage('lib/player/widget.dart')]
            ]);

            const filtered = parser.filterByFiles(coverage, ['lib/downloads/*']);

            assert.strictEqual(filtered.size, 1);
            assert.ok(filtered.has('lib/downloads/service.dart'));
        });

        test('should support wildcard patterns', () => {
            const coverage = new Map<string, FileCoverage>([
                ['lib/src/file1.dart', createMockCoverage('lib/src/file1.dart')],
                ['lib/src/file2.dart', createMockCoverage('lib/src/file2.dart')],
                ['lib/test.dart', createMockCoverage('lib/test.dart')]
            ]);

            const filtered = parser.filterByFiles(coverage, ['lib/src/*.dart']);

            assert.strictEqual(filtered.size, 2);
        });

        test('should support multiple patterns', () => {
            const coverage = new Map<string, FileCoverage>([
                ['lib/downloads/a.dart', createMockCoverage('lib/downloads/a.dart')],
                ['lib/auth/b.dart', createMockCoverage('lib/auth/b.dart')],
                ['lib/player/c.dart', createMockCoverage('lib/player/c.dart')]
            ]);

            const filtered = parser.filterByFiles(coverage, ['lib/downloads/*', 'lib/auth/*']);

            assert.strictEqual(filtered.size, 2);
        });
    });

    suite('calculateTotalCoverage', () => {
        test('should calculate total coverage across files', () => {
            const coverage = new Map<string, FileCoverage>([
                [
                    'file1.dart',
                    {
                        filePath: 'file1.dart',
                        totalLines: 10,
                        coveredLines: [1, 2, 3, 4, 5, 6, 7, 8],
                        uncoveredLines: [9, 10],
                        coveragePercent: 80
                    }
                ],
                [
                    'file2.dart',
                    {
                        filePath: 'file2.dart',
                        totalLines: 10,
                        coveredLines: [1, 2, 3, 4, 5, 6],
                        uncoveredLines: [7, 8, 9, 10],
                        coveragePercent: 60
                    }
                ]
            ]);

            const totals = parser.calculateTotalCoverage(coverage);

            assert.strictEqual(totals.totalLines, 20);
            assert.strictEqual(totals.coveredLines, 14);
            assert.strictEqual(totals.coveragePercent, 70);
        });

        test('should handle empty coverage map', () => {
            const totals = parser.calculateTotalCoverage(new Map());

            assert.strictEqual(totals.totalLines, 0);
            assert.strictEqual(totals.coveredLines, 0);
            assert.strictEqual(totals.coveragePercent, 0);
        });

        test('should handle 100% coverage', () => {
            const coverage = new Map<string, FileCoverage>([
                [
                    'file.dart',
                    {
                        filePath: 'file.dart',
                        totalLines: 5,
                        coveredLines: [1, 2, 3, 4, 5],
                        uncoveredLines: [],
                        coveragePercent: 100
                    }
                ]
            ]);

            const totals = parser.calculateTotalCoverage(coverage);

            assert.strictEqual(totals.coveragePercent, 100);
        });
    });
});

function createMockCoverage(filePath: string): FileCoverage {
    return {
        filePath,
        totalLines: 10,
        coveredLines: [1, 2, 3, 4, 5],
        uncoveredLines: [6, 7, 8, 9, 10],
        coveragePercent: 50
    };
}
