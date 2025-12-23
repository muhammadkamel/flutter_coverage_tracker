# Changelog

## [0.4.0]

- **Feature**: Re-run tests directly from the Webview UI.
- **Feature**: Watch mode toggle for automatic test execution on file changes.
- **Feature**: Cancel running tests from the UI.
- **UI/UX**: Complete redesign of the results Webview with a premium aesthetic, including:
  - Gradient badges and progress indicators.
  - Circular coverage visualization.
  - Interactive "Uncovered Lines" with clickable navigation.
  - Animated console output and entry points.
- **Internal**: Major refactor to Clean Architecture for better maintainability.
- **Testing**: Added comprehensive UI/UX unit tests for the Webview generator.

## [0.3.3]

- **Fix**: Resolved "No Result" issue where coverage data was missing in the Webview.
- **Improvement**: Implemented robust path matching strategies (exact, suffix, basename) to handle discrepancies between local paths and `lcov.info` (e.g., CI/CD artifacts vs local file system).
- **Improvement**: Added diagnostic logs to the Webview console for better troubleshooting.
- **Internal**: Extracted path matching logic into `coverageMatching.ts` and added comprehensive unit tests.
