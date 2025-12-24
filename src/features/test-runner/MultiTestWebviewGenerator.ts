import * as vscode from 'vscode';
import { WebviewComponents } from './WebviewComponents';

export class MultiTestWebviewGenerator {
    public static getWebviewContent(folderName: string, styleSrc: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flutter Multi-Test Dashboard</title>
    <link href="${styleSrc}" rel="stylesheet">
    <style>
        .hover-lift { transition: transform 0.2s; }
        .hover-lift:hover { transform: translateY(-4px); }
        .clickable { cursor: pointer; transition: transform 0.1s; }
        .clickable:active { transform: scale(0.98); }
        
        .gradient-primary { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); }
        .gradient-success { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); }
        .gradient-error { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); }
        
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .animate-shimmer {
            background: linear-gradient(90deg, 
                rgba(255,255,255,0) 0%, 
                rgba(255,255,255,0.4) 50%, 
                rgba(255,255,255,0) 100%);
            background-size: 200% 100%;
            animation: shimmer 2s infinite linear;
        }


        .scrollbox::-webkit-scrollbar { width: 6px; }
        .scrollbox::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .folder-row { cursor: pointer; user-select: none; }
        .folder-icon { transition: transform 0.2s; display: inline-block; }
        .folder-expanded .folder-icon { transform: rotate(90deg); }
        ${WebviewComponents.getScrollToTopStyles()}
    </style>
</head>
<body class="bg-vscode-editor-bg text-vscode-fg p-6 font-sans antialiased selection:bg-indigo-500/30">
    <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
            <div class="flex-1 min-w-0">
                <h1 class="text-3xl font-extrabold tracking-tight flex items-start gap-3">
                    <span class="text-3xl flex-shrink-0">📂</span>
                    <span class="line-clamp-2 break-words overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${folderName}</span>
                </h1>
                <p class="text-sm opacity-60 mt-1">Folder Dashboard • Multiple Test Explorer</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button id="rerun-btn" class="hidden px-4 py-2 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span>Re-run All</span>
                </button>
                <button id="export-btn" class="hidden px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    <span>Export MD</span>
                </button>
                <button id="cancel-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Cancel</span>
                </button>
                <span id="status-badge" class="gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg">
                    Running
                </span>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-vscode-bg rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift">
                <div class="text-3xl font-bold mb-1" id="total-tests">--</div>
                <div class="text-xs uppercase opacity-60 tracking-widest">Total Files</div>
            </div>
            <div class="bg-vscode-bg rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift">
                <div class="text-3xl font-bold mb-1 text-green-400" id="passed-count">0</div>
                <div class="text-xs uppercase opacity-60 tracking-widest">Passed</div>
            </div>
            <div class="bg-vscode-bg rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift">
                <div class="text-3xl font-bold mb-1 text-red-400" id="failed-count">0</div>
                <div class="text-xs uppercase opacity-60 tracking-widest">Failed</div>
            </div>
            <div class="bg-vscode-bg rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift">
                <div class="text-3xl font-bold mb-1" id="overall-coverage">--%</div>
                <div class="text-xs uppercase opacity-60 tracking-widest">Avg Coverage</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- File List -->
            <div class="lg:col-span-2 bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-lg font-bold flex items-center gap-2">
                        <span class="text-xl">📄</span>
                        <span>Tested Files</span>
                    </h2>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-xs uppercase opacity-50 border-b border-vscode-border/30">
                                <th class="pb-3 font-semibold">File Name</th>
                                <th class="pb-3 font-semibold text-center">Status</th>
                                <th class="pb-3 font-semibold text-right">Coverage</th>
                                <th class="pb-3 font-semibold text-center">Uncovered</th>
                            </tr>
                        </thead>
                        <tbody id="file-list-body" class="divide-y divide-vscode-border/10">
                            <!-- Skeleton Rows -->
                            <tr class="animate-pulse">
                                <td class="py-4"><div class="h-4 bg-vscode-border/30 rounded w-48"></div></td>
                                <td class="py-4"><div class="h-8 bg-vscode-border/30 rounded-full w-24 mx-auto"></div></td>
                                <td class="py-4"><div class="h-4 bg-vscode-border/30 rounded w-16 ml-auto"></div></td>
                            </tr>
                            <tr class="animate-pulse">
                                <td class="py-4"><div class="h-4 bg-vscode-border/30 rounded w-40"></div></td>
                                <td class="py-4"><div class="h-8 bg-vscode-border/30 rounded-full w-24 mx-auto"></div></td>
                                <td class="py-4"><div class="h-4 bg-vscode-border/30 rounded w-16 ml-auto"></div></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Console Card -->
            <div class="bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20 flex flex-col max-h-[600px]">
                <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <span class="text-xl">📝</span>
                    <span>Console Output</span>
                </h2>
                <div id="output" class="flex-1 bg-black/60 border border-vscode-border/50 p-4 rounded-xl overflow-y-auto font-mono text-xs text-gray-400 leading-relaxed scrollbox"></div>
            </div>
        </div>
    </div>

