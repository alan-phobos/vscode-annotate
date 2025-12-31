import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import simpleGit, { SimpleGit } from 'simple-git';

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string | null = null;

  async initialize(repoPath: string): Promise<void> {
    this.repoPath = repoPath;

    try {
      await fs.access(repoPath);
    } catch {
      await fs.mkdir(repoPath, { recursive: true });
    }

    this.git = simpleGit(repoPath);

    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init();
      await this.createReadme();
      await this.git.add('.');
      await this.git.commit('Initial commit');
    }
  }

  private async createReadme(): Promise<void> {
    if (!this.repoPath) {
      return;
    }

    const readmePath = path.join(this.repoPath, 'README.md');
    const content = `# Code Annotations Repository

This repository stores code annotations created by the VSCode Annotate extension.

## Structure

Annotations are stored in JSON files organized by project:
- Each project has its own subdirectory
- Annotations are stored in \`annotations.json\` files
`;

    await fs.writeFile(readmePath, content, 'utf-8');
  }

  async getGitUserInfo(): Promise<{ name: string; email: string }> {
    try {
      const name = await this.executeGitCommand(['config', 'user.name']);
      const email = await this.executeGitCommand(['config', 'user.email']);
      return {
        name: name.trim() || 'Unknown',
        email: email.trim() || 'unknown@example.com'
      };
    } catch (error) {
      vscode.window.showWarningMessage('Could not get git user info. Using defaults.');
      return { name: 'Unknown', email: 'unknown@example.com' };
    }
  }

  private async executeGitCommand(args: string[]): Promise<string> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    const result = await this.git.raw(args);
    return result;
  }

  async commitAndPush(message: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    try {
      await this.git.add('.');

      // Check if there are staged changes before committing
      const status = await this.git.status();
      if (status.staged.length === 0 && status.modified.length === 0 && status.created.length === 0) {
        // Nothing to commit, skip silently
        return;
      }

      await this.git.commit(message);

      const remotes = await this.git.getRemotes();
      if (remotes.length > 0) {
        await this.git.push();
      }
    } catch (error) {
      throw new Error(`Git operation failed: ${error}`);
    }
  }

  async pull(): Promise<void> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    try {
      const remotes = await this.git.getRemotes();
      if (remotes.length > 0) {
        await this.git.pull();
      }
    } catch (error) {
      throw new Error(`Git pull failed: ${error}`);
    }
  }

  getRepoPath(): string | null {
    return this.repoPath;
  }
}
