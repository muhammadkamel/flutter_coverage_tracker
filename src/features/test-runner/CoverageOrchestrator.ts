import * as vscode from 'vscode';
import { ITestRunner, IFileWatcher, TestRunResult } from './interfaces';
import * as path from 'path';

export class CoverageOrchestrator {
    private isWatching = false;
    private activeTestFile: string | undefined;
    private workspaceRoot: string | undefined;

    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly DEBOUNCE_MS = 2000; // Wait 2s to coalesce rapid saves

    constructor(
        private readonly testRunner: ITestRunner,
        private readonly fileWatcher: IFileWatcher
    ) {
        this.fileWatcher.onDidChange(() => this.onFileChanged());
    }

    public async runTest(testFile: string, workspaceRoot: string) {
        this.activeTestFile = testFile;
        this.workspaceRoot = workspaceRoot;
        await this.testRunner.run(testFile, workspaceRoot);

        // If we were already in watch mode, ensure we start watching the new file
        if (this.isWatching) {
            this.fileWatcher.watch(this.activeTestFile);
        }
    }

    public cancelTest() {
        this.testRunner.cancel();
    }

    public toggleWatch(enable: boolean) {
        this.isWatching = enable;
        if (enable && this.activeTestFile) {
            this.fileWatcher.watch(this.activeTestFile);
            // Also watch the source file? 
            // ideally we should calculate the source file and watch it too. 
            // But for now let's just watch the test file as requested "watch a file".
            // If the user wants to re-run when source changes, we need more logic.
            // The prompt said "watch a file for changes". Usually this implies TDD (source changes -> run test).

            // Let's infer source file again?
            // Or maybe just watch the whole workspace/lib folder? No that's too heavy.
            // Let's stick to watching the test file and its deduced source file if possible.
            // For MVP: Watch the test file.
        } else {
            this.fileWatcher.dispose();
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
        }
    }

    private onFileChanged() {
        if (!this.isWatching || !this.activeTestFile || !this.workspaceRoot) { return; }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            if (this.activeTestFile && this.workspaceRoot) {
                // Trigger re-run
                // We use the same run method
                this.testRunner.run(this.activeTestFile, this.workspaceRoot);
            }
        }, this.DEBOUNCE_MS);
    }
}
