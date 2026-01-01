import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Features
import { SidebarProvider } from './features/sidebar/SidebarProvider';
import { FlutterTestRunner } from './features/test-runner/FlutterTestRunner';
import { VsCodeFileWatcher } from './features/test-runner/VsCodeFileWatcher';
import { CoverageOrchestrator } from './features/test-runner/CoverageOrchestrator';
import { PlatformCoverageManager, Platform } from './features/platform-coverage/PlatformCoverageManager';
import { CoverageHistoryManager } from './features/coverage-history/CoverageHistoryManager';
import { DiffCoverageManager } from './features/diff-coverage/DiffCoverageManager';
import { GitService } from './features/git/GitService';
import { CoverageGutterProvider } from './features/coverage-gutters/CoverageGutterProvider';
import { CoverageCodeLensProvider } from './features/codelens/CoverageCodeLensProvider';
import { CoverageFileDecorationProvider } from './features/decorations/CoverageFileDecorationProvider';
import { CoverageStatusManager } from './features/status-bar/CoverageStatusManager';

// Commands
import { RunChangedTestsCommand } from './commands/RunChangedTestsCommand';
import { RunRelatedTestCommand } from './commands/RunRelatedTestCommand';
import { RunFolderTestsCommand } from './commands/RunFolderTestsCommand';
import { PlatformTestCommand } from './commands/PlatformTestCommand';
import { ShowDetailsCommand } from './commands/ShowDetailsCommand';

