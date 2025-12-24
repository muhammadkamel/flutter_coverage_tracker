
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { UncoveredLinesExporter, TestResultData } from '../../../../../features/test-runner/utils/UncoveredLinesExporter';

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
});
