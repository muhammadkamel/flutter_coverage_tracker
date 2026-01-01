import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { CoverageStatusManager } from '../../../../features/status-bar/CoverageStatusManager';
import { PlatformCoverageManager } from '../../../../features/platform-coverage/PlatformCoverageManager';
import { LcovParser } from '../../../../shared/coverage/LcovParser';

suite('CoverageStatusManager Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let context: any;
    let platformManager: PlatformCoverageManager;
    let statusManager: CoverageStatusManager;
    let statusBarItem: any;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mock StatusBarItem
        statusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            show: sandbox.spy(),
            hide: sandbox.spy(),
            dispose: sandbox.spy()
        };
        sandbox.stub(vscode.window, 'createStatusBarItem').returns(statusBarItem);

        context = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/ext'),
            asAbsolutePath: (rel: string) => '/ext/' + rel
        };

        platformManager = new PlatformCoverageManager();

        // Stub PlatformCoverageManager methods if needed, or stick to real one if simple
        // Since PlatformCoverageManager uses fs, we might need to stub fs or LcovParser depending on implementation.
        // But CoverageStatusManager calls `platformManager.loadCoverage`.

        statusManager = new CoverageStatusManager(context, platformManager);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('updateCoverage: should update status bar with coverage data', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        // Stub loadCoverage to return valid data directly
        sandbox.stub(platformManager, 'loadCoverage').resolves({
            overall: { percentage: 80, linesHit: 80, linesFound: 100 },
            files: []
        });
        sandbox.stub(platformManager, 'getCurrentPlatform').returns('all' as any);
        sandbox.stub(platformManager, 'getPlatformIcon').returns('📊');
        sandbox.stub(platformManager, 'getPlatformLabel').returns('All Platforms');

        await statusManager.updateCoverage();

        assert.ok(statusBarItem.show.called, 'Status bar should be shown');
        assert.ok(statusBarItem.text.includes('80%'), 'Status bar text should contain percentage');
    });

    test('updateCoverage: should handle missing coverage file (returns null)', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        sandbox.stub(platformManager, 'loadCoverage').resolves(null);

        await statusManager.updateCoverage();

        assert.ok(statusBarItem.hide.called, 'Status bar should be hidden if no coverage file');
    });

    test('updateCoverage: should handle unexpected error (throws)', async () => {
        (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/root'), name: 'w', index: 0 }];

        sandbox.stub(platformManager, 'loadCoverage').rejects(new Error('Unexpected error'));

        await statusManager.updateCoverage();

        assert.ok(statusBarItem.show.called, 'Status bar should be shown on error');
        assert.ok(statusBarItem.text.includes('Error'), 'Status bar text should indicate error');
    });
});
