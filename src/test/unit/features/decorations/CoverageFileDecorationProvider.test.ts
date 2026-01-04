import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { CoverageFileDecorationProvider } from '../../../../features/decorations/CoverageFileDecorationProvider';
import { PlatformCoverageManager } from '../../../../features/platform-coverage/PlatformCoverageManager';

suite('CoverageFileDecorationProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let platformManager: sinon.SinonStubbedInstance<PlatformCoverageManager>;

    let provider: CoverageFileDecorationProvider;
    let platformChangeEmitter: vscode.EventEmitter<import('../../../../features/platform-coverage/PlatformCoverageManager').Platform>;
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        platformManager = sinon.createStubInstance(PlatformCoverageManager);
        platformChangeEmitter = new vscode.EventEmitter<import('../../../../features/platform-coverage/PlatformCoverageManager').Platform>();

        (platformManager as any).onPlatformChange = platformChangeEmitter.event;

        getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        getConfigurationStub.returns({
            get: sandbox.stub().withArgs('enableExplorerDecorations', true).returns(true)
        } as any);

        provider = new CoverageFileDecorationProvider(platformManager);
    });

    teardown(() => {
        sandbox.restore();
        if (platformChangeEmitter && typeof platformChangeEmitter.dispose === 'function') {
            platformChangeEmitter.dispose();
        }
    });

    test('should initialize decoration provider', () => {
        assert.ok(provider);
        assert.ok(provider.onDidChangeFileDecorations);
    });

    test('should refresh decorations on platform change', (done) => {
        let changeCount = 0;
        provider.onDidChangeFileDecorations(() => {
            changeCount++;
            if (changeCount === 1) {
                assert.strictEqual(changeCount, 1);
                done();
            }
        });

        // Using casting for simplicity in test
        platformChangeEmitter.fire('all' as any);
    });

    test('should return undefined for non-Dart files', () => {
        const uri = vscode.Uri.file('/test/file.ts');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.strictEqual(decoration, undefined);
    });

    test('should return undefined when no coverage data available', () => {
        platformManager.getCoverageForFile.returns(undefined);

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.strictEqual(decoration, undefined);
    });

    test('should return decoration for high coverage (90%+)', () => {
        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 95,
            linesHit: 95,
            linesFound: 100,
            uncoveredLines: []
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.ok(decoration);
        assert.strictEqual(decoration?.badge, '95%');
    });

    test('should return decoration for medium coverage (50-90%)', () => {
        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 75,
            linesHit: 75,
            linesFound: 100,
            uncoveredLines: [26, 27, 28]
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.ok(decoration);
        assert.strictEqual(decoration?.badge, '75%');
    });

    test('should return decoration for low coverage (<50%)', () => {
        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 30,
            linesHit: 30,
            linesFound: 100,
            uncoveredLines: [31, 32, 33, 34, 35]
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.ok(decoration);
        assert.strictEqual(decoration?.badge, '30%');
    });


    test('should return undefined when decorations are disabled', () => {
        const config = {
            get: sandbox.stub().withArgs('enableExplorerDecorations', true).returns(false)
        };
        getConfigurationStub.returns(config as any);

        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 90,
            linesHit: 90,
            linesFound: 100,
            uncoveredLines: []
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.strictEqual(decoration, undefined);
    });

    test('should trigger manual refresh', (done) => {
        let changeCount = 0;
        provider.onDidChangeFileDecorations(() => {
            changeCount++;
            if (changeCount === 1) {
                assert.strictEqual(changeCount, 1);
                done();
            }
        });

        provider.refresh();
    });

    test('should handle 100% coverage', () => {
        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 100,
            linesHit: 100,
            linesFound: 100,
            uncoveredLines: []
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.ok(decoration);
        assert.strictEqual(decoration?.badge, '100%');
    });

    test('should handle 0% coverage', () => {
        platformManager.getCoverageForFile.returns({
            file: '/test/file.dart',
            percentage: 0,
            linesHit: 0,
            linesFound: 100,
            uncoveredLines: Array.from({ length: 100 }, (_, i) => i + 1)
        });

        const uri = vscode.Uri.file('/test/file.dart');

        const decoration = provider.provideFileDecoration(uri, {} as any);

        assert.ok(decoration);
        assert.strictEqual(decoration?.badge, '0%');
    });
});
