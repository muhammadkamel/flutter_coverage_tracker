import * as vscode from 'vscode';
import * as path from 'path';
import { PlatformCoverageManager } from '../platform-coverage/PlatformCoverageManager';

/**
 * Provides Code Lenses for Dart files:
 * 1. "Coverage: X%" above classes/methods in source files.
 * 2. "Run Test (Coverage)" above test groups in test files.
 */
export class CoverageCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    constructor(private platformManager: PlatformCoverageManager) {
        // Refresh when coverage changes
        this.platformManager.onPlatformChange(() => this.refresh());

        // Listen to config changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flutterCoverage.enableCodeLens')) {
                this.refresh();
            }
        });
    }

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        if (!config.get<boolean>('enableCodeLens', true)) {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        const isTestFile = document.fileName.endsWith('_test.dart');

        if (isTestFile) {
            this.provideTestLenses(document, lenses);
        } else {
            this.provideCoverageLenses(document, lenses);
        }

        return lenses;
    }

    private provideCoverageLenses(document: vscode.TextDocument, lenses: vscode.CodeLens[]) {
        const coverage = this.platformManager.getCoverageForFile(document.fileName);
        if (!coverage) {
            return; // No coverage data
        }

        const text = document.getText();

        // Regex to find all top-level class, mixin, enum
        const classRegex = /^(?:abstract\s+)?(?:class|mixin|enum)\s+(\w+)/gm;

        let match;
        while ((match = classRegex.exec(text)) !== null) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);

            // For now, we show file-level coverage because mapping class-level ranges
            // from LCOV requires complex AST parsing.
            // Future improvement: Calculate class-specific coverage if possible.

            const percentage = coverage.percentage;
            const uncoveredCount = coverage.uncoveredLines.length;

            const title = `Coverage: ${percentage}% (${uncoveredCount} uncovered)`;
            const tooltip = 'Open Coverage Details';

            const lens = new vscode.CodeLens(range, {
                title: title,
                tooltip: tooltip,
                command: 'flutter-coverage-tracker.showDetails',
                arguments: [document.uri]
            });

            lenses.push(lens);
        }
    }

    private provideTestLenses(document: vscode.TextDocument, lenses: vscode.CodeLens[]) {
        const text = document.getText();

        // Simple regex to find main() and group()
        // We only add "Run File with Coverage" at the top main() for now
        const mainRegex = /void\s+main\s*\(\)\s*\{/g;

        let match;
        // Find the first main()
        if ((match = mainRegex.exec(text)) !== null) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);

            lenses.push(
                new vscode.CodeLens(range, {
                    title: '$(beaker) Run with Coverage',
                    tooltip: 'Run this test file and track coverage',
                    command: 'flutter-coverage-tracker.runRelatedTest',
                    arguments: [document.uri]
                })
            );
        }
    }
}
