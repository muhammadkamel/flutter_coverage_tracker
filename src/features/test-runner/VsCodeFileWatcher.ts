import * as vscode from 'vscode';
import { IFileWatcher } from './interfaces';

export class VsCodeFileWatcher implements IFileWatcher {
    private watcher: vscode.FileSystemWatcher | undefined;
    private _onDidChange = new vscode.EventEmitter<void>();
    public readonly onDidChange = this._onDidChange.event;

    watch(filePath: string): void {
        this.dispose(); // clear previous

        // Watch specifically this file
        this.watcher = vscode.workspace.createFileSystemWatcher(filePath);
        this.watcher.onDidChange(() => this._onDidChange.fire());
        this.watcher.onDidCreate(() => this._onDidChange.fire());
        // onDidDelete we might want to handle, but for now just signal change
        this.watcher.onDidDelete(() => this._onDidChange.fire());
    }

    dispose(): void {
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }
    }
}
