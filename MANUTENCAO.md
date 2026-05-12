# Guia de Manutenção — Painel Unificado

## Estrutura do Projeto

```
PainelUnificado/
├── core/                       ← NÃO editar sem entender as dependências
│   ├── utils.js                ← Funções puras, sem side-effects
│   ├── network.js              ← Fetch wrappers + keepalive
│   ├── persistence.js          ← localStorage (retomada de sessão)
│   ├── dataIO.js               ← SheetJS + import/export
│   └── ui.js                   ← Motor do painel (popup, loop, menu)
├── modules/                    ← Um arquivo por ferramenta
│   ├── mod_consulta_redes.js
│   ├── mod_nucaso.js
│   ├── mod_vinculacao_voucher.js
│   ├── mod_detalhe_direto.js
│   ├── mod_compra_segura.js
│   ├── mod_reportes_fraude.js
│   ├── mod_consulta_completa.js
│   ├── mod_incoming_voucher.js
│   ├── mod_sat_vrol.js
│   └── mod_siach_ocorrencias.js
├── painel.user.js              ← Entry point Tampermonkey (dev/prod)
├── painel.prod.user.js         ← GERADO — NÃO editar manualmente
├── painelUnificado.bundle.js   ← GERADO — NÃO editar manualmente
├── build.py                    ← Gerador de bundle (Python)
├── serve.py                    ← Servidor dev local
└── CHANGELOG.md
```

> **Regra de ouro:** Nunca edite `painel.prod.user.js` ou `painelUnificado.bundle.js`. Eles são sobrescritos pelo `build.py`.

---

## Como Adicionar um Novo Módulo

### 1. Criar o arquivo

Crie `modules/mod_nome_do_modulo.js` seguindo este template:

```javascript
(function (PAINEL) {
  'use strict';

  var CSV_COLS = ['CAMPO1', 'CAMPO2', 'STATUS'];

  PAINEL.registrarModulo({
    // ── Identidade ──
    id: 'nome_unico',                              // Sem espaços, lowercase
    nome: 'Nome Legível no Menu',
    icone: '📋',                                    // Emoji
    cor: 'linear-gradient(90deg,#cor1,#cor2)',       // Gradiente da barra
    descricao: 'Breve descrição da funcionalidade',
    sistema: 'SAT',                                 // SAT | SIACH | SAT+VROL

    // ── Persistência ──
    storageKey: '_painel_nome_unico_v1',            // Único no localStorage
    intervaloMS: 300,                                // Pausa entre itens (ms)

    // ── Exportação ──
    csvCols: CSV_COLS,
    exportFormat: 'csv',                             // 'csv' ou 'xlsx'
    // Se xlsx, adicionar:
    // xlsxHeaders: ['Cabeçalho 1', 'Cabeçalho 2', 'Status'],
    // gerarResumo: function(resultados, stats) { return [['Resumo'], ...]; },

    // ── Input ──
    inputConfig: {
      instrucao: 'XLSX: col A = identificador',
      promptManual: 'Cole os itens (um por linha):',
      parseRow: function (row) {
        var v = String(row[0] || '').trim();
        return v || null;
      },
      parseManual: function (line) {
        return line.trim() || null;
      },
      toStr: function (item) { return item; },
    },

    // ── Keepalive (null se não precisar) ──
    keepaliveConfig: {
      url: '/sat/servlet/ServletAjax',
      body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO',
    },

    // ── Inicialização (opcional, roda 1x antes do loop) ──
    // inicializar: async function (core) { ... },

    // ── Processamento (obrigatório) ──
    processarUm: async function (item, core) {
      // core.network  → post(), postJSON(), getJSON(), getSessionId()
      // core.utils    → esperar(), parseSIDATOS(), extrairCampoHTML(), etc.
      // core.dataIO   → getXLSX()
      // core.addLog   → addLog('texto')
      // core.doc      → document do popup

      // Retornar objeto com campos de CSV_COLS
      // OU array de objetos (para múltiplos registros por item)
      return { CAMPO1: 'valor', CAMPO2: 'valor', STATUS: 'OK' };
    },

    // ── Log customizado (opcional) ──
    logItem: function (prefixo, item, regs, addLog) {
      addLog(prefixo + ' OK | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
```

