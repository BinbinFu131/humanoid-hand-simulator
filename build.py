#!/usr/bin/env python3
"""Inline CSS + JS into standalone HTML files for easy sharing
(open directly on a phone — no server, no files).

Emits:
  HandSimulator.html     — defaults to Deutsch (toggle to 中文)
  HandSimulator.zh.html  — defaults to 中文 (toggle to Deutsch)
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent
base = (root / 'index.html').read_text()

css = (root / 'css/style.css').read_text()
base = base.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')

for name in ['i18n', 'kinematics', 'hand', 'renderer', 'main']:
    js = (root / f'js/{name}.js').read_text()
    base = base.replace(f'<script src="js/{name}.js"></script>', '<script>\n' + js + '\n</script>')

# German (default)
de = root / 'HandSimulator.html'
de.write_text(base)
print(f'wrote {de} ({len(base)} bytes)')

# Chinese mirror: force the default language before any script runs
zh_html = base.replace('<body>', '<body>\n<script>window.__FORCE_LANG__="zh";</script>', 1)
zh = root / 'HandSimulator.zh.html'
zh.write_text(zh_html)
print(f'wrote {zh} ({len(zh_html)} bytes)')
