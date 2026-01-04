# Changelog

## [0.20.1] - 2026-01-02

### Fixed

- **Critical Bug**: Fixed webview hang in "Run Related Test" command.
    - Removed problematic `nonce` directive from Content-Security-Policy that blocked inline script execution.
    - Webview now correctly updates UI state when tests complete.
    - Tab switching and message handlers now work as expected.
- **Enhancement**: Added error handling for process spawn failures in `FlutterTestRunner`.
    - Better error reporting when Flutter test process fails to start.

### Tests

- Added `WebviewGeneratorCSP.test.ts` with regression tests for CSP configuration.
- Fixed watch mode test in `RunFolderTestsCommand.test.ts`.
- All 65 tests passing.

## [0.20.0] - 2026-01-02

### Added

- **Feature**: Smart Test Updates
    - Running "Run Related Test" on a test file now automatically checks the corresponding source file.
    - If public methods are missing from the test file, stubs are automatically appended.
    - Intelligent source file resolution for standard and `_impl` files.
- **Security**: Enhanced Webview Security
    - Added strict Content Security Policy (CSP) to test runner webviews.
    - Restricted resource loading to extension directory using `localResourceRoots`.

### Fixed

- **Bug**: Resolved `InvalidStateError` (Service Worker registration) in Webviews.
    - Fixed an issue where Webviews would fail to load or throw errors during test execution.
    - Ensured consistent behavior across all test runner commands (`RunRelated`, `RunFolder`, `RunChanged`).

## [0.19.8] - 2026-01-01

### Fixed

- **Command**: Fixed "Run with Coverage" behavior.
    - Command now correctly identifies when the current file is already a test file (`_test.dart`) and runs it directly.
    - Prevents unnecessary "Create test file" prompts when running from within a test file.
    - Improved test runner logic to support running integration tests or test files outside the `test/` directory.

## [0.19.7] - 2026-01-01

### Fixed

- **Coverage**: Extension now respects `flutterCoverage.excludedFileExtensions` setting for coverage calculation and display.
    - Files matching excluded extensions (e.g., `.freezed.dart`, `.g.dart`) are now filtered out from the dashboard and status bar coverage.
    - Ensures accurate coverage metrics by ignoring generated code.

## [0.19.5] - 2026-01-01

### Added

- **Feature**: Multi-Candidate Jump to Test/Implementation
    - When multiple test files exist (e.g., `foo_test.dart` and `foo_impl_test.dart`), a QuickPick menu is now displayed.
    - When jumping from a test file to source, multiple source files are now offered if available.
    - Improved heuristics for `_impl.dart` and `_impl_test.dart` naming conventions.

### Changed

- **Code Quality**: Resolved all 47 ESLint warnings.
    - Refined ESLint naming-convention rules for better TypeScript compatibility.
    - Updated project to allow standard patterns (UPPER_CASE constants, PascalCase enums).
- **Code Quality**: Added Prettier for code formatting.
    - Configured with TypeScript-friendly defaults.
    - All source files formatted consistently.

### Tests

- Achieved 100% test coverage for `FileSystemUtils.ts`.
- Added comprehensive test cases for multi-candidate routing.
- All 188 unit tests passing.

## [0.19.4] - 2026-01-01

- Fixed integration test failures and regressions.
- Improved `SuiteCoverageManager` sorting stability with covered lines tie-breaker.
- Updated `SuiteCoverageDashboardGenerator` tests to match refactored structure.
- Cleaned up stale build artifacts from `out` directory.

## [0.19.3] - 2026-01-01

### Added

- **Feature**: Smart routing for mixed files in Jump to Test/Impl.
    - Navigating from a Dart file containing both abstract and concrete classes now automatically routes to the `*_impl_test.dart` file if it exists.
    - Refactored `jumpToTestOrImpl` command to use centralized `FileSystemUtils` logic.
    - Added 3 new unit tests for smart routing (173 passing tests).

## [0.19.2] - 2026-01-01

### Added

- **Feature**: `_impl_test.dart` naming convention for mixed files.
    - Files containing both `abstract class` and concrete `class` definitions now generate test files named `*_impl_test.dart`.
    - Updated `FileSystemUtils` to support multiple test naming candidates.
    - Improved source file resolution to correctly map `_impl_test.dart` back to the implementation file.
    - Added 3 new unit tests (170 passing tests).

## [0.19.1] - 2026-01-01

### Added

- **Feature**: Automatic skip for abstract-only Dart files.
    - Files containing only `abstract class` definitions are now skipped during test generation.
    - Correctly detects files that also contain concrete classes or functions and does NOT skip them.
    - Added unit tests for abstract-only detection logic (167 passing tests).

