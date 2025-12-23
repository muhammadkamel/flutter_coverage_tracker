import * as assert from 'assert';
import { FileSystemUtils } from '../../../../../features/test-runner/utils/FileSystemUtils';
import * as path from 'path';

suite('FileSystemUtils Test Suite', () => {
    const workspaceRoot = '/root';

    test('Resolves standard lib file to test file', () => {
        const currentFile = path.join(workspaceRoot, 'lib', 'foo', 'bar.dart');
        const expected = path.join(workspaceRoot, 'test', 'foo', 'bar_test.dart');
        assert.strictEqual(FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot), expected);
    });

    test('Resolves lib/src file to test file (strips src)', () => {
        const currentFile = path.join(workspaceRoot, 'lib', 'src', 'foo', 'bar.dart');
        const expected = path.join(workspaceRoot, 'test', 'foo', 'bar_test.dart');
        assert.strictEqual(FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot), expected);
    });

    test('Resolves file already in test folder', () => {
        const currentFile = path.join(workspaceRoot, 'test', 'foo', 'bar_test.dart');
        const expected = currentFile;
        assert.strictEqual(FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot), expected);
    });

    test('Resolves root level file', () => {
        const currentFile = path.join(workspaceRoot, 'main.dart');
        const expected = path.join(workspaceRoot, 'test', 'main_test.dart');
        assert.strictEqual(FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot), expected);
    });

    test('Handles non-dart root level file', () => {
        const currentFile = path.join(workspaceRoot, 'README.md');
        const expected = path.join(workspaceRoot, 'test', 'README.md_test.dart');
        assert.strictEqual(FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot), expected);
    });
});
