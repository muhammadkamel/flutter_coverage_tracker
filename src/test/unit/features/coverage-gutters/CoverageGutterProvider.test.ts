import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { CoverageGutterProvider } from '../../../../features/coverage-gutters/CoverageGutterProvider';
import { LcovParser } from '../../../../shared/coverage/LcovParser';

suite('CoverageGutterProvider Tests', () => {
    let provider: CoverageGutterProvider;
    let context: vscode.ExtensionContext;
    let sandbox: sinon.SinonSandbox;
    let setDecorationsSpy: sinon.SinonSpy;
    let activeEditor: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        context = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/path')
        } as any;

        // Mock VS Code configuration
        const config = {
            get: sandbox.stub()
        };
        config.get.withArgs('coveredGutterStyle').returns('green');
        config.get.withArgs('uncoveredGutterStyle').returns('red');
        config.get.withArgs('showGutterCoverage').returns(true);
        config.get.withArgs('coverageFilePath').returns('coverage/lcov.info');

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(config as any);

        // Mock Editor
        setDecorationsSpy = sandbox.spy();
        activeEditor = {
            document: {
                fileName: '/workspace/lib/test.dart',
                lineCount: 10,
                lineAt: (index: number) => ({
                    text: index === 5 ? 'code;' : '',
                    range: new vscode.Range(index, 0, index, 10),
                    lineNumber: index
                }),
                uri: { fsPath: '/workspace/lib/test.dart' }
            },
            setDecorations: setDecorationsSpy
        };

        sandbox.stub(vscode.window, 'activeTextEditor').get(() => activeEditor);
        sandbox.stub(vscode.window, 'visibleTextEditors').get(() => [activeEditor]);

        // Mock Workspace Folders
        sandbox.stub(vscode.workspace, 'workspaceFolders').get(() => [
            {
                uri: { fsPath: '/workspace' },
                index: 0,
                name: 'workspace'
            }
        ]);

        // Mock Decorations creation
        sandbox.stub(vscode.window, 'createTextEditorDecorationType').callsFake(() => ({ dispose: () => {} }) as any);

        // Mock FileSystemWatcher
        sandbox.stub(vscode.workspace, 'createFileSystemWatcher').returns({
            onDidChange: () => {},
            onDidCreate: () => {},
            onDidDelete: () => {},
            dispose: () => {}
        } as any);

        provider = new CoverageGutterProvider(context);
    });

    teardown(() => {
        provider.dispose();
        sandbox.restore();
    });

    test('Initial state: activeSessions should be 0', () => {
        // Access private property via casting to any, primarily for testing state
        assert.strictEqual((provider as any).activeSessions, 0);
    });

    test('startSession increments session count and updates decorations', () => {
        const updateSpy = sandbox.spy(provider, 'updateDecorations');
        provider.startSession();
        assert.strictEqual((provider as any).activeSessions, 1);
        assert.ok(updateSpy.calledWith(activeEditor));
    });

    test('endSession decrements session count', () => {
        provider.startSession();
        assert.strictEqual((provider as any).activeSessions, 1);

        provider.endSession();
        assert.strictEqual((provider as any).activeSessions, 0);
    });

    test('updateDecorations clears decorations if activeSessions is 0', () => {
        // Even if config is enabled
        (provider as any).activeSessions = 0;

        provider.updateDecorations(activeEditor);

        assert.ok(setDecorationsSpy.calledTwice); // Once for covered, once for uncovered
        // Both calls should pass empty array
        assert.deepStrictEqual(setDecorationsSpy.firstCall.args[1], []);
        assert.deepStrictEqual(setDecorationsSpy.secondCall.args[1], []);
    });

    test('updateDecorations applies decorations if activeSessions > 0', async () => {
        const root = path.sep === '/' ? '/workspace' : 'c:\\workspace';
        const filePath = path.join(root, 'lib', 'test.dart');

        // Update activeEditor mock for this test
        sandbox.stub(activeEditor.document, 'fileName').value(filePath);
        sandbox.stub(activeEditor.document, 'uri').value({ fsPath: filePath });

        // Verify relative path calculation matches what we expect
        // We need to ensure workspaceFolders returns the corresponding root
        const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').get(() => [
            {
                uri: { fsPath: root },
                index: 0,
                name: 'workspace'
            }
        ]);

        const relPath = path.relative(root, filePath);

        // Mock coverage data present using the exact relative path
        const coverageData = new Map<string, Set<number>>();
        coverageData.set(relPath, new Set([6])); // Line 6 is uncovered (index 5 + 1)
        (provider as any).coverageData = coverageData;

        // Reset spy to ignore startSession call artifacts
        setDecorationsSpy.resetHistory();

        provider.startSession(); // activeSessions = 1

        // The startSession calls updateDecorations, so we should see calls now.
        // Or we can call manually.
        provider.updateDecorations(activeEditor);

        assert.ok(setDecorationsSpy.called);

        const calls = setDecorationsSpy.getCalls();
        const uncoveredCall = calls.find(c => c.args[0] === (provider as any).uncoveredDecoration);

        assert.ok(uncoveredCall, 'Should have called setDecorations for uncovered lines');
        assert.ok(uncoveredCall.args[1].length > 0, 'Should have uncovered ranges');

        // Cleanup strictly for this test if needed, but teardown handles sandbox
    });

    test('loadCoverageData parsing success', async () => {
        // Mock fs.existsSync
        const fsStub = sandbox.stub(fs, 'existsSync').returns(true);

        // Mock LcovParser
        const lcovStub = sandbox.stub(LcovParser, 'parse').resolves({
            files: [
                {
                    file: 'lib/test.dart',
                    uncoveredLines: [6],
                    linesFound: 10,
                    linesHit: 9,
                    percentage: 90
                }
            ],
            overall: { linesFound: 10, linesHit: 9, percentage: 90 }
        } as any);

        // Trigger load via private method or re-initialization if possible,
        // but loadCoverageData is private. It is called in constructor.
        // But constructor runs before we set up specific stubs (fs, LcovParser) if we are not careful.
        // Actually, we set up stubs in `setup` but `provider` is created at end of `setup`.
        // So constructor ran with default stubs.

        // To test loadCoverageData specifically, we can call it if we cast to any
        await (provider as any).loadCoverageData();

        assert.ok(lcovStub.called);
        const map = (provider as any).coverageData as Map<string, Set<number>>;
        assert.ok(map.has('lib/test.dart'));
        assert.ok(map.get('lib/test.dart')?.has(6));
    });

    test('endSession calls clearAllDecorations when count reaches 0', () => {
        provider.startSession();

        // Spy on private clearAllDecorations? Or just check effect (setDecorations called with empty)
        setDecorationsSpy.resetHistory();

        provider.endSession();

        assert.ok(setDecorationsSpy.called, 'Should explicitly clear decorations');
        assert.deepStrictEqual(setDecorationsSpy.lastCall.args[1], []);
    });

    test('Multiple sessions logic', () => {
        provider.startSession();
        provider.startSession();
        assert.strictEqual((provider as any).activeSessions, 2);

        provider.endSession();
        assert.strictEqual((provider as any).activeSessions, 1);

        // Should still be showing decorations (implied by state > 0)

        provider.endSession();
        assert.strictEqual((provider as any).activeSessions, 0);
    });
});
