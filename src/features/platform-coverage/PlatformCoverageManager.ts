import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LcovParser } from '../../shared/coverage/LcovParser';
import { CoverageResult, FileCoverageData } from '../../shared/coverage/Coverage';

export enum Platform {
    Android = 'android',
    iOS = 'ios',
    Web = 'web',
    Desktop = 'desktop',
    All = 'all'
}

export interface PlatformCoverageData {
    platform: Platform;
    coverageFile: string;
    data: CoverageResult | null;
    lastUpdated: Date | null;
}

/**
 * Manages coverage data across multiple Flutter platforms.
 * Supports Android, iOS, Web, Desktop, and aggregated views.
 */
export class PlatformCoverageManager {
    private platformData: Map<Platform, PlatformCoverageData> = new Map();
    private currentPlatform: Platform = Platform.All;
    private onPlatformChangeEmitter = new vscode.EventEmitter<Platform>();

    public readonly onPlatformChange = this.onPlatformChangeEmitter.event;

    constructor() {
        this.initializePlatforms();
    }

    private initializePlatforms(): void {
        const config = vscode.workspace.getConfiguration('flutterCoverage');
        const paths = config.get<Record<string, string>>('platformCoveragePaths') || this.getDefaultPaths();

        for (const platform of Object.values(Platform)) {
            this.platformData.set(platform, {
                platform,
                coverageFile: paths[platform] || this.getDefaultPathForPlatform(platform),
                data: null,
                lastUpdated: null
            });
        }

        // Set default platform
        const defaultPlatform = config.get<string>('defaultPlatform') || 'all';
        this.currentPlatform = defaultPlatform as Platform;
    }

    private getDefaultPaths(): Record<string, string> {
        return {
            [Platform.Android]: 'coverage/android/lcov.info',
            [Platform.iOS]: 'coverage/ios/lcov.info',
            [Platform.Web]: 'coverage/web/lcov.info',
            [Platform.Desktop]: 'coverage/desktop/lcov.info',
            [Platform.All]: 'coverage/lcov.info'
        };
    }

    private getDefaultPathForPlatform(platform: Platform): string {
        const defaults = this.getDefaultPaths();
        return defaults[platform] || 'coverage/lcov.info';
    }

    public getCurrentPlatform(): Platform {
        return this.currentPlatform;
    }

    public setPlatform(platform: Platform): void {
        this.currentPlatform = platform;
        this.onPlatformChangeEmitter.fire(platform);
    }

    public async loadCoverage(workspaceRoot: string, platform?: Platform): Promise<CoverageResult | null> {
        const targetPlatform = platform || this.currentPlatform;

        if (targetPlatform === Platform.All) {
            return this.loadAggregatedCoverage(workspaceRoot);
        }

        return this.loadPlatformCoverage(workspaceRoot, targetPlatform);
    }

    private async loadPlatformCoverage(workspaceRoot: string, platform: Platform): Promise<CoverageResult | null> {
        const platformData = this.platformData.get(platform);
        if (!platformData) {
            return null;
        }

        const coverageFile = path.join(workspaceRoot, platformData.coverageFile);

        if (!fs.existsSync(coverageFile)) {
            return null;
        }

        try {
            const coverage = await LcovParser.parse(coverageFile);

            // Update cached data
            platformData.data = coverage;
            platformData.lastUpdated = new Date();

            return coverage;
        } catch (error) {
            console.error(`Error loading ${platform} coverage:`, error);
            return null;
        }
    }

    private async loadAggregatedCoverage(workspaceRoot: string): Promise<CoverageResult | null> {
        const coverages: CoverageResult[] = [];

        // Load coverage from all platforms
        for (const platform of [Platform.Android, Platform.iOS, Platform.Web, Platform.Desktop]) {
            const coverage = await this.loadPlatformCoverage(workspaceRoot, platform);
            if (coverage) {
                coverages.push(coverage);
            }
        }

        if (coverages.length === 0) {
            // Fallback to default coverage file
            const defaultData = this.platformData.get(Platform.All);
            if (defaultData) {
                const coverageFile = path.join(workspaceRoot, defaultData.coverageFile);
                if (fs.existsSync(coverageFile)) {
                    return await LcovParser.parse(coverageFile);
                }
            }
            return null;
        }

        // Aggregate coverage data
        return this.aggregateCoverages(coverages);
    }

