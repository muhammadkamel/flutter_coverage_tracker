import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import {
    UncoveredLinesExporter,
    TestResultData
} from '../../../../../features/test-runner/utils/UncoveredLinesExporter';

suite('UncoveredLinesExporter Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let showSaveDialogStub: sinon.SinonStub;
    let writeFileSyncStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;

    const mockData: TestResultData[] = [
        {
            name: 'test1',
            success: true,
            coverage: {
                percentage: 80,
                uncoveredLines: [1, 2],
                file: 'lib/file1.dart'
            },
            sourceFile: '/root/lib/file1.dart'
        }
    ];

    setup(() => {
        sandbox = sinon.createSandbox();
        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog' as any);
        writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('export should use provided basePath for defaultUri', async () => {
        const basePath = '/custom/path';
        const defaultFileName = 'report';

        // Mock user selecting a file
        showSaveDialogStub.resolves(vscode.Uri.file('/custom/path/report_uncovered_report.md'));

        await UncoveredLinesExporter.export(mockData, defaultFileName, basePath);

        assert.ok(showSaveDialogStub.calledOnce);
        const options = showSaveDialogStub.firstCall.args[0];
        assert.ok(options.defaultUri.fsPath.includes('/custom/path/report_uncovered_report.md'));

        assert.ok(writeFileSyncStub.calledOnce);
        assert.ok(showInformationMessageStub.calledOnce);
    });

    test('export should fallback to workspace folder if no basePath provided', async () => {
        const workspaceUri = vscode.Uri.file('/workspace');
        (vscode.workspace as any).workspaceFolders = [{ uri: workspaceUri, name: 'w', index: 0 }];

        const defaultFileName = 'report';
        showSaveDialogStub.resolves(vscode.Uri.file('/workspace/report_uncovered_report.md'));

        await UncoveredLinesExporter.export(mockData, defaultFileName);

        assert.ok(showSaveDialogStub.calledOnce);
        const options = showSaveDialogStub.firstCall.args[0];
        // Note: unit-setup.ts joinPath mock uses string concatenation with '/'
        assert.ok(options.defaultUri.fsPath.includes('/workspace/report_uncovered_report.md'));
    });

    test('export should fallback to simple file uri if no workspace and no basePath', async () => {
        (vscode.workspace as any).workspaceFolders = undefined;
        const defaultFileName = 'report';
        showSaveDialogStub.resolves(vscode.Uri.file('/report_uncovered_report.md'));

        await UncoveredLinesExporter.export(mockData, defaultFileName);

        assert.ok(showSaveDialogStub.calledOnce);
        const options = showSaveDialogStub.firstCall.args[0];
        assert.ok(options.defaultUri.fsPath.endsWith('report_uncovered_report.md'));
    });

    test('export should do nothing if save dialog is cancelled', async () => {
        showSaveDialogStub.resolves(undefined);

        await UncoveredLinesExporter.export(mockData, 'report');

        assert.ok(showSaveDialogStub.calledOnce);
        assert.ok(writeFileSyncStub.notCalled);
    });

    test('export should show error message if write fails', async () => {
        showSaveDialogStub.resolves(vscode.Uri.file('/path/to/save.md'));
        writeFileSyncStub.throws(new Error('Write error'));

        await UncoveredLinesExporter.export(mockData, 'report');

        assert.ok(vscode.window.showErrorMessage);
        // We mocked showErrorMessage via sinon stub on the object instance, so we check the stub
        assert.ok(showErrorMessageStub.calledOnce);
        assert.ok(showErrorMessageStub.firstCall.args[0].includes('Failed to save report'));
    });

    test('generateMarkdown should format with vertical layout and bold labels', async () => {
        const testData: TestResultData[] = [
            {
                name: 'test1',
                success: true,
                coverage: {
                    percentage: 85.5,
                    uncoveredLines: [10, 20, 30],
                    file: 'lib/example.dart'
                },
                sourceFile: '/root/lib/example.dart'
            }
        ];

        showSaveDialogStub.resolves(vscode.Uri.file('/test/output.md'));

        await UncoveredLinesExporter.export(testData, 'test');

        assert.ok(writeFileSyncStub.calledOnce);
        const content = writeFileSyncStub.firstCall.args[1];

        // Verify header
        assert.ok(content.includes('# Uncovered Lines Report'));
        assert.ok(content.includes('**Generated:**'));

        // Verify vertical format with bold labels
        assert.ok(content.includes('**File**: example.dart'));
        assert.ok(content.includes('**Uncovered lines**: 10, 20, 30'));
        assert.ok(content.includes('**Test Coverage Percentage**: 85.5%'));

        // Verify separator between entries
        assert.ok(content.includes('---'));

        // Verify footer
        assert.ok(content.includes('*Generated by Flutter Coverage Tracker*'));

        // Verify it's NOT using table format
        assert.ok(!content.includes('| File |'));
        assert.ok(!content.includes('|------|'));
    });

    test('generateMarkdown should handle multiple files with separators', async () => {
        const testData: TestResultData[] = [
            {
                name: 'test1',
                success: true,
                coverage: {
                    percentage: 90,
                    uncoveredLines: [5, 15],
                    file: 'lib/file1.dart'
                },
                sourceFile: '/root/lib/file1.dart'
            },
            {
                name: 'test2',
                success: true,
                coverage: {
                    percentage: 100,
                    uncoveredLines: [],
                    file: 'lib/file2.dart'
                },
                sourceFile: '/root/lib/file2.dart'
            }
        ];

        showSaveDialogStub.resolves(vscode.Uri.file('/test/output.md'));

        await UncoveredLinesExporter.export(testData, 'test');

        const content = writeFileSyncStub.firstCall.args[1];

        // Verify both files are present
        assert.ok(content.includes('**File**: file1.dart'));
        assert.ok(content.includes('**File**: file2.dart'));

        // Verify both coverage percentages
        assert.ok(content.includes('**Test Coverage Percentage**: 90%'));
        assert.ok(content.includes('**Test Coverage Percentage**: 100%'));

        // Verify first file has uncovered lines
        assert.ok(content.includes('**Uncovered lines**: 5, 15'));

        // Verify second file shows "None" for uncovered lines
        assert.ok(content.includes('**Uncovered lines**: None'));

        // Count separators (should have one per file)
        const separatorCount = (content.match(/---/g) || []).length;
        assert.strictEqual(separatorCount, 2);
    });

    test('generateMarkdown should handle file without coverage data', async () => {
        const testData: TestResultData[] = [
            {
                name: 'test_without_coverage',
                success: true,
                coverage: null
            }
        ];

        showSaveDialogStub.resolves(vscode.Uri.file('/test/output.md'));

        await UncoveredLinesExporter.export(testData, 'test');

        const content = writeFileSyncStub.firstCall.args[1];

        assert.ok(content.includes('**File**: test_without_coverage'));
        assert.ok(content.includes('**Uncovered lines**: None'));
        assert.ok(content.includes('**Test Coverage Percentage**: N/A'));
    });

    test('generateMarkdown should use sourceFile basename when available', async () => {
        const testData: TestResultData[] = [
            {
                name: 'some_test_name',
                success: true,
                coverage: {
                    percentage: 75,
                    uncoveredLines: [1],
                    file: 'lib/my_widget.dart'
                },
                sourceFile: '/very/long/path/to/my_widget.dart'
            }
        ];

        showSaveDialogStub.resolves(vscode.Uri.file('/test/output.md'));

        await UncoveredLinesExporter.export(testData, 'test');

        const content = writeFileSyncStub.firstCall.args[1];

        // Should use basename from sourceFile, not the test name
        assert.ok(content.includes('**File**: my_widget.dart'));
        assert.ok(!content.includes('some_test_name'));
    });

    test('generateMarkdown should use test name when sourceFile is not available', async () => {
        const testData: TestResultData[] = [
            {
                name: 'my_test_name',
                success: true,
                coverage: {
                    percentage: 80,
                    uncoveredLines: [],
                    file: 'lib/widget.dart'
                }
            }
        ];

        showSaveDialogStub.resolves(vscode.Uri.file('/test/output.md'));

        await UncoveredLinesExporter.export(testData, 'test');

        const content = writeFileSyncStub.firstCall.args[1];

        // Should use test name when sourceFile is missing
        assert.ok(content.includes('**File**: my_test_name'));
    });
});
