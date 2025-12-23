"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const path = require("path");
suite('Command Test Suite', () => {
    test('Command accepts URI argument (Smoke Test)', async () => {
        // limit: verify command does not crash when called with a URI
        const uri = vscode.Uri.file(path.join(__dirname, 'test_file.dart'));
        try {
            await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest', uri);
            // If it doesn't throw, it's a pass for the "smoke test" of the handler
            assert.ok(true);
        }
        catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });
    test('Command handles non-Dart file gracefully', async () => {
        const uri = vscode.Uri.file(path.join(__dirname, 'test_file.txt'));
        try {
            await vscode.commands.executeCommand('flutter-coverage-tracker.runRelatedTest', uri);
            assert.ok(true);
        }
        catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });
});
//# sourceMappingURL=command.test.js.map