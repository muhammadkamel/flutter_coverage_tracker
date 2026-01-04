import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../../shared/coverage/LcovParser';
import { GitService } from '../../../features/git/GitService';
import { CoverageGutterProvider } from '../../../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../../../features/status-bar/CoverageStatusManager';
import { RunChangedTestsCommand } from '../../../commands/RunChangedTestsCommand';
import { FlutterTestRunner } from '../../../features/test-runner/FlutterTestRunner';
import { PlatformCoverageManager } from '../../../features/platform-coverage/PlatformCoverageManager';

suite('RunChangedTestsCommand Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChild: any;
    let context: any;
    let gitService: GitService;
    let testRunner: FlutterTestRunner;
    let gutterProvider: CoverageGutterProvider;
    let statusManager: CoverageStatusManager;
    let platformManager: PlatformCoverageManager;
    let command: RunChangedTestsCommand;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mocks
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

        // Instantiation - we can use real classes since they are mocked at method level or dependency level
        gitService = new GitService();
        testRunner = new FlutterTestRunner();
        gutterProvider = new CoverageGutterProvider(context);
        platformManager = new PlatformCoverageManager(); // Needed for StatusManager
        statusManager = new CoverageStatusManager(context, platformManager);
        command = new RunChangedTestsCommand(context, gitService, testRunner, gutterProvider, statusManager);

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

    test('Run Changed Tests: success path', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }]);

        // Mock GitService calls directly on the instance we created if possible, or prototype
        sandbox.stub(gitService, 'isGitRepo').resolves(true);
        sandbox.stub(gitService, 'getModifiedFiles').resolves(['lib/foo.dart', 'test/bar_test.dart']);

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: [{ file: 'lib/foo.dart', linesFound: 10, linesHit: 10, percentage: 100, uncoveredLines: [] }]
        });

        await command.execute();

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

    test('Run Changed Tests: should manage gutter highlighting session', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }]);

        sandbox.stub(gitService, 'isGitRepo').resolves(true);
        sandbox.stub(gitService, 'getModifiedFiles').resolves(['lib/foo.dart']);
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox
            .stub(LcovParser, 'parse')
            .resolves({ overall: { percentage: 100, linesHit: 10, linesFound: 10 }, files: [] });

        const startSessionStub = sandbox.stub(gutterProvider, 'startSession');
        const endSessionStub = sandbox.stub(gutterProvider, 'endSession');

        await command.execute();

        assert.ok(startSessionStub.calledOnce, 'startSession should be called');

        if ((global as any).lastWebviewDisposeCallback) {
            (global as any).lastWebviewDisposeCallback();
        } else {
            assert.fail('Webview dispose callback was not registered');
        }

        assert.ok(endSessionStub.calledOnce, 'endSession should be called');
    });

    test('Run Changed Tests: export message handler should work', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }]);

        sandbox.stub(gitService, 'isGitRepo').resolves(true);
        sandbox.stub(gitService, 'getModifiedFiles').resolves(['lib/foo.dart']);
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 85, linesHit: 85, linesFound: 100 },
            files: [
                { file: 'lib/foo.dart', linesFound: 100, linesHit: 85, percentage: 85, uncoveredLines: [10, 20, 30] }
            ]
        });

        await command.execute();

        // Simulate test completion
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test export message handler
        if ((global as any).lastWebviewCallback) {
            const showSaveDialogStub = sandbox
                .stub(vscode.window, 'showSaveDialog')
                .resolves(vscode.Uri.file('/root/git_changes_uncovered_report.md'));
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

            await (global as any).lastWebviewCallback({ type: 'export' });

            assert.ok(showSaveDialogStub.calledOnce, 'Save dialog should be shown');
            assert.ok(writeFileSyncStub.calledOnce, 'File should be written');
            const content = writeFileSyncStub.firstCall.args[1] as string;
            assert.ok(content.includes('Uncovered Lines Report'), 'Report should have title');
        }
    });

    test('Run Changed Tests: export should handle missing coverage file', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }]);

        sandbox.stub(gitService, 'isGitRepo').resolves(true);
        sandbox.stub(gitService, 'getModifiedFiles').resolves(['lib/foo.dart']);

        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.withArgs(sinon.match(/lcov\.info/)).returns(false);
        existsStub.returns(true);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 0, linesHit: 0, linesFound: 0 },
            files: []
        });

        await command.execute();

        // Simulate test completion
        mockChild.emit('close', 0);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test export message handler
        if ((global as any).lastWebviewCallback) {
            const showSaveDialogStub = sandbox
                .stub(vscode.window, 'showSaveDialog')
                .resolves(vscode.Uri.file('/root/git_changes_uncovered_report.md'));
            const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

            await (global as any).lastWebviewCallback({ type: 'export' });

            assert.ok(showSaveDialogStub.calledOnce, 'Save dialog should be shown');
        }
    });

    test('Run Changed Tests: navigate and cancel handlers should work', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }]);

        sandbox.stub(gitService, 'isGitRepo').resolves(true);
        sandbox.stub(gitService, 'getModifiedFiles').resolves(['lib/foo.dart']);
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox
            .stub(LcovParser, 'parse')
            .resolves({ overall: { percentage: 100, linesHit: 10, linesFound: 10 }, files: [] });

        await command.execute();

        if ((global as any).lastWebviewCallback) {
            const openDocStub = sandbox.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
            const showDocStub = sandbox
                .stub(vscode.window, 'showTextDocument')
                .resolves({ selection: {}, revealRange: () => { } } as any);

            // Test navigateToLine
            await (global as any).lastWebviewCallback({
                type: 'navigateToLine',
                file: 'lib/foo.dart',
                line: 10
            });
            assert.ok(openDocStub.called, 'Should open document for navigateToLine');

            // Test rerun
            await (global as any).lastWebviewCallback({ type: 'rerun' });

            // Test cancel
            await (global as any).lastWebviewCallback({ type: 'cancel' });
        }
    });
});
