import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LcovParser } from '../../shared/coverage/LcovParser';

/**
 * Manages coverage gutter decorations in the editor.
 * Shows green indicators for covered lines and red for uncovered lines.
 */
export class CoverageGutterProvider {
    private coveredDecoration: vscode.TextEditorDecorationType;
    private uncoveredDecoration: vscode.TextEditorDecorationType;
    private coverageData: Map<string, Set<number>> = new Map(); // filePath -> uncovered line numbers
    private disposables: vscode.Disposable[] = [];
    private activeSessions: number = 0;

    constructor(private context: vscode.ExtensionContext) {
        this.coveredDecoration = this.createCoveredDecoration();
        this.uncoveredDecoration = this.createUncoveredDecoration();

        this.registerEventListeners();
        this.loadCoverageData();
    }

    private createCoveredDecoration(): vscode.TextEditorDecorationType {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const style = config.get<string>('coveredGutterStyle') || 'green';

        return vscode.window.createTextEditorDecorationType({
            overviewRulerColor: style === 'blue' ? 'blue' : 'green',
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            isWholeLine: false,
            backgroundColor: style === 'blue' ? 'rgba(0, 123, 255, 0.15)' : 'rgba(0, 255, 0, 0.15)',
            borderWidth: '0 0 0 3px',
            borderStyle: 'solid',
            borderColor: style === 'blue' ? 'rgba(0, 123, 255, 0.5)' : 'rgba(0, 255, 0, 0.5)'
        });
    }

    private createUncoveredDecoration(): vscode.TextEditorDecorationType {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const style = config.get<string>('uncoveredGutterStyle') || 'red';

        return vscode.window.createTextEditorDecorationType({
            overviewRulerColor: style === 'orange' ? 'orange' : 'red',
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            isWholeLine: false,
            backgroundColor: style === 'orange' ? 'rgba(255, 165, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)',
            borderWidth: '0 0 0 3px',
            borderStyle: 'solid',
            borderColor: style === 'orange' ? 'rgba(255, 165, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)'
        });
    }

    private registerEventListeners(): void {
        // Update decorations when active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Update decorations when text document is saved
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(document => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === document) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Watch for coverage file changes
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const coverageFilePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const pattern = new vscode.RelativePattern(workspaceFolders[0], coverageFilePath);
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            watcher.onDidChange(() => this.loadCoverageData());
            watcher.onDidCreate(() => this.loadCoverageData());

            this.disposables.push(watcher);
        }

        // Reload on configuration change
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('flutterCoverage')) {
                    this.recreateDecorations();
                    this.loadCoverageData();
                }
            })
        );
    }

    private recreateDecorations(): void {
        this.coveredDecoration.dispose();
        this.uncoveredDecoration.dispose();
        this.coveredDecoration = this.createCoveredDecoration();
        this.uncoveredDecoration = this.createUncoveredDecoration();

        // Re-apply to active editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.updateDecorations(editor);
        }
    }

    private async loadCoverageData(): Promise<void> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const enabled = config.get<boolean>('showGutterCoverage');

        if (!enabled) {
            this.clearAllDecorations();
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
        const coverageFile = path.join(workspaceFolders[0].uri.fsPath, relativePath);

        if (!fs.existsSync(coverageFile)) {
            return;
        }

        try {
            const lcov = await LcovParser.parse(coverageFile);
            this.coverageData.clear();

            // Build map of file -> uncovered lines
            for (const fileCoverage of lcov.files) {
                const uncoveredLines = new Set(fileCoverage.uncoveredLines);
                this.coverageData.set(fileCoverage.file, uncoveredLines);
            }

            // Update active editor
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                this.updateDecorations(editor);
            }
        } catch (error) {
            console.error('Error loading coverage data:', error);
        }
    }

    public updateDecorations(editor: vscode.TextEditor): void {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const enabled = config.get<boolean>('showGutterCoverage');

        if (!enabled || this.activeSessions <= 0) {
            editor.setDecorations(this.coveredDecoration, []);
            editor.setDecorations(this.uncoveredDecoration, []);
            return;
        }

        const document = editor.document;
        if (!document.fileName.endsWith('.dart')) {
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const relativePath = path.relative(workspaceRoot, document.fileName);

        // Try to find coverage data for this file
        let uncoveredLines: Set<number> | undefined;

        // Try exact match first
        uncoveredLines = this.coverageData.get(relativePath);

        // Try with lib/ prefix if not found
        if (!uncoveredLines && !relativePath.startsWith('lib/')) {
            uncoveredLines = this.coverageData.get('lib/' + relativePath);
        }

        // Try without lib/ prefix if not found
        if (!uncoveredLines && relativePath.startsWith('lib/')) {
            uncoveredLines = this.coverageData.get(relativePath.substring(4));
        }

        if (!uncoveredLines) {
            // No coverage data for this file
            editor.setDecorations(this.coveredDecoration, []);
            editor.setDecorations(this.uncoveredDecoration, []);
            return;
        }

        const coveredRanges: vscode.Range[] = [];
        const uncoveredRanges: vscode.Range[] = [];

        // Iterate through lines in the document
        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const line = document.lineAt(lineNum);
            const lineText = line.text.trim();

            // Skip empty lines and comments
            if (lineText === '' || lineText.startsWith('//') || lineText.startsWith('/*') || lineText.startsWith('*')) {
                continue;
            }

            const oneIndexedLine = lineNum + 1;

            if (uncoveredLines.has(oneIndexedLine)) {
                uncoveredRanges.push(line.range);
            } else {
                // Assume covered if it's executable code
                if (this.isExecutableLine(lineText)) {
                    coveredRanges.push(line.range);
                }
            }
        }

        editor.setDecorations(this.coveredDecoration, coveredRanges);
        editor.setDecorations(this.uncoveredDecoration, uncoveredRanges);
    }

    private isExecutableLine(lineText: string): boolean {
        // Heuristic: line is executable if it's not just a bracket, import, or declaration
        if (lineText === '{' || lineText === '}' || lineText === '};') {
            return false;
        }
        if (lineText.startsWith('import ') || lineText.startsWith('export ')) {
            return false;
        }
        if (
            lineText.startsWith('class ') ||
            lineText.startsWith('enum ') ||
            lineText.startsWith('abstract ') ||
            lineText.startsWith('mixin ')
        ) {
            return false;
        }
        return true;
    }

    public startSession(): void {
        this.activeSessions++;
        // Refresh decorations for all visible editors
        vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
    }

    public endSession(): void {
        if (this.activeSessions > 0) {
            this.activeSessions--;
        }

        if (this.activeSessions === 0) {
            this.clearAllDecorations();
        } else {
            // Refresh in case we want to update state, though usually just clearing if 0 is enough
            // But if we have multiple sessions, we stay visible.
        }
    }

    private clearAllDecorations(): void {
        vscode.window.visibleTextEditors.forEach(editor => {
            editor.setDecorations(this.coveredDecoration, []);
            editor.setDecorations(this.uncoveredDecoration, []);
        });
    }

    public dispose(): void {
        this.coveredDecoration.dispose();
        this.uncoveredDecoration.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
