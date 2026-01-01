import * as vscode from 'vscode';
import * as path from 'path';
import { PlatformCoverageManager } from '../platform-coverage/PlatformCoverageManager';
import { GitService } from '../git/GitService';
import { FileCoverageData } from '../../shared/coverage/Coverage';

export interface DiffCoverageResult {
    file: string;
    linesChanged: number;
    linesCovered: number;
    percentage: number;
    uncoveredChangedLines: number[];
}

export class DiffCoverageManager {
    private gitService: GitService;

    constructor(private platformManager: PlatformCoverageManager) {
        this.gitService = new GitService();
    }

    public async getDiffCoverageForFile(filePath: string): Promise<DiffCoverageResult | null> {
        const coverage = this.platformManager.getCoverageForFile(filePath);
        if (!coverage) {
            return null;
        }

        const changedLines = await this.gitService.getChangedLines(filePath);
        if (changedLines.length === 0) {
            return {
                file: coverage.file,
                linesChanged: 0,
                linesCovered: 0,
                percentage: 100, // No changes, so technically fully valid? Or N/A.
                uncoveredChangedLines: []
            };
        }

        const coveredChangedLines = changedLines.filter(line => !coverage.uncoveredLines.includes(line));
        const uncoveredChangedLines = changedLines.filter(line => coverage.uncoveredLines.includes(line));

        const percentage = Math.round((coveredChangedLines.length / changedLines.length) * 100);

        return {
            file: coverage.file,
            linesChanged: changedLines.length,
            linesCovered: coveredChangedLines.length,
            percentage,
            uncoveredChangedLines
        };
    }

    public async showDiffCoverage(uri: vscode.Uri) {
        if (!uri) {
            return;
        }
        const result = await this.getDiffCoverageForFile(uri.fsPath);
        if (result) {
            vscode.window
                .showInformationMessage(
                    `Diff Coverage for ${path.basename(result.file)}: ${result.percentage}% (${result.linesCovered}/${result.linesChanged} lines)`,
                    'Details'
                )
                .then(s => {
                    if (s === 'Details') {
                        vscode.workspace.openTextDocument(result.file).then(doc => vscode.window.showTextDocument(doc));
                    }
                });
        } else {
            vscode.window.showErrorMessage('No coverage data found for this file.');
        }
    }
}
