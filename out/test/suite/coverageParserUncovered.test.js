"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const coverageParser_1 = require("../../coverageParser");
suite('Coverage Parser - Uncovered Lines Test Suite', () => {
    let tempFile;
    setup(() => {
        tempFile = path.join(os.tmpdir(), 'test-lcov-uncovered.info');
    });
    teardown(() => {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    });
    test('Parses uncovered lines correctly', async () => {
        const content = `
SF:lib/main.dart
DA:1,1
DA:2,0
DA:3,1
DA:4,0
DA:5,0
LF:5
LH:2
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.files.length, 1);
        assert.strictEqual(result.files[0].uncoveredLines.length, 3);
        assert.deepStrictEqual(result.files[0].uncoveredLines, [2, 4, 5]);
    });
    test('Returns empty array when all lines are covered', async () => {
        const content = `
SF:lib/covered.dart
DA:1,5
DA:2,3
DA:3,10
LF:3
LH:3
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.files[0].uncoveredLines.length, 0);
        assert.strictEqual(result.files[0].percentage, 100);
    });
    test('Sorts uncovered lines in ascending order', async () => {
        const content = `
SF:lib/test.dart
DA:10,0
DA:5,1
DA:15,0
DA:3,0
DA:20,1
LF:5
LH:2
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.deepStrictEqual(result.files[0].uncoveredLines, [3, 10, 15]);
    });
    test('Handles multiple files with uncovered lines', async () => {
        const content = `
SF:lib/file1.dart
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record
SF:lib/file2.dart
DA:10,0
DA:11,1
DA:12,0
LF:3
LH:1
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.files.length, 2);
        assert.deepStrictEqual(result.files[0].uncoveredLines, [2]);
        assert.deepStrictEqual(result.files[1].uncoveredLines, [10, 12]);
    });
    test('Ignores lines with hit count greater than 0', async () => {
        const content = `
SF:lib/main.dart
DA:1,100
DA:2,0
DA:3,1
DA:4,0
DA:5,50
LF:5
LH:3
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.deepStrictEqual(result.files[0].uncoveredLines, [2, 4]);
    });
    test('Handles DA lines with invalid format gracefully', async () => {
        const content = `
SF:lib/main.dart
DA:1,1
DA:invalid
DA:2,0
DA:3
LF:2
LH:1
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        // Should only parse valid DA lines
        assert.deepStrictEqual(result.files[0].uncoveredLines, [2]);
    });
    test('Overall coverage aggregates correctly with uncovered lines', async () => {
        const content = `
SF:lib/file1.dart
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record
SF:lib/file2.dart
DA:1,0
DA:2,0
DA:3,1
LF:3
LH:1
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.overall.linesFound, 5);
        assert.strictEqual(result.overall.linesHit, 2);
        assert.strictEqual(result.overall.percentage, 40.00);
    });
});
//# sourceMappingURL=coverageParserUncovered.test.js.map