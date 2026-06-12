/**
 * Compare each submodule HEAD to its remote tracking branch from .gitmodules.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { GitSubmoduleEntry, parseGitmodules } from './submoduleUtils';

const execAsync = promisify(exec);

export type SubmoduleRemoteState =
    | 'up-to-date'
    | 'behind'
    | 'ahead'
    | 'diverged'
    | 'not-initialized'
    | 'error';

export interface SubmoduleRemoteStatus {
    entry: GitSubmoduleEntry;
    state: SubmoduleRemoteState;
    branch: string;
    localSha?: string;
    remoteSha?: string;
    shortLocal?: string;
    shortRemote?: string;
    errorMessage?: string;
}

export interface SubmoduleRemoteScanResult {
    statuses: SubmoduleRemoteStatus[];
    outdated: SubmoduleRemoteStatus[];
    upToDate: SubmoduleRemoteStatus[];
    skipped: SubmoduleRemoteStatus[];
    errored: SubmoduleRemoteStatus[];
}

export function needsRemoteUpdate(status: SubmoduleRemoteStatus): boolean {
    return status.state === 'behind' || status.state === 'not-initialized';
}

function shellQuotePath(submodulePath: string): string {
    if (/^[a-zA-Z0-9_./-]+$/.test(submodulePath)) {
        return submodulePath;
    }
    return `'${submodulePath.replace(/'/g, `'\\''`)}'`;
}

async function runGit(cwd: string, command: string): Promise<string> {
    const { stdout } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024
    });
    return stdout.trim();
}

async function isSubmoduleInitialized(root: string, entryPath: string): Promise<boolean> {
    try {
        const quotedPath = shellQuotePath(entryPath);
        const output = await runGit(root, `git submodule status -- ${quotedPath}`);
        const line = output.split('\n').find(l => l.trim().length > 0)?.trim() ?? '';
        return line.length > 0 && !line.startsWith('-');
    } catch {
        return fs.existsSync(path.join(root, entryPath, '.git'));
    }
}

async function resolveBranch(submoduleDir: string, entry: GitSubmoduleEntry): Promise<string> {
    if (entry.branch) {
        return entry.branch;
    }

    try {
        const ref = await runGit(submoduleDir, 'git symbolic-ref --short refs/remotes/origin/HEAD');
        return ref.replace(/^origin\//, '');
    } catch {
        for (const candidate of ['main', 'master']) {
            try {
                await runGit(submoduleDir, `git rev-parse origin/${candidate}`);
                return candidate;
            } catch {
                continue;
            }
        }
    }

    return 'master';
}

async function countCommits(submoduleDir: string, range: string): Promise<number> {
    try {
        const count = await runGit(submoduleDir, `git rev-list --count ${range}`);
        return Number.parseInt(count, 10) || 0;
    } catch {
        return 0;
    }
}

async function shortSha(submoduleDir: string, ref: string): Promise<string> {
    try {
        return await runGit(submoduleDir, `git rev-parse --short ${ref}`);
    } catch {
        return ref.slice(0, 7);
    }
}

export async function checkSubmoduleRemoteStatus(
    root: string,
    entry: GitSubmoduleEntry
): Promise<SubmoduleRemoteStatus> {
    const submoduleDir = path.join(root, entry.path);

    if (!(await isSubmoduleInitialized(root, entry.path))) {
        return {
            entry,
            state: 'not-initialized',
            branch: entry.branch ?? 'master'
        };
    }

    try {
        const branch = await resolveBranch(submoduleDir, entry);
        await runGit(submoduleDir, `git fetch origin ${branch} --quiet`);

        const localSha = await runGit(submoduleDir, 'git rev-parse HEAD');
        const remoteSha = await runGit(submoduleDir, `git rev-parse origin/${branch}`);
        const shortLocal = await shortSha(submoduleDir, 'HEAD');
        const shortRemote = await shortSha(submoduleDir, `origin/${branch}`);

        if (localSha === remoteSha) {
            return {
                entry,
                state: 'up-to-date',
                branch,
                localSha,
                remoteSha,
                shortLocal,
                shortRemote
            };
        }

        const behind = await countCommits(submoduleDir, `HEAD..origin/${branch}`);
        const ahead = await countCommits(submoduleDir, `origin/${branch}..HEAD`);

        let state: SubmoduleRemoteState = 'behind';
        if (behind > 0 && ahead > 0) {
            state = 'diverged';
        } else if (ahead > 0) {
            state = 'ahead';
        }

        return {
            entry,
            state,
            branch,
            localSha,
            remoteSha,
            shortLocal,
            shortRemote
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            entry,
            state: 'error',
            branch: entry.branch ?? 'master',
            errorMessage: message
        };
    }
}

export async function scanSubmoduleRemoteStatuses(
    root: string,
    onProgress?: (current: number, total: number, status: SubmoduleRemoteStatus) => void
): Promise<SubmoduleRemoteScanResult> {
    const entries = parseGitmodules(root);
    const statuses: SubmoduleRemoteStatus[] = [];

    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const status = await checkSubmoduleRemoteStatus(root, entry);
        statuses.push(status);
        onProgress?.(index + 1, entries.length, status);
    }

    return summarizeSubmoduleRemoteStatuses(statuses);
}

export function summarizeSubmoduleRemoteStatuses(
    statuses: SubmoduleRemoteStatus[]
): SubmoduleRemoteScanResult {
    return {
        statuses,
        outdated: statuses.filter(needsRemoteUpdate),
        upToDate: statuses.filter(s => s.state === 'up-to-date'),
        skipped: statuses.filter(s => s.state === 'ahead' || s.state === 'diverged'),
        errored: statuses.filter(s => s.state === 'error')
    };
}

export function formatSubmoduleRemoteStatusLine(status: SubmoduleRemoteStatus): string {
    const branch = status.branch ? ` (${status.branch})` : '';

    switch (status.state) {
        case 'up-to-date':
            return `  ✓ ${status.entry.path}${branch} — up to date (${status.shortLocal ?? 'HEAD'})`;
        case 'behind':
            return `  ↓ ${status.entry.path}${branch} — behind remote (${status.shortLocal} → ${status.shortRemote})`;
        case 'ahead':
            return `  ↑ ${status.entry.path}${branch} — ahead of remote (${status.shortLocal} vs ${status.shortRemote}), skipped`;
        case 'diverged':
            return `  ⚡ ${status.entry.path}${branch} — diverged (${status.shortLocal} vs ${status.shortRemote}), skipped`;
        case 'not-initialized':
            return `  ○ ${status.entry.path}${branch} — not initialized, needs update`;
        case 'error':
            return `  ✗ ${status.entry.path}${branch} — ${status.errorMessage ?? 'check failed'}`;
    }
}
