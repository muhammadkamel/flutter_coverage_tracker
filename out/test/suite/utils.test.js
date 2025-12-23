"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const utils_1 = require("../../utils");
suite('Utils Test Suite', () => {
    const isWindows = process.platform === 'win32';
    const workspaceRoot = isWindows ? 'C:\\project' : '/project';
    test('Resolves standard lib file to test file', () => {
        const input = path.join(workspaceRoot, 'lib', 'feature', 'foo.dart');
        const expected = path.join(workspaceRoot, 'test', 'feature', 'foo_test.dart');
        const result = (0, utils_1.resolveTestFilePath)(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });
    test('Resolves file already in test folder', () => {
        const input = path.join(workspaceRoot, 'test', 'feature', 'foo_test.dart');
        const expected = input;
        const result = (0, utils_1.resolveTestFilePath)(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });
    test('Resolves root level file', () => {
        const input = path.join(workspaceRoot, 'main.dart');
        const expected = path.join(workspaceRoot, 'test', 'main_test.dart');
        const result = (0, utils_1.resolveTestFilePath)(input, workspaceRoot);
        assert.strictEqual(result, expected);
    });
});
//# sourceMappingURL=utils.test.js.map