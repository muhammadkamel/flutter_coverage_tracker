import * as path from 'path';
import * as fs from 'fs';

export class FileSystemUtils {
    public static resolveTestFilePath(
        currentFilePath: string,
        workspaceRoot: string,
        isMixed: boolean = false
    ): string {
        const paths = this.getPossibleTestFilePaths(currentFilePath, workspaceRoot);

        // 1. If it's a mixed file, prefer existing _impl_test.dart
        if (isMixed) {
            const implCandidates = paths.filter(p => p.endsWith('_impl_test.dart'));
            for (const p of implCandidates) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
        }

        // 2. Check if any candidate exists (this will pick _test.dart if it's there)
        for (const p of paths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        // 3. If none exist, return the primary candidate based on mixed status
        if (isMixed) {
            const implCandidates = paths.filter(p => p.endsWith('_impl_test.dart'));
            if (implCandidates.length > 0) {
                return implCandidates[0];
            }
        }

        return paths[0]; // Primary candidate fallback (_test.dart)
    }

    /**
     * Returns a list of possible test file paths for a given source file.
     * In Flutter, tests for lib/src/foo.dart can be in test/src/foo_test.dart OR test/foo_test.dart.
     * Also checks for flattened test paths (tests directly in test/ without mirroring lib structure).
     */
    public static getPossibleTestFilePaths(currentFilePath: string, workspaceRoot: string): string[] {
        const relativePath = path.relative(workspaceRoot, currentFilePath);

        if (relativePath.startsWith('lib' + path.sep)) {
            const pathInLib = relativePath.substring(4); // remove 'lib/'
            const pathWithoutExt = pathInLib.substring(0, pathInLib.length - 5); // remove '.dart'
            const fileName = path.basename(pathWithoutExt);

            const candidates: string[] = [];

            // Candidate 1: Direct mirror (e.g., lib/src/foo.dart -> test/src/foo_test.dart)
            candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`));
            candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutExt}_impl_test.dart`));

            // Candidate 2: Dropping 'src' (e.g., lib/src/foo.dart -> test/foo_test.dart)
            if (pathInLib.startsWith('src' + path.sep)) {
                const pathWithoutSrc = pathInLib.substring(4);
                const pathWithoutSrcAndExt = pathWithoutSrc.substring(0, pathWithoutSrc.length - 5);
                candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutSrcAndExt}_test.dart`));
                candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutSrcAndExt}_impl_test.dart`));
            }

            // Candidate 3: Flattened test path (e.g., lib/features/audio/foo.dart -> test/foo_test.dart)
            // Only add if not already covered by above candidates
            const flattenedTest = path.join(workspaceRoot, 'test', `${fileName}_test.dart`);
            const flattenedImplTest = path.join(workspaceRoot, 'test', `${fileName}_impl_test.dart`);
            if (!candidates.includes(flattenedTest)) {
                candidates.push(flattenedTest);
            }
            if (!candidates.includes(flattenedImplTest)) {
                candidates.push(flattenedImplTest);
            }

            return candidates;
        } else if (relativePath.startsWith('test' + path.sep)) {
            return [currentFilePath];
        } else {
            const pathWithoutExt = relativePath.endsWith('.dart')
                ? relativePath.substring(0, relativePath.length - 5)
                : relativePath;
            return [path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`)];
        }
    }

    /**
     * Attempts to find the source file for a given test file.
     * test/foo_test.dart -> lib/foo.dart or lib/src/foo.dart
     */
    public static resolveSourceFilePath(testFilePath: string, workspaceRoot: string): string | undefined {
        const relativePath = path.relative(workspaceRoot, testFilePath);

        if (!relativePath.startsWith('test' + path.sep)) {
            return undefined;
        }

        const pathInTest = relativePath.substring(5);
        const finalCandidates = this.getPossibleSourceFilePaths(pathInTest, workspaceRoot);

        for (const candidate of finalCandidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return undefined;
    }

    public static getPossibleSourceFilePaths(pathInTest: string, workspaceRoot: string): string[] {
        let candidates: string[] = [];

        const pathWithoutTestSuffix = pathInTest.endsWith('_test.dart')
            ? pathInTest.substring(0, pathInTest.length - 10)
            : null;

        if (pathWithoutTestSuffix) {
            // Priority 1: Direct match (e.g. foo_impl_test.dart -> foo_impl.dart or foo_test.dart -> foo.dart)
            candidates.push(path.join(workspaceRoot, 'lib', `${pathWithoutTestSuffix}.dart`));
            candidates.push(path.join(workspaceRoot, 'lib', 'src', `${pathWithoutTestSuffix}.dart`));

            // Priority 2: If it was _impl_test, try the interface (e.g. foo_impl_test.dart -> foo.dart)
            if (pathWithoutTestSuffix.endsWith('_impl')) {
                const baseName = pathWithoutTestSuffix.substring(0, pathWithoutTestSuffix.length - 5);
                candidates.push(path.join(workspaceRoot, 'lib', `${baseName}.dart`));
                candidates.push(path.join(workspaceRoot, 'lib', 'src', `${baseName}.dart`));
            }
        } else {
            return [];
        }

        const finalCandidates: string[] = [];
        const seen = new Set<string>();

        for (const cand of candidates) {
            finalCandidates.push(cand);
            seen.add(cand);

            // Handle mirror src/ logic
            const relCand = path.relative(path.join(workspaceRoot, 'lib'), cand);
            if (relCand.startsWith('src' + path.sep)) {
                const withoutSrc = relCand.substring(4);
                const candWithoutSrc = path.join(workspaceRoot, 'lib', withoutSrc);
                if (!seen.has(candWithoutSrc)) {
                    finalCandidates.push(candWithoutSrc);
                    seen.add(candWithoutSrc);
                }
            }
        }
        return finalCandidates;
    }

    public static getExistingTestFilePaths(currentFilePath: string, workspaceRoot: string): string[] {
        const candidates = this.getPossibleTestFilePaths(currentFilePath, workspaceRoot);
        const existing = candidates.filter(p => fs.existsSync(p));

        if (existing.length > 0) {
            return existing;
        }

        // If no direct candidates exist, attempt a workspace-wide search within `test/`
        // to find any test files that reference the source filename (including _impl variants).
        try {
            const relativePath = path.relative(workspaceRoot, currentFilePath);
            const fileName = path.basename(relativePath, '.dart');
            const testRoot = path.join(workspaceRoot, 'test');
            if (fs.existsSync(testRoot)) {
                const stack = [testRoot];
                const matches: string[] = [];
                while (stack.length > 0) {
                    const dir = stack.pop()!;
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const e of entries) {
                        const full = path.join(dir, e.name);
                        if (e.isDirectory()) {
                            stack.push(full);
                        } else if (e.isFile() && e.name.endsWith('_test.dart')) {
                            // Match if the test basename contains the source filename
                            // e.g., audio_player_repository_impl_test.dart or audio_player_repository_test.dart
                            const base = e.name.substring(0, e.name.length - 10); // drop _test.dart
                            if (base.includes(fileName)) {
                                matches.push(full);
                            }
                        }
                    }
                }

                if (matches.length > 0) {
                    // Prefer _impl matches first, then exact-name matches, then others
                    matches.sort((a, b) => {
                        const aName = path.basename(a);
                        const bName = path.basename(b);
                        const aBase = aName.substring(0, aName.length - 10); // drop _test.dart
                        const bBase = bName.substring(0, bName.length - 10);

                        const aImpl = aBase.endsWith('_impl') ? 0 : 1;
                        const bImpl = bBase.endsWith('_impl') ? 0 : 1;
                        if (aImpl !== bImpl) {
                            return aImpl - bImpl;
                        }

                        // Prefer files where base equals the filename or starts with filename + '_'
                        const relPath = path.relative(workspaceRoot, currentFilePath);
                        const fileName = path.basename(relPath, '.dart');

                        const aContainsExact = aBase === fileName ? 0 : aBase.startsWith(fileName + '_') ? 1 : 2;
                        const bContainsExact = bBase === fileName ? 0 : bBase.startsWith(fileName + '_') ? 1 : 2;
                        if (aContainsExact !== bContainsExact) {
                            return aContainsExact - bContainsExact;
                        }

                        // Finally, shorter basenames first
                        return aBase.length - bBase.length;
                    });

                    return matches;
                }
            }
        } catch (err) {
            // If any IO error occurs, fall back to returning no matches
        }

        return existing;
    }

    public static getExistingSourceFilePaths(testFilePath: string, workspaceRoot: string): string[] {
        const relativePath = path.relative(workspaceRoot, testFilePath);
        if (!relativePath.startsWith('test' + path.sep)) {
            return [];
        }
        const pathInTest = relativePath.substring(5);
        const candidates = this.getPossibleSourceFilePaths(pathInTest, workspaceRoot);
        return candidates.filter(p => fs.existsSync(p));
    }
}
