import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const OUTPUT_CHANNEL_NAME = 'flutter-toolbox';
const BLOCK_COMMENT_RE = /^#\s*Active packages?:\s*(.+?)(?:\s+—.*)?$/;
const PACKAGES_IGNORE_RE = /^packages\/\*$/;
const NEGATION_DIR_RE = /^!packages\/([^/]+)\/$/;
const NEGATION_RECURSE_RE = /^!packages\/([^/]+)\/\*\*$/;

export interface ActivePackageStatus {
    monorepoRoot: string;
    cursorIgnorePath: string;
    activePackages: string[];
    negatedPackages: string[];
    hasPackagesIgnore: boolean;
    isValid: boolean;
    warnings: string[];
    blockLines: string[];
}

export function findMonorepoRoot(startPath: string): string | null {
    let current = path.resolve(startPath);

    while (true) {
        const packagesDir = path.join(current, 'packages');
        if (fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory()) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            return null;
        }
        current = parent;
    }
}

export function listPackages(monorepoRoot: string): string[] {
    const packagesDir = path.join(monorepoRoot, 'packages');

    return fs
        .readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => fs.existsSync(path.join(packagesDir, name, 'pubspec.yaml')))
        .sort((a, b) => a.localeCompare(b));
}

function parsePackagesFromComment(commentLine: string): string[] {
    const match = commentLine.match(BLOCK_COMMENT_RE);
    if (!match) {
        return [];
    }

    return match[1]
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
}

function samePackageSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
}

export function parseActivePackageBlock(content: string): Omit<ActivePackageStatus, 'monorepoRoot' | 'cursorIgnorePath'> {
    const lines = content.split(/\r?\n/);
    const blockStartIndex = lines.findIndex((line) => /^#\s*Active packages?:/.test(line));

    const warnings: string[] = [];
    const activePackages: string[] = [];
    const negatedPackages: string[] = [];
    let hasPackagesIgnore = false;
    const blockLines: string[] = [];

    if (blockStartIndex === -1) {
        warnings.push('No active package block found in .cursorignore.');
        return {
            activePackages,
            negatedPackages,
            hasPackagesIgnore,
            isValid: false,
            warnings,
            blockLines
        };
    }

    for (let i = blockStartIndex; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '' && i > blockStartIndex) {
            break;
        }
        blockLines.push(line);

        if (i === blockStartIndex) {
            activePackages.push(...parsePackagesFromComment(line));
        }
        if (PACKAGES_IGNORE_RE.test(line.trim())) {
            hasPackagesIgnore = true;
        }
        const dirNegationMatch = line.match(NEGATION_DIR_RE);
        const recurseNegationMatch = line.match(NEGATION_RECURSE_RE);
        const packageName = dirNegationMatch?.[1] ?? recurseNegationMatch?.[1];
        if (packageName && !negatedPackages.includes(packageName)) {
            negatedPackages.push(packageName);
        }
    }

    if (!hasPackagesIgnore) {
        warnings.push('Missing `packages/*` ignore line.');
    }
    if (negatedPackages.length === 0) {
        warnings.push('Missing `!packages/<name>/` and `!packages/<name>/**` exception line(s).');
    }
    for (const pkg of activePackages.length > 0 ? activePackages : negatedPackages) {
        const blockText = blockLines.join('\n');
        if (!new RegExp(`^!packages/${pkg}/$`, 'm').test(blockText)) {
            warnings.push(`Missing directory negation for ${pkg}: \`!packages/${pkg}/\``);
        }
        if (!new RegExp(`^!packages/${pkg}/\\*\\*$`, 'm').test(blockText)) {
            warnings.push(`Missing recursive negation for ${pkg}: \`!packages/${pkg}/**\``);
        }
    }
    if (activePackages.length === 0) {
        warnings.push('No package names found in active package comment.');
    }
    if (activePackages.length > 0 && negatedPackages.length > 0 && !samePackageSet(activePackages, negatedPackages)) {
        const onlyInComment = activePackages.filter((pkg) => !negatedPackages.includes(pkg));
        const onlyInNegation = negatedPackages.filter((pkg) => !activePackages.includes(pkg));
        if (onlyInComment.length > 0) {
            warnings.push(`Comment lists packages missing negation: ${onlyInComment.join(', ')}`);
        }
        if (onlyInNegation.length > 0) {
            warnings.push(`Negation lines missing from comment: ${onlyInNegation.join(', ')}`);
        }
    }

    const isValid =
        activePackages.length > 0 &&
        negatedPackages.length > 0 &&
        hasPackagesIgnore &&
        samePackageSet(activePackages, negatedPackages) &&
        warnings.length === 0;

    return {
        activePackages,
        negatedPackages,
        hasPackagesIgnore,
        isValid,
        warnings,
        blockLines
    };
}

