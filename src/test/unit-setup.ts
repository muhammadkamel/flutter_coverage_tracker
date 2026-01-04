import * as EventEmitter from 'events';
import * as path from 'path';

const vscode = {
    EventEmitter: class {
        private ee = new EventEmitter();
        fire(data: any) {
            this.ee.emit('data', data);
        }
        get event() {
            return (cb: any) => {
                this.ee.on('data', cb);
                return { dispose: () => this.ee.removeListener('data', cb) };
            };
        }
    },
    Uri: {
        file: (f: string) => ({ fsPath: f, fsPathNormalized: f.replace(/\\/g, '/'), toString: () => f }),
        parse: (u: string) => ({ fsPath: u, fsPathNormalized: u.replace(/\\/g, '/'), toString: () => u }),
        joinPath: (u: any, ...parts: string[]) => ({
            fsPath: (u?.fsPath || '') + '/' + parts.join('/'),
            toString: () => (u?.fsPath || '') + '/' + parts.join('/')
        })
    },
    extensions: {
        getExtension: (id: string) => ({ id, isActive: true })
    },
    window: {
        activeTextEditor: undefined as any,
        showErrorMessage: () => { },
        showInformationMessage: () => { },
        showSaveDialog: () => Promise.resolve(undefined),
        showTextDocument: () => Promise.resolve({ selection: {} }),
        createTextEditorDecorationType: () => ({ dispose: () => { } }),
        visibleTextEditors: [],
        onDidChangeActiveTextEditor: () => ({ dispose: () => { } }),
        registerFileDecorationProvider: () => ({ dispose: () => { } }),
        withProgress: (options: any, task: any) => task({ report: () => { } }),
        createWebviewPanel: () => ({
            webview: {
                asWebviewUri: (u: any) => u,
                postMessage: (msg: any) => {
                    (global as any).lastWebviewMessage = msg;
                    if (!(global as any).allWebviewMessages) {
                        (global as any).allWebviewMessages = [];
                    }
                    (global as any).allWebviewMessages.push(msg);
                },
                onDidReceiveMessage: (cb: any) => {
                    (global as any).lastWebviewCallback = cb;
                    return { dispose: () => { } };
                }
            },
            onDidDispose: (cb: any) => {
                (global as any).lastWebviewDisposeCallback = cb;
                return { dispose: () => { } };
            },
            reveal: () => { },
            dispose: () => { }
        }),
        createStatusBarItem: (alignment: any, priority: any) => ({
            show: () => { },
            hide: () => { },
            dispose: () => { },
            text: '',
            tooltip: '',
            command: ''
        }),
        registerWebviewViewProvider: (id: string, provider: any) => ({
            dispose: () => { }
        })
    },
    workspace: {
        workspaceFolders: undefined as any,
        getConfiguration: () => ({
            get: (key: string) => (key === 'coverageFilePath' ? 'coverage/lcov.info' : undefined),
            affectsConfiguration: () => false
        }),
        findFiles: (pattern: any) => Promise.resolve([]),
        getWorkspaceFolder: (uri: any) => {
            if (!vscode.workspace.workspaceFolders) {
                return undefined;
            }
            const uriPath = (uri?.fsPath || '').replace(/\\/g, '/');
            return vscode.workspace.workspaceFolders.find((f: any) =>
                uriPath.startsWith(f.uri.fsPath.replace(/\\/g, '/'))
            );
        },
        openTextDocument: () => Promise.resolve({}),
        onDidSaveTextDocument: () => ({ dispose: () => { } }),
        onDidChangeConfiguration: () => ({ dispose: () => { } }),
        createFileSystemWatcher: (pattern: any) => {
            const ee = new EventEmitter();
            const watcher = {
                onDidCreate: (cb: any) => ee.on('create', cb),
                onDidChange: (cb: any) => ee.on('change', cb),
                onDidDelete: (cb: any) => ee.on('delete', cb),
                dispose: () => { },
                // Helper to manual trigger from test
                _fire: (type: string, data: any) => ee.emit(type, data)
            };
            (global as any).lastCreatedWatcher = watcher;
            return watcher;
        }
    },
    commands: {
        _commands: new Map<string, Function>(),
        registerCommand: (id: string, cb: Function) => {
            vscode.commands._commands.set(id, cb);
            return { dispose: () => vscode.commands._commands.delete(id) };
        },
        executeCommand: (id: string, ...args: any[]) => {
            const cb = vscode.commands._commands.get(id);
            if (cb) {
                return Promise.resolve(cb(...args));
            }
            return Promise.resolve();
        },
        getCommands: () => Promise.resolve(Array.from(vscode.commands._commands.keys()))
    },
    languages: {
        registerCodeLensProvider: () => ({ dispose: () => { } })
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ViewColumn: { One: 1, Two: 2 },
    RelativePattern: class {
        constructor(
            public base: any,
            public pattern: string
        ) { }
    },
    Position: class {
        constructor(
            public line: number,
            public character: number
        ) { }
    },
    Range: class {
        constructor(
            public start: any,
            public end: any
        ) { }
    },
    Selection: class {
        constructor(
            public anchor: any,
            public active: any
        ) { }
    },
    TextEditorRevealType: { Default: 0 },
    OverviewRulerLane: { Left: 1, Right: 2, Full: 4 },
    ProgressLocation: { Notification: 1, Window: 10, SourceControl: 15 },
    ThemeColor: class {
        constructor(public id: string) { }
    }
};

// Add to global so modules can find it
(global as any).vscode = vscode;

// Handle requiring 'vscode' by mocking it in the module cache
const nodeModule = require('module');
const originalRequire = nodeModule.prototype.require;
nodeModule.prototype.require = function (name: string) {
    if (name === 'vscode') {
        return vscode;
    }
    return originalRequire.apply(this, arguments);
};
