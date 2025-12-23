"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const coverageParser_1 = require("../../coverageParser");
const fs = require("fs");
const os = require("os");
suite('Coverage Parser Test Suite', () => {
    let tempDir;
    let tempFile;
    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        tempFile = path.join(tempDir, 'lcov.info');
    });
    teardown(() => {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    });
    test('Parses valid lcov file correctly', async () => {
        const content = `
SF:lib/main.dart
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record
SF:lib/utils.dart
DA:1,1
DA:2,1
LF:2
LH:2
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.overall.linesFound, 4);
        assert.strictEqual(result.overall.linesHit, 3);
        assert.strictEqual(result.overall.percentage, 75.00);
    });
    test('Parses empty lcov file correctly', async () => {
        fs.writeFileSync(tempFile, '');
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.overall.linesFound, 0);
        assert.strictEqual(result.overall.linesHit, 0);
        assert.strictEqual(result.overall.percentage, 0);
    });
    test('Handles file read error', async () => {
        try {
            await (0, coverageParser_1.parseLcovFile)('non_existent_file.info');
            assert.fail('Should have thrown an error');
        }
        catch (err) {
            assert.ok(err);
        }
    });
    test('Parses file with garbage/mixed content correctly', async () => {
        const content = `
some random text
SF:lib/main.dart
garbage
DA:1,1
LF:5
LH:3
end_of_record
`;
        fs.writeFileSync(tempFile, content);
        const result = await (0, coverageParser_1.parseLcovFile)(tempFile);
        assert.strictEqual(result.overall.linesFound, 5);
        assert.strictEqual(result.overall.linesHit, 3);
        assert.strictEqual(result.overall.percentage, 60.00);
    });
});
//# sourceMappingURL=coverageParser.test.js.map