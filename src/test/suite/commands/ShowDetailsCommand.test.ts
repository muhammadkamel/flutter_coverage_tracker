import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ShowDetailsCommand } from '../../../commands/ShowDetailsCommand';
import { LcovParser } from '../../../shared/coverage/LcovParser';

suite('ShowDetailsCommand Test Suite', () => {
    let command: ShowDetailsCommand;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        command = new ShowDetailsCommand();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'show-details-'));
    });

    teardown(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    test('should display coverage information when file exists', async () => {
        const lcovContent = `SF:src/test.ts
FN:1,testFunc
FNF:1
FNH:1
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage.lcov');
        fs.writeFileSync(lcovPath, lcovContent);

        const mockConfig = {
            get: sinon.stub().returns('coverage.lcov')
        };

        const workspaceFolders = [{ uri: vscode.Uri.file(tempDir), name: 'test', index: 0 }];

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);
        sandbox.stub(fs, 'existsSync').callsFake((p) => p === lcovPath);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 50,
                linesHit: 1,
                linesFound: 2
            },
            files: []
        });

        const messageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await command.execute();

        assert.ok(messageStub.calledOnce);
        const messageCall = messageStub.getCall(0);
        assert.ok(messageCall.args[0].includes('50%'));
    });

    test('should open report when user clicks "Open Report"', async () => {
        const lcovContent = `SF:src/test.ts
FN:1,testFunc
FNF:1
FNH:1
DA:1,1
LF:1
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage.lcov');
        fs.writeFileSync(lcovPath, lcovContent);

        const mockConfig = {
            get: sinon.stub().returns('coverage.lcov')
        };

        const workspaceFolders = [{ uri: vscode.Uri.file(tempDir), name: 'test', index: 0 }];

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);
        sandbox.stub(fs, 'existsSync').callsFake((p) => p === lcovPath);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 100,
                linesHit: 1,
                linesFound: 1
            },
            files: []
        });

        sandbox.stub(vscode.window, 'showInformationMessage').resolves('Open Report' as any);
        const openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
        const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument').resolves({} as any);

        await command.execute();

        assert.ok(openTextDocumentStub.calledOnce);
        assert.ok(showTextDocumentStub.calledOnce);
    });

    test('should show error message when coverage file parsing fails', async () => {
        const lcovPath = path.join(tempDir, 'coverage.lcov');
        fs.writeFileSync(lcovPath, 'invalid content');

        const mockConfig = {
            get: sinon.stub().returns('coverage.lcov')
        };

        const workspaceFolders = [{ uri: vscode.Uri.file(tempDir), name: 'test', index: 0 }];

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);
        sandbox.stub(fs, 'existsSync').callsFake((p) => p === lcovPath);
        sandbox.stub(LcovParser, 'parse').rejects(new Error('Parse failed'));

        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await command.execute();

        assert.ok(errorStub.calledOnce);
        assert.ok(errorStub.getCall(0).args[0].includes('Failed'));
    });

    test('should show warning when coverage file does not exist', async () => {
        const mockConfig = {
            get: sinon.stub().returns('coverage.lcov')
        };

        const workspaceFolders = [{ uri: vscode.Uri.file(tempDir), name: 'test', index: 0 }];

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);
        sandbox.stub(fs, 'existsSync').returns(false);

        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);

        await command.execute();

        assert.ok(warningStub.calledOnce);
        assert.ok(warningStub.getCall(0).args[0].includes('No coverage file found'));
    });

    test('should return early when no workspace folder is open', async () => {
        const mockConfig = {
            get: sinon.stub().returns('coverage.lcov')
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

        const messageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage');

        await command.execute();

        assert.ok(!messageStub.called);
        assert.ok(!warningStub.called);
    });

    test('should use default coverage path when config is not set', async () => {
        const lcovContent = `SF:src/test.ts
DA:1,1
LF:1
LH:1
end_of_record`;

        const lcovPath = path.join(tempDir, 'coverage/lcov.info');
        fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
        fs.writeFileSync(lcovPath, lcovContent);

        const mockConfig = {
            get: sinon.stub().returns(undefined)
        };

        const workspaceFolders = [{ uri: vscode.Uri.file(tempDir), name: 'test', index: 0 }];

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);
        sandbox.stub(fs, 'existsSync').callsFake((p) => p === lcovPath);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: {
                percentage: 100,
                linesHit: 1,
                linesFound: 1
            },
            files: []
        });

        const messageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await command.execute();

        assert.ok(messageStub.calledOnce);
        assert.ok(messageStub.getCall(0).args[0].includes('100%'));
    });
});
