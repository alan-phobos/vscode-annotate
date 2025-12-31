import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import { Annotation, AnnotationData } from './types';
import { GitService } from './gitService';

export class AnnotationStorage {
  private annotations: Map<string, Annotation[]> = new Map();
  private gitService: GitService;

  constructor(gitService: GitService) {
    this.gitService = gitService;
  }

  async loadAnnotations(projectPath: string): Promise<void> {
    const repoPath = this.gitService.getRepoPath();
    if (!repoPath) {
      return;
    }

    const annotationFile = this.getAnnotationFilePath(projectPath, repoPath);

    try {
      const content = await fs.readFile(annotationFile, 'utf-8');
      const data: AnnotationData = JSON.parse(content);
      this.annotations.set(projectPath, data.annotations);
    } catch (error) {
      // Only show warning for errors other than file not found (new projects won't have annotations yet)
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        vscode.window.showWarningMessage(`Failed to load annotations: ${error instanceof Error ? error.message : error}`);
      }
      this.annotations.set(projectPath, []);
    }
  }

  async saveAnnotations(projectPath: string): Promise<void> {
    const repoPath = this.gitService.getRepoPath();
    if (!repoPath) {
      throw new Error('Annotation repository not configured');
    }

    const annotationFile = this.getAnnotationFilePath(projectPath, repoPath);
    const annotations = this.annotations.get(projectPath) || [];

    const data: AnnotationData = {
      version: '1.0',
      annotations
    };

    const dir = path.dirname(annotationFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(annotationFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  private getAnnotationFilePath(projectPath: string, repoPath: string): string {
    const projectHash = this.hashProjectPath(projectPath);
    const projectDir = path.join(repoPath, projectHash);
    return path.join(projectDir, 'annotations.json');
  }

  private hashProjectPath(projectPath: string): string {
    const normalized = path.normalize(projectPath);
    // Use SHA-256 hash truncated to 16 chars for a unique, readable folder name
    const hash = createHash('sha256').update(normalized).digest('hex').substring(0, 16);
    // Prepend a readable portion of the project name for easier identification
    const projectName = path.basename(normalized).replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${projectName}_${hash}`;
  }

  async addAnnotation(annotation: Annotation): Promise<void> {
    const projectAnnotations = this.annotations.get(annotation.projectPath) || [];
    projectAnnotations.push(annotation);
    this.annotations.set(annotation.projectPath, projectAnnotations);

    await this.saveAnnotations(annotation.projectPath);
  }

  getAnnotationsForFile(filePath: string, projectPath: string): Annotation[] {
    const projectAnnotations = this.annotations.get(projectPath) || [];
    return projectAnnotations.filter(a => a.filePath === filePath);
  }

  getAllAnnotations(projectPath: string): Annotation[] {
    return this.annotations.get(projectPath) || [];
  }

  async removeAnnotation(id: string, projectPath: string): Promise<void> {
    const projectAnnotations = this.annotations.get(projectPath) || [];
    const filtered = projectAnnotations.filter(a => a.id !== id);
    this.annotations.set(projectPath, filtered);

    await this.saveAnnotations(projectPath);
  }

  async updateAnnotation(id: string, projectPath: string, newText: string): Promise<void> {
    const projectAnnotations = this.annotations.get(projectPath) || [];
    const annotation = projectAnnotations.find(a => a.id === id);
    if (annotation) {
      annotation.text = newText;
      annotation.timestamp = Date.now();
      await this.saveAnnotations(projectPath);
    }
  }

  getAnnotationById(id: string, projectPath: string): Annotation | undefined {
    const projectAnnotations = this.annotations.get(projectPath) || [];
    return projectAnnotations.find(a => a.id === id);
  }

  async sync(projectPath: string): Promise<void> {
    await this.gitService.pull();
    await this.loadAnnotations(projectPath);
  }

  async commitChanges(projectPath: string, message: string): Promise<void> {
    await this.saveAnnotations(projectPath);
    await this.gitService.commitAndPush(message);
  }
}
