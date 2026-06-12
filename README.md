# flutter-toolbox

A powerful VS Code extension that streamlines Flutter build processes for APK, IPA, and Web builds with intelligent command sequencing and real-time progress tracking.

## Features

### 🚀 Build Commands

- **Build APK** - Generate Android APK with optimized build sequence
- **Build IPA** - Generate iOS IPA with optimized build sequence
- **Build Web** - Generate web build with customizable base-href and optional WebAssembly (WASM) support

### 🛠️ Utility Commands

- **Flutter Version** - Check installed Flutter version (works with FVM or system Flutter)
- **Build Runner** - Generate freezed/json_serializable classes with `dart run build_runner build --delete-conflicting-outputs`
- **Analyze** - Run `flutter analyze` to check code for issues
- **Format** - Run `flutter format` to format all Dart files
- **Clean** - Run `flutter clean` to remove build artifacts
- **Pub Get** - Run `flutter pub get` to fetch dependencies
- **Clean & Pub Get** - Combined clean and pub get with optional pubspec.lock deletion
- **Pod Install** - Clean and reinstall iOS CocoaPods dependencies

### 🔌 Environment Setups

- **Generate FyUI MCP Config** - Generate Model Context Protocol configuration for FyUI library
- **Generate Fyers Launch Config** - Generate VS Code launch.json configurations for Fyers App (web + mobile)
- **Add Flutter Cursor Rules** - Copy Flutter coding rules and best practices to project's `.cursor/rules/` folder

### 📦 Submodules

- **Submodule Update** - After `git pull` or branch switch. Sync `packages/` to the SHAs recorded by the parent repo (`git submodule update --init --recursive`)
- **Submodule Remote Status** - List which submodules are behind `origin/<branch>` from `.gitmodules` (read-only scan)
- **Submodule Update Remote** - Scan remotes, then bump **only outdated** submodules to branch tips. Review `git status`, then commit pointer changes in the parent repo
- **Submodule Update Remote (All)** - Bump every submodule to remote branch tip (use when you need a full refresh)
- **Submodule Update + Pub Get** - After pull: sync submodules to recorded SHAs, then `flutter pub get` at app root
- **Bump Single Submodule** - Pick one package (e.g. `fy_ui`). Update only that submodule to latest on its `.gitmodules` branch; commit when ready

### 🔀 Git Actions

- **Open Repository** - Open GitHub repository in browser (with current branch if not main/master)
- **Open Current File** - Open currently active file on GitHub (jumps to current line)
- **View Current Commit** - View current HEAD commit on GitHub
- **Copy Commit Hash** - Copy current commit SHA to clipboard
- **Create PR** - Open GitHub PR creation page (current branch → master)
- **View PR** - View existing pull requests for current branch
- **Open Actions** - Open GitHub Actions CI/CD page

### 📝 Code Generation

- **Generate Freezed Cubit/Bloc State** - Generate complete file with all 3 classes (Parent State + APIState + UIState) with customizable UI fields
- **Generate Freezed API State** - Generate boilerplate freezed code for API state (initial/loading/loaded/error)
- **Generate Freezed UI State** - Generate boilerplate freezed code for UI state with customizable fields
- **Generate Freezed Model** - Generate boilerplate freezed code for data models with optional JSON serialization

### ✨ Key Capabilities

- **Sidebar UI** - Beautiful sidebar panel with clickable build commands
- **Real-time Status Tracking** - Watch each command execute with live status updates in sidebar
- **Step-by-Step Progress** - See individual build steps with icons (waiting/running/success/failed)
- **Build History** - Last 5 builds kept in sidebar with timing and status
- **Error Accordion** - Expandable error details right in the sidebar
- **Quick Access to Outputs** - One-click button to open build output folders in Finder/Explorer
- **Configurable Flutter Command** - Use `fvm flutter`, `flutter`, or custom command prefix
- **Smart Build Sequencing** - Automated clean, pub get, and build cycles for optimal results
- **Optional pubspec.lock Deletion** - Choose whether to delete pubspec.lock before each build
- **Base-href Support** - Configure base-href for web builds with built-in validation
- **WebAssembly (WASM) Support** - Optional WASM compilation for web builds with better performance
- **Detailed Output Logging** - View complete build logs in dedicated output channel
- **Command Palette Integration** - Access builds via Command Palette or sidebar
- **Cross-Platform** - Works on macOS, Windows, and Linux
- **Git Integration** - Quick access to GitHub repository, PRs, and Actions

