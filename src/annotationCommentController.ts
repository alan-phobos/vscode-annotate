import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { Annotation } from './types';

interface ThreadMetadata {
  annotationId?: string;
  authorName?: string;
}

// WeakMap to store metadata for threads without using `as any`
const threadMetadata = new WeakMap<vscode.CommentThread, ThreadMetadata>();

function getThreadMetadata(thread: vscode.CommentThread): ThreadMetadata {
  let metadata = threadMetadata.get(thread);
  if (!metadata) {
    metadata = {};
    threadMetadata.set(thread, metadata);
  }
  return metadata;
}

export class AnnotationComment implements vscode.Comment {
  id: string;
  label: string | undefined;
  savedBody: string | vscode.MarkdownString;

  constructor(
    public body: string | vscode.MarkdownString,
    public mode: vscode.CommentMode,
    public author: vscode.CommentAuthorInformation,
    public parent?: vscode.CommentThread,
    public contextValue?: string
  ) {
    this.id = randomUUID();
    this.savedBody = body;
  }
}

export type AnnotationSaveHandler = (
  filePath: string,
  line: number,
  text: string,
  author: string
) => Promise<void>;

export type AnnotationDeleteHandler = (annotationId: string) => Promise<void>;

export type AnnotationEditHandler = (
  annotationId: string,
  newText: string
) => Promise<void>;

export class AnnotationCommentController implements vscode.Disposable {
  private commentController: vscode.CommentController;
  private threads: Map<string, vscode.CommentThread> = new Map();
  private disposables: vscode.Disposable[] = [];
  private defaultAuthorName: string = 'Unknown';

  private onSave: AnnotationSaveHandler | undefined;
  private onDelete: AnnotationDeleteHandler | undefined;
  private onEdit: AnnotationEditHandler | undefined;

