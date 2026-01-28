import * as assert from 'assert';
import { FlutterTestRunner } from '../../../../features/test-runner/FlutterTestRunner';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { LcovParser } from '../../../../shared/coverage/LcovParser';

suite('FlutterTestRunner Test Suite', () => {
    let runner: FlutterTestRunner;
    let mockChildProcess: any;
    let spawnCalledWith: any;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        spawnCalledWith = undefined;
        mockChildProcess = new EventEmitter();
        mockChildProcess.stdout = new EventEmitter();
        mockChildProcess.stderr = new EventEmitter();
        mockChildProcess.kill = () => {};

        // Mock spawn function
        const mockSpawn = (command: string, args: string[], options: any) => {
            spawnCalledWith = { command, args, options };
            return mockChildProcess;
        };

        // @ts-ignore
        runner = new FlutterTestRunner(mockSpawn);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('run() spawns flutter test process', async () => {
        await runner.run('/path/to/test.dart', '/root');

        assert.ok(spawnCalledWith);
        assert.strictEqual(spawnCalledWith.command, 'flutter');
        assert.deepStrictEqual(spawnCalledWith.args, ['test', '--coverage', '/path/to/test.dart']);
        assert.strictEqual(spawnCalledWith.options.cwd, '/root');
    });

    test('emits output from stdout', done => {
        runner.onTestOutput(data => {
            assert.strictEqual(data, 'some output');
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.stdout.emit('data', 'some output');
    });

    test('emits output from stderr', done => {
        runner.onTestOutput(data => {
            assert.strictEqual(data, 'error output');
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.stderr.emit('data', 'error output');
    });

    test('cancel() kills the process', async () => {
        let killed = false;
        mockChildProcess.kill = () => {
            killed = true;
        };

        await runner.run('/path/to/test.dart', '/root');
        runner.cancel();

        assert.ok(killed);
    });

    test('emits complete event on process exit', done => {
        runner.onTestComplete(result => {
            assert.strictEqual(result.success, true);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', 0);
    });

    test('emits complete event on failure', done => {
        runner.onTestComplete(result => {
            assert.strictEqual(result.success, false);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', 1);
    });

    test('emits complete event on cancellation (null code)', done => {
        runner.onTestComplete(result => {
            assert.strictEqual(result.cancelled, true);
            assert.strictEqual(result.success, false);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', null);
    });

    test('parses coverage on success', done => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/foo_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { linesFound: 10, linesHit: 10, percentage: 100 },
            files: [{ file: 'lib/foo.dart', linesFound: 10, linesHit: 10, percentage: 100, uncoveredLines: [] }]
        });

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info',
            has: () => true,
            inspect: () => undefined,
            update: () => Promise.resolve()
        } as any);

        runner.onTestComplete(result => {
            assert.strictEqual(result.success, true);
            assert.ok(result.coverage);
            assert.strictEqual(result.coverage?.percentage, 100);
            done();
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });

    test('handles LcovParser error gracefully', done => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/foo_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').rejects(new Error('Parse error'));

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info'
        } as any);

        runner.onTestOutput(output => {
            if (output.includes('[Error] Failed to parse coverage')) {
                assert.ok(true);
                done();
            }
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });

    test('parses coverage even when test fails', done => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/foo_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { linesFound: 20, linesHit: 15, percentage: 75 },
            files: [{ file: 'lib/foo.dart', linesFound: 20, linesHit: 15, percentage: 75, uncoveredLines: [5, 10, 15, 18, 20] }]
        });

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info',
            has: () => true,
            inspect: () => undefined,
            update: () => Promise.resolve()
        } as any);

        runner.onTestComplete(result => {
            assert.strictEqual(result.success, false);
            assert.ok(result.coverage, 'Coverage should be parsed even when test fails');
            assert.strictEqual(result.coverage?.percentage, 75);
            assert.deepStrictEqual(result.coverage?.uncoveredLines, [5, 10, 15, 18, 20]);
            done();
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 1); // Exit code 1 = failure
    });

    test('uses aggregated coverage when no specific file match found', done => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/some_integration_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        // Return files that don't match the test file name pattern
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { linesFound: 100, linesHit: 80, percentage: 80 },
            files: [
                { file: 'lib/services/api_client.dart', linesFound: 50, linesHit: 40, percentage: 80, uncoveredLines: [10, 20, 30] },
                { file: 'lib/models/user.dart', linesFound: 30, linesHit: 25, percentage: 83.33, uncoveredLines: [5] },
                { file: 'lib/utils/helpers.dart', linesFound: 20, linesHit: 15, percentage: 75, uncoveredLines: [1, 2, 3, 4, 5] }
            ]
        });

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info',
            has: () => true,
            inspect: () => undefined,
            update: () => Promise.resolve()
        } as any);

        runner.onTestComplete(result => {
            assert.strictEqual(result.success, true);
            assert.ok(result.coverage, 'Should have aggregated coverage');
            assert.strictEqual(result.coverage?.linesFound, 100);
            assert.strictEqual(result.coverage?.linesHit, 80);
            assert.strictEqual(result.coverage?.percentage, 80);
            // Should NOT show uncovered lines from unrelated files
            assert.deepStrictEqual(result.coverage?.uncoveredLines, []);
            done();
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });

    test('uses fuzzy matching to find related source file', done => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/download_service_impl_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        // Return files including one that matches the test name
        sandbox.stub(LcovParser, 'parse').resolves({
            overall: { linesFound: 200, linesHit: 150, percentage: 75 },
            files: [
                { file: 'lib/features/color_picker/palette.dart', linesFound: 100, linesHit: 50, percentage: 50, uncoveredLines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
                { file: 'lib/features/downloads/download_service_impl.dart', linesFound: 80, linesHit: 70, percentage: 87.5, uncoveredLines: [15, 20, 25] },
                { file: 'lib/utils/helpers.dart', linesFound: 20, linesHit: 30, percentage: 150, uncoveredLines: [] }
            ]
        });

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info',
            has: () => true,
            inspect: () => undefined,
            update: () => Promise.resolve()
        } as any);

        runner.onTestComplete(result => {
            assert.strictEqual(result.success, true);
            assert.ok(result.coverage, 'Should have matched coverage');
            // Should match download_service_impl.dart, not palette.dart
            assert.strictEqual(result.coverage?.file, 'lib/features/downloads/download_service_impl.dart');
            assert.strictEqual(result.coverage?.percentage, 87.5);
            assert.deepStrictEqual(result.coverage?.uncoveredLines, [15, 20, 25]);
            done();
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });
});
