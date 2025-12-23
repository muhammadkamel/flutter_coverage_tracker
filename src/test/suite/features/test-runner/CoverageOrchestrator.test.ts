import * as assert from 'assert';
import { CoverageOrchestrator } from '../../../../features/test-runner/CoverageOrchestrator';
import { MockTestRunner, MockFileWatcher } from '../../../mocks/mocks';

suite('Coverage Orchestrator Test Suite', () => {
    let orchestrator: CoverageOrchestrator;
    let mockRunner: MockTestRunner;
    let mockWatcher: MockFileWatcher;
    const testFile = '/test/file.dart';
    const workspaceRoot = '/root';

    setup(() => {
        mockRunner = new MockTestRunner();
        mockWatcher = new MockFileWatcher();
        orchestrator = new CoverageOrchestrator(mockRunner, mockWatcher);
    });

    teardown(() => {
        orchestrator.toggleWatch(false);
    });

    test('runTest triggers runner', async () => {
        await orchestrator.runTest(testFile, workspaceRoot);
        assert.deepStrictEqual(mockRunner.runCalledWith, { file: testFile, root: workspaceRoot });
    });

    test('cancelTest triggers runner cancel', () => {
        orchestrator.cancelTest();
        assert.ok(mockRunner.cancelCalled);
    });

    test('toggleWatch(true) starts watching active file', async () => {
        // Need to run test first to set active file
        await orchestrator.runTest(testFile, workspaceRoot);

        orchestrator.toggleWatch(true);
        assert.strictEqual(mockWatcher.watchedFile, testFile);
    });

    test('toggleWatch(false) stops watching', () => {
        orchestrator.toggleWatch(true);
        orchestrator.toggleWatch(false);
        assert.ok(mockWatcher.disposed);
    });

    test('onFileChanged triggers run after debounce', async () => {
        // Setup
        await orchestrator.runTest(testFile, workspaceRoot);
        orchestrator.toggleWatch(true);

        // Trigger change
        mockWatcher.fireChange();

        // Assert not run immediately (debounce)
        // Note: Since debounce is 2000ms, checking 'immediately' is sync.
        // We reset runCalledWith to check if it's called again
        mockRunner.runCalledWith = undefined;

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 2100));

        assert.deepStrictEqual(mockRunner.runCalledWith, { file: testFile, root: workspaceRoot });
    }).timeout(3000);

    test('runTest automatically starts watching if isWatching is true', async () => {
        // Enable watch first
        orchestrator.toggleWatch(true);
        assert.strictEqual(mockWatcher.watchedFile, undefined, 'Should not watch until a file is run');

        // Run test
        await orchestrator.runTest(testFile, workspaceRoot);

        // Should now be watching
        assert.strictEqual(mockWatcher.watchedFile, testFile, 'Should start watching after run if toggle was true');
    });

    test('toggleWatch(true) with active file starts watching immediately', async () => {
        await orchestrator.runTest(testFile, workspaceRoot);
        mockWatcher.watchedFile = undefined; // Reset for test

        orchestrator.toggleWatch(true);
        assert.strictEqual(mockWatcher.watchedFile, testFile);
    });
});
