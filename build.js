/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — build.js
 *
 *  Script Node.js que concatena core/* + modules/* em um
 *  arquivo bundle único para uso via console ou bookmarklet.
 *
 *  Uso:  node build.js
 *  Saída: painelUnificado.bundle.js
 * ═══════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Ordem de carregamento dos arquivos core (dependências primeiro)
const CORE_FILES = [
  'core/utils.js',
  'core/network.js',
  'core/vrolBridge.js',
  'core/persistence.js',
  'core/dataIO.js',
  'core/ui.js',
];

// Módulos — carregados após o core (ordem não importa)
const MODULES_DIR = path.join(ROOT, 'modules');

// ── Coletar módulos ──
let moduleFiles = [];
if (fs.existsSync(MODULES_DIR)) {
  moduleFiles = fs.readdirSync(MODULES_DIR)
    .filter(f => f.startsWith('mod_') && f.endsWith('.js'))
    .sort()
    .map(f => 'modules/' + f);
}

// ── Concatenar ──
const allFiles = [...CORE_FILES, ...moduleFiles];
const separator = '\n\n// ' + '═'.repeat(60) + '\n';

let bundle = '';
bundle += '/**\n';
bundle += ' * PAINEL UNIFICADO — Bundle Gerado Automaticamente\n';
bundle += ' * Data: ' + new Date().toISOString() + '\n';
bundle += ' * Arquivos: ' + allFiles.length + '\n';
bundle += ' */\n';
bundle += '(function() {\n';
bundle += '"use strict";\n';
bundle += 'if (window.__PAINEL_INIT__) { console.warn("[Painel] Já inicializado."); return; }\n';
bundle += 'window.__PAINEL_INIT__ = true;\n';

for (const file of allFiles) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`AVISO: Arquivo não encontrado — ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  bundle += separator;
  bundle += '// Arquivo: ' + file + '\n';
  bundle += '// ' + '─'.repeat(58) + '\n';
  bundle += content;
  bundle += '\n';
  console.log(`  ✓ ${file} (${content.length} bytes)`);
}

// Inicialização
bundle += separator;
bundle += '// Inicialização\n';
bundle += 'if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {\n';
bundle += '  window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();\n';
bundle += '  console.log("[Painel] Bundle carregado. Botão flutuante injetado.");\n';
bundle += '} else {\n';
bundle += '  console.error("[Painel] Falha na inicialização — core não encontrado.");\n';
bundle += '}\n';
bundle += '\n})();\n';

// ── Escrever ──
const outPath = path.join(ROOT, 'painelUnificado.bundle.js');
fs.writeFileSync(outPath, bundle, 'utf-8');
console.log(`\n✅ Bundle gerado: ${outPath}`);
console.log(`   Tamanho: ${(bundle.length / 1024).toFixed(1)} KB`);
console.log(`   Arquivos: ${allFiles.length}`);

// ── Gerar versão Tampermonkey (inline) ──
const userScriptPath = path.join(ROOT, 'painel.user.js');
if (fs.existsSync(userScriptPath)) {
  let userScript = fs.readFileSync(userScriptPath, 'utf-8');

  // Encontrar o marcador de injeção
  const startMarker = '// BUILD_INJECT_START';
  const endMarker = '// BUILD_INJECT_END';
  const startIdx = userScript.indexOf(startMarker);
  const endIdx = userScript.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    // Preparar conteúdo inline (sem o wrapper IIFE do bundle)
    let inlineContent = '';
    for (const file of allFiles) {
      const filePath = path.join(ROOT, file);
      if (!fs.existsSync(filePath)) continue;
      inlineContent += '\n// ── ' + file + ' ──\n';
      inlineContent += fs.readFileSync(filePath, 'utf-8');
      inlineContent += '\n';
    }

    const before = userScript.substring(0, startIdx);
    const after = userScript.substring(endIdx + endMarker.length);
    const finalUserScript = before + startMarker + '\n' + inlineContent + '\n' + endMarker + after;

    const outUserPath = path.join(ROOT, 'painel.prod.user.js');
    fs.writeFileSync(outUserPath, finalUserScript, 'utf-8');
    console.log(`✅ UserScript produção: ${outUserPath}`);
    console.log(`   Tamanho: ${(finalUserScript.length / 1024).toFixed(1)} KB`);
  }
}
