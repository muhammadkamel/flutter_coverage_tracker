/**
 * Generator for Suite Coverage Dashboard HTML
 */
export class SuiteCoverageDashboardGenerator {
    /**
     * Generate suite coverage section HTML
     */
    public generateSuiteCoverageSection(suites: Map<string, any>, aggregate: any): string {
        const suitesArray = Array.from(suites.values());

        return `
<section id="suite-coverage" class="coverage-section">
    <div class="section-header">
        <h2>📊 Coverage by Test Suite</h2>
        <div class="suite-controls">
            <input 
                type="text" 
                id="suite-search" 
                placeholder="Search suites..." 
                class="suite-search"
            />
            <select id="suite-filter" class="suite-filter">
                <option value="all">All Suites</option>
                <option value="low">Low Coverage (&lt;70%)</option>
                <option value="medium">Medium Coverage (70-90%)</option>
                <option value="high">High Coverage (&gt;90%)</option>
            </select>
            <select id="suite-sort" class="suite-sort">
                <option value="coverage-desc">Coverage (High to Low)</option>
                <option value="coverage-asc">Coverage (Low to High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
            </select>
        </div>
    </div>

    <div class="suite-summary">
        <div class="summary-card">
            <div class="summary-label">Total Suites</div>
            <div class="summary-value">${suitesArray.length}</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">Overall Coverage</div>
            <div class="summary-value">${aggregate.totalCoveragePercent.toFixed(1)}%</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">High Coverage Suites</div>
            <div class="summary-value">${this.countSuitesByThreshold(suitesArray, 90, 100)}</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">Low Coverage Suites</div>
            <div class="summary-value">${this.countSuitesByThreshold(suitesArray, 0, 70)}</div>
        </div>
    </div>

    <div class="suite-table-container">
        <table class="suite-table" id="suite-table">
            <thead>
                <tr>
                    <th data-sort="name">Test Suite</th>
                    <th data-sort="coverage">Coverage</th>
                    <th data-sort="lines">Lines Covered</th>
                    <th data-sort="files">Files</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${this.generateSuiteRows(suitesArray)}
            </tbody>
        </table>
    </div>
</section>

<style>
.coverage-section {
    margin: 20px 0;
    padding: 20px;
    background: var(--vscode-editor-background);
    border-radius: 8px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-header h2 {
    margin: 0;
    font-size: 1.5em;
    color: var(--vscode-foreground);
}

.suite-controls {
    display: flex;
    gap: 10px;
}

.suite-search, .suite-filter, .suite-sort {
    padding: 6px 12px;
    border: 1px solid var(--vscode-input-border);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    font-size: 13px;
}

.suite-search {
    min-width: 200px;
}

.suite-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.summary-card {
    padding: 15px;
    background: var(--vscode-editorWidget-background);
    border-radius: 6px;
    border: 1px solid var(--vscode-widget-border);
}

.summary-label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
}

.summary-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--vscode-foreground);
}

.suite-table-container {
    overflow-x: auto;
}

.suite-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.suite-table th {
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-foreground);
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--vscode-widget-border);
    cursor: pointer;
    user-select: none;
}

.suite-table th:hover {
    background: var(--vscode-list-hoverBackground);
}

.suite-table th[data-sort]::after {
    content: ' ⇅';
    opacity: 0.4;
}

.suite-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-widget-border);
}

.suite-table tbody tr:hover {
    background: var(--vscode-list-hoverBackground);
}

.suite-name {
    font-weight: 500;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
}

.suite-name:hover {
    text-decoration: underline;
}

.coverage-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 12px;
}

.coverage-high {
    background: #28a74533;
    color: #4ec9b0;
}

.coverage-medium {
    background: #ce912433;
    color: #dcdcaa;
}

.coverage-low {
    background: #f4818433;
    color: #f48771;
}

.suite-actions {
    display: flex;
    gap: 8px;
}

.btn-small {
    padding: 4px 8px;
    font-size: 11px;
    border: 1px solid var(--vscode-button-border);
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border-radius: 3px;
    cursor: pointer;
}

.btn-small:hover {
    background: var(--vscode-button-secondaryHoverBackground);
}

.suite-details {
    background: var(--vscode-editorWidget-background);
    padding: 15px;
    margin-top: 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-widget-border);
    display: none;
}

.suite-details.visible {
    display: block;
}

.file-list {
    list-style: none;
    padding: 0;
    margin: 10px 0 0 0;
}

.file-item {
    padding: 6px 10px;
    margin: 4px 0;
    background: var(--vscode-editor-background);
    border-radius: 3px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.file-path {
    font-family: monospace;
    font-size: 12px;
}

.file-coverage {
    font-size: 11px;
    font-weight: 600;
}
</style>
`;
    }

