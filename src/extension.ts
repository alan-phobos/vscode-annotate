import * as vscode from 'vscode';
import { GitService } from './gitService';
import { AnnotationStorage } from './annotationStorage';
import { AnnotationCommentController } from './annotationCommentController';
import { AnnotationCodeLensProvider } from './annotationCodeLensProvider';
import { Annotation } from './types';
import * as path from 'path';
import { randomUUID } from 'crypto';

let gitService: GitService;
let annotationStorage: AnnotationStorage;
let commentController: AnnotationCommentController;
let codeLensProvider: AnnotationCodeLensProvider;
let currentProjectPath: string | undefined;
let annotationsEnabled: boolean = true;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Code Annotate extension is now active');

  gitService = new GitService();
  annotationStorage = new AnnotationStorage(gitService);
  commentController = new AnnotationCommentController();
  codeLensProvider = new AnnotationCodeLensProvider();

  // Set up comment controller handlers
  commentController.setHandlers(
    // onSave handler
    async (filePath: string, line: number, text: string, author: string) => {
      if (!currentProjectPath) return;

      const relativePath = path.relative(currentProjectPath, filePath);
      const annotation: Annotation = {
        id: randomUUID(),
        filePath: relativePath,
        line,
        column: 0,
        text,
        author,
        timestamp: Date.now(),
        projectPath: currentProjectPath
      };

      await annotationStorage.addAnnotation(annotation);
      await annotationStorage.commitChanges(
        currentProjectPath,
        `Add annotation by ${author} to ${relativePath}`
      );
      refreshDecorations();
    },
    // onDelete handler
    async (annotationId: string) => {
      if (!currentProjectPath) return;

      await annotationStorage.removeAnnotation(annotationId, currentProjectPath);
      await annotationStorage.commitChanges(
        currentProjectPath,
        `Remove annotation ${annotationId}`
      );
      refreshDecorations();
    },
    // onEdit handler
    async (annotationId: string, newText: string) => {
      if (!currentProjectPath) return;

      await annotationStorage.updateAnnotation(annotationId, currentProjectPath, newText);
      await annotationStorage.commitChanges(
        currentProjectPath,
        `Update annotation ${annotationId}`
      );
      refreshDecorations();
    }
  );

  // Register CodeLens provider
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: 'file' },
    codeLensProvider
  );

  const config = vscode.workspace.getConfiguration('vscode-annotate');
  const repoPath = config.get<string>('repositoryPath');
  annotationsEnabled = config.get<boolean>('annotationsEnabled', true);
  codeLensProvider.setEnabled(annotationsEnabled);

  if (repoPath) {
    try {
      await gitService.initialize(repoPath);
      // Set author for comments as early as possible
      const userInfo = await gitService.getGitUserInfo();
      commentController.setAuthorForNewThreads(userInfo.name);
      await loadAnnotationsForWorkspace();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize annotation repository: ${error}`);
    }
  }

  const toggleCommand = vscode.commands.registerCommand(
    'vscode-annotate.toggleAnnotations',
    async () => {
      annotationsEnabled = !annotationsEnabled;
      codeLensProvider.setEnabled(annotationsEnabled);

      await vscode.workspace.getConfiguration('vscode-annotate').update(
        'annotationsEnabled',
        annotationsEnabled,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(
        `Annotations ${annotationsEnabled ? 'enabled' : 'disabled'}`
      );

      refreshDecorations();
    }
  );

  // Add annotation command - opens inline comment input at cursor
  const addAnnotationCommand = vscode.commands.registerCommand(
    'vscode-annotate.addAnnotation',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      // Ensure we have a current project path
      if (!currentProjectPath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
          return;
        }
        currentProjectPath = workspaceFolders[0].uri.fsPath;
        await annotationStorage.loadAnnotations(currentProjectPath);
      }

      const repoPath = gitService.getRepoPath();
      if (!repoPath) {
        const configure = await vscode.window.showErrorMessage(
          'Annotation repository not configured. Would you like to configure it now?',
          'Configure'
        );
        if (configure === 'Configure') {
          await configureRepository();
        }
        return;
      }

      // Get author info and set it for the comment controller
      const userInfo = await gitService.getGitUserInfo();
      commentController.setAuthorForNewThreads(userInfo.name);

      // Create an empty comment thread at the cursor position to trigger input
      const position = editor.selection.active;
      commentController.createEmptyThreadForInput(editor.document.uri, position.line);
    }
  );

  const configureRepoCommand = vscode.commands.registerCommand(
    'vscode-annotate.configureRepo',
    async () => {
      await configureRepository();
    }
  );

  const syncCommand = vscode.commands.registerCommand(
    'vscode-annotate.syncAnnotations',
    async () => {
      await syncAnnotations();
    }
  );

  const changeEditorSubscription = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        updateDecorationsForEditor(editor);
      }
    }
  );

  const changeTextSubscription = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateDecorationsForEditor(editor);
      }
    }
  );

  const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      if (event.affectsConfiguration('vscode-annotate.repositoryPath')) {
        const newRepoPath = vscode.workspace.getConfiguration('vscode-annotate').get<string>('repositoryPath');
        if (newRepoPath) {
          try {
            await gitService.initialize(newRepoPath);
            await loadAnnotationsForWorkspace();
            vscode.window.showInformationMessage('Annotation repository updated');
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to update repository: ${error}`);
          }
        }
      }
      if (event.affectsConfiguration('vscode-annotate.annotationsEnabled')) {
        annotationsEnabled = vscode.workspace.getConfiguration('vscode-annotate').get<boolean>('annotationsEnabled', true);
        codeLensProvider.setEnabled(annotationsEnabled);
        refreshDecorations();
      }
    }
  );

  const workspaceFoldersChangeSubscription = vscode.workspace.onDidChangeWorkspaceFolders(
    async () => {
      await loadAnnotationsForWorkspace();
      refreshDecorations();
    }
  );

  context.subscriptions.push(
    toggleCommand,
    addAnnotationCommand,
    configureRepoCommand,
    syncCommand,
    codeLensDisposable,
    changeEditorSubscription,
    changeTextSubscription,
    configChangeSubscription,
    workspaceFoldersChangeSubscription,
    commentController
  );

  if (vscode.window.activeTextEditor) {
    updateDecorationsForEditor(vscode.window.activeTextEditor);
  }
}