## [0.19.0] - 2026-01-01

### Added

- **Feature**: Automatic skip for Dart "barrel" files.
    - Files containing only `export` statements are now automatically skipped during test generation.
    - Supports comments and `library` declarations within barrel files.
    - Reduces boilerplate and redundant test files in grouped exports.
    - Added unit tests for export-only file detection logic.

## [0.18.0] - 2026-01-01

### Changed

- **Architecture**: Major refactor to Clean Architecture & SOLID principles.
    - Extracted command logic into dedicated classes (`RunChangedTestsCommand`, `RunFolderTestsCommand`, etc.).
    - Implemented Command Pattern for better maintainability and testability.
    - `extension.ts` refactored into a Composition Root.
    - Extracted `CoverageStatusManager` for status bar management.
- **Testing**: Refactored unit test suite to align with new architecture.
    - Split monolithic `extension.test.ts` into command-specific test files.
    - Added comprehensive tests for `CoverageStatusManager`.
    - Verified stability with 162 passing tests.

## [0.17.0] - 2026-01-01

### Added

- **Feature**: Dynamic Coverage Highlights
    - Coverage highlights are now only visible when a test runner is active (single file or folder dashboard).
    - Highlights are automatically removed when the test view is closed.
    - Reduces visual clutter during normal coding sessions.

## [0.16.0] - 2025-12-25

### Added

- **Feature**: Multi-Platform Coverage Support
    - Platform-specific test commands (📱 Android, 🍎 iOS, 🌐 Web, 💻 Desktop)
    - Switch between platforms via Command Palette
    - Aggregated coverage view combining all platforms
    - Platform indicator in status bar (e.g., "Cov: 75% 📱")
    - Separate coverage files per platform (coverage/android/, coverage/ios/, etc.)
    - Smart coverage aggregation (union of covered lines across platforms)
    - Platform-aware coverage manager

### Configuration

- Added `flutterCoverage.defaultPlatform` to set default platform view
- Added `flutterCoverage.platformCoveragePaths` to configure per-platform coverage files

### Commands

- Run Tests (Android) - `flutter-coverage-tracker.runTestsAndroid`
- Run Tests (iOS) - `flutter-coverage-tracker.runTestsIOS`
- Run Tests (Web) - `flutter-coverage-tracker.runTestsWeb`
- Run Tests (Desktop) - `flutter-coverage-tracker.runTestsDesktop`
- Switch Coverage Platform - `flutter-coverage-tracker.switchPlatform`

---

## [0.15.0] - 2025-12-25

### Added

- **Feature**: Inline Coverage Gutters
    - Visual coverage indicators directly in the editor gutter
    - ✅ Green indicators for covered lines
    - ❌ Red indicators for uncovered lines
    - Real-time updates when coverage changes
    - Configurable color styles (green/blue for covered, red/orange for uncovered)
    - Toggle gutters on/off via settings
    - Lightweight SVG icons with minimal visual interference
    - Smart line detection (skips comments, imports, and structural code)

### Configuration

- Added `flutterCoverage.showGutterCoverage` to enable/disable gutters
- Added `flutterCoverage.coveredGutterStyle` for covered line colors
- Added `flutterCoverage.uncoveredGutterStyle` for uncovered line colors

---

## [0.14.0] - 2025-12-25

### Added

- **Feature**: Smart Test Suggestions Dashboard UI (Phase 2 Complete)
    - Interactive suggestions card in multi-test dashboard
    - Priority-coded badges (🔴 High, 🟡 Medium, 🟢 Low)
    - File coverage percentage and complexity indicators
    - Uncovered lines count and priority scores
    - Top 3 actionable suggestions per file
    - Real-time updates as tests complete
    - Beautiful, responsive UI with hover effects

### Changed

- Enhanced multi-test dashboard with suggestions panel
- Integrated TestSuggestionEngine into coverage workflow

---

## [0.13.0] - 2025-12-25

### Added

- **Feature**: Smart Test Suggestions Core Engine
    - New `TestSuggestionEngine` module that analyzes coverage data and generates prioritized test suggestions
    - Intelligent priority ranking algorithm based on:
        - Uncovered lines count (40% weight)
        - Coverage percentage gap (30% weight)
        - File size and impact (30% weight)
    - Priority categorization: High (≥40), Medium (≥15), Low (<15)
    - Complexity estimation: Classifies files as simple, moderate, or complex
    - File-type specific suggestions for widgets, repositories, controllers, use cases, services, and models
    - Comprehensive test suite with 20 passing unit tests
    - Foundation ready for Phase 2 dashboard UI integration

