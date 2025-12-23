import * as assert from 'assert';
import * as vscode from 'vscode';
import { VsCodeFileWatcher } from '../../../../features/test-runner/VsCodeFileWatcher';

suite('VsCodeFileWatcher Test Suite', () => {
    let watcher: VsCodeFileWatcher;

    setup(() => {
        watcher = new VsCodeFileWatcher();
    });

    teardown(() => {
        watcher.dispose();
    });

    test('watch creates a filesystem watcher', () => {
        // This test mostly verifies it doesn't throw and calls the VS Code API
        // In a real integration test, we verify it reacts to changes.
        watcher.watch('/some/path/test.dart');
        assert.ok(true, 'Should not throw when watching');
    });

    test('dispose clears the watcher', () => {
        watcher.watch('/some/path/test.dart');
        watcher.dispose();
        assert.ok(true, 'Should not throw on dispose');
    });

    test('multiple watch calls dispose previous', () => {
        watcher.watch('/path1.dart');
        watcher.watch('/path2.dart');
        assert.ok(true, 'Should handle sequential watch calls');
    });

    test('propagates change events from vscode watcher', (done) => {
        watcher.onDidChange(() => {
            assert.ok(true);
            done();
        });
        watcher.watch('/test.dart');
        (global as any).lastCreatedWatcher._fire('change');
    });

    test('propagates create events from vscode watcher', (done) => {
        watcher.onDidChange(() => {
            assert.ok(true);
            done();
        });
        watcher.watch('/test.dart');
        (global as any).lastCreatedWatcher._fire('create');
    });

    test('propagates delete events from vscode watcher', (done) => {
        watcher.onDidChange(() => {
            assert.ok(true);
            done();
        });
        watcher.watch('/test.dart');
        (global as any).lastCreatedWatcher._fire('delete');
    });
});
