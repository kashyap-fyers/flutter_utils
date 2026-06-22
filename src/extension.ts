/**
 * flutter-toolbox Extension
 * Main extension file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getBuildConfig } from './buildCommands';
import { BuildRunner } from './buildRunner';
import { BuildTreeItem, BuildTreeProvider } from './buildTreeView';
import {
    generateFreezedApiState,
    generateFreezedCubitState,
    generateFreezedModel,
    generateFreezedUiState
} from './codeGenerator';
import { setActivePackage, showActivePackage } from './cursorActivePackage';
import { hasGitmodules, parseGitmodules } from './submoduleUtils';
import { BuildType } from './types';
import { UtilityRunner } from './utilityRunner';

let buildRunner: BuildRunner;
let utilityRunner: UtilityRunner;
let treeDataProvider: BuildTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('flutter-toolbox extension is now active');

    // Initialize tree view provider first
    treeDataProvider = new BuildTreeProvider();
    const treeView = vscode.window.registerTreeDataProvider(
        'flutterBuildUtilsView',
        treeDataProvider
    );

    // Initialize build runner and utility runner with tree provider
    buildRunner = new BuildRunner(treeDataProvider);
    utilityRunner = new UtilityRunner(treeDataProvider);

    // Register commands
    const buildApkCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildApk',
        () => handleBuild(BuildType.APK)
    );

    const buildIpaCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildIpa',
        () => handleBuild(BuildType.IPA)
    );

    const buildWebCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildWeb',
        () => handleBuild(BuildType.Web)
    );

    const refreshViewCommand = vscode.commands.registerCommand(
        'flutter-build-utils.refreshView',
        () => treeDataProvider.refresh()
    );

    const clearSessionsCommand = vscode.commands.registerCommand(
        'flutter-build-utils.clearSessions',
        () => {
            treeDataProvider.clearSessions();
            vscode.window.showInformationMessage('Build history cleared');
        }
    );

    const openOutputFolderCommand = vscode.commands.registerCommand(
        'flutter-build-utils.openOutputFolder',
        (item: BuildTreeItem) => {
            if (item && item.folderPath) {
                openFolderInFinder(item.folderPath);
            }
        }
    );

    // Utility commands
    const flutterVersionCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterVersion',
        () => handleUtilityCommand('flutterVersion')
    );

    const cleanCommand = vscode.commands.registerCommand(
        'flutter-build-utils.clean',
        () => handleUtilityCommand('clean')
    );

    const pubGetCommand = vscode.commands.registerCommand(
        'flutter-build-utils.pubGet',
        () => handleUtilityCommand('pubGet')
    );

    const cleanAndPubGetCommand = vscode.commands.registerCommand(
        'flutter-build-utils.cleanAndPubGet',
        () => handleUtilityCommand('cleanAndPubGet')
    );

    const pubGetAllInFolderCommand = vscode.commands.registerCommand(
        'flutter-build-utils.pubGetAllInFolder',
        () => handlePubGetAllInFolder()
    );

    const cleanAndPubGetAllInFolderCommand = vscode.commands.registerCommand(
        'flutter-build-utils.cleanAndPubGetAllInFolder',
        () => handleCleanAndPubGetAllInFolder()
    );

    const gitPullAllInFolderCommand = vscode.commands.registerCommand(
        'flutter-build-utils.gitPullAllInFolder',
        () => handleGitPullAllInFolder()
    );

    const podInstallCommand = vscode.commands.registerCommand(
        'flutter-build-utils.podInstall',
        () => handleUtilityCommand('podInstall')
    );

    const buildRunnerCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildRunner',
        () => handleUtilityCommand('buildRunner')
    );

    const flutterAnalyzeCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterAnalyze',
        () => handleUtilityCommand('flutterAnalyze')
    );

    const flutterFormatCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterFormat',
        () => handleUtilityCommand('flutterFormat')
    );

    // MCP commands
    const generateMcpConfigCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateMcpConfig',
        () => handleGenerateMcpConfig()
    );

    const generateFyersLaunchConfigCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFyersLaunchConfig',
        () => handleGenerateFyersLaunchConfig()
    );

    // Git action commands
    const openRepositoryCommand = vscode.commands.registerCommand(
        'flutter-build-utils.openRepository',
        () => handleGitAction('openRepo')
    );

    const createPRCommand = vscode.commands.registerCommand(
        'flutter-build-utils.createPR',
        () => handleGitAction('createPR')
    );

    const viewPRCommand = vscode.commands.registerCommand(
        'flutter-build-utils.viewPR',
        () => handleGitAction('viewPR')
    );

    const openActionsCommand = vscode.commands.registerCommand(
        'flutter-build-utils.openActions',
        () => handleGitAction('openActions')
    );

    const openCurrentFileCommand = vscode.commands.registerCommand(
        'flutter-build-utils.openCurrentFile',
        () => handleGitAction('openCurrentFile')
    );

    const viewCurrentCommitCommand = vscode.commands.registerCommand(
        'flutter-build-utils.viewCurrentCommit',
        () => handleGitAction('viewCurrentCommit')
    );

    const copyCommitHashCommand = vscode.commands.registerCommand(
        'flutter-build-utils.copyCommitHash',
        () => handleGitAction('copyCommitHash')
    );

    // Code generation commands
    const generateFreezedCubitStateCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFreezedCubitState',
        () => generateFreezedCubitState()
    );

    const generateFreezedApiStateCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFreezedApiState',
        () => generateFreezedApiState()
    );

    const generateFreezedUiStateCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFreezedUiState',
        () => generateFreezedUiState()
    );

    const generateFreezedModelCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFreezedModel',
        () => generateFreezedModel()
    );

    const showActivePackageCommand = vscode.commands.registerCommand(
        'flutter-build-utils.showActivePackage',
        () => showActivePackage()
    );

    const setActivePackageCommand = vscode.commands.registerCommand(
        'flutter-build-utils.setActivePackage',
        () => setActivePackage()
    );

    const addFlutterCursorRulesCommand = vscode.commands.registerCommand(
        'flutter-build-utils.addFlutterCursorRules',
        () => handleAddFlutterCursorRules(context)
    );

    const submoduleUpdateCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleUpdate',
        () => handleSubmoduleUpdate()
    );

    const submoduleRemoteStatusCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleRemoteStatus',
        () => handleSubmoduleRemoteStatus()
    );

    const submoduleUpdateRemoteCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleUpdateRemote',
        () => handleSubmoduleUpdateRemote()
    );

    const submoduleUpdateRemoteAllCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleUpdateRemoteAll',
        () => handleSubmoduleUpdateRemoteAll()
    );

    const submoduleUpdateAndPubGetCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleUpdateAndPubGet',
        () => handleSubmoduleUpdateAndPubGet()
    );

    const submoduleUpdateRemoteOneCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleUpdateRemoteOne',
        () => handleSubmoduleUpdateRemoteOne()
    );

    const submoduleResetAllCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleResetAll',
        () => handleSubmoduleResetAll()
    );

    const submoduleResetOneCommand = vscode.commands.registerCommand(
        'flutter-build-utils.submoduleResetOne',
        () => handleSubmoduleResetOne()
    );

    const gitPushCommand = vscode.commands.registerCommand(
        'flutter-build-utils.gitPush',
        () => handleGitCommand('push')
    );

    const gitPullCommand = vscode.commands.registerCommand(
        'flutter-build-utils.gitPull',
        () => handleGitCommand('pull')
    );

    context.subscriptions.push(
        buildApkCommand,
        buildIpaCommand,
        buildWebCommand,
        refreshViewCommand,
        clearSessionsCommand,
        openOutputFolderCommand,
        flutterVersionCommand,
        buildRunnerCommand,
        flutterAnalyzeCommand,
        flutterFormatCommand,
        cleanCommand,
        pubGetCommand,
        cleanAndPubGetCommand,
        pubGetAllInFolderCommand,
        cleanAndPubGetAllInFolderCommand,
        podInstallCommand,
        generateMcpConfigCommand,
        generateFyersLaunchConfigCommand,
        openRepositoryCommand,
        openCurrentFileCommand,
        viewCurrentCommitCommand,
        copyCommitHashCommand,
        createPRCommand,
        viewPRCommand,
        openActionsCommand,
        generateFreezedCubitStateCommand,
        generateFreezedApiStateCommand,
        generateFreezedUiStateCommand,
        generateFreezedModelCommand,
        showActivePackageCommand,
        setActivePackageCommand,
        addFlutterCursorRulesCommand,
        submoduleUpdateCommand,
        submoduleRemoteStatusCommand,
        submoduleUpdateRemoteCommand,
        submoduleUpdateRemoteAllCommand,
        submoduleUpdateAndPubGetCommand,
        submoduleUpdateRemoteOneCommand,
        submoduleResetAllCommand,
        submoduleResetOneCommand,
        gitPushCommand,
        gitPullCommand,
        gitPullAllInFolderCommand,
        treeView,
        buildRunner,
        utilityRunner
    );
}

/**
 * Handle build command execution
 */
