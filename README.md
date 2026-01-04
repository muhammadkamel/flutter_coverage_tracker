p # Flutter Coverage Tracker

[![VSCode Marketplace](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://marketplace.visualstudio.com/items?itemName=muhammadkamel.flutter-coverage-tracker)
[![Version](https://img.shields.io/badge/version-0.10.0-green)](https://github.com/muhammadkamel/flutter_coverage_tracker)

A powerful VS Code extension that tracks and visualizes Flutter test coverage with an intuitive interface, making it easy to identify untested code and maintain high-quality Flutter applications.

## ✨ Features

- 📊 **Real-time Coverage Tracking** - Monitor coverage percentage in your status bar
- 🎯 **Quick Test Execution** - Run related tests directly from any Dart file with right-click context menu
- 📁 **Folder Test Runner** - Run tests for entire folders and view aggregated results
- 🌳 **Hierarchical Dashboard** - Organize test results in an expandable folder tree structure
- 🔍 **Uncovered Lines Navigation** - Click on line numbers to jump directly to untested code
- 📝 **Export Coverage Reports** - Generate Markdown reports of uncovered lines for team sharing
- 🔄 **Smart Test Creation & Updates** - Auto-create missing test files and smart-update existing ones with stubs for new public methods
- ↔️ **Jump to Test/Implementation** - Seamlessly switch between source code and its corresponding test file
- ⚡ **Watch Mode** - Automatically re-run tests when files change
- 🎨 **Beautiful UI** - Premium dashboard with gradient badges, progress indicators, and smooth animations

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install muhammadkamel.flutter-coverage-tracker`
4. Press Enter

### Usage

#### Single File Testing

1. Open any Dart file in your Flutter project
2. Right-click in the editor
3. Select **"Run Related Test"**
4. View coverage results in the interactive dashboard

#### Folder Testing

1. Right-click on any folder in the Explorer
2. Select **"Run Folder Tests"**
3. View aggregated results with folder hierarchy
4. Expand folders to see individual test files
5. Click on line numbers to navigate to uncovered code

#### Smart Test Updating

1. Open a test file (e.g., `test/calculator_test.dart`)
2. Run **"Run Related Test"**
3. If the corresponding source file has public methods not covered in the test file, stubs will be automatically appended!

#### Jump to Test / Implementation

1. Open any Dart file
2. Run command **"Go to Test/Implementation"** (or bind it to a shortcut)
3. Instantly navigate to the corresponding test file (or back to source)

#### Export Coverage Report

1. After running folder tests, click the **"Export MD"** button in the dashboard
2. A Markdown report will be generated with:
    - File names and coverage percentages
    - Specific uncovered line numbers
    - Easy sharing with your team

## 📸 Screenshots

### Status Bar Integration

The coverage percentage is always visible in your status bar, updating in real-time as you run tests.

### Interactive Dashboard

- **Coverage Visualization**: Circular progress indicators with gradient styling
- **Uncovered Lines**: Expandable sections showing exactly which lines need testing
- **Navigation**: Click any line number to jump directly to the code
- **Test Controls**: Re-run, watch mode, and cancel buttons

### Folder View

- **Hierarchical Tree**: Files organized by folder structure
- **Status Indicators**: Green dots for passing tests, red for failures
- **Aggregated Stats**: See folder-level coverage at a glance

## ⚙️ Configuration

Configure the extension through VS Code settings:

```json
{
    "flutterCoverage.coverageFilePath": "coverage/lcov.info"
}
```

### Settings

| Setting                            | Default              | Description                                           |
| ---------------------------------- | -------------------- | ----------------------------------------------------- |
| `flutterCoverage.coverageFilePath` | `coverage/lcov.info` | Path to the lcov.info file relative to workspace root |

## 🎯 Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **Flutter Coverage: Run Related Test** - Run test for the currently open file
- **Flutter Coverage: Run Folder Tests** - Run all tests in the selected folder
- **Flutter Coverage: Show Coverage Details** - Open the coverage dashboard

## 🏗️ How It Works

1. **Test Execution**: Runs `flutter test --coverage` for your selected file or folder
2. **Coverage Parsing**: Parses the generated `lcov.info` file
3. **Smart Matching**: Matches source files to coverage data using intelligent path resolution
4. **Visualization**: Displays results in a beautiful, interactive webview dashboard
5. **Navigation**: Provides clickable links to navigate to uncovered code

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests on [GitHub](https://github.com/muhammadkamel/flutter_coverage_tracker).

## 📝 License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/muhammadkamel/flutter_coverage_tracker)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=muhammadkamel.flutter-coverage-tracker)
- [Report Issues](https://github.com/muhammadkamel/flutter_coverage_tracker/issues)

## 📊 Statistics

- **100% Logic Coverage** on all core modules
- **195+ Unit Tests** with comprehensive edge case handling
- **Dual-layer Testing** architecture (unit + integration tests)
- **85% Overall Coverage** (statements, branches, functions)

## 🎉 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and new features.

---

**Made with ❤️ for the Flutter community**
