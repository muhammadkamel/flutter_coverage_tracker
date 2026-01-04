import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { PlatformTestCommand } from '../../../commands/PlatformTestCommand';
import { PlatformCoverageManager, Platform } from '../../../features/platform-coverage/PlatformCoverageManager';
import { CoverageStatusManager } from '../../../features/status-bar/CoverageStatusManager';

suite('PlatformTestCommand Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let platformManager: sinon.SinonStubbedInstance<PlatformCoverageManager>;
    let statusManager: sinon.SinonStubbedInstance<CoverageStatusManager>;

    setup(() => {
        sandbox = sinon.createSandbox();
        platformManager = sinon.createStubInstance(PlatformCoverageManager);
        statusManager = sinon.createStubInstance(CoverageStatusManager);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should execute Android platform test command', async () => {
        const command = new PlatformTestCommand(Platform.Android, platformManager, statusManager);

        const mockWorkspaceFolders = [
            { uri: vscode.Uri.file('/root'), name: 'test', index: 0 }
        ];

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);

        const mockTerminal = {
            sendText: sinon.stub(),
            show: sinon.stub()
        };

        sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        platformManager.getCoveragePath.returns('coverage/android');
        platformManager.getPlatformLabel.returns('Android');

        await command.execute();

        assert.ok(mockTerminal.sendText.calledTwice);
        const firstCall = mockTerminal.sendText.getCall(0).args[0];
        const secondCall = mockTerminal.sendText.getCall(1).args[0];

        assert.ok(firstCall.includes('cd'));
        assert.ok(secondCall.includes('flutter test --coverage'));
    });

    test('should execute iOS platform test command', async () => {
        const command = new PlatformTestCommand(Platform.iOS, platformManager, statusManager);

        const mockWorkspaceFolders = [
            { uri: vscode.Uri.file('/root'), name: 'test', index: 0 }
        ];

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);

        const mockTerminal = {
            sendText: sinon.stub(),
            show: sinon.stub()
        };

        sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        platformManager.getCoveragePath.returns('coverage/ios');
        platformManager.getPlatformLabel.returns('iOS');

        await command.execute();

        assert.ok(mockTerminal.sendText.calledTwice);
    });

    test('should execute Web platform test command', async () => {
        const command = new PlatformTestCommand(Platform.Web, platformManager, statusManager);

        const mockWorkspaceFolders = [
            { uri: vscode.Uri.file('/root'), name: 'test', index: 0 }
        ];

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);

        const mockTerminal = {
            sendText: sinon.stub(),
            show: sinon.stub()
        };

        sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        platformManager.getCoveragePath.returns('coverage/web');
        platformManager.getPlatformLabel.returns('Web');

        await command.execute();

        assert.ok(mockTerminal.sendText.calledTwice);
    });

    test('should execute Desktop platform test command', async () => {
        const command = new PlatformTestCommand(Platform.Desktop, platformManager, statusManager);

        const mockWorkspaceFolders = [
            { uri: vscode.Uri.file('/root'), name: 'test', index: 0 }
        ];

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);

        const mockTerminal = {
            sendText: sinon.stub(),
            show: sinon.stub()
        };

        sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        platformManager.getCoveragePath.returns('coverage/desktop');
        platformManager.getPlatformLabel.returns('Desktop');

        await command.execute();

        assert.ok(mockTerminal.sendText.calledTwice);
    });

    test('should show error when no workspace folder is open', async () => {
        const command = new PlatformTestCommand(Platform.Android, platformManager, statusManager);

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await command.execute();

        assert.ok(errorStub.calledOnce);
        assert.ok(errorStub.getCall(0).args[0].includes('No workspace folder'));
    });

    test('should handle empty workspace folders array', async () => {
        const command = new PlatformTestCommand(Platform.Android, platformManager, statusManager);

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([]);
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await command.execute();

        assert.ok(errorStub.calledOnce);
    });
});