async function handleBuild(buildType: BuildType): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flutter project.');
            return;
        }

        // Verify it's a Flutter project
        const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
        if (!fs.existsSync(pubspecPath)) {
            vscode.window.showErrorMessage('This does not appear to be a Flutter project (pubspec.yaml not found).');
            return;
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Get build-specific options
        let baseHref: string | undefined;
        let useWasm: boolean | undefined;
        let deletePubspecLock = false;

        // Ask if user wants to delete pubspec.lock
        const deleteLockChoice = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Delete pubspec.lock before build', value: true },
                { label: 'No', description: 'Keep pubspec.lock', value: false }
            ],
            {
                placeHolder: 'Delete pubspec.lock before building?',
                ignoreFocusOut: true
            }
        );

        if (deleteLockChoice === undefined) {
            return; // User cancelled
        }

        deletePubspecLock = !deleteLockChoice.value;

        // For web builds, get base-href and WASM option
        if (buildType === BuildType.Web) {
            baseHref = await getBaseHref();
            if (baseHref === undefined) {
                return; // User cancelled
            }

            // Ask if user wants to use WASM
            const wasmChoice = await vscode.window.showQuickPick(
                [
                    { label: 'No', description: 'Build with JavaScript (standard)', value: false },
                    { label: 'Yes', description: 'Build with WebAssembly (--wasm)', value: true }
                ],
                {
                    placeHolder: 'Use WebAssembly (WASM) for web build?',
                    ignoreFocusOut: true
                }
            );

            if (wasmChoice === undefined) {
                return; // User cancelled
            }

            useWasm = wasmChoice.value;
        }

        // Get build configuration
        const config = getBuildConfig(buildType, baseHref, useWasm);

        // Show confirmation
        const proceed = await vscode.window.showQuickPick(
            [
                { label: 'Start Build', description: `Execute ${config.steps.length} steps`, value: true },
                { label: 'Cancel', description: 'Cancel build process', value: false }
            ],
            {
                placeHolder: `Ready to build ${config.name}`,
                ignoreFocusOut: true
            }
        );

        if (!proceed || !proceed.value) {
            vscode.window.showInformationMessage('Build cancelled.');
            return;
        }

        // Execute build
        await buildRunner.executeBuild(config, workspaceFolder, flutterCommand, deletePubspecLock);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Build error: ${error.message}`);
    }
}

/**
 * Get workspace folder path
 */
async function getWorkspaceFolder(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    if (workspaceFolders.length === 1) {
        return workspaceFolders[0].uri.fsPath;
    }

    // Multiple workspace folders - let user choose
    const chosen = await vscode.window.showQuickPick(
        workspaceFolders.map(folder => ({
            label: folder.name,
            description: folder.uri.fsPath,
            folder: folder
        })),
        {
            placeHolder: 'Select workspace folder for build',
            ignoreFocusOut: true
        }
    );

    return chosen?.folder.uri.fsPath;
}

/**
 * Get Flutter command from settings
 */
function getFlutterCommand(): string {
    const config = vscode.workspace.getConfiguration('flutterBuildUtils');
    const customCommand = config.get<string>('customFlutterCommand', '').trim();

    if (customCommand) {
        return customCommand;
    }

    return config.get<string>('flutterCommand', 'fvm flutter');
}

/**
 * Get Dart command from Flutter command settings
 * Converts flutter command to dart command (e.g., "fvm flutter" -> "fvm dart")
 */
function getDartCommand(): string {
    const flutterCommand = getFlutterCommand();

    // Replace "flutter" with "dart" in the command
    return flutterCommand.replace('flutter', 'dart');
}

/**
 * Get base-href for web builds
 */
async function getBaseHref(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
        prompt: 'Enter base-href for web build',
        placeHolder: '/',
        value: '/',
        ignoreFocusOut: true,
        validateInput: (value: string) => {
            if (!value) {
                return 'Base-href cannot be empty';
            }
            if (!value.startsWith('/')) {
                return 'Base-href must start with "/"';
            }
            if (!value.endsWith('/')) {
                return 'Base-href must end with "/"';
            }
            return null;
        }
    });

    return input;
}

/**
 * Handle utility command execution
 */
async function handleUtilityCommand(utilType: 'flutterVersion' | 'buildRunner' | 'flutterAnalyze' | 'flutterFormat' | 'clean' | 'pubGet' | 'cleanAndPubGet' | 'podInstall'): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flutter project.');
            return;
        }

        // Verify it's a Flutter project (except for version check which can run anywhere)
        if (utilType !== 'flutterVersion') {
            const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
            if (!fs.existsSync(pubspecPath)) {
                vscode.window.showErrorMessage('This does not appear to be a Flutter project (pubspec.yaml not found).');
                return;
            }
        }

        // For pod install, check if ios folder exists
        if (utilType === 'podInstall') {
            const iosPath = path.join(workspaceFolder, 'ios');
            if (!fs.existsSync(iosPath)) {
                vscode.window.showErrorMessage('iOS folder not found. This project may not support iOS.');
                return;
            }
        }

        // Get Flutter and Dart commands from settings
        const flutterCommand = getFlutterCommand();
        const dartCommand = getDartCommand();

        // Handle different utility types
        switch (utilType) {
            case 'flutterVersion':
                await utilityRunner.executeFlutterVersion(workspaceFolder, flutterCommand);
                break;

            case 'buildRunner':
                await utilityRunner.executeBuildRunner(workspaceFolder, dartCommand, flutterCommand);
                break;

            case 'flutterAnalyze':
                await utilityRunner.executeFlutterAnalyze(workspaceFolder, flutterCommand);
                break;

            case 'flutterFormat':
                await utilityRunner.executeFlutterFormat(workspaceFolder, dartCommand, flutterCommand);
                break;

            case 'clean':
                await utilityRunner.executeClean(workspaceFolder, flutterCommand);
                break;

            case 'pubGet':
                await utilityRunner.executePubGet(workspaceFolder, flutterCommand);
                break;

            case 'cleanAndPubGet':
                // Ask if user wants to delete pubspec.lock
                const deleteLockChoice = await vscode.window.showQuickPick(
                    [
                        { label: 'Yes', description: 'Delete pubspec.lock before clean & pub get', value: true },
                        { label: 'No', description: 'Keep pubspec.lock', value: false }
                    ],
                    {
                        placeHolder: 'Delete pubspec.lock?',
                        ignoreFocusOut: true
                    }
                );

                if (deleteLockChoice !== undefined) {
                    await utilityRunner.executeCleanAndPubGet(
                        workspaceFolder,
                        flutterCommand,
                        deleteLockChoice.value
                    );
                }
                break;

            case 'podInstall':
                await utilityRunner.executePodInstall(workspaceFolder, flutterCommand);
                break;
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Utility command error: ${error.message}`);
    }
}

