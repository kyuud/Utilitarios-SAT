# Changelog — Painel Unificado de Automações

## v1.0.8 — 2026-05-14

### Correções Aplicadas
- Alinha `mod_reportes_fraude.js` ao script legado `consultaReportesFraude.js` nas chamadas SAT.
- Usa `IdSession` da página para montar `sIdWindow`, com fallback para `JSESSIONID`.
- Declara `unsafeWindow` no metadata para acesso consistente às variáveis da página SAT.
- Reinclui campos `Cache_*` esperados pelo POST de `ServletDirector`.
- Ajusta as credenciais das chamadas e do keepalive para `include`.
- Corrige o mapeamento dos campos retornados por `Consulta(...)` no CSV.

---

## v1.0.7 — 2026-05-14

### Painel
- Exibe a versão atual do userscript no cabeçalho do painel.
- Usa a versão informada pelo Tampermonkey quando disponível, com fallback interno para modo dev/manual.

---

## v1.0.6 — 2026-05-14

### Metadados
- Atualiza o `@author` do userscript para `Wallyson Batista`.
- Mantém `painel.prod.user.js` regenerado a partir de `painel.user.js`.

### Versionamento
- Define o uso de tags Git para releases publicadas.

---

## v1.0.5 — 2026-05-14

### Correções Aplicadas
- Corrige o parsing manual do módulo `mod_reportes_fraude.js` para respeitar o formato `NUMEXP,TIPFRAN`.
- Permite separar `NUMEXP` e `TIPFRAN` por vírgula, ponto e vírgula, tab ou `_`.
- Evita que o input manual trate `;` como quebra de item quando o módulo usa esse caractere como separador de campos.
- Altera a chave visual de retomada/log de `NUMEXP_TIPFRAN` para `NUMEXP,TIPFRAN`, evitando confusão com concatenação.

---

## v1.0.4 — 2026-05-14

### Auto-update
- Atualiza a versão do Tampermonkey para `1.0.4`, garantindo detecção de novas publicações pelo `@updateURL`.

---

## v1.0.3 — 2026-05-13

### Ajustes de Painel
- Atualiza nomes e descrições dos módulos no painel.
- Regenera `painel.prod.user.js` e `painelUnificado.bundle.js` com os ajustes de exibição.

### Tooling
- Ajusta a formatação e a indentação automática do `build.py`.

---

## v1.0.2 — 2026-05-11 (Correções de UI no Painel)

### Correções Aplicadas
1. **Input manual inline** — `core/ui.js` substitui o `prompt()` nativo por uma área de texto dentro da tela de execução do painel, com botões `Processar` e `Cancelar`, contagem de itens e atalho `Ctrl+Enter`.
2. **Parsing manual desacoplado** — `core/dataIO.js` adiciona `carregarManualTexto()` para reaproveitar o parser manual sem abrir popups/modais nativos no contexto do SAT.
3. **Confirmação de voltar ao menu no painel** — `core/ui.js` adiciona `confirmarNoPainel()` e passa a usar o `confirm()` da janela do painel ao clicar em `← Menu`.
4. **Confirmação de retomada no painel** — `core/persistence.js` aceita `confirmFn` em `tentarRetomar()`, permitindo que a pergunta de retomada de progresso também seja exibida no painel.
5. **Build atualizado** — `painelUnificado.bundle.js` e `painel.prod.user.js` regenerados via `python build.py`.

---

## v1.0.1 — 2026-05-08 (Auditoria e Correções)

### Correções Aplicadas
1. **DEV_MODE lista completa** — `painel.user.js` agora carrega todos os 10 módulos (antes só 1).
2. **Stats por item** — `core/ui.js` conta ✅/❌ uma vez por item processado, não por registro retornado (antes, módulos multi-registro inflavam contagem).
3. **storageKey único** — `mod_vinculacao_voucher.js` renomeado de `_sat_voucher_v1` para `_painel_vincvoucher_v1` (conflitava com script legacy).
4. **STATUS padronizado** — `mod_reportes_fraude.js` corrigido de `Status` para `STATUS` (casing inconsistente com demais módulos).
5. **Try-catch voltarParaBusca** — `mod_incoming_voucher.js` protege dados já extraídos contra falha na navegação de retorno.
6. **Hook `inicializar`** — `core/ui.js` agora suporta `mod.inicializar()` chamado uma vez antes do loop. Aplicado em `mod_nucaso.js` e `mod_vinculacao_voucher.js` (remove passo1 redundante por item).
7. **Regex escaping** — `core/utils.js` corrigido: `['\""]` → `['\"]` em `extrairCampoHTML` (9 erros de parse eliminados).

---

## v1.0.0 — 2026-05-08

### Infraestrutura Core
- **`core/utils.js`** — Funções utilitárias compartilhadas: `esperar`, `agora`, `formatarData`, `zeroFill`, `timestampSufixo`, `extrairCampoHTML`, `parseSIDATOS`, `extractByXPath`, mapa `CODIGO_PARA_BANDEIRA`.
- **`core/network.js`** — Camada de rede: `post` (SAT urlencoded), `postJSON`/`getJSON` (SIACH REST), detecção de `SESSAO_EXPIRADA`, `keepalive` com timers gerenciados.
- **`core/persistence.js`** — Persistência via localStorage com assinatura de lote para retomada após expiração de sessão.
- **`core/dataIO.js`** — Importação XLSX (SheetJS CDN + fallback), parsing manual, exportação CSV (BOM UTF-8 + separador `;`) e XLSX.
- **`core/ui.js`** — Motor de UI: popup flutuante, menu grid de módulos, dashboard de execução com barra de progresso/ETA/timer, log scrollável, botão flutuante `⚡`, loop de processamento com hook `inicializar`.

### Módulos Migrados
| # | Módulo | Sistema | Script Original |
|---|--------|---------|-----------------|
| 1 | `mod_consulta_redes.js` | SAT 0311 | `injecaoJS_consulta_redes.js` |
| 2 | `mod_nucaso.js` | SAT 0209 | `sat_consulta_nucaso.js` |
| 3 | `mod_vinculacao_voucher.js` | SAT 0209 | `sat_consulta_vinculacaovoucher.js` |
| 4 | `mod_detalhe_direto.js` | SAT Ajax | `sat_detalhe_direto.js` |
| 5 | `mod_compra_segura.js` | SAT Ajax | `extratorCompraSegura.js` |
| 6 | `mod_reportes_fraude.js` | SAT 0181 | `consultaReportesFraude.js` |
| 7 | `mod_consulta_completa.js` | SAT 0209 | `sat_consulta_completa.js` |
| 8 | `mod_incoming_voucher.js` | SAT 0311→0884 | `mensagem_incoming_voucher_por_ARN.js` |
| 9 | `mod_sat_vrol.js` | SAT+VROL | `sat_vrol_consulta.js` |
| 10 | `mod_siach_ocorrencias.js` | SIACH REST | `extratorOcorrenciasSIACH.js` |

### Tooling
- **`build.py`** — Script Python para concatenar core + modules e gerar bundle + userscript de produção.
- **`serve.py`** — Servidor HTTP local com CORS para desenvolvimento.
- **`painel.user.js`** — Entry point Tampermonkey com suporte a DEV_MODE.

### Decisões de Design
- Módulo de **exclusão de reportes** excluído intencionalmente (apenas uso excepcional).
- Execução sequencial obrigatória (sessão JSESSIONID compartilhada).
- Cada módulo é auto-contido: registra-se via `PAINEL.registrarModulo()`.
