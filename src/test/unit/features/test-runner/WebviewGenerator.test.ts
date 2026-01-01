import * as assert from 'assert';
import * as vscode from 'vscode';
import { WebviewGenerator } from '../../../../features/test-runner/WebviewGenerator';
import * as path from 'path';

suite('Webview Test Suite', () => {
    let styleUri: vscode.Uri;

    setup(() => {
        // Create a mock style URI
        styleUri = vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'out', 'webview.css'));
    });

    test('getWebviewContent returns valid HTML', () => {
        const content = WebviewGenerator.getWebviewContent('test_file.dart', styleUri);

        assert.ok(content.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
        assert.ok(content.includes('<html'), 'Should include html tag');
        assert.ok(content.includes('</html>'), 'Should close html tag');
        assert.ok(content.includes('test_file.dart'), 'Should include test file name');
    });

    test('getWebviewContent uses correct style URI', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        assert.ok(content.includes(styleUri.toString()), 'Should include the style URI');
    });

    test('getWebviewContent does NOT use @apply (broken UI)', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        assert.ok(!content.includes('@apply'), 'Should NOT include @apply directives in inline styles');
    });

    test('getWebviewContent includes standard CSS for animations', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        assert.ok(content.includes('transition: transform'), 'Should include standard transition');
        assert.ok(content.includes('transform: translateY'), 'Should include standard transform');
    });

    test('getWebviewContent includes necessary elements', () => {
        const content = WebviewGenerator.getWebviewContent('my_test.dart', styleUri);

        assert.ok(content.includes('id="status-badge"'), 'Should include status badge');
        assert.ok(content.includes('id="output"'), 'Should include output div');
        assert.ok(content.includes('id="coverage-container"'), 'Should include coverage container');
        assert.ok(content.includes('id="uncovered-lines-list"'), 'Should include uncovered lines list');
        assert.ok(content.includes('id="progress-container"'), 'Should include progress container');
        assert.ok(content.includes('id="cancel-btn"'), 'Should include cancel button');
        assert.ok(content.includes('id="rerun-btn"'), 'Should include rerun button');
        assert.ok(content.includes('id="watch-btn"'), 'Should include watch button');
    });

    test('getWebviewContent includes SVG with explicit sizing for UX', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        assert.ok(content.includes('style="width: 16px; height: 16px;"'), 'Should include explicit SVG sizing');
    });

    test('getWebviewContent includes VS Code API script', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('acquireVsCodeApi'), 'Should include VS Code API');
    });

    test('getWebviewContent includes message handling', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('window.addEventListener(\'message\''), 'Should include message listener');
        assert.ok(content.includes('case \'log\''), 'Should handle log messages');
        assert.ok(content.includes('case \'finished\''), 'Should handle finished messages');
    });

    test('getWebviewContent includes navigation functionality', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('navigateToLine'), 'Should include navigation message type');
        assert.ok(content.includes('vscode.postMessage'), 'Should include postMessage calls');
    });

    test('getWebviewContent includes circular progress SVG', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('<svg'), 'Should include SVG element');
        assert.ok(content.includes('id="progress-circle"'), 'Should include progress circle');
        assert.ok(content.includes('linearGradient'), 'Should include gradient definition');
    });

    test('getWebviewContent includes Tailwind CSS placeholders', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

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
            const content = WebviewGenerator.getWebviewContent(fileName, styleUri);
            assert.ok(content.includes(fileName), `Should include file name: ${fileName}`);
        });
    });

    test('getWebviewContent includes coverage display logic', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('function showCoverage'), 'Should include showCoverage function');
        assert.ok(content.includes('coverage-percent'), 'Should include coverage percentage element');
        assert.ok(content.includes('lines-hit'), 'Should include lines hit element');
        assert.ok(content.includes('lines-total'), 'Should include total lines element');
    });

    test('getWebviewContent includes uncovered lines display', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('uncoveredLines'), 'Should reference uncovered lines');
        assert.ok(content.includes('uncovered-lines-list'), 'Should include uncovered lines list element');
    });

    test('getWebviewContent includes watch button toggle logic', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('watchBtn.onclick'), 'Should handle watch button clicks');
        assert.ok(content.includes('toggle-watch'), 'Should post toggle-watch message');
        assert.ok(content.includes('Watching'), 'Should include "Watching" label text');
    });

    test('getWebviewContent includes watch state restoration', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('previousState.isWatching'), 'Should restore watch state from persistent storage');
    });

    test('getWebviewContent includes skeleton loader elements', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('id="coverage-skeleton"'), 'Should include coverage skeleton');
        assert.ok(content.includes('id="uncovered-skeleton"'), 'Should include uncovered lines skeleton');
        assert.ok(content.includes('animate-pulse'), 'Should use Tailwind pulse animation');
    });

    test('getWebviewContent hides actual coverage initially', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);
        assert.ok(content.includes('id="coverage-container" class="hidden"'), 'Actual coverage container should be hidden initially');
    });

    test('getWebviewContent resets UI state on rerun click including skeletons', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('rerunBtn.onclick'), 'Should have rerun click handler');
        assert.ok(content.includes('coverageSkeleton.classList.remove(\'hidden\')'), 'Should show coverage skeleton on rerun');
        assert.ok(content.includes('coverageContainer.classList.add(\'hidden\')'), 'Should hide coverage container on rerun');
    });

    test('getWebviewContent includes uncovered lines count in title', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('id="uncovered-title"'), 'Should include uncovered title element with ID');
        assert.ok(content.includes('Uncovered Lines'), 'Should include base title text');
    });

    test('getWebviewContent updates uncovered lines title with count', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('document.getElementById'), 'Should get uncovered title element');
        assert.ok(content.includes('Uncovered Lines (\${lines.length})'), 'Should update title with count in parentheses');
        assert.ok(content.includes('lines.length'), 'Should use lines.length for count');
    });

    test('getWebviewContent includes scroll-to-top button', () => {
        const content = WebviewGenerator.getWebviewContent('test.dart', styleUri);

        assert.ok(content.includes('id="scroll-to-top"'), 'Should include scroll-to-top button');
        assert.ok(content.includes('Scroll to top'), 'Should include scroll-to-top title attribute');
        assert.ok(content.includes("window.addEventListener('scroll'"), 'Should include scroll event listener');
        assert.ok(content.includes('window.scrollTo'), 'Should include scrollTo call');
        assert.ok(content.includes("behavior: 'smooth'"), 'Should use smooth scroll behavior');
        assert.ok(content.includes('window.pageYOffset > 300'), 'Should show button after scrolling 300px');
        assert.ok(content.includes('#scroll-to-top'), 'Should include scroll-to-top button styles');
        assert.ok(content.includes('position: fixed'), 'Should use fixed positioning');
    });
});
