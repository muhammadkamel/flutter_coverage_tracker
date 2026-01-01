import * as vscode from 'vscode';
import * as path from 'path';
import { PlatformCoverageManager } from '../platform-coverage/PlatformCoverageManager';

export class CoverageFileDecorationProvider implements vscode.FileDecorationProvider {
    private onDidChangeFileDecorationsEmitter = new vscode.EventEmitter<vscode.Uri | undefined>();
    public readonly onDidChangeFileDecorations = this.onDidChangeFileDecorationsEmitter.event;

    constructor(private platformManager: PlatformCoverageManager) {
        this.platformManager.onPlatformChange(() => this.refresh());

        // Also listen to config changes if we add settings later
    }

    public refresh(): void {
        this.onDidChangeFileDecorationsEmitter.fire(undefined);
    }

    public provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.FileDecoration | undefined {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        // Add a config to disable decorations if needed, defaulting to true
        if (!config.get<boolean>('enableExplorerDecorations', true)) {
            return undefined;
        }

        // Only handle Dart files
        if (!uri.fsPath.endsWith('.dart')) {
            return undefined;
        }

        const coverage = this.platformManager.getCoverageForFile(uri.fsPath);
        if (!coverage) {
            return undefined;
        }

        const percentage = coverage.percentage;
        let color: vscode.ThemeColor;
        let badge: string = `${Math.floor(percentage)}%`;

        if (percentage >= 90) {
            color = new vscode.ThemeColor('gitDecoration.untrackedResourceForeground'); // Green-ish usually
        } else if (percentage >= 50) {
            color = new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'); // Yellow/Orange
        } else {
            color = new vscode.ThemeColor('gitDecoration.deletedResourceForeground'); // Red
        }

        // Alternative colors if git colors aren't semantically right:
        // charts.green, charts.yellow, charts.red might be better but require newer VS Code engine.
        // Let's stick to gitDecoration or standard colors.

        return {
            badge: badge,
            tooltip: `Coverage: ${percentage}% (${coverage.uncoveredLines.length} uncovered lines)`,
            color: color,
            propagate: false // Do not bubble up to folders for now, could be expensive
        };
    }
}
