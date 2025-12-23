import { FileCoverageData } from '../../shared/coverage/Coverage';
import * as vscode from 'vscode';

export interface TestRunResult {
    success: boolean;
    coverage?: FileCoverageData;
    cancelled?: boolean;
    sourceFile?: string;
}

export interface ITestRunner {
    /**
     * Runs tests for the specified file.
     * @param testFilePath Absolute path to the test file.
     * @param workspaceRoot Root of the workspace.
     */
    run(testFilePath: string, workspaceRoot: string): Promise<void>;

    /**
     * Cancels the currently running test.
     */
    cancel(): void;

    /**
     * Event fired when a test run completes.
     */
    onTestComplete: vscode.Event<TestRunResult>;

    /**
     * Event fired when test output (stdout/stderr) is received.
     */
    onTestOutput: vscode.Event<string>;
}

export interface IFileWatcher {
    /**
     * Starts watching a file for changes.
     * @param filePath Absolute path to the file to watch.
     */
    watch(filePath: string): void;

    /**
     * Stops watching.
     */
    dispose(): void;

    /**
     * Event fired when the watched file changes.
     */
    onDidChange: vscode.Event<void>;
}
