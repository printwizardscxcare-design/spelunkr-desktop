'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const repository = process.env.GITHUB_REPOSITORY || 'printwizardscxcare-design/spelunkr-desktop';
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository name');

const pages = JSON.parse(execFileSync('gh', ['api', '--paginate', '--slurp',
  `repos/${repository}/releases?per_page=100`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
const rows = pages.flat().filter(release => !release.draft).flatMap(release =>
  release.assets.filter(asset => /(-Setup\.exe|\.deb|\.rpm|\.dmg|\.pkg\.tar\.(xz|zst))$/.test(asset.name)).map(asset => ({
    release: release.tag_name, installer: asset.name, downloads: asset.download_count,
    url: asset.browser_download_url
  })));
const total = rows.reduce((sum, row) => sum + row.downloads, 0);

console.table(rows.map(({ release, installer, downloads }) => ({ release, installer, downloads })));
console.log(`Total installer downloads: ${total}`);
console.log('Counts represent file downloads, not unique people or installations.');

if (process.env.GITHUB_STEP_SUMMARY) {
  const escape = value => String(value).replace(/[\\|\[\]<>]/g, character => `\\${character}`).replace(/[\r\n]/g, ' ');
  const report = [
    '# Installer downloads', '', `**Total: ${total}**`, '',
    '| Release | Installer | Downloads |', '| --- | --- | ---: |',
    ...rows.map(row => `| ${escape(row.release)} | [${escape(row.installer)}](${encodeURI(row.url)}) | ${row.downloads} |`), '',
    'This is a snapshot from this run. Counts are file downloads, not unique people or completed installations.',
    'Checksums, source archives, and workflow artifacts are excluded. No app telemetry is used.', ''
  ].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}
