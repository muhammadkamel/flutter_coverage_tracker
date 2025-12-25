/**
 * Represents coverage data for a specific test suite
 */
export interface SuiteCoverageData {
    /** Name of the test suite (e.g., "downloads_test.dart") */
    suiteName: string;

    /** Full path to the test file */
    suitePath: string;

    /** Total lines in files this suite can cover */
    totalLines: number;

    /** Number of lines covered by this suite */
    coveredLines: number;

    /** Coverage percentage (0-100) */
    coveragePercent: number;

    /** Map of source file paths to their coverage data */
    coveredFiles: Map<string, FileCoverage>;

    /** Feature/module this suite belongs to */
    feature?: string;

    /** Last run timestamp */
    lastRun?: Date;
}

/**
 * Coverage data for a single source file by a test suite
 */
export interface FileCoverage {
    /** Path to the source file */
    filePath: string;

    /** Total executable lines in the file */
    totalLines: number;

    /** Line numbers that are covered */
    coveredLines: number[];

    /** Line numbers that are not covered */
    uncoveredLines: number[];

    /** Coverage percentage for this file (0-100) */
    coveragePercent: number;

    /** Number of times each line was hit */
    hitCounts?: Map<number, number>;
}

/**
 * Aggregated coverage data for all test suites
 */
export interface AggregateSuiteCoverage {
    /** Map of suite names to their coverage data */
    suites: Map<string, SuiteCoverageData>;

    /** Overall project coverage percentage */
    totalCoveragePercent: number;

    /** Total lines across all source files */
    totalLines: number;

    /** Total covered lines */
    totalCoveredLines: number;

    /** Files not covered by any test suite */
    uncoveredFiles: string[];

    /** Timestamp of last analysis */
    analyzedAt: Date;
}

/**
 * Coverage overlap between two test suites
 */
export interface SuiteOverlap {
    /** Name of first suite */
    suite1: string;

    /** Name of second suite */
    suite2: string;

    /** Number of lines covered by both */
    overlapLines: number;

    /** Percentage of suite1's coverage that overlaps with suite2 */
    overlapPercent: number;

    /** Files covered by both suites */
    sharedFiles: string[];
}

/**
 * Configuration for suite coverage tracking
 */
export interface SuiteCoverageConfig {
    /** Enable suite-level coverage tracking */
    enabled: boolean;

    /** How to group test suites */
    groupBy: 'directory' | 'feature' | 'testFile';

    /** Show suite coverage in dashboard */
    showInDashboard: boolean;

    /** Minimum acceptable coverage threshold per suite */
    minThreshold: number;

    /** Feature/module mapping for grouping */
    featureMapping?: Record<string, string[]>;
}

/**
 * Result of running a test suite with coverage
 */
export interface SuiteTestResult {
    /** Name of the test suite */
    suiteName: string;

    /** Path to test file */
    testPath: string;

    /** Path to generated LCOV file */
    lcovPath: string;

    /** Was the test run successful */
    success: boolean;

    /** Test execution time in ms */
    executionTime: number;

    /** Error message if failed */
    error?: string;
}
