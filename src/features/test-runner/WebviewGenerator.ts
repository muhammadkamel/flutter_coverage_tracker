import * as vscode from 'vscode';
import { WebviewComponents } from './WebviewComponents';

export class WebviewGenerator {
    public static getWebviewContent(testFileName: string, styleSrc: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flutter Test Runner</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${styleSrc.scheme}: 'unsafe-inline'; script-src 'unsafe-inline';">
    <link href="${styleSrc}" rel="stylesheet">
    <style>
        /* Interactive Elements */
        .hover-lift { 
            transition: transform 0.2s; 
        }
        .hover-lift:hover { 
            transform: translateY(-4px); 
        }
        .clickable { 
            cursor: pointer; 
            transition: transform 0.1s; 
        }
        .clickable:active { 
            transform: scale(0.95); 
        }
        
        /* Gradients */
        .gradient-primary { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); }
        .gradient-success { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); }
        .gradient-error { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); }
        
        /* Animations */
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

        /* Tab Styles */
        .tabs {
            display: flex;
            gap: 2rem;
            border-bottom: 1px solid var(--vscode-widget-border);
            margin-bottom: 2rem;
            padding-bottom: 2px;
        }
        
        .tab-btn {
            padding: 0.5rem 0;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            opacity: 0.6;
            transition: all 0.2s;
            font-weight: 600;
            font-size: 0.95rem;
            color: var(--vscode-foreground);
            position: relative;
        }
        
        .tab-btn:hover {
            opacity: 1;
            color: var(--vscode-textLink-activeForeground);
        }
        
        .tab-btn.active {
            opacity: 1;
            border-bottom-color: var(--vscode-textLink-activeForeground);
            color: var(--vscode-textLink-activeForeground);
        }
        
        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease-out;
        }
        
        .tab-content.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .scrollbox::-webkit-scrollbar { width: 6px; }
        .scrollbox::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        
        ${WebviewComponents.getScrollToTopStyles()}
    </style>
