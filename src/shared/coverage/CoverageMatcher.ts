import * as path from 'path';
import { FileCoverageData } from './Coverage';

export interface MatchResult {
    fileCoverage: FileCoverageData;
    matchType: 'exact' | 'suffix' | 'basename';
    normalizedPath: string;
}

export class CoverageMatcher {
    /**
     * Normalizes a file path to use forward slashes.
     */
    public static normalizePath(p: string): string {
        return p.replace(/\\/g, '/');
    }

    /**
     * Deduces the expected source file path candidates from a test file path.
     * e.g., 'test/foo_test.dart' -> ['lib/foo.dart']
     *       'test/foo_impl_test.dart' -> ['lib/foo_impl.dart', 'lib/foo.dart']
     */
    public static deduceSourceFilePath(testFilePath: string, workspaceRoot: string): string[] {
        const relativeTestPath = path.relative(workspaceRoot, testFilePath);
        const normalizedTestPath = this.normalizePath(relativeTestPath);
        const candidates: string[] = [];

        if (normalizedTestPath.startsWith('test/')) {
            const stripPrefix = normalizedTestPath.substring(5); // remove 'test/'
            if (stripPrefix.endsWith('_test.dart')) {
                // Remove '_test.dart' to get the base logical path relative to 'test/'
                // e.g. features/downloads/download_service_impl
                let base = stripPrefix.substring(0, stripPrefix.length - 10);

                // Add the direct match first: lib/features/downloads/download_service_impl.dart
                candidates.push('lib/' + base + '.dart');

                // Try progressively stripping suffixes starting with '_'
                // We only modify the basename part, preserving the directory structure.
                const dirname = path.dirname(base);
                let basename = path.basename(base);

                // Assuming dirname gives '.' if no dir, we need to be careful with joining back.
                // But simplified: operate on 'base' string if we assume standard path structure.
                // Better approach: find lastIndex of '_' and slice.

                while (true) {
                    const lastUnderscoreIndex = base.lastIndexOf('_');
                    if (lastUnderscoreIndex === -1) {
                        break;
                    }

                    // If underscore is part of a directory separator, stop stripping (e.g. features_new/login)
                    // We only want to strip suffixes of the filename itself.
                    // So we check if the underscore is after the last slash.
                    const lastSlashIndex = base.lastIndexOf('/');
                    if (lastUnderscoreIndex < lastSlashIndex) {
                        break;
                    }

                    // Strip from last underscore
                    base = base.substring(0, lastUnderscoreIndex);

                    // Avoid empty base or invalid states, though logically likely fine.
                    if (base.length > 0) {
                        candidates.push('lib/' + base + '.dart');
                    }
                }
            }
        }
        return candidates;
    }

    /**
     * Finds the matching coverage entry for a given target source file (e.g. 'lib/foo.dart').
     */
    public static findCoverageEntry(
        targetSourceSuffix: string,
        lcovFiles: FileCoverageData[],
        workspaceRoot: string
    ): MatchResult | undefined {
        // We construct a normalized map of the LCOV data to handle absolute/relative mismatches
        const normalizedLcovFiles = lcovFiles.map(f => {
            let fPath = f.file;
            // If it's absolute and inside workspace, make it relative
            if (path.isAbsolute(fPath) && fPath.startsWith(workspaceRoot)) {
                fPath = path.relative(workspaceRoot, fPath);
            }
            return {
                original: f,
                normalized: this.normalizePath(fPath)
            };
        });

        // 1. Exact match
        let match = normalizedLcovFiles.find(item => item.normalized === targetSourceSuffix);
        if (match) {
            return { fileCoverage: match.original, matchType: 'exact', normalizedPath: match.normalized };
        }

        // 2. Suffix match
        match = normalizedLcovFiles.find(item => item.normalized.endsWith(targetSourceSuffix));
        if (match) {
            return { fileCoverage: match.original, matchType: 'suffix', normalizedPath: match.normalized };
        }

        // 3. Basename match
        const targetBasename = path.basename(targetSourceSuffix);
        match = normalizedLcovFiles.find(item => path.basename(item.normalized) === targetBasename);
        if (match) {
            return { fileCoverage: match.original, matchType: 'basename', normalizedPath: match.normalized };
        }

        return undefined;
    }
}
