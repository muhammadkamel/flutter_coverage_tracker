import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SidebarProvider } from '../../../../features/sidebar/SidebarProvider';
import { LcovParser } from '../../../../shared/coverage/LcovParser';
import * as fs from 'fs';

suite('SidebarProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let provider: SidebarProvider;
    let mockWebviewView: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        const extensionUri = { fsPath: '/ext', with: () => null } as any;
        provider = new SidebarProvider(extensionUri);

        mockWebviewView = {
            webview: {
                options: {},
                html: '',
                onDidReceiveMessage: sandbox.stub(),
                asWebviewUri: (u: any) => u
            }
        };

        // Stub workspace config
        const configStub = {
            get: sandbox.stub().returns('coverage/lcov.info')
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(configStub as any);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/root' } }];
    });

    teardown(() => {
        sandbox.restore();
    });

    test('resolveWebviewView sets up webview', () => {
        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

        assert.ok(mockWebviewView.webview.options.enableScripts, 'Should enable scripts');
        assert.ok(mockWebviewView.webview.onDidReceiveMessage.called, 'Should listen for messages');
    });

    test('updateContent reads coverage and updates html', async () => {
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { percentage: 85, linesHit: 85, linesFound: 100 },
            files: []
        });

        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        await provider.updateContent();

        assert.ok(mockWebviewView.webview.html.includes('85%'), 'Should show coverage percentage');
    });

    test('updateContent handles missing coverage file gracefully', async () => {
        sandbox.stub(fs, 'existsSync').returns(false);
        const lcovSpy = sandbox.spy(LcovParser, 'parse');

        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        await provider.updateContent();

        assert.ok(lcovSpy.notCalled, 'Should not attempt to parse if file missing');
        assert.ok(mockWebviewView.webview.html.includes('0%'), 'Should default to 0%');
    });

    test('handles commands from webview', () => {
        let callback: (msg: any) => void;
        mockWebviewView.webview.onDidReceiveMessage.callsFake((cb: any) => {
            callback = cb;
            return { dispose: () => {} };
        });

        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');

        // Verify run-changed
        callback!({ type: 'run-changed' });
        assert.ok(
            executeCommandStub.calledWith('flutter-coverage-tracker.runChangedTests'),
            'Should run changed tests'
        );

        // Verify run-folder
        callback!({ type: 'run-folder' });
        assert.ok(executeCommandStub.calledWith('flutter-coverage-tracker.runFolderTests'), 'Should run folder tests');

        // Verify show-details
        callback!({ type: 'show-details' });
        assert.ok(executeCommandStub.calledWith('flutter-coverage-tracker.showDetails'), 'Should show details');
    });
});
