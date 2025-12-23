import * as assert from 'assert';
import { CoverageMatcher } from '../../../../shared/coverage/CoverageMatcher';
import { FileCoverageData } from '../../../../shared/coverage/Coverage';
import * as path from 'path';

suite('Coverage Matching Test Suite', () => {

    test('normalizePath should use forward slashes', () => {
        assert.strictEqual(CoverageMatcher.normalizePath('foo\\bar\\baz'), 'foo/bar/baz');
        assert.strictEqual(CoverageMatcher.normalizePath('foo/bar/baz'), 'foo/bar/baz');
    });

    test('deduceSourceFilePath should map test files to lib files', () => {
        const workspaceRoot = '/my/workspace';

        // Standard case
        assert.strictEqual(
            CoverageMatcher.deduceSourceFilePath(path.join(workspaceRoot, 'test', 'features', 'login_test.dart'), workspaceRoot),
            'lib/features/login.dart'
        );

        // We skip explicit Windows backslash test on Mac because path.relative won't handle it correctly.
        // The extension relies on `path.relative` working for the host OS.

        // Not a test file
        assert.strictEqual(
            CoverageMatcher.deduceSourceFilePath('/my/workspace/lib/main.dart', workspaceRoot),
            undefined
        );

        // Test file not ending in _test.dart
        assert.strictEqual(
            CoverageMatcher.deduceSourceFilePath('/my/workspace/test/setup.dart', workspaceRoot),
            undefined
        );
    });

    test('findCoverageEntry should find exact match', () => {
        const workspaceRoot = '/root';
        const files: FileCoverageData[] = [
            { file: 'lib/foo.dart', linesFound: 10, linesHit: 5, percentage: 50, uncoveredLines: [] }
        ];

        const result = CoverageMatcher.findCoverageEntry('lib/foo.dart', files, workspaceRoot);
        assert.ok(result);
        assert.strictEqual(result?.matchType, 'exact');
        assert.strictEqual(result?.fileCoverage.file, 'lib/foo.dart');
    });

    test('findCoverageEntry should find match with absolute path in lcov', () => {
        const workspaceRoot = '/root';
        const files: FileCoverageData[] = [
            { file: '/root/lib/foo.dart', linesFound: 10, linesHit: 5, percentage: 50, uncoveredLines: [] }
        ];

        const result = CoverageMatcher.findCoverageEntry('lib/foo.dart', files, workspaceRoot);
        assert.ok(result);
        assert.strictEqual(result?.matchType, 'exact');
        assert.strictEqual(result?.normalizedPath, 'lib/foo.dart');
    });

    test('findCoverageEntry should find suffix match', () => {
        const workspaceRoot = '/root';
        const files: FileCoverageData[] = [
            // Simulating a case where lcov has a weird path structure (e.g. from a monorepo build)
            { file: 'packages/my_app/lib/foo.dart', linesFound: 10, linesHit: 5, percentage: 50, uncoveredLines: [] }
        ];

        const result = CoverageMatcher.findCoverageEntry('lib/foo.dart', files, workspaceRoot);
        assert.ok(result);
        assert.strictEqual(result?.matchType, 'suffix');
    });

    test('findCoverageEntry should find basename match', () => {
        const workspaceRoot = '/root';
        const files: FileCoverageData[] = [
            { file: 'weird/path/structure/foo.dart', linesFound: 10, linesHit: 5, percentage: 50, uncoveredLines: [] }
        ];

        const result = CoverageMatcher.findCoverageEntry('lib/foo.dart', files, workspaceRoot);
        assert.ok(result);
        assert.strictEqual(result?.matchType, 'basename');
    });

    test('findCoverageEntry should return undefined if no match', () => {
        const workspaceRoot = '/root';
        const files: FileCoverageData[] = [
            { file: 'lib/bar.dart', linesFound: 10, linesHit: 5, percentage: 50, uncoveredLines: [] }
        ];

        const result = CoverageMatcher.findCoverageEntry('lib/foo.dart', files, workspaceRoot);
        assert.strictEqual(result, undefined);
    });
});
