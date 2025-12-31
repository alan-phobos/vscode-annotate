# Code Annotate

A VSCode extension for creating shareable code annotations that are visible in your editor but not part of your source code. Annotations are stored in a separate git repository, enabling team collaboration across multiple projects.

## Features

- **Non-intrusive annotations**: Add notes to your code without modifying source files
- **Git-based storage**: All annotations are stored in a separate git repository
- **Team collaboration**: Share annotations with your team via git
- **Multi-project support**: One annotation repository can cover multiple codebases
- **Author tracking**: Automatically captures git user information for each annotation
- **Toggle visibility**: Easily show/hide all annotations
- **Inline display**: Annotations appear as decorations next to the relevant code

## Installation

### From Source

1. Clone or download this repository
2. Open the folder in VSCode
3. Install dependencies:
   ```bash
   npm install
   ```
4. Compile the extension:
   ```bash
   npm run compile
   ```
5. Press `F5` to open a new VSCode window with the extension loaded

### Packaging the Extension

To create a `.vsix` file for installation:

1. Install vsce (VSCode Extension Manager):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the `.vsix` file:
   - Open VSCode
   - Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
   - Click the "..." menu at the top
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## Setup

### 1. Configure Annotation Repository

Before using the extension, you need to configure where annotations will be stored:

