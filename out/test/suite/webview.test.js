"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const webview_1 = require("../../webview");
const path = require("path");
suite('Webview Test Suite', () => {
    let extensionUri;
    setup(() => {
        // Create a mock extension URI
        extensionUri = vscode.Uri.file(path.join(__dirname, '..', '..', '..'));
    });
    test('getWebviewContent returns valid HTML', () => {
        const content = (0, webview_1.getWebviewContent)('test_file.dart', extensionUri);
        assert.ok(content.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
        assert.ok(content.includes('<html'), 'Should include html tag');
        assert.ok(content.includes('</html>'), 'Should close html tag');
        assert.ok(content.includes('test_file.dart'), 'Should include test file name');
    });
    test('getWebviewContent includes necessary elements', () => {
        const content = (0, webview_1.getWebviewContent)('my_test.dart', extensionUri);
        // Check for key UI elements
        assert.ok(content.includes('id="status-badge"'), 'Should include status badge');
        assert.ok(content.includes('id="output"'), 'Should include output div');
        assert.ok(content.includes('id="coverage-container"'), 'Should include coverage container');
        assert.ok(content.includes('id="uncovered-container"'), 'Should include uncovered lines container');
        assert.ok(content.includes('id="progress-container"'), 'Should include progress container');
    });
    test('getWebviewContent includes VS Code API script', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('acquireVsCodeApi'), 'Should include VS Code API');
    });
    test('getWebviewContent includes message handling', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('window.addEventListener(\'message\''), 'Should include message listener');
        assert.ok(content.includes('case \'log\''), 'Should handle log messages');
        assert.ok(content.includes('case \'finished\''), 'Should handle finished messages');
    });
    test('getWebviewContent includes navigation functionality', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('navigateToLine'), 'Should include navigation message type');
        assert.ok(content.includes('vscode.postMessage'), 'Should include postMessage calls');
    });
    test('getWebviewContent includes circular progress SVG', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('<svg'), 'Should include SVG element');
        assert.ok(content.includes('id="progress-circle"'), 'Should include progress circle');
        assert.ok(content.includes('linearGradient'), 'Should include gradient definition');
    });
    test('getWebviewContent includes Tailwind CSS classes', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        // Check for Tailwind utility classes
        assert.ok(content.includes('class='), 'Should include class attributes');
        assert.ok(content.includes('gradient-'), 'Should include gradient utilities');
    });
    test('getWebviewContent handles different file names', () => {
        const testCases = [
            'simple.dart',
            'complex_test_file.dart',
            'my-feature_test.dart',
            'test.dart'
        ];
        testCases.forEach(fileName => {
            const content = (0, webview_1.getWebviewContent)(fileName, extensionUri);
            assert.ok(content.includes(fileName), `Should include file name: ${fileName}`);
        });
    });
    test('getWebviewContent includes coverage display logic', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('function showCoverage'), 'Should include showCoverage function');
        assert.ok(content.includes('coverage-percent'), 'Should include coverage percentage element');
        assert.ok(content.includes('lines-hit'), 'Should include lines hit element');
        assert.ok(content.includes('lines-total'), 'Should include total lines element');
    });
    test('getWebviewContent includes uncovered lines display', () => {
        const content = (0, webview_1.getWebviewContent)('test.dart', extensionUri);
        assert.ok(content.includes('uncoveredLines'), 'Should reference uncovered lines');
        assert.ok(content.includes('uncovered-lines-list'), 'Should include uncovered lines list element');
    });
});
//# sourceMappingURL=webview.test.js.map