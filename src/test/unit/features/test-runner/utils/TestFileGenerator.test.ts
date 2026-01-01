import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { TestFileGenerator } from '../../../../../features/test-runner/utils/TestFileGenerator';

suite('Result: TestFileGenerator Tests', () => {
    let sandbox: sinon.SinonSandbox;
    const workspaceRoot = '/path/to/workspace';

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('createTestFile returns false if file already exists in primary location', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(true);
        const sourcePath = '/path/to/workspace/lib/foo.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
    });

    test('createTestFile returns false if file already exists in alternative location (no src)', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        // lib/src/foo.dart -> test/src/foo_test.dart (false) and test/foo_test.dart (true)
        existsStub.withArgs(sinon.match(/test\/src\/foo_test.dart/)).returns(false);
        existsStub.withArgs(sinon.match(/test\/foo_test.dart/)).returns(true);

        const sourcePath = '/path/to/workspace/lib/src/foo.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
        assert.ok(existsStub.calledWith(sinon.match(/test\/src\/foo_test.dart/)));
    });

    test('createTestFile creates file if it does not exist in any location', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.returns(false); // Default to false for all paths
        existsStub.withArgs(sinon.match(/pubspec.yaml/)).returns(true);

        const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('name: my_app\n');
        const mkdirSyncStub = sandbox.stub(fs, 'mkdirSync');
        const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

        const sourcePath = path.join(workspaceRoot, 'lib', 'src', 'foo.dart');

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, true);

        // Verify mkdir
        assert.ok(mkdirSyncStub.calledOnce);

        // Verify write - should use the primary (mirrored) path: test/src/foo_test.dart
        assert.ok(writeFileSyncStub.calledOnce);
        const writtenPath = writeFileSyncStub.firstCall.args[0] as string;

        assert.ok(writtenPath.endsWith('test/src/foo_test.dart'), `Expected path to end with test/src/foo_test.dart, but got ${writtenPath}`);
    });

    test('createTestFile fails gracefully if pubspec missing', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
        // No pubspec logic will be handled by the implementation which returns false if it doesn't exist

        const result = await TestFileGenerator.createTestFile('/path/to/workspace/lib/foo.dart', workspaceRoot);

        assert.strictEqual(result, false);
    });

    test('createTestFile uses relative path import if not in lib', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.returns(false);
        existsStub.withArgs(sinon.match(/pubspec.yaml/)).returns(true);

        sandbox.stub(fs, 'readFileSync').returns('name: my_app\n');
        sandbox.stub(fs, 'mkdirSync');
        const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

        const sourcePath = path.join(workspaceRoot, 'bin', 'main.dart'); // Not in lib

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, true);
        const writtenContent = writeFileSyncStub.firstCall.args[1] as string;

        assert.ok(writtenContent.includes("import 'package:my_app/bin/main.dart';"));
    });

    test('createTestFile ignores .g.dart files', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
        const sourcePath = '/path/to/workspace/lib/user.g.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
    });

    test('createTestFile ignores .freezed.dart files', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
        const sourcePath = '/path/to/workspace/lib/user.freezed.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
    });
});