/**
 * Run pub get in all direct child folders that contain pubspec.yaml
 */
async function handlePubGetAllInFolder(): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeEditor = vscode.window.activeTextEditor;
        const defaultPath =
            (workspaceFolders && workspaceFolders.length > 0 && workspaceFolders[0].uri.fsPath) ||
            (activeEditor ? path.dirname(activeEditor.document.uri.fsPath) : '');

        const parentPathInput = await vscode.window.showInputBox({
            prompt: 'Enter folder path containing Flutter packages (pub get runs in each direct child with pubspec.yaml)',
            placeHolder: '/Users/yourname/projects/packages',
            value: defaultPath || undefined,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalized = value.trim().replace(/\/$/, '');
                if (!fs.existsSync(normalized)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                if (!fs.statSync(normalized).isDirectory()) {
                    return 'Path is not a directory.';
                }
                return null;
            }
        });

        if (!parentPathInput) {
            return;
        }

        const parentPath = parentPathInput.trim().replace(/\/$/, '');
        const entries = fs.readdirSync(parentPath, { withFileTypes: true });
        const packagePaths: string[] = [];

        for (const dirent of entries) {
            if (!dirent.isDirectory()) {
                continue;
            }
            const childPath = path.join(parentPath, dirent.name);
            const pubspecPath = path.join(childPath, 'pubspec.yaml');
            if (fs.existsSync(pubspecPath)) {
                packagePaths.push(childPath);
            }
        }

        packagePaths.sort();

        if (packagePaths.length === 0) {
            vscode.window.showErrorMessage('No Flutter packages found in direct children.');
            return;
        }

        const flutterCommand = getFlutterCommand();
        const succeededNames: string[] = [];
        const failedNames: string[] = [];

        for (const projectPath of packagePaths) {
            const name = path.basename(projectPath);
            const ok = await utilityRunner.executePubGet(projectPath, flutterCommand);
            if (ok) {
                succeededNames.push(name);
            } else {
                failedNames.push(name);
            }
        }

        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Pub get (all in folder) — Summary');
        outputChannel.appendLine('='.repeat(60));
        outputChannel.appendLine(`Parent folder: ${parentPath}`);
        outputChannel.appendLine(`Packages run: ${packagePaths.length}`);
        outputChannel.appendLine('');
        for (const name of succeededNames) {
            outputChannel.appendLine(`  ✓ ${name}`);
        }
        for (const name of failedNames) {
            outputChannel.appendLine(`  ✗ ${name}`);
        }
        outputChannel.appendLine('');
        outputChannel.appendLine(`Result: ${succeededNames.length} succeeded, ${failedNames.length} failed.`);
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.show(true);

        vscode.window.showInformationMessage(
            `Pub get (all in folder): ${succeededNames.length} succeeded, ${failedNames.length} failed. See Output for details.`
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Pub get all in folder failed: ${error.message}`);
    }
}

/**
 * Run clean and pub get in all direct child folders that contain pubspec.yaml
 */
async function handleCleanAndPubGetAllInFolder(): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeEditor = vscode.window.activeTextEditor;
        const defaultPath =
            (workspaceFolders && workspaceFolders.length > 0 && workspaceFolders[0].uri.fsPath) ||
            (activeEditor ? path.dirname(activeEditor.document.uri.fsPath) : '');

        const parentPathInput = await vscode.window.showInputBox({
            prompt: 'Enter folder path containing Flutter packages (clean & pub get in each direct child with pubspec.yaml)',
            placeHolder: '/Users/yourname/projects/packages',
            value: defaultPath || undefined,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalized = value.trim().replace(/\/$/, '');
                if (!fs.existsSync(normalized)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                if (!fs.statSync(normalized).isDirectory()) {
                    return 'Path is not a directory.';
                }
                return null;
            }
        });

        if (!parentPathInput) {
            return;
        }

        const parentPath = parentPathInput.trim().replace(/\/$/, '');
        const entries = fs.readdirSync(parentPath, { withFileTypes: true });
        const packagePaths: string[] = [];

        for (const dirent of entries) {
            if (!dirent.isDirectory()) {
                continue;
            }
            const childPath = path.join(parentPath, dirent.name);
            const pubspecPath = path.join(childPath, 'pubspec.yaml');
            if (fs.existsSync(pubspecPath)) {
                packagePaths.push(childPath);
            }
        }

        packagePaths.sort();

        if (packagePaths.length === 0) {
            vscode.window.showErrorMessage('No Flutter packages found in direct children.');
            return;
        }

        const deleteLockChoice = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Delete pubspec.lock before clean & pub get in each package', value: true },
                { label: 'No', description: 'Keep pubspec.lock', value: false }
            ],
            {
                placeHolder: 'Delete pubspec.lock in each package?',
                ignoreFocusOut: true
            }
        );

        if (deleteLockChoice === undefined) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        const succeededNames: string[] = [];
        const failedNames: string[] = [];

        for (const projectPath of packagePaths) {
            const name = path.basename(projectPath);
            const ok = await utilityRunner.executeCleanAndPubGet(
                projectPath,
                flutterCommand,
                deleteLockChoice.value
            );
            if (ok) {
                succeededNames.push(name);
            } else {
                failedNames.push(name);
            }
        }

        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Clean & Pub get (all in folder) — Summary');
        outputChannel.appendLine('='.repeat(60));
        outputChannel.appendLine(`Parent folder: ${parentPath}`);
        outputChannel.appendLine(`Delete pubspec.lock: ${deleteLockChoice.value ? 'Yes' : 'No'}`);
        outputChannel.appendLine(`Packages run: ${packagePaths.length}`);
        outputChannel.appendLine('');
        for (const name of succeededNames) {
            outputChannel.appendLine(`  ✓ ${name}`);
        }
        for (const name of failedNames) {
            outputChannel.appendLine(`  ✗ ${name}`);
        }
        outputChannel.appendLine('');
        outputChannel.appendLine(`Result: ${succeededNames.length} succeeded, ${failedNames.length} failed.`);
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.show(true);

        vscode.window.showInformationMessage(
            `Clean & Pub get (all in folder): ${succeededNames.length} succeeded, ${failedNames.length} failed. See Output for details.`
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Clean & Pub get all in folder failed: ${error.message}`);
    }
}

