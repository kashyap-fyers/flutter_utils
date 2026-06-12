/**
 * Helpers for parsing .gitmodules and validating submodule workspaces.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GitSubmoduleEntry {
    name: string;
    path: string;
    url: string;
    branch?: string;
}

export function hasGitmodules(root: string): boolean {
    return fs.existsSync(path.join(root, '.gitmodules'));
}

export type SubmoduleUpdateMode = 'recorded' | 'remote';

export interface SubmoduleCommandSpec {
    id: string;
    description: string;
    command: string;
}

function shellQuotePath(submodulePath: string): string {
    if (/^[a-zA-Z0-9_./-]+$/.test(submodulePath)) {
        return submodulePath;
    }
    return `'${submodulePath.replace(/'/g, `'\\''`)}'`;
}

/**
 * One git step per .gitmodules entry so Output and sidebar show per-package progress.
 */
export function buildSubmoduleCommandSpecs(
    root: string,
    mode: SubmoduleUpdateMode,
    paths?: string[]
): SubmoduleCommandSpec[] {
    const pathFilter = paths ? new Set(paths) : undefined;
    const entries = parseGitmodules(root).filter(
        entry => !pathFilter || pathFilter.has(entry.path)
    );
    const remoteFlag = mode === 'remote' ? ' --remote' : '';

    return entries.map((entry, index) => {
        const quotedPath = shellQuotePath(entry.path);
        const branchHint = entry.branch ? ` (${entry.branch})` : '';

        return {
            id: `submodule-${entry.name}`,
            description: `${index + 1}/${entries.length} ${entry.path}${branchHint}`,
            command: `git submodule update --init${remoteFlag} --progress -- ${quotedPath}`
        };
    });
}

/**
 * Parse submodule entries from a .gitmodules file (git config INI format).
 */
export function parseGitmodules(root: string): GitSubmoduleEntry[] {
    const gitmodulesPath = path.join(root, '.gitmodules');
    if (!fs.existsSync(gitmodulesPath)) {
        return [];
    }

    const content = fs.readFileSync(gitmodulesPath, 'utf8');
    const entries: GitSubmoduleEntry[] = [];
    let current: Partial<GitSubmoduleEntry> | null = null;

    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const sectionMatch = line.match(/^\[submodule\s+"([^"]+)"\]$/);
        if (sectionMatch) {
            if (current?.name && current.path && current.url) {
                entries.push(current as GitSubmoduleEntry);
            }
            current = { name: sectionMatch[1] };
            continue;
        }

        if (!current) {
            continue;
        }

        const keyValueMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (!keyValueMatch) {
            continue;
        }

        const key = keyValueMatch[1];
        const value = keyValueMatch[2].trim();

        if (key === 'path') {
            current.path = value;
        } else if (key === 'url') {
            current.url = value;
        } else if (key === 'branch') {
            current.branch = value;
        }
    }

    if (current?.name && current.path && current.url) {
        entries.push(current as GitSubmoduleEntry);
    }

    return entries.sort((a, b) => a.path.localeCompare(b.path));
}
