import * as vscode from 'vscode';

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
        .scrollbox::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
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

    <script>
        const vscode = acquireVsCodeApi();
        const outputDiv = document.getElementById('output');
        const fileListBody = document.getElementById('file-list-body');
        const statusBadge = document.getElementById('status-badge');
        const rerunBtn = document.getElementById('rerun-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        // Counters
        const totalTestsEl = document.getElementById('total-tests');
        const passedCountEl = document.getElementById('passed-count');
        const failedCountEl = document.getElementById('failed-count');
        const overallCoverageEl = document.getElementById('overall-coverage');

        let tests = [];

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
                        name: f, 
                        status: 'pending', 
                        coverage: null 
                    }));
                    updateUI();
                    break;

                case 'finished':
                    rerunBtn.classList.remove('hidden');
                    cancelBtn.classList.add('hidden');
                    
                    if (message.success) {
                        statusBadge.textContent = 'Completed';
                        statusBadge.className = 'gradient-success px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white shadow-lg';
                    } else {
                        statusBadge.textContent = 'Completed with Errors';
                        statusBadge.className = 'gradient-error px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white shadow-lg';
                    }

                    if (message.results) {
                        // message.results is an array of { file, success, coverage }
                        tests = message.results;
                        updateUI();
                    }
                    break;
            }
        });

        rerunBtn.onclick = () => {
             outputDiv.innerHTML = '';
             statusBadge.textContent = 'Running';
             statusBadge.className = 'gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg';
             rerunBtn.classList.add('hidden');
             cancelBtn.classList.remove('hidden');
             vscode.postMessage({ type: 'rerun' });
        };

        cancelBtn.onclick = () => {
             vscode.postMessage({ type: 'cancel' });
             statusBadge.textContent = 'Cancelling...';
        };

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
            tests.forEach(test => {
                const row = document.createElement('tr');
                row.className = 'group hover:bg-vscode-bg/50 transition-colors';
                
                const statusClass = test.status === 'pending' ? 'bg-vscode-border text-vscode-fg/50' : 
                                  test.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
                
                const statusLabel = test.status === 'pending' ? 'Waiting' : 
                                   test.success ? 'Passed' : 'Failed';

                row.innerHTML = \`
                    <td class="py-4 font-medium text-sm truncate max-w-xs" title="\${test.name}">
                        \${test.name}
                    </td>
                    <td class="py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider \${statusClass}">
                            \${statusLabel}
                        </span>
                    </td>
                    <td class="py-4 text-right font-mono text-sm">
                        \${test.coverage ? \`\${test.coverage.percentage}%\` : '--'}
                    </td>
                \`;
                fileListBody.appendChild(row);
            });
        }
    </script>
</body>
</html>`;
    }
}