/**
 * Run git pull in all direct child folders that are git repositories
 */
async function handleGitPullAllInFolder(): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeEditor = vscode.window.activeTextEditor;
        const defaultPath =
            (workspaceFolders && workspaceFolders.length > 0 && workspaceFolders[0].uri.fsPath) ||
            (activeEditor ? path.dirname(activeEditor.document.uri.fsPath) : '');

        const parentPathInput = await vscode.window.showInputBox({
            prompt: 'Enter folder path containing git repositories (pull runs in each direct child with .git)',
            placeHolder: '/Users/yourname/projects',
            value: defaultPath || undefined,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalized = value.trim().replace(/\/$/, '');
                if (!fs.existsSync(normalized)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                if (!fs.statSync(normalized).isDirectory()) {
                    return 'Path is not a directory.';
                }
                return null;
            }
        });

        if (!parentPathInput) {
            return;
        }

        const parentPath = parentPathInput.trim().replace(/\/$/, '');
        const entries = fs.readdirSync(parentPath, { withFileTypes: true });
        const repoPaths: string[] = [];

        for (const dirent of entries) {
            if (!dirent.isDirectory()) {
                continue;
            }
            const childPath = path.join(parentPath, dirent.name);
            if (fs.existsSync(path.join(childPath, '.git'))) {
                repoPaths.push(childPath);
            }
        }

        repoPaths.sort();

        if (repoPaths.length === 0) {
            vscode.window.showErrorMessage('No git repositories found in direct children.');
            return;
        }

        const flutterCommand = getFlutterCommand();
        const succeededEntries: { name: string; branch: string }[] = [];
        const failedEntries: { name: string; branch: string; error?: string }[] = [];
        const skippedNames: string[] = [];

        for (const projectPath of repoPaths) {
            const name = path.basename(projectPath);
            const branch = await getCurrentBranch(projectPath);
            if (branch === null) {
                skippedNames.push(name);
                continue;
            }
            const result = await utilityRunner.executeGitPull(projectPath, branch, flutterCommand);
            if (result.success) {
                succeededEntries.push({ name, branch });
            } else {
                failedEntries.push({ name, branch, error: result.errorMessage });
            }
        }

        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Git Pull (all in folder) — Summary');
        outputChannel.appendLine('='.repeat(60));
        outputChannel.appendLine(`Parent folder: ${parentPath}`);
        outputChannel.appendLine(`Repos run: ${repoPaths.length}`);
        outputChannel.appendLine('');
        for (const e of succeededEntries) {
            outputChannel.appendLine(`  ✓ ${e.name} (${e.branch})`);
        }
        for (const e of failedEntries) {
            outputChannel.appendLine(`  ✗ ${e.name} (${e.branch})`);
            if (e.error) {
                const oneLine = e.error.replace(/\s+/g, ' ').trim();
                const truncated = oneLine.length > 120 ? oneLine.substring(0, 120) + '...' : oneLine;
                outputChannel.appendLine(`      ${truncated}`);
            }
        }
        for (const name of skippedNames) {
            outputChannel.appendLine(`  Skipped (no branch): ${name}`);
        }
        outputChannel.appendLine('');
        outputChannel.appendLine(`Result: ${succeededEntries.length} succeeded, ${failedEntries.length} failed, ${skippedNames.length} skipped.`);
        if (failedEntries.length > 0) {
            outputChannel.appendLine('Repos with merge conflicts or pull errors show as failed; resolve them manually.');
        }
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.show(true);

        vscode.window.showInformationMessage(
            `Git pull (all in folder): ${succeededEntries.length} succeeded, ${failedEntries.length} failed, ${skippedNames.length} skipped. See Output for details.`
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Git pull all in folder failed: ${error.message}`);
    }
}

/**
 * Handle MCP config generation
 */
async function handleGenerateMcpConfig(): Promise<void> {
    try {
        // Prompt for FyUI library path
        const fyUiPath = await vscode.window.showInputBox({
            prompt: 'Enter the base path to your fy_ui library repository',
            placeHolder: '/Users/yourname/projects/fy_ui',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                // Check if path exists
                if (!fs.existsSync(value.replace(/\/$/, ''))) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                return null;
            }
        });

        if (!fyUiPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = fyUiPath.replace(/\/$/, '');

        // Get dart command to determine if using FVM
        const dartCommand = getDartCommand();
        const isUsingFvm = dartCommand.includes('fvm');

        // Generate MCP config based on FVM usage
        let mcpConfig: any;

        if (isUsingFvm) {
            // FVM configuration
            mcpConfig = {
                "fy_ui_mcp": {
                    "displayName": "FyUI Components MCP",
                    "type": "stdio",
                    "command": "fvm",
                    "args": [
                        "dart",
                        "run",
                        `${normalizedPath}/mcp_server/bin/mcp_server.dart`
                    ],
                    "workingDirectory": `${normalizedPath}/mcp_server`
                }
            };
        } else {
            // System Dart configuration
            mcpConfig = {
                "fy_ui_mcp": {
                    "displayName": "FyUI Components MCP",
                    "type": "stdio",
                    "command": "dart",
                    "args": [
                        "run",
                        `${normalizedPath}/mcp_server/bin/mcp_server.dart`
                    ],
                    "workingDirectory": `${normalizedPath}/mcp_server`
                }
            };
        }

        const configJson = JSON.stringify(mcpConfig, null, 2);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('FyUI MCP Configuration Generated');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`FyUI Path: ${normalizedPath}`);
        outputChannel.appendLine(`Using: ${isUsingFvm ? 'FVM (fvm dart)' : 'System Dart (dart)'}\n`);
        outputChannel.appendLine('Add this to your MCP settings file:\n');
        outputChannel.appendLine(configJson);
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Configuration copied to clipboard!');
        outputChannel.appendLine('='.repeat(60) + '\n');

        // Copy to clipboard
        await vscode.env.clipboard.writeText(configJson);

        // Show success message with actions
        const choice = await vscode.window.showInformationMessage(
            'FyUI MCP config generated and copied to clipboard!',
            'Generate Another',
            'Close'
        );

        if (choice === 'Generate Another') {
            // Regenerate
            await handleGenerateMcpConfig();
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`MCP config generation error: ${error.message}`);
    }
}

/**
 * Handle Fyers App launch config generation
 */
async function handleGenerateFyersLaunchConfig(): Promise<void> {
    try {
        // Prompt for Fyers App path
        const fyersAppPath = await vscode.window.showInputBox({
            prompt: 'Enter the base path to your fyers_app repository',
            placeHolder: '/Users/yourname/projects/fyers_app',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalizedValue = value.replace(/\/$/, '');
                // Check if path exists
                if (!fs.existsSync(normalizedValue)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                // Check if it has lib/main.dart
                const mainDartPath = path.join(normalizedValue, 'lib', 'main.dart');
                if (!fs.existsSync(mainDartPath)) {
                    return 'lib/main.dart not found. Please ensure this is a valid Flutter project.';
                }
                return null;
            }
        });

        if (!fyersAppPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = fyersAppPath.replace(/\/$/, '');

        // Generate launch configurations
        const launchConfigs = [
            {
                "name": "fyers_app (web - chrome)",
                "cwd": normalizedPath,
                "request": "launch",
                "type": "dart",
                "flutterMode": "debug",
                "deviceId": "chrome",
                "program": "lib/main.dart",
                "args": [
                    "--web-port=5000",
                    "--web-enable-expression-evaluation",
                    "--web-browser-flag",
                    "--disable-web-security"
                ]
            },
            {
                "name": "fyers_app (any device)",
                "cwd": normalizedPath,
                "request": "launch",
                "type": "dart",
                "flutterMode": "debug",
                "program": "lib/main.dart"
            }
        ];

        const configJson = JSON.stringify(launchConfigs, null, 4);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Fyers App Launch Configurations Generated');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`Fyers App Path: ${normalizedPath}\n`);
        outputChannel.appendLine('Add these to your launch.json configurations array:\n');
        outputChannel.appendLine(configJson);
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Configurations copied to clipboard!');
        outputChannel.appendLine('='.repeat(60) + '\n');

        // Copy to clipboard
        await vscode.env.clipboard.writeText(configJson);

        // Show success message with actions
        const choice = await vscode.window.showInformationMessage(
            'Fyers App launch configurations generated and copied to clipboard!',
            'Open launch.json',
            'Generate Another',
            'Close'
        );

        if (choice === 'Open launch.json') {
            // Try to open launch.json if it exists
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const launchJsonPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'launch.json');

                if (fs.existsSync(launchJsonPath)) {
                    const doc = await vscode.workspace.openTextDocument(launchJsonPath);
                    await vscode.window.showTextDocument(doc);
                } else {
                    // Create .vscode folder if it doesn't exist
                    const vscodeFolder = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
                    if (!fs.existsSync(vscodeFolder)) {
                        fs.mkdirSync(vscodeFolder, { recursive: true });
                    }

                    // Create basic launch.json
                    const launchTemplate = {
                        "version": "0.2.0",
                        "configurations": launchConfigs
                    };

                    fs.writeFileSync(launchJsonPath, JSON.stringify(launchTemplate, null, 4));

                    const doc = await vscode.workspace.openTextDocument(launchJsonPath);
                    await vscode.window.showTextDocument(doc);

                    vscode.window.showInformationMessage('Created launch.json with Fyers App configurations!');
                }
            } else {
                vscode.window.showWarningMessage('No workspace folder found. Please paste the config manually.');
            }
        } else if (choice === 'Generate Another') {
            // Regenerate
            await handleGenerateFyersLaunchConfig();
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Launch config generation error: ${error.message}`);
    }
}

