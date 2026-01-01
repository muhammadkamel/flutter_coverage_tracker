import * as assert from 'assert';
import * as sinon from 'sinon';
import { GitService } from '../../../../features/git/GitService';

suite('GitService Test Suite', () => {
    let gitService: GitService;
    let execStub: sinon.SinonStub;

    setup(() => {
        execStub = sinon.stub();
        // @ts-ignore
        gitService = new GitService(execStub);
    });

    teardown(() => {
        sinon.restore();
    });

    test('isGitRepo returns true when git command succeeds', async () => {
        execStub.yields(null, 'true', '');
        const result = await gitService.isGitRepo('/root');
        assert.strictEqual(result, true);
        assert.ok(execStub.calledWith('git rev-parse --is-inside-work-tree', { cwd: '/root' }));
    });

    test('isGitRepo returns false when git command fails', async () => {
        execStub.yields(new Error('not a repo'), '', '');
        const result = await gitService.isGitRepo('/root');
        assert.strictEqual(result, false);
    });

    test('getModifiedFiles returns unique dart files from git', async () => {
        // ls-files (untracked)
        execStub.onCall(0).yields(null, 'lib/new_file.dart\nlib/ignored.txt', '');
        // diff (unstaged)
        execStub.onCall(1).yields(null, 'lib/modified.dart\nlib/new_file.dart', '');
        // diff --cached (staged)
        execStub.onCall(2).yields(null, 'lib/staged.dart\n', '');

        const files = await gitService.getModifiedFiles('/root');

        assert.deepStrictEqual(files.sort(), [
            'lib/modified.dart',
            'lib/new_file.dart',
            'lib/staged.dart'
        ].sort());
    });

    test('getModifiedFiles filters non-dart files', async () => {
        execStub.onCall(0).yields(null, 'lib/foo.dart\nREADME.md', '');
        execStub.onCall(1).yields(null, '', '');
        execStub.onCall(2).yields(null, '', '');

        const files = await gitService.getModifiedFiles('/root');
        assert.deepStrictEqual(files, ['lib/foo.dart']);
    });

    test('getChangedLines parses diff output correctly', async () => {
        const diffOutput = `
@@ -1,1 +1,3 @@
+added line 1
+added line 2
+added line 3
@@ -10,0 +15,2 @@
+added 15
+added 16
`;
        execStub.onCall(0).yields(new Error('not ignored'), '', ''); // check-ignore fails if not ignored
        execStub.onCall(1).yields(null, diffOutput, '');

        const lines = await gitService.getChangedLines('/root/lib/foo.dart');

        // Ranges:
        // +1,3 -> 1, 2, 3
        // +15,2 -> 15, 16
        assert.deepStrictEqual(lines, [1, 2, 3, 15, 16]);
    });

    test('getChangedLines returns empty if file is ignored', async () => {
        execStub.onCall(0).yields(null, 'ignored', ''); // check-ignore succeeds

        const lines = await gitService.getChangedLines('/root/lib/ignored.dart');
        assert.deepStrictEqual(lines, []);
    });
});
