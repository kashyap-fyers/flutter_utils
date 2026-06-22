/**
 * Utility Runner - Executes utility commands and manages their state
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { BuildTreeProvider } from './buildTreeView';
import {
    formatSubmoduleRemoteStatusLine,
    scanSubmoduleRemoteStatuses,
    SubmoduleRemoteScanResult
} from './submoduleStatus';
import {
    buildSubmoduleCommandSpecs,
    buildSubmoduleResetOneCommand,
    SUBMODULE_RESET_ALL_COMMAND
} from './submoduleUtils';
import { BuildSession, BuildStep, CommandStatus, SessionStatus, SessionType } from './types';

const execAsync = promisify(exec);

interface UtilitySessionOptions {
    skipFlutterVersion?: boolean;
    skipSessionPreamble?: boolean;
    continueOnFailure?: boolean;
}

interface FailedStepSummary {
    description: string;
    errorMessage?: string;
}

interface UtilitySessionResult {
    success: boolean;
    errorMessage?: string;
    failedSteps?: FailedStepSummary[];
    succeededCount?: number;
}

export class UtilityRunner {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private treeProvider?: BuildTreeProvider;

    constructor(treeProvider?: BuildTreeProvider) {
        this.outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.treeProvider = treeProvider;
    }

    setTreeProvider(treeProvider: BuildTreeProvider): void {
        this.treeProvider = treeProvider;
    }

    /**
     * Execute Flutter version check
     */
    async executeFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log(`Flutter Version Information`);
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}`);
        this.log(`Flutter Command: ${flutterCommand}\n`);

        this.statusBarItem.text = '$(sync~spin) Checking Flutter version...';
        this.statusBarItem.show();

        try {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`${'─'.repeat(60)}`);
            this.log(`Command: ${versionCommand}`);
            this.log(`${'─'.repeat(60)}\n`);

            const { stdout, stderr } = await execAsync(versionCommand, {
                cwd: workspaceFolder,
                maxBuffer: 10 * 1024 * 1024
            });

            if (stdout) {
                this.log(stdout.trim());
            }

            if (stderr && stderr.trim()) {
                this.log('\nAdditional Info:');
                this.log(stderr.trim());
            }

            this.log(`\n${'='.repeat(60)}`);
            this.log(`✅ Flutter version retrieved successfully`);
            this.log(`${'='.repeat(60)}\n`);

            this.statusBarItem.text = '$(check) Flutter Version Retrieved';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

            vscode.window.showInformationMessage('Flutter version retrieved successfully!');

            setTimeout(() => {
                this.statusBarItem.hide();
            }, 3000);

            return true;

        } catch (error: any) {
            this.log(`\n❌ Error getting Flutter version`);
            if (error.message) {
                this.log(`Error: ${error.message}`);
            }
            if (error.stderr) {
                this.log(`Details: ${error.stderr}`);
            }

            this.statusBarItem.text = '$(error) Version Check Failed';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

            vscode.window.showErrorMessage('Failed to get Flutter version. Check output for details.');

            setTimeout(() => {
                this.statusBarItem.hide();
            }, 5000);

            return false;
        }
    }

    /**
     * Execute build runner
     */
    async executeBuildRunner(workspaceFolder: string, dartCommand: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'build-runner',
                description: 'Generate code with build_runner',
                command: `${dartCommand} run build_runner build --delete-conflicting-outputs`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // Pass flutter command for version check
            'Build Runner',
            steps
        ).then(r => r.success);
    }

    /**
     * Execute flutter analyze
     */
    async executeFlutterAnalyze(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'analyze',
                description: 'Analyze Dart code',
                command: '{FLUTTER_CMD} analyze'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Flutter Analyze',
            steps
        ).then(r => r.success);
    }

    /**
     * Execute dart format
     */
    async executeFlutterFormat(workspaceFolder: string, dartCommand: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'format',
                description: 'Format Dart code (line length: 80)',
                command: `${dartCommand} format . -l 80`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // For version check
            'Dart Format',
            steps
        ).then(r => r.success);
    }

    /**
     * Execute clean command
     */
    async executeClean(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Clean',
            [{ id: 'clean', description: 'Clean project', command: '{FLUTTER_CMD} clean' }]
        ).then(r => r.success);
    }

    /**
     * Execute pub get command
     */
    async executePubGet(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Pub Get',
            [{ id: 'pub-get', description: 'Get dependencies', command: '{FLUTTER_CMD} pub get' }]
        ).then(r => r.success);
    }

    /**
     * Execute clean and pub get
     */
    async executeCleanAndPubGet(
        workspaceFolder: string,
        flutterCommand: string,
        deletePubspecLock: boolean
    ): Promise<boolean> {
        const steps: BuildStep[] = [];

        if (deletePubspecLock) {
            steps.push({
                id: 'delete-lock',
                description: 'Delete pubspec.lock',
                command: 'rm -f pubspec.lock'
            });
        }

        steps.push(
            {
                id: 'clean',
                description: 'Clean project',
                command: '{FLUTTER_CMD} clean'
            },
            {
                id: 'pub-get',
                description: 'Get dependencies',
                command: '{FLUTTER_CMD} pub get'
            }
        );

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Clean & Pub Get',
            steps
        ).then(r => r.success);
    }

    /**
     * Execute git push
     */
    async executeGitPush(workspaceFolder: string, branchName: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'git-push',
                description: `Push to origin/${branchName}`,
                command: `git push origin ${branchName}`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Git Push (${branchName})`,
            steps
        ).then(r => r.success);
    }

    /**
     * Sync submodules to SHAs recorded by the parent repo.
     */
    async executeSubmoduleUpdate(
        workspaceFolder: string,
        flutterCommand: string
    ): Promise<{ success: boolean; errorMessage?: string }> {
        const steps = this.buildSubmoduleSteps(workspaceFolder, 'recorded');

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Submodule Update',
            steps,
            { skipFlutterVersion: true }
        );
    }

    /**
     * List submodules whose HEAD differs from origin/<branch> in .gitmodules.
     */
    async executeSubmoduleRemoteStatus(
        workspaceFolder: string,
        flutterCommand: string
    ): Promise<{ success: boolean; scan?: SubmoduleRemoteScanResult }> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log('Submodule Remote Status');
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}\n`);

        this.statusBarItem.text = '$(sync~spin) Checking submodule remotes...';
        this.statusBarItem.show();

        try {
            const scan = await this.scanSubmoduleRemoteStatus(workspaceFolder);
            this.logSummary(scan);

            this.statusBarItem.text = `$(check) ${scan.outdated.length} outdated`;
            setTimeout(() => this.statusBarItem.hide(), 5000);

            vscode.window.showInformationMessage(
                `Submodule remote status: ${scan.outdated.length} outdated, ${scan.upToDate.length} up to date, ${scan.skipped.length} skipped. See Output.`
            );

            return { success: true, scan };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.statusBarItem.text = '$(error) Remote status failed';
            setTimeout(() => this.statusBarItem.hide(), 5000);
            vscode.window.showErrorMessage(`Submodule remote status failed: ${message}`);
            return { success: false };
        }
    }

    /**
     * Fetch remote branch tips only for submodules behind origin.
     */
    async executeSubmoduleUpdateRemote(
        workspaceFolder: string,
        flutterCommand: string,
        confirmUpdate: (outdatedCount: number, totalCount: number) => Promise<boolean>
    ): Promise<{ success: boolean; errorMessage?: string; updatedCount?: number }> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log('Submodule Update Remote (Outdated Only)');
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}\n`);

        this.statusBarItem.text = '$(sync~spin) Scanning submodule remotes...';
        this.statusBarItem.show();

        const scan = await this.scanSubmoduleRemoteStatus(workspaceFolder);
        this.logSummary(scan);

        if (scan.outdated.length === 0) {
            this.statusBarItem.text = '$(check) All submodules up to date';
            setTimeout(() => this.statusBarItem.hide(), 5000);
            vscode.window.showInformationMessage('All submodules are already at their remote branch tips.');
            return { success: true, updatedCount: 0 };
        }

        const confirmed = await confirmUpdate(scan.outdated.length, scan.statuses.length);
        if (!confirmed) {
            this.log('\nUpdate cancelled.\n');
            this.statusBarItem.hide();
            return { success: true, updatedCount: 0 };
        }

        const paths = scan.outdated.map(status => status.entry.path);
        const steps = this.buildSubmoduleSteps(workspaceFolder, 'remote', paths);

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Submodule Update Remote (${paths.length})`,
            steps,
            { skipFlutterVersion: true, skipSessionPreamble: true }
        ).then(result => ({ ...result, updatedCount: paths.length }));
    }

    /**
     * Fetch latest commit on every submodule branch from .gitmodules.
     */
    async executeSubmoduleUpdateRemoteAll(
        workspaceFolder: string,
        flutterCommand: string
    ): Promise<UtilitySessionResult> {
        const steps = this.buildSubmoduleSteps(workspaceFolder, 'remote');

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Submodule Update Remote (All)',
            steps,
            { skipFlutterVersion: true, continueOnFailure: true }
        );
    }

    /**
     * Sync submodules to recorded SHAs, then pub get at app root.
     */
    async executeSubmoduleUpdateAndPubGet(
        workspaceFolder: string,
        flutterCommand: string
    ): Promise<{ success: boolean; errorMessage?: string }> {
        const steps: BuildStep[] = [
            ...this.buildSubmoduleSteps(workspaceFolder, 'recorded'),
            {
                id: 'pub-get',
                description: 'Get dependencies at app root',
                command: '{FLUTTER_CMD} pub get'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Submodule Update + Pub Get',
            steps,
            { skipFlutterVersion: true }
        );
    }

    /**
     * Hard reset and clean every submodule (recursive).
     */
    async executeSubmoduleResetAll(
        workspaceFolder: string,
        flutterCommand: string
    ): Promise<UtilitySessionResult> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Submodule Reset (All)',
            [
                {
                    id: 'submodule-reset-all',
                    description: 'Hard reset and clean all submodules (recursive)',
                    command: SUBMODULE_RESET_ALL_COMMAND
                }
            ],
            { skipFlutterVersion: true }
        );
    }

    /**
     * Hard reset and clean one submodule.
     */
    async executeSubmoduleResetOne(
        workspaceFolder: string,
        submodulePath: string,
        submoduleName: string,
        flutterCommand: string
    ): Promise<UtilitySessionResult> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Submodule Reset (${submoduleName})`,
            [
                {
                    id: 'submodule-reset-one',
                    description: `Hard reset and clean ${submodulePath}`,
                    command: buildSubmoduleResetOneCommand(submodulePath)
                }
            ],
            { skipFlutterVersion: true }
        );
    }

    /**
     * Bump a single submodule to latest on its .gitmodules branch.
     */
    async executeSubmoduleUpdateRemoteOne(
        workspaceFolder: string,
        submodulePath: string,
        submoduleName: string,
        flutterCommand: string
    ): Promise<{ success: boolean; errorMessage?: string }> {
        const steps: BuildStep[] = [
            {
                id: 'submodule-update-remote-one',
                description: `Update ${submoduleName} to remote branch tip`,
                command: `git submodule update --init --remote --progress -- ${submodulePath}`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Bump Submodule (${submoduleName})`,
            steps,
            { skipFlutterVersion: true }
        );
    }

    /**
     * Execute git pull. Returns success and optional error message for use in batch summaries.
     */
    async executeGitPull(
        workspaceFolder: string,
        branchName: string,
        flutterCommand: string
    ): Promise<{ success: boolean; errorMessage?: string }> {
        const steps: BuildStep[] = [
            {
                id: 'git-pull',
                description: `Pull from origin/${branchName}`,
                command: `git pull origin ${branchName}`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Git Pull (${branchName})`,
            steps
        );
    }

    /**
     * Execute pod install
     */
    async executePodInstall(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'remove-pods',
                description: 'Remove Pods folder',
                command: 'cd ios && rm -rf Pods'
            },
            {
                id: 'remove-symlinks',
                description: 'Remove .symlinks',
                command: 'cd ios && rm -rf .symlinks'
            },
            {
                id: 'remove-podfile-lock',
                description: 'Remove Podfile.lock',
                command: 'cd ios && rm -rf Podfile.lock'
            },
            {
                id: 'pod-deintegrate',
                description: 'Pod deintegrate',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod deintegrate'
            },
            {
                id: 'pod-setup',
                description: 'Pod setup',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod setup'
            },
            {
                id: 'pod-install',
                description: 'Pod install',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod install'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // Pass flutter command for version check
            'Pod Install',
            steps
        ).then(r => r.success);
    }

    private async scanSubmoduleRemoteStatus(workspaceFolder: string): Promise<SubmoduleRemoteScanResult> {
        return scanSubmoduleRemoteStatuses(workspaceFolder, (current, total, status) => {
            this.log(`Checking ${current}/${total}: ${status.entry.path}`);
            this.log(formatSubmoduleRemoteStatusLine(status));
            this.statusBarItem.text = `$(sync~spin) Checking ${current}/${total}: ${status.entry.path}`;
        });
    }

    private logSummary(scan: SubmoduleRemoteScanResult): void {
        this.log(`\n${'─'.repeat(60)}`);
        this.log('Summary');
        this.log(`${'─'.repeat(60)}`);
        this.log(`  Outdated:  ${scan.outdated.length}`);
        this.log(`  Up to date: ${scan.upToDate.length}`);
        this.log(`  Skipped:   ${scan.skipped.length} (ahead or diverged)`);
        this.log(`  Errors:    ${scan.errored.length}`);
        this.log(`${'─'.repeat(60)}\n`);

        if (scan.outdated.length > 0) {
            this.log('Will update:');
            for (const status of scan.outdated) {
                this.log(formatSubmoduleRemoteStatusLine(status));
            }
            this.log('');
        }
    }

    private buildSubmoduleSteps(
        workspaceFolder: string,
        mode: 'recorded' | 'remote',
        paths?: string[]
    ): BuildStep[] {
        const specs = buildSubmoduleCommandSpecs(workspaceFolder, mode, paths);
        if (specs.length > 0) {
            return specs;
        }

        const bulkCommand =
            mode === 'remote'
                ? 'git submodule update --init --remote --recursive --progress'
                : 'git submodule update --init --recursive --progress';

        return [
            {
                id: 'submodule-update-bulk',
                description: 'Update all submodules',
                command: bulkCommand
            }
        ];
    }

    /**
     * Execute utility with session tracking
     */
    private logFailedStepsSummary(
        failedSteps: FailedStepSummary[],
        succeededCount: number,
        totalSteps: number
    ): void {
        this.log(`\n${'─'.repeat(60)}`);
        this.log(`Failed submodules (${failedSteps.length}):`);
        this.log(`${'─'.repeat(60)}`);
        for (const failed of failedSteps) {
            this.log(`  ✗ ${failed.description}`);
            if (failed.errorMessage) {
                const oneLine = failed.errorMessage.replace(/\s+/g, ' ').trim();
                const truncated = oneLine.length > 120 ? oneLine.substring(0, 120) + '...' : oneLine;
                this.log(`      ${truncated}`);
            }
        }
        this.log('');
        this.log(`Result: ${succeededCount} succeeded, ${failedSteps.length} failed (${totalSteps} total).`);
        this.log(`${'─'.repeat(60)}\n`);
    }

    private async executeUtilityWithSession(
        workspaceFolder: string,
        flutterCommand: string,
        utilityName: string,
        steps: BuildStep[],
        options?: UtilitySessionOptions
    ): Promise<UtilitySessionResult> {
        if (!options?.skipSessionPreamble) {
            this.outputChannel.clear();
            this.outputChannel.show(true);

            this.log(`\n${'='.repeat(60)}`);
            this.log(`Starting: ${utilityName}`);
            this.log(`${'='.repeat(60)}\n`);
            this.log(`Workspace: ${workspaceFolder}`);
            this.log(`Flutter Command: ${flutterCommand}\n`);
        } else {
            this.outputChannel.show(true);
            this.log(`\n${'='.repeat(60)}`);
            this.log(`Starting updates: ${utilityName}`);
            this.log(`${'='.repeat(60)}\n`);
        }

        const sessionId = `util-${Date.now()}`;
        const session: BuildSession = {
            id: sessionId,
            buildName: utilityName,
            status: SessionStatus.Running,
            startTime: new Date(),
            workspaceFolder: workspaceFolder,
            sessionType: SessionType.Utility,
            steps: steps.map(step => ({
                step,
                status: CommandStatus.Waiting
            }))
        };

        if (this.treeProvider) {
            this.treeProvider.startBuildSession(session);
        }

        this.statusBarItem.text = `$(sync~spin) ${utilityName}`;
        this.statusBarItem.show();

        if (!options?.skipFlutterVersion) {
            await this.showFlutterVersion(workspaceFolder, flutterCommand);
        }

        if (steps.length > 1 && utilityName.toLowerCase().includes('submodule')) {
            this.log(`Packages to process: ${steps.length}\n`);
        }

        let stepIndex = 0;
        const totalSteps = steps.length;
        const failedSteps: FailedStepSummary[] = [];
        let succeededCount = 0;

        for (const step of steps) {
            const command = step.command.replace('{FLUTTER_CMD}', flutterCommand);

            this.log(`${'─'.repeat(60)}`);
            this.log(`Step ${stepIndex + 1}/${totalSteps}: ${step.description}`);
            this.log(`Command: ${command}`);
            this.log(`${'─'.repeat(60)}`);

            // Update status to in-progress
            if (this.treeProvider) {
                this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.InProgress);
            }

            // Update status bar
            this.statusBarItem.text = `$(sync~spin) ${step.description}`;
            this.statusBarItem.show();

            // Execute command
            const stepResult = await this.executeCommand(command, workspaceFolder, step, sessionId, stepIndex);

            if (!stepResult.success) {
                if (options?.continueOnFailure) {
                    failedSteps.push({
                        description: step.description,
                        errorMessage: stepResult.errorMessage
                    });
                    stepIndex++;
                    continue;
                }

                // Update to failed
                if (this.treeProvider) {
                    this.treeProvider.completeBuildSession(sessionId, SessionStatus.Failed);
                }

                this.statusBarItem.text = `$(error) ${utilityName} Failed`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

                vscode.window.showErrorMessage(`${utilityName} failed at step: ${step.description}. Check output for details.`);

                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 5000);

                return { success: false, errorMessage: stepResult.errorMessage };
            }

            succeededCount++;
            stepIndex++;
        }

        if (options?.continueOnFailure && failedSteps.length > 0) {
            this.logFailedStepsSummary(failedSteps, succeededCount, totalSteps);
        }

        const allFailed = options?.continueOnFailure && failedSteps.length === totalSteps;
        const partialFailure = options?.continueOnFailure && failedSteps.length > 0 && !allFailed;

        if (this.treeProvider) {
            this.treeProvider.completeBuildSession(
                sessionId,
                allFailed ? SessionStatus.Failed : SessionStatus.Completed
            );
        }

        if (allFailed) {
            this.log(`\n${'='.repeat(60)}`);
            this.log(`❌ ${utilityName} — all submodules failed`);
            this.log(`${'='.repeat(60)}\n`);

            this.statusBarItem.text = `$(error) ${utilityName} Failed`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

            vscode.window.showErrorMessage(
                `${utilityName}: all ${failedSteps.length} submodules failed. See Output for details.`
            );

            setTimeout(() => {
                this.statusBarItem.hide();
            }, 5000);

            return { success: false, failedSteps, succeededCount };
        }

        this.log(`\n${'='.repeat(60)}`);
        if (partialFailure) {
            this.log(`⚠️  ${utilityName} completed with ${failedSteps.length} failure(s)`);
        } else {
            this.log(`✅ ${utilityName} Completed Successfully!`);
        }
        this.log(`${'='.repeat(60)}\n`);

        if (partialFailure) {
            this.statusBarItem.text = `$(warning) ${utilityName}: ${failedSteps.length} failed`;
            this.statusBarItem.backgroundColor = undefined;

            vscode.window.showInformationMessage(
                `${utilityName}: ${succeededCount} succeeded, ${failedSteps.length} failed. See Output for details.`
            );
        } else {
            this.statusBarItem.text = `$(check) ${utilityName} Complete`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

            vscode.window.showInformationMessage(`${utilityName} completed successfully!`);
        }

        setTimeout(() => {
            this.statusBarItem.hide();
        }, 5000);

        return {
            success: failedSteps.length === 0,
            failedSteps: failedSteps.length > 0 ? failedSteps : undefined,
            succeededCount
        };
    }

    /**
     * Execute a single command
     */
    private executeCommand(
        command: string,
        cwd: string,
        step: BuildStep,
        sessionId: string,
        stepIndex: number
    ): Promise<{ success: boolean; errorMessage?: string }> {
        this.log(`⏳ Status: In Progress\n`);

        return new Promise(resolve => {
            const outputChunks: string[] = [];
            const streamOutput = (chunk: string): void => {
                outputChunks.push(chunk);
                this.outputChannel.append(chunk);
            };

            const child = spawn(command, [], {
                cwd,
                shell: true,
                env: {
                    ...process.env,
                    GIT_PROGRESS_DELAY: '0'
                }
            });

            child.stdout?.on('data', (data: Buffer) => {
                streamOutput(data.toString());
            });

            child.stderr?.on('data', (data: Buffer) => {
                streamOutput(data.toString());
            });

            child.on('error', (error: Error) => {
                const errorMessage = error.message;
                this.log(`\n❌ Status: Failed\n`);
                this.log(`Error Message: ${errorMessage}\n`);

                if (this.treeProvider) {
                    this.treeProvider.updateStepStatus(
                        sessionId,
                        stepIndex,
                        CommandStatus.Failed,
                        this.truncateError(errorMessage)
                    );
                }

                resolve({ success: false, errorMessage: this.truncateError(errorMessage, 500) });
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.log(`\n✅ Status: Success\n`);

                    if (this.treeProvider) {
                        this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Success);
                    }

                    resolve({ success: true });
                    return;
                }

                const errorMessage = outputChunks.join('').trim() || `Command exited with code ${code}`;
                this.log(`\n❌ Status: Failed (exit code ${code})\n`);
                this.log(`${'▼'.repeat(60)}`);
                this.log('ERROR DETAILS:');
                this.log(`${'▼'.repeat(60)}`);
                this.log(errorMessage);
                this.log(`${'▲'.repeat(60)}\n`);

                if (this.treeProvider) {
                    this.treeProvider.updateStepStatus(
                        sessionId,
                        stepIndex,
                        CommandStatus.Failed,
                        this.truncateError(errorMessage)
                    );
                }

                resolve({ success: false, errorMessage: this.truncateError(errorMessage, 500) });
            });
        });
    }

    /**
     * Truncate error message for display in tree view
     */
    private truncateError(error: string, maxLength: number = 200): string {
        if (error.length <= maxLength) {
            return error;
        }
        return error.substring(0, maxLength) + '... (see output for full error)';
    }

    /**
     * Show Flutter version
     */
    private async showFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<void> {
        this.log(`${'─'.repeat(60)}`);
        this.log(`Flutter Version Check`);
        this.log(`${'─'.repeat(60)}`);

        try {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`Command: ${versionCommand}\n`);

            const { stdout, stderr } = await execAsync(versionCommand, {
                cwd: workspaceFolder,
                maxBuffer: 10 * 1024 * 1024
            });

            if (stdout) {
                this.log(stdout.trim());
            }

            if (stderr && stderr.trim()) {
                this.log(stderr.trim());
            }

            this.log(`\n${'─'.repeat(60)}\n`);

        } catch (error: any) {
            this.log(`⚠️  Warning: Could not get Flutter version`);
            if (error.message) {
                this.log(`Error: ${error.message}`);
            }
            this.log(`${'─'.repeat(60)}\n`);
        }
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
