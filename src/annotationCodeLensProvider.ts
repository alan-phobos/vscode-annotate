import * as vscode from 'vscode';
import { Annotation, truncateText, isMultiLine } from './types';

export class AnnotationCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private annotations: Map<string, Annotation[]> = new Map();
  private enabled: boolean = true;

  /**
   * Update annotations for a specific file
   */
  setAnnotationsForFile(filePath: string, annotations: Annotation[]): void {
    this.annotations.set(filePath, annotations);
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Clear annotations for a file
   */
  clearAnnotationsForFile(filePath: string): void {
    this.annotations.delete(filePath);
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Clear all annotations
   */
  clearAll(): void {
    this.annotations.clear();
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Enable or disable the provider
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Refresh the code lenses
   */
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    if (!this.enabled) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const filePath = document.uri.fsPath;

    // Normalize path separators for cross-platform compatibility
    const normalizedFilePath = filePath.replace(/\\/g, '/');

    // Find annotations for this file by checking each stored key
    // Use a Set to deduplicate by annotation ID in case of path key collisions
    const seenIds = new Set<string>();
    let fileAnnotations: Annotation[] = [];
    for (const [storedPath, annotations] of this.annotations) {
      const normalizedStoredPath = storedPath.replace(/\\/g, '/');
      // Check if this stored path matches the current document
      if (normalizedFilePath.endsWith(normalizedStoredPath) &&
          (normalizedFilePath === normalizedStoredPath ||
           normalizedFilePath.endsWith('/' + normalizedStoredPath))) {
        for (const annotation of annotations) {
          // Deduplicate by annotation ID
          if (!seenIds.has(annotation.id)) {
            seenIds.add(annotation.id);
            fileAnnotations.push(annotation);
          }
        }
      }
    }

    for (const annotation of fileAnnotations) {
      const line = Math.max(0, annotation.line - 1);

      if (line >= document.lineCount) {
        continue;
      }

      const range = new vscode.Range(line, 0, line, 0);

      // Create display text
      const hasMultipleLines = isMultiLine(annotation.text);
      const displayText = truncateText(annotation.text, 80);
      const icon = hasMultipleLines ? '📝' : '💬';
      const moreIndicator = hasMultipleLines ? ' [+]' : '';

      const codeLens = new vscode.CodeLens(range, {
        title: `${icon} ${annotation.author}: ${displayText}${moreIndicator}`,
        command: '',  // No-op command - clicking does nothing (interaction via comment threads)
        tooltip: this.createTooltip(annotation)
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  private createTooltip(annotation: Annotation): string {
    const date = new Date(annotation.timestamp);
    const lines = [
      `Annotation by ${annotation.author}`,
      `${date.toLocaleString()}`,
      '',
      annotation.text
    ];
    return lines.join('\n');
  }
}
