"""Cria pacote determinístico sem dependências de desenvolvimento."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent
version = json.loads((root / 'manifest.json').read_text())['version']
dest = Path(sys.argv[1]) if len(sys.argv) > 1 else root / f'lotomasteria-extensao-v{version}.zip'
files = ['manifest.json', 'background.js', 'core.js', 'content.js', 'importador.html', 'importador.css', 'importador.js', 'LEIA-ME.html']
dest.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(dest, 'w', compression=ZIP_DEFLATED) as z:
    for name in files:
        info = ZipInfo(f'lotomasteria-extensao/{name}', date_time=(2026, 11, 17, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, (root / name).read_bytes())
print(dest.resolve())
