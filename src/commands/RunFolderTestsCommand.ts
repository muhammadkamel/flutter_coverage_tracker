import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Command } from './Command';
import { FlutterTestRunner } from '../features/test-runner/FlutterTestRunner';
import { MultiTestWebviewGenerator } from '../features/test-runner/MultiTestWebviewGenerator';
import { CoverageGutterProvider } from '../features/coverage-gutters/CoverageGutterProvider';
import { CoverageStatusManager } from '../features/status-bar/CoverageStatusManager';
import { TestFileGenerator } from '../features/test-runner/utils/TestFileGenerator';
import { LcovParser } from '../shared/coverage/LcovParser';
import { CoverageMatcher } from '../shared/coverage/CoverageMatcher';
import { TestSuggestionEngine } from '../features/test-runner/TestSuggestionEngine';
import { UncoveredLinesExporter } from '../features/test-runner/utils/UncoveredLinesExporter';
import { SuiteCoverageDashboardGenerator } from '../features/suite-coverage/SuiteCoverageDashboardGenerator';
import { SuiteCoverageData, FileCoverage } from '../features/suite-coverage/types';
import { VsCodeFileWatcher } from '../features/test-runner/VsCodeFileWatcher';

import { ITestRunner } from '../features/test-runner/interfaces';

export class RunFolderTestsCommand implements Command {
    private fileWatcher: VsCodeFileWatcher;
    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly DEBOUNCE_MS = 2000;

