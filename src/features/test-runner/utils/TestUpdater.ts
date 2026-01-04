import * as fs from 'fs';
import * as path from 'path';

export class TestUpdater {
    /**
     * Updates an existing test file with stubs for missing public methods found in the source file.
     * @param testFilePath Path to the test file.
     * @param sourceFilePath Path to the source file.
     * @returns True if the file was updated, false otherwise.
     */
    public static async updateTestFile(testFilePath: string, sourceFilePath: string): Promise<boolean> {
        try {
            if (!fs.existsSync(testFilePath) || !fs.existsSync(sourceFilePath)) {
                return false;
            }

            const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
            const testContent = fs.readFileSync(testFilePath, 'utf8');

            const publicMethods = this.extractPublicMethods(sourceContent);
            const existingTests = this.extractExistingTestDescriptions(testContent);

            const missingMethods = publicMethods.filter(m => !this.hasTestForMethod(m, existingTests));


            if (missingMethods.length === 0) {
                return false;
            }

            const newTests = this.generateTestStubs(missingMethods);
            const updatedContent = this.appendTestsToMain(testContent, newTests);

            if (updatedContent !== testContent) {
                fs.writeFileSync(testFilePath, updatedContent, 'utf8');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error in TestUpdater:', error);
            return false;
        }
    }

    private static extractPublicMethods(content: string): string[] {
        const methods: string[] = [];
        const lines = content.split('\n');

        // Regex for method signature:
        // Returns type (optional), name, start of params
        // Excludes starting with _
        // Excludes simple getters/setters for now to keep it simple, or include them? 
        // Let's target standard class methods for now.
        // Matches: void foo() {}, String bar(int a) {}, etc.
        // Not perfect, but good enough for stubs.
        const methodRegex = /^\s*(?:[\w<>?]+\s+)?([a-zA-Z0-9$]+)\s*\(/;

        let insideClass = false;
        let braceCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('class ') || trimmed.startsWith('abstract class ') || trimmed.startsWith('mixin ')) {
                insideClass = true;
            }

            if (insideClass) {
                if (trimmed.includes('{')) {braceCount++;}
                if (trimmed.includes('}')) {braceCount--;}

                // Simple check: inside class (braceCount > 0)
                if (braceCount > 0) {
                    const match = trimmed.match(methodRegex);
                    if (match) {
                        const name = match[1];
                        // Ignore private methods, constructors (same as class name typically, hard to detect without parsing class name, but standard constructors often lack return type or have same name. Let's ignore if starts with _)
                        if (!name.startsWith('_') &&
                            !name.startsWith('build') && // Often redundant to test build method explicitly in unit tests if widget test covers it
                            !trimmed.startsWith('return') &&
                            !trimmed.includes(' super(')) { // Ignore constructor calls
                            methods.push(name);
                        }
                    }
                }
            }
        }

        // Filter out common lifecycle or override methods that might not need direct unit tests or are handled elsewhere?
        // For now, keep them.
        return [...new Set(methods)];
    }

    private static extractExistingTestDescriptions(content: string): string[] {
        // Find all test('description' or testWidgets('description'
        const regex = /test(?:Widgets)?\s*\(\s*['"](.+?)['"]/g;
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    private static hasTestForMethod(methodName: string, existingTests: string[]): boolean {
        const lowerMethod = methodName.toLowerCase();
        // Check if any test description contains the method name
        return existingTests.some(desc => desc.toLowerCase().includes(lowerMethod));
    }

    private static generateTestStubs(missingMethods: string[]): string {
        return missingMethods.map(method => `
  test('${method} should work correctly', () {
    // TODO: Implement test for ${method}
  });
`).join('');
    }

    private static appendTestsToMain(content: string, newTests: string): string {
        // Find the last closing brace of main()
        // This is tricky with pure regex.
        // Heuristic: Find the last '}' in the file, assume it closes main or the class (if whole file is main).
        // Better: Find "void main() {" then count braces.

        const mainStart = content.indexOf('void main()');
        if (mainStart === -1) {return content;}

        let braceCount = 0;
        let mainStarted = false;
        let insertIndex = -1;

        for (let i = mainStart; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                mainStarted = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (mainStarted && braceCount === 0) {
                    insertIndex = i;
                    break;
                }
            }
        }

        if (insertIndex !== -1) {
            return content.slice(0, insertIndex) + newTests + content.slice(insertIndex);
        }

        return content;
    }
}
