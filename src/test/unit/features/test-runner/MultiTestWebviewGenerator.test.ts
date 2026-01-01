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
        assert.ok(content.includes("window.addEventListener('message'"));
        assert.ok(content.includes("case 'init-dashboard'"));
        assert.ok(content.includes("case 'finished'"));
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

    test('getWebviewContent includes Uncovered column header', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('Uncovered'), 'Should have Uncovered column header');
    });

    test('getWebviewContent includes uncovered lines functions', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('function toggleUncovered'), 'Should have toggleUncovered function');
        assert.ok(
            content.includes('function navigateToLine'),
            'Should have navigateToLine function for uncovered lines'
        );
        assert.ok(content.includes('function copyLines'), 'Should have copyLines function');
    });

    test('getWebviewContent includes test file navigation function', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('function navigateToTestFile'), 'Should have navigateToTestFile function');
        assert.ok(content.includes("type: 'navigateToTestFile'"), 'Should post navigateToTestFile message');
    });

    test('getWebviewContent makes test file names clickable', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('cursor-pointer'), 'Should have cursor pointer for clickable file names');
        assert.ok(content.includes('hover:text-blue-400'), 'Should have hover effect for file names');
        assert.ok(content.includes('onclick="navigateToTestFile'), 'Should call navigateToTestFile on click');
    });

    test('getWebviewContent handles uncovered lines display', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('uncoveredLines'), 'Should reference uncovered lines');
        assert.ok(content.includes('hasUncovered'), 'Should check if test has uncovered lines');
        assert.ok(content.includes('toggleUncovered'), 'Should toggle uncovered lines visibility');
    });

    test('getWebviewContent includes copy uncovered lines functionality', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('Copy'), 'Should have Copy button text');
        assert.ok(content.includes('navigator.clipboard.writeText'), 'Should copy to clipboard');
        assert.ok(content.includes('Copied!'), 'Should show copied feedback');
    });

    test('getWebviewContent stores test file paths', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('f.name'), 'Should extract file name');
        assert.ok(content.includes('f.path'), 'Should store file path for navigation');
    });

    test('getWebviewContent creates expandable uncovered lines rows', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('uncovered-'), 'Should create row IDs for uncovered lines');
        assert.ok(content.includes('colspan="4"'), 'Should span all columns for detail row');
        assert.ok(content.includes('🎯 Uncovered Lines'), 'Should show uncovered lines emoji and title');
    });

    // New tests for Folder View
    test('getWebviewContent includes folder view CSS styles', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('.folder-row'), 'Should have folder-row class');
        assert.ok(content.includes('.folder-icon'), 'Should have folder-icon class');
        assert.ok(content.includes('.folder-expanded'), 'Should have folder-expanded class');
        assert.ok(content.includes('transform: rotate(90deg)'), 'Should have rotation style for expanded folders');
    });

    test('getWebviewContent includes tree building logic', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('function buildTree'), 'Should have buildTree function');
        assert.ok(content.includes("test.name.split('/')"), 'Should split path by slash');
        assert.ok(content.includes('current.children'), 'Should handle children nodes');
        assert.ok(content.includes('calcStats('), 'Should calculate folder statistics');
    });

    test('getWebviewContent includes recursive rendering logic', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('function renderTree'), 'Should have renderTree function');
        assert.ok(content.includes('renderTree(folder, level + 1)'), 'Should call itself recursively');
        assert.ok(content.includes('indent = level * 1.5'), 'Should calculate indentation based on level');
    });

    test('getWebviewContent includes folder interaction logic', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('function toggleFolder'), 'Should have toggleFolder function');
        assert.ok(content.includes('expandedFolders.has'), 'Should check expanded state');
        assert.ok(content.includes('expandedFolders.add'), 'Should add to expanded folders');
        assert.ok(content.includes('expandedFolders.delete'), 'Should remove from expanded folders');
    });

    test('getWebviewContent includes folder row HTML structure', () => {
        const content = MultiTestWebviewGenerator.getWebviewContent('Folder', styleUri);
        assert.ok(content.includes('onclick="toggleFolder'), 'Should have onclick handler for folders');
        assert.ok(content.includes("isExpanded ? '📂' : '📁'"), 'Should switch folder icon based on state');
        assert.ok(content.includes('folder.stats.passed === folder.stats.total'), 'Should check for all passed status');
    });
});
