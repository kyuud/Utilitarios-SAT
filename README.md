# 🎯 Painel de Automações CEF — Utilitários SAT

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Userscript-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-blue)
![Version](https://img.shields.io/badge/Versão-v1.0.13-brightgreen)
![Sistemas](https://img.shields.io/badge/Sistemas-SAT%20|%20SIACH%20|%20VROL-orange)

O **Painel de Automações CEF (Utilitários SAT)** é um *userscript* modular desenvolvido para **agilizar, padronizar e automatizar consultas e extrações de dados em lote** nos sistemas de cartões e atendimento da CAIXA, incluindo o **SAT** (Oracle Forms / Servlets JServ), **SIACH** (API REST) e **VROL** (Visa Online).

O projeto consolida **10 módulos especializados** em uma interface gráfica flutuante moderna (injetável via **Tampermonkey** ou diretamente pelo **Console do Navegador**), eliminando processos manuais repetitivos, reduzindo tempo de atendimento e gerando relatórios estruturados em **CSV** e **XLSX**.

---

## ⚡ Principais Recursos

- **Interface Flutuante (GUI)**: Acesso rápido através do botão flutuante **⚡** no canto inferior direito de qualquer tela dos sistemas suportados.
- **Entrada Flexível de Dados**:
  - **Planilhas Excel (`.xlsx` / `.xls`)**: Processamento de lotes volumosos com detecção automática de colunas.
  - **Modo Manual Inline**: Inserção rápida de itens diretamente na interface do painel (sem modais bloqueantes nativos).
- **Dashboard de Execução em Tempo Real**:
  - Barra de progresso com porcentagem dinâmica.
  - Contadores de sucesso (✅) e falhas/não localizados (❌).
  - Cronômetro decorrido e cálculo de tempo estimado restante (**ETA**).
  - Console de logs detalhado por item processado.
- **Resiliência e Retomada Automática**:
  - Estado salvo continuamente no `localStorage`.
  - Tratamento inteligente de sessão expirada: faça novo login e o painel perguntará se deseja **retomar de onde parou**.
  - Botão **■ Parar** para interrupção segura do lote sem perder o que já foi extraído.
- **Exportação Otimizada**:
  - **Download de CSV parcial**: Baixe os registros coletados a qualquer momento durante a execução.
  - **CSV Formatado**: Padrão brasileiro com delimitador `;` e codificação UTF-8 com BOM (compatível com abertura direta no Microsoft Excel).
  - **Planilhas XLSX Multissessão**: Relatórios com múltiplas abas e resumos estatísticos automáticos (ex: SIACH).
- **Ponte Cross-Origin (VROL Bridge)**:
  - Comunicação assíncrona entre as abas do SAT e do Visa Online via storage do Tampermonkey (`GM_setValue`), superando bloqueios de CORS e cookies de terceiros para cruzar disputas e chargebacks.

---

## 🧩 Módulos Disponíveis

O painel conta com 10 módulos distribuídos conforme o sistema de origem:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAINEL DE AUTOMAÇÕES                               │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ SAT (Menu 0311/0884) │ SAT (Menu 0209)      │ SAT (Ajax) / Outros           │
│ • Consulta Redes     │ • NUCASO             │ • Detalhe Direto              │
│ • Incoming Voucher   │ • Vinculação Voucher │ • Compra Segura               │
│                      │ • Consulta Completa  │ • Reportes Fraude (0181)      │
│                      │                      │ • SAT + VROL (Cross-System)   │
│                      │                      │ • SIACH Ocorrências (REST)    │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

### 1. 🌐 Consulta Histórico de Redes
- **Arquivo**: [`modules/mod_consulta_redes.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_consulta_redes.js)
- **Sistema**: SAT (Menu `0311`)
- **Entrada**: Coluna A = `ARN`, Coluna B = `TIPFRAN` (Bandeira: `1`=Visa, `2`=Master, `7`=Elo).
- **Saída**: Arquivo CSV contendo o histórico detalhado da transação de rede correspondente ao ARN.

### 2. 🎟️ Vinculação Voucher - Extrator (Incoming Voucher)
- **Arquivo**: [`modules/mod_incoming_voucher.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_incoming_voucher.js)
- **Sistema**: SAT (Menu `0311` ➔ Menu `0884`)
- **Entrada**: Coluna A = `ARN`, Coluna B = `TIPFRAN` (padrão `2`).
- **Saída**: Arquivo CSV com `ARN_ORIGINAL`, `BANDEIRA`, `ARN_VOUCHER`, `VALOR_VOUCHER_RAW` e `VALOR_VOUCHER_NORMALIZADO`.

### 3. 🏷️ Extrator NUCASO (Número de Caso de Bandeira)
- **Arquivo**: [`modules/mod_nucaso.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_nucaso.js)
- **Sistema**: SAT (Menu `0209`)
- **Entrada**: Coluna A = `NUMEXP` (Número do Expediente/Processo).
- **Saída**: Arquivo CSV com `NUMEXP`, `NUCASO` e indicador `TEM_CASO` (`SIM` / `NAO`).

### 4. 🔗 Pesquisa de Vinculação Voucher
- **Arquivo**: [`modules/mod_vinculacao_voucher.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_vinculacao_voucher.js)
- **Sistema**: SAT (Menu `0209`)
- **Entrada**: Coluna A = `NUMEXP`.
- **Saída**: Arquivo CSV com `NUMEXP`, `VINCVOUCHER` (`SIM` / `NAO`) e status da pesquisa.

### 5. 📊 Extrator de Informações de Ocorrências (Consulta Completa)
- **Arquivo**: [`modules/mod_consulta_completa.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_consulta_completa.js)
- **Sistema**: SAT (Menu `0209`)
- **Entrada**: Coluna A = `NUMEXP`.
- **Saída**: Relatório completo em CSV com **62 colunas rotuladas em Português**, incluindo dados cadastrais, financeiros, bandeira, solução, datas, contrato, agência e bloqueios de cartão/conta.

### 6. 🔎 Consulta Solução de Ocorrência (Detalhe Direto)
- **Arquivo**: [`modules/mod_detalhe_direto.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_detalhe_direto.js)
- **Sistema**: SAT (Ajax Direto — `pesquisaDeOcorrencias` + `getMessageIncoming`)
- **Entrada**: Coluna A = `NUMINC` (Número da Ocorrência).
- **Saída**: Arquivo CSV com `NUMINC`, `CODSOLINC`, `INDSITEXP`, `TIPFRAN`, `BANDEIRA`, `SECOPE`, `MODO_ENTRADA`, `MODO_SEGURANCA` e `SEGURO`.

### 7. 🛡️ Extrator Modo de Entrada / Segurança (Compra Segura)
- **Arquivo**: [`modules/mod_compra_segura.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_compra_segura.js)
- **Sistema**: SAT (Ajax Direto)
- **Entrada**: Coluna A = `NUMINC`, Coluna B = `PROTOCOLO` (opcional).
- **Saída**: Arquivo CSV auditando se a transação do protocolo foi realizada em ambiente seguro (`Compra Segura`, `Compra Não Segura` ou `Sem SECOPE`).

### 8. 🚨 Consulta Reportes de Fraude
- **Arquivo**: [`modules/mod_reportes_fraude.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_reportes_fraude.js)
- **Sistema**: SAT (Menu `0181`)
- **Entrada**: Coluna A = `NUMEXP`, Coluna B = `TIPFRAN` (padrão `1` - Visa).
- **Saída**: Arquivo CSV com todos os reportes de fraude cadastrados para os expedientes (suporte a lotes configurados de 120 itens).

### 9. 🌐 SAT + VROL Consulta (Cross-System)
- **Arquivo**: [`modules/mod_sat_vrol.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_sat_vrol.js)
- **Sistema**: SAT + Visa Online (VROL)
- **Entrada**: Coluna A = `NUMEXP`.
- **Saída**: Arquivo CSV consolidando dados do SAT cruzados com consultas JSON VCR e status de disputas e chargebacks obtidos no VROL via ponte anti-CORS.

### 10. 📂 Extrator SIACH Ocorrências Completo
- **Arquivo**: [`modules/mod_siach_ocorrencias.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_siach_ocorrencias.js)
- **Sistema**: SIACH (API REST)
- **Entrada**: Coluna A = `Protocolo` (com dígito).
- **Saída**: Planilha Excel (`.xlsx`) com **23 campos completos** por ocorrência (view detalhada, motivo, titular, relato de desacordo, observação completa) e aba dedicada de **Resumo**.

---

## 📋 Tabela Resumo dos Módulos

| # | Módulo | Sistema | Entrada Principal | Saída | Formato |
|---|--------|---------|-------------------|-------|---------|
| 1 | **Consulta Histórico de Redes** | SAT (0311) | `ARN` + `TIPFRAN` | Histórico da rede | CSV |
| 2 | **Incoming Voucher** | SAT (0311➔0884) | `ARN` + `TIPFRAN` | ARN e Valor do Voucher | CSV |
| 3 | **Extrator NUCASO** | SAT (0209) | `NUMEXP` | NUCASO + `TEM_CASO` | CSV |
| 4 | **Vinculação Voucher** | SAT (0209) | `NUMEXP` | Indicador `VINCVOUCHER` | CSV |
| 5 | **Consulta Completa** | SAT (0209) | `NUMEXP` | 62 campos em Português | CSV |
| 6 | **Detalhe Direto** | SAT (Ajax) | `NUMINC` | Solução + Segurança | CSV |
| 7 | **Compra Segura** | SAT (Ajax) | `NUMINC` + `Protocolo` | Classificação de Segurança | CSV |
| 8 | **Reportes de Fraude** | SAT (0181) | `NUMEXP` + `TIPFRAN` | Fraudes cadastradas | CSV |
| 9 | **SAT + VROL Consulta** | SAT + VROL | `NUMEXP` | Dados SAT + VROL Chargebacks | CSV |
| 10 | **SIACH Ocorrências** | SIACH (REST) | `Protocolo` | 23 campos + Resumo | XLSX |

---

## 💳 Tabela de Bandeiras (`TIPFRAN`)

| Código (`TIPFRAN`) | Bandeira |
|:------------------:|----------|
| `1` | VISA |
| `2` | MASTERCARD |
| `7` | ELO |
| `14` | ELO INTERNACIONAL |

---

## 🚀 Instalação e Uso

### Pré-requisitos
1. **Navegador**: Google Chrome ou Microsoft Edge.
2. **Extensão Tampermonkey**: Instalada e ativa no navegador ([Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)).
3. **Logins Ativos**:
   - Login no SAT (`https://cartoes.extracaixa/*`).
   - Login no SIACH (para o módulo de ocorrências).
   - Login no VROL (`https://vrol.visaonline.com/*`) se for utilizar o módulo `SAT + VROL`.

---

### Modos de Instalação

#### Opção 1: Instalação no Tampermonkey (Recomendado)
1. Abra o Tampermonkey no navegador e clique em **Criar novo script** (ou ícone `+`).
2. Apague todo o conteúdo modelo exibido no editor.
3. Abra o arquivo [`painel_prod.user.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/painel_prod.user.js), copie **todo** o conteúdo e cole no Tampermonkey.
4. Salve com **Ctrl + S**.
5. Acesse o SAT ou SIACH e recarregue a página (`F5`). O botão flutuante **⚡** estará disponível no canto inferior direito.

#### Opção 2: Execução Temporária via Console DevTools (Sem Tampermonkey)
1. Abra o arquivo [`painel_unificado.bundle.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/painel_unificado.bundle.js) e copie todo o seu conteúdo.
2. Na página do SAT, pressione **F12** (ou clique com botão direito ➔ *Inspecionar*) e vá para a aba **Console**.
3. Cole o script e pressione **Enter**. O botão **⚡** aparecerá na tela.
*(Nota: Essa opção requer repetir o procedimento a cada atualização de página).*

#### Opção 3: Modo de Desenvolvimento Local
1. Inicie o servidor local na raiz do projeto:
   ```bash
   python serve.py
   ```
2. Instale o [`painel.user.js`](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/painel.user.js) no Tampermonkey e defina `DEV_MODE = true` (linha 47).
3. Qualquer alteração nos arquivos de `core/` ou `modules/` será carregada dinamicamente ao recarregar a página.

---

## 📖 Como Operar o Painel

1. **Acessar o Painel**: Clique no botão flutuante **⚡** no canto inferior direito.
2. **Escolher o Módulo**: No menu em formato de grid, selecione o card correspondente à consulta desejada.
3. **Fornecer os Dados de Entrada**:
   - **Via XLSX**: Clique em **▶ Carregar XLSX** e selecione o arquivo com os identificadores na coluna A (e coluna B quando aplicável).
   - **Via Manual**: Clique em **▶ Manual**, cole a lista de itens no campo de texto e clique em **Processar** (ou `Ctrl + Enter`).
4. **Acompanhar a Execução**: Acompanhe o progresso na barra percentual, nos contadores e no log em tempo real.
5. **Finalização**: Ao concluir, o download do relatório (`.csv` ou `.xlsx`) iniciará automaticamente.

---

## 🛠️ Arquitetura do Projeto

O projeto é estruturado em duas camadas principais: **Core** (infraestrutura base compartilhada) e **Modules** (lógicas de automação plugáveis).

```
Utilitarios-SAT/
├── core/                           # Camada base compartilhada
│   ├── dataIO.js                   # Parser XLSX (SheetJS) e exportadores CSV/XLSX
│   ├── network.js                  # Requisições POST/GET, Ajax, REST e keepalive
│   ├── persistence.js              # Persistência em localStorage e retomada
│   ├── ui.js                       # Motor da GUI (botão ⚡, menu grid, dashboard, logs)
│   ├── utils.js                    # Utilitários (delays, parse de datas, XPaths, regex)
│   └── vrolBridge.js               # Ponte cross-tab anti-CORS para Visa Online
│
├── modules/                        # Plugins de automação independentes
│   ├── mod_compra_segura.js        # Compra Segura / SECOPE
│   ├── mod_consulta_completa.js    # Consulta Completa (62 colunas rotuladas)
│   ├── mod_consulta_redes.js       # Histórico de Redes por ARN
│   ├── mod_detalhe_direto.js       # Solução de ocorrência por Ajax
│   ├── mod_incoming_voucher.js     # Extrator de Voucher vinculado
│   ├── mod_nucaso.js               # NUCASO por expediente
│   ├── mod_reportes_fraude.js      # Reportes de Fraude (menu 0181)
│   ├── mod_sat_vrol.js             # Integração cruzada SAT + VROL
│   ├── mod_siach_ocorrencias.js    # Ocorrências SIACH completas
│   └── mod_vinculacao_voucher.js   # Indicador de vinculação de voucher
│
├── build.js                        # Script Node.js de build e empacotamento
├── build.py                        # Script Python de build e empacotamento
├── serve.py                        # Servidor HTTP local para desenvolvimento
├── painel.user.js                  # Entry point do Tampermonkey (modo dev)
├── painel_prod.user.js             # Userscript de produção consolidado (auto-gerado)
├── painel_unificado.bundle.js      # Bundle standalone para console (auto-gerado)
├── CHANGELOG.md                    # Histórico de releases e alterações
├── INSTRUCOES_TAMPERMONKEY.md      # Guia completo de configuração e uso
├── MANUTENCAO.md                   # Guia técnico para desenvolvedores
└── README.md                       # Documentação principal
```

---

## 🔨 Criação e Registro de Novos Módulos

Para criar um novo módulo de automação:

1. Crie o arquivo `modules/mod_novo_modulo.js` utilizando o template padrão:
   ```javascript
   (function (PAINEL) {
     'use strict';

     var CSV_COLS = ['IDENTIFICADOR', 'CAMPO_EXEMPLO', 'STATUS'];

     PAINEL.registrarModulo({
       id: 'novo_modulo',
       nome: 'Nome do Módulo no Menu',
       icone: '⚙️',
       cor: 'linear-gradient(90deg, #3498db, #2ecc71)',
       descricao: 'Descrição breve da funcionalidade.',
       sistema: 'SAT', // 'SAT', 'SIACH' ou 'SAT+VROL'
       storageKey: '_painel_novo_modulo_v1',
       intervaloMS: 200,
       csvCols: CSV_COLS,
       exportFormat: 'csv', // 'csv' ou 'xlsx'
       inputConfig: {
         instrucao: 'XLSX: col A = Identificador',
         promptManual: 'Cole os itens (um por linha):',
         parseRow: function (row) { return String(row[0] || '').trim() || null; },
         parseManual: function (line) { return line.trim() || null; },
         toStr: function (item) { return item; },
       },
       processarUm: async function (item, core) {
         // Lógica de extração usando core.network e core.utils
         return { IDENTIFICADOR: item, CAMPO_EXEMPLO: 'valor', STATUS: 'OK' };
       },
     });
   })(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
   ```

2. Recompile o projeto para atualizar o bundle e o script de produção:
   ```bash
   node build.js
   # ou
   python build.py
   ```

---

## 📚 Documentações Complementares

- 📄 [Histórico de Mudanças (CHANGELOG.md)](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/CHANGELOG.md)
- 📖 [Instruções Detalhadas do Tampermonkey (INSTRUCOES_TAMPERMONKEY.md)](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/INSTRUCOES_TAMPERMONKEY.md)
- 🔧 [Guia de Manutenção e Arquitetura Técnica (MANUTENCAO.md)](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/MANUTENCAO.md)
- 📝 [Catálogo de Scripts Originais e Referências (README_SCRIPTS.md)](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/README_SCRIPTS.md)

---

**Autor:** Wallyson Batista  
**Equipe / Projeto:** Stefanini — Automações de Cartões e Atendimento CEF