import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Command } from './Command';
import { LcovParser } from '../shared/coverage/LcovParser';

export class ShowDetailsCommand implements Command {
    async execute(): Promise<void> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const filePath = path.join(workspaceFolders[0].uri.fsPath, relativePath);

        if (fs.existsSync(filePath)) {
            try {
                const data = await LcovParser.parse(filePath);
                const result = await vscode.window.showInformationMessage(
                    `Coverage: ${data.overall.percentage}% (Hit: ${data.overall.linesHit} / ${data.overall.linesFound})`,
                    'Open Report'
                );

                if (result === 'Open Report') {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);
                }
            } catch (e) {
                vscode.window.showErrorMessage('Failed to read coverage details.');
            }
        } else {
            vscode.window.showWarningMessage('No coverage file found.');
        }
    }
}
