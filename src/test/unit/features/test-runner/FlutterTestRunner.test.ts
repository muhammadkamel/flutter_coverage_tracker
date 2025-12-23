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
        mockChildProcess.kill = () => { };

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

    test('emits output from stdout', (done) => {
        runner.onTestOutput((data) => {
            assert.strictEqual(data, 'some output');
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.stdout.emit('data', 'some output');
    });

    test('emits output from stderr', (done) => {
        runner.onTestOutput((data) => {
            assert.strictEqual(data, 'error output');
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.stderr.emit('data', 'error output');
    });

    test('cancel() kills the process', async () => {
        let killed = false;
        mockChildProcess.kill = () => { killed = true; };

        await runner.run('/path/to/test.dart', '/root');
        runner.cancel();

        assert.ok(killed);
    });

    test('emits complete event on process exit', (done) => {
        runner.onTestComplete((result) => {
            assert.strictEqual(result.success, true);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', 0);
    });

    test('emits complete event on failure', (done) => {
        runner.onTestComplete((result) => {
            assert.strictEqual(result.success, false);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', 1);
    });

    test('emits complete event on cancellation (null code)', (done) => {
        runner.onTestComplete((result) => {
            assert.strictEqual(result.cancelled, true);
            assert.strictEqual(result.success, false);
            done();
        });

        runner.run('/path/to/test.dart', '/root');
        mockChildProcess.emit('close', null);
    });

    test('parses coverage on success', (done) => {
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

        runner.onTestComplete((result) => {
            assert.strictEqual(result.success, true);
            assert.ok(result.coverage);
            assert.strictEqual(result.coverage?.percentage, 100);
            done();
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });

    test('handles LcovParser error gracefully', (done) => {
        const workspaceRoot = '/root';
        const testFile = '/root/test/foo_test.dart';

        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(LcovParser, 'parse').rejects(new Error('Parse error'));

        // Mock workspace config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => 'coverage/lcov.info'
        } as any);

        runner.onTestOutput((output) => {
            if (output.includes('[Error] Failed to parse coverage')) {
                assert.ok(true);
                done();
            }
        });

        runner.run(testFile, workspaceRoot);
        mockChildProcess.emit('close', 0);
    });
});
