import * as vscode from 'vscode';

export class WebviewGenerator {
    public static getWebviewContent(testFileName: string, styleSrc: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flutter Test Runner</title>
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
        
        /* Scroll to Top Button */
        #scroll-to-top {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        #scroll-to-top.show {
            opacity: 1;
            visibility: visible;
        }
        #scroll-to-top:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
        }
        #scroll-to-top:active {
            transform: translateY(-2px);
        }
    </style>
</head>
<body class="bg-vscode-editor-bg text-vscode-fg p-6 font-sans antialiased selection:bg-indigo-500/30">
    <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
            <h1 class="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <span class="text-3xl">🚀</span>
                <span>${testFileName}</span>
            </h1>
            <div class="flex items-center gap-3">
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

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Console Output -->
            <div class="lg:col-span-2 bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20">
                <h2 class="text-lg font-bold text-vscode-fg mb-4 flex items-center gap-2">
                    <span class="text-xl">📝</span>
                    <span>Console Output</span>
                </h2>
                <div id="output" class="bg-black/60 border border-vscode-border/50 p-5 rounded-xl overflow-y-auto max-h-96 font-mono text-sm text-gray-300 leading-relaxed shadow-inner"></div>
            </div>

            <!-- Coverage Section -->
            <div class="space-y-6">
                <!-- Coverage Card -->
                <div class="bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20">
                    <h2 class="text-lg font-bold text-vscode-fg mb-5 flex items-center gap-2">
                        <span class="text-xl">📊</span>
                        <span>Coverage</span>
                    </h2>

                    <!-- Skeleton Loader for Coverage -->
                    <div id="coverage-skeleton" class="animate-pulse space-y-4">
                        <div class="w-32 h-32 mx-auto bg-vscode-border/50 rounded-full"></div>
                        <div class="grid grid-cols-3 gap-3">
                            <div class="h-16 bg-vscode-border/30 rounded-lg"></div>
                            <div class="h-16 bg-vscode-border/30 rounded-lg"></div>
                            <div class="h-16 bg-vscode-border/30 rounded-lg"></div>
                        </div>
                    </div>

                    <div id="coverage-container" class="hidden">
                        <!-- Circular Progress -->
                        <div class="w-32 h-32 mx-auto mb-5 relative">
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
                        
                        <!-- Stats Grid -->
                        <div class="grid grid-cols-3 gap-3">
                            <div class="text-center p-3 bg-vscode-bg/50 rounded-lg hover:-translate-y-0.5 transition-transform">
                                <span id="coverage-percent" class="text-2xl font-bold block mb-1">--%</span>
                                <span class="text-xs opacity-70 uppercase tracking-wide">Coverage</span>
                            </div>
                            <div class="text-center p-3 bg-vscode-bg/50 rounded-lg hover:-translate-y-0.5 transition-transform">
                                <span id="lines-hit" class="text-2xl font-bold block mb-1">--</span>
                                <span class="text-xs opacity-70 uppercase tracking-wide">Hit</span>
                            </div>
                            <div class="text-center p-3 bg-vscode-bg/50 rounded-lg hover:-translate-y-0.5 transition-transform">
                                <span id="lines-total" class="text-2xl font-bold block mb-1">--</span>
                                <span class="text-xs opacity-70 uppercase tracking-wide">Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Uncovered Lines Card -->
                <div class="bg-vscode-bg rounded-2xl p-6 shadow-2xl border border-vscode-border/20 hidden" id="uncovered-container">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-vscode-fg flex items-center gap-2">
                            <span class="text-xl">🎯</span>
                            <span id="uncovered-title">Uncovered Lines</span>
                        </h2>
                        <button id="copy-lines-btn" class="px-4 py-2 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Copy all uncovered line numbers">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            <span id="copy-btn-text">Copy</span>
                        </button>
                    </div>

                    <!-- Skeleton Loader for Uncovered Lines -->
                    <div id="uncovered-skeleton" class="animate-pulse flex flex-wrap gap-2">
                        <div class="w-10 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-12 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-8 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-14 h-6 bg-vscode-border/30 rounded"></div>
                        <div class="w-10 h-6 bg-vscode-border/30 rounded"></div>
                    </div>

                    <div id="uncovered-lines-list" class="flex flex-wrap gap-2 max-h-80 overflow-y-auto p-2 bg-black/20 rounded-lg"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scroll to Top Button -->
    <button id="scroll-to-top" title="Scroll to top">
        <svg width="24" height="24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 15l-6-6-6 6"></path>
        </svg>
    </button>

    <script>
        const vscode = acquireVsCodeApi();
        const outputDiv = document.getElementById('output');
        const statusBadge = document.getElementById('status-badge');
        const progressBar = document.getElementById('progress-container');
        const coverageContainer = document.getElementById('coverage-container');
        const uncoveredContainer = document.getElementById('uncovered-container');
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
            uncoveredContainer.classList.add('hidden');
            
            rerunBtn.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            // Reset watch state on re-run for UI consistency
            isWatching = false;
            watchBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
            watchBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'ring-2', 'ring-blue-300');
            watchBtn.querySelector('span').textContent = 'Watch';
            vscode.postMessage({ type: 'toggle-watch', enable: false });

            // Clear state
            vscode.setState(null);
            
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
                    }
                    
                    if (message.coverage) {
                        showCoverage(message.coverage, message.sourceFile);
                    } else {
                        // If no coverage info, hide containers
                        coverageContainer.classList.add('hidden');
                        uncoveredContainer.classList.add('hidden');
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
                return; 
            }
            
            coverageContainer.classList.remove('hidden');
            coverageContainer.classList.add('animate-in', 'zoom-in-95', 'duration-500');

            // Animate Numbers
            animateValue("coverage-percent", 0, coverageData.percentage, 1000, "%");
            animateValue("lines-hit", 0, coverageData.linesHit, 1000);
            animateValue("lines-total", 0, coverageData.linesFound, 1000);
            
            document.getElementById('coverage-percent-text').textContent = \`\${coverageData.percentage}%\`;
            
            // Update Circle
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
            const list = document.getElementById('uncovered-lines-list');
            list.innerHTML = '';
            
            if (!lines || lines.length === 0) {
                uncoveredContainer.classList.add('hidden');
                return;
            }
            
            // Update title with count
            const titleElement = document.getElementById('uncovered-title');
            titleElement.textContent = \`Uncovered Lines(\${lines.length})\`;
            
            uncoveredContainer.classList.remove('hidden');
            uncoveredContainer.classList.add('animate-in', 'slide-in-from-bottom-4', 'duration-500');

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
                list.appendChild(badge);
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