</head>
<body class="bg-vscode-editor-bg text-vscode-fg p-6 font-sans antialiased selection:bg-indigo-500/30">
    <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
            <div class="flex-1 min-w-0">
                <h1 class="text-3xl font-extrabold tracking-tight flex items-start gap-3">
                    <span class="text-3xl flex-shrink-0">🚀</span>
                    <span class="line-clamp-2 break-words overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${testFileName}</span>
                </h1>
                <p class="text-sm opacity-60 mt-1">Single File Test Runner</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button id="cancel-btn" class="hidden px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Cancel test">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Cancel</span>
                </button>
                <button id="rerun-btn" class="hidden px-4 py-2 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Re-run test">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span>Re-run</span>
                </button>
                <button id="watch-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Toggle Watch Mode">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <span>Watch</span>
                </button>
                <span id="status-badge" class="gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg">
                    Running
                </span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div id="progress-container" class="w-full h-1 bg-vscode-border mb-6 rounded overflow-hidden">
            <div id="progress-bar" class="w-full h-full gradient-primary animate-shimmer" style="background-size: 200% 100%;"></div>
        </div>

        <!-- Tabs Navigation -->
        <nav class="tabs">
            <div class="tab-btn active" data-tab="overview" onclick="switchTab('overview')">Overview</div>
            <div class="tab-btn" data-tab="console" onclick="switchTab('console')">Console Output</div>
        </nav>

        <!-- Tab: Overview -->
        <div id="tab-overview" class="tab-content active space-y-6">
            
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift border-t-4 border-t-purple-500" style="background: var(--vscode-editorWidget-background)">
                    <div class="text-3xl font-bold mb-1" id="coverage-percent--card">--%</div>
                    <div class="text-xs uppercase opacity-60 tracking-widest">Coverage</div>
                </div>
                <div class="rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift border-t-4 border-t-blue-500" style="background: var(--vscode-editorWidget-background)">
                    <div class="text-3xl font-bold mb-1"><span id="lines-hit--card">--</span> / <span id="lines-total--card">--</span></div>
                    <div class="text-xs uppercase opacity-60 tracking-widest">Lines Hit</div>
                </div>
                <div class="rounded-2xl p-6 shadow-xl border border-vscode-border/20 text-center hover-lift border-t-4 border-t-red-500" style="background: var(--vscode-editorWidget-background)">
                    <div class="text-3xl font-bold mb-1 text-red-500" id="uncovered-count--card">--</div>
                    <div class="text-xs uppercase opacity-60 tracking-widest">Uncovered Lines</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Visual Coverage Section -->
                <div class="bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20">
                    <h2 class="text-lg font-bold text-vscode-fg mb-5 flex items-center gap-2">
                        <span class="text-xl">📊</span>
                        <span>Coverage Visual</span>
                    </h2>

                    <!-- Skeleton Loader for Coverage -->
                    <div id="coverage-skeleton" class="animate-pulse space-y-4">
                        <div class="w-32 h-32 mx-auto bg-vscode-border/50 rounded-full"></div>
                    </div>

                    <div id="coverage-container" class="hidden">
                        <!-- Circular Progress -->
                        <div class="w-32 h-32 mx-auto mb-2 relative">
                            <svg class="transform -rotate-90" width="128" height="128">
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
                                    </linearGradient>
                                </defs>
                                <circle class="fill-none stroke-vscode-border" cx="64" cy="64" r="56" stroke-width="8"></circle>
                                <circle class="fill-none stroke-[url(#gradient)] rounded-full transition-all duration-1000 ease-out" 
                                    cx="64" cy="64" r="56" stroke-width="8"
                                    stroke-dasharray="351.86" 
                                    stroke-dashoffset="351.86"
                                    id="progress-circle"></circle>
                            </svg>
                            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold" id="coverage-percent-text">--%</div>
                        </div>
                    </div>
                </div>

                <!-- Uncovered Lines Section -->
                <div class="lg:col-span-2 bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20">
                     <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-vscode-fg flex items-center gap-2">
                            <span class="text-xl">🎯</span>
                            <span id="uncovered-title">Uncovered Lines</span>
                        </h2>
                        <button id="copy-lines-btn" class="px-3 py-1 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-xs font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Copy all uncovered line numbers">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            <span id="copy-btn-text">Copy</span>
                        </button>
                    </div>

                    <!-- Skeleton -->
                    <div id="uncovered-skeleton" class="animate-pulse flex flex-wrap gap-2">
                        <div class="w-10 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-12 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-8 h-6 bg-vscode-border/30 rounded"></div>
                    </div>

                    <!-- List -->
                    <div id="uncovered-lines-list" class="flex flex-wrap gap-2 overflow-y-auto max-h-60 p-2 bg-black/20 rounded-lg hidden"></div>
                    <div id="uncovered-empty-state" class="hidden text-center py-8 opacity-60 italic">No uncovered lines information available</div>
                </div>
            </div>
        </div>

        <!-- Tab: Console -->
        <div id="tab-console" class="tab-content">
             <div class="bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20 flex flex-col h-[600px]">
                <h2 class="text-lg font-bold text-vscode-fg mb-4 flex items-center gap-2">
                    <span class="text-xl">📝</span>
                    <span>Console Output</span>
                </h2>
                <div id="output" class="flex-1 bg-black/60 border border-vscode-border/50 p-5 rounded-xl overflow-y-auto font-mono text-sm text-gray-300 leading-relaxed shadow-inner scrollbox"></div>
            </div>
        </div>

    </div>