## Usage

### Running a Build

#### Method 1: Using Sidebar (Recommended)

1. Open a Flutter project in VS Code
2. Click the **flutter-toolbox** icon in the Activity Bar (left sidebar)
3. Choose from the available options:

**BUILD Section:**
   - 📱 **Build APK** - Android release build
   - 📱 **Build IPA** - iOS release build
   - 🌐 **Build Web** - Web release build

**UTILS Section:**
   - ℹ️ **Flutter Version** - Check Flutter version
   - ⚙️ **Build Runner** - Generate code files (freezed, json_serializable)
   - 🔍 **Analyze** - Check code for issues
   - 🎨 **Format** - Format all Dart files
   - 🗑️ **Clean** - Clean build artifacts
   - 📥 **Pub Get** - Fetch dependencies
   - 🔄 **Clean & Pub Get** - Combined clean and pub get
   - 📦 **Pod Install** - Clean and reinstall iOS pods

**Environment Setups Section:**
   - 📝 **Generate FyUI MCP Config** - Create MCP configuration for FyUI library
   - 🐛 **Generate Fyers Launch Config** - Create launch.json for Fyers App debugging
   - 📄 **Add Flutter Cursor Rules** - Add Flutter coding rules to project

**Submodules Section:**
   - 🔄 **Submodule Update** - Sync packages to parent-recorded SHAs
   - 📋 **Submodule Remote Status** - List submodules behind remote
   - ⬇️ **Submodule Update Remote** - Bump outdated submodules only
   - ⬇️ **Submodule Update Remote (All)** - Bump every submodule
   - 🔁 **Submodule Update + Pub Get** - Sync submodules + root pub get
   - ⬆️ **Bump Single Submodule** - Bump one package submodule

**Git Actions Section:**
   - 📂 **Open Repository** - Open GitHub repo in browser
   - 📄 **Open Current File** - Open active file on GitHub
   - 👁️ **View Current Commit** - View HEAD commit on GitHub
   - 📋 **Copy Commit Hash** - Copy commit SHA
   - ➕ **Create PR** - Create pull request to master
   - 👁️ **View PR** - View PRs for current branch
   - ⚡ **Open Actions** - Open GitHub Actions

**Code Generation Section:**
   - 📝 **Generate Freezed Cubit/Bloc State** - Generate Cubit/Bloc state boilerplate
   - 🔧 **Generate Freezed API State** - Generate API state boilerplate
   - 🎨 **Generate Freezed UI State** - Generate UI state boilerplate
   - 📦 **Generate Freezed Model** - Generate data model boilerplate

4. Follow the prompts:
   - Choose whether to delete `pubspec.lock`
   - For web builds:
     - Enter base-href (default: `/`)
     - Choose whether to use WebAssembly (WASM)
   - Confirm to start the build

5. **Watch real-time progress** in the sidebar:
   - Build session appears as an expandable item
   - Each command step shows live status:
     - 🕐 **Waiting** - Step queued
     - 🔄 **Running** - Currently executing
     - ✅ **Success** - Completed successfully
     - ❌ **Failed** - Error occurred (expand to see details)
   - Execution time shown for each completed step

6. **Access build outputs** after successful completion:
   - Click **📂 Open Output Folder** button at the bottom of completed builds
   - Opens the build output folder in Finder (macOS) / Explorer (Windows) / File Manager (Linux)
   - Direct access to generated APK, IPA, or web files

#### Method 2: Using Command Palette

1. Open a Flutter project in VS Code
2. Open Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Type and select one of:
   - `Flutter: Build APK`
   - `Flutter: Build IPA`
   - `Flutter: Build Web`

4. Follow the same prompts as above

### Monitoring Build Progress

- **Sidebar Panel**: Real-time status for each build step with icons and timing
  - Active builds show with spinning icon
  - Completed builds show in recent history (up to 5)
  - Failed steps are expandable to show error details
  - Use 🗑️ "Clear Build History" button to remove old builds
