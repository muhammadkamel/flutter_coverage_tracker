import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../shared/coverage/LcovParser';
import { GitService } from '../../features/git/GitService';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChild: any;
    const mockContext: any = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/ext'),
        globalState: { get: () => undefined, update: () => Promise.resolve() },
        workspaceState: { get: () => undefined, update: () => Promise.resolve() },
        asAbsolutePath: (rel: string) => '/ext/' + rel,
        extensionPath: '/ext'
    };

    setup(() => {
        sandbox = sinon.createSandbox();

        // Global stub for spawn
        mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = sandbox.stub();
        sandbox.stub(cp, 'spawn').returns(mockChild);

        mockContext.subscriptions = [];
        (global as any).allWebviewMessages = [];
        (global as any).lastWebviewMessage = undefined;
    });

    teardown(() => {
        sandbox.restore();
    });

    test('activate() should run and handle transitions', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: []
        });

        await myExtension.activate(mockContext);

        // Trigger watcher events
        if ((global as any).lastCreatedWatcher) {
            (global as any).lastCreatedWatcher._fire('change');
            (global as any).lastCreatedWatcher._fire('create');
            (global as any).lastCreatedWatcher._fire('delete');
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(mockContext.subscriptions.length > 0);
    });

    test('Run Related Test: error cases', async () => {
        await myExtension.activate(mockContext);

        // No active editor
        (vscode.window as any).activeTextEditor = undefined;
        let spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest');
        assert.ok(spy.calledWith('No active editor found.'));
        spy.restore();

        // Not a dart file
        const uri = vscode.Uri.file('/root/file.txt');
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest', uri);
        assert.ok(spy.calledWith('Current file is not in a Dart file.'));
        spy.restore();

        // No workspace
        const dartUri = vscode.Uri.file('/other/file.dart');
        (vscode.workspace as any).workspaceFolders = undefined;
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest', dartUri);
        assert.ok(spy.calledWith('File is not in a workspace.'));
        spy.restore();
    });

    test('Run Related Test: success path', async () => {
        const uri = vscode.Uri.file('/root/lib/foo.dart');
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: []
        });

        await myExtension.activate(mockContext);
        await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest', uri);

        // Completion success
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 50));

        // Completion failure
        mockChild.emit('close', 1);
        await new Promise(resolve => setTimeout(resolve, 50));

        // Cancellation
        mockChild.emit('close', null);
        await new Promise(resolve => setTimeout(resolve, 50));

        // Output
        mockChild.stdout.emit('data', 'log');

        if ((global as any).lastWebviewCallback) {
            sandbox.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
            sandbox.stub(vscode.window, 'showTextDocument').resolves({ selection: {}, revealRange: () => { } } as any);
            await (global as any).lastWebviewCallback({ type: 'navigateToLine', file: 'lib/foo.dart', line: 10 });
            await (global as any).lastWebviewCallback({ type: 'rerun' });
            await (global as any).lastWebviewCallback({ type: 'cancel' });
            await (global as any).lastWebviewCallback({ type: 'toggle-watch', enable: true });
        }

        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
        }
    });

    test('updateCoverage extra cases', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        // File does not exist
        sandbox.stub(fs, 'existsSync').returns(false);
        await myExtension.activate(mockContext);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Parse error
        sandbox.restore(); // Clear existsSync stub
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').rejects(new Error('Parse fail'));
        await myExtension.activate(mockContext);
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('Run Folder Tests: individual test status from coverage', async () => {
        const folderUri = vscode.Uri.file('/root/test/features/downloads');
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

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
                // Note: download_helper has NO coverage entry - should be marked as failed
            ]
        };

        sandbox.stub(LcovParser, 'parse').resolves(mockCoverageData);

        await myExtension.activate(mockContext);

        // Execute folder test command
        await vscode.commands.executeCommand('flutter-coverage-tracker.runFolderTests', folderUri);

        // Simulate test completion with overall failure (one test failed)
        mockChild.emit('close', 1);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify the webview received correct individual statuses
        if ((global as any).allWebviewMessages) {
            const finishedMsg = (global as any).allWebviewMessages.find((m: any) => m.type === 'finished');
            assert.ok(finishedMsg, 'Should have received finished message');
            assert.strictEqual(finishedMsg.success, false); // Overall failed
            assert.ok(finishedMsg.results);
            assert.strictEqual(finishedMsg.results.length, 3);

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
        }

        // Test dispose
        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
        }
    });

    test('Run Changed Tests: success path', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        // Mock GitService directly
        sandbox.stub(GitService.prototype, 'isGitRepo').resolves(true);
        sandbox.stub(GitService.prototype, 'getModifiedFiles').resolves(['lib/foo.dart', 'test/bar_test.dart']);

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: [
                { file: 'lib/foo.dart', linesFound: 10, linesHit: 10, percentage: 100, uncoveredLines: [] }
            ]
        });

        await myExtension.activate(mockContext);
        await vscode.commands.executeCommand('flutter-coverage-tracker.runChangedTests');

        // Verify webview was initialized (check all messages)
        const messages = (global as any).allWebviewMessages || [];
        const initMsg = messages.find((m: any) => m.type === 'init-dashboard');
        assert.ok(initMsg, 'Should send init-dashboard message');
        assert.strictEqual(initMsg.files.length, 2);

        // Simulate test completion
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify results sent to webview
        const finishedMsg = ((global as any).allWebviewMessages || []).find((m: any) => m.type === 'finished');
        assert.ok(finishedMsg, 'Should send finished message');
        assert.strictEqual(finishedMsg.success, true);
        assert.ok(finishedMsg.results.length >= 1);
    });

    test('Run Changed Tests: export message handler should work', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        // Mock GitService
        sandbox.stub(GitService.prototype, 'isGitRepo').resolves(true);
        sandbox.stub(GitService.prototype, 'getModifiedFiles').resolves(['lib/foo.dart']);

        const existsStub = sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 85, linesHit: 85, linesFound: 100 },
            files: [
                { file: 'lib/foo.dart', linesFound: 100, linesHit: 85, percentage: 85, uncoveredLines: [10, 20, 30] }
            ]
        });

        await myExtension.activate(mockContext);
        await vscode.commands.executeCommand('flutter-coverage-tracker.runChangedTests');

        // Simulate test completion
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test export message handler
        if ((global as any).lastWebviewCallback) {
            // Mock the save dialog and file write
            const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(
                vscode.Uri.file('/root/git_changes_uncovered_report.md')
            );
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

            await (global as any).lastWebviewCallback({ type: 'export' });

            // Verify save dialog was shown
            assert.ok(showSaveDialogStub.calledOnce, 'Save dialog should be shown');

            // Verify file was written
            assert.ok(writeFileSyncStub.calledOnce, 'File should be written');

            // Verify the content includes uncovered lines
            const content = writeFileSyncStub.firstCall.args[1] as string;
            assert.ok(content.includes('Uncovered Lines Report'), 'Report should have title');
        }
    });

    test('Run Changed Tests: export should handle missing coverage file', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        // Mock GitService
        sandbox.stub(GitService.prototype, 'isGitRepo').resolves(true);
        sandbox.stub(GitService.prototype, 'getModifiedFiles').resolves(['lib/foo.dart']);

        // First call returns true (for test file check), subsequent calls for coverage file return false
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.withArgs(sinon.match(/lcov\.info/)).returns(false);
        existsStub.returns(true);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 0, linesHit: 0, linesFound: 0 },
            files: []
        });

        await myExtension.activate(mockContext);
        await vscode.commands.executeCommand('flutter-coverage-tracker.runChangedTests');

        // Simulate test completion
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test export message handler with no coverage file
        if ((global as any).lastWebviewCallback) {
            const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(
                vscode.Uri.file('/root/git_changes_uncovered_report.md')
            );
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

            await (global as any).lastWebviewCallback({ type: 'export' });

            // Export should still work (with empty results)
            assert.ok(showSaveDialogStub.calledOnce, 'Save dialog should be shown even with no coverage');
        }
    });

    test('Run Changed Tests: navigate and cancel handlers should work', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        sandbox.stub(GitService.prototype, 'isGitRepo').resolves(true);
        sandbox.stub(GitService.prototype, 'getModifiedFiles').resolves(['lib/foo.dart']);
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: []
        });

        await myExtension.activate(mockContext);
        await vscode.commands.executeCommand('flutter-coverage-tracker.runChangedTests');

        // Test all message handlers
        if ((global as any).lastWebviewCallback) {
            const openDocStub = sandbox.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
            const showDocStub = sandbox.stub(vscode.window, 'showTextDocument').resolves({
                selection: {},
                revealRange: () => { }
            } as any);

            // Test navigateToLine
            await (global as any).lastWebviewCallback({
                type: 'navigateToLine',
                file: 'lib/foo.dart',
                line: 10
            });
            assert.ok(openDocStub.called, 'Should open document for navigateToLine');

            // Test navigateToTestFile
            await (global as any).lastWebviewCallback({
                type: 'navigateToTestFile',
                filePath: '/root/test/foo_test.dart'
            });

            // Test rerun
            await (global as any).lastWebviewCallback({ type: 'rerun' });

            // Test cancel
            await (global as any).lastWebviewCallback({ type: 'cancel' });
        }

        // Test dispose
        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
        }
    });

    test('deactivate() should run', () => {
        myExtension.deactivate();
    });
});
