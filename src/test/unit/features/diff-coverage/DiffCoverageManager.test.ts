import * as assert from 'assert';
import * as sinon from 'sinon';
import { DiffCoverageManager, DiffCoverageResult } from '../../../../features/diff-coverage/DiffCoverageManager';
import { PlatformCoverageManager } from '../../../../features/platform-coverage/PlatformCoverageManager';
import { GitService } from '../../../../features/git/GitService';

suite('DiffCoverageManager Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let platformManager: sinon.SinonStubbedInstance<PlatformCoverageManager>;
    let gitService: sinon.SinonStubbedInstance<GitService>;
    let manager: DiffCoverageManager;

    setup(() => {
        sandbox = sinon.createSandbox();
        platformManager = sinon.createStubInstance(PlatformCoverageManager);
        manager = new DiffCoverageManager(platformManager);
        
        // Stub GitService
        gitService = sandbox.createStubInstance(GitService);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should return null when no coverage data exists', async () => {
        platformManager.getCoverageForFile.returns(undefined);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.strictEqual(result, null);
    });

    test('should return full coverage when no lines changed', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: [50, 51, 52]
        });

        // Mock git service to return no changed lines
        const gitServiceStub = sandbox.stub(GitService.prototype, 'getChangedLines').resolves([]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.linesChanged, 0);
        assert.strictEqual(result?.percentage, 100);
    });

    test('should calculate diff coverage correctly when all changes are covered', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: [50, 51, 52]
        });

        sandbox.stub(GitService.prototype, 'getChangedLines').resolves([10, 11, 12, 13]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.linesChanged, 4);
        assert.strictEqual(result?.linesCovered, 4);
        assert.strictEqual(result?.percentage, 100);
        assert.strictEqual(result?.uncoveredChangedLines.length, 0);
    });

    test('should calculate diff coverage correctly when some changes are uncovered', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: [10, 11, 50, 51, 52]
        });

        sandbox.stub(GitService.prototype, 'getChangedLines').resolves([10, 11, 12, 13]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.linesChanged, 4);
        assert.strictEqual(result?.linesCovered, 2);
        assert.strictEqual(result?.percentage, 50);
        assert.deepStrictEqual(result?.uncoveredChangedLines, [10, 11]);
    });

    test('should calculate diff coverage correctly when all changes are uncovered', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: [10, 11, 12, 13, 50, 51, 52]
        });

        sandbox.stub(GitService.prototype, 'getChangedLines').resolves([10, 11, 12, 13]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.linesChanged, 4);
        assert.strictEqual(result?.linesCovered, 0);
        assert.strictEqual(result?.percentage, 0);
        assert.deepStrictEqual(result?.uncoveredChangedLines, [10, 11, 12, 13]);
    });

    test('should get diff coverage for workspace', async () => {
        const filePath1 = '/src/service.dart';
        const filePath2 = '/src/model.dart';

        platformManager.getCoverageForFile.withArgs(filePath1).returns({
            file: 'src/service.dart',
            percentage: 80,
            linesHit: 80,
            linesFound: 100,
            uncoveredLines: [50, 51]
        });

        platformManager.getCoverageForFile.withArgs(filePath2).returns({
            file: 'src/model.dart',
            percentage: 100,
            linesHit: 100,
            linesFound: 100,
            uncoveredLines: []
        });

        sandbox.stub(GitService.prototype, 'getChangedLines')
            .withArgs(filePath1).resolves([10, 11, 12])
            .withArgs(filePath2).resolves([20, 21]);

        const result1 = await manager.getDiffCoverageForFile(filePath1);
        const result2 = await manager.getDiffCoverageForFile(filePath2);

        assert.ok(result1);
        assert.ok(result2);
        assert.strictEqual(result1?.linesChanged, 3);
        assert.strictEqual(result2?.linesChanged, 2);
    });

    test('should handle empty changed lines gracefully', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 100,
            linesHit: 100,
            linesFound: 100,
            uncoveredLines: []
        });

        sandbox.stub(GitService.prototype, 'getChangedLines').resolves([]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.percentage, 100);
    });

    test('should round percentage correctly', async () => {
        platformManager.getCoverageForFile.returns({
            file: 'src/test.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: [50, 51, 52]
        });

        // 1 covered, 2 uncovered = 33.333...% coverage
        sandbox.stub(GitService.prototype, 'getChangedLines').resolves([10, 50, 51]);

        const result = await manager.getDiffCoverageForFile('/src/test.dart');

        assert.ok(result);
        assert.strictEqual(result?.percentage, 33);
    });
});
