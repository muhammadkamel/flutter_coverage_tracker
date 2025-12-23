import * as path from 'path';
import { FileCoverageData } from './coverageParser';

/**
 * Normalizes a file path to use forward slashes.
 */
export function normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
}

/**
 * Deduces the expected source file path from a test file path.
 * e.g., 'test/foo_test.dart' -> 'lib/foo.dart'
 */
export function deduceSourceFilePath(testFilePath: string, workspaceRoot: string): string | undefined {
    const relativeTestPath = path.relative(workspaceRoot, testFilePath);
    const normalizedTestPath = normalizePath(relativeTestPath);

    if (normalizedTestPath.startsWith('test/')) {
        const stripPrefix = normalizedTestPath.substring(5); // remove 'test/'
        if (stripPrefix.endsWith('_test.dart')) {
            return 'lib/' + stripPrefix.substring(0, stripPrefix.length - 10) + '.dart';
        }
    }
    return undefined;
}

export interface MatchResult {
    fileCoverage: FileCoverageData;
    matchType: 'exact' | 'suffix' | 'basename';
    normalizedPath: string;
}

/**
 * Finds the matching coverage entry for a given target source file (e.g. 'lib/foo.dart').
 */
export function findCoverageEntry(
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
            normalized: normalizePath(fPath)
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
