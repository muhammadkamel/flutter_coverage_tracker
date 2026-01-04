
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { TestUpdater } from '../../../../../features/test-runner/utils/TestUpdater';

suite('TestUpdater Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let existsStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;
    let writeFileStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        existsStub = sandbox.stub(fs, 'existsSync');
        readFileStub = sandbox.stub(fs, 'readFileSync');
        writeFileStub = sandbox.stub(fs, 'writeFileSync');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should return false if files do not exist', async () => {
        existsStub.returns(false);
        const result = await TestUpdater.updateTestFile('test.dart', 'source.dart');
        assert.strictEqual(result, false);
    });

    test('should identify missing public methods and add stubs', async () => {
        existsStub.returns(true);

        const sourceContent = `
            class Calculator {
                int add(int a, int b) => a + b;
                int _privateMethod() => 0;
                void subtract() {}
                // Comments
                String get name => 'Calc';
            }
        `;

        const testContent = `
            void main() {
                test('add should work correctly', () {
                    // exists
                });
            }
        `;

        readFileStub.withArgs('source.dart').returns(sourceContent);
        readFileStub.withArgs('test.dart').returns(testContent);

        const result = await TestUpdater.updateTestFile('test.dart', 'source.dart');

        assert.strictEqual(result, true);
        sinon.assert.calledOnce(writeFileStub);

        const writtenContent = writeFileStub.firstCall.args[1];
        assert.ok(writtenContent.includes("test('subtract should work correctly'"), 'Should add stub for subtract');
        assert.ok(!writtenContent.includes("test('_privateMethod"), 'Should ignore private methods');

        // Count occurrences of "test('add should"
        const matches = writtenContent.match(/test\('add should/g);
        assert.strictEqual(matches?.length, 1, 'Should not duplicate existing test');
    });

    test('should not update if all methods are tested', async () => {
        existsStub.returns(true);

        const sourceContent = `
            class Calculator {
                void add() {}
            }
        `;

        const testContent = `
            void main() {
                test('add should work correctly', () {
                    // exists
                });
            }
        `;

        readFileStub.withArgs('source.dart').returns(sourceContent);
        readFileStub.withArgs('test.dart').returns(testContent);

        const result = await TestUpdater.updateTestFile('test.dart', 'source.dart');

        assert.strictEqual(result, false);
        sinon.assert.notCalled(writeFileStub);
    });

    test('should handle testWidgets', async () => {
        existsStub.returns(true);

        const sourceContent = `
            class MyWidget extends StatelessWidget {
                void update() {}
            }
        `;

        const testContent = `
            void main() {
                testWidgets('update should work correctly', (tester) async {
                    // exists
                });
            }
        `;

        readFileStub.withArgs('source.dart').returns(sourceContent);
        readFileStub.withArgs('test.dart').returns(testContent);

        const result = await TestUpdater.updateTestFile('test.dart', 'source.dart');

        assert.strictEqual(result, false);
        sinon.assert.notCalled(writeFileStub);
    });
});
