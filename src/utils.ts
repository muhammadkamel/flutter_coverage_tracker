import * as path from 'path';

export function resolveTestFilePath(currentFilePath: string, workspaceRoot: string): string {
    const relativePath = path.relative(workspaceRoot, currentFilePath);

    if (relativePath.startsWith('lib' + path.sep)) {
        // Standard structure: lib/foo/bar.dart -> test/foo/bar_test.dart
        const pathInLib = relativePath.substring(4); // remove 'lib/'
        const pathWithoutExt = pathInLib.substring(0, pathInLib.length - 5); // remove '.dart'
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
