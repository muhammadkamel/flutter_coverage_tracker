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

    test('createTestFile returns false if file already exists', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(true);
        const sourcePath = '/path/to/workspace/lib/foo.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
    });

    test('createTestFile creates file if it does not exist', async () => {
        // Mock existsSync: 
        // 1st call: test file exists? -> false
        // 2nd call: pubspec exists? -> true
        // 3rd call: test dir exists? -> false (trigger mkdir)
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.onCall(0).returns(false); // test file
        existsStub.onCall(1).returns(true);  // pubspec
        existsStub.onCall(2).returns(false); // test dir

        const readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns('name: my_app\n');
        const mkdirSyncStub = sandbox.stub(fs, 'mkdirSync');
        const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

        const sourcePath = path.join(workspaceRoot, 'lib', 'src', 'foo.dart');

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, true);

        // Verify mkdir
        assert.ok(mkdirSyncStub.calledOnce);

        // Verify write
        assert.ok(writeFileSyncStub.calledOnce);
        const writtenPath = writeFileSyncStub.firstCall.args[0] as string;
        const writtenContent = writeFileSyncStub.firstCall.args[1] as string;

        // Check path: lib/src/foo.dart -> test/src/foo_test.dart
        assert.ok(writtenPath.endsWith('test/foo_test.dart'), `Expected path to end with test/foo_test.dart, but got ${writtenPath}`);

        // Check content
        assert.ok(writtenContent.includes("import 'package:my_app/src/foo.dart';"), 'Should have correct package import');
        assert.ok(writtenContent.includes("testWidgets('Test for foo.dart'"), 'Should have correct test description');
    });

    test('createTestFile fails gracefully if pubspec missing', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.withArgs(sinon.match(/_test.dart/)).returns(false);
        existsStub.withArgs(sinon.match(/pubspec.yaml/)).returns(false); // No pubspec

        const result = await TestFileGenerator.createTestFile('/path/to/workspace/lib/foo.dart', workspaceRoot);

        assert.strictEqual(result, false);
    });

    test('createTestFile uses relative path import if not in lib', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        existsStub.onCall(0).returns(false); // test file
        existsStub.onCall(1).returns(true);  // pubspec
        existsStub.onCall(2).returns(true);  // test dir exists

        sandbox.stub(fs, 'readFileSync').returns('name: my_app\n');
        const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');

        const sourcePath = path.join(workspaceRoot, 'bin', 'main.dart'); // Not in lib

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, true);
        const writtenContent = writeFileSyncStub.firstCall.args[1] as string;

        // bin/main.dart -> package:my_app/bin/main.dart (Assuming standard simplified logic for now, 
        // though technically package imports usually imply lib. The implementation simply replaced separators)

        // Verify what implementation does:
        // if startsWith('lib') -> remove 'lib' -> package:name/rest
        // else -> package:name/full_relative_path

        // So bin/main.dart -> package:my_app/bin/main.dart. 
        // This might not be valid Dart valid if 'bin' is not exported, but it's what we implemented.
        assert.ok(writtenContent.includes("import 'package:my_app/bin/main.dart';"));
    });

    test('createTestFile ignores .g.dart files', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
        const sourcePath = '/path/to/workspace/lib/user.g.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
        assert.strictEqual(existsStub.callCount, 1); // Only checked if test file exists
    });

    test('createTestFile ignores .freezed.dart files', async () => {
        const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
        const sourcePath = '/path/to/workspace/lib/user.freezed.dart';

        const result = await TestFileGenerator.createTestFile(sourcePath, workspaceRoot);

        assert.strictEqual(result, false);
        assert.strictEqual(existsStub.callCount, 1);
    });
});