${WebviewComponents.getScrollToTopButton()}

    <script>
        const vscode = acquireVsCodeApi();
        const outputDiv = document.getElementById('output');
        const fileListBody = document.getElementById('file-list-body');
        const statusBadge = document.getElementById('status-badge');
        const rerunBtn = document.getElementById('rerun-btn');
        const exportBtn = document.getElementById('export-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        // Counters
        const totalTestsEl = document.getElementById('total-tests');
        const passedCountEl = document.getElementById('passed-count');
        const failedCountEl = document.getElementById('failed-count');
        const overallCoverageEl = document.getElementById('overall-coverage');

        let tests = [];
        let expandedFolders = new Set(); // Stores paths of expanded folders

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'log':
                    const logItem = document.createElement('div');
                    logItem.textContent = message.value;
                    logItem.className = 'whitespace-pre-wrap mb-1';
                    outputDiv.appendChild(logItem);
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                    break;
                
                case 'init-dashboard':
                    tests = message.files.map(f => ({ 
                        name: f.name, // relative path
                        path: f.path,
                        status: 'pending', 
                        coverage: null 
                    }));
                    // Expand all by default initially? Or root?
                    // Let's expand root folders by default
                    // Actually, let's just updateUI which will handle defaults
                    updateUI();
                    break;

                case 'finished':
                    rerunBtn.classList.remove('hidden');
                    exportBtn.classList.remove('hidden');
                    cancelBtn.classList.add('hidden');
                    
                    if (message.success) {
                        statusBadge.textContent = 'Completed';
                        statusBadge.className = 'gradient-success px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white shadow-lg';
                    } else {
                        statusBadge.textContent = 'Completed with Errors';
                        statusBadge.className = 'gradient-error px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white shadow-lg';
                    }

                    if (message.results) {
                        tests = message.results;
                        updateUI();
                    }
                    else {
                        // If no results sent but just success status (error/cancel), we still update counters potentially?
                        // Usually results are sent on completion.
                    }
                    break;
            }
        });

        rerunBtn.onclick = () => {
             outputDiv.innerHTML = '';
             statusBadge.textContent = 'Running';
             statusBadge.className = 'gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg';
             rerunBtn.classList.add('hidden');
             exportBtn.classList.add('hidden');
             cancelBtn.classList.remove('hidden');
             vscode.postMessage({ type: 'rerun' });
        };
        
        exportBtn.onclick = () => {
             vscode.postMessage({ type: 'export' });
        };

        cancelBtn.onclick = () => {
             vscode.postMessage({ type: 'cancel' });
             statusBadge.textContent = 'Cancelling...';
        };

        function toggleUncovered(testId) {
            const row = document.getElementById(\`uncovered-\${testId}\`);
            if (row) {
                row.classList.toggle('hidden');
            }
        }
        
        function navigateToLine(sourceFile, line) {
            vscode.postMessage({
                type: 'navigateToLine',
                file: sourceFile,
                line: line
            });
        }
        
        function navigateToTestFile(testPath) {
            vscode.postMessage({
                type: 'navigateToTestFile',
                filePath: testPath
            });
        }
        
        function copyLines(testId, lines) {
            navigator.clipboard.writeText(lines.join(', '));
            const btn = event.target.closest('button');
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Copied!';
            setTimeout(() => {
                btn.querySelector('span').textContent = originalText;
            }, 2000);
        }

        function toggleFolder(folderPath) {
            if (expandedFolders.has(folderPath)) {
                expandedFolders.delete(folderPath);
            } else {
                expandedFolders.add(folderPath);
            }
            updateUI();
        }
        
        // Tree Builder
        function buildTree(tests) {
            const root = { name: '', path: '', children: {}, tests: [] };
            
            tests.forEach(test => {
                // Split path into parts (assuming name is relative path, e.g. "features/login/login_test.dart")
                // Use forward slash, assuming normalized
                const parts = test.name.split('/');
                const fileName = parts.pop();
                
                let current = root;
                let currentPath = '';

                parts.forEach(part => {
                    currentPath = currentPath ? currentPath + '/' + part : part;
                    if (!current.children[part]) {
                        current.children[part] = { 
                            name: part, 
                            path: currentPath, 
                            children: {}, 
                            tests: [],
                            stats: { total: 0, passed: 0, failed: 0 } // Aggregate stats
                        };
                    }
                    current = current.children[part];
                });
                
                current.tests.push({ ...test, label: fileName });
            });

            // Calculate stats recursively
            function calcStats(node) {
                let total = node.tests.length;
                let passed = node.tests.filter(t => t.success).length;
                let failed = node.tests.filter(t => t.success === false).length;

                Object.values(node.children).forEach(child => {
                    const childStats = calcStats(child);
                    total += childStats.total;
                    passed += childStats.passed;
                    failed += childStats.failed;
                });

                node.stats = { total, passed, failed };
                return node.stats;
            }

            calcStats(root);
            return root;
        }

        function renderTree(node, level = 0) {
            let html = '';
            
            // Sort folders then files
            const folders = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
            const files = node.tests.sort((a, b) => a.label.localeCompare(b.label));

            // Render Folders
            folders.forEach(folder => {
                const isExpanded = expandedFolders.has(folder.path);
                
                // For root-like folders (level 0), maybe start expanded if not set? 
                // Currently user must click. 
                // Let's default expand top level if we want. But for now set empty = collapsed initially.

                const indent = level * 1.5; // rem
                const icon = isExpanded ? '📂' : '📁';
                const arrow = isExpanded ? '▼' : '▶'; // visual indicator

                const statusColor = folder.stats.failed > 0 ? 'text-red-400' : (folder.stats.passed === folder.stats.total && folder.stats.total > 0 ? 'text-green-400' : 'text-vscode-fg');

                html += \`
                    <tr class="folder-row hover:bg-vscode-bg/50 transition-colors \${isExpanded ? 'folder-expanded' : ''}" onclick="toggleFolder('\${folder.path}')">
                        <td class="py-3 font-semibold text-sm flex items-center gap-2" style="padding-left: \${indent + 1}rem">
                            <span class="text-xs opacity-70 w-4 inline-block">\${arrow}</span>
                            <span class="text-xl">\${icon}</span>
                            <span>\${folder.name}</span>
                            <span class="text-xs opacity-50 ml-2">(\${folder.stats.total})</span>
                        </td>
                        <td class="py-3 text-center">
                            \${folder.stats.failed > 0 ? '<span class="w-2 h-2 rounded-full bg-red-500 inline-block" title="Has failing tests"></span>' : 
                              folder.stats.passed === folder.stats.total && folder.stats.total > 0 ? '<span class="w-2 h-2 rounded-full bg-green-500 inline-block" title="All passed"></span>' : ''}
                        </td>
                        <td colspan="2"></td>
                    </tr>
                \`;

                if (isExpanded) {
                    html += renderTree(folder, level + 1);
                }
            });

            // Render Files
            files.forEach(test => {
                const indent = level * 1.5;
                const statusClass = test.status === 'pending' ? 'bg-vscode-border text-vscode-fg/50' : 
                                  test.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
                
                const statusLabel = test.status === 'pending' ? 'Waiting' : 
                                   test.success ? 'Passed' : 'Failed';

                const uncoveredLines = test.coverage?.uncoveredLines || [];
                const hasUncovered = uncoveredLines.length > 0;
                const testId = test.name.replace(/[^a-zA-Z0-9]/g, '-');

                // File row
                html += \`
                    <tr class="group hover:bg-vscode-bg/50 transition-colors">
                        <td class="py-3 font-medium text-sm truncate max-w-xs" style="padding-left: \${indent + 2.5}rem" title="\${test.name}">
                            <span class="cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2" onclick="navigateToTestFile('\${test.path}')">
                                <span class="opacity-70">📄</span> 
                                \${test.label}
                            </span>
                        </td>
                        <td class="py-3 text-center">
                            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider \${statusClass}">
                                \${statusLabel}
                            </span>
                        </td>
                        <td class="py-3 text-right font-mono text-sm">
                            \${test.coverage ? \`\${test.coverage.percentage}%\` : '--'}
                        </td>
                        <td class="py-3 text-center">
                            \${hasUncovered ? \`<button class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold hover:bg-red-500/40 transition-colors" onclick="toggleUncovered('\${testId}')">\${uncoveredLines.length} lines</button>\` : '<span class="text-xs opacity-40">None</span>'}
                        </td>
                    </tr>
                \`;

                // Sub-row for Uncovered Lines (not indented deeper, just spans)
                // Actually should align with file.
                if (hasUncovered && test.sourceFile) {
                    const linesHtml = uncoveredLines.map(line => 
                        \`<div class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-mono border border-red-500/30 cursor-pointer hover:bg-red-500/40 transition-colors clickable" onclick="navigateToLine('\${test.sourceFile}', \${line})">\${line}</div>\`
                    ).join('');
                    
                    html += \`
                        <tr id="uncovered-\${testId}" class="hidden bg-black/10">
                            <td colspan="4" class="py-2 px-4 shadow-inner" style="padding-left: \${indent + 3}rem">
                                <div class="flex items-start gap-3">
                                    <div class="flex-1">
                                        <div class="text-xs font-semibold mb-2 opacity-70">🎯 Uncovered Lines (\${uncoveredLines.length}):</div>
                                        <div class="flex flex-wrap gap-2">
                                            \${linesHtml}
                                        </div>
                                    </div>
                                    <button class="px-3 py-1 bg-vscode-button hover:bg-vscode-button-hover text-white rounded text-xs font-semibold transition-all flex items-center gap-1 flex-shrink-0" onclick="copyLines('\${testId}', [\${uncoveredLines.join(',')}])" title="Copy uncovered lines">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    \`;
                }
            });

            return html;
        }
        
        function updateUI() {
            totalTestsEl.textContent = tests.length;
            const passed = tests.filter(t => t.success).length;
            const failed = tests.filter(t => t.success === false).length;
            passedCountEl.textContent = passed;
            failedCountEl.textContent = failed;

            const coverages = tests.filter(t => t.coverage !== null).map(t => t.coverage.percentage);
            const avg = coverages.length > 0 ? (coverages.reduce((a,b) => a+b, 0) / coverages.length).toFixed(1) : '--';
            overallCoverageEl.textContent = avg + '%';

            fileListBody.innerHTML = '';
            
            // Build and Render Tree
            const tree = buildTree(tests);
            
            // If tree has only one root folder or empty root, handle it.
            // Our buildTree returns a root node. its children are top level folders.
            // We want to verify if we should auto-expand the top level if it's just 'test/features/...'?
            // For now, simple user interaction is safer.
            // Also, update: defaults.
            // If expandedFolders is empty and it's first load, maybe expand root?
            // Actually let's auto-expand all by default for better visibility, user can collapse.
            // But we can't easily detect "first load" inside updateUI without a flag.
            // Let's rely on user expanding for now, or expand root keys initially in init-dashboard.

            const html = renderTree(tree);
            fileListBody.innerHTML = html;
        }
        
        // Scroll to Top Functionality
        const scrollToTopBtn = document.getElementById('scroll-to-top');
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    </script>
</body>
</html>`;
    }
}
