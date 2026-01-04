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

    constructor(private readonly spawnFn: typeof cp.spawn = cp.spawn) { }

    async run(testFilePath: string, workspaceRoot: string): Promise<void> {
        this.cancel(); // Ensure no other test is running

        // Using shell: true for better compatibility with PATH
        const child = this.spawnFn('flutter', ['test', '--coverage', testFilePath], {
            cwd: workspaceRoot,
            shell: true
        });
        this.activeProcess = child;

        child.stdout.on('data', data => {
            this._onTestOutput.fire(data.toString());
        });

        child.stderr.on('data', data => {
            this._onTestOutput.fire(data.toString());
        });

        child.on('error', (error) => {
            this._onTestOutput.fire(`[Error] Failed to start test process: ${error.message}\n`);
            this._onTestComplete.fire({
                success: false,
                cancelled: false
            });
            if (this.activeProcess === child) {
                this.activeProcess = undefined;
            }
        });

        child.on('close', async code => {
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
                        const sourceCandidates = CoverageMatcher.deduceSourceFilePath(testFilePath, workspaceRoot);

                        // Try each candidate until we find one with coverage
                        for (const candidate of sourceCandidates) {
                            const matchResult = CoverageMatcher.findCoverageEntry(
                                candidate,
                                result.files,
                                workspaceRoot
                            );
                            if (matchResult && matchResult.fileCoverage) {
                                coverageData = matchResult.fileCoverage;
                                sourceFile = candidate; // Use the one that matched
                                break;
                            }
                        }

                        // If no match found but we had candidates, default to the first candidate as the "intended" source
                        // even if we have no coverage data for it.
                        if (!sourceFile && sourceCandidates.length > 0) {
                            sourceFile = sourceCandidates[0];
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
