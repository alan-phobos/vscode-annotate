export interface Annotation {
  id: string;
  filePath: string;
  line: number;
  column: number;
  text: string;
  author: string;
  timestamp: number;
  projectPath: string;
}

export function isMultiLine(text: string): boolean {
  return text.includes('\n');
}

export function getFirstLine(text: string): string {
  const firstNewline = text.indexOf('\n');
  if (firstNewline === -1) {
    return text;
  }
  return text.substring(0, firstNewline);
}

export function truncateText(text: string, maxLength: number = 60): string {
  const firstLine = getFirstLine(text);
  if (firstLine.length <= maxLength) {
    return firstLine;
  }
  return firstLine.substring(0, maxLength - 3) + '...';
}

export interface AnnotationData {
  annotations: Annotation[];
  version: string;
}
