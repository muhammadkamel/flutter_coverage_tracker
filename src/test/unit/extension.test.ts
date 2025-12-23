import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../shared/coverage/LcovParser';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChild: any;
    const mockContext: any = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/ext'),
        globalState: { get: () => undefined, update: () => Promise.resolve() },
        workspaceState: { get: () => undefined, update: () => Promise.resolve() }
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
        if ((global as any).lastWebviewMessage) {
            const finishedMsg = (global as any).lastWebviewMessage;
            assert.strictEqual(finishedMsg.type, 'finished');
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

    test('deactivate() should run', () => {
        myExtension.deactivate();
    });
});
