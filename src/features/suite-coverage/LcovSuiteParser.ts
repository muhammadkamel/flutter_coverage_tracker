import * as fs from 'fs';
import * as path from 'path';
import { FileCoverage } from './types';

/**
 * Parser for LCOV coverage files with suite-level tracking
 */
export class LcovSuiteParser {
    /**
     * Parse an LCOV file and extract coverage data
     */
    public parseLcov(lcovPath: string): Map<string, FileCoverage> {
        if (!fs.existsSync(lcovPath)) {
            return new Map();
        }

        const lcovContent = fs.readFileSync(lcovPath, 'utf8');
        return this.parseLcovContent(lcovContent);
    }

    /**
     * Parse LCOV content string
     */
    public parseLcovContent(content: string): Map<string, FileCoverage> {
        const fileCoverageMap = new Map<string, FileCoverage>();
        const lines = content.split('\n');

        let currentFile: string | null = null;
        let currentCoveredLines: number[] = [];
        let currentUncoveredLines: number[] = [];
        let currentHitCounts = new Map<number, number>();
        let totalLines = 0;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('SF:')) {
                // Source File - start of new file section
                currentFile = trimmed.substring(3);
                currentCoveredLines = [];
                currentUncoveredLines = [];
                currentHitCounts = new Map();
                totalLines = 0;
            } else if (trimmed.startsWith('DA:')) {
                // Data - line coverage information
                // Format: DA:<line number>,<hit count>
                const parts = trimmed.substring(3).split(',');
                const lineNum = parseInt(parts[0]);
                const hitCount = parseInt(parts[1]);

                totalLines++;
                currentHitCounts.set(lineNum, hitCount);

                if (hitCount > 0) {
                    currentCoveredLines.push(lineNum);
                } else {
                    currentUncoveredLines.push(lineNum);
                }
            } else if (trimmed === 'end_of_record' && currentFile) {
                // End of current file record
                const coveredCount = currentCoveredLines.length;
                const coveragePercent = totalLines > 0 ? (coveredCount / totalLines) * 100 : 0;

                fileCoverageMap.set(currentFile, {
                    filePath: currentFile,
                    totalLines,
                    coveredLines: [...currentCoveredLines],
                    uncoveredLines: [...currentUncoveredLines],
                    coveragePercent,
                    hitCounts: new Map(currentHitCounts)
                });

                currentFile = null;
            }
        }

        return fileCoverageMap;
    }

    /**
     * Merge multiple LCOV coverage maps
     */
    public mergeCoverage(maps: Map<string, FileCoverage>[]): Map<string, FileCoverage> {
        const merged = new Map<string, FileCoverage>();

        for (const map of maps) {
            for (const [filePath, coverage] of map.entries()) {
                if (merged.has(filePath)) {
                    // Merge coverage for same file
                    const existing = merged.get(filePath)!;
                    merged.set(filePath, this.mergeFileCoverage(existing, coverage));
                } else {
                    merged.set(filePath, { ...coverage });
                }
            }
        }

        return merged;
    }

    /**
     * Merge coverage data for a single file
     */
    private mergeFileCoverage(coverage1: FileCoverage, coverage2: FileCoverage): FileCoverage {
        const allCoveredLines = new Set([...coverage1.coveredLines, ...coverage2.coveredLines]);

        const allUncoveredLines = new Set([...coverage1.uncoveredLines, ...coverage2.uncoveredLines]);

        // Remove lines that are covered from uncovered set
        for (const line of allCoveredLines) {
            allUncoveredLines.delete(line);
        }

        const mergedHitCounts = new Map<number, number>();

        // Merge hit counts
        if (coverage1.hitCounts) {
            for (const [line, count] of coverage1.hitCounts) {
                mergedHitCounts.set(line, count);
            }
        }

        if (coverage2.hitCounts) {
            for (const [line, count] of coverage2.hitCounts) {
                const existing = mergedHitCounts.get(line) || 0;
                mergedHitCounts.set(line, existing + count);
            }
        }

        const coveredLines = Array.from(allCoveredLines).sort((a, b) => a - b);
        const uncoveredLines = Array.from(allUncoveredLines).sort((a, b) => a - b);
        const totalLines = coveredLines.length + uncoveredLines.length;
        const coveragePercent = totalLines > 0 ? (coveredLines.length / totalLines) * 100 : 0;

        return {
            filePath: coverage1.filePath,
            totalLines,
            coveredLines,
            uncoveredLines,
            coveragePercent,
            hitCounts: mergedHitCounts
        };
    }

    /**
     * Filter coverage to only include specific files
     */
    public filterByFiles(coverage: Map<string, FileCoverage>, filePatterns: string[]): Map<string, FileCoverage> {
        const filtered = new Map<string, FileCoverage>();

        for (const [filePath, data] of coverage.entries()) {
            if (this.matchesAnyPattern(filePath, filePatterns)) {
                filtered.set(filePath, data);
            }
        }

        return filtered;
    }

    /**
     * Check if a file path matches any of the given patterns
     */
    private matchesAnyPattern(filePath: string, patterns: string[]): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');

        for (const pattern of patterns) {
            const normalizedPattern = pattern.replace(/\\/g, '/');

            // Convert glob pattern to regex
            const regexPattern = normalizedPattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

            const regex = new RegExp(regexPattern);
            if (regex.test(normalizedPath)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate total coverage across all files
     */
    public calculateTotalCoverage(coverage: Map<string, FileCoverage>): {
        totalLines: number;
        coveredLines: number;
        coveragePercent: number;
    } {
        let totalLines = 0;
        let totalCovered = 0;

        for (const data of coverage.values()) {
            totalLines += data.totalLines;
            totalCovered += data.coveredLines.length;
        }

        const coveragePercent = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;

        return {
            totalLines,
            coveredLines: totalCovered,
            coveragePercent
        };
    }
}
