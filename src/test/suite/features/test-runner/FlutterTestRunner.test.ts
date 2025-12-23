import * as assert from 'assert';
import { FlutterTestRunner } from '../../../../features/test-runner/FlutterTestRunner';
import * as cp from 'child_process';
import { EventEmitter } from 'events';

suite('FlutterTestRunner Test Suite', () => {
    let runner: FlutterTestRunner;
    let mockChildProcess: any;
    let spawnCalledWith: any;

    setup(() => {
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

    // Note: Parsing coverage logic would ideally use a mocked fs and lcov parser,
    // but for unit testing the Runner's process handling, checking completion with exit code is sufficient.

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
});
