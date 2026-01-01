import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LcovSuiteParser } from './LcovSuiteParser';
import { SuiteCoverageData, FileCoverage, AggregateSuiteCoverage, SuiteOverlap, SuiteCoverageConfig } from './types';

/**
 * Manages coverage tracking at the test suite level
 */
export class SuiteCoverageManager {
    private parser: LcovSuiteParser;
    private suiteCoverageCache: Map<string, SuiteCoverageData>;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.parser = new LcovSuiteParser();
        this.suiteCoverageCache = new Map();
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Parse coverage for a single test suite
     */
    public async parseSuiteCoverage(
        suiteName: string,
        suitePath: string,
        lcovPath: string
    ): Promise<SuiteCoverageData> {
        const coverage = this.parser.parseLcov(lcovPath);
        const totals = this.parser.calculateTotalCoverage(coverage);

        const suiteData: SuiteCoverageData = {
            suiteName,
            suitePath,
            totalLines: totals.totalLines,
            coveredLines: totals.coveredLines,
            coveragePercent: totals.coveragePercent,
            coveredFiles: coverage,
            lastRun: new Date()
        };

        this.suiteCoverageCache.set(suiteName, suiteData);
        return suiteData;
    }

    /**
     * Parse coverage for multiple test suites
     */
    public async parseAllSuites(
        suiteResults: Array<{ suiteName: string; suitePath: string; lcovPath: string }>
    ): Promise<Map<string, SuiteCoverageData>> {
        const suites = new Map<string, SuiteCoverageData>();

        for (const result of suiteResults) {
            try {
                const suiteData = await this.parseSuiteCoverage(result.suiteName, result.suitePath, result.lcovPath);
                suites.set(result.suiteName, suiteData);
            } catch (error) {
                console.error(`Failed to parse coverage for ${result.suiteName}:`, error);
            }
        }

        this.suiteCoverageCache = suites;
        return suites;
    }

    /**
     * Get coverage data for a specific suite
     */
    public getSuiteCoverage(suiteName: string): SuiteCoverageData | undefined {
        return this.suiteCoverageCache.get(suiteName);
    }

    /**
     * Get all test suites that cover a specific source file
     */
    public getSuitesForFile(filePath: string): SuiteCoverageData[] {
        const normalizedPath = path.normalize(filePath);
        const suites: SuiteCoverageData[] = [];

        for (const suite of this.suiteCoverageCache.values()) {
            for (const [coveredFile, _] of suite.coveredFiles) {
                if (path.normalize(coveredFile) === normalizedPath) {
                    suites.push(suite);
                    break;
                }
            }
        }

        return suites.sort((a, b) => {
            if (b.coveragePercent !== a.coveragePercent) {
                return b.coveragePercent - a.coveragePercent;
            }
            return b.coveredLines - a.coveredLines;
        });
    }

    /**
     * Get files covered by a specific suite
     */
    public getFilesForSuite(suiteName: string): FileCoverage[] {
        const suite = this.suiteCoverageCache.get(suiteName);
        if (!suite) {
            return [];
        }

        return Array.from(suite.coveredFiles.values());
    }

    /**
     * Calculate coverage overlap between two suites
     */
    public calculateOverlap(suite1Name: string, suite2Name: string): SuiteOverlap | null {
        const suite1 = this.suiteCoverageCache.get(suite1Name);
        const suite2 = this.suiteCoverageCache.get(suite2Name);

        if (!suite1 || !suite2) {
            return null;
        }

        const sharedFiles: string[] = [];
        let overlapLines = 0;

        for (const [filePath, coverage1] of suite1.coveredFiles) {
            const coverage2 = suite2.coveredFiles.get(filePath);
            if (coverage2) {
                sharedFiles.push(filePath);

                // Count overlapping covered lines
                const covered1 = new Set(coverage1.coveredLines);
                const covered2 = new Set(coverage2.coveredLines);

                for (const line of covered1) {
                    if (covered2.has(line)) {
                        overlapLines++;
                    }
                }
            }
        }

        const overlapPercent = suite1.coveredLines > 0 ? (overlapLines / suite1.coveredLines) * 100 : 0;

        return {
            suite1: suite1Name,
            suite2: suite2Name,
            overlapLines,
            overlapPercent,
            sharedFiles
        };
    }

