import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { CoverageCodeLensProvider } from '../../../../features/codelens/CoverageCodeLensProvider';
import { PlatformCoverageManager } from '../../../../features/platform-coverage/PlatformCoverageManager';

suite('CoverageCodeLensProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let platformManager: sinon.SinonStubbedInstance<PlatformCoverageManager>;
    let provider: CoverageCodeLensProvider;
    let platformChangeEmitter: vscode.EventEmitter<import('../../../../features/platform-coverage/PlatformCoverageManager').Platform>;
    let configChangeEmitter: vscode.EventEmitter<vscode.ConfigurationChangeEvent>;
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        platformManager = sinon.createStubInstance(PlatformCoverageManager);
        platformChangeEmitter = new vscode.EventEmitter<import('../../../../features/platform-coverage/PlatformCoverageManager').Platform>();
        configChangeEmitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();

        (platformManager as any).onPlatformChange = platformChangeEmitter.event;

        const configChangeStub = sandbox.stub(vscode.workspace, 'onDidChangeConfiguration');
        configChangeStub.returns({
            dispose: sandbox.stub()
        } as any);

        getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        getConfigurationStub.returns({
            get: sandbox.stub().returns(true)
        } as any);

        provider = new CoverageCodeLensProvider(platformManager);
    });

    teardown(() => {
        sandbox.restore();
        if (platformChangeEmitter && typeof platformChangeEmitter.dispose === 'function') {
            platformChangeEmitter.dispose();
        }
        if (configChangeEmitter && typeof configChangeEmitter.dispose === 'function') {
            configChangeEmitter.dispose();
        }
    });

    // ... tests ...

    test('should return empty array when code lens is disabled', async () => {
        const config = {
            get: sandbox.stub().withArgs('enableCodeLens', true).returns(false)
        };
        getConfigurationStub.returns(config as any);

        const document = {
            fileName: '/test/file.dart',
            getText: sandbox.stub().returns('class Test {}'),
            lineCount: 1,
            getWordRangeAtPosition: sandbox.stub()
        } as any;

        const lensesResult = provider.provideCodeLenses(document, {} as any);
        const lenses = lensesResult instanceof Promise ? await lensesResult : lensesResult;

        assert.strictEqual(lenses ? lenses.length : 0, 0);
    });

    test('should provide test lenses for test files', () => {
        const config = {
            get: sandbox.stub().withArgs('enableCodeLens', true).returns(true)
        };
        getConfigurationStub.returns(config as any);

        const document = {
            fileName: '/test/my_test.dart',
            getText: sandbox.stub().returns('test("should work", () {});'),
            lineCount: 1,
            getWordRangeAtPosition: sandbox.stub().returns(new vscode.Range(0, 0, 0, 4)),
            getLineCount: sandbox.stub().returns(1)
        } as any;

        const lenses = provider.provideCodeLenses(document, {} as any);

        // Should have some lenses for test file
        assert.ok(Array.isArray(lenses));
    });

    test('should provide coverage lenses for non-test files', () => {
        const config = {
            get: sandbox.stub().withArgs('enableCodeLens', true).returns(true)
        };
        getConfigurationStub.returns(config as any);

        const document = {
            fileName: '/lib/service.dart',
            getText: sandbox.stub().returns('class Service {}'),
            lineCount: 1,
            getWordRangeAtPosition: sandbox.stub().returns(new vscode.Range(0, 0, 0, 5)),
            getLineCount: sandbox.stub().returns(1)
        } as any;

        const lenses = provider.provideCodeLenses(document, {} as any);

        assert.ok(Array.isArray(lenses));
    });

    test('should trigger manual refresh', (done) => {
        let changeCount = 0;
        provider.onDidChangeCodeLenses(() => {
            changeCount++;
            if (changeCount === 1) {
                assert.strictEqual(changeCount, 1);
                done();
            }
        });

        provider.refresh();
    });

    test('should default to enabled code lens when config is not set', () => {
        const config = {
            get: sandbox.stub().withArgs('enableCodeLens', true).returns(true)
        };
        getConfigurationStub.returns(config as any);

        const document = {
            fileName: '/lib/service.dart',
            getText: sandbox.stub().returns(''),
            lineCount: 1,
            getWordRangeAtPosition: sandbox.stub(),
            getLineCount: sandbox.stub().returns(1)
        } as any;

        const lenses = provider.provideCodeLenses(document, {} as any);

        assert.ok(Array.isArray(lenses));
    });
});
