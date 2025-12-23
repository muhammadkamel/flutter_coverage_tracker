import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseLcovFile } from './coverageParser';
import { deduceSourceFilePath, findCoverageEntry } from './coverageMatching';
import { resolveTestFilePath } from './utils';
import * as cp from 'child_process';
import { getWebviewContent } from './webview';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Coverage Tracker is active');

    // Create Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'flutter-coverage-tracker.showDetails';
    context.subscriptions.push(statusBarItem);

    // Initial Update
    updateCoverage();

    // Watch for file changes
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
            vscode.window.showErrorMessage('Current file is not a Dart file.');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('File is not in a workspace.');
            return;
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;
        const testFilePath = resolveTestFilePath(currentFile, workspaceRoot);

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

            panel.webview.html = getWebviewContent(fileName, context.extensionUri);

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
                        // Re-run the test
                        runTest(panel, testFilePath, workspaceRoot);
                    }
                },
                undefined,
                context.subscriptions
            );

            // Run the test initially
            runTest(panel, testFilePath, workspaceRoot);

        } else {
            vscode.window.showErrorMessage(`Could not find related test file at: ${testFilePath}`);
        }
    });

    context.subscriptions.push(runTestDisposable);

    // Function to run test and stream output to webview
    function runTest(panel: vscode.WebviewPanel, testFilePath: string, workspaceRoot: string) {
        // Using shell: true for better compatibility with PATH
        const child = cp.spawn('flutter', ['test', '--coverage', testFilePath], { cwd: workspaceRoot, shell: true });

        child.stdout.on('data', (data) => {
            panel.webview.postMessage({ type: 'log', value: data.toString() });
        });

        child.stderr.on('data', (data) => {
            panel.webview.postMessage({ type: 'log', value: data.toString() });
        });

        child.on('close', async (code) => {
            const success = code === 0;
            let coverageData = null;
            let targetSourceSuffix = '';

            if (success) {
                // refresh global coverage first
                updateCoverage();

                const config = vscode.workspace.getConfiguration('flutterCoverage');
                const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                const coverageFile = path.join(workspaceRoot, relativePath);

                if (fs.existsSync(coverageFile)) {
                    try {
                        const result = await parseLcovFile(coverageFile);

                        targetSourceSuffix = deduceSourceFilePath(testFilePath, workspaceRoot) || '';

                        // Log diagnostic info to Webview
                        panel.webview.postMessage({ type: 'log', value: `[Coverage Info] Test Run Completed.` });
                        panel.webview.postMessage({ type: 'log', value: `[Coverage Info] Test File: ${testFilePath}` });
                        panel.webview.postMessage({ type: 'log', value: `[Coverage Info] Looking for coverage of: ${targetSourceSuffix}` });

                        if (targetSourceSuffix) {
                            const matchResult = findCoverageEntry(targetSourceSuffix, result.files, workspaceRoot);

                            if (matchResult) {
                                coverageData = matchResult.fileCoverage;
                                panel.webview.postMessage({ type: 'log', value: `[Coverage Info] Found via ${matchResult.matchType} match: ${matchResult.normalizedPath}` });
                                panel.webview.postMessage({ type: 'log', value: `[Coverage Info] Match successful! Coverage: ${coverageData.percentage}%` });
                            } else {
                                panel.webview.postMessage({ type: 'log', value: `[Coverage Warning] No specific coverage found for ${targetSourceSuffix}. Displaying overall project coverage.` });
                                coverageData = result.overall;
                            }
                        } else {
                            panel.webview.postMessage({ type: 'log', value: `[Coverage Warning] Could not determine source file from path. Displaying overall project coverage.` });
                            coverageData = result.overall;
                        }

                    } catch (e) {
                        console.error('Failed to parse coverage', e);
                        panel.webview.postMessage({ type: 'log', value: `[Coverage Error] Failed to parse lcov.info: ${e}` });
                    }
                } else {
                    panel.webview.postMessage({ type: 'log', value: `[Coverage Warning] Coverage file not found at: ${relativePath}` });
                    panel.webview.postMessage({ type: 'log', value: `[Coverage Warning] Make sure 'flutter test --coverage' generated the file.` });
                }
            }

            panel.webview.postMessage({
                type: 'finished',
                success: success,
                coverage: coverageData,
                sourceFile: targetSourceSuffix || ''
            });
        });
    }
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
            const data = await parseLcovFile(filePath);
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
