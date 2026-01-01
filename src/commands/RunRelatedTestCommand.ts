import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Command } from './Command';
import { CoverageOrchestrator } from '../features/test-runner/CoverageOrchestrator';
import { FlutterTestRunner } from '../features/test-runner/FlutterTestRunner';
import { WebviewGenerator } from '../features/test-runner/WebviewGenerator';
import { CoverageGutterProvider } from '../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../features/status-bar/CoverageStatusManager';
import { FileSystemUtils } from '../features/test-runner/utils/FileSystemUtils';
import { TestFileGenerator } from '../features/test-runner/utils/TestFileGenerator';

export class RunRelatedTestCommand implements Command {
    constructor(
        private context: vscode.ExtensionContext,
        private orchestrator: CoverageOrchestrator,
        private testRunner: FlutterTestRunner,
        private gutterProvider: CoverageGutterProvider,
        private statusManager: CoverageStatusManager
    ) { }

    async execute(uri?: vscode.Uri): Promise<void> {
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

        let testFilePath: string;
        if (currentFile.endsWith('_test.dart')) {
            testFilePath = currentFile;
        } else {
            testFilePath = FileSystemUtils.resolveTestFilePath(currentFile, workspaceRoot);
            // Auto-create if missing
            if (!fs.existsSync(testFilePath)) {
                const created = await TestFileGenerator.createTestFile(currentFile, workspaceRoot);
                if (created) {
                    vscode.window.showInformationMessage(`Created test file: ${path.basename(testFilePath)}`);
                }
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

            // Start coverage highlight session
            this.gutterProvider.startSession();

            const styleUri = panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview.css')
            );
            panel.webview.html = WebviewGenerator.getWebviewContent(fileName, styleUri);

            // Wire up events
            const outputDisposable = this.testRunner.onTestOutput(out => {
                panel.webview.postMessage({ type: 'log', value: out });
            });

            const completeDisposable = this.testRunner.onTestComplete(result => {
                if (result.success) {
                    vscode.window.showInformationMessage(`Test Passed: ${path.basename(testFilePath)}`);
                    this.statusManager.updateCoverage(); // Update status bar
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
                            editor.revealRange(
                                new vscode.Range(position, position),
                                vscode.TextEditorRevealType.InCenter
                            );
                        }
                    } else if (message.type === 'rerun') {
                        this.orchestrator.runTest(testFilePath, workspaceRoot);
                    } else if (message.type === 'cancel') {
                        this.orchestrator.cancelTest();
                    } else if (message.type === 'toggle-watch') {
                        this.orchestrator.toggleWatch(message.enable);
                    }
                },
                undefined,
                this.context.subscriptions
            );

            panel.onDidDispose(() => {
                this.orchestrator.toggleWatch(false);
                this.orchestrator.cancelTest();
                outputDisposable.dispose();
                completeDisposable.dispose();
                this.gutterProvider.endSession();
            });

            // Run the test initially
            this.orchestrator.runTest(testFilePath, workspaceRoot);
        } else {
            vscode.window.showErrorMessage(`Could not find or create related test file at: ${testFilePath}`);
        }
    }
}
