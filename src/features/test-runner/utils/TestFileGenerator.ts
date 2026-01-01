import * as fs from 'fs';
import * as path from 'path';
import { FileSystemUtils } from './FileSystemUtils';
import { getExcludedFileExtensions } from './TestGenerationConstants';

export class TestFileGenerator {
    public static async createTestFile(sourceFilePath: string, workspaceRoot: string): Promise<boolean> {
        const testFilePaths = FileSystemUtils.getPossibleTestFilePaths(sourceFilePath, workspaceRoot);

        // Choose primary candidate based on content
        const isMixed = this.isMixedAbstractConcreteFile(sourceFilePath);
        const testFilePath = isMixed && testFilePaths.length > 1 ? testFilePaths[1] : testFilePaths[0];

        if (testFilePaths.some(p => fs.existsSync(p))) {
            return false; // Already exists in one of the possible locations
        }

        // Skip generated files
        const excludedExtensions = getExcludedFileExtensions();
        if (excludedExtensions.some(ext => sourceFilePath.endsWith(ext))) {
            return false;
        }

        // Skip barrel files (export only)
        if (this.isExportOnlyFile(sourceFilePath)) {
            return false;
        }

        // Skip abstract-only files
        if (this.isAbstractOnlyFile(sourceFilePath)) {
            return false;
        }

        const packageName = await this.getPubspecPackageName(workspaceRoot);
        if (!packageName) {
            console.error('Could not determine package name from pubspec.yaml');
            return false;
        }

        const relativeSourcePath = path.relative(workspaceRoot, sourceFilePath);

        // Convert local path to package import path
        // e.g., lib/src/foo.dart -> package:my_app/src/foo.dart
        let importPath = '';
        if (relativeSourcePath.startsWith('lib' + path.sep)) {
            importPath = relativeSourcePath.substring(4).replace(/\\/g, '/');
        } else {
            // Fallback for non-lib files (rare in Flutter structure but possible)
            // We can't really import them easily via package: unless they are in lib.
            // We'll just import via relative path if needed, or skip package import.
            // For now, let's assume they are under lib/ for the "package:" import to work nicely.
            // If they are not in lib, we might use a relative import.
            importPath = relativeSourcePath.replace(/\\/g, '/');
        }

        const testContent = this.generateTestContent(packageName, importPath, path.basename(sourceFilePath));

        try {
            const testDir = path.dirname(testFilePath);
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            fs.writeFileSync(testFilePath, testContent, 'utf8');
            return true;
        } catch (error) {
            console.error(`Failed to create test file: ${testFilePath}`, error);
            return false;
        }
    }

    private static async getPubspecPackageName(workspaceRoot: string): Promise<string | undefined> {
        const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
        try {
            if (fs.existsSync(pubspecPath)) {
                const content = fs.readFileSync(pubspecPath, 'utf8');
                const nameMatch = content.match(/^name:\s+(\S+)/m);
                if (nameMatch) {
                    return nameMatch[1];
                }
            }
        } catch (e) {
            console.error('Error reading pubspec.yaml', e);
        }
        return undefined;
    }

    private static generateTestContent(packageName: string, importPath: string, fileName: string): string {
        // Handle the case where the file is inside lib/ so we use package: import
        // If it was just "foo.dart" in root, importPath would be "foo.dart" and package import might be wrong.
        // But standard Flutter projects put everything in lib.

        const fileImport = `package:${packageName}/${importPath}`;

        return `import 'package:flutter_test/flutter_test.dart';
import '${fileImport}';

void main() {
  testWidgets('Test for ${fileName}', (WidgetTester tester) async {
    // TODO: Implement test
  });
}
`;
    }

    private static isExportOnlyFile(filePath: string): boolean {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let hasExport = false;

            for (let line of lines) {
                line = line.trim();
                if (
                    !line ||
                    line.startsWith('//') ||
                    line.startsWith('/*') ||
                    line.endsWith('*/') ||
                    line.startsWith('*') ||
                    line.startsWith('import ')
                ) {
                    continue; // Skip empty lines, comments, and imports
                }

                if (line.startsWith('export ')) {
                    hasExport = true;
                    continue;
                }

                if (line.startsWith('library ')) {
                    continue;
                }

                // If we find any other keyword, it's not an export-only file
                return false;
            }

            return hasExport;
        } catch (e) {
            console.error(`Error reading file to check if it's export-only: ${filePath}`, e);
            return false;
        }
    }

    private static isAbstractOnlyFile(filePath: string): boolean {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let hasAbstractClass = false;
            let hasConcreteClass = false;
            let hasFunction = false;

            for (let line of lines) {
                line = line.trim();
                if (
                    !line ||
                    line.startsWith('//') ||
                    line.startsWith('/*') ||
                    line.endsWith('*/') ||
                    line.startsWith('*') ||
                    line.startsWith('import ') ||
                    line.startsWith('export ') ||
                    line.startsWith('library ')
                ) {
                    continue; // Skip boiler plate
                }

                if (line.startsWith('abstract class ')) {
                    hasAbstractClass = true;
                    continue;
                }

                if (line.startsWith('class ')) {
                    hasConcreteClass = true;
                    break;
                }

                // Check for functions (basic check for common Dart function patterns)
                if (line.includes('(') && line.includes(')') && (line.includes('{') || line.includes('=>'))) {
                    hasFunction = true;
                    break;
                }

                // If it's something else, let's play it safe and assume it's logic
                // return false;
            }

            return hasAbstractClass && !hasConcreteClass && !hasFunction;
        } catch (e) {
            console.error(`Error reading file to check if it's abstract-only: ${filePath}`, e);
            return false;
        }
    }

    public static isMixedAbstractConcreteFile(filePath: string): boolean {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let hasAbstractClass = false;
            let hasConcreteClass = false;

            for (let line of lines) {
                line = line.trim();
                if (
                    !line ||
                    line.startsWith('//') ||
                    line.startsWith('/*') ||
                    line.endsWith('*/') ||
                    line.startsWith('*')
                ) {
                    continue;
                }

                if (line.startsWith('abstract class ')) {
                    hasAbstractClass = true;
                } else if (line.startsWith('class ')) {
                    hasConcreteClass = true;
                }

                if (hasAbstractClass && hasConcreteClass) {
                    return true;
                }
            }

            return false;
        } catch (e) {
            console.error(`Error reading file to check if it's mixed abstract/concrete: ${filePath}`, e);
            return false;
        }
    }
}
