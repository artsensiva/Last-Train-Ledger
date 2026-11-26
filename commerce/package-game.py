"""Package only the offline game; never include server files, secrets or orders."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
release = root / 'release'
release.mkdir(exist_ok=True)
with ZipFile(release / 'last-train-ledger.zip', 'w', ZIP_DEFLATED) as archive:
    for name in ('index.html', 'style.css', 'engine.js', 'app.js'):
        archive.write(root / 'dist' / name, name)
print('Packaged release/last-train-ledger.zip')
