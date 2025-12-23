import * as path from 'path';

export class FileSystemUtils {
    public static resolveTestFilePath(currentFilePath: string, workspaceRoot: string): string {
        const relativePath = path.relative(workspaceRoot, currentFilePath);

        if (relativePath.startsWith('lib' + path.sep)) {
            // Standard structure: lib/foo/bar.dart -> test/foo/bar_test.dart
            const pathInLib = relativePath.substring(4); // remove 'lib/'
            // Handle packages that use `lib/src/...` but place tests in `test/...` (drop leading 'src/')
            const adjustedPathInLib = pathInLib.startsWith('src' + path.sep)
                ? pathInLib.substring(4)
                : pathInLib;
            const pathWithoutExt = adjustedPathInLib.substring(0, adjustedPathInLib.length - 5); // remove '.dart'
            return path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`);
        } else if (relativePath.startsWith('test' + path.sep)) {
            // Already in test, return as is
            return currentFilePath;
        } else {
            // Fallback/Root files: foo.dart -> test/foo_test.dart
            // Note: relativePath might just be 'foo.dart'
            const pathWithoutExt = relativePath.endsWith('.dart')
                ? relativePath.substring(0, relativePath.length - 5)
                : relativePath;
            return path.join(workspaceRoot, 'test', `${pathWithoutExt}_test.dart`);
        }
    }
}