async function loadAnnotationsForWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  currentProjectPath = workspaceFolders[0].uri.fsPath;
  await annotationStorage.loadAnnotations(currentProjectPath);
  refreshDecorations();
}

async function configureRepository(): Promise<void> {
  const repoPath = await vscode.window.showInputBox({
    prompt: 'Enter the path to your annotations git repository',
    placeHolder: '/path/to/annotations-repo',
    validateInput: (text) => {
      return text.trim().length === 0 ? 'Path cannot be empty' : null;
    }
  });

  if (!repoPath) {
    return;
  }

  try {
    await gitService.initialize(repoPath);

    await vscode.workspace.getConfiguration('vscode-annotate').update(
      'repositoryPath',
      repoPath,
      vscode.ConfigurationTarget.Global
    );

    await loadAnnotationsForWorkspace();

    vscode.window.showInformationMessage(
      'Annotation repository configured successfully'
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to configure repository: ${error}`);
  }
}

async function syncAnnotations(): Promise<void> {
  if (!currentProjectPath) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    await annotationStorage.sync(currentProjectPath);
    vscode.window.showInformationMessage('Annotations synced successfully');
    refreshDecorations();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to sync annotations: ${error}`);
  }
}

async function updateDecorationsForEditor(editor: vscode.TextEditor): Promise<void> {
  if (!currentProjectPath) {
    return;
  }

  const filePath = path.relative(currentProjectPath, editor.document.uri.fsPath);
  const annotations = annotationStorage.getAnnotationsForFile(
    filePath,
    currentProjectPath
  );

  // Display all annotations via CodeLens (above the line)
  codeLensProvider.setAnnotationsForFile(filePath, annotations);

  // Set author for new comment threads
  const userInfo = await gitService.getGitUserInfo();
  commentController.setAuthorForNewThreads(userInfo.name);

  // Clear existing comment threads for this document and recreate
  commentController.clearThreadsForDocument(editor.document.uri);
  for (const annotation of annotations) {
    commentController.createThreadForAnnotation(editor.document.uri, annotation);
  }
}

function refreshDecorations(): void {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    updateDecorationsForEditor(editor);
  }
}

export function deactivate() {
  // Cleanup handled by subscriptions
}
