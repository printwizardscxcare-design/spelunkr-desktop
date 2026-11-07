# Checking installer downloads

GitHub keeps a download count for each file attached to a release. We can total the Windows and Linux installers without putting tracking in the app.

## From the GitHub website

1. Open [Installer download counts](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/workflows/download-counts.yml).
2. Choose **Run workflow**, leave the branch on **main**, and run it.
3. Open the finished run. Its **Summary** shows each installer and the total across releases.

The report is a snapshot when you run it. Run it again for fresh counts. It needs repository access while this project is private.

## From your computer

If you have Node.js and the [GitHub CLI](https://cli.github.com/) installed, sign in with `gh auth login`, open this repository's folder, and run:

```powershell
node scripts/download-counts.cjs
```

To inspect all files in the current release:

```powershell
gh release view v0.5.0 --repo printwizardscxcare-design/spelunkr-desktop --json assets --jq '.assets[] | {name, downloadCount}'
```

## What the count means

These are **file downloads**, not unique people, successful installations, or active users. One person can download more than once. The report counts installer `.exe`, `.deb`, `.rpm`, and Arch `.pkg.tar.xz` / `.pkg.tar.zst` files; it excludes checksums, source ZIPs, and workflow artifacts. It doesn't identify who downloaded a file.

The counts come from GitHub's [`download_count` release-asset field](https://docs.github.com/en/rest/releases/assets#get-a-release-asset). No app telemetry or third-party counter is involved.
