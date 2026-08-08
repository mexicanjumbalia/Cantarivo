# Main-branch protection checklist

Repository files can add checks and request a CODEOWNER, but GitHub branch-protection settings themselves must be enabled by a repository administrator in GitHub.

Before the next release, protect `main` with:

1. Require a pull request before merging.
2. Require at least one approving review from `@mexicanjumbalia` or the configured CODEOWNER.
3. Dismiss stale approvals when new commits are pushed.
4. Require these checks: `quality`, `secrets`, `dependencies`, and `validate-catalog`.
5. Require branches to be up to date before merging.
6. Block force-pushes and branch deletion on `main`.
7. Enable GitHub secret scanning and push protection if the repository plan supports them.
8. Enable Dependabot alerts and security updates.

The workflows in `.github/workflows/` are intentionally read-only with respect to repository contents. They do not publish credentials, upload microphone data, or write to the repository. The Pages workflow deploys only the generated `public-site/` allowlist.