/**
 * Get git repository URL
 */
async function getGitRepoUrl(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git remote get-url origin', { cwd: workspaceFolder });
        const remote = stdout.trim();

        // Convert git@github.com:user/repo.git to https://github.com/user/repo
        if (remote.startsWith('git@github.com:')) {
            return remote
                .replace('git@github.com:', 'https://github.com/')
                .replace('.git', '');
        }

        // Handle https://github.com/user/repo.git format
        if (remote.startsWith('https://')) {
            return remote.replace('.git', '');
        }

        return remote;
    } catch (error) {
        return null;
    }
}

/**
 * Get current git branch
 */
async function getCurrentBranch(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
        return stdout.trim();
    } catch (error) {
        return null;
    }
}

/**
 * Get current commit hash
 */
async function getCurrentCommitHash(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workspaceFolder });
        return stdout.trim();
    } catch (error) {
        return null;
    }
}

/**
 * Get relative path of file within git repository
 */
async function getGitRelativePath(workspaceFolder: string, filePath: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Get the git root directory
        const { stdout: gitRoot } = await execAsync('git rev-parse --show-toplevel', { cwd: workspaceFolder });
        const rootPath = gitRoot.trim();

        // Calculate relative path from git root
        const relativePath = path.relative(rootPath, filePath);
        return relativePath;
    } catch (error) {
        return null;
    }
}

