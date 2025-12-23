import * as assert from 'assert';
import * as path from 'path';
import { resolveTestFilePath } from '../../utils';

suite('Utils Test Suite', () => {
    const isWindows = process.platform === 'win32';
    const workspaceRoot = isWindows ? 'C:\\project' : '/project';

    test('Resolves standard lib file to test file', () => {
        const input = path.join(workspaceRoot, 'lib', 'feature', 'foo.dart');
        const expected = path.join(workspaceRoot, 'test', 'feature', 'foo_test.dart');

        const result = resolveTestFilePath(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });

    test('Resolves file already in test folder', () => {
        const input = path.join(workspaceRoot, 'test', 'feature', 'foo_test.dart');
        const expected = input;

        const result = resolveTestFilePath(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });

    test('Resolves root level file', () => {
        const input = path.join(workspaceRoot, 'main.dart');
        const expected = path.join(workspaceRoot, 'test', 'main_test.dart');

        const result = resolveTestFilePath(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });
});
