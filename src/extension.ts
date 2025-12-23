import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileSystemUtils } from './features/test-runner/utils/FileSystemUtils';
import { LcovParser } from './shared/coverage/LcovParser';
import { FlutterTestRunner } from './features/test-runner/FlutterTestRunner';
import { VsCodeFileWatcher } from './features/test-runner/VsCodeFileWatcher';
import { CoverageOrchestrator } from './features/test-runner/CoverageOrchestrator';
import { WebviewGenerator } from './features/test-runner/WebviewGenerator';
import { CoverageMatcher } from './shared/coverage/CoverageMatcher';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Coverage Tracker is active');

    // Create Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'flutter-coverage-tracker.showDetails';
    context.subscriptions.push(statusBarItem);

    // Initial Update
    updateCoverage();

    // Watch for file changes for Status Bar
    const coverageFilePath = getCoverageFilePath();
    if (coverageFilePath) {
        const watcher = vscode.workspace.createFileSystemWatcher(coverageFilePath);
        watcher.onDidChange(() => updateCoverage());
        watcher.onDidCreate(() => updateCoverage());
        watcher.onDidDelete(() => {
            statusBarItem.hide();
        });
        context.subscriptions.push(watcher);
    }

    // Dependencies
    const testRunner = new FlutterTestRunner();
    const fileWatcher = new VsCodeFileWatcher();
    const orchestrator = new CoverageOrchestrator(testRunner, fileWatcher);

    // Command: Run Related Test
    let runTestDisposable = vscode.commands.registerCommand('flutter-coverage-tracker.runRelatedTest', async (uri?: vscode.Uri) => {
        let targetUri = uri;
        if (!targetUri) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found.');
                return;
            }
            targetUri = editor.document.uri;
        }

        const currentFile = targetUri.fsPath;
        if (!currentFile.endsWith('.dart')) {
            vscode.window.showErrorMessage('Current file is not in a Dart file.');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('File is not in a workspace.');
            return;
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;
        const testFilePath = FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot);

        if (fs.existsSync(testFilePath)) {
            const fileName = path.basename(testFilePath);
            const panel = vscode.window.createWebviewPanel(
                'flutterTestRunner',
                `Test: ${fileName}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', 'webview.css'));
            panel.webview.html = WebviewGenerator.getWebviewContent(fileName, styleUri);

            // Wire up events
            const outputDisposable = testRunner.onTestOutput(out => {
                panel.webview.postMessage({ type: 'log', value: out });
            });

            const completeDisposable = testRunner.onTestComplete(result => {
                if (result.success) {
                    vscode.window.showInformationMessage(`Test Passed: ${path.basename(testFilePath)}`);
                    updateCoverage(); // Update status bar
                } else if (result.cancelled) {
                    vscode.window.showInformationMessage(`Test Cancelled: ${path.basename(testFilePath)}`);
                } else {
                    vscode.window.showErrorMessage(`Test Failed: ${path.basename(testFilePath)}`);
                }

                panel.webview.postMessage({
                    type: 'finished',
                    success: result.success,
                    cancelled: result.cancelled,
                    coverage: result.coverage,
                    sourceFile: result.sourceFile
                });
            });

            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    if (message.type === 'navigateToLine') {
                        const filePath = path.join(workspaceRoot, message.file);
                        if (fs.existsSync(filePath)) {
                            const doc = await vscode.workspace.openTextDocument(filePath);
                            const editor = await vscode.window.showTextDocument(doc);
                            const line = message.line - 1; // Convert to 0-indexed
                            const position = new vscode.Position(line, 0);
                            editor.selection = new vscode.Selection(position, position);
                            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                        }
                    } else if (message.type === 'rerun') {
                        orchestrator.runTest(testFilePath, workspaceRoot);
                    } else if (message.type === 'cancel') {
                        orchestrator.cancelTest();
                    } else if (message.type === 'toggle-watch') {
                        orchestrator.toggleWatch(message.enable);
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.onDidDispose(() => {
                orchestrator.toggleWatch(false);
                orchestrator.cancelTest();
                outputDisposable.dispose();
                completeDisposable.dispose();
            });

            // Run the test initially
            orchestrator.runTest(testFilePath, workspaceRoot);

        } else {
            vscode.window.showErrorMessage(`Could not find related test file at: ${testFilePath}`);
        }
    });

    context.subscriptions.push(runTestDisposable);
}

function getCoverageFilePath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return undefined;
    }
    // Simple approach: Use first workspace folder or configure
    const config = vscode.workspace.getConfiguration('flutterCoverage');
    const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';

    return new vscode.RelativePattern(workspaceFolders[0], relativePath).pattern;
}

async function updateCoverage() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        statusBarItem.hide();
        return;
    }

    const config = vscode.workspace.getConfiguration('flutterCoverage');
    const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
    const filePath = path.join(workspaceFolders[0].uri.fsPath, relativePath);

    if (fs.existsSync(filePath)) {
        try {
            const data = await LcovParser.parse(filePath);
            statusBarItem.text = `$(check) Cov: ${data.overall.percentage}%`;
            statusBarItem.tooltip = `Lines Hit: ${data.overall.linesHit} / ${data.overall.linesFound}`;
            statusBarItem.show();
        } catch (error) {
            console.error('Error parsing coverage file:', error);
            statusBarItem.text = `$(error) Cov: Error`;
            statusBarItem.tooltip = 'Error parsing lcov.info';
            statusBarItem.show();
        }
    } else {
        statusBarItem.hide(); // Hide if file doesn't exist
    }
}

export function deactivate() { }