/**
 * Open URL in default browser
 */
function openUrl(url: string): void {
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
        // macOS
        command = `open "${url}"`;
    } else if (platform === 'win32') {
        // Windows
        command = `start "${url}"`;
    } else {
        // Linux
        command = `xdg-open "${url}"`;
    }

    const exec = require('child_process').exec;
    exec(command, (error: any) => {
        if (error) {
            vscode.window.showErrorMessage(`Failed to open URL: ${error.message}`);
        }
    });
}

/**
 * Handle git actions
 */
async function handleGitAction(actionType: 'openRepo' | 'openCurrentFile' | 'viewCurrentCommit' | 'copyCommitHash' | 'createPR' | 'viewPR' | 'openActions'): Promise<void> {
    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Get repo URL
        const repoUrl = await getGitRepoUrl(workspaceFolder);
        if (!repoUrl) {
            vscode.window.showErrorMessage('Could not get git remote URL. Is this a git repository?');
            return;
        }

        // Get current branch (not needed for all actions)
        const currentBranch = await getCurrentBranch(workspaceFolder);

        // Handle different actions
        switch (actionType) {
            case 'openRepo':
                // Open repository with current branch
                const repoWithBranch = currentBranch && currentBranch !== 'main' && currentBranch !== 'master'
                    ? `${repoUrl}/tree/${currentBranch}`
                    : repoUrl;
                openUrl(repoWithBranch);
                vscode.window.showInformationMessage(`Opening repository${currentBranch ? ` (${currentBranch})` : ''}...`);
                break;

            case 'openCurrentFile':
                // Open current file on GitHub
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const currentFilePath = activeEditor.document.uri.fsPath;
                const relativePath = await getGitRelativePath(workspaceFolder, currentFilePath);

                if (!relativePath) {
                    vscode.window.showErrorMessage('Could not determine file path in repository.');
                    return;
                }

                const fileBranch = await getCurrentBranch(workspaceFolder);
                if (!fileBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }

                // Get current selection/line
                const selection = activeEditor.selection;
                const lineNumber = selection.active.line + 1; // Lines are 0-based, GitHub is 1-based

                const fileUrl = `${repoUrl}/blob/${fileBranch}/${relativePath}#L${lineNumber}`;
                openUrl(fileUrl);
                vscode.window.showInformationMessage(`Opening ${path.basename(currentFilePath)} on GitHub (${fileBranch}, line ${lineNumber})...`);
                break;

            case 'viewCurrentCommit':
                // View current commit on GitHub
                const commitHashForView = await getCurrentCommitHash(workspaceFolder);
                if (!commitHashForView) {
                    vscode.window.showErrorMessage('Could not get current commit hash.');
                    return;
                }

                const commitUrl = `${repoUrl}/commit/${commitHashForView}`;
                openUrl(commitUrl);
                vscode.window.showInformationMessage(`Opening commit ${commitHashForView.substring(0, 7)}...`);
                break;

            case 'copyCommitHash':
                // Copy commit hash to clipboard
                const commitHashToCopy = await getCurrentCommitHash(workspaceFolder);
                if (!commitHashToCopy) {
                    vscode.window.showErrorMessage('Could not get current commit hash.');
                    return;
                }

                await vscode.env.clipboard.writeText(commitHashToCopy);
                vscode.window.showInformationMessage(`Copied commit hash: ${commitHashToCopy.substring(0, 7)}...`);
                break;

            case 'createPR':
                if (!currentBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }
                // Create PR from current branch to master
                const createPrUrl = `${repoUrl}/compare/master...${currentBranch}`;
                openUrl(createPrUrl);
                vscode.window.showInformationMessage(`Creating PR: ${currentBranch} → master...`);
                break;

            case 'viewPR':
                if (!currentBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }
                // View PR for current branch
                const viewPrUrl = `${repoUrl}/pulls?q=is%3Apr+head%3A${currentBranch}`;
                openUrl(viewPrUrl);
                vscode.window.showInformationMessage(`Opening PRs for branch: ${currentBranch}...`);
                break;

            case 'openActions':
                // Open GitHub Actions
                const actionsUrl = `${repoUrl}/actions`;
                openUrl(actionsUrl);
                vscode.window.showInformationMessage('Opening GitHub Actions...');
                break;
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git action error: ${error.message}`);
    }
}

/**
 * Open folder in Finder (macOS) or Explorer (Windows/Linux)
 */
function openFolderInFinder(folderPath: string): void {
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage(`Output folder not found: ${folderPath}`);
        return;
    }

    // Open folder based on platform
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
        // macOS - use 'open' command
        command = `open "${folderPath}"`;
    } else if (platform === 'win32') {
        // Windows - use 'explorer' command
        command = `explorer "${folderPath}"`;
    } else {
        // Linux - use 'xdg-open' command
        command = `xdg-open "${folderPath}"`;
    }

    const exec = require('child_process').exec;
    exec(command, (error: any) => {
        if (error) {
            vscode.window.showErrorMessage(`Failed to open folder: ${error.message}`);
        }
    });
}

/**
 * Require workspace with .gitmodules for submodule commands.
 */
async function requireSubmoduleWorkspace(): Promise<string | undefined> {
    const workspaceFolder = await getWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a Flutter project.');
        return undefined;
    }

    if (!hasGitmodules(workspaceFolder)) {
        vscode.window.showErrorMessage(
            'No .gitmodules found in workspace. Open a repo that uses git submodules (e.g. fyers_app, fy_insti).'
        );
        return undefined;
    }

    return workspaceFolder;
}

async function handleSubmoduleUpdate(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        await utilityRunner.executeSubmoduleUpdate(workspaceFolder, flutterCommand);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule update error: ${error.message}`);
    }
}

