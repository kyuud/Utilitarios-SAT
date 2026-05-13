#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
 PAINEL UNIFICADO — build.py

 Concatena core/* + modules/* em um bundle único.
 Gera também a versão Tampermonkey com código inline.

 Uso:  python build.py
 Saída: painelUnificado.bundle.js
        painel.prod.user.js
═══════════════════════════════════════════════════════════
"""

import os
import sys
import io
from datetime import datetime

# Fix console encoding on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.abspath(__file__))

# Ordem de carregamento dos arquivos core (dependências primeiro)
CORE_FILES = [
    'core/utils.js',
    'core/network.js',
    'core/vrolBridge.js',
    'core/persistence.js',
    'core/dataIO.js',
    'core/ui.js',
]

# Coletar módulos
modules_dir = os.path.join(ROOT, 'modules')
module_files = []
if os.path.isdir(modules_dir):
    module_files = sorted([
        'modules/' + f
        for f in os.listdir(modules_dir)
        if f.startswith('mod_') and f.endswith('.js')
    ])

all_files = CORE_FILES + module_files
separator = '\n\n// ' + '═' * 60 + '\n'

# ── Montar bundle ──
bundle_parts = []
bundle_parts.append(f"""/**
 * PAINEL UNIFICADO — Bundle Gerado Automaticamente
 * Data: {datetime.now().isoformat()}
 * Arquivos: {len(all_files)}
 */
(function() {{
"use strict";
if (window.__PAINEL_INIT__) {{ console.warn("[Painel] Já inicializado."); return; }}
window.__PAINEL_INIT__ = true;
""")

for file in all_files:
    file_path = os.path.join(ROOT, file.replace('/', os.sep))
    if not os.path.isfile(file_path):
        print(f'  ⚠ AVISO: Arquivo não encontrado — {file}')
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    bundle_parts.append(separator)
    bundle_parts.append(f'// Arquivo: {file}\n')
    bundle_parts.append('// ' + '─' * 58 + '\n')
    bundle_parts.append(content)
    bundle_parts.append('\n')
    print(f'  ✓ {file} ({len(content)} bytes)')

# Inicialização
bundle_parts.append(separator)
bundle_parts.append("""// Inicialização
if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {
  window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();
  console.log("[Painel] Bundle carregado. Botão flutuante injetado.");
} else {
  console.error("[Painel] Falha na inicialização — core não encontrado.");
}

})();
""")

bundle = ''.join(bundle_parts)

# ── Escrever bundle ──
out_path = os.path.join(ROOT, 'painelUnificado.bundle.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(bundle)

print(f'\n✅ Bundle gerado: {out_path}')
print(f'   Tamanho: {len(bundle) / 1024:.1f} KB')
print(f'   Arquivos: {len(all_files)}')

# ── Gerar versão Tampermonkey (inline) ──
user_script_path = os.path.join(ROOT, 'painel.user.js')
if os.path.isfile(user_script_path):
    with open(user_script_path, 'r', encoding='utf-8') as f:
        user_script = f.read()

    start_marker = '// BUILD_INJECT_START'
    end_marker = '// BUILD_INJECT_END'
    start_idx = user_script.find(start_marker)
    end_idx = user_script.find(end_marker)

    if start_idx != -1 and end_idx != -1:
        inline_parts = []
        for file in all_files:
            file_path = os.path.join(ROOT, file.replace('/', os.sep))
            if not os.path.isfile(file_path):
                continue
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Indentar o conteúdo para alinhar com o (function() { do painel.user.js
            indented_content = '\\n'.join('  ' + line if line.strip() else line for line in content.split('\\n'))
            
            inline_parts.append(f'\\n  // ── {file} ──\\n')
            inline_parts.append(indented_content)
            inline_parts.append('\\n')

        inline_content = ''.join(inline_parts)
        before = user_script[:start_idx]
        after = user_script[end_idx + len(end_marker):]
        final_user_script = before + start_marker + '\n' + inline_content + '\n' + end_marker + after

        out_user_path = os.path.join(ROOT, 'painel.prod.user.js')
        with open(out_user_path, 'w', encoding='utf-8') as f:
            f.write(final_user_script)

        print(f'✅ UserScript produção: {out_user_path}')
        print(f'   Tamanho: {len(final_user_script) / 1024:.1f} KB')

print('\nConcluído!')
