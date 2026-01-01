import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../../shared/coverage/LcovParser';
import { CoverageGutterProvider } from '../../../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../../../features/status-bar/CoverageStatusManager';
import { RunRelatedTestCommand } from '../../../commands/RunRelatedTestCommand';
import { FlutterTestRunner } from '../../../features/test-runner/FlutterTestRunner';
import { CoverageOrchestrator } from '../../../features/test-runner/CoverageOrchestrator';
import { VsCodeFileWatcher } from '../../../features/test-runner/VsCodeFileWatcher';
import { PlatformCoverageManager } from '../../../features/platform-coverage/PlatformCoverageManager';

suite('RunRelatedTestCommand Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChild: any;
    let context: any;
    let orchestrator: CoverageOrchestrator;
    let testRunner: FlutterTestRunner;
    let gutterProvider: CoverageGutterProvider;
    let statusManager: CoverageStatusManager;
    let platformManager: PlatformCoverageManager;
    let command: RunRelatedTestCommand;
    let watcher: VsCodeFileWatcher;

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

        mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = sandbox.stub();
        sandbox.stub(cp, 'spawn').returns(mockChild);

        testRunner = new FlutterTestRunner();
        watcher = new VsCodeFileWatcher();
        orchestrator = new CoverageOrchestrator(testRunner, watcher);
        gutterProvider = new CoverageGutterProvider(context);
        platformManager = new PlatformCoverageManager();
        statusManager = new CoverageStatusManager(context, platformManager);

        command = new RunRelatedTestCommand(context, orchestrator, testRunner, gutterProvider, statusManager);

        (global as any).allWebviewMessages = [];
        (global as any).lastWebviewMessage = undefined;
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Run Related Test: error cases', async () => {
        // No active editor
        (vscode.window as any).activeTextEditor = undefined;
        let spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute();
        assert.ok(spy.calledWith('No active editor found.'));
        spy.restore();

        // Not a dart file
        const uri = vscode.Uri.file('/root/file.txt');
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute(uri);
        assert.ok(spy.calledWith('Current file is not in a Dart file.'));
        spy.restore();

        // No workspace
        const dartUri = vscode.Uri.file('/other/file.dart');
        (vscode.workspace as any).workspaceFolders = undefined;
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute(dartUri);
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

        await command.execute(uri);

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
            sandbox.stub(vscode.window, 'showTextDocument').resolves({ selection: {}, revealRange: () => {} } as any);
            await (global as any).lastWebviewCallback({ type: 'navigateToLine', file: 'lib/foo.dart', line: 10 });
            await (global as any).lastWebviewCallback({ type: 'rerun' });
            await (global as any).lastWebviewCallback({ type: 'cancel' });
            await (global as any).lastWebviewCallback({ type: 'toggle-watch', enable: true });
        }

        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
        }
    });
});