async function handleSubmoduleRemoteStatus(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        await utilityRunner.executeSubmoduleRemoteStatus(workspaceFolder, flutterCommand);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule remote status error: ${error.message}`);
    }
}

async function handleSubmoduleUpdateRemote(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        const result = await utilityRunner.executeSubmoduleUpdateRemote(
            workspaceFolder,
            flutterCommand,
            async (outdatedCount, totalCount) => {
                const choice = await vscode.window.showWarningMessage(
                    `${outdatedCount} of ${totalCount} submodules are behind remote. Update them?`,
                    { modal: true },
                    'Update'
                );
                return choice === 'Update';
            }
        );

        if (result.success && (result.updatedCount ?? 0) > 0) {
            vscode.window.showInformationMessage(
                `Updated ${result.updatedCount} submodule(s). Review git status and commit pointer changes in the parent repo.`
            );
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule update remote error: ${error.message}`);
    }
}

async function handleSubmoduleUpdateRemoteAll(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const entries = parseGitmodules(workspaceFolder);
        const choice = await vscode.window.showWarningMessage(
            `Update all ${entries.length} submodules to remote branch tips? This may take a while.`,
            { modal: true },
            'Update All'
        );

        if (choice !== 'Update All') {
            return;
        }

        const flutterCommand = getFlutterCommand();
        const result = await utilityRunner.executeSubmoduleUpdateRemoteAll(workspaceFolder, flutterCommand);

        if (result.success) {
            vscode.window.showInformationMessage(
                'Submodule update remote (all) completed. Review git status and commit pointer changes in the parent repo.'
            );
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule update remote (all) error: ${error.message}`);
    }
}

async function handleSubmoduleUpdateAndPubGet(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        await utilityRunner.executeSubmoduleUpdateAndPubGet(workspaceFolder, flutterCommand);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule update + pub get error: ${error.message}`);
    }
}

