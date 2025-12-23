import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('muhammadkamel.flutter-coverage-tracker'));
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('flutter-coverage-tracker.runRelatedTest'));
        assert.ok(commands.includes('flutter-coverage-tracker.runFolderTests'));
    });
});
