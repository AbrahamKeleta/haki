"""Build a deterministic Web Store ZIP with runtime files only; no dependencies."""
import hashlib
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
output.mkdir(exist_ok=True)
archive = output / f'haki-{version}.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as package:
    for path in sorted(files):
        info = ZipInfo(path.relative_to(root).as_posix(), (2026, 9, 27, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        package.writestr(info, path.read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / f'haki-{version}.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive.relative_to(root)} — {len(files)} files, {archive.stat().st_size:,} bytes\nSHA-256: {digest}')
downloads = root / 'website' / 'downloads'
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
