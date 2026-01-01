import * as vscode from 'vscode';

export class SidebarHtmlGenerator {
    public static getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        coveragePercent: number = 0
    ): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview.css'));
        const nonce = getNonce();

        // Color for the circular progress based on coverage
        const progressColor = coveragePercent >= 80 ? '#4ade80' : coveragePercent >= 50 ? '#fbbf24' : '#f87171';
        const progressStroke = 2 * Math.PI * 40; // 40 is radius
        const progressOffset = progressStroke - (coveragePercent / 100) * progressStroke;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Flutter Coverage</title>
    <style>
        body {
            padding: 16px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
        }
        .container {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .header-card {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        .progress-circle {
            width: 100px;
            height: 100px;
            position: relative;
        }
        .progress-circle svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }
        .progress-circle circle {
            fill: none;
            stroke-width: 8;
            stroke-linecap: round;
        }
        .progress-bg {
            stroke: var(--vscode-widget-border);
        }
        .progress-bar {
            stroke: ${progressColor};
            stroke-dasharray: ${progressStroke};
            stroke-dashoffset: ${progressOffset};
            transition: stroke-dashoffset 1s ease;
        }
        .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            font-weight: bold;
        }
        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .action-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
        }
        .action-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            text-decoration: none;
            transition: background 0.2s;
        }
        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .action-btn.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .action-btn.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .icon {
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Coverage Stats -->
        <div class="header-card">
            <div class="progress-circle">
                <svg>
                    <circle class="progress-bg" cx="50" cy="50" r="40"></circle>
                    <circle class="progress-bar" cx="50" cy="50" r="40"></circle>
                </svg>
                <div class="score-text">${coveragePercent.toFixed(0)}%</div>
            </div>
            <div style="font-size: 13px; opacity: 0.8;">Total Coverage</div>
        </div>

        <!-- Quick Actions -->
        <div>
            <div class="section-title">Quick Actions</div>
            <div class="action-grid">
                <button class="action-btn primary" onclick="sendMessage('run-changed')">
                    <span class="icon">⚡</span> Run Changed Files
                </button>
                <button class="action-btn" onclick="sendMessage('run-folder')">
                    <span class="icon">📂</span> Run Folder Tests...
                </button>
                 <button class="action-btn" onclick="sendMessage('show-details')">
                    <span class="icon">📊</span> Show Details
                </button>
            </div>
        </div>

        <!-- Links -->
        <div>
            <div class="section-title">Navigation</div>
            <div class="action-grid">
                 <button class="action-btn" onclick="sendMessage('view-history')">
                    <span class="icon">🕒</span> Coverage History
                </button>
                 <button class="action-btn" onclick="sendMessage('view-suite')">
                    <span class="icon">📦</span> Suite Dashboard
                </button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function sendMessage(command) {
            vscode.postMessage({ type: command });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            // Listen for updates if we want reactive UI
        });
    </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
