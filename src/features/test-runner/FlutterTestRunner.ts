import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ITestRunner, TestRunResult } from './interfaces';
import { LcovParser } from '../../shared/coverage/LcovParser';
import { CoverageMatcher } from '../../shared/coverage/CoverageMatcher';

export class FlutterTestRunner implements ITestRunner {
    private activeProcess: cp.ChildProcess | undefined;

    private _onTestComplete = new vscode.EventEmitter<TestRunResult>();
    public readonly onTestComplete = this._onTestComplete.event;

    private _onTestOutput = new vscode.EventEmitter<string>();
    public readonly onTestOutput = this._onTestOutput.event;

    constructor(
        private readonly spawnFn: typeof cp.spawn = cp.spawn
    ) { }

    async run(testFilePath: string, workspaceRoot: string): Promise<void> {
        this.cancel(); // Ensure no other test is running

        // Using shell: true for better compatibility with PATH
        const child = this.spawnFn('flutter', ['test', '--coverage', testFilePath], { cwd: workspaceRoot, shell: true });
        this.activeProcess = child;

        child.stdout.on('data', (data) => {
            this._onTestOutput.fire(data.toString());
        });

        child.stderr.on('data', (data) => {
            this._onTestOutput.fire(data.toString());
        });

        child.on('close', async (code) => {
            if (this.activeProcess === child) {
                this.activeProcess = undefined;
            }

            const cancelled = code === null;
            const success = code === 0;
            let coverageData = undefined;
            let sourceFile = undefined;

            if (success) {
                const config = vscode.workspace.getConfiguration('flutterCoverage');
                const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                const coverageFile = path.join(workspaceRoot, relativePath);

                if (fs.existsSync(coverageFile)) {
                    try {
                        const result = await LcovParser.parse(coverageFile);
                        sourceFile = CoverageMatcher.deduceSourceFilePath(testFilePath, workspaceRoot);

                        if (sourceFile) {
                            // We fire an event with the result. Determining the specific coverage match logic
                            // can ideally happen here OR in the application service.
                            // To keep Runner distinct, let's do the matching here as part of "Running and getting result"
                            // or just return the raw LCOV and let simpler logic handle it.
                            // But since we want "File Coverage", let's match it here.
                            const matchResult = CoverageMatcher.findCoverageEntry(sourceFile, result.files, workspaceRoot);
                            if (matchResult) {
                                coverageData = matchResult.fileCoverage;
                            } else {
                                // Fallback to overall? The interface allows optional.
                                // Let's stick to the behavior of null means "no specific found"
                            }
                        }
                    } catch (e) {
                        this._onTestOutput.fire(`[Error] Failed to parse coverage: ${e}\n`);
                    }
                }
            }

            this._onTestComplete.fire({
                success,
                cancelled,
                coverage: coverageData,
                sourceFile: sourceFile
            });
        });
    }

    cancel(): void {
        if (this.activeProcess) {
            this.activeProcess.kill();
            this.activeProcess = undefined;
            this._onTestOutput.fire('[Info] Cancelling test execution...\n');
        }
    }
}
