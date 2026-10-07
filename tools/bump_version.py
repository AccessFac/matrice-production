#!/usr/bin/env python3
"""Force les navigateurs à recharger tous les fichiers après une modification.

Met à jour, dans index.html, le numéro de version (?v=...) de la feuille de style,
du script principal et de chaque module JavaScript (via un « import map »).
À lancer avant chaque commit :  python3 tools/bump_version.py
"""
import pathlib, re, time

root = pathlib.Path(__file__).resolve().parent.parent
index = root / "index.html"
v = time.strftime("%Y%m%d%H%M%S")
mods = sorted(p.relative_to(root).as_posix() for p in (root / "js").rglob("*.js"))
imap = "\n".join(f'      "./{m}": "./{m}?v={v}"' + ("," if i < len(mods) - 1 else "") for i, m in enumerate(mods))
block = f'''<!-- import-map:début (généré par tools/bump_version.py) -->
  <script type="importmap">
  {{
    "imports": {{
{imap}
    }}
  }}
  </script>
  <!-- import-map:fin -->'''

s = index.read_text(encoding="utf-8")
if "import-map:début" in s:
    s = re.sub(r"<!-- import-map:début.*?import-map:fin -->", block, s, flags=re.S)
else:
    s = s.replace('  <script type="module"', "  " + block + '\n  <script type="module"', 1)
s = re.sub(r'(css/styles\.css|js/app\.js)\?v=[\w-]+', lambda m: f"{m.group(1)}?v={v}", s)
index.write_text(s, encoding="utf-8")
print("version", v, "-", len(mods), "modules")
