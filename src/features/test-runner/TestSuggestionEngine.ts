import { FileCoverageData } from '../../shared/coverage/Coverage';
import { TestSuggestion } from './interfaces';
import * as path from 'path';

/**
 * Engine for analyzing coverage data and generating prioritized test suggestions.
 */
export class TestSuggestionEngine {

    /**
     * Analyzes coverage data and returns prioritized test suggestions.
     * @param coverageFiles Array of file coverage data
     * @param workspaceRoot Workspace root path for resolving source files
     * @param topN Maximum number of suggestions to return (default: 10)
     * @returns Array of test suggestions sorted by priority
     */
    public static analyzeCoverage(
        coverageFiles: FileCoverageData[],
        workspaceRoot: string,
        topN: number = 10
    ): TestSuggestion[] {
        const suggestions: TestSuggestion[] = [];

        for (const fileData of coverageFiles) {
            // Skip files with 100% coverage
            if (fileData.percentage >= 100) {
                continue;
            }

            const priorityScore = this.calculatePriority(fileData);
            const complexity = this.estimateComplexity(fileData);
            const priority = this.categorizePriority(priorityScore);
            const fileName = path.basename(fileData.file);
            const suggestionTexts = this.generateSuggestions(fileData);

            suggestions.push({
                file: fileData.file,
                fileName,
                priority,
                priorityScore,
                uncoveredCount: fileData.uncoveredLines.length,
                coveragePercentage: fileData.percentage,
                complexity,
                suggestions: suggestionTexts,
                sourceFile: fileData.file
            });
        }

        // Sort by priority score (descending) and return top N
        return suggestions
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .slice(0, topN);
    }

    /**
     * Calculates priority score based on multiple factors.
     * Higher score = higher priority.
     */
    private static calculatePriority(file: FileCoverageData): number {
        const uncoveredWeight = 0.4;
        const coverageWeight = 0.3;
        const sizeWeight = 0.3;

        // Normalize uncovered lines (cap at 100 for scoring)
        const uncoveredScore = Math.min(file.uncoveredLines.length, 100);

        // Invert coverage percentage (100% - actual coverage)
        const coverageGap = 100 - file.percentage;

        // Normalize file size (lines found / 100)
        const sizeScore = Math.min(file.linesFound / 100, 10);

        const score = (uncoveredScore * uncoveredWeight) +
            (coverageGap * coverageWeight) +
            (sizeScore * sizeWeight);

        return parseFloat(score.toFixed(2));
    }

    /**
     * Categorizes priority score into high/medium/low.
     */
    private static categorizePriority(score: number): 'high' | 'medium' | 'low' {
        if (score >= 40) { return 'high'; }
        if (score >= 15) { return 'medium'; }
        return 'low';
    }

    /**
     * Estimates complexity based on file size.
     */
    private static estimateComplexity(file: FileCoverageData): 'simple' | 'moderate' | 'complex' {
        if (file.linesFound > 200) { return 'complex'; }
        if (file.linesFound > 100) { return 'moderate'; }
        return 'simple';
    }

    /**
     * Generates actionable suggestion text based on file data.
     */
    private static generateSuggestions(file: FileCoverageData): string[] {
        const suggestions: string[] = [];
        const fileName = path.basename(file.file);
        const fileType = this.detectFileType(fileName);

        // Base suggestion
        suggestions.push(`Add tests for ${file.uncoveredLines.length} uncovered lines`);

        // Coverage improvement suggestion
        const coverageNeeded = 100 - file.percentage;
        if (coverageNeeded > 50) {
            suggestions.push(`Increase coverage by ${coverageNeeded.toFixed(0)}% to reach 100%`);
        } else {
            suggestions.push(`Add ${Math.ceil(coverageNeeded * file.linesFound / 100)} more test cases`);
        }

        // File-type specific suggestions
        switch (fileType) {
            case 'widget':
                suggestions.push('Test widget rendering, interactions, and state changes');
                break;
            case 'repository':
                suggestions.push('Test data operations, error handling, and edge cases');
                break;
            case 'usecase':
            case 'service':
                suggestions.push('Test business logic, parameter validation, and error flows');
                break;
            case 'controller':
            case 'cubit':
            case 'bloc':
                suggestions.push('Test state transitions, events, and output states');
                break;
            case 'model':
            case 'entity':
                suggestions.push('Test serialization, equality, and edge cases');
                break;
            default:
                suggestions.push('Review uncovered code and add appropriate test coverage');
        }

        return suggestions;
    }

    /**
     * Detects file type from filename patterns.
     */
    private static detectFileType(fileName: string): string {
        const lower = fileName.toLowerCase();

        if (lower.includes('widget')) { return 'widget'; }
        if (lower.includes('repository')) { return 'repository'; }
        if (lower.includes('usecase') || lower.includes('use_case')) { return 'usecase'; }
        if (lower.includes('service')) { return 'service'; }
        if (lower.includes('controller')) { return 'controller'; }
        if (lower.includes('cubit')) { return 'cubit'; }
        if (lower.includes('bloc')) { return 'bloc'; }
        if (lower.includes('model')) { return 'model'; }
        if (lower.includes('entity')) { return 'entity'; }

        return 'unknown';
    }
}
