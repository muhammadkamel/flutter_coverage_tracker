import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Command } from './Command';
import { GitService } from '../features/git/GitService';
import { FlutterTestRunner } from '../features/test-runner/FlutterTestRunner';
import { MultiTestWebviewGenerator } from '../features/test-runner/MultiTestWebviewGenerator';
import { CoverageGutterProvider } from '../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../features/status-bar/CoverageStatusManager';
import { TestFileGenerator } from '../features/test-runner/utils/TestFileGenerator';
import { FileSystemUtils } from '../features/test-runner/utils/FileSystemUtils';
import { LcovParser } from '../shared/coverage/LcovParser';
import { CoverageMatcher } from '../shared/coverage/CoverageMatcher';
import { TestSuggestionEngine } from '../features/test-runner/TestSuggestionEngine';
import { UncoveredLinesExporter } from '../features/test-runner/utils/UncoveredLinesExporter';

export class RunChangedTestsCommand implements Command {
    constructor(
        private context: vscode.ExtensionContext,
        private gitService: GitService,
        private testRunner: FlutterTestRunner,
        private gutterProvider: CoverageGutterProvider,
        private statusManager: CoverageStatusManager
    ) {}

    async execute(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Check if it's a git repo
        const isRepo = await this.gitService.isGitRepo(workspaceRoot);
        if (!isRepo) {
            vscode.window.showErrorMessage('Current workspace is not a Git repository.');
            return;
        }

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Fetching changed files...',
                cancellable: false
            },
            async progress => {
                const changedFiles = await this.gitService.getModifiedFiles(workspaceRoot);

                if (changedFiles.length === 0) {
                    vscode.window.showInformationMessage('No changed Dart files found.');
                    return;
                }

                // Map changed files to test files
                const testFilesToRun: string[] = [];
                for (const file of changedFiles) {
                    const fullPath = path.isAbsolute(file) ? file : path.join(workspaceRoot, file);

                    // If the changed file is already a test, just add it
                    if (fullPath.endsWith('_test.dart')) {
                        testFilesToRun.push(fullPath);
                    } else if (fullPath.endsWith('.dart')) {
                        // Try to find or create a test for this implementation file
                        const possibleTestPaths = FileSystemUtils.getPossibleTestFilePaths(fullPath, workspaceRoot);
                        const existingTest = possibleTestPaths.find(p => fs.existsSync(p));

                        if (existingTest) {
                            testFilesToRun.push(existingTest);
                        } else {
                            // If no test exists, offer to create it or just skip?
                            // For "Run Changed Tests", it's better to offer creation.
                            const created = await TestFileGenerator.createTestFile(fullPath, workspaceRoot);
                            if (created) {
                                testFilesToRun.push(possibleTestPaths[0]);
                            }
                        }
                    }
                }

                if (testFilesToRun.length === 0) {
                    vscode.window.showInformationMessage('No corresponding tests found for changed files.');
                    return;
                }

                // Deduplicate
                const uniqueTestFiles = Array.from(new Set(testFilesToRun));

                const panel = vscode.window.createWebviewPanel(
                    'flutterChangedTests',
                    `Changed Tests: ${uniqueTestFiles.length} files`,
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
                panel.webview.html = MultiTestWebviewGenerator.getWebviewContent('Git Changes', styleUri, []);

                // Init dashboard
                panel.webview.postMessage({
                    type: 'init-dashboard',
                    files: uniqueTestFiles.map(f => ({
                        name: path.relative(workspaceRoot, f),
                        path: f
                    }))
                });

                // Run tests
                const outputDisposable = this.testRunner.onTestOutput(out => {
                    panel.webview.postMessage({ type: 'log', value: out });
                });

                const completeDisposable = this.testRunner.onTestComplete(async result => {
                    // Re-use the same folder results logic as runFolderTests
                    // But we need to use uniqueTestFiles as our source list.

                    const results: any[] = [];
                    const config = vscode.workspace.getConfiguration('flutterCoverage');
                    const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                    const coverageFile = path.join(workspaceRoot, relativePath);

                    if (fs.existsSync(coverageFile)) {
                        try {
                            const lcov = await LcovParser.parse(coverageFile);
                            for (const testFile of uniqueTestFiles) {
                                const sourceCandidates = CoverageMatcher.deduceSourceFilePath(testFile, workspaceRoot);
                                let sourceFile = undefined;
                                let match = undefined;

                                for (const candidate of sourceCandidates) {
                                    match = CoverageMatcher.findCoverageEntry(candidate, lcov.files, workspaceRoot);
                                    if (match && match.fileCoverage) {
                                        sourceFile = candidate;
                                        break;
                                    }
                                }

                                if (!sourceFile && sourceCandidates.length > 0) {
                                    sourceFile = sourceCandidates[0];
                                }

                                if (sourceFile) {
                                    results.push({
                                        name: path.relative(workspaceRoot, testFile),
                                        path: testFile,
                                        success: match && match.fileCoverage ? true : false,
                                        coverage: match ? match.fileCoverage : null,
                                        sourceFile: sourceFile
                                    });
                                }
                            }

                            // Suggestions
                            const suggestions = TestSuggestionEngine.analyzeCoverage(lcov.files, workspaceRoot);
                            panel.webview.postMessage({
                                type: 'suggestions',
                                suggestions: suggestions
                            });
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    panel.webview.postMessage({
                        type: 'finished',
                        success: result.success,
                        results: results
                    });

                    this.statusManager.updateCoverage();
                });

                panel.webview.onDidReceiveMessage(async message => {
                    if (message.type === 'rerun') {
                        this.testRunner.run(uniqueTestFiles.join(' '), workspaceRoot);
                    } else if (message.type === 'cancel') {
                        this.testRunner.cancel();
                    } else if (message.type === 'navigateToLine') {
                        const filePath = path.join(workspaceRoot, message.file);
                        if (fs.existsSync(filePath)) {
                            const doc = await vscode.workspace.openTextDocument(filePath);
                            const editor = await vscode.window.showTextDocument(doc);
                            const line = message.line - 1;
                            const position = new vscode.Position(line, 0);
                            editor.selection = new vscode.Selection(position, position);
                            editor.revealRange(
                                new vscode.Range(position, position),
                                vscode.TextEditorRevealType.InCenter
                            );
                        }
                    } else if (message.type === 'navigateToTestFile') {
                        const filePath = message.filePath;
                        if (fs.existsSync(filePath)) {
                            const doc = await vscode.workspace.openTextDocument(filePath);
                            await vscode.window.showTextDocument(doc);
                        }
                    } else if (message.type === 'export') {
                        // Export uncovered lines report for Git changes
                        const config = vscode.workspace.getConfiguration('flutterCoverage');
                        const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                        const coverageFile = path.join(workspaceRoot, relativePath);

                        const exportResults: any[] = [];
                        if (fs.existsSync(coverageFile)) {
                            try {
                                const lcov = await LcovParser.parse(coverageFile);
                                for (const testFile of uniqueTestFiles) {
                                    const sourceCandidates = CoverageMatcher.deduceSourceFilePath(
                                        testFile,
                                        workspaceRoot
                                    );
                                    let sourceFile = undefined;
                                    let match = undefined;
                                    for (const candidate of sourceCandidates) {
                                        match = CoverageMatcher.findCoverageEntry(candidate, lcov.files, workspaceRoot);
                                        if (match && match.fileCoverage) {
                                            sourceFile = candidate;
                                            break;
                                        }
                                    }
                                    if (!sourceFile && sourceCandidates.length > 0) {
                                        sourceFile = sourceCandidates[0];
                                    }

                                    if (sourceFile) {
                                        exportResults.push({
                                            name: path.relative(workspaceRoot, testFile),
                                            path: testFile,
                                            success: match && match.fileCoverage ? true : false,
                                            coverage: match ? match.fileCoverage : null,
                                            sourceFile: sourceFile
                                        });
                                    }
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        await UncoveredLinesExporter.export(exportResults, 'git_changes', workspaceRoot);
                    }
                });

                panel.onDidDispose(() => {
                    this.testRunner.cancel();
                    outputDisposable.dispose();
                    completeDisposable.dispose();
                    this.gutterProvider.endSession();
                });

                // Initial run
                this.testRunner.run(uniqueTestFiles.join(' '), workspaceRoot);
            }
        );
    }
}
