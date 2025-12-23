import * as vscode from 'vscode';
import { ITestRunner, IFileWatcher, TestRunResult } from '../../features/test-runner/interfaces';

export class MockTestRunner implements ITestRunner {
    public runCalledWith: { file: string, root: string } | undefined;
    public cancelCalled = false;

    // Simulate events
    private onTestCompleteEmitter = new vscode.EventEmitter<TestRunResult>();
    public readonly onTestComplete = this.onTestCompleteEmitter.event;

    private onTestOutputEmitter = new vscode.EventEmitter<string>();
    public readonly onTestOutput = this.onTestOutputEmitter.event;

    async run(testFilePath: string, workspaceRoot: string): Promise<void> {
        this.runCalledWith = { file: testFilePath, root: workspaceRoot };
    }

    cancel(): void {
        this.cancelCalled = true;
    }

    public fireComplete(result: TestRunResult) {
        this.onTestCompleteEmitter.fire(result);
    }

    public fireOutput(out: string) {
        this.onTestOutputEmitter.fire(out);
    }
}

export class MockFileWatcher implements IFileWatcher {
    public watchedFile: string | undefined;
    public disposed = false;

    private onDidChangeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChange = this.onDidChangeEmitter.event;

    watch(filePath: string): void {
        this.watchedFile = filePath;
        this.disposed = false;
    }

    dispose(): void {
        this.disposed = true;
    }

    public fireChange() {
        this.onDidChangeEmitter.fire();
    }
}
