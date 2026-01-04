import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PlatformCoverageManager, Platform } from '../../../../features/platform-coverage/PlatformCoverageManager';
import { LcovParser } from '../../../../shared/coverage/LcovParser';

suite('PlatformCoverageManager Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let manager: PlatformCoverageManager;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-coverage-'));

        const mockConfig = {
            get: sandbox.stub()
                .withArgs('platformCoveragePaths').returns(undefined)
                .withArgs('defaultPlatform').returns('all')
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

        manager = new PlatformCoverageManager();
    });

    teardown(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    test('should initialize with all platforms', () => {
        assert.ok(manager);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.All);
    });

    test('should set current platform', () => {
        manager.setPlatform(Platform.Android);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.Android);

        manager.setPlatform(Platform.iOS);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.iOS);
    });

    test('should emit platform change event', (done) => {
        manager.onPlatformChange((platform: Platform) => {
            assert.strictEqual(platform, Platform.Web);
            done();
        });

        manager.setPlatform(Platform.Web);
    });

    test('should load coverage for all platform', async () => {
        const lcovContent = `SF:src/test.ts
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage/lcov.info');
        fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
        fs.writeFileSync(lcovPath, lcovContent);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 50,
                linesHit: 1,
                linesFound: 2
            },
            files: [
                {
                    file: 'src/test.ts',
                    percentage: 50,
                    linesHit: 1,
                    linesFound: 2,
                    uncoveredLines: [2]
                }
            ]
        });

        const result = await manager.loadCoverage(tempDir, Platform.All);

        assert.ok(result);
        assert.strictEqual(result?.overall.percentage, 50);
    });

    test('should load coverage for Android platform', async () => {
        const lcovContent = `SF:src/android.ts
DA:1,1
LF:1
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage/android/lcov.info');
        fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
        fs.writeFileSync(lcovPath, lcovContent);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 100,
                linesHit: 1,
                linesFound: 1
            },
            files: []
        });

        const result = await manager.loadCoverage(tempDir, Platform.Android);

        assert.ok(result);
    });

    test('should load coverage for iOS platform', async () => {
        const lcovContent = `SF:src/ios.ts
DA:1,1
LF:1
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage/ios/lcov.info');
        fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
        fs.writeFileSync(lcovPath, lcovContent);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 100,
                linesHit: 1,
                linesFound: 1
            },
            files: []
        });

        const result = await manager.loadCoverage(tempDir, Platform.iOS);

        assert.ok(result);
    });

    test('should load coverage for Web platform', async () => {
        const lcovContent = `SF:src/web.ts
DA:1,1
LF:1
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage/web/lcov.info');
        fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
        fs.writeFileSync(lcovPath, lcovContent);

        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 100,
                linesHit: 1,
                linesFound: 1
            },
            files: []
        });

        const result = await manager.loadCoverage(tempDir, Platform.Web);

        assert.ok(result);
    });

    test('should return null when coverage file not found', async () => {
        sandbox.stub(LcovParser, 'parse').resolves(undefined);

        const result = await manager.loadCoverage(tempDir, Platform.Android);

        assert.strictEqual(result, null);
    });

    test('should get coverage for specific file', () => {
        const coverage = manager.getCoverageForFile('/src/test.dart');

        assert.ok(coverage === undefined || coverage === null);
    });

    test('should get platform label', () => {
        assert.ok(manager.getPlatformLabel(Platform.Android));
        assert.ok(manager.getPlatformLabel(Platform.iOS));
        assert.ok(manager.getPlatformLabel(Platform.Web));
        assert.ok(manager.getPlatformLabel(Platform.Desktop));
        assert.ok(manager.getPlatformLabel(Platform.All));
    });

    test('should get coverage path for platform', () => {
        const androidPath = manager.getCoveragePath(Platform.Android);
        assert.ok(androidPath);
        assert.ok(androidPath.includes('android'));
    });

    test('should get all available platforms', () => {
        const platforms = manager.getAllPlatforms();
        assert.ok(Array.isArray(platforms));
        assert.ok(platforms.length > 0);
    });

    test('should handle missing coverage gracefully', async () => {
        sandbox.stub(LcovParser, 'parse').rejects(new Error('File not found'));

        const result = await manager.loadCoverage(tempDir, Platform.All);

        assert.strictEqual(result, null);
    });

    test('should support switching between platforms', () => {
        manager.setPlatform(Platform.Android);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.Android);

        manager.setPlatform(Platform.iOS);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.iOS);

        manager.setPlatform(Platform.All);
        assert.strictEqual(manager.getCurrentPlatform(), Platform.All);
    });
});