**Option A: Using Command Palette**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `Annotate: Configure Annotation Repository`
3. Enter the path to your annotations repository (will be created if it doesn't exist)

**Option B: Using Settings**
1. Open VSCode Settings (File > Preferences > Settings)
2. Search for "Code Annotate"
3. Set the "Repository Path" to your desired location

Example repository paths:
- `/Users/username/annotations-repo`
- `~/shared-annotations`
- `/team/shared/code-annotations`

### 2. Set Up Git Repository for Team Sharing

To share annotations with your team:

1. Navigate to your annotation repository:
   ```bash
   cd /path/to/annotations-repo
   ```

2. Add a remote repository:
   ```bash
   git remote add origin https://github.com/your-org/annotations.git
   ```

3. Push your annotations:
   ```bash
   git push -u origin main
   ```

Team members can then clone the same repository and configure their extension to use it.

## Usage

### Adding an Annotation

**Method 1: Keyboard Shortcut** ⌨️
- Press `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)
- Enter your annotation text in the input box

**Method 2: Context Menu**
1. Place your cursor at the desired location in the code
2. Right-click to open the context menu
3. Select "Add Annotation"
4. Enter your annotation text in the input box

**Method 3: Command Palette**
1. Place your cursor at the desired location
2. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run `Annotate: Add Annotation`
4. Enter your annotation text

The annotation will:
- Appear inline next to the code with your username
- Be automatically committed to the annotation repository
- Include your git user name as the author

### Toggling Annotations

**Method 1: Keyboard Shortcut** ⌨️
- Press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

**Method 2: Command Palette**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `Annotate: Toggle Annotations`

**Method 3: Settings**
- Configure in Settings: `vscode-annotate.annotationsEnabled`

### Syncing Annotations

To pull the latest annotations from the remote repository:
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `Annotate: Sync Annotations with Git`

This will:
- Pull changes from the remote repository
- Reload all annotations
- Update the decorations in your editor

## How It Works

### Storage Structure

Annotations are stored in your configured git repository with the following structure:

```
annotations-repo/
├── README.md
├── project_path_hash_1/
│   └── annotations.json
├── project_path_hash_2/
│   └── annotations.json
└── ...
```

Each project gets its own subdirectory (named after a hash of the project path), containing an `annotations.json` file.

### Annotation Format

```json
{
  "version": "1.0",
  "annotations": [
    {
      "id": "uuid-here",
      "filePath": "src/example.ts",
      "line": 42,
      "column": 10,
      "text": "This needs refactoring",
      "author": "John Doe",
      "timestamp": 1234567890000,
      "projectPath": "/Users/john/projects/my-app"
    }
  ]
}
```

### Git Integration

- **Author tracking**: Uses `git config user.name` and `git config user.email`
- **Auto-commit**: Every annotation is automatically committed
- **Auto-push**: If a remote is configured, changes are pushed automatically
- **Manual sync**: Use the sync command to pull changes from team members

## Commands

| Command | Keyboard Shortcut | Description |
|---------|------------------|-------------|
| `Annotate: Add Annotation` | `Ctrl+Shift+A` / `Cmd+Shift+A` | Create a new annotation at cursor position |
| `Annotate: Toggle Annotations` | `Ctrl+Shift+T` / `Cmd+Shift+T` | Show/hide all annotations |
| `Annotate: Configure Annotation Repository` | - | Set up the git repository path |
| `Annotate: Sync Annotations with Git` | - | Pull latest annotations from remote |

## Configuration

Available settings:

- `vscode-annotate.repositoryPath` - Path to the git repository for storing annotations
- `vscode-annotate.annotationsEnabled` - Enable/disable annotation display (default: true)

## Development

### Building

```bash
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Testing the Extension

1. Open this project in VSCode
2. Press `F5` to launch the Extension Development Host
3. In the new window:
   - Open a project/workspace
   - Configure the annotation repository via Command Palette
   - Try adding annotations to files
   - Test toggling visibility
   - Test syncing with git

## Team Workflow Example

1. **Team Lead**:
   - Creates a shared git repository (e.g., on GitHub)
   - Configures the extension to use this repository
   - Adds initial annotations

2. **Team Members**:
   - Clone the annotation repository
   - Configure the extension to point to their local clone
   - Run "Sync Annotations" to get latest annotations
   - Add their own annotations
   - Changes are automatically pushed (if remote configured)

3. **Ongoing Usage**:
   - Run "Sync Annotations" periodically to get team updates
   - Add annotations during code review or investigation
   - Use toggle to focus on code without distractions when needed

## Troubleshooting

### Annotations not appearing
- Check that annotations are enabled: `vscode-annotate.annotationsEnabled`
- Verify repository is configured correctly
- Run "Sync Annotations" to reload

### Git errors
- Ensure git is installed and configured
- Check that `git config user.name` and `git config user.email` are set
- Verify repository path has proper permissions

### Annotations for wrong files
- Annotations use relative paths from workspace root
- Ensure you're opening the same workspace folder as when annotations were created

## Technical Notes

### VS Code Extension UI Options

This section documents the available approaches for rendering custom UI in VS Code extensions, based on research into the extension API.

#### CodeLens Limitations
CodeLens is a common approach but has significant drawbacks:
- Affects line heights (pushes content down)
- Limited to text-based clickable links
- Minimal styling options
- Runs out-of-process, complicating state management

#### Decorations API (Current Approach)
The **Decorations API** is the most flexible option for inline UI and is what this extension uses:

```typescript
const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' // annotation text',
    color: 'rgba(153, 153, 153, 0.7)',
    fontStyle: 'italic'
  },
  gutterIconPath: '/path/to/icon.svg',
  gutterIconSize: 'contain'
});
```

**Capabilities:**
- Inject content via CSS `::before` and `::after` pseudo-elements
- Add glyph margin icons
- Apply custom colors, backgrounds, borders
- Show hover messages on decorations
- Customize for light/dark themes separately

**Limitations:**
- No arbitrary HTML rendering
- No direct click events on inline content (only gutter icons)
- Limited to CSS-styled elements

#### Hover Provider (Complementary)
For rich contextual information without affecting layout:

```typescript
vscode.languages.registerHoverProvider('*', {
  provideHover(document, position) {
    return new vscode.Hover(['**Bold** and `code`', 'Multi-line content']);
  }
});
```

Shows markdown-rendered tooltips on hover—good for detailed annotation content.

#### WebView Panels
For complex UI requiring full HTML/CSS/JS, but renders in a side panel—not inline in the editor. Useful for:
- Browsing/editing all annotations
- Annotation management UI
- Settings panels

#### What's NOT Available to Extensions
VS Code internally uses Monaco editor widgets (content widgets, overlay widgets, view zones), but **these are NOT exposed to the extension API**. Extensions run sandboxed for security and stability reasons.

#### Reference Extensions
- **GitLens**: Uses decorations for inline blame with hover for details
- **ErrorLens**: Uses decorations + diagnostics API for inline error display

### Recommended Architecture
For annotation display, the optimal approach combines:
1. **Decorations** for inline visual markers (icons, subtle text)
2. **Hover Provider** for detailed annotation content on hover
3. **WebView sidebar** (optional) for browsing/managing all annotations

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