export function buildActivePackageBlock(packageNames: string[]): string {
    const sorted = [...packageNames].sort((a, b) => a.localeCompare(b));
    const heading = sorted.length === 1 ? 'Active package' : 'Active packages';
    const lines = [
        `# ${heading}: ${sorted.join(', ')} — ignore all other packages`,
        '# Negation requires un-ignoring the directory before its contents (gitignore rule).',
        'packages/*',
        ...sorted.flatMap((name) => [`!packages/${name}/`, `!packages/${name}/**`])
    ];

    return lines.join('\n');
}

export function stripActivePackageBlock(content: string): string {
    const lines = content.split(/\r?\n/);
    const blockStartIndex = lines.findIndex((line) => /^#\s*Active packages?:/.test(line));

    if (blockStartIndex === -1) {
        return content.replace(/\s+$/, '');
    }

    return lines.slice(0, blockStartIndex).join('\n').replace(/\s+$/, '');
}

export function rewriteCursorIgnore(content: string, packageNames: string[]): string {
    const kept = stripActivePackageBlock(content);
    const block = buildActivePackageBlock(packageNames);

    if (kept.length === 0) {
        return `${block}\n`;
    }

    return `${kept}\n\n${block}\n`;
}

export function inferPackageFromEditor(): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return undefined;
    }

    const normalizedPath = activeEditor.document.uri.fsPath.replace(/\\/g, '/');
    const match = normalizedPath.match(/\/packages\/([^/]+)\//);
    return match?.[1];
}

function inferMonorepoRootFromPackagesPath(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');
    const match = normalized.match(/^(.+)\/packages\/[^/]+(?:\/|$)/);
    if (!match) {
        return null;
    }

    const root = match[1];
    const packagesDir = path.join(root, 'packages');
    if (fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory()) {
        return root;
    }

    return null;
}

function collectCandidatePaths(): string[] {
    const paths = new Set<string>();

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        paths.add(folder.uri.fsPath);
    }

    const fromEditor = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (fromEditor) {
        paths.add(fromEditor);
    }

    for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme === 'file') {
            paths.add(doc.uri.fsPath);
        }
    }

    return [...paths];
}

function discoverMonorepoRoots(): string[] {
    const roots = new Set<string>();

    for (const candidate of collectCandidatePaths()) {
        const fromWalk = findMonorepoRoot(candidate);
        if (fromWalk) {
            roots.add(fromWalk);
            continue;
        }

        const fromPackagesPath = inferMonorepoRootFromPackagesPath(candidate);
        if (fromPackagesPath) {
            roots.add(fromPackagesPath);
        }
    }

    return [...roots].sort((a, b) => a.localeCompare(b));
}

async function promptForMonorepoRoot(): Promise<string | null> {
    const picked = await vscode.window.showInputBox({
        title: 'Monorepo root',
        prompt: 'Enter path to fyers_app (folder that contains packages/)',
        placeHolder: '/Users/you/Documents/GitHub/fyers_app',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Path is required';
            }

            const normalized = value.trim().replace(/\/$/, '');
            const packagesDir = path.join(normalized, 'packages');
            if (!fs.existsSync(packagesDir) || !fs.statSync(packagesDir).isDirectory()) {
                return 'No packages/ directory at that path';
            }

            return null;
        }
    });

    if (!picked?.trim()) {
        return null;
    }

    return picked.trim().replace(/\/$/, '');
}

async function resolveMonorepoRoot(): Promise<string | null> {
    const discovered = discoverMonorepoRoots();

    if (discovered.length === 1) {
        return discovered[0];
    }

    if (discovered.length > 1) {
        const picked = await vscode.window.showQuickPick(
            discovered.map((root) => ({ label: root })),
            {
                title: 'Select monorepo root',
                placeHolder: 'Multiple monorepo roots found'
            }
        );
        return picked?.label ?? null;
    }

    return promptForMonorepoRoot();
}

function readStatus(monorepoRoot: string): ActivePackageStatus {
    const cursorIgnorePath = path.join(monorepoRoot, '.cursorignore');
    const content = fs.existsSync(cursorIgnorePath)
        ? fs.readFileSync(cursorIgnorePath, 'utf8')
        : '';

    return {
        monorepoRoot,
        cursorIgnorePath,
        ...parseActivePackageBlock(content)
    };
}

function getOutputChannel(): vscode.OutputChannel {
    return vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
}