### Internal

- Added `TestSuggestion` interface to support test prioritization
- Created extensive test coverage for suggestion algorithm

---

## [0.12.0] - 2025-12-25

### Added

- **Configuration**: User-configurable excluded file extensions
    - New setting `flutterCoverage.excludedFileExtensions` to customize which files to skip during automatic test generation
    - Default extensions: `.g.dart`, `.freezed.dart`
    - Users can now add custom extensions like `.gr.dart`, `.config.dart`, or any other generated files
    - Accessible through VS Code Settings UI or `settings.json`

### Changed

- **Internal**: Refactored hard-coded excluded extensions to use VS Code configuration API
    - Converted `EXCLUDED_GENERATED_FILE_EXTENSIONS` constant to `getExcludedFileExtensions()` function
    - Improved flexibility and maintainability

---

## [0.11.3] - 2025-12-24

### Improved

- **Export**: Enhanced Markdown report format with vertical layout for better readability
    - Changed from table format to vertical layout with bold labels
    - Each file displays: **File**, **Uncovered lines**, **Test Coverage Percentage**
    - Added horizontal rule separators between file entries
    - More readable and scannable format for coverage reports

---

## [0.11.2] - 2025-12-24

### Improved

- **Branding**: Updated to flat UI icon design with "FCT" branding for better visibility

---

## [0.11.1] - 2025-12-24

### Added

- **Branding**: New professional extension icon featuring Flutter colors and coverage tracking elements

---

## [0.11.0] - 2025-12-24

### Added

- **Documentation**: Comprehensive README.md with features, installation, usage, and configuration guides
- **Branding**: Professional extension icon featuring Flutter colors and coverage tracking elements
- **Marketplace**: Enhanced VS Code marketplace presentation with icon and detailed documentation

---

## [0.10.0] - 2025-12-24

### Added

- **Dashboard**: Folder Structure View
    - Tested files are now organized in a hierarchical folder tree instead of a flat list.
    - Expandable/collapsible folders with visual indicators (📁/📂).
    - Aggregated status dots for folders (Green = All Passed, Red = Any Failed).
    - Improved readability for large test suites.

## [0.9.1] - 2025-12-24

### Fixed

- **Dashboard**: Fixed an intermittent issue where clicking on test file names failed to navigate to the file after a test run completed.

## [0.9.0] - 2025-12-24

### Added

- **Feature**: Export Uncovered Lines Report
    - New "Export MD" button in the Folder Tests Dashboard.
    - Generates a Markdown report listing all files with their coverage percentage and specific uncovered line numbers.
    - Useful for sharing coverage gaps with team members or tracking debt.

## [0.8.4] - 2025-12-24

### Improved

- **Internal**: Refactored exclusion logic to adhere to SOLID principles (centralized configuration).

## [0.8.3] - 2025-12-24

### Improved

- **Tests**: Excluded `.g.dart` and `.freezed.dart` from auto-test creation.

## [0.8.2] - 2025-12-24

### Added

- **Productivity**: Auto-create missing test files logic
    - Running "Run Related Test" on a file with no test now automatically creates the `test/` file mirroring `lib/` structure.
    - "Run Folder Tests" now scans for all `.dart` files in the selected folder and generates missing tests for all of them.
    - Automatically handles package imports based on `pubspec.yaml` name.
- **Testing**: Added unit tests for file generation logic.

## [0.8.1] - 2025-12-24

### Fixed

- **UI**: Release with rounded rerun button.

## [0.8.0] - 2025-12-24

### Added

- **Dashboard**: Uncovered lines display in multi-test folder dashboard
    - Expandable rows showing uncovered line numbers for each test file
    - Clickable line badges to navigate directly to uncovered lines in source files
    - Copy button to copy all uncovered lines for each test
    - Visual indicators with red badges and hover effects
- **Navigation**: Clickable test file names in folder dashboard
    - Click any test file name to open it in the editor
    - Blue hover effect for better UX
- **UI**: Scroll-to-top button in folder dashboard
    - Floating button appears when scrolling past 300px
    - Smooth scroll animation to top
    - Gradient styling with hover effects
- **Architecture**: Reusable WebviewComponents module
    - Shared scroll-to-top button component
    - Eliminates code duplication between single and folder test views
    - 60+ lines of code reduced through component reuse

### Improved

- **Testing**: Increased test coverage to 92 tests (from 84)
    - 8 new comprehensive tests for dashboard features
    - Tests for uncovered lines display, navigation, and scroll functionality
- **Code Quality**: Better maintainability through component extraction
- **UX**: Consistent scroll-to-top behavior across all test views

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
