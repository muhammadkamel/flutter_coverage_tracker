"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = getWebviewContent;
const vscode = require("vscode");
const fs = require("fs");
function getWebviewContent(testFileName, extensionUri) {
    // Read the compiled CSS
    const cssPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview.css');
    let cssContent = '';
    try {
        cssContent = fs.readFileSync(cssPath.fsPath, 'utf8');
    }
    catch (e) {
        console.error('Failed to load CSS:', e);
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Runner</title>
    <style>${cssContent}</style>
</head>
<body class="gradient-bg min-h-screen p-6">
    <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 p-6 bg-vscode-bg rounded-2xl shadow-2xl border border-vscode-border/20">
            <h1 class="text-2xl font-bold text-vscode-fg flex items-center gap-3">
                <span class="text-3xl">📋</span>
                <span>${testFileName}</span>
            </h1>
            <div class="flex items-center gap-3">
                <button id="rerun-btn" class="px-4 py-2 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Re-run test">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span>Re-run</span>
                </button>
                <span id="status-badge" class="gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg">
                    Running
                </span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div id="progress-container" class="w-full h-1 bg-vscode-border mb-6 rounded overflow-hidden hidden">
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
                            <span>Uncovered Lines</span>
                        </h2>
                        <button id="copy-lines-btn" class="px-4 py-2 bg-vscode-button hover:bg-vscode-button-hover text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg" title="Copy all uncovered line numbers">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            <span id="copy-btn-text">Copy</span>
                        </button>
                    </div>
                    <div id="uncovered-lines-list" class="flex flex-wrap gap-2 max-h-80 overflow-y-auto p-2 bg-black/20 rounded-lg"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const outputDiv = document.getElementById('output');
        const statusBadge = document.getElementById('status-badge');
        const progressBar = document.getElementById('progress-container');
        const coverageContainer = document.getElementById('coverage-container');
        const uncoveredContainer = document.getElementById('uncovered-container');
        
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
                progressBar.classList.add('hidden');
            }
            
            // Restore coverage
            if (previousState.coverage) {
                showCoverage(previousState.coverage.data, previousState.coverage.sourceFile);
            }
        }
        
        // Re-run button handler
        document.getElementById('rerun-btn').onclick = () => {
            // Clear previous state
            outputDiv.innerHTML = '';
            statusBadge.textContent = 'Running';
            statusBadge.className = 'gradient-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white animate-pulse-slow shadow-lg';
            progressBar.classList.remove('hidden');
            coverageContainer.classList.add('hidden');
            uncoveredContainer.classList.add('hidden');
            
            // Clear state
            vscode.setState(null);
            
            // Send re-run message to extension
            vscode.postMessage({ type: 'rerun' });
        };
        
        function saveState() {
            vscode.setState({
                logs: outputDiv.innerHTML,
                status: {
                    text: statusBadge.textContent,
                    className: statusBadge.className
                },
                coverage: window.currentCoverage || null
            });
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'log':
                    const span = document.createElement('span');
                    span.textContent = message.value + '\\n';
                    outputDiv.appendChild(span);
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                    saveState();
                    break;
                case 'finished':
                    progressBar.classList.add('hidden');
                    if (message.success) {
                        statusBadge.textContent = 'Passed ✓';
                        statusBadge.className = 'gradient-success px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white';
                    } else {
                        statusBadge.textContent = 'Failed ✗';
                        statusBadge.className = 'gradient-error px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide text-white';
                    }
                    if (message.coverage) {
                        window.currentCoverage = {
                            data: message.coverage,
                            sourceFile: message.sourceFile
                        };
                        showCoverage(message.coverage, message.sourceFile);
                    }
                    saveState();
                    break;
            }
        });

        function showCoverage(data, sourceFile) {
            coverageContainer.classList.remove('hidden');
            
            const percent = data.percentage;
            const percentEl = document.getElementById('coverage-percent');
            const percentText = document.getElementById('coverage-percent-text');
            
            percentEl.textContent = percent + '%';
            percentText.textContent = percent + '%';
            
            // Color coding
            if (percent >= 80) {
                percentEl.classList.add('text-green-400');
                percentText.classList.add('text-green-400');
            } else if (percent >= 50) {
                percentEl.classList.add('text-orange-400');
                percentText.classList.add('text-orange-400');
            } else {
                percentEl.classList.add('text-red-400');
                percentText.classList.add('text-red-400');
            }

            document.getElementById('lines-hit').textContent = data.linesHit;
            document.getElementById('lines-total').textContent = data.linesFound;
            
            // Animate circular progress
            const circle = document.getElementById('progress-circle');
            const circumference = 351.86;
            const offset = circumference - (percent / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            
            // Show uncovered lines only if there are any
            if (data.uncoveredLines && data.uncoveredLines.length > 0) {
                uncoveredContainer.classList.remove('hidden');
                const linesList = document.getElementById('uncovered-lines-list');
                linesList.innerHTML = '';
                
                data.uncoveredLines.forEach(lineNum => {
                    const lineEl = document.createElement('div');
                    lineEl.className = 'inline-flex items-center justify-center min-w-[48px] px-4 py-2 bg-gradient-to-br from-vscode-button to-vscode-button-hover text-white rounded-lg cursor-pointer font-mono text-sm font-bold transition-all hover:scale-105 hover:shadow-xl border border-white/10';
                    lineEl.textContent = lineNum;
                    lineEl.title = 'Click to navigate to line ' + lineNum;
                    lineEl.onclick = () => {
                        vscode.postMessage({
                            type: 'navigateToLine',
                            file: sourceFile,
                            line: lineNum
                        });
                    };
                    linesList.appendChild(lineEl);
                });
                
                // Add copy button handler
                const copyBtn = document.getElementById('copy-lines-btn');
                copyBtn.onclick = () => {
                    const lines = data.uncoveredLines.join(', ');
                    navigator.clipboard.writeText(lines).then(() => {
                        const btnText = document.getElementById('copy-btn-text');
                        const originalText = btnText.textContent;
                        btnText.textContent = 'Copied!';
                        copyBtn.classList.add('bg-green-600');
                        setTimeout(() => {
                            btnText.textContent = originalText;
                            copyBtn.classList.remove('bg-green-600');
                        }, 2000);
                    });
                };
            }
        }
    </script>
</body>
</html>`;
}
//# sourceMappingURL=webview.js.map