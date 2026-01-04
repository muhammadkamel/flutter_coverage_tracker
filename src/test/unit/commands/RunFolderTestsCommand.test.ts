import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { LcovParser } from '../../../shared/coverage/LcovParser';
import { CoverageGutterProvider } from '../../../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../../../features/status-bar/CoverageStatusManager';
import { RunFolderTestsCommand } from '../../../commands/RunFolderTestsCommand';
import { PlatformCoverageManager } from '../../../features/platform-coverage/PlatformCoverageManager';
import { MockTestRunner } from '../../mocks/mocks';

suite('RunFolderTestsCommand Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let context: any;
    let testRunner: MockTestRunner;
    let gutterProvider: CoverageGutterProvider;
    let statusManager: CoverageStatusManager;
    let platformManager: PlatformCoverageManager;
    let command: RunFolderTestsCommand;

    setup(() => {
        sandbox = sinon.createSandbox();

        context = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/ext'),
            globalState: { get: () => undefined, update: () => Promise.resolve() },
            workspaceState: { get: () => undefined, update: () => Promise.resolve() },
            asAbsolutePath: (rel: string) => '/ext/' + rel,
            extensionPath: '/ext'
        };

        // Use MockTestRunner instead of real one + child_process mock
        testRunner = new MockTestRunner();
        gutterProvider = new CoverageGutterProvider(context);
        platformManager = new PlatformCoverageManager();
        statusManager = new CoverageStatusManager(context, platformManager);

        command = new RunFolderTestsCommand(context, testRunner, gutterProvider, statusManager);

        (global as any).allWebviewMessages = [];
        (global as any).lastWebviewMessage = undefined;

        sandbox.stub(vscode.window, 'createWebviewPanel').callsFake((viewType, title, showOptions, options) => {
            const panel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: (callback: any) => {
                        (global as any).lastWebviewCallback = callback;
                    },
                    postMessage: async (message: any) => {
                        (global as any).allWebviewMessages.push(message);
                        (global as any).lastWebviewMessage = message;
                        return true;
                    },
                    asWebviewUri: (uri: vscode.Uri) => uri
                },
                onDidDispose: (callback: any) => {
                    (global as any).lastWebviewDisposeCallback = callback;
                },
                reveal: () => { },
                dispose: () => {
                    if ((global as any).lastWebviewDisposeCallback) {
                        (global as any).lastWebviewDisposeCallback();
                    }
                }
            };
            return panel as any;
        });
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Run Folder Tests: error cases', async () => {
        // No uri
        let spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute(undefined);
        assert.ok(spy.calledWith('No folder selected.'));
        spy.restore();

        // No workspace
        const folderUri = vscode.Uri.file('/root/test/features/downloads');
        sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined);
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute(folderUri);
        assert.ok(spy.calledWith('Folder is not in a workspace.'));
        spy.restore();
    });

    test('Run Folder Tests: individual test status from coverage', async () => {
        const folderUri = vscode.Uri.file('/root/test/features/downloads');
        const workspaceRoot = vscode.Uri.file('/root');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: workspaceRoot, name: 'w', index: 0 }]);
        sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns({ uri: workspaceRoot, name: 'w', index: 0 });

        // Mock test files in folder
        const testFiles = [
            vscode.Uri.file('/root/test/features/downloads/download_service_test.dart'),
            vscode.Uri.file('/root/test/features/downloads/download_bloc_test.dart'),
            vscode.Uri.file('/root/test/features/downloads/download_helper_test.dart')
        ];

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(vscode.workspace, 'findFiles').resolves(testFiles);

        // Mock coverage data - only first two tests have coverage
        const mockCoverageData = {
            overall: { percentage: 85, linesHit: 85, linesFound: 100 },
            files: [
                {
                    file: 'lib/features/downloads/download_service.dart',
                    linesFound: 50,
                    linesHit: 50,
                    percentage: 100,
                    uncoveredLines: []
                },
                {
                    file: 'lib/features/downloads/download_bloc.dart',
                    linesFound: 40,
                    linesHit: 30,
                    percentage: 75,
                    uncoveredLines: [10, 20]
                }
            ]
        };

        sandbox.stub(LcovParser, 'parse').resolves(mockCoverageData);

        await command.execute(folderUri);

        // Fire output to cover onTestOutput callback
        testRunner.fireOutput('some log output');
        await new Promise(resolve => setTimeout(resolve, 0));
        // Verify webview got log
        if ((global as any).allWebviewMessages) {
            const logMsg = (global as any).allWebviewMessages.find((m: any) => m.type === 'log');
            assert.ok(logMsg, 'Should have received log message');
            assert.strictEqual(logMsg.value, 'some log output');
        }

        // Fire fake completion
        testRunner.fireComplete({ success: false });
        // Wait for async handlers
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify the webview received correct individual statuses
        if ((global as any).allWebviewMessages) {
            const finishedMsg = (global as any).allWebviewMessages.find((m: any) => m.type === 'finished');
            assert.ok(finishedMsg, 'Should have received finished message');
            assert.strictEqual(finishedMsg.success, false); // Overall failed
            assert.ok(finishedMsg.results);
            assert.strictEqual(finishedMsg.results.length, 3);
            // ... Rest of assertions coverage
            // First test: has coverage -> should be SUCCESS
            assert.strictEqual(finishedMsg.results[0].name, 'download_service_test.dart');
            assert.strictEqual(finishedMsg.results[0].success, true);
            assert.ok(finishedMsg.results[0].coverage);
            assert.strictEqual(finishedMsg.results[0].coverage.percentage, 100);

            // Second test: has coverage -> should be SUCCESS
            assert.strictEqual(finishedMsg.results[1].name, 'download_bloc_test.dart');
            assert.strictEqual(finishedMsg.results[1].success, true);
            assert.ok(finishedMsg.results[1].coverage);
            assert.strictEqual(finishedMsg.results[1].coverage.percentage, 75);

            // Third test: NO coverage -> should be FAILED
            assert.strictEqual(finishedMsg.results[2].name, 'download_helper_test.dart');
            assert.strictEqual(finishedMsg.results[2].success, false);
            assert.strictEqual(finishedMsg.results[2].coverage, null);
        }

        // Test rerun and cancel callbacks
        if ((global as any).lastWebviewCallback) {
            await (global as any).lastWebviewCallback({ type: 'rerun' });
            await (global as any).lastWebviewCallback({ type: 'cancel' });
            assert.ok(testRunner.runCalledWith); // Rerun called run
            assert.ok(testRunner.cancelCalled);  // Cancel called cancel
        }

        // Test dispose
        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
            assert.ok(testRunner.cancelCalled); // Dispose also cancels
        }
    });

    test('Run Folder Tests: watch mode', async () => {

        const folderUri = vscode.Uri.file('/root/test/features/downloads');
        const workspaceRoot = vscode.Uri.file('/root');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: workspaceRoot, name: 'w', index: 0 }]);
        sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns({ uri: workspaceRoot, name: 'w', index: 0 });
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(vscode.workspace, 'findFiles').resolves([]);

        const mockWatcher = {
            onDidChange: (cb: any) => { mockWatcher.changeCallback = cb; return { dispose: () => { } }; },
            onDidCreate: () => ({ dispose: () => { } }),
            onDidDelete: () => ({ dispose: () => { } }),
            dispose: sandbox.spy(),
            changeCallback: undefined as any
        };
        const createWatcherStub = sandbox.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher as any);

        await command.execute(folderUri);

        // Enable watch
        if ((global as any).lastWebviewCallback) {
            await (global as any).lastWebviewCallback({ type: 'toggle-watch', enable: true });
        }

        // Verify watcher created
        assert.ok(createWatcherStub.called, 'FileSystemWatcher should be created');
        // Check glob pattern - should be normalized path + /**/*.dart
        // path.posix.sep is /
        // /root/test/features/downloads/**/*.dart
        assert.ok((createWatcherStub.firstCall.args[0] as string).includes('root/test/features/downloads/**/*.dart'), 'Glob pattern mismatch');

        // Trigger file change
        const clock = sandbox.useFakeTimers();
        testRunner.runCalledWith = undefined; // Reset run check

        if (mockWatcher.changeCallback) {
            mockWatcher.changeCallback(vscode.Uri.file('/root/test/features/downloads/change.dart'));
        }

        // Advance debounce timer (2000ms)
        clock.tick(2500);

        // Verify re-run
        assert.ok(testRunner.runCalledWith, 'Test runner should rerun after file change');
        const runCall = testRunner.runCalledWith as { file: string; root: string };
        assert.strictEqual(runCall.file, '/root/test/features/downloads'); // Re-runs folder

        clock.restore();

        // Disable watch
        await (global as any).lastWebviewCallback({ type: 'toggle-watch', enable: false });
        assert.ok(mockWatcher.dispose.called, 'Watcher should be disposed');
    });
});