- **Status Bar** (bottom): Shows current build step with spinner
- **Output Panel**: View → Output → Select "flutter-toolbox" for detailed logs
- **Notifications**: Success/error messages appear as popup notifications

### Using MCP Config Generators

#### Generate FyUI MCP Config

1. Click **Generate FyUI MCP Config** in the MCP section
2. Enter the absolute path to your `fy_ui` repository (e.g., `/Users/yourname/projects/fy_ui`)
3. The configuration is:
   - ✅ Generated with proper path normalization
   - ✅ Automatically copied to clipboard
   - ✅ Displayed in output panel
   - ✅ Adapts to FVM or system Dart based on your settings
4. Paste the config into your MCP settings file

#### Generate Fyers Launch Config

1. Click **Generate Fyers Launch Config** in the MCP section
2. Enter the absolute path to your `fyers_app` repository
3. Two launch configurations are generated:
   - **fyers_app** - Web debug on Chrome (port 5000, with CORS disabled)
   - **fyers app mobile** - Mobile debug configuration
4. The configuration is:
   - ✅ Validated against lib/main.dart existence
   - ✅ Automatically copied to clipboard
   - ✅ Displayed in output panel
5. Click **Open launch.json** to:
   - Open existing launch.json, OR
   - Create new launch.json with these configurations

#### Add Flutter Cursor Rules

1. Click **Add Flutter Cursor Rules** in the Environment Setups section
2. Enter the absolute path to your Flutter project (e.g., `/Users/yourname/projects/flutter_app`)
3. The extension will:
   - ✅ Validate the path and check for pubspec.yaml
   - ✅ Create `.cursor/rules/` directory if it doesn't exist
   - ✅ Copy `flutter_rules.mdc` to the project
   - ✅ Display file structure in output panel
4. Choose action after completion:
   - **Open File** - View the added rules file
   - **Add to Another Project** - Copy rules to another project
   - **Close** - Complete the action

**What are Cursor Rules?**

Cursor rules are coding guidelines and best practices that Cursor AI editor automatically applies when working in your project. The Flutter rules include:

- Dart and Flutter coding conventions
- BLoC/Cubit state management patterns
- Freezed immutable class guidelines
- Clean architecture principles
- Performance optimization tips
- Project structure guidelines
- Naming conventions
- Testing best practices

**File Location:**
```
your_flutter_project/
└── .cursor/
    └── rules/
        └── flutter_rules.mdc
```

The rules will be automatically applied by Cursor when you work in this project, helping maintain consistent code quality and following Flutter best practices.

### Using Code Generation

Generate freezed boilerplate code with guided prompts. All generated code is automatically copied to clipboard and displayed in the output panel.

#### Generate Freezed Cubit/Bloc State

1. Click **Generate Freezed Cubit/Bloc State** in the Code Generation section
2. Enter the state class name (e.g., `AuthState`)
3. Enter the UI state class name (e.g., `AuthUiState`)
4. Specify the number of fields for the UI state (1-20)
5. For each field:
   - Enter field name (e.g., `isLoading`)
   - Select field type from dropdown
   - Default values are automatically assigned
6. Generated code includes **all 3 classes in one complete file**:
   - Main state class with `APIState` and UI state fields
   - Complete `APIState` class (initial/loading/loaded/error)
   - Complete UI state class with your custom fields
   - All initial factory constructors

Example output (complete file):
```dart
@freezed
abstract class AuthState with _$AuthState {
  const factory AuthState({
    required APIState apiState,
    required AuthUiState uiState,
  }) = _AuthState;

  factory AuthState.initial() => AuthState(
        apiState: const APIState.initial(),
        uiState: AuthUiState.initial(),
      );
}

@freezed
abstract class APIState with _$APIState {
  const factory APIState.initial() = _APIStateInitial;

  const factory APIState.loading() = _APIStateLoading;

  const factory APIState.loaded({
    required dynamic data,
  }) = _APIStateLoaded;

  const factory APIState.error({
    int? code,
    String? message,
    String? status,
  }) = _APIStateError;
}

@freezed
abstract class AuthUiState with _$AuthUiState {
  const factory AuthUiState({
    required bool isLoading,
    required String errorMessage,
    required int loginAttempts,
    required User? currentUser,
  }) = _AuthUiState;

  factory AuthUiState.initial() => const AuthUiState(
        isLoading: false,
        errorMessage: '',
        loginAttempts: 0,
        currentUser: null,
      );
}
```

