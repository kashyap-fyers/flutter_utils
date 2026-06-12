/**
 * Tree View Provider for flutter-toolbox Sidebar
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { BuildSession, BuildStepStatus, BuildType, CommandStatus, SessionStatus, SessionType } from './types';

export class BuildTreeProvider implements vscode.TreeDataProvider<BuildTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BuildTreeItem | undefined | null | void> = new vscode.EventEmitter<BuildTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BuildTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private activeSessions: Map<string, BuildSession> = new Map();
    private recentSessions: BuildSession[] = [];
    private maxRecentSessions = 5;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Start a new build session
     */
    startBuildSession(session: BuildSession): void {
        this.activeSessions.set(session.id, session);
        this.refresh();
    }

    /**
     * Update build session
     */
    updateBuildSession(sessionId: string, updates: Partial<BuildSession>): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            this.refresh();
        }
    }

    /**
     * Update a specific step status
     */
    updateStepStatus(sessionId: string, stepIndex: number, status: CommandStatus, error?: string): void {
        const session = this.activeSessions.get(sessionId);
        if (session && session.steps[stepIndex]) {
            session.steps[stepIndex].status = status;
            if (status === CommandStatus.InProgress) {
                session.steps[stepIndex].startTime = new Date();
            } else if (status === CommandStatus.Success || status === CommandStatus.Failed) {
                session.steps[stepIndex].endTime = new Date();
            }
            if (error) {
                session.steps[stepIndex].error = error;
            }
            this.refresh();
        }
    }

    /**
     * Complete a build session
     */
    completeBuildSession(sessionId: string, status: SessionStatus): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = status;
            session.endTime = new Date();

            // Move to recent sessions
            this.activeSessions.delete(sessionId);
            this.recentSessions.unshift(session);

            // Keep only max recent sessions
            if (this.recentSessions.length > this.maxRecentSessions) {
                this.recentSessions = this.recentSessions.slice(0, this.maxRecentSessions);
            }

            this.refresh();
        }
    }

    /**
     * Clear all sessions
     */
    clearSessions(): void {
        this.activeSessions.clear();
        this.recentSessions = [];
        this.refresh();
    }

    getTreeItem(element: BuildTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BuildTreeItem): Thenable<BuildTreeItem[]> {
        if (!element) {
            // Root level - show action buttons and sessions
            return Promise.resolve(this.getRootItems());
        } else if (element.contextValue === 'buildSession') {
            // Show steps for a session
            const children: BuildTreeItem[] = [];
            const sessionSteps = this.getSessionSteps(element.sessionId!);
            children.push(...sessionSteps);

            // Add "Open in Finder" button for completed successful builds (not utilities)
            const session = this.activeSessions.get(element.sessionId!) ||
                           this.recentSessions.find(s => s.id === element.sessionId!);

            if (session && session.status === SessionStatus.Completed && session.workspaceFolder) {
                // Only show for actual build sessions, not utility sessions
                if (session.sessionType === SessionType.Build) {
                    const openFolderItem = this.createOpenFolderItem(session);
                    if (openFolderItem) {
                        children.push(openFolderItem);
                    }
                }
            }

            return Promise.resolve(children);
        } else if (element.contextValue === 'buildStep' && element.error) {
            // Show error details as a child
            return Promise.resolve([
                new BuildTreeItem(
                    element.error,
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    'errorDetail',
                    new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
                )
            ]);
        }

        return Promise.resolve([]);
    }

    private getRootItems(): BuildTreeItem[] {
        const items: BuildTreeItem[] = [];

        // Build section header
        items.push(
            new BuildTreeItem(
                'BUILD',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('package')
            )
        );

        // Build action buttons
        items.push(
            new BuildTreeItem(
                '  Build APK',
                'Build Android APK (Release)',
                vscode.TreeItemCollapsibleState.None,
                'buildAction',
                new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.buildApk'
            ),
            new BuildTreeItem(
                '  Build IPA',
                'Build iOS IPA (Release)',
                vscode.TreeItemCollapsibleState.None,
                'buildAction',
                new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.buildIpa'
            ),
            new BuildTreeItem(
                '  Build Web',
                'Build Web with base-href',
                vscode.TreeItemCollapsibleState.None,
                'buildAction',
                new vscode.ThemeIcon('globe', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.buildWeb'
            )
        );

        // Utils section header
        items.push(
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                'UTILS',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('tools')
            )
        );

        // Utility action buttons
        items.push(
            new BuildTreeItem(
                '  Flutter Version',
                'Check Flutter version',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.flutterVersion'
            ),
            new BuildTreeItem(
                '  Build Runner',
                'Generate code with build_runner',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('gear', new vscode.ThemeColor('charts.yellow')),
                'flutter-build-utils.buildRunner'
            ),
            new BuildTreeItem(
                '  Analyze',
                'Run flutter analyze',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('search', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.flutterAnalyze'
            ),
            new BuildTreeItem(
                '  Format',
                'Run flutter format',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('symbol-color', new vscode.ThemeColor('charts.pink')),
                'flutter-build-utils.flutterFormat'
            ),
            new BuildTreeItem(
                '  Clean',
                'Run flutter clean',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.orange')),
                'flutter-build-utils.clean'
            ),
            new BuildTreeItem(
                '  Pub Get',
                'Run flutter pub get',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.pubGet'
            ),
            new BuildTreeItem(
                '  Clean & Pub Get',
                'Run flutter clean and flutter pub get',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.cleanAndPubGet'
            ),
            new BuildTreeItem(
                '  Pub Get (all in folder)',
                'Run pub get in all direct child packages of a folder',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.pubGetAllInFolder'
            ),
            new BuildTreeItem(
                '  Clean & Pub Get (all in folder)',
                'Run clean and pub get in all direct child packages of a folder',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.cleanAndPubGetAllInFolder'
            ),
            new BuildTreeItem(
                '  Pod Install',
                'Clean and reinstall iOS pods',
                vscode.TreeItemCollapsibleState.None,
                'utilAction',
                new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.red')),
                'flutter-build-utils.podInstall'
            )
        );

        // MCP section header
        items.push(
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                'Environment setups',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('server-environment')
            )
        );

        // MCP action buttons
        items.push(
            new BuildTreeItem(
                '  Generate FYERS UI MCP Config',
                'Generate MCP configuration for fy_ui library',
                vscode.TreeItemCollapsibleState.None,
                'mcpAction',
                new vscode.ThemeIcon('json', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.generateMcpConfig'
            ),
            new BuildTreeItem(
                '  Generate Fyers Launch Config',
                'Generate launch.json for Fyers App',
                vscode.TreeItemCollapsibleState.None,
                'mcpAction',
                new vscode.ThemeIcon('debug-alt', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.generateFyersLaunchConfig'
            ),
            new BuildTreeItem(
                '  Add Flutter Cursor Rules',
                'Add Flutter cursor rules to project',
                vscode.TreeItemCollapsibleState.None,
                'mcpAction',
                new vscode.ThemeIcon('files', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.addFlutterCursorRules'
            )
        );

        // Code Generation section header
        items.push(
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                'Code Generation',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('code')
            )
        );

        // Code generation action buttons
        items.push(
            new BuildTreeItem(
                '  Generate Freezed Cubit/Bloc State',
                'Generate Cubit/Bloc state boilerplate',
                vscode.TreeItemCollapsibleState.None,
                'codeGenAction',
                new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.generateFreezedCubitState'
            ),
            new BuildTreeItem(
                '  Generate Freezed API State',
                'Generate API state boilerplate',
                vscode.TreeItemCollapsibleState.None,
                'codeGenAction',
                new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.generateFreezedApiState'
            ),
            new BuildTreeItem(
                '  Generate Freezed UI State',
                'Generate UI state boilerplate',
                vscode.TreeItemCollapsibleState.None,
                'codeGenAction',
                new vscode.ThemeIcon('symbol-struct', new vscode.ThemeColor('charts.cyan')),
                'flutter-build-utils.generateFreezedUiState'
            ),
            new BuildTreeItem(
                '  Generate Freezed Model',
                'Generate data model boilerplate',
                vscode.TreeItemCollapsibleState.None,
                'codeGenAction',
                new vscode.ThemeIcon('symbol-property', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.generateFreezedModel'
            )
        );

        // Submodules section header
        items.push(
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                'Submodules',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('repo-forked')
            )
        );

        items.push(
            new BuildTreeItem(
                '  Submodule Update',
                'Sync packages/ to the SHAs recorded by the parent repo',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('git-branch', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.submoduleUpdate'
            ),
            new BuildTreeItem(
                '  Submodule Remote Status',
                'List submodules behind origin/<branch> from .gitmodules (no updates)',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('list-unordered', new vscode.ThemeColor('charts.yellow')),
                'flutter-build-utils.submoduleRemoteStatus'
            ),
            new BuildTreeItem(
                '  Submodule Update Remote',
                'Scan remotes, then bump only outdated submodules to branch tips',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.orange')),
                'flutter-build-utils.submoduleUpdateRemote'
            ),
            new BuildTreeItem(
                '  Submodule Update Remote (All)',
                'Bump every submodule to its .gitmodules branch tip (slow for large monorepos)',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.red')),
                'flutter-build-utils.submoduleUpdateRemoteAll'
            ),
            new BuildTreeItem(
                '  Submodule Update + Pub Get',
                'Sync submodules to recorded SHAs, then flutter pub get at app root',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.submoduleUpdateAndPubGet'
            ),
            new BuildTreeItem(
                '  Bump Single Submodule',
                'Update one packages/ submodule to latest on its .gitmodules branch',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.submoduleUpdateRemoteOne'
            )
        );

        // Git Actions section header
        items.push(
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                'Git Actions',
                '',
                vscode.TreeItemCollapsibleState.None,
                'sectionHeader',
                new vscode.ThemeIcon('github')
            )
        );

        // Git action buttons
        items.push(
            new BuildTreeItem(
                '  Git Push',
                'Push to origin branch',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.gitPush'
            ),
            new BuildTreeItem(
                '  Git Pull',
                'Pull from origin branch',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.gitPull'
            ),
            new BuildTreeItem(
                '  Git Pull (all in folder)',
                'Run git pull in all direct child git repositories of a folder',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.gitPullAllInFolder'
            ),
            new BuildTreeItem(
                '',
                '',
                vscode.TreeItemCollapsibleState.None,
                'separator',
                new vscode.ThemeIcon('dash')
            ),
            new BuildTreeItem(
                '  Open Repository',
                'Open GitHub repository in browser',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('repo', new vscode.ThemeColor('charts.blue')),
                'flutter-build-utils.openRepository'
            ),
            new BuildTreeItem(
                '  Open Current File',
                'Open current file on GitHub',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.cyan')),
                'flutter-build-utils.openCurrentFile'
            ),
            new BuildTreeItem(
                '  View Current Commit',
                'View current commit on GitHub',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('git-commit', new vscode.ThemeColor('charts.yellow')),
                'flutter-build-utils.viewCurrentCommit'
            ),
            new BuildTreeItem(
                '  Copy Commit Hash',
                'Copy current commit SHA to clipboard',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('clippy', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.copyCommitHash'
            ),
            new BuildTreeItem(
                '  Create PR',
                'Create pull request to master',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('git-pull-request-create', new vscode.ThemeColor('charts.green')),
                'flutter-build-utils.createPR'
            ),
            new BuildTreeItem(
                '  View PR',
                'View pull request for current branch',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('git-pull-request', new vscode.ThemeColor('charts.purple')),
                'flutter-build-utils.viewPR'
            ),
            new BuildTreeItem(
                '  Open Actions',
                'Open GitHub Actions',
                vscode.TreeItemCollapsibleState.None,
                'gitAction',
                new vscode.ThemeIcon('pulse', new vscode.ThemeColor('charts.orange')),
                'flutter-build-utils.openActions'
            )
        );

        // Add separator if there are active or recent sessions
        if (this.activeSessions.size > 0 || this.recentSessions.length > 0) {
            items.push(
                new BuildTreeItem(
                    '─────────────────────',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    'separator',
                    new vscode.ThemeIcon('dash')
                )
            );
        }

        // Active sessions
        this.activeSessions.forEach(session => {
            items.push(this.createSessionItem(session, true));
        });

        // Recent sessions
        this.recentSessions.forEach(session => {
            items.push(this.createSessionItem(session, false));
        });

        return items;
    }

    private createSessionItem(session: BuildSession, isActive: boolean): BuildTreeItem {
        const icon = this.getSessionIcon(session);
        const label = `${session.buildName}`;
        const description = isActive ? 'Running...' : this.getSessionDescription(session);

        const item = new BuildTreeItem(
            label,
            description,
            vscode.TreeItemCollapsibleState.Expanded,
            'buildSession',
            icon
        );

        item.sessionId = session.id;
        return item;
    }

    private getSessionIcon(session: BuildSession): vscode.ThemeIcon {
        switch (session.status) {
            case SessionStatus.Running:
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
            case SessionStatus.Completed:
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case SessionStatus.Failed:
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    private getSessionDescription(session: BuildSession): string {
        if (!session.endTime || !session.startTime) {
            return '';
        }
        const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
        return `${duration.toFixed(1)}s`;
    }

    private getSessionSteps(sessionId: string): BuildTreeItem[] {
        const session = this.activeSessions.get(sessionId) ||
                       this.recentSessions.find(s => s.id === sessionId);

        if (!session) {
            return [];
        }

        return session.steps.map((stepStatus, index) => {
            const icon = this.getStepIcon(stepStatus.status);
            const label = stepStatus.step.description;
            const description = this.getStepDescription(stepStatus);

            const collapsibleState = stepStatus.error
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None;

            const item = new BuildTreeItem(
                label,
                description,
                collapsibleState,
                'buildStep',
                icon
            );

            item.error = stepStatus.error;
            return item;
        });
    }

    private getStepIcon(status: CommandStatus): vscode.ThemeIcon {
        switch (status) {
            case CommandStatus.Waiting:
                return new vscode.ThemeIcon('clock', new vscode.ThemeColor('disabledForeground'));
            case CommandStatus.InProgress:
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
            case CommandStatus.Success:
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case CommandStatus.Failed:
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }
    }

    private getStepDescription(stepStatus: BuildStepStatus): string {
        if (stepStatus.status === CommandStatus.Waiting) {
            return 'Waiting...';
        }
        if (stepStatus.status === CommandStatus.InProgress) {
            return 'Running... (see Output)';
        }
        if (stepStatus.endTime && stepStatus.startTime) {
            const duration = (stepStatus.endTime.getTime() - stepStatus.startTime.getTime()) / 1000;
            return `${duration.toFixed(1)}s`;
        }
        return '';
    }

    /**
     * Create "Open in Finder" action item for completed builds
     */
    private createOpenFolderItem(session: BuildSession): BuildTreeItem | null {
        if (!session.workspaceFolder) {
            return null;
        }

        const outputPath = this.getOutputPath(session.buildType);
        const fullPath = path.join(session.workspaceFolder, outputPath);

        const item = new BuildTreeItem(
            '📂 Open Output Folder',
            outputPath,
            vscode.TreeItemCollapsibleState.None,
            'openFolder',
            new vscode.ThemeIcon('folder-opened', new vscode.ThemeColor('charts.blue')),
            'flutter-build-utils.openOutputFolder'
        );

        item.folderPath = fullPath;
        item.tooltip = `Open ${fullPath} in Finder/Explorer`;

        return item;
    }

    /**
     * Get output path for build type
     */
    private getOutputPath(buildType?: BuildType): string {
        if (!buildType) {
            return 'build';
        }

        switch (buildType) {
            case BuildType.APK:
                return 'build/app/outputs/flutter-apk';
            case BuildType.IPA:
                return 'build/ios/ipa';
            case BuildType.Web:
                return 'build/web';
            default:
                return 'build';
        }
    }
}

export class BuildTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly iconPath: vscode.ThemeIcon,
        commandId?: string
    ) {
        super(label, collapsibleState);
        this.description = description;

        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
                arguments: [this]
            };
        }
    }

    sessionId?: string;
    error?: string;
    folderPath?: string;
}
