import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('your-publisher-name.vscode-annotate'));
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('vscode-annotate.toggleAnnotations'));
    assert.ok(commands.includes('vscode-annotate.addAnnotation'));
    assert.ok(commands.includes('vscode-annotate.configureRepo'));
    assert.ok(commands.includes('vscode-annotate.syncAnnotations'));
  });
});