#### Generate Freezed API State

1. Click **Generate Freezed API State** in the Code Generation section
2. Choose whether to use a generic type `<T>` or not
3. Generated code includes:
   - Initial state
   - Loading state
   - Loaded state (with data)
   - Error state (with code, message, status)

Example output (with generic):
```dart
@freezed
abstract class APIState<T> with _$APIState<T> {
  const factory APIState.initial() = _APIStateInitial<T>;
  const factory APIState.loading() = _APIStateLoading<T>;
  const factory APIState.loaded({
    required T data,
  }) = _APIStateLoaded<T>;
  const factory APIState.error({
    int? code,
    String? message,
    String? status,
  }) = _APIStateError<T>;
}
```

#### Generate Freezed UI State

1. Click **Generate Freezed UI State** in the Code Generation section
2. Enter the UI state class name (e.g., `AuthUiState`)
3. Specify the number of fields (1-20)
4. For each field:
   - Enter field name (e.g., `isLoading`)
   - Select field type from dropdown:
     - `int`, `double`, `String`, `bool`
     - `List`, `Map`, `dynamic`
     - Custom (nullable) - prompts for custom type
   - Default values are automatically assigned based on type
5. Generated code includes:
   - Field declarations
   - Initial factory constructor with default values

Example output:
```dart
@freezed
abstract class AuthUiState with _$AuthUiState {
  const factory AuthUiState({
    required bool isLoading,
    required String errorMessage,
    required int loginAttempts,
    required User? currentUser,
  }) = _AuthUiState;

  factory AuthUiState.initial() => const AuthUiState(
        isLoading: false,
        errorMessage: '',
        loginAttempts: 0,
        currentUser: null,
      );
}
```

#### Generate Freezed Model

1. Click **Generate Freezed Model** in the Code Generation section
2. Enter the model class name (e.g., `User`)
3. Choose whether to include JSON serialization (fromJson/toJson)
4. Specify the number of fields (1-20)
5. For each field:
   - Enter field name (e.g., `userId`)
   - Select field type from dropdown:
     - `int`, `int?`, `double`, `double?`
     - `String`, `String?`, `bool`, `bool?`
     - `List<dynamic>`, `Map<String, dynamic>`
     - Custom - prompts for custom type
   - If JSON serialization is enabled, optionally specify JSON key (if different from field name)
6. Generated code includes:
   - Field declarations with `@JsonKey` annotations (if needed)
   - Optional fromJson factory method

Example output (with JSON serialization):
```dart
@freezed
abstract class User with _$User {
  const factory User({
    @JsonKey(name: 'user_id') required String userId,
    required String name,
    required String? email,
    required int age,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

**Note**: For models with JSON serialization, remember to add:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';
```

#### Git Actions

All git actions work with your current workspace git repository:

1. **Open Repository**
   - Opens GitHub repository in your default browser
   - If on a feature branch, opens that branch view
   - If on main/master, opens repository homepage

2. **Open Current File**
   - Opens the currently active file on GitHub
   - Automatically jumps to your current cursor line
   - Uses current branch (not commit) for live file view
   - Perfect for sharing specific code with teammates
   - Example: `https://github.com/user/repo/blob/feature-branch/lib/main.dart#L45`

3. **View Current Commit**
   - Opens the current HEAD commit on GitHub
   - See commit message, changed files, and diff
   - Shows short hash (first 7 chars) in notification

4. **Copy Commit Hash**
   - Copies the full commit SHA to clipboard
   - Shows short hash in confirmation message
   - Useful for referencing commits in PRs/issues

5. **Create PR**
   - Opens GitHub PR creation page
   - Pre-configured to create PR: `current branch` → `master`
   - Works with any branch except main/master

6. **View PR**
   - Opens GitHub PRs filtered by current branch
   - See all PRs for your current branch
   - Quick way to check PR status

7. **Open Actions**
   - Opens GitHub Actions page
   - View CI/CD workflow runs
   - Check build status

### Build Process

Each build follows this optimized sequence:

