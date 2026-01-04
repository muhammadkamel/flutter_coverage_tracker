/**
 * Handles rendering of suite coverage in the webview
 * Follows Single Responsibility Principle - only responsible for suite coverage rendering
 */
import { match, P } from 'ts-pattern';

export class SuiteCoverageWebviewRenderer {
    /**
     * Generate the HTML content for the suite coverage section
     */
    public static generateHtml(suites: any[], aggregate: any): string {
        if (!suites || suites.length === 0) {
            return '';
        }

        const suitesTableHtml = this.generateSuitesTable(suites);
        const summaryCards = this.generateSummaryCards(suites, aggregate);

        return `
            <div class="suite-coverage-section bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20 mt-6">
                <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <span class="text-xl">📊</span>
                    <span>Coverage by Test Suite</span>
                </h2>
                
                ${summaryCards}
                
                <div class="overflow-x-auto mt-4">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="border-b border-vscode-border/30">
                                <th class="py-3 px-4 font-semibold">Test Suite</th>
                                <th class="py-3 px-4 font-semibold text-center">Coverage</th>
                                <th class="py-3 px-4 font-semibold text-center">Lines</th>
                                <th class="py-3 px-4 font-semibold text-center">Files</th>
                                <th class="py-3 px-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-vscode-border/10">
                            ${suitesTableHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    private static generateSummaryCards(suites: any[], aggregate: any): string {
        const total = suites.length;
        const highCoverage = suites.filter(s => s.coveragePercent >= 90).length;
        const lowCoverage = suites.filter(s => s.coveragePercent < 70).length;
        const overallPercent = aggregate?.totalCoveragePercent?.toFixed(1) || '--';

        return `<div class="grid grid-cols-4 gap-4 mb-4">
            <div class="bg-vscode-bg/50 p-3 rounded-lg border border-vscode-border/20 text-center">
                <div class="text-2xl font-bold">${total}</div>
                <div class="text-xs opacity-60">Total Suites</div>
            </div>
            <div class="bg-vscode-bg/50 p-3 rounded-lg border border-vscode-border/20 text-center">
                <div class="text-2xl font-bold">${overallPercent}%</div>
                <div class="text-xs opacity-60">Overall Coverage</div>
            </div>
            <div class="bg-vscode-bg/50 p-3 rounded-lg border border-vscode-border/20 text-center">
                <div class="text-2xl font-bold text-green-400">${highCoverage}</div>
                <div class="text-xs opacity-60">High Coverage</div>
            </div>
            <div class="bg-vscode-bg/50 p-3 rounded-lg border border-vscode-border/20 text-center">
                <div class="text-2xl font-bold text-red-400">${lowCoverage}</div>
                <div class="text-xs opacity-60">Low Coverage</div>
            </div>
        </div>`;
    }

    private static generateSuitesTable(suites: any[]): string {
        const rows = suites
            .map(suite => {
                const coverageClass = match(suite.coveragePercent)
                    .when(
                        p => p >= 90,
                        () => 'high'
                    )
                    .when(
                        p => p >= 70,
                        () => 'medium'
                    )
                    .otherwise(() => 'low');
                const safeId = suite.suiteName.replace(/[^a-zA-Z0-9]/g, '-');

                const coveredFilesCount = suite.coveredFiles ? (suite.coveredFiles instanceof Map ? suite.coveredFiles.size : suite.coveredFiles.length) : 0;

                return `<tr>
                <td class="py-3 px-4">
                    <span class="font-medium cursor-pointer hover:text-blue-400" 
                          onclick="toggleSuiteDetails('suite-${safeId}')">
                        ${suite.suiteName}
                    </span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="suite-badge suite-${coverageClass}">
                        ${suite.coveragePercent.toFixed(1)}%
                    </span>
                </td>
                <td class="py-3 px-4 text-center">${suite.coveredLines} / ${suite.totalLines}</td>
                <td class="py-3 px-4 text-center">${coveredFilesCount}</td>
                <td class="py-3 px-4 text-center">
                    <button class="suite-btn" onclick="toggleSuiteDetails('suite-${safeId}')">
                        Details
                    </button>
                </td>
            </tr>
            <tr id="suite-${safeId}" class="suite-details" style="display: none;">
                <td colspan="5" class="py-2 px-6 bg-vscode-bg/50">
                    <div class="text-sm">
                        <strong>Files covered by ${suite.suiteName}:</strong>
                        <div class="mt-2 space-y-1">
                            ${this.generateFilesList(suite.coveredFiles || [])}
                        </div>
                    </div>
                </td>
            </tr>`;
            })
            .join('');

        return rows;
    }

    private static generateFilesList(files: any[] | Map<string, any>): string {
        const filesArray = files instanceof Map ? Array.from(files.values()) : files;

        if (filesArray.length === 0) {
            return '<div class="text-xs opacity-50">No files</div>';
        }

        return filesArray
            .map(f => {
                const coverageClass = match(f.coveragePercent)
                    .when(
                        p => p >= 90,
                        () => 'high'
                    )
                    .when(
                        p => p >= 70,
                        () => 'medium'
                    )
                    .otherwise(() => 'low');
                return `<div class="flex justify-between items-center p-2 bg-black/20 rounded">
                <span class="font-mono text-xs">${f.filePath}</span>
                <span class="text-xs suite-${coverageClass}">${f.coveragePercent.toFixed(1)}%</span>
            </div>`;
            })
            .join('');
    }

    public static getStyles(): string {
        return `<style>
            .suite-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 12px;
            }
            .suite-high { background: rgba(40, 167, 69, 0.2); color: #4ec9b0; }
            .suite-medium { background: rgba(206, 145, 36, 0.2); color: #dcdcaa; }
            .suite-low { background: rgba(244, 129, 132, 0.2); color: #f48771; }
            .suite-btn {
                padding: 4px 8px;
                font-size: 11px;
                border: 1px solid var(--vscode-button-border);
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border-radius: 3px;
                cursor: pointer;
            }
            .suite-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
        </style>`;
    }

    /**
     * Generate JavaScript for toggle functionality
     */
    public static getToggleScript(): string {
        return `
            window.toggleSuiteDetails = function(detailsId) {
                const row = document.getElementById(detailsId);
                if (row) {
                    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
                }
            };
        `;
    }
}
