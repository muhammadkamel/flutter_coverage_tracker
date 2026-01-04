import * as assert from 'assert';
import * as vscode from 'vscode';
import { WebviewGenerator } from '../../../../features/test-runner/WebviewGenerator';
import * as path from 'path';

suite('WebviewGenerator CSP Test Suite', () => {
    let styleUri: vscode.Uri;

    setup(() => {
        styleUri = vscode.Uri.file('/tmp/vscode-resource/webview.css');
    });

    test('CSP should NOT include nonce for script-src to allow inline scripts', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        // Extract CSP meta tag content
        const cspMatch = content.match(/<meta http-equiv="Content-Security-Policy" content="(.*?)">/);
        assert.ok(cspMatch, 'CSP meta tag should exist');

        const cspContent = cspMatch![1];

        // verify script-src directive
        assert.ok(cspContent.includes("script-src 'unsafe-inline'"), 'CSP should allow unsafe-inline scripts');
        assert.ok(!cspContent.includes("'nonce-"), 'CSP should NOT require a nonce for scripts (blocked execution)');
    });

    test('CSP should include unsafe-inline for style-src', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        const cspMatch = content.match(/<meta http-equiv="Content-Security-Policy" content="(.*?)">/);
        const cspContent = cspMatch![1];

        assert.ok(cspContent.includes("style-src"), 'CSP should have style-src');
        assert.ok(cspContent.includes("'unsafe-inline'"), 'CSP should allow unsafe-inline styles');
    });
});
