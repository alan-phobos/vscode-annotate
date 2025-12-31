# Quick Start Guide

## Try the Extension Now

1. **Press F5** in VSCode to launch the Extension Development Host

2. **In the new window**, open a workspace or folder

3. **Configure the annotation repository**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: `Annotate: Configure Annotation Repository`
   - Enter a path like: `~/code-annotations`

4. **Add your first annotation**:
   - Open any file in your workspace
   - Place your cursor where you want to add a note
   - Right-click and select "Add Annotation"
   - Type your annotation text and press Enter

5. **See your annotation appear** inline next to the code!

6. **Toggle annotations on/off**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
   - Run: `Annotate: Toggle Annotations`

## Team Sharing Setup

To share annotations with your team:

```bash
# Navigate to your annotation repository
cd ~/code-annotations

# Add a remote repository
git remote add origin https://github.com/your-team/annotations.git

# Push your annotations
git push -u origin main
```

Team members can then:
1. Clone the annotation repository
2. Configure their extension to point to the cloned path
3. Run "Sync Annotations" to pull changes

## Key Commands

- **Add Annotation**: `Ctrl+Shift+A` / `Cmd+Shift+A` (or right-click → "Add Annotation")
- **Toggle Annotations**: `Ctrl+Shift+T` / `Cmd+Shift+T`
- **Configure Repository**: Command Palette → "Annotate: Configure Annotation Repository"
- **Sync with Team**: Command Palette → "Annotate: Sync Annotations with Git"

## What Happens Behind the Scenes

1. Annotations are stored in a separate git repository
2. Each project gets its own subdirectory based on the workspace path
3. Your git username is automatically captured
4. Every annotation is auto-committed to the repository
5. If you've configured a remote, changes are auto-pushed

## Next Steps

- Check out the full [README.md](README.md) for detailed documentation
- Run tests with: `npm test`
- Package the extension with: `vsce package`
