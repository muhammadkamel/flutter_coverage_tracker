import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../shared/coverage/LcovParser';

suite('Extension Activation Test Suite', () => {
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

    test('deactivate() should run', () => {
        myExtension.deactivate();
    });
});