${WebviewComponents.getScrollToTopButton()}

    <script>
        const vscode = acquireVsCodeApi();
        const outputDiv = document.getElementById('output');
        const statusBadge = document.getElementById('status-badge');
        const progressBar = document.getElementById('progress-container');
        
        const coverageContainer = document.getElementById('coverage-container');
        const uncoveredLinesList = document.getElementById('uncovered-lines-list');
        const uncoveredEmptyState = document.getElementById('uncovered-empty-state');
        
        const rerunBtn = document.getElementById('rerun-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const watchBtn = document.getElementById('watch-btn');
        
        const coverageSkeleton = document.getElementById('coverage-skeleton');
        const uncoveredSkeleton = document.getElementById('uncovered-skeleton');
        
        let isWatching = false;

        // Restore previous state
        const previousState = vscode.getState();
        if (previousState) {
            // Restore logs
            if (previousState.logs) {
                outputDiv.innerHTML = previousState.logs;
            }
            
            // Restore status
            if (previousState.status) {
                statusBadge.textContent = previousState.status.text;
                statusBadge.className = previousState.status.className;
                
                if (previousState.status.finished) {
                     progressBar.classList.add('hidden');
                     rerunBtn.classList.remove('hidden');
                     cancelBtn.classList.add('hidden');
                     coverageSkeleton.classList.add('hidden');
                     uncoveredSkeleton.classList.add('hidden');
                } else {
                     progressBar.classList.remove('hidden');
                     rerunBtn.classList.add('hidden');
                     cancelBtn.classList.remove('hidden');
                     coverageSkeleton.classList.remove('hidden');
                     uncoveredSkeleton.classList.remove('hidden');
                }
            }
            
            // Restore coverage
            if (previousState.coverage) {
                showCoverage(previousState.coverage.data, previousState.coverage.sourceFile);
            }
            
            // Restore watch state
            if (previousState.isWatching) {
                isWatching = true;
                watchBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
                watchBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'ring-2', 'ring-blue-300');
                watchBtn.querySelector('span').textContent = 'Watching';
            }
        }
        
        // Tab switching
        window.switchTab = function(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
            document.querySelector('.tab-btn[data-tab="' + tabId + '"]').classList.add('active');
        };

        // Cancel button handler
        cancelBtn.onclick = () => {
            vscode.postMessage({ type: 'cancel' });
            cancelBtn.disabled = true; 
            cancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
            statusBadge.textContent = 'Cancelling...';
        };

        // Re-run button handler
        rerunBtn.onclick = () => {
            // Clear previous state
            outputDiv.innerHTML = '';
            statusBadge.textContent = 'Running';
            statusBadge.className = 'gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg';
            progressBar.classList.remove('hidden');
            
            // Show skeletons and hide containers
            coverageSkeleton.classList.remove('hidden');
            uncoveredSkeleton.classList.remove('hidden');
            coverageContainer.classList.add('hidden');
            uncoveredLinesList.classList.add('hidden');
            uncoveredEmptyState.classList.add('hidden');
            
            rerunBtn.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            // Update Summary Cards to init state
            document.getElementById('coverage-percent--card').textContent = '--%';
            document.getElementById('lines-hit--card').textContent = '--';
            document.getElementById('lines-total--card').textContent = '--';
            document.getElementById('uncovered-count--card').textContent = '--';
            
            // Reset watch state
            isWatching = false;
            watchBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
            watchBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'ring-2', 'ring-blue-300');
            watchBtn.querySelector('span').textContent = 'Watch';
            vscode.postMessage({ type: 'toggle-watch', enable: false });

            // Clear state
            vscode.setState(null);
            
            // Switch to console tab to see progress
            switchTab('console');
            
            // Send re-run message to extension
            vscode.postMessage({ type: 'rerun' });
        };
        
        // Watch button handler
        watchBtn.onclick = () => {
            isWatching = !isWatching;
            if (isWatching) {
                watchBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
                watchBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'ring-2', 'ring-blue-300');
                watchBtn.querySelector('span').textContent = 'Watching';
                vscode.postMessage({ type: 'toggle-watch', enable: true });
            } else {
                watchBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
                watchBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'ring-2', 'ring-blue-300');
                watchBtn.querySelector('span').textContent = 'Watch';
                vscode.postMessage({ type: 'toggle-watch', enable: false });
            }
        };
        
        function saveState() {
            const isFinished = rerunBtn.classList.contains('hidden') === false;
            vscode.setState({
                logs: outputDiv.innerHTML,
                status: {
                    text: statusBadge.textContent,
                    className: statusBadge.className,
                    finished: isFinished
                },
                coverage: window.currentCoverage || null,
                isWatching: isWatching
            });
        }
        
        // Message Handler
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'log':
                    const logItem = document.createElement('div');
                    logItem.textContent = message.value;
                    logItem.className = 'whitespace-pre-wrap animate-in fade-in duration-300';
                    outputDiv.appendChild(logItem);
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                    saveState();
                    break;
                case 'finished':
                    progressBar.classList.add('hidden');
                    rerunBtn.classList.remove('hidden');
                    rerunBtn.classList.remove('hidden');
                    cancelBtn.classList.add('hidden');
                    
                    // Hide skeletons
                    coverageSkeleton.classList.add('hidden');
                    uncoveredSkeleton.classList.add('hidden');
                    
                    if (message.success) {
                        statusBadge.textContent = 'Passed ✓';
                        statusBadge.className = 'gradient-success px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white';
                    } else if (message.cancelled) {
                        statusBadge.textContent = 'Cancelled ⚠';
                        statusBadge.className = 'bg-yellow-600 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white';
                    } else {
                        statusBadge.textContent = 'Failed ✗';
                        statusBadge.className = 'gradient-error px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white';
                        // Auto switch to console if failed
                        switchTab('console');
                    }
                    
                    if (message.coverage) {
                        showCoverage(message.coverage, message.sourceFile);
                        // Switch to overview to show results if success
                        if (message.success) {
                            switchTab('overview');
                        }
                    } else {
                         uncoveredLinesList.classList.add('hidden');
                         uncoveredEmptyState.classList.remove('hidden');
                         coverageContainer.classList.add('hidden');
                    }
                    saveState();
                    break;
            }
        });
        
        // Show Coverage Logic
        function showCoverage(coverageData, sourceFile) {
            window.currentCoverage = { data: coverageData, sourceFile: sourceFile };
            
            if (!coverageData) { 
                coverageContainer.classList.add('hidden');
                uncoveredLinesList.classList.add('hidden');
                uncoveredEmptyState.classList.remove('hidden');
                return; 
            }
            
            coverageContainer.classList.remove('hidden');
            coverageContainer.classList.add('animate-in', 'zoom-in-95', 'duration-500');

            // Populate Cards
            animateValue("coverage-percent--card", 0, coverageData.percentage, 1000, "%");
            animateValue("lines-hit--card", 0, coverageData.linesHit, 1000);
            animateValue("lines-total--card", 0, coverageData.linesFound, 1000);
            document.getElementById('uncovered-count--card').textContent = coverageData.uncoveredLines ? coverageData.uncoveredLines.length : 0;
            
            // Populate Visual Coverage
            document.getElementById('coverage-percent-text').textContent = \`\${coverageData.percentage}%\`;
            
            const circle = document.getElementById('progress-circle');
            const circumference = 2 * Math.PI * 56;
            const offset = circumference - (coverageData.percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            
            if (coverageData.percentage >= 80) {
                 circle.style.stroke = 'url(#gradient)';
            } else if (coverageData.percentage >= 50) {
                 circle.style.stroke = '#facc15';
            } else {
                 circle.style.stroke = '#ef4444';
            }

            // Uncovered Lines
            renderUncoveredLines(coverageData.uncoveredLines, sourceFile);
        }
        
        function renderUncoveredLines(lines, sourceFile) {
            uncoveredLinesList.innerHTML = '';
            
            if (!lines || lines.length === 0) {
                uncoveredLinesList.classList.add('hidden');
                uncoveredEmptyState.classList.remove('hidden');
                uncoveredEmptyState.textContent = 'Great job! 100% Coverage 🎉';
                document.getElementById('uncovered-title').textContent = 'Uncovered Lines (0)';
                return;
            }
            
            uncoveredEmptyState.classList.add('hidden');
            uncoveredLinesList.classList.remove('hidden');
            
            // Update title with count
            const titleElement = document.getElementById('uncovered-title');
            titleElement.textContent = \`Uncovered Lines (\${lines.length})\`;
            
            lines.forEach(line => {
                const badge = document.createElement('div');
                badge.className = 'px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs font-mono border border-red-500/30 cursor-pointer hover:bg-red-500/40 transition-colors clickable';
                badge.textContent = line;
                badge.onclick = () => {
                    vscode.postMessage({
                        type: 'navigateToLine',
                        file: sourceFile, 
                        line: line
                    });
                };
                uncoveredLinesList.appendChild(badge);
            });
            
            // Copy button
            const copyBtn = document.getElementById('copy-lines-btn');
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(lines.join(', '));
                const textSpan = document.getElementById('copy-btn-text');
                const originalText = textSpan.textContent;
                textSpan.textContent = "Copied!";
                setTimeout(() => textSpan.textContent = originalText, 2000);
            };
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

        function animateValue(id, start, end, duration, suffix = "") {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.textContent = Math.floor(progress * (end - start) + start) + suffix;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                     obj.textContent = end + suffix;
                }
            };
            window.requestAnimationFrame(step);
        }
    </script>
</body>
</html>`;
    }
}