### 2. Registrar no DEV_MODE

Edite `painel.user.js` e adicione na lista `scripts`:

```javascript
'/modules/mod_nome_do_modulo.js',
```

### 3. Gerar o build

```bash
python build.py
```

O build detecta automaticamente todos os `mod_*.js` em `modules/`.

---

## Contrato da API `processarUm`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `item` | `any` | Valor retornado pelo `parseRow` / `parseManual` |
| `core.network` | `Object` | Métodos: `post(url, params)`, `postInclude(url, params, contentType)`, `postJSON(url, body)`, `getJSON(url)`, `getSessionId()` |
| `core.utils` | `Object` | Métodos: `esperar(ms)`, `parseSIDATOS(str)`, `extrairCampoHTML(html, field)`, `extractByXPath(doc, xpath)`, `formatarData(str)`, `zeroFill(val, len)`, `agora()`, `timestampSufixo()` |
| `core.addLog` | `Function` | Escreve uma linha no log do painel |
| `core.doc` | `Document` | Referência ao document do popup |

**Retorno:**
- Objeto com as chaves de `csvCols` → 1 registro
- Array de objetos → N registros (módulos como consulta_redes, reportes_fraude)
- Campo `STATUS` deve ser `'OK'` para sucesso ou mensagem de erro

**Exceções:**
- `throw new Error('SESSAO_EXPIRADA')` → salva progresso e para
- Qualquer outra exceção → registra como erro e continua

---

## Fluxo de Execução (core/ui.js)

```
Usuário clica no módulo
  → mostrarExec()
  → Usuário clica "Carregar XLSX" ou "Manual"
    → carregarSheetJS() + carregarXlsx() ou carregarManual()
    → executarLote(lista)
      → iniciarKeepalive() (se configurado)
      → mod.inicializar(core) (se definido, 1x)
      → tentarRetomar() (verifica localStorage)
      → LOOP: para cada item
        → mod.processarUm(item, core)
        → salvarProgresso() (a cada item)
        → updateOverlay() (barra + stats + timer)
        → esperar(intervaloMS)
      → FIM: exportar CSV/XLSX + limparProgresso()
```

---

## Regras Importantes

### Campo STATUS
Todos os módulos devem incluir `'STATUS'` (maiúsculo) em `csvCols`. O core usa esse campo para contar ✅/❌. Se o campo não existir ou for `'OK'`, conta como sucesso.

### storageKey único
Cada módulo deve ter um `storageKey` diferente. Se dois módulos compartilharem a mesma chave, a retomada de sessão pode carregar dados do módulo errado.

### Sessão SAT compartilhada
A sessão JSESSIONID é compartilhada. **Nunca** execute dois módulos SAT em paralelo no mesmo navegador. O painel já previne isso por design (loop sequencial).

### Lotes (tamLote / pausaLoteMS)
Para módulos que processam muitos itens rapidamente (como reportes_fraude), defina `tamLote` e `pausaLoteMS` para evitar sobrecarregar o servidor.

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Popup não abre | Bloqueador de popups | Permitir popups para `cartoes.extracaixa` |
| "SESSÃO EXPIRADA" imediato | Cookie JSESSIONID ausente | Fazer login no SAT e recarregar |
| Módulo não aparece no menu | Não registrado no build | Verificar `modules/mod_*.js` e rodar `python build.py` |
| CSV com dados em branco | Campo fora do `csvCols` | Conferir nomes exatos dos campos retornados |
| Retomada carrega dados errados | `storageKey` duplicado | Usar chaves únicas por módulo |
| VROL retorna "NAO LOGADO" | Sessão VROL expirada | Login em `vrol.visaonline.com` na mesma janela |
| VROL retorna "NAO LOGADO" mesmo logado | CORS/cookie de terceiro bloqueado e ponte VROL inativa | Recarregar uma aba do VROL com o userscript atualizado e manter essa aba aberta |
