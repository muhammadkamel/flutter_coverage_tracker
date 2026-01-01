import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { LcovParser } from '../../../shared/coverage/LcovParser';
import { CoverageGutterProvider } from '../../../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../../../features/status-bar/CoverageStatusManager';
import { RunFolderTestsCommand } from '../../../commands/RunFolderTestsCommand';
import { FlutterTestRunner } from '../../../features/test-runner/FlutterTestRunner';
import { PlatformCoverageManager } from '../../../features/platform-coverage/PlatformCoverageManager';

suite('RunFolderTestsCommand Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChild: any;
    let context: any;
    let testRunner: FlutterTestRunner;
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

        mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = sandbox.stub();
        sandbox.stub(cp, 'spawn').returns(mockChild);

        testRunner = new FlutterTestRunner();
        gutterProvider = new CoverageGutterProvider(context);
        platformManager = new PlatformCoverageManager();
        statusManager = new CoverageStatusManager(context, platformManager);

        command = new RunFolderTestsCommand(context, testRunner, gutterProvider, statusManager);

        (global as any).allWebviewMessages = [];
        (global as any).lastWebviewMessage = undefined;
    });

    teardown(() => {
        sandbox.restore();
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
            ]
        };

        sandbox.stub(LcovParser, 'parse').resolves(mockCoverageData);

        await command.execute(folderUri);

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
});
