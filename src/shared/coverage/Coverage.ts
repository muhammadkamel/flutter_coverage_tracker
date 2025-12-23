export interface CoverageSummary {
    linesFound: number;
    linesHit: number;
    percentage: number;
}

export interface FileCoverageData {
    file: string;
    linesFound: number;
    linesHit: number;
    percentage: number;
    uncoveredLines: number[];
}

export interface CoverageResult {
    overall: CoverageSummary;
    files: FileCoverageData[];
}
