import * as vscode from 'vscode';
import { SidebarHtmlGenerator } from './SidebarHtmlGenerator';
import { LcovParser } from '../../shared/coverage/LcovParser';
import * as path from 'path';
import * as fs from 'fs';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'flutter-coverage-tracker.sidebarView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this.updateContent();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'run-changed':
                    vscode.commands.executeCommand('flutter-coverage-tracker.runChangedTests');
                    break;
                case 'run-folder':
                    // We need to know which folder to run.
                    // Since this is a general button, maybe trigger a quick pick or a workspace dialog?
                    // Or reuse existing logic if it supports no-args (which it does via open dialog usually)
                    // Let's verify how runFolderTests is triggered.
                    // It usually takes a uri. If null, it can prompt.
                    // But our implementation might rely on context menu URI.
                    // Let's create a command wrapper in extension.ts if needed, or just let user pick from explorer?
                    // Better: Trigger a command that asks for folder if no arg provided.
                    // For now, let's try calling it empty and see if we can adapt the command handler later.
                    // Actually, "Run Folder Tests" context menu command passes a URI.
                    // We might need a new command "Pick Folder and Run Tests".
                    // For now, let's trigger the command and let VS Code handle it (it might error if it expects args).
                    // We will update extension.ts to handle undefined args for that command.
                    vscode.commands.executeCommand('flutter-coverage-tracker.runFolderTests');
                    break;
                case 'show-details':
                    vscode.commands.executeCommand('flutter-coverage-tracker.showDetails');
                    break;
                case 'view-history':
                    vscode.commands.executeCommand('flutter-coverage-tracker.showCoverageHistory');
                    break;
                case 'view-suite':
                    vscode.commands.executeCommand('flutter-coverage-tracker.showSuiteCoverage');
                    break;
            }
        });
    }

    public async updateContent() {
        if (!this._view) {
            return;
        }

        let coveragePercent = 0;

        // Try to read current coverage
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const config = vscode.workspace.getConfiguration('flutterCoverage');
            const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
            const coverageFile = path.join(workspaceFolders[0].uri.fsPath, relativePath);

            if (fs.existsSync(coverageFile)) {
                try {
                    const excludedExtensions = config.get<string[]>('excludedFileExtensions') || [];
                    const data = await LcovParser.parse(coverageFile, excludedExtensions);
                    coveragePercent = data.overall.percentage;
                } catch (e) {
                    // ignore
                }
            }
        }

        this._view.webview.html = SidebarHtmlGenerator.getWebviewContent(
            this._view.webview,
            this._extensionUri,
            coveragePercent
        );
    }
}
