import * as assert from 'assert';
import * as vscode from 'vscode';
import { MultiTestWebviewGenerator } from '../../../../features/test-runner/MultiTestWebviewGenerator';
import * as path from 'path';

suite('Multi-Test Webview Dashboard Test Suite', () => {
    let styleUri: vscode.Uri;

    setup(() => {
        styleUri = vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'out', 'webview.css'));
    });

    test('getWebviewContent returns valid dashboard HTML', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('MyFolder', styleUri);

        assert.ok(content.includes('<!DOCTYPE html>'));
        assert.ok(content.includes('MyFolder'));
        assert.ok(content.includes('id="total-tests"'));
        assert.ok(content.includes('id="passed-count"'));
        assert.ok(content.includes('id="failed-count"'));
        assert.ok(content.includes('id="overall-coverage"'));
        assert.ok(content.includes('id="file-list-body"'));
    });

    test('getWebviewContent includes necessary scripts and styles', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);

        assert.ok(content.includes('acquireVsCodeApi'));
        assert.ok(content.includes('window.addEventListener(\'message\''));
        assert.ok(content.includes('case \'init-dashboard\''));
        assert.ok(content.includes('case \'finished\''));
        assert.ok(content.includes('rerunBtn.onclick'));
        assert.ok(content.includes('cancelBtn.onclick'));
        assert.ok(content.includes('updateUI()'));
    });

    test('getWebviewContent has summary grid', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('Total Files'));
        assert.ok(content.includes('Passed'));
        assert.ok(content.includes('Failed'));
        assert.ok(content.includes('Avg Coverage'));
    });

    test('getWebviewContent includes file table structure', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('<table'));
        assert.ok(content.includes('File Name'));
        assert.ok(content.includes('Status'));
        assert.ok(content.includes('Coverage'));
    });
});
