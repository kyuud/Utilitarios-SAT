# Painel de Automações CEF — Utilitários SAT

Userscript modular para automação e extração de dados em lote nos sistemas de cartões da CAIXA: **SAT** (Oracle Forms / Servlets), **SIACH** (API REST) e **VROL** (Visa Online).

---

## Recursos Principais

- **Interface Flutuante**: Acesso rápido pelo botão no canto inferior direito.
- **Entrada Flexível**: Planilhas Excel (.xlsx) ou digitação manual inline.
- **Dashboard em Tempo Real**: Barra de progresso, contador sucesso/erro, tempo decorrido, ETA e logs.
- **Retomada Automática**: Estado salvo no `localStorage` para continuar lotes após expiração de sessão.
- **Exportação Otimizada**: CSV (UTF-8 BOM, delimitador `;`) e XLSX estruturado com resumo.
- **Ponte Anti-CORS (VROL Bridge)**: Integração cruzada SAT e Visa Online via Tampermonkey.

---

## Módulos Disponíveis

| # | Módulo | Sistema | Entrada | Saída |
|---|--------|---------|---------|-------|
| 1 | Consulta Histórico de Redes | SAT (0311) | ARN + TIPFRAN | Histórico da rede (CSV) |
| 2 | Incoming Voucher | SAT (0311->0884) | ARN + TIPFRAN | ARN e Valor Voucher (CSV) |
| 3 | Extrator NUCASO | SAT (0209) | NUMEXP | NUCASO + TEM_CASO (CSV) |
| 4 | Vinculação Voucher | SAT (0209) | NUMEXP | Indicador VINCVOUCHER (CSV) |
| 5 | Consulta Completa | SAT (0209) | NUMEXP | 62 campos em Português (CSV) |
| 6 | Detalhe Direto | SAT (Ajax) | NUMINC | Solução + Segurança (CSV) |
| 7 | Compra Segura | SAT (Ajax) | NUMINC + Protocolo | Classificação Segura (CSV) |
| 8 | Reportes de Fraude | SAT (0181) | NUMEXP + TIPFRAN | Fraudes cadastradas (CSV) |
| 9 | SAT + VROL Consulta | SAT + VROL | NUMEXP | SAT + VROL Chargebacks (CSV) |
| 10 | SIACH Ocorrências | SIACH (REST) | Protocolo | 23 campos + Resumo (XLSX) |

**Bandeiras (TIPFRAN):** `1` = VISA | `2` = MASTERCARD | `7` = ELO | `14` = ELO INTERNACIONAL

---

## Instalação e Execução

### 1. Tampermonkey (Recomendado)
1. Instale o Tampermonkey no Chrome ou Edge.
2. Crie um novo script e cole o conteúdo de [painel_prod.user.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/painel_prod.user.js).
3. Salve (Ctrl+S) e acesse o SAT ou SIACH.

### 2. Console DevTools (Sem extensão)
Copie o conteúdo de [painel_unificado.bundle.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/painel_unificado.bundle.js), cole no Console (F12) e pressione Enter.

---

## Como Operar

1. Clique no botão flutuante no canto inferior direito.
2. Selecione o módulo desejado no menu de cards.
3. Escolha **Carregar XLSX** (coluna A para ID principal) ou **Manual**.
4. Acompanhe o processamento e aguarde o download do relatório.

---

## Build do Projeto

Para recompilar bundle e script de produção:
```bash
python build.py
```

---
**Autor:** Wallyson Batista | Stefanini — Automações CEF
