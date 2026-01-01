import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PlatformCoverageManager } from '../platform-coverage/PlatformCoverageManager';
import { LcovParser } from '../../shared/coverage/LcovParser';

export class CoverageStatusManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor(
        private context: vscode.ExtensionContext,
        private platformManager: PlatformCoverageManager
    ) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'flutter-coverage-tracker.showDetails';
        context.subscriptions.push(this.statusBarItem);
    }

    public async updateCoverage() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.statusBarItem.hide();
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        if (this.platformManager) {
            try {
                const data = await this.platformManager.loadCoverage(workspaceRoot);
                if (data) {
                    const platform = this.platformManager.getCurrentPlatform();
                    const platformIcon = this.platformManager.getPlatformIcon(platform);
                    this.statusBarItem.text = `$(check) Cov: ${data.overall.percentage}% ${platformIcon}`;
                    this.statusBarItem.tooltip = `${this.platformManager.getPlatformLabel(platform)}: Lines Hit: ${data.overall.linesHit} / ${data.overall.linesFound}`;
                    this.statusBarItem.show();
                } else {
                    this.statusBarItem.hide();
                }
            } catch (error) {
                console.error('Error updating coverage:', error);
                this.statusBarItem.text = `$(error) Cov: Error`;
                this.statusBarItem.tooltip = 'Error loading coverage';
                this.statusBarItem.show();
            }
        } else {
            // Fallback (though in our refactor we enforce platformManager)
            this.statusBarItem.hide();
        }
    }

    public hide() {
        this.statusBarItem.hide();
    }
}
