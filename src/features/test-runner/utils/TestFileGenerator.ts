import * as fs from 'fs';
import * as path from 'path';
import { FileSystemUtils } from './FileSystemUtils';
import { EXCLUDED_GENERATED_FILE_EXTENSIONS } from './TestGenerationConstants';

export class TestFileGenerator {

    public static async createTestFile(sourceFilePath: string, workspaceRoot: string): Promise<boolean> {
        const testFilePath = FileSystemUtils.resolveTestFilePath(sourceFilePath, workspaceRoot);

        if (fs.existsSync(testFilePath)) {
            return false; // Already exists
        }

        // Skip generated files
        if (EXCLUDED_GENERATED_FILE_EXTENSIONS.some(ext => sourceFilePath.endsWith(ext))) {
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
}