1. **Optional**: Delete `pubspec.lock` (if selected)
2. **1st Pass**: Clean project + Get dependencies
3. **2nd Pass**: Clean project + Get dependencies
4. **1st Build**: Execute build command
5. **3rd Pass**: Clean project + Get dependencies
6. **Final Build**: Execute build command

This multiple-pass approach ensures:
- Fresh dependency resolution
- Consistent build artifacts
- Reduced build issues from cached state

## Configuration

### Settings

Configure the extension in VS Code settings:

```json
{
  "flutterBuildUtils.flutterCommand": "fvm flutter",  // or "flutter"
  "flutterBuildUtils.customFlutterCommand": ""        // custom command prefix
}
```

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `flutterBuildUtils.flutterCommand` | Flutter command prefix | `fvm flutter` |
| `flutterBuildUtils.customFlutterCommand` | Custom Flutter command (overrides above) | `""` |

### Customizing Build Commands

Build command sequences are defined in `src/buildCommands.ts`. To customize:

1. Open the extension source code
2. Edit `src/buildCommands.ts`
3. Modify the `getBuildConfig()` function
4. Rebuild and reload the extension

## Requirements

- VS Code 1.85.0 or higher
- Flutter SDK installed
- (Optional) FVM installed if using `fvm flutter` command

## Sidebar UI Example

When you run a build, the sidebar will show:

```
flutter-toolbox
├── 📱 Build APK
├── 📱 Build IPA
├── 🌐 Build Web
├── ─────────────────────
└── 🔄 Android APK (Running...)
    ├── 🕐 Delete pubspec.lock (Waiting...)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    ├── 🔄 Clean project (2nd pass) (Running...)
    ├── 🕐 Get dependencies (2nd pass) (Waiting...)
    ├── 🕐 Build APK (1st build) (Waiting...)
    └── ...
```

After completion:

```
flutter-toolbox
├── 📱 Build APK
├── 📱 Build IPA
├── 🌐 Build Web
├── ─────────────────────
└── ✅ Android APK (45.2s)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    ├── ✅ Clean project (2nd pass) (2.1s)
    ├── ✅ Get dependencies (2nd pass) (4.9s)
    ├── ✅ Build APK (1st build) (18.5s)
    ├── ✅ Clean project (3rd pass) (2.2s)
    ├── ✅ Get dependencies (3rd pass) (5.0s)
    ├── ✅ Build APK (final build) (17.8s)
    └── 📂 Open Output Folder (build/app/outputs/flutter-apk)
```

If a step fails:

```
└── ❌ Android APK (12.5s)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    └── ❌ Build APK (1st build) (5.1s)
        └── Error: Gradle build failed... (click to expand)
```

## Extension Commands

This extension contributes the following commands:

**Build Commands:**
- `flutter-build-utils.buildApk` - Build Android APK
- `flutter-build-utils.buildIpa` - Build iOS IPA
- `flutter-build-utils.buildWeb` - Build Web with base-href

**Utility Commands:**
- `flutter-build-utils.flutterVersion` - Check Flutter version
- `flutter-build-utils.buildRunner` - Generate code with build_runner
- `flutter-build-utils.flutterAnalyze` - Analyze Dart code
- `flutter-build-utils.flutterFormat` - Format Dart code
- `flutter-build-utils.clean` - Run flutter clean
- `flutter-build-utils.pubGet` - Run flutter pub get
- `flutter-build-utils.cleanAndPubGet` - Clean & Pub Get with optional pubspec.lock deletion
- `flutter-build-utils.podInstall` - Clean and reinstall iOS CocoaPods dependencies

**Environment Setup Commands:**
- `flutter-build-utils.generateMcpConfig` - Generate FyUI MCP configuration
- `flutter-build-utils.generateFyersLaunchConfig` - Generate Fyers App launch configurations
- `flutter-build-utils.addFlutterCursorRules` - Add Flutter cursor rules to project

**Git Action Commands:**
- `flutter-build-utils.openRepository` - Open GitHub repository in browser
- `flutter-build-utils.openCurrentFile` - Open current file on GitHub with line number
- `flutter-build-utils.viewCurrentCommit` - View current commit on GitHub
- `flutter-build-utils.copyCommitHash` - Copy commit hash to clipboard
- `flutter-build-utils.createPR` - Create pull request
- `flutter-build-utils.viewPR` - View pull requests for current branch
- `flutter-build-utils.openActions` - Open GitHub Actions

