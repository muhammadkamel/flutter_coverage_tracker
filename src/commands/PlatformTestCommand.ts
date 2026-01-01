import * as vscode from 'vscode';
import { Command } from './Command';
import { PlatformCoverageManager, Platform } from '../features/platform-coverage/PlatformCoverageManager';
import { CoverageStatusManager } from '../features/status-bar/CoverageStatusManager';

export class PlatformTestCommand implements Command {
    constructor(
        private platform: Platform,
        private platformManager: PlatformCoverageManager,
        private statusManager: CoverageStatusManager
    ) {}

    async execute(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        let command = 'flutter test --coverage';
        let outputDir = this.platformManager.getCoveragePath(this.platform);

        // Add platform-specific flags
        switch (this.platform) {
            case Platform.Android:
                command += ' --platform android';
                outputDir = 'coverage/android';
                break;
            case Platform.iOS:
                command += ' --platform ios';
                outputDir = 'coverage/ios';
                break;
            case Platform.Web:
                command += ' --platform chrome';
                outputDir = 'coverage/web';
                break;
            case Platform.Desktop:
                // Desktop uses current platform by default
                outputDir = 'coverage/desktop';
                break;
        }

        vscode.window.showInformationMessage(
            `Running ${this.platformManager.getPlatformLabel(this.platform)} tests...`
        );

        const terminal = vscode.window.createTerminal('Flutter Tests');
        terminal.sendText(`cd "${workspaceRoot}"`);
        terminal.sendText(command);
        terminal.show();

        // Update platform manager after tests complete (wait a bit for file to be generated)
        setTimeout(async () => {
            this.platformManager.setPlatform(this.platform);
            await this.statusManager.updateCoverage();
        }, 3000);
    }
}