    /**
     * Get the JavaScript for the suite coverage section
     */
    public static getSuiteCoverageScript(): string {
        return `
            (function () {
                // Initialize suite coverage interactive elements
                window.initSuiteCoverage = function () {
                    console.log('Initializing suite coverage...');

                    // Helper to get element safely
                    const get = (id) => document.getElementById(id);

                    // Add listeners if elements exist
                    const searchInput = get('suite-search');
                    if (searchInput) {
                        searchInput.addEventListener('input', filterSuites);
                    }

                    const filterSelect = get('suite-filter');
                    if (filterSelect) {
                        filterSelect.addEventListener('change', filterSuites);
                    }

                    const sortSelect = get('suite-sort');
                    if (sortSelect) {
                        sortSelect.addEventListener('change', (e) => sortSuites(e.target.value));
                    }

                    // Table header sorting
                    document.querySelectorAll('.suite-table th[data-sort]').forEach(th => {
                        th.addEventListener('click', function () {
                            const sortKey = this.dataset.sort;
                            const currentSort = get('suite-sort')?.value || 'coverage-desc';
                            const direction = currentSort.startsWith(sortKey) && currentSort.endsWith('-asc') ? 'desc' : 'asc';
                            if (sortSelect) sortSelect.value = sortKey + '-' + direction;
                            sortSuites(sortKey + '-' + direction);
                        });
                    });
                };

                function filterSuites() {
                    const searchInput = document.getElementById('suite-search');
                    const filterSelect = document.getElementById('suite-filter');

                    if (!searchInput || !filterSelect) return;

                    const searchTerm = searchInput.value.toLowerCase();
                    const filterValue = filterSelect.value;
                    const rows = document.querySelectorAll('.suite-table tbody tr[data-suite]'); // Select only suite rows

                    rows.forEach(row => {
                        const suiteNameEl = row.querySelector('.suite-name');
                        const badgeEl = row.querySelector('.coverage-badge');

                        // Also get the details row (next sibling)
                        const detailsRow = row.nextElementSibling;

                        if (suiteNameEl && badgeEl) {
                            const suiteName = suiteNameEl.textContent.trim().toLowerCase();
                            const coverage = parseFloat(badgeEl.textContent.replace('%', ''));

                            let matchesSearch = suiteName.includes(searchTerm);
                            let matchesFilter = true;

                            if (filterValue === 'low') {
                                matchesFilter = coverage < 70;
                            } else if (filterValue === 'medium') {
                                matchesFilter = coverage >= 70 && coverage < 90;
                            } else if (filterValue === 'high') {
                                matchesFilter = coverage >= 90;
                            }

                            const display = matchesSearch && matchesFilter ? '' : 'none';
                            row.style.display = display;

                            // Hide details row if parent is hidden, but keep its state if visible
                            if (display === 'none' && detailsRow) {
                                detailsRow.style.display = 'none';
                            } else if (display === '' && detailsRow && detailsRow.querySelector('.suite-details.visible')) {
                                // If row is visible and details were expanded, ensure details row is visible
                                // detailsRow.style.display = ''; // Table row display is usually table-row
                            }
                        }
                    });
                }

                function sortSuites(sortValue) {
                    const [key, direction] = sortValue.split('-');
                    const tbody = document.querySelector('.suite-table tbody');
                    if (!tbody) return;

                    // We need to move pairs of rows (suite row + details row)
                    const rows = Array.from(tbody.querySelectorAll('tr[data-suite]'));

                    rows.sort((a, b) => {
                        let aValue, bValue;

                        switch (key) {
                            case 'name':
                                aValue = a.querySelector('.suite-name').textContent.trim();
                                bValue = b.querySelector('.suite-name').textContent.trim();
                                break;
                            case 'coverage':
                                aValue = parseFloat(a.querySelector('.coverage-badge').textContent.replace('%', ''));
                                bValue = parseFloat(b.querySelector('.coverage-badge').textContent.replace('%', ''));
                                break;
                            case 'lines':
                                aValue = parseInt(a.cells[2].textContent.split('/')[0]);
                                bValue = parseInt(b.cells[2].textContent.split('/')[0]);
                                break;
                            case 'files':
                                aValue = parseInt(a.cells[3].textContent);
                                bValue = parseInt(b.cells[3].textContent);
                                break;
                        }

                        if (direction === 'asc') {
                            return aValue > bValue ? 1 : -1;
                        } else {
                            return aValue < bValue ? 1 : -1;
                        }
                    });

                    // Re-append rows in new order
                    rows.forEach(row => {
                        const detailsRow = row.nextElementSibling;
                        tbody.appendChild(row);
                        if (detailsRow) tbody.appendChild(detailsRow);
                    });
                }

                // Suite detail toggle
                window.toggleSuiteDetails = function (suiteName) {
                    // Sanitize suiteName for ID
                    const safeName = suiteName.replace(/[^a-zA-Z0-9]/g, '-');
                    const detailsId = 'details-' + safeName;
                    const details = document.getElementById(detailsId);
                    if (details) {
                        details.classList.toggle('visible');
                    }
                };

                // View suite files
                window.viewSuiteFiles = function (suiteName) {
                    // Use the global vscode api object
                    if (window.vscode) {
                        window.vscode.postMessage({
                            type: 'viewSuiteFiles',
                            suiteName: suiteName
                        });
                    }
                };
            })();
        `;
    }