**Code Generation Commands:**
- `flutter-build-utils.generateFreezedCubitState` - Generate freezed Cubit/Bloc state boilerplate
- `flutter-build-utils.generateFreezedApiState` - Generate freezed API state boilerplate
- `flutter-build-utils.generateFreezedUiState` - Generate freezed UI state boilerplate
- `flutter-build-utils.generateFreezedModel` - Generate freezed model boilerplate

**Other Commands:**
- `flutter-build-utils.refreshView` - Refresh sidebar view
- `flutter-build-utils.clearSessions` - Clear build history
- `flutter-build-utils.openOutputFolder` - Open build output folder in Finder/Explorer

## Output and Logs

All build output is logged to the **flutter-toolbox** output channel:

- Step-by-step progress with status indicators
- Command execution details
- Standard output and error streams
- Detailed error information on failures

Access via: `View → Output → flutter-toolbox`

## Troubleshooting

### Build Fails at First Step

- Ensure Flutter SDK is properly installed
- Verify `flutterCommand` setting matches your setup
- Check if FVM is installed (if using `fvm flutter`)

### pubspec.yaml Not Found

- Open a valid Flutter project
- Ensure `pubspec.yaml` exists in workspace root

### Command Not Found

- Verify Flutter is in your system PATH
- For FVM: ensure FVM is installed and configured
- Try using custom Flutter command in settings

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linter
npm run lint
```

### Building VSIX Package

Use the automated build script:

```bash
./build.sh
```

This will:
- Check all prerequisites (Node.js, npm, dependencies)
- Run linter and validate code quality
- Clean and compile TypeScript
- Package into VSIX with all validations
- Show detailed build summary

The generated `flutter-build-utils-0.0.1.vsix` can be installed or shared with others.

### Project Structure

```
.
├── src/
│   ├── extension.ts        # Main extension entry point
│   ├── buildRunner.ts      # Build execution logic
│   ├── buildCommands.ts    # Build command configurations
│   └── types.ts            # TypeScript type definitions
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript configuration
```

## Release Notes

### 0.0.1

Initial release with support for:
- Android APK builds
- iOS IPA builds
- Web builds with base-href and optional WebAssembly (WASM)
- Utility commands (Version, Build Runner, Analyze, Format, Clean, Pub Get, Clean & Pub Get, Pod Install)
- Environment setup generators (FyUI MCP, Fyers App Launch Config)
- Git Actions (Open Repo, Open Current File, View Commit, Copy Hash, Create PR, View PR, Open Actions)
- Sidebar UI with organized sections (Build/Utils/Environment setups/Git Actions)
- Real-time command-by-command status tracking in sidebar
- Build history (last 5 builds) with timing
- Expandable error details in sidebar
- One-click access to build output folders (APK/IPA/Web)
- Cross-platform folder opening (macOS/Windows/Linux)
- Configurable Flutter command prefix (supports FVM)
- Automatic Dart command derivation from Flutter command
- Smart build sequencing with multiple clean/pub get cycles
- Code generation with build_runner
- Code quality checks with analyze and format
- iOS dependency management with Pod Install with UTF-8 encoding fix
- WebAssembly compilation option for web builds
- Model Context Protocol integration support
- VS Code launch.json generator for Fyers App
- Git integration for GitHub workflows (repo, PRs, actions)
- Automatic URL opening in default browser
- Cross-platform browser support (macOS/Windows/Linux)
- Automatic clipboard copy for generated configs
- Code generation utilities for freezed boilerplate (Cubit/Bloc state, API state, UI state, Models)
- Interactive prompts for code generation with validation
- Support for generic types in API state generation
- JSON serialization support in model generation
- Customizable field types and default values
- Automatic clipboard copy for generated code
- Flutter cursor rules setup for projects (with Cursor AI coding guidelines)
- Automatic directory creation for cursor rules
- File validation and error handling
- Detailed output logging
- Status bar progress indicators

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Enjoy streamlined Flutter builds!** 🎉
