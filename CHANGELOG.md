# Changelog

## [0.6.0] - 2025-12-24

### Added

- **UI**: Uncovered lines count now displayed in card title (e.g., "Uncovered Lines (5)")
- **UI**: Floating scroll-to-top button appears when scrolling down in test results
- **Testing**: Comprehensive test coverage for folder test status validation

### Fixed

- **Critical**: Multi-test dashboard now correctly shows individual test status instead of marking all tests as FAILED
- **Logic**: Each test file status is now inferred from its coverage data presence
- **UX**: Summary counts now accurate (e.g., "5 Passed, 2 Failed" instead of "0 Passed, 7 Failed")

### Improved

- **Testing**: Increased test coverage to 84 tests (from 83)
- **Quality**: All tests passing with no regressions

## [0.5.0] - 2025-12-24

- **Quality**: Achieved 100% logic coverage on all core business modules (FlutterTestRunner, LcovParser, CoverageMatcher, WebviewGenerator, MultiTestWebviewGenerator, CoverageOrchestrator, VsCodeFileWatcher, FileSystemUtils).
- **Testing**: Implemented comprehensive dual-layer test architecture with 80 unit tests and integration smoke tests.
- **Testing**: Added standalone unit test environment with full VS Code API mocking for isolated logic testing.
- **Testing**: Overall code coverage improved to 83% statements, 76% branches, 88% functions.
- **Reliability**: All business logic paths now thoroughly verified with edge case handling.

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