  constructor() {
    this.commentController = vscode.comments.createCommentController(
      'vscode-annotate',
      'Code Annotations'
    );

    this.commentController.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        const lineCount = document.lineCount;
        return [new vscode.Range(0, 0, lineCount - 1, 0)];
      }
    };

    // Configure the comment controller options
    this.commentController.options = {
      placeHolder: 'Add your annotation... (Shift+Enter for new line)',
      prompt: 'Add Annotation'
    };

    this.registerCommands();
  }

  setHandlers(
    onSave: AnnotationSaveHandler,
    onDelete: AnnotationDeleteHandler,
    onEdit: AnnotationEditHandler
  ): void {
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.onEdit = onEdit;
  }

  private registerCommands(): void {
    // Command to create a new annotation from the comment input
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.createAnnotationComment',
        async (reply: vscode.CommentReply) => {
          await this.handleCreateAnnotation(reply);
        }
      )
    );

    // Command to edit an annotation
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.editAnnotationComment',
        (comment: AnnotationComment) => {
          this.handleEditAnnotation(comment);
        }
      )
    );

    // Command to save edited annotation
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.saveAnnotationComment',
        async (comment: AnnotationComment) => {
          await this.handleSaveAnnotation(comment);
        }
      )
    );

    // Command to cancel edit
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.cancelAnnotationComment',
        (comment: AnnotationComment) => {
          this.handleCancelEdit(comment);
        }
      )
    );

    // Command to delete an annotation
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.deleteAnnotationComment',
        async (comment: AnnotationComment) => {
          await this.handleDeleteAnnotation(comment);
        }
      )
    );

    // Command to delete entire thread
    this.disposables.push(
      vscode.commands.registerCommand(
        'vscode-annotate.deleteAnnotationThread',
        async (thread: vscode.CommentThread) => {
          await this.handleDeleteThread(thread);
        }
      )
    );
  }

  private async handleCreateAnnotation(reply: vscode.CommentReply): Promise<void> {
    const thread = reply.thread;
    const text = reply.text.trim();

    if (!text) {
      return;
    }

    // Get author info - prefer thread-specific, fall back to default
    const author = getThreadMetadata(thread).authorName || this.defaultAuthorName;
    const uri = thread.uri;
    const line = (thread.range?.start.line ?? 0) + 1; // Convert to 1-indexed

    // Create the comment for display
    const newComment = new AnnotationComment(
      text,
      vscode.CommentMode.Preview,
      { name: author },
      thread,
      'canDelete,canEdit'
    );

    thread.comments = [...thread.comments, newComment];

    // Set the thread label now that we have a comment
    thread.label = `Annotation by ${author}`;

    // Collapse the thread after adding
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;

    // Call the save handler
    if (this.onSave) {
      try {
        await this.onSave(uri.fsPath, line, text, author);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save annotation: ${error}`);
      }
    }
  }

  private handleEditAnnotation(comment: AnnotationComment): void {
    if (!comment.parent) {
      return;
    }

    comment.parent.comments = comment.parent.comments.map(c => {
      if ((c as AnnotationComment).id === comment.id) {
        c.mode = vscode.CommentMode.Editing;
      }
      return c;
    });
  }

  private async handleSaveAnnotation(comment: AnnotationComment): Promise<void> {
    if (!comment.parent) {
      return;
    }

    const newText = typeof comment.body === 'string'
      ? comment.body
      : comment.body.value;

    comment.parent.comments = comment.parent.comments.map(c => {
      if ((c as AnnotationComment).id === comment.id) {
        (c as AnnotationComment).savedBody = c.body;
        c.mode = vscode.CommentMode.Preview;
      }
      return c;
    });

    // Call the edit handler with the annotation ID stored in thread data
    const annotationId = getThreadMetadata(comment.parent).annotationId;
    if (this.onEdit && annotationId) {
      try {
        await this.onEdit(annotationId, newText);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to update annotation: ${error}`);
      }
    }
  }

  private handleCancelEdit(comment: AnnotationComment): void {
    if (!comment.parent) {
      return;
    }

    comment.parent.comments = comment.parent.comments.map(c => {
      if ((c as AnnotationComment).id === comment.id) {
        c.body = (c as AnnotationComment).savedBody;
        c.mode = vscode.CommentMode.Preview;
      }
      return c;
    });
  }

  private async handleDeleteAnnotation(comment: AnnotationComment): Promise<void> {
    const thread = comment.parent;
    if (!thread) {
      return;
    }

    thread.comments = thread.comments.filter(
      c => (c as AnnotationComment).id !== comment.id
    );

    // If no comments left, dispose the thread
    if (thread.comments.length === 0) {
      const annotationId = getThreadMetadata(thread).annotationId;
      if (this.onDelete && annotationId) {
        try {
          await this.onDelete(annotationId);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to delete annotation: ${error}`);
        }
      }
      thread.dispose();
    }
  }

  private async handleDeleteThread(thread: vscode.CommentThread): Promise<void> {
    const annotationId = getThreadMetadata(thread).annotationId;
    if (this.onDelete && annotationId) {
      try {
        await this.onDelete(annotationId);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete annotation: ${error}`);
      }
    }
    thread.dispose();
  }

  /**
   * Create a comment thread for an existing annotation
   */
  createThreadForAnnotation(
    uri: vscode.Uri,
    annotation: Annotation
  ): vscode.CommentThread {
    const line = annotation.line - 1; // Convert to 0-indexed
    const range = new vscode.Range(line, 0, line, 0);

    const thread = this.commentController.createCommentThread(uri, range, []);

    // Store annotation ID on the thread for later reference
    const metadata = getThreadMetadata(thread);
    metadata.annotationId = annotation.id;
    metadata.authorName = annotation.author;

    const comment = new AnnotationComment(
      annotation.text,
      vscode.CommentMode.Preview,
      { name: annotation.author },
      thread,
      'canDelete,canEdit'
    );

    thread.comments = [comment];
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
    thread.label = `Annotation by ${annotation.author}`;

    // Store thread reference
    this.threads.set(annotation.id, thread);

    return thread;
  }

  /**
   * Remove a thread by annotation ID
   */
  removeThread(annotationId: string): void {
    const thread = this.threads.get(annotationId);
    if (thread) {
      thread.dispose();
      this.threads.delete(annotationId);
    }
  }

  /**
   * Clear all threads for a specific document
   */
  clearThreadsForDocument(uri: vscode.Uri): void {
    const uriString = uri.toString();
    const idsToDelete: string[] = [];

    for (const [id, thread] of this.threads) {
      if (thread.uri.toString() === uriString) {
        thread.dispose();
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      this.threads.delete(id);
    }
  }

  /**
   * Clear all threads
   */
  clearAllThreads(): void {
    for (const thread of this.threads.values()) {
      thread.dispose();
    }
    this.threads.clear();
  }

  /**
   * Set author name for new threads (called before creating)
   */
  setAuthorForNewThreads(authorName: string): void {
    this.defaultAuthorName = authorName;
  }

  /**
   * Create an empty thread at a line to trigger input for a new annotation
   */
  createEmptyThreadForInput(uri: vscode.Uri, line: number): vscode.CommentThread {
    const range = new vscode.Range(line, 0, line, 0);
    const thread = this.commentController.createCommentThread(uri, range, []);

    // Set author from stored default
    getThreadMetadata(thread).authorName = this.defaultAuthorName;

    // Start expanded so user can type immediately
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.canReply = true;

    return thread;
  }

  dispose(): void {
    this.clearAllThreads();
    this.commentController.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