// Shared Utils (for remaining inline commands)
import { FileSystemUtils } from './features/test-runner/utils/FileSystemUtils';
import { TestFileGenerator } from './features/test-runner/utils/TestFileGenerator';
import { HistoryWebviewGenerator } from './features/coverage-history/HistoryWebviewGenerator';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Coverage Tracker: Activating extension...');

    // 1. Initialize Core Services
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('flutter-coverage-tracker-sidebar', sidebarProvider)
    );
    console.log('Flutter Coverage Tracker: SidebarProvider registered successfully.');

    const platformManager = new PlatformCoverageManager();
    const statusManager = new CoverageStatusManager(context, platformManager);

    // Initial status update
    statusManager.updateCoverage();

    const testRunner = new FlutterTestRunner();
    const fileWatcher = new VsCodeFileWatcher();
    const orchestrator = new CoverageOrchestrator(testRunner, fileWatcher);
    const historyManager = new CoverageHistoryManager(context);
    const diffCoverageManager = new DiffCoverageManager(platformManager); // Fixed: Pass platformManager
    const gitService = new GitService();
    const gutterProvider = new CoverageGutterProvider(context);
    const codeLensProvider = new CoverageCodeLensProvider(platformManager); // Fixed: Pass platformManager

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'dart', scheme: 'file' }, codeLensProvider)
    );

    const decorationProvider = new CoverageFileDecorationProvider(platformManager); // Fixed: Pass platformManager
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(decorationProvider));

    // 2. Register Commands using Command Classes

    // Run Related Test
    const runRelatedTestCommand = new RunRelatedTestCommand(
        context,
        orchestrator,
        testRunner,
        gutterProvider,
        statusManager
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runRelatedTest', (uri?: vscode.Uri) =>
            runRelatedTestCommand.execute(uri)
        )
    );

    // Run Folder Tests
    const runFolderTestsCommand = new RunFolderTestsCommand(context, testRunner, gutterProvider, statusManager);
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runFolderTests', (uri: vscode.Uri) =>
            runFolderTestsCommand.execute(uri)
        )
    );

    // Run Changed Tests (Git)
    const runChangedTestsCommand = new RunChangedTestsCommand(
        context,
        gitService,
        testRunner,
        gutterProvider,
        statusManager
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runChangedTests', () =>
            runChangedTestsCommand.execute()
        )
    );

    // Show Details
    const showDetailsCommand = new ShowDetailsCommand();
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.showDetails', () => showDetailsCommand.execute())
    );

    // Platform Tests
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runTestsAndroid', () =>
            new PlatformTestCommand(Platform.Android, platformManager, statusManager).execute()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runTestsIOS', () =>
            new PlatformTestCommand(Platform.iOS, platformManager, statusManager).execute()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runTestsWeb', () =>
            new PlatformTestCommand(Platform.Web, platformManager, statusManager).execute()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.runTestsDesktop', () =>
            new PlatformTestCommand(Platform.Desktop, platformManager, statusManager).execute()
        )
    );

    // Switch Platform
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.switchPlatform', async () => {
            const platforms = ['Android', 'iOS', 'Web', 'Desktop'];
            const selected = await vscode.window.showQuickPick(platforms, {
                placeHolder: 'Select platform to view coverage for'
            });

            if (selected) {
                let platform: Platform;
                switch (selected) {
                    case 'Android':
                        platform = Platform.Android;
                        break;
                    case 'iOS':
                        platform = Platform.iOS;
                        break;
                    case 'Web':
                        platform = Platform.Web;
                        break;
                    case 'Desktop':
                        platform = Platform.Desktop;
                        break;
                    default:
                        return; // Should not happen
                }
                platformManager.setPlatform(platform);
                statusManager.updateCoverage();
                vscode.window.showInformationMessage(`Switched to ${selected} coverage`);
            }
        })
    );

    // 3. Keep remaining simple commands inline
    // Jump To Test/Impl
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.jumpToTestOrImpl', async (uri?: vscode.Uri) => {
            let targetUri = uri;
            if (!targetUri) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                targetUri = editor.document.uri;
            }

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
            if (!workspaceFolder) {
                return;
            }

            const workspaceRoot = workspaceFolder.uri.fsPath;
            const filePath = targetUri.fsPath;

            if (filePath.endsWith('_test.dart')) {
                // Go to impl
                const existingSources = FileSystemUtils.getExistingSourceFilePaths(filePath, workspaceRoot);

                if (existingSources.length === 1) {
                    const doc = await vscode.workspace.openTextDocument(existingSources[0]);
                    await vscode.window.showTextDocument(doc);
                } else if (existingSources.length > 1) {
                    const items = existingSources.map(p => ({
                        label: path.basename(p),
                        description: path.relative(workspaceRoot, p),
                        path: p
                    }));
                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select implementation file'
                    });
                    if (selected) {
                        const doc = await vscode.workspace.openTextDocument(selected.path);
                        await vscode.window.showTextDocument(doc);
                    }
                } else {
                    vscode.window.showInformationMessage('Implementation file not found.');
                }
            } else if (filePath.endsWith('.dart')) {
                // Go to test
                const existingTests = FileSystemUtils.getExistingTestFilePaths(filePath, workspaceRoot);

                if (existingTests.length === 1) {
                    const doc = await vscode.workspace.openTextDocument(existingTests[0]);
                    await vscode.window.showTextDocument(doc);
                } else if (existingTests.length > 1) {
                    const items = existingTests.map(p => ({
                        label: path.basename(p),
                        description: path.relative(workspaceRoot, p),
                        path: p
                    }));
                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select test file'
                    });
                    if (selected) {
                        const doc = await vscode.workspace.openTextDocument(selected.path);
                        await vscode.window.showTextDocument(doc);
                    }
                } else {
                    const create = await vscode.window.showInformationMessage(
                        'Test file not found. Create it?',
                        'Yes',
                        'No'
                    );
                    if (create === 'Yes') {
                        const isMixed = TestFileGenerator.isMixedAbstractConcreteFile(filePath);
                        await TestFileGenerator.createTestFile(filePath, workspaceRoot);
                        const finalPath = FileSystemUtils.resolveTestFilePath(filePath, workspaceRoot, isMixed);
                        if (fs.existsSync(finalPath)) {
                            const doc = await vscode.workspace.openTextDocument(finalPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                }
            }
        })
    );

    // Diff Coverage
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.showFileDiffCoverage', async (uri: vscode.Uri) => {
            await diffCoverageManager.showDiffCoverage(uri);
        })
    );

    // History Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.viewHistory', () => {
            const panel = vscode.window.createWebviewPanel(
                'coverageHistory',
                'Coverage History',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            panel.webview.html = HistoryWebviewGenerator.getWebviewContent(historyManager); // Fixed: Pass historyManager
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.recordSnapshot', async () => {
            if (vscode.workspace.workspaceFolders) {
                const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const coverage = await platformManager.loadCoverage(root);
                if (coverage) {
                    await historyManager.recordSnapshot(coverage, platformManager.getCurrentPlatform());
                    vscode.window.showInformationMessage('Coverage snapshot recorded');
                } else {
                    vscode.window.showWarningMessage('No coverage data to record.');
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.exportHistory', async () => {
            const uri = await vscode.window.showSaveDialog({
                filters: { JSON: ['json'], CSV: ['csv'] }
            });
            if (uri) {
                fs.writeFileSync(uri.fsPath, JSON.stringify(historyManager.getHistory(), null, 2));
                vscode.window.showInformationMessage('History exported');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('flutter-coverage-tracker.clearHistory', () => {
            historyManager.clearHistory();
            vscode.window.showInformationMessage('History cleared');
        })
    );

    // 4. Register Watchers

    // Watch for coverage file changes to update status bar
    const config = vscode.workspace.getConfiguration('flutterCoverage');
    const coverageFilePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';

    if (vscode.workspace.workspaceFolders) {
        const folder = vscode.workspace.workspaceFolders[0];
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, coverageFilePath));
        watcher.onDidChange(() => {
            statusManager.updateCoverage();
            sidebarProvider.updateContent();
        });
        watcher.onDidCreate(() => {
            statusManager.updateCoverage();
            sidebarProvider.updateContent();
        });
        context.subscriptions.push(watcher);
    }

    // Auto record history watcher
    const autoRecord = config.get<boolean>('autoRecordHistory');
    if (autoRecord && vscode.workspace.workspaceFolders) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], coverageFilePath)
        );
        let debounceTimer: NodeJS.Timeout;
        const record = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
                const coverage = await platformManager.loadCoverage(root);
                if (coverage) {
                    historyManager.recordSnapshot(coverage, platformManager.getCurrentPlatform());
                }
            }, 5000);
        };
        watcher.onDidChange(record);
        context.subscriptions.push(watcher);
    }
}

export function deactivate() {
    console.log('Flutter Coverage Tracker: Deactivating...');
}
