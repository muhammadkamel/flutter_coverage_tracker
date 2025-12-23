"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLcovFile = parseLcovFile;
const fs = require("fs");
function parseLcovFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            let totalLinesFound = 0;
            let totalLinesHit = 0;
            const files = [];
            let currentFile = '';
            let currentLF = 0;
            let currentLH = 0;
            let currentUncoveredLines = [];
            const lines = data.split('\n');
            for (const line of lines) {
                if (line.startsWith('SF:')) {
                    currentFile = line.substring(3).trim();
                }
                else if (line.startsWith('DA:')) {
                    // DA:line_number,hit_count
                    const parts = line.substring(3).split(',');
                    if (parts.length === 2) {
                        const lineNum = parseInt(parts[0], 10);
                        const hitCount = parseInt(parts[1], 10);
                        if (hitCount === 0) {
                            currentUncoveredLines.push(lineNum);
                        }
                    }
                }
                else if (line.startsWith('LF:')) {
                    currentLF = parseInt(line.substring(3), 10);
                }
                else if (line.startsWith('LH:')) {
                    currentLH = parseInt(line.substring(3), 10);
                }
                else if (line === 'end_of_record') {
                    const percentage = currentLF === 0 ? 0 : (currentLH / currentLF) * 100;
                    files.push({
                        file: currentFile,
                        linesFound: currentLF,
                        linesHit: currentLH,
                        percentage: parseFloat(percentage.toFixed(2)),
                        uncoveredLines: currentUncoveredLines.sort((a, b) => a - b)
                    });
                    totalLinesFound += currentLF;
                    totalLinesHit += currentLH;
                    // Reset for next record
                    currentFile = '';
                    currentLF = 0;
                    currentLH = 0;
                    currentUncoveredLines = [];
                }
            }
            const overallPercentage = totalLinesFound === 0 ? 0 : (totalLinesHit / totalLinesFound) * 100;
            resolve({
                overall: {
                    linesFound: totalLinesFound,
                    linesHit: totalLinesHit,
                    percentage: parseFloat(overallPercentage.toFixed(2))
                },
                files: files
            });
        });
    });
}
//# sourceMappingURL=coverageParser.js.map