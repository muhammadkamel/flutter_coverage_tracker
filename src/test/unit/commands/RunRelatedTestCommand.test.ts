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
import { TestFileGeneratorService } from '../../../features/test-runner/utils/TestFileGeneratorService';
import { TestUpdater } from '../../../features/test-runner/utils/TestUpdater';
import { FileSystemUtils } from '../../../features/test-runner/utils/FileSystemUtils';
import { PlatformCoverageManager } from '../../../features/platform-coverage/PlatformCoverageManager';
import { WorkspaceService } from '../../../features/test-runner/utils/WorkspaceService';

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
    let workspaceServiceStub: sinon.SinonStubbedInstance<WorkspaceService>;
    let testFileGeneratorStub: sinon.SinonStubbedInstance<TestFileGeneratorService>;

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

        // Mock Services
        workspaceServiceStub = sandbox.createStubInstance(WorkspaceService);
        const workspaceRoot = vscode.Uri.file('/root');
        workspaceServiceStub.getWorkspaceFolder.returns({ uri: workspaceRoot, name: 'w', index: 0 });

        testFileGeneratorStub = sandbox.createStubInstance(TestFileGeneratorService);

        testRunner = new FlutterTestRunner();
        watcher = new VsCodeFileWatcher();
        orchestrator = new CoverageOrchestrator(testRunner, watcher);
        gutterProvider = new CoverageGutterProvider(context);
        platformManager = new PlatformCoverageManager();
        statusManager = new CoverageStatusManager(context, platformManager);

        command = new RunRelatedTestCommand(
            context,
            orchestrator,
            testRunner,
            gutterProvider,
            statusManager,
            workspaceServiceStub as any,
            testFileGeneratorStub as any
        );

        (global as any).allWebviewMessages = [];
        (global as any).lastWebviewMessage = undefined;
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Run Related Test: error cases', async () => {
        // No active editor
        sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
        let spy = sandbox.spy(vscode.window, 'showErrorMessage');
        await command.execute();
        assert.ok(spy.calledWith('No active editor found.'));
        spy.restore();

        // Not a dart file
        const uri = vscode.Uri.file('/root/file.txt');
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri } });
        await command.execute(uri);
        assert.ok(spy.calledWith('Current file is not in a Dart file.'));
        spy.restore();

        // No workspace
        const dartUri = vscode.Uri.file('/other/file.dart');
        workspaceServiceStub.getWorkspaceFolder.returns(undefined);
        spy = sandbox.spy(vscode.window, 'showErrorMessage');
        sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: dartUri } });
        await command.execute();
        assert.ok(spy.calledWith('File is not in a workspace.'));
        spy.restore();
    });

    test('Run Related Test: success path', async () => {
        const uri = vscode.Uri.file('/root/lib/foo.dart');
        sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri } });
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 100, linesHit: 10, linesFound: 10 },
            files: []
        });

        await command.execute();

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

    test('Run Related Test: auto-create test file if missing', async () => {
        const uri = vscode.Uri.file('/root/lib/new_feature.dart');
        const testFilePath = '/root/test/new_feature_test.dart';

        sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri } });

        // Ensure file does not act like it has a test
        // Use fs.existsSync stub for FileSystemUtils AND check in command
        // Ensure file does not act like it has a test
        sandbox.stub(fs, 'existsSync').callsFake((p: fs.PathLike) => {
            const pathStr = p.toString();
            // console.log('Checking existence for:', pathStr);
            return pathStr !== testFilePath;
        });
        sandbox.stub(FileSystemUtils, 'resolveTestFilePath').returns(testFilePath);

        testFileGeneratorStub.createTestFile.resolves(true);
        const spy = sandbox.spy(vscode.window, 'showInformationMessage');

        await command.execute();

        assert.ok(testFileGeneratorStub.createTestFile.calledOnce, 'Should have attempted to create test file');
        assert.ok(spy.calledWith(`Created test file: new_feature_test.dart`), 'Should show success message');
    });

    test('Run Related Test: should NOT update test file stubs if already exists', async () => {
        // Current file is the TEST file
        const uri = vscode.Uri.file('/root/test/feature_test.dart');
        const sourceFilePath = '/root/lib/feature.dart';

        sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri } });

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(FileSystemUtils, 'resolveSourceFilePath').returns(sourceFilePath);

        const updateStub = sandbox.stub(TestUpdater, 'updateTestFile').resolves(true);
        const spy = sandbox.spy(vscode.window, 'showInformationMessage');

        await command.execute();

        assert.ok(updateStub.notCalled, 'Should NOT have attempted to update test file');
        assert.ok(!spy.calledWith('Added missing test stubs for public methods.'), 'Should NOT show added stubs message');
    });
});
