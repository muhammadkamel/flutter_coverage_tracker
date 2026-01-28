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

            // Parse coverage data even if test fails, as Flutter still generates coverage
            // This allows users to see which lines were executed before the failure
            if (!cancelled) {
                const config = vscode.workspace.getConfiguration('flutterCoverage');
                const relativePath = config.get<string>('coverageFilePath') || 'coverage/lcov.info';
                const coverageFile = path.join(workspaceRoot, relativePath);

                if (fs.existsSync(coverageFile)) {
                    try {
                        const result = await LcovParser.parse(coverageFile);
                        const sourceCandidates = CoverageMatcher.deduceSourceFilePath(testFilePath, workspaceRoot);

                        this._onTestOutput.fire(`[Coverage] Found ${result.files.length} files in lcov.info\n`);
                        this._onTestOutput.fire(`[Coverage] Looking for source candidates: ${sourceCandidates.join(', ')}\n`);

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
                                this._onTestOutput.fire(`[Coverage] Matched: ${candidate} (${matchResult.matchType})\n`);
                                break;
                            }
                        }

                        // If no specific match found, try fuzzy matching based on test file name
                        if (!coverageData && result.files.length > 0) {
                            // Extract the core name from test file (e.g., "download_service_impl" from "download_service_impl_test.dart")
                            const testFileName = path.basename(testFilePath);
                            const coreTestName = testFileName.replace(/_test\.dart$/, '').toLowerCase();
                            
                            this._onTestOutput.fire(`[Coverage] No exact match. Searching for files matching: "${coreTestName}"\n`);
                            
                            // Find files that contain the core test name in their path
                            const matchingFiles = result.files.filter(f => {
                                const normalizedPath = f.file.toLowerCase();
                                const fileName = path.basename(normalizedPath, '.dart');
                                // Check if file name contains the core test name or vice versa
                                return fileName.includes(coreTestName) || coreTestName.includes(fileName);
                            });
                            
                            if (matchingFiles.length > 0) {
                                // Sort by relevance: prefer exact base name match, then by coverage data quality
                                matchingFiles.sort((a, b) => {
                                    const aName = path.basename(a.file, '.dart').toLowerCase();
                                    const bName = path.basename(b.file, '.dart').toLowerCase();
                                    // Exact match gets priority
                                    if (aName === coreTestName) {
                                        return -1;
                                    }
                                    if (bName === coreTestName) {
                                        return 1;
                                    }
                                    // Then prefer files with more lines (more substantial)
                                    return b.linesFound - a.linesFound;
                                });
                                
                                const bestMatch = matchingFiles[0];
                                coverageData = bestMatch;
                                sourceFile = bestMatch.file;
                                this._onTestOutput.fire(`[Coverage] Fuzzy matched: ${bestMatch.file} (${bestMatch.percentage}%)\n`);
                            } else {
                                // No matching files found - show overall aggregated stats but without uncovered lines
                                // since they would be from unrelated files
                                let totalLinesFound = 0;
                                let totalLinesHit = 0;
                                
                                for (const file of result.files) {
                                    totalLinesFound += file.linesFound;
                                    totalLinesHit += file.linesHit;
                                }
                                
                                const percentage = totalLinesFound === 0 ? 0 : parseFloat(((totalLinesHit / totalLinesFound) * 100).toFixed(2));
                                
                                // Don't include uncovered lines from unrelated files - that's confusing!
                                coverageData = {
                                    file: 'Aggregated (no specific match)',
                                    linesFound: totalLinesFound,
                                    linesHit: totalLinesHit,
                                    percentage: percentage,
                                    uncoveredLines: [] // Empty - can't show lines from unrelated files
                                };
                                sourceFile = sourceCandidates.length > 0 ? sourceCandidates[0] : undefined;
                                
                                this._onTestOutput.fire(`[Coverage] No matching source file found in coverage data.\n`);
                                this._onTestOutput.fire(`[Coverage] Showing aggregated stats: ${percentage}% (${totalLinesHit}/${totalLinesFound} lines)\n`);
                                this._onTestOutput.fire(`[Coverage] Tip: The source file may not have been executed by this test.\n`);
                            }
                        }

                        // If no match found but we had candidates, default to the first candidate as the "intended" source
                        // even if we have no coverage data for it.
                        if (!sourceFile && sourceCandidates.length > 0) {
                            sourceFile = sourceCandidates[0];
                            this._onTestOutput.fire(`[Coverage] No coverage data found. Using first candidate: ${sourceFile}\n`);
                        }
                    } catch (e) {
                        this._onTestOutput.fire(`[Error] Failed to parse coverage: ${e}\n`);
                    }
                } else {
                    this._onTestOutput.fire(`[Coverage] Coverage file not found: ${coverageFile}\n`);
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