    // State for watch mode
    private activeWatchFolder: string | undefined;
    private activeTestFolder: string | undefined;
    private activeWorkspaceRoot: string | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private testRunner: ITestRunner,
        private gutterProvider: CoverageGutterProvider,
        private statusManager: CoverageStatusManager
    ) {
        this.fileWatcher = new VsCodeFileWatcher();
        this.fileWatcher.onDidChange(() => this.onFileChanged());
    }

    async execute(uri?: vscode.Uri): Promise<void> {
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

        // Auto-creation of test files removed based on user request to not add/write tests.
        // if (relativeSelectedPath.startsWith('lib')) {
        //     const dartFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, '**/*.dart'));
        //     for (const file of dartFiles) {
        //         await TestFileGenerator.createTestFile(file.fsPath, workspaceRoot);
        //     }
        // }

        // Re-check for test folder existence after potential creation
        if (!fs.existsSync(testFolderPath)) {
            // If still no test folder, it means no tests were created (maybe no dart files found?)
            vscode.window.showErrorMessage(`No tests found or created for folder: ${relativeSelectedPath}`);
            return;
        }

        const folderName = path.basename(folderPath);
        const folderTitle = path.basename(folderPath); // Assuming folderName is suitable for title
        const panel = vscode.window.createWebviewPanel(
            'flutterMultiTestRunner',
            `Tests: ${folderTitle}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'out')]
            }
        );

        // Start coverage highlight session
        this.gutterProvider.startSession();

        const styleUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview.css')
        );
        panel.webview.html = MultiTestWebviewGenerator.getWebviewContent(folderName, styleUri, []);

        // Find all test files in this folder to show in dashboard
        const testFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(testFolderPath, '**/*_test.dart')
        );
        panel.webview.postMessage({
            type: 'init-dashboard',
            files: testFiles.map(f => ({
                name: path.relative(testFolderPath, f.fsPath),
                path: f.fsPath
            }))
        });

        // Run tests
        const outputDisposable = this.testRunner.onTestOutput(out => {
            panel.webview.postMessage({ type: 'log', value: out });
        });

        const completeDisposable = this.testRunner.onTestComplete(async result => {
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
                            folderResults.push({
                                name: path.relative(testFolderPath, testFile.fsPath),
                                path: testFile.fsPath,
                                success: match && match.fileCoverage ? true : false,
                                coverage: match ? match.fileCoverage : null,
                                sourceFile: sourceFile
                            });
                        }
                    }

                    // Generate test suggestions from coverage data
                    const suggestions = TestSuggestionEngine.analyzeCoverage(lcov.files, workspaceRoot);
                    panel.webview.postMessage({
                        type: 'suggestions',
                        suggestions: suggestions
                    });
                } catch (e) {
                    console.error('Error in coverage processing:', e);
                }
            }

            panel.webview.postMessage({
                type: 'finished',
                success: result.success,
                results: folderResults
            });

            this.statusManager.updateCoverage(); // Update status bar

            // Generate and send suite coverage data
            try {
                const suiteGenerator = new SuiteCoverageDashboardGenerator();
                const suitesMap = new Map<string, SuiteCoverageData>();

                // Process each test result into a SuiteCoverageData
                for (const result of folderResults) {
                    if (!result.success || !result.coverage) {
                        continue;
                    }

                    const suiteName = result.name;
                    const fileCoverage = result.coverage;

                    // Create FileCoverage object for the source file
                    const coveredFiles = new Map<string, FileCoverage>();

                    if (result.sourceFile) {
                        const fileCov: FileCoverage = {
                            filePath: result.sourceFile,
                            totalLines: fileCoverage.linesFound,
                            coveredLines: [], // Placeholder
                            uncoveredLines: fileCoverage.uncoveredLines || [],
                            coveragePercent: fileCoverage.percentage,
                            hitCounts: new Map()
                        } as any;

                        coveredFiles.set(result.sourceFile, fileCov);
                    }

                    const suiteData: SuiteCoverageData = {
                        suiteName: suiteName,
                        suitePath: result.path,
                        totalLines: fileCoverage.linesFound,
                        coveredLines: fileCoverage.linesHit,
                        coveragePercent: fileCoverage.percentage,
                        coveredFiles: coveredFiles,
                        lastRun: new Date()
                    };

                    suitesMap.set(suiteName, suiteData);
                }

                // Calculate aggregate
                let aggTotalLines = 0;
                let aggCoveredLines = 0;
                for (const s of suitesMap.values()) {
                    aggTotalLines += s.totalLines;
                    aggCoveredLines += s.coveredLines;
                }
                const aggCoverage = aggTotalLines > 0 ? (aggCoveredLines / aggTotalLines) * 100 : 0;

                const aggregate = {
                    suites: suitesMap,
                    totalCoveragePercent: aggCoverage,
                    totalLines: aggTotalLines,
                    totalCoveredLines: aggCoveredLines,
                    uncoveredFiles: [],
                    analyzedAt: new Date()
                };

                const html = suiteGenerator.generateSuiteCoverageSection(suitesMap, aggregate);

                panel.webview.postMessage({
                    type: 'update-suite-coverage',
                    html: html
                });
            } catch (error) {
                console.error('Error generating suite coverage:', error);
            }
        });

        panel.webview.onDidReceiveMessage(async message => {
            if (message.type === 'rerun') {
                this.testRunner.run(testFolderPath, workspaceRoot);
            } else if (message.type === 'cancel') {
                this.testRunner.cancel();
            } else if (message.type === 'viewSuiteFiles') {
                // suiteName is usually the relative path to the test file
                const suitePath = path.isAbsolute(message.suiteName)
                    ? message.suiteName
                    : path.join(workspaceRoot, message.suiteName);

                if (fs.existsSync(suitePath)) {
                    const doc = await vscode.workspace.openTextDocument(suitePath);
                    await vscode.window.showTextDocument(doc);
                } else {
                    vscode.window.showErrorMessage(`Could not find test file: ${message.suiteName}`);
                }
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
                const config = vscode.workspace.getConfiguration('flutterCoverage');
                const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                const coverageFile = path.join(workspaceRoot, relativePath);

                const results: any[] = [];
                if (fs.existsSync(coverageFile)) {
                    try {
                        const lcov = await LcovParser.parse(coverageFile);
                        for (const testFile of testFiles) {
                            const sourceCandidates = CoverageMatcher.deduceSourceFilePath(
                                testFile.fsPath,
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
                                results.push({
                                    name: path.relative(testFolderPath, testFile.fsPath),
                                    path: testFile.fsPath,
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

                await UncoveredLinesExporter.export(results, folderName, workspaceRoot);
            } else if (message.type === 'toggle-watch') {
                this.toggleWatch(message.enable, folderPath, testFolderPath, workspaceRoot);
            }
        });

        panel.onDidDispose(() => {
            this.testRunner.cancel();
            outputDisposable.dispose();
            completeDisposable.dispose();
            this.gutterProvider.endSession();
            this.toggleWatch(false, folderPath, testFolderPath, workspaceRoot);
            this.fileWatcher.dispose();
        });

        // Initial Run
        this.testRunner.run(testFolderPath, workspaceRoot);
    }

    private toggleWatch(enable: boolean, folderPath: string, testFolderPath: string, workspaceRoot: string) {
        if (enable) {
            this.activeWatchFolder = folderPath;
            this.activeTestFolder = testFolderPath;
            this.activeWorkspaceRoot = workspaceRoot;

            // Watch recursively for dart files
            const normalize = (p: string) => p.split(path.sep).join(path.posix.sep);
            const globString = normalize(folderPath) + '/**/*.dart';

            this.fileWatcher.watch(globString);
        } else {
            this.fileWatcher.dispose();
            this.activeWatchFolder = undefined;
            this.activeTestFolder = undefined;
            this.activeWorkspaceRoot = undefined;
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
        }
    }

    private onFileChanged() {
        if (!this.activeWatchFolder || !this.activeTestFolder || !this.activeWorkspaceRoot) {
            return;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            if (this.activeTestFolder && this.activeWorkspaceRoot) {
                this.testRunner.run(this.activeTestFolder, this.activeWorkspaceRoot);
            }
        }, this.DEBOUNCE_MS);
    }
}
