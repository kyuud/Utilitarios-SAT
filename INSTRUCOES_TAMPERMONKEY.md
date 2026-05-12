# Instruções de Uso — Tampermonkey

## Pré-requisitos

- Navegador **Chrome** ou **Edge** com extensão **Tampermonkey** instalada
- Login ativo no **SAT** (`cartoes.extracaixa`)
- Para módulos VROL: login adicional em `vrol.visaonline.com` no mesmo navegador
- Para o fallback anti-CORS do VROL: mantenha uma aba do VROL aberta/recarregada com o Tampermonkey ativo
- Para módulos SIACH: acesso ao SIACH no mesmo domínio

---

## Instalação

### Opção A: Produção (recomendado)

1. Abra o **Tampermonkey** → clique em **Criar novo script**
2. Apague todo o conteúdo padrão
3. Abra o arquivo `painel.prod.user.js` da pasta `PainelUnificado/`
4. Copie **todo** o conteúdo e cole no editor do Tampermonkey
5. Salve com **Ctrl+S**
6. Recarregue tambem qualquer aba aberta do VROL para ativar a ponte anti-CORS
7. Acesse `cartoes.extracaixa` — o botão **⚡** aparecerá no canto inferior direito

### Opção B: Bundle via Console (sem Tampermonkey)

1. Abra o arquivo `painelUnificado.bundle.js`
2. Copie todo o conteúdo
3. No navegador, pressione **F12** → aba **Console**
4. Cole o código e pressione **Enter**
5. O botão **⚡** aparecerá na página

> **Nota:** A opção B precisa ser repetida a cada reload da página.

### Opção C: Desenvolvimento Local

1. Execute o servidor local:
   ```bash
   python serve.py
   ```
2. No Tampermonkey, use o `painel.user.js` (não o `.prod`)
3. Altere `DEV_MODE = true` na linha 42
4. Salve e recarregue a página
5. Edite os arquivos em `core/` e `modules/` — recarregue para testar

---

## Uso do Painel

### Abrir o Painel
Clique no botão **⚡** no canto inferior direito da página.

### Selecionar Módulo
O menu mostra todos os módulos disponíveis em formato de grid. Cada card exibe:
- **Ícone** e **nome** do módulo
- **Descrição** da funcionalidade
- **Tag** com o sistema (SAT, SIACH, SAT+VROL)

Clique no card para abrir o módulo.

### Carregar Dados

Há duas formas de input:

#### Via XLSX (recomendado para lotes grandes)
1. Clique em **▶ Carregar XLSX**
2. Selecione o arquivo `.xlsx` ou `.xls`
3. O processamento inicia automaticamente

**Formato do XLSX:**
- Primeira linha = cabeçalho (é ignorada)
- Coluna A = identificador principal (NUMEXP, ARN, protocolo, etc.)
- Coluna B = parâmetro opcional (TIPFRAN, etc. — depende do módulo)
- Veja a instrução no canto do painel para cada módulo

#### Via Manual (para poucos itens)
1. Clique em **▶ Manual**
2. Cole os itens no prompt (um por linha)
3. Confirme com OK

### Durante o Processamento

O painel exibe em tempo real:
- **Barra de progresso** com percentual
- **Contador** ✅ sucesso / ❌ erro
- **Timer** com tempo decorrido e ETA estimado
- **Log** detalhado de cada item processado

**Ações disponíveis:**
- **⇩ CSV parcial** — baixa os resultados obtidos até o momento
- **■ Parar** — interrompe após o item atual (progresso é salvo)
- **← Menu** — volta ao menu de módulos

### Exportação

Ao final do processamento, o arquivo de resultado é baixado automaticamente:
- **CSV** (separador `;`, UTF-8 BOM) — maioria dos módulos
- **XLSX** — módulo SIACH Ocorrências

---

## Módulos Disponíveis

### SAT — Menu 0311
| Módulo | Input | Output |
|--------|-------|--------|
| 🔍 Consulta Redes | ARN + TIPFRAN | Dados completos do histórico de redes |
| 🧾 Incoming Voucher | ARN + TIPFRAN | ARN Voucher + Valor Compra |

### SAT — Menu 0209
| Módulo | Input | Output |
|--------|-------|--------|
| 📋 NUCASO | NUMEXP | NUCASO + TEM_CASO |
| 🔗 Vinculação Voucher | NUMEXP | VINCVOUCHER (SIM/NAO) |
| 📊 Consulta Completa | NUMEXP | 44 campos (busca + detalhe) |

### SAT — Ajax Direto
| Módulo | Input | Output |
|--------|-------|--------|
| 🔎 Detalhe Direto | NUMINC | CODSOLINC + Modo Entrada/Segurança |
| 🛡️ Compra Segura | NUMINC + Protocolo | Classificação Segura/Não Segura |

### SAT — Menu 0181
| Módulo | Input | Output |
|--------|-------|--------|
| 🚨 Reportes Fraude | NUMEXP + TIPFRAN | Reportes de fraude encontrados |

### Cross-System
| Módulo | Input | Output | Requisitos |
|--------|-------|--------|------------|
| 🌐 SAT + VROL | NUMEXP | Dados VROL + Chargebacks + Disputas | Login SAT + VROL |
| 📂 SIACH Ocorrências | Protocolo | Ocorrências EM_ANDAMENTO + Transações | Login SIACH |

---

## Retomada de Sessão

Se a sessão expirar durante o processamento:

1. O painel salva o progresso automaticamente (localStorage)
2. O header fica **vermelho** com mensagem "SESSÃO EXPIRADA"
3. Faça **login novamente** no SAT/SIACH
4. Abra o painel e selecione o **mesmo módulo**
5. Carregue o **mesmo arquivo** XLSX
6. O painel perguntará: *"Progresso anterior encontrado. Continuar?"*
7. Confirme para retomar de onde parou

> **Importante:** A retomada só funciona se o arquivo carregado for o mesmo (mesmos itens, mesma ordem). Se carregar um arquivo diferente, o progresso anterior é descartado.

---

## Códigos de Bandeira (TIPFRAN)

| Código | Bandeira |
|--------|----------|
| 1 | VISA |
| 2 | MASTERCARD |
| 7 | ELO |
| 14 | ELO INTERNACIONAL |

---

## Solução de Problemas

| Situação | O que fazer |
|----------|-------------|
| Botão ⚡ não aparece | Verificar se o Tampermonkey está ativo e o script habilitado |
| Popup bloqueado | Permitir popups para `cartoes.extracaixa` nas configurações do navegador |
| "SESSÃO EXPIRADA" logo no início | Fazer login no SAT e recarregar a página |
| VROL retorna "NAO LOGADO" | Abrir `vrol.visaonline.com` em outra aba e fazer login |
| VROL continua "NAO LOGADO" mesmo logado | Recarregar a aba do VROL depois de instalar o userscript atualizado; o console da aba deve mostrar "Ponte VROL ativa" |
| Resultados em branco | Verificar se o NUMEXP/ARN está correto e existe no sistema |
| CSV com caracteres estranhos | Abrir com Excel usando importação UTF-8 (Dados → De Texto/CSV) |
| Módulo trava em um item | Usar botão "■ Parar", verificar logs e retomar |
