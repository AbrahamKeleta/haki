"""Build a deterministic Web Store ZIP with runtime files only; no dependencies."""
import argparse
import hashlib
from io import BytesIO
import json
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
version = manifest['version']
files = [root / 'manifest.json', root / 'PRIVACY.md']
for folder in ['background', 'content', 'popup', 'onboarding', 'options', 'newtab', 'shared', 'assets', 'privacy']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and not p.name.startswith('.'))
output = root / 'dist'
archive = output / f'haki-{version}.zip'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='Verify the published ZIP matches the runtime source without writing files')
args = parser.parse_args()
archive_bytes = BytesIO()
with ZipFile(archive_bytes, 'w', ZIP_DEFLATED, compresslevel=9) as package:
    for path in sorted(files):
        info = ZipInfo(path.relative_to(root).as_posix(), (2026, 9, 27, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        package.writestr(info, path.read_bytes())
payload = archive_bytes.getvalue()
downloads = root / 'website' / 'downloads'
if args.check:
    published = downloads / archive.name
    if not published.is_file() or published.read_bytes() != payload:
        raise SystemExit('Website extension ZIP is missing or stale. Run npm run package and commit website/downloads/.')
    print(f'{published.relative_to(root)} matches the current runtime source.')
    raise SystemExit(0)
output.mkdir(exist_ok=True)
archive.write_bytes(payload)
digest = hashlib.sha256(payload).hexdigest()
(output / f'haki-{version}.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive.relative_to(root)} — {len(files)} files, {archive.stat().st_size:,} bytes\nSHA-256: {digest}')
downloads.mkdir(exist_ok=True)
shutil.copyfile(archive, downloads / archive.name)
site_archive = output / 'hakitrade-site.zip'
with ZipFile(site_archive, 'w', ZIP_DEFLATED, compresslevel=9) as package:
    for path in sorted((root / 'website').rglob('*')):
        if not path.is_file() or path.name.startswith('.') or path.name == 'README.md':
            continue
        info = ZipInfo(path.relative_to(root / 'website').as_posix(), (2026, 9, 27, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        package.writestr(info, path.read_bytes())
print(f'{site_archive.relative_to(root)} — deployable hakitrade.com website, including extension download')