    /**
     * Generate table rows for each suite
     */
    private generateSuiteRows(suites: any[]): string {
        return suites
            .map(suite => {
                const coverageClass = this.getCoverageClass(suite.coveragePercent);
                const detailsId = 'details-' + suite.suiteName.replace(/[^a-zA-Z0-9]/g, '-');

                return `
<tr data-suite="${suite.suiteName}">
    <td>
        <span class="suite-name" onclick="toggleSuiteDetails('${suite.suiteName}')">
            ${suite.suiteName}
        </span>
    </td>
    <td>
        <span class="coverage-badge coverage-${coverageClass}">
            ${suite.coveragePercent.toFixed(1)}%
        </span>
    </td>
    <td>${suite.coveredLines} / ${suite.totalLines}</td>
    <td>${suite.coveredFiles.size}</td>
    <td class="suite-actions">
        <button class="btn-small" onclick="toggleSuiteDetails('${suite.suiteName}')">
            Details
        </button>
        <button class="btn-small" onclick="viewSuiteFiles('${suite.suiteName}')">
            View Files
        </button>
    </td>
</tr>
<tr>
    <td colspan="5" style="padding: 0;">
        <div id="${detailsId}" class="suite-details">
            <h4>Files covered by ${suite.suiteName}</h4>
            <ul class="file-list">
                ${this.generateFileList(suite.coveredFiles)}
            </ul>
        </div>
    </td>
</tr>
`;
            })
            .join('');
    }

    /**
     * Generate file list HTML
     */
    private generateFileList(coveredFiles: Map<string, any>): string {
        const files = Array.from(coveredFiles.entries());

        if (files.length === 0) {
            return '<li class="file-item">No files covered</li>';
        }

        return files
            .map(([filePath, coverage]) => {
                const coverageClass = this.getCoverageClass(coverage.coveragePercent);
                return `
<li class="file-item">
    <span class="file-path">${filePath}</span>
    <span class="file-coverage coverage-${coverageClass}">
        ${coverage.coveragePercent.toFixed(1)}%
    </span>
</li>
`;
            })
            .join('');
    }

    /**
     * Get coverage class based on percentage
     */
    private getCoverageClass(percent: number): string {
        if (percent >= 90) {
            return 'high';
        }
        if (percent >= 70) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Count suites within threshold range
     */
    private countSuitesByThreshold(suites: any[], min: number, max: number): number {
        return suites.filter(s => s.coveragePercent >= min && s.coveragePercent < max).length;
    }
}