    /**
     * Group test suites by directory
     */
    public groupSuitesByDirectory(): Map<string, SuiteCoverageData[]> {
        const grouped = new Map<string, SuiteCoverageData[]>();

        for (const suite of this.suiteCoverageCache.values()) {
            const dirName = path.dirname(suite.suitePath);
            const relativePath = path.relative(this.workspaceRoot, dirName);

            if (!grouped.has(relativePath)) {
                grouped.set(relativePath, []);
            }
            grouped.get(relativePath)!.push(suite);
        }

        // Sort suites within each group by coverage
        for (const suites of grouped.values()) {
            suites.sort((a, b) => b.coveragePercent - a.coveragePercent);
        }

        return grouped;
    }

    /**
     * Group test suites by feature (based on config mapping)
     */
    public groupSuitesByFeature(featureMapping: Record<string, string[]>): Map<string, SuiteCoverageData[]> {
        const grouped = new Map<string, SuiteCoverageData[]>();

        for (const suite of this.suiteCoverageCache.values()) {
            const relativePath = path.relative(this.workspaceRoot, suite.suitePath);

            let matched = false;
            for (const [featureName, patterns] of Object.entries(featureMapping)) {
                if (this.matchesPatterns(relativePath, patterns)) {
                    if (!grouped.has(featureName)) {
                        grouped.set(featureName, []);
                    }
                    grouped.get(featureName)!.push(suite);
                    suite.feature = featureName;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                const uncategorized = 'Uncategorized';
                if (!grouped.has(uncategorized)) {
                    grouped.set(uncategorized, []);
                }
                grouped.get(uncategorized)!.push(suite);
            }
        }

        return grouped;
    }

    /**
     * Get aggregate coverage across all suites
     */
    public getAggregateCoverage(): AggregateSuiteCoverage {
        const allCoverages = Array.from(this.suiteCoverageCache.values()).map(suite => suite.coveredFiles);

        const merged = this.parser.mergeCoverage(allCoverages);
        const totals = this.parser.calculateTotalCoverage(merged);

        // Find files not covered by any suite
        const allSourceFiles = this.getAllSourceFiles();
        const coveredFileSet = new Set(merged.keys());
        const uncoveredFiles = allSourceFiles.filter(f => !coveredFileSet.has(f));

        return {
            suites: new Map(this.suiteCoverageCache),
            totalCoveragePercent: totals.coveragePercent,
            totalLines: totals.totalLines,
            totalCoveredLines: totals.coveredLines,
            uncoveredFiles,
            analyzedAt: new Date()
        };
    }

    /**
     * Get suites with coverage below threshold
     */
    public getLowCoverageSuites(threshold: number): SuiteCoverageData[] {
        return Array.from(this.suiteCoverageCache.values())
            .filter(suite => suite.coveragePercent < threshold)
            .sort((a, b) => a.coveragePercent - b.coveragePercent);
    }

    /**
     * Get top N suites by coverage
     */
    public getTopSuites(n: number): SuiteCoverageData[] {
        return Array.from(this.suiteCoverageCache.values())
            .sort((a, b) => b.coveragePercent - a.coveragePercent)
            .slice(0, n);
    }

    /**
     * Clear cached coverage data
     */
    public clearCache(): void {
        this.suiteCoverageCache.clear();
    }

    /**
     * Get configuration from VS Code settings
     */
    public getConfig(): SuiteCoverageConfig {
        const config = vscode.workspace.getConfiguration('flutterCoverage.suiteCoverage');

        return {
            enabled: config.get<boolean>('enabled', true),
            groupBy: config.get<'directory' | 'feature' | 'testFile'>('groupBy', 'directory'),
            showInDashboard: config.get<boolean>('showInDashboard', true),
            minThreshold: config.get<number>('minThreshold', 80),
            featureMapping: config.get<Record<string, string[]>>('featureMapping')
        };
    }

    // Helper methods

    private matchesPatterns(filePath: string, patterns: string[]): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');

        for (const pattern of patterns) {
            const normalizedPattern = pattern.replace(/\\/g, '/');
            const regexPattern = normalizedPattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.');

            const regex = new RegExp('^' + regexPattern + '$');
            if (regex.test(normalizedPath)) {
                return true;
            }
        }

        return false;
    }

    private getAllSourceFiles(): string[] {
        // This would need to scan the project for Dart files
        // For now, return files from coverage cache
        const files = new Set<string>();

        for (const suite of this.suiteCoverageCache.values()) {
            for (const filePath of suite.coveredFiles.keys()) {
                files.add(filePath);
            }
        }

        return Array.from(files);
    }
}
