# VSCode Annotation Extensions Comparison

## Key Competitors

| Extension | Installs | External Storage | Auto Git Sync | Multi-Project |
|-----------|----------|------------------|---------------|---------------|
| Code Annotation | ~10K | `.vscode/` | No | No |
| weAudit | ~7.5K | `.vscode/` | No | No |
| Out-of-Code Insights | ~645 | `.out-of-code-insights/` | No | No |
| **This Project** | — | Separate git repo | Yes | Yes |

## Trade-off Summary

**Out-of-Code Insights** offers the richest feature set (AI integration, threaded replies, cross-file linking, Kanban view) but stores annotations per-project and requires manual git commits.

**This project** prioritizes frictionless team collaboration through a dedicated annotation repository with automatic sync — fewer features, but zero-config sharing across multiple codebases.

### Choose Out-of-Code Insights if:
- You want AI-powered annotation suggestions
- You need threaded discussions or cross-file linking
- Annotations are project-specific

### Choose This Project if:
- You want automatic team sync without manual commits
- You annotate across multiple repositories
- You prefer annotations fully separate from project files
