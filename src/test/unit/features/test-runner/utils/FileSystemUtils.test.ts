import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { FileSystemUtils } from '../../../../../features/test-runner/utils/FileSystemUtils';

suite('Result: FileSystemUtils Tests', () => {
    let sandbox: sinon.SinonSandbox;
    const workspaceRoot = '/path/to/workspace';

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('resolveSourceFilePath resolves from test/ to lib/', () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        const testFile = path.join(workspaceRoot, 'test', 'foo_test.dart');
        const sourceFile = path.join(workspaceRoot, 'lib', 'foo.dart');

        existsStub.withArgs(sourceFile).returns(true);

        const result = FileSystemUtils.resolveSourceFilePath(testFile, workspaceRoot);
        assert.strictEqual(result, sourceFile);
    });

    test('resolveSourceFilePath resolves from test/src/ to lib/src/', () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        const testFile = path.join(workspaceRoot, 'test', 'src', 'foo_test.dart');
        const sourceFile = path.join(workspaceRoot, 'lib', 'src', 'foo.dart');

        existsStub.withArgs(sourceFile).returns(true);

        const result = FileSystemUtils.resolveSourceFilePath(testFile, workspaceRoot);
        assert.strictEqual(result, sourceFile);
    });

    test('resolveSourceFilePath resolves from test/ to lib/src/ (flat test structure)', () => {
        const existsStub = sandbox.stub(fs, 'existsSync');
        const testFile = path.join(workspaceRoot, 'test', 'foo_test.dart');
        const sourceFileInSrc = path.join(workspaceRoot, 'lib', 'src', 'foo.dart');

        existsStub.withArgs(path.join(workspaceRoot, 'lib', 'foo.dart')).returns(false);
        existsStub.withArgs(sourceFileInSrc).returns(true);

        const result = FileSystemUtils.resolveSourceFilePath(testFile, workspaceRoot);
        assert.strictEqual(result, sourceFileInSrc);
    });

    test('resolveSourceFilePath returns undefined for non-test files', () => {
        const testFile = path.join(workspaceRoot, 'lib', 'foo.dart');
        const result = FileSystemUtils.resolveSourceFilePath(testFile, workspaceRoot);
        assert.strictEqual(result, undefined);
    });
});