    private aggregateCoverages(coverages: CoverageResult[]): CoverageResult {
        const fileMap = new Map<string, FileCoverageData[]>();

        // Group files from all platforms
        for (const coverage of coverages) {
            for (const file of coverage.files) {
                if (!fileMap.has(file.file)) {
                    fileMap.set(file.file, []);
                }
                fileMap.get(file.file)!.push(file);
            }
        }

        // Merge file coverage data
        const aggregatedFiles: FileCoverageData[] = [];

        for (const [fileName, fileCoverages] of fileMap.entries()) {
            aggregatedFiles.push(this.mergeFileCoverage(fileName, fileCoverages));
        }

        // Calculate overall statistics
        const totalLinesFound = aggregatedFiles.reduce((sum, f) => sum + f.linesFound, 0);
        const totalLinesHit = aggregatedFiles.reduce((sum, f) => sum + f.linesHit, 0);
        const overallPercentage =
            totalLinesFound > 0 ? Math.round((totalLinesHit / totalLinesFound) * 100 * 10) / 10 : 0;

        return {
            files: aggregatedFiles,
            overall: {
                linesFound: totalLinesFound,
                linesHit: totalLinesHit,
                percentage: overallPercentage
            }
        };
    }

    private mergeFileCoverage(fileName: string, coverages: FileCoverageData[]): FileCoverageData {
        // Union of all covered lines (line is covered if covered on ANY platform)
        const allCoveredLines = new Set<number>();
        const allUncoveredLines = new Set<number>();
        let maxLinesFound = 0;

        for (const coverage of coverages) {
            maxLinesFound = Math.max(maxLinesFound, coverage.linesFound);

            // Track covered lines
            for (let i = 1; i <= coverage.linesFound; i++) {
                if (!coverage.uncoveredLines.includes(i)) {
                    allCoveredLines.add(i);
                } else {
                    allUncoveredLines.add(i);
                }
            }
        }

        // Remove lines that are covered on any platform from uncovered
        for (const coveredLine of allCoveredLines) {
            allUncoveredLines.delete(coveredLine);
        }

        const linesHit = allCoveredLines.size;
        const percentage = maxLinesFound > 0 ? Math.round((linesHit / maxLinesFound) * 100 * 10) / 10 : 0;

        return {
            file: fileName,
            linesFound: maxLinesFound,
            linesHit,
            percentage,
            uncoveredLines: Array.from(allUncoveredLines).sort((a, b) => a - b)
        };
    }

    public getCoveragePath(platform?: Platform): string {
        const targetPlatform = platform || this.currentPlatform;
        const platformData = this.platformData.get(targetPlatform);
        return platformData?.coverageFile || 'coverage/lcov.info';
    }

    public setPlatformCoveragePath(platform: Platform, relativePath: string): void {
        const platformData = this.platformData.get(platform);
        if (platformData) {
            platformData.coverageFile = relativePath;
        }
    }

    public detectPlatformFromCommand(command: string): Platform {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('--platform android') || lowerCommand.includes('-d android')) {
            return Platform.Android;
        }
        if (lowerCommand.includes('--platform ios') || lowerCommand.includes('-d ios')) {
            return Platform.iOS;
        }
        if (lowerCommand.includes('--platform chrome') || lowerCommand.includes('--platform web')) {
            return Platform.Web;
        }
        if (
            lowerCommand.includes('--platform macos') ||
            lowerCommand.includes('--platform windows') ||
            lowerCommand.includes('--platform linux')
        ) {
            return Platform.Desktop;
        }

        return Platform.All;
    }

    public getPlatformIcon(platform: Platform): string {
        switch (platform) {
            case Platform.Android:
                return '📱';
            case Platform.iOS:
                return '🍎';
            case Platform.Web:
                return '🌐';
            case Platform.Desktop:
                return '💻';
            case Platform.All:
                return '📊';
            default:
                return '📋';
        }
    }

    public getPlatformLabel(platform: Platform): string {
        switch (platform) {
            case Platform.Android:
                return 'Android';
            case Platform.iOS:
                return 'iOS';
            case Platform.Web:
                return 'Web';
            case Platform.Desktop:
                return 'Desktop';
            case Platform.All:
                return 'All Platforms';
            default:
                return 'Unknown';
        }
    }

    public getAllPlatforms(): Platform[] {
        return Object.values(Platform);
    }

    public getCoverageForFile(filePath: string): FileCoverageData | undefined {
        const data = this.platformData.get(this.currentPlatform)?.data;
        if (!data) {
            return undefined;
        }

        // Try exact match
        let fileCoverage = data.files.find(f => filePath.endsWith(f.file));

        // Try strict relative match if we can resolve workspace root
        if (!fileCoverage) {
            // Heuristic: check if f.file part is contained in filePath
            fileCoverage = data.files.find(f => filePath.includes(f.file));
        }

        return fileCoverage;
    }

    public dispose(): void {
        this.onPlatformChangeEmitter.dispose();
    }
}
