import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { UncoveredLinesExporter } from './features/test-runner/utils/UncoveredLinesExporter';
import { FileSystemUtils } from './features/test-runner/utils/FileSystemUtils';
import { TestFileGenerator } from './features/test-runner/utils/TestFileGenerator';
import { LcovParser } from './shared/coverage/LcovParser';
import { FlutterTestRunner } from './features/test-runner/FlutterTestRunner';
import { VsCodeFileWatcher } from './features/test-runner/VsCodeFileWatcher';
import { CoverageOrchestrator } from './features/test-runner/CoverageOrchestrator';
import { WebviewGenerator } from './features/test-runner/WebviewGenerator';
import { MultiTestWebviewGenerator } from './features/test-runner/MultiTestWebviewGenerator';
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

        // Auto-create if missing
        if (!fs.existsSync(testFilePath)) {
            const created = await TestFileGenerator.createTestFile(currentFile, workspaceRoot);
            if (created) {
                vscode.window.showInformationMessage(`Created test file: ${path.basename(testFilePath)}`);
            }
        }

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
            vscode.window.showErrorMessage(`Could not find or create related test file at: ${testFilePath}`);
        }
    });

    context.subscriptions.push(runTestDisposable);

    // Command: Run Folder Tests
    let runFolderTestsDisposable = vscode.commands.registerCommand('flutter-coverage-tracker.runFolderTests', async (uri?: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected.');
            return;
        }

        const folderPath = uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Folder is not in a workspace.');
            return;
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;
        const relativeSelectedPath = path.relative(workspaceRoot, folderPath);

        // If user selected a lib/ subfolder, we target corresponding test/ subfolder
        let testFolderPath = folderPath;
        if (relativeSelectedPath.startsWith('lib')) {
            const innerPath = relativeSelectedPath.substring(3); // remove 'lib'
            testFolderPath = path.join(workspaceRoot, 'test', innerPath);
        }

        // Auto-create test files for all Dart files in the selected folder (if in lib)
        if (relativeSelectedPath.startsWith('lib')) {
            const dartFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, '**/*.dart'));
            for (const file of dartFiles) {
                await TestFileGenerator.createTestFile(file.fsPath, workspaceRoot);
            }
        }

        // Re-check for test folder existence after potential creation
        if (!fs.existsSync(testFolderPath)) {
            // If still no test folder, it means no tests were created (maybe no dart files found?)
            vscode.window.showErrorMessage(`No tests found or created for folder: ${relativeSelectedPath}`);
            return;
        }

        const folderName = path.basename(folderPath);
        const panel = vscode.window.createWebviewPanel(
            'flutterFolderTests',
            `Tests: ${folderName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', 'webview.css'));
        panel.webview.html = MultiTestWebviewGenerator.getWebviewContent(folderName, styleUri);

        // Find all test files in this folder to show in dashboard
        const testFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(testFolderPath, '**/*_test.dart'));
        panel.webview.postMessage({
            type: 'init-dashboard',
            files: testFiles.map(f => ({
                name: path.relative(testFolderPath, f.fsPath),
                path: f.fsPath
            }))
        });

        // Run tests
        const outputDisposable = testRunner.onTestOutput(out => {
            panel.webview.postMessage({ type: 'log', value: out });
        });

        const completeDisposable = testRunner.onTestComplete(async result => {
            const config = vscode.workspace.getConfiguration('flutterCoverage');
            const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
            const coverageFile = path.join(workspaceRoot, relativePath);

            const folderResults: any[] = [];

            if (fs.existsSync(coverageFile)) {
                try {
                    const lcov = await LcovParser.parse(coverageFile);
                    for (const testFile of testFiles) {
                        const sourceCandidates = CoverageMatcher.deduceSourceFilePath(testFile.fsPath, workspaceRoot);
                        let sourceFile = undefined;
                        let match = undefined;

                        // Try each candidate
                        for (const candidate of sourceCandidates) {
                            match = CoverageMatcher.findCoverageEntry(candidate, lcov.files, workspaceRoot);
                            if (match && match.fileCoverage) {
                                sourceFile = candidate;
                                break;
                            }
                        }

                        // Fallback to first candidate if no match
                        if (!sourceFile && sourceCandidates.length > 0) {
                            sourceFile = sourceCandidates[0];
                        }

                        if (sourceFile) {
                            // Infer individual test success from coverage
                            // If coverage exists, test likely passed; otherwise failed
                            const testSuccess = match && match.fileCoverage ? true : false;

                            folderResults.push({
                                name: path.relative(testFolderPath, testFile.fsPath),
                                path: testFile.fsPath,
                                success: testSuccess,
                                coverage: match ? match.fileCoverage : null,
                                sourceFile: sourceFile
                            });
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            panel.webview.postMessage({
                type: 'finished',
                success: result.success,
                results: folderResults
            });

            updateCoverage(); // Update status bar
        });

        panel.webview.onDidReceiveMessage(async message => {
            if (message.type === 'rerun') {
                testRunner.run(testFolderPath, workspaceRoot);
            } else if (message.type === 'cancel') {
                testRunner.cancel();
            } else if (message.type === 'navigateToLine') {
                const filePath = path.join(workspaceRoot, message.file);
                if (fs.existsSync(filePath)) {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const editor = await vscode.window.showTextDocument(doc);
                    const line = message.line - 1; // Convert to 0-indexed
                    const position = new vscode.Position(line, 0);
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                }
            } else if (message.type === 'navigateToTestFile') {
                const filePath = message.filePath;
                if (fs.existsSync(filePath)) {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);
                }
            } else if (message.type === 'export') {
                // We need the results. Since folderResults is local to the onTestComplete callback,
                // we might need to store it or re-calculate.
                // However, onTestComplete sends 'finished' message with data.

                // Let's check where folderResults is available.
                // It's calculated inside onTestComplete.
                // We'll simpler approach: pass the results from the webview back? 
                // OR calculate it again? No, we have the latest results in the panel state or can re-read coverage.

                // Better: Let's make extension.ts store the last results for this panel?
                // Or just re-parse coverage. lcov.info + test files list.

                // Re-calculating avoids stale state.
                const config = vscode.workspace.getConfiguration('flutterCoverage');
                const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                const coverageFile = path.join(workspaceRoot, relativePath);

                const results: any[] = [];
                if (fs.existsSync(coverageFile)) {
                    try {
                        const lcov = await LcovParser.parse(coverageFile);
                        for (const testFile of testFiles) {
                            const sourceCandidates = CoverageMatcher.deduceSourceFilePath(testFile.fsPath, workspaceRoot);
                            let sourceFile = undefined;
                            let match = undefined;
                            for (const candidate of sourceCandidates) {
                                match = CoverageMatcher.findCoverageEntry(candidate, lcov.files, workspaceRoot);
                                if (match && match.fileCoverage) {
                                    sourceFile = candidate;
                                    break;
                                }
                            }
                            if (!sourceFile && sourceCandidates.length > 0) sourceFile = sourceCandidates[0];

                            if (sourceFile) {
                                results.push({
                                    name: path.relative(testFolderPath, testFile.fsPath),
                                    path: testFile.fsPath,
                                    success: match && match.fileCoverage ? true : false,
                                    coverage: match ? match.fileCoverage : null,
                                    sourceFile: sourceFile
                                });
                            }
                        }
                    } catch (e) { console.error(e); }
                }

                await UncoveredLinesExporter.export(results, folderName, workspaceRoot);
            }
        });

        panel.onDidDispose(() => {
            testRunner.cancel();
            outputDisposable.dispose();
            completeDisposable.dispose();
        });

        // Initial Run
        testRunner.run(testFolderPath, workspaceRoot);
    });

    context.subscriptions.push(runFolderTestsDisposable);
    context.subscriptions.push(runFolderTestsDisposable);

    // Command: Show Details (Status Bar Click)
    let showDetailsDisposable = vscode.commands.registerCommand('flutter-coverage-tracker.showDetails', async () => {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const filePath = path.join(workspaceFolders[0].uri.fsPath, relativePath);

        if (fs.existsSync(filePath)) {
            try {
                const data = await LcovParser.parse(filePath);
                const result = await vscode.window.showInformationMessage(
                    `Coverage: ${data.overall.percentage}% (Hit: ${data.overall.linesHit} / ${data.overall.linesFound})`,
                    'Open Report'
                );

                if (result === 'Open Report') {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);
                }
            } catch (e) {
                vscode.window.showErrorMessage('Failed to read coverage details.');
            }
        } else {
            vscode.window.showWarningMessage('No coverage file found.');
        }
    });
    context.subscriptions.push(showDetailsDisposable);
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