async function pickActivePackages(
    packages: string[],
    preselected: string[]
): Promise<string[] | undefined> {
    const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { packageName: string }>();
    quickPick.title = 'Set Cursor Active Packages';
    quickPick.placeholder = 'Select one or more packages, then press Enter';
    quickPick.canSelectMany = true;
    quickPick.matchOnDescription = true;
    quickPick.items = packages.map((pkg) => ({
        label: pkg,
        packageName: pkg,
        picked: preselected.includes(pkg),
        description: preselected.includes(pkg) ? 'currently active' : undefined
    }));

    return new Promise((resolve) => {
        let settled = false;

        quickPick.onDidAccept(() => {
            if (settled) {
                return;
            }
            settled = true;
            const selected = quickPick.selectedItems.map((item) => item.packageName);
            quickPick.hide();
            resolve(selected.length > 0 ? selected : undefined);
        });

        quickPick.onDidHide(() => {
            if (settled) {
                return;
            }
            settled = true;
            quickPick.dispose();
            resolve(undefined);
        });

        quickPick.show();
    });
}

export async function showActivePackage(): Promise<void> {
    const monorepoRoot = await resolveMonorepoRoot();
    if (!monorepoRoot) {
        vscode.window.showErrorMessage(
            'Could not find monorepo root. Open a file under packages/<name>/ or enter fyers_app path.'
        );
        return;
    }

    const status = readStatus(monorepoRoot);
    const outputChannel = getOutputChannel();
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Cursor Active Packages');
    outputChannel.appendLine('='.repeat(60) + '\n');
    outputChannel.appendLine(`Monorepo root: ${status.monorepoRoot}`);
    outputChannel.appendLine(`.cursorignore: ${status.cursorIgnorePath}\n`);

    if (status.activePackages.length > 0) {
        outputChannel.appendLine(`Active packages (${status.activePackages.length}):`);
        for (const pkg of status.activePackages) {
            outputChannel.appendLine(`  - ${pkg}`);
        }
    } else {
        outputChannel.appendLine('Active packages: (not set)');
    }

    outputChannel.appendLine(`\nValid block: ${status.isValid ? 'yes' : 'no'}\n`);

    if (status.blockLines.length > 0) {
        outputChannel.appendLine('Current block:');
        for (const line of status.blockLines) {
            outputChannel.appendLine(`  ${line}`);
        }
        outputChannel.appendLine('');
    }

    if (status.warnings.length > 0) {
        outputChannel.appendLine('Warnings:');
        for (const warning of status.warnings) {
            outputChannel.appendLine(`  - ${warning}`);
        }
    }

    outputChannel.appendLine('\n' + '='.repeat(60));

    if (!status.isValid) {
        vscode.window.showWarningMessage(
            status.activePackages.length > 0
                ? 'Active package block is incomplete. Use Set Active Package to fix.'
                : 'No valid active package block in .cursorignore.'
        );
    } else {
        vscode.window.showInformationMessage(
            `Active packages: ${status.activePackages.join(', ')}`
        );
    }
}

export async function setActivePackage(): Promise<void> {
    const monorepoRoot = await resolveMonorepoRoot();
    if (!monorepoRoot) {
        vscode.window.showErrorMessage(
            'Could not find monorepo root. Open a file under packages/<name>/ or enter fyers_app path.'
        );
        return;
    }

    const packages = listPackages(monorepoRoot);
    if (packages.length === 0) {
        vscode.window.showErrorMessage('No Flutter packages found under packages/.');
        return;
    }

    const currentStatus = readStatus(monorepoRoot);
    const inferred = inferPackageFromEditor();
    const preselected = new Set(currentStatus.activePackages);
    if (inferred) {
        preselected.add(inferred);
    }

    const selected = await pickActivePackages(packages, [...preselected]);
    if (!selected) {
        return;
    }

    const cursorIgnorePath = path.join(monorepoRoot, '.cursorignore');
    const existingContent = fs.existsSync(cursorIgnorePath)
        ? fs.readFileSync(cursorIgnorePath, 'utf8')
        : '';
    const updatedContent = rewriteCursorIgnore(existingContent, selected);

    fs.writeFileSync(cursorIgnorePath, updatedContent, 'utf8');

    const doc = await vscode.workspace.openTextDocument(cursorIgnorePath);
    await vscode.window.showTextDocument(doc);

    const choice = await vscode.window.showInformationMessage(
        `Active packages set to ${selected.join(', ')}. Reload window for Cursor to apply .cursorignore changes.`,
        'Reload Window'
    );

    if (choice === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}
