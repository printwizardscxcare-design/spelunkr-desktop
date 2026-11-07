# Checking download counts

GitHub counts downloads for each file attached to a release. The report adds up the Windows, Mac, and Linux installers without tracking anything inside the app.

## Run the report on GitHub

1. Open [Installer download counts](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/workflows/download-counts.yml).
2. Choose **Run workflow**, leave the branch on **main**, and start it.
3. Open the finished run. Its **Summary** lists each installer and the total.

The report shows the counts at the time it runs. Anyone can read a finished report; starting a new one requires permission to run workflows in this repository.

## Run it locally

With Node.js and the [GitHub CLI](https://cli.github.com/) installed, sign in with `gh auth login`, open the repository folder, and run:

```sh
node scripts/download-counts.cjs
```

To inspect every asset in the current release, including ZIP alternatives and checksum files:

```sh
gh release view v0.6.0 --repo printwizardscxcare-design/spelunkr-desktop --json assets
```

## Reading the numbers

These are **file downloads**, not unique people, completed installations, or active users. One person can download several files or download the same installer more than once.

The total includes `.exe`, `.dmg`, `.deb`, `.rpm`, and Arch `.pkg.tar.xz` or `.pkg.tar.zst` installers from published releases, including previews. It excludes drafts, Mac ZIP alternatives, checksums, source archives, and workflow artifacts.

The report uses GitHub's [`download_count` field](https://docs.github.com/en/rest/releases/assets#get-a-release-asset). It doesn't identify downloaders, and the app doesn't send usage data back to the repository.

[Back to the project](../README.md)