async function handleSubmoduleResetAll(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const entries = parseGitmodules(workspaceFolder);
        const choice = await vscode.window.showWarningMessage(
            `Hard reset and clean all ${entries.length} submodules (recursive)? Uncommitted changes and untracked files inside submodules will be lost.`,
            { modal: true },
            'Reset All'
        );

        if (choice !== 'Reset All') {
            return;
        }

        const flutterCommand = getFlutterCommand();
        await utilityRunner.executeSubmoduleResetAll(workspaceFolder, flutterCommand);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule reset (all) error: ${error.message}`);
    }
}

async function handleSubmoduleResetOne(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const entries = parseGitmodules(workspaceFolder);
        if (entries.length === 0) {
            vscode.window.showErrorMessage('No submodules found in .gitmodules.');
            return;
        }

        const pick = await vscode.window.showQuickPick(
            entries.map(entry => ({
                label: entry.name,
                description: entry.branch ? `${entry.path} (${entry.branch})` : entry.path,
                detail: entry.url,
                entry
            })),
            {
                placeHolder: 'Select submodule to hard reset and clean',
                ignoreFocusOut: true
            }
        );

        if (!pick) {
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            `Hard reset and clean ${pick.entry.path}? Uncommitted changes and untracked files in this submodule will be lost.`,
            { modal: true },
            'Reset'
        );

        if (choice !== 'Reset') {
            return;
        }

        const flutterCommand = getFlutterCommand();
        await utilityRunner.executeSubmoduleResetOne(
            workspaceFolder,
            pick.entry.path,
            pick.entry.name,
            flutterCommand
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Submodule reset (one) error: ${error.message}`);
    }
}

async function handleSubmoduleUpdateRemoteOne(): Promise<void> {
    try {
        const workspaceFolder = await requireSubmoduleWorkspace();
        if (!workspaceFolder) {
            return;
        }

        const entries = parseGitmodules(workspaceFolder);
        if (entries.length === 0) {
            vscode.window.showErrorMessage('No submodules found in .gitmodules.');
            return;
        }

        const pick = await vscode.window.showQuickPick(
            entries.map(entry => ({
                label: entry.name,
                description: entry.branch ? `${entry.path} (${entry.branch})` : entry.path,
                detail: entry.url,
                entry
            })),
            {
                placeHolder: 'Select submodule to bump to latest on its .gitmodules branch',
                ignoreFocusOut: true
            }
        );

        if (!pick) {
            return;
        }

        const flutterCommand = getFlutterCommand();
        const result = await utilityRunner.executeSubmoduleUpdateRemoteOne(
            workspaceFolder,
            pick.entry.path,
            pick.entry.name,
            flutterCommand
        );

        if (result.success) {
            vscode.window.showInformationMessage(
                `Bumped ${pick.entry.name}. Review git status and commit the submodule pointer in the parent repo.`
            );
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Bump single submodule error: ${error.message}`);
    }
}

/**
 * Handle git push/pull command execution
 */
async function handleGitCommand(gitType: 'push' | 'pull'): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Get current branch as default
        const currentBranch = await getCurrentBranch(workspaceFolder);

        // Prompt for branch name
        const branchName = await vscode.window.showInputBox({
            prompt: `Enter the branch name to ${gitType}`,
            placeHolder: currentBranch || 'main',
            value: currentBranch || '',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Branch name cannot be empty';
                }
                return null;
            }
        });

        if (!branchName) {
            return; // User cancelled
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Execute git command
        if (gitType === 'push') {
            await utilityRunner.executeGitPush(workspaceFolder, branchName.trim(), flutterCommand);
        } else {
            await utilityRunner.executeGitPull(workspaceFolder, branchName.trim(), flutterCommand);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git ${gitType} error: ${error.message}`);
    }
}

/**
 * Handle adding Flutter cursor rules to a project
 */
async function handleAddFlutterCursorRules(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Prompt for project path
        const projectPath = await vscode.window.showInputBox({
            prompt: 'Enter the path to your Flutter project',
            placeHolder: '/Users/yourname/projects/your_flutter_app',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalizedValue = value.replace(/\/$/, '');
                // Check if path exists
                if (!fs.existsSync(normalizedValue)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                // Check if it has pubspec.yaml
                const pubspecPath = path.join(normalizedValue, 'pubspec.yaml');
                if (!fs.existsSync(pubspecPath)) {
                    return 'pubspec.yaml not found. Please ensure this is a valid Flutter project.';
                }
                return null;
            }
        });

        if (!projectPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = projectPath.replace(/\/$/, '');

        // Create .cursor/rules directory if it doesn't exist
        const cursorRulesDir = path.join(normalizedPath, '.cursor', 'rules');
        if (!fs.existsSync(cursorRulesDir)) {
            fs.mkdirSync(cursorRulesDir, { recursive: true });
        }

        // Get source file path from extension resources
        const sourceFilePath = path.join(context.extensionPath, 'resources', 'flutter_rules.mdc');

        // Check if source file exists
        if (!fs.existsSync(sourceFilePath)) {
            vscode.window.showErrorMessage('Flutter rules template file not found in extension resources.');
            return;
        }

        // Copy file to destination
        const destinationFilePath = path.join(cursorRulesDir, 'flutter_rules.mdc');
        fs.copyFileSync(sourceFilePath, destinationFilePath);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Flutter Cursor Rules Added to Project');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`Project Path: ${normalizedPath}`);
        outputChannel.appendLine(`Rules File: ${destinationFilePath}\n`);
        outputChannel.appendLine('File Structure Created:');
        outputChannel.appendLine(`${normalizedPath}/`);
        outputChannel.appendLine('└── .cursor/');
        outputChannel.appendLine('    └── rules/');
        outputChannel.appendLine('        └── flutter_rules.mdc ✓');
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Flutter cursor rules successfully added!');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine('The rules will be automatically applied when working in this project.');

        // Show success message with action
        const choice = await vscode.window.showInformationMessage(
            'Flutter cursor rules successfully added to project!',
            'Open File',
            'Add to Another Project',
            'Close'
        );

        if (choice === 'Open File') {
            // Open the created file
            const doc = await vscode.workspace.openTextDocument(destinationFilePath);
            await vscode.window.showTextDocument(doc);
        } else if (choice === 'Add to Another Project') {
            // Recursively call to add to another project
            await handleAddFlutterCursorRules(context);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error adding Flutter cursor rules: ${error.message}`);
    }
}

export function deactivate() {
    if (buildRunner) {
        buildRunner.dispose();
    }
    if (utilityRunner) {
        utilityRunner.dispose();
    }
}
