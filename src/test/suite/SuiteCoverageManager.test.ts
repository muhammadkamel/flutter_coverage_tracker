import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { SuiteCoverageManager } from '../../features/suite-coverage/SuiteCoverageManager';
import { SuiteCoverageData, FileCoverage } from '../../features/suite-coverage/types';

suite('SuiteCoverageManager Test Suite', () => {
    let manager: SuiteCoverageManager;
    let tempDir: string;

    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-coverage-'));
        manager = new SuiteCoverageManager(tempDir);
    });

    teardown(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    suite('parseSuiteCoverage', () => {
        test('should parse suite coverage from LCOV file', async () => {
            const lcovPath = path.join(tempDir, 'coverage.lcov');
            const lcovContent = `SF:lib/downloads/service.dart
DA:10,5
DA:11,3
DA:12,0
end_of_record`;
            fs.writeFileSync(lcovPath, lcovContent);

            const result = await manager.parseSuiteCoverage(
                'downloads_test.dart',
                'test/downloads_test.dart',
                lcovPath
            );

            assert.strictEqual(result.suiteName, 'downloads_test.dart');
            assert.strictEqual(result.suitePath, 'test/downloads_test.dart');
            assert.strictEqual(result.totalLines, 3);
            assert.strictEqual(result.coveredLines, 2);
            assert.ok(result.coveragePercent > 66 && result.coveragePercent < 67);
        });

        test('should cache suite coverage', async () => {
            const lcovPath = path.join(tempDir, 'coverage.lcov');
            fs.writeFileSync(
                lcovPath,
                `SF:lib/test.dart
DA:1,1
end_of_record`
            );

            await manager.parseSuiteCoverage('test_suite', 'test/test.dart', lcovPath);
            const cached = manager.getSuiteCoverage('test_suite');

            assert.ok(cached);
            assert.strictEqual(cached!.suiteName, 'test_suite');
        });
    });

    suite('parseAllSuites', () => {
        test('should parse multiple suites', async () => {
            // Create LCOV files for multiple suites
            const lcov1 = path.join(tempDir, 'suite1.lcov');
            const lcov2 = path.join(tempDir, 'suite2.lcov');

            fs.writeFileSync(
                lcov1,
                `SF:lib/file1.dart
DA:1,1
DA:2,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:lib/file2.dart
DA:1,1
DA:2,0
end_of_record`
            );

            const results = await manager.parseAllSuites([
                { suiteName: 'suite1', suitePath: 'test/suite1.dart', lcovPath: lcov1 },
                { suiteName: 'suite2', suitePath: 'test/suite2.dart', lcovPath: lcov2 }
            ]);

            assert.strictEqual(results.size, 2);
            assert.ok(results.has('suite1'));
            assert.ok(results.has('suite2'));
        });
    });

    suite('getSuitesForFile', () => {
        test('should return suites covering a specific file', async () => {
            const lcov1 = path.join(tempDir, 'suite1.lcov');
            const lcov2 = path.join(tempDir, 'suite2.lcov');

            const targetFile = 'lib/shared/utils.dart';

            fs.writeFileSync(
                lcov1,
                `SF:${targetFile}
DA:1,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:${targetFile}
DA:1,1
DA:2,1
end_of_record`
            );

            await manager.parseAllSuites([
                { suiteName: 'suite1', suitePath: 'test/suite1.dart', lcovPath: lcov1 },
                { suiteName: 'suite2', suitePath: 'test/suite2.dart', lcovPath: lcov2 }
            ]);

            const suites = manager.getSuitesForFile(targetFile);

            assert.strictEqual(suites.length, 2);
            // Should be sorted by coverage (suite2 has higher coverage)
            assert.strictEqual(suites[0].suiteName, 'suite2');
        });

        test('should return empty array for uncovered file', () => {
            const suites = manager.getSuitesForFile('lib/uncovered.dart');
            assert.strictEqual(suites.length, 0);
        });
    });

    suite('calculateOverlap', () => {
        test('should calculate overlap between two suites', async () => {
            const lcov1 = path.join(tempDir, 'suite1.lcov');
            const lcov2 = path.join(tempDir, 'suite2.lcov');

            const sharedFile = 'lib/shared.dart';

            fs.writeFileSync(
                lcov1,
                `SF:${sharedFile}
DA:1,1
DA:2,1
DA:3,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:${sharedFile}
DA:1,1
DA:2,1
DA:4,1
end_of_record`
            );

            await manager.parseAllSuites([
                { suiteName: 'suite1', suitePath: 'test/suite1.dart', lcovPath: lcov1 },
                { suiteName: 'suite2', suitePath: 'test/suite2.dart', lcovPath: lcov2 }
            ]);

            const overlap = manager.calculateOverlap('suite1', 'suite2');

            assert.ok(overlap);
            assert.strictEqual(overlap!.overlapLines, 2); // Lines 1 and 2
            assert.strictEqual(overlap!.sharedFiles.length, 1);
            assert.ok(overlap!.overlapPercent > 66 && overlap!.overlapPercent < 67);
        });

        test('should return null for non-existent suites', () => {
            const overlap = manager.calculateOverlap('nonexistent1', 'nonexistent2');
            assert.strictEqual(overlap, null);
        });

        test('should return zero overlap for suites covering different files', async () => {
            const lcov1 = path.join(tempDir, 'suite1.lcov');
            const lcov2 = path.join(tempDir, 'suite2.lcov');

            fs.writeFileSync(
                lcov1,
                `SF:lib/file1.dart
DA:1,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:lib/file2.dart
DA:1,1
end_of_record`
            );

            await manager.parseAllSuites([
                { suiteName: 'suite1', suitePath: 'test/suite1.dart', lcovPath: lcov1 },
                { suiteName: 'suite2', suitePath: 'test/suite2.dart', lcovPath: lcov2 }
            ]);

            const overlap = manager.calculateOverlap('suite1', 'suite2');

            assert.ok(overlap);
            assert.strictEqual(overlap!.overlapLines, 0);
            assert.strictEqual(overlap!.sharedFiles.length, 0);
        });
    });

    suite('groupSuitesByDirectory', () => {
        test('should group suites by directory', async () => {
            const lcov1 = path.join(tempDir, 'coverage1.lcov');
            const lcov2 = path.join(tempDir, 'coverage2.lcov');

            fs.writeFileSync(
                lcov1,
                `SF:lib/test.dart
DA:1,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:lib/test.dart
DA:1,1
end_of_record`
            );

            await manager.parseAllSuites([
                {
                    suiteName: 'downloads_test',
                    suitePath: path.join(tempDir, 'test/downloads/downloads_test.dart'),
                    lcovPath: lcov1
                },
                {
                    suiteName: 'auth_test',
                    suitePath: path.join(tempDir, 'test/auth/auth_test.dart'),
                    lcovPath: lcov2
                }
            ]);

            const grouped = manager.groupSuitesByDirectory();

            assert.ok(grouped.size >= 2);
        });
    });

    suite('getLowCoverageSuites', () => {
        test('should return suites below threshold', async () => {
            const lcov1 = path.join(tempDir, 'high.lcov');
            const lcov2 = path.join(tempDir, 'low.lcov');

            fs.writeFileSync(
                lcov1,
                `SF:lib/file.dart
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,1
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:lib/file.dart
DA:1,1
DA:2,0
DA:3,0
DA:4,0
DA:5,0
end_of_record`
            );

            await manager.parseAllSuites([
                { suiteName: 'high_coverage', suitePath: 'test/high.dart', lcovPath: lcov1 },
                { suiteName: 'low_coverage', suitePath: 'test/low.dart', lcovPath: lcov2 }
            ]);

            const lowCoverage = manager.getLowCoverageSuites(50);

            assert.strictEqual(lowCoverage.length, 1);
            assert.strictEqual(lowCoverage[0].suiteName, 'low_coverage');
        });
    });

    suite('getTopSuites', () => {
        test('should return top N suites by coverage', async () => {
            const suites = [
                { name: 'suite1', coverage: 95 },
                { name: 'suite2', coverage: 85 },
                { name: 'suite3', coverage: 75 }
            ];

            for (const suite of suites) {
                const lcovPath = path.join(tempDir, `${suite.name}.lcov`);
                const covered = Math.floor(suite.coverage);
                const uncovered = 100 - covered;

                let lcovContent = `SF:lib/file.dart\n`;
                for (let i = 1; i <= covered; i++) {
                    lcovContent += `DA:${i},1\n`;
                }
                for (let i = covered + 1; i <= 100; i++) {
                    lcovContent += `DA:${i},0\n`;
                }
                lcovContent += 'end_of_record';

                fs.writeFileSync(lcovPath, lcovContent);
            }

            await manager.parseAllSuites(
                suites.map(s => ({
                    suiteName: s.name,
                    suitePath: `test/${s.name}.dart`,
                    lcovPath: path.join(tempDir, `${s.name}.lcov`)
                }))
            );

            const topSuites = manager.getTopSuites(2);

            assert.strictEqual(topSuites.length, 2);
            assert.strictEqual(topSuites[0].suiteName, 'suite1');
            assert.strictEqual(topSuites[1].suiteName, 'suite2');
        });
    });

    suite('getAggregateCoverage', () => {
        test('should calculate aggregate coverage', async () => {
            const lcov1 = path.join(tempDir, 'suite1.lcov');
            const lcov2 = path.join(tempDir, 'suite2.lcov');

            fs.writeFileSync(
                lcov1,
                `SF:lib/file1.dart
DA:1,1
DA:2,0
end_of_record`
            );

            fs.writeFileSync(
                lcov2,
                `SF:lib/file2.dart
DA:1,1
DA:2,1
end_of_record`
            );

            await manager.parseAllSuites([
                { suiteName: 'suite1', suitePath: 'test/suite1.dart', lcovPath: lcov1 },
                { suiteName: 'suite2', suitePath: 'test/suite2.dart', lcovPath: lcov2 }
            ]);

            const aggregate = manager.getAggregateCoverage();

            assert.strictEqual(aggregate.suites.size, 2);
            assert.strictEqual(aggregate.totalLines, 4);
            assert.strictEqual(aggregate.totalCoveredLines, 3);
            assert.strictEqual(aggregate.totalCoveragePercent, 75);
        });
    });

    suite('clearCache', () => {
        test('should clear cached coverage data', async () => {
            const lcovPath = path.join(tempDir, 'coverage.lcov');
            fs.writeFileSync(
                lcovPath,
                `SF:lib/test.dart
DA:1,1
end_of_record`
            );

            await manager.parseSuiteCoverage('test', 'test/test.dart', lcovPath);
            assert.ok(manager.getSuiteCoverage('test'));

            manager.clearCache();
            assert.strictEqual(manager.getSuiteCoverage('test'), undefined);
        });
    });
});
