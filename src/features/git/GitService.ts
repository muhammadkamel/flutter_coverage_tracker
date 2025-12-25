
import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export class GitService {
    private gitPath: string = 'git';

    constructor() {
        // Future: resolve git path from configuration
    }

    public async isGitRepo(cwd: string): Promise<boolean> {
        try {
            await this.exec('rev-parse --is-inside-work-tree', cwd);
            return true;
        } catch {
            return false;
        }
    }

    public async getChangedLines(filePath: string): Promise<number[]> {
        const cwd = path.dirname(filePath);
        const fileName = path.basename(filePath);

        try {
            // Check if ignored first
            try {
                await this.exec(`check-ignore "${fileName}"`, cwd);
                return []; // Ignored file
            } catch {
                // Not ignored, proceed
            }

            // Get diff against HEAD (committed changes + unstaged changes effectively checked against HEAD usually requires careful diffing)
            // We want covering "New Code" which means code not in main/master? Or just local changes + uncommitted?
            // Usually "Diff Coverage" means "Lines changed in this PR/Branch relative to Base".
            // For local dev, usually "Lines changed relative to HEAD" (what I am working on now).

            // "diff --unified=0 HEAD -- file" gives context 0.
            const { stdout } = await this.exec(`diff --unified=0 HEAD -- "${fileName}"`, cwd);
            return this.parseDiffOutput(stdout);

        } catch (error) {
            console.warn(`Git error for ${filePath}:`, error);
            return [];
        }
    }

    private parseDiffOutput(stdout: string): number[] {
        const lines: number[] = [];
        // Output format example:
        // @@ -10,0 +11,5 @@ 
        // means at original line 10, 5 lines were added starting at new line 11.

        const regex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
        let match;

        while ((match = regex.exec(stdout)) !== null) {
            const startLine = parseInt(match[1], 10);
            const count = match[2] ? parseInt(match[2], 10) : 1;

            for (let i = 0; i < count; i++) {
                lines.push(startLine + i);
            }
        }

        return lines;
    }

    private exec(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            cp.exec(`${this.gitPath} ${command}`, { cwd }, (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}
