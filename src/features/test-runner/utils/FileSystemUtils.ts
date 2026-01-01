import * as path from 'path';
import * as fs from 'fs';

export class FileSystemUtils {
    public static resolveTestFilePath(currentFilePath: string, workspaceRoot: string): string {
        const paths = this.getPossibleTestFilePaths(currentFilePath, workspaceRoot);
        return paths[0]; // Primary candidate
    }

    /**
     * Returns a list of possible test file paths for a given source file.
     * In Flutter, tests for lib/src/foo.dart can be in test/src/foo_test.dart OR test/foo_test.dart.
     */
    public static getPossibleTestFilePaths(currentFilePath: string, workspaceRoot: string): string[] {
        const relativePath = path.relative(workspaceRoot, currentFilePath);

        if (relativePath.startsWith('lib' + path.sep)) {
            const pathInLib = relativePath.substring(4); // remove 'lib/'
            const pathWithoutExt = pathInLib.substring(0, pathInLib.length - 5); // remove '.dart'

            const candidates: string[] = [];

            // Candidate 1: Direct mirror (e.g., lib/src/foo.dart -> test/src/foo_test.dart)
            candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`));

            // Candidate 2: Dropping 'src' (e.g., lib/src/foo.dart -> test/foo_test.dart)
            if (pathInLib.startsWith('src' + path.sep)) {
                const pathWithoutSrc = pathInLib.substring(4);
                const pathWithoutSrcAndExt = pathWithoutSrc.substring(0, pathWithoutSrc.length - 5);
                candidates.push(path.join(workspaceRoot, 'test', `${pathWithoutSrcAndExt}_test.dart`));
            }

            return candidates;
        } else if (relativePath.startsWith('test' + path.sep)) {
            return [currentFilePath];
        } else {
            const pathWithoutExt = relativePath.endsWith('.dart')
                ? relativePath.substring(0, relativePath.length - 5)
                : relativePath;
            return [path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`)];
        }
    }

    /**
     * Attempts to find the source file for a given test file.
     * test/foo_test.dart -> lib/foo.dart or lib/src/foo.dart
     */
    public static resolveSourceFilePath(testFilePath: string, workspaceRoot: string): string | undefined {
        const relativePath = path.relative(workspaceRoot, testFilePath);

        if (!relativePath.startsWith('test' + path.sep)) {
            return undefined;
        }

        // remove 'test/' and '_test.dart'
        const pathInTest = relativePath.substring(5);
        if (!pathInTest.endsWith('_test.dart')) {
            return undefined;
        }

        const baseName = pathInTest.substring(0, pathInTest.length - 10);
        const candidates = [
            path.join(workspaceRoot, 'lib', `${baseName}.dart`),
            path.join(workspaceRoot, 'lib', 'src', `${baseName}.dart`),
        ];

        // If pathInTest itself starts with 'src/', the mirrored version would be lib/src/...
        // But we already included that in the candidates if we just prepended lib/ or lib/src/ to baseName.
        // Wait, if pathInTest is 'src/foo_test.dart', baseName is 'src/foo'.
        // candidates would be: lib/src/foo.dart and lib/src/src/foo.dart. 
        // We probably want to check if baseName already starts with src/

        const candidates2: string[] = [];
        if (baseName.startsWith('src' + path.sep)) {
            const baseNameWithoutSrc = baseName.substring(4);
            candidates2.push(path.join(workspaceRoot, 'lib', `${baseNameWithoutSrc}.dart`));
            candidates2.push(path.join(workspaceRoot, 'lib', 'src', `${baseNameWithoutSrc}.dart`)); // Technically redundant if it was mirrored
            candidates2.push(path.join(workspaceRoot, 'lib', `${baseName}.dart`)); // Mirror version
        } else {
            candidates2.push(path.join(workspaceRoot, 'lib', `${baseName}.dart`));
            candidates2.push(path.join(workspaceRoot, 'lib', 'src', `${baseName}.dart`));
        }

        for (const candidate of candidates2) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return undefined;
    }
}
