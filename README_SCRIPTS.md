# Utilitários SAT — Documentação do Painel Unificado e Módulos

Esta pasta contém o **Painel Unificado**, um ecossistema modular injetável (via Tampermonkey ou Console do Navegador) que unifica várias ferramentas de consulta e automação de cartões sob uma única interface gráfica flutuante.

---

## Estrutura de Arquivos e Build

*   `build.py` / `build.js`: Scripts utilitários que concatenam os arquivos de `core/` e os plug-ins de `modules/` em dois arquivos consolidados de saída:
    *   `painel_unificado.bundle.js`: Versão limpa para ser colada diretamente no Console do Navegador.
    *   `painel_prod.user.js`: Versão estruturada com metadados para instalação direta no Tampermonkey.
*   `serve.py`: Pequeno servidor local HTTP em Python (`localhost:8000`) para servir os arquivos em tempo de desenvolvimento.
*   `painel.user.js`: Versão de desenvolvimento do script do Tampermonkey que consome o servidor local (com `DEV_MODE = true`).
*   `INSTRUCOES_TAMPERMONKEY.md` / `MANUTENCAO.md`: Guias de uso, instalação e manutenção do painel.

---

## 1. Arquivos Core (`core/`)
Os arquivos sob a pasta `core/` fornecem a infraestrutura base compartilhada por todos os módulos.

*   [utils.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/utils.js): Funções utilitárias comuns (esperas, formatação de datas, preenchimento de zeros, extração de XPath).
*   [network.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/network.js): Funções de rede para requisições POST/GET seguras no SAT/SIACH e tratamento centralizado de sessões expiradas.
*   [vrolBridge.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/vrolBridge.js): Ponte de comunicação anti-CORS que permite a troca de mensagens e consultas entre o SAT e o sistema VROL (Visa Online).
*   [persistence.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/persistence.js): Salva e recupera o progresso de execução em lote no `localStorage` do navegador para permitir retomadas automáticas.
*   [dataIO.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/dataIO.js): Mapeia arquivos XLSX, detecta colunas de input automaticamente e formata a saída de downloads em CSV/XLSX.
*   [ui.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/core/ui.js): Constrói a interface visual flutuante (botão ⚡, menu de módulos, barra de progresso, console de logs, modais de entrada e botões de exportação).

---

## 2. Módulos / Plugins (`modules/`)
Cada arquivo de módulo implementa uma tarefa de automação específica que é plugada dinamicamente no painel.

*   [mod_consulta_redes.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_consulta_redes.js)
    *   *Objetivo:* Consulta o Histórico de Redes (menu SAT 0311).
    *   *Entrada:* ARN na coluna A, TIPFRAN (bandeira) na coluna B do XLSX (ou manual).
    *   *Saída (CSV):* Dados completos do histórico de rede correspondente.
*   [mod_incoming_voucher.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_incoming_voucher.js)
    *   *Objetivo:* Extrai dados de Incoming e Voucher (menu SAT 0311).
    *   *Entrada:* ARN na coluna A, TIPFRAN na coluna B.
    *   *Saída (CSV):* ARN Voucher, valores e dados da transação.
*   [mod_nucaso.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_nucaso.js)
    *   *Objetivo:* Consulta e extração do código NUCASO de um expediente (menu SAT 0209).
    *   *Entrada:* NUMEXP na coluna A.
    *   *Saída (CSV):* NUMEXP, NUCASO, TEM_CASO.
*   [mod_vinculacao_voucher.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_vinculacao_voucher.js)
    *   *Objetivo:* Verifica se há vinculação a voucher para os expedientes (menu SAT 0209).
    *   *Entrada:* NUMEXP na coluna A.
    *   *Saída (CSV):* NUMEXP, VINCVOUCHER (SIM/NAO).
*   [mod_consulta_completa.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_consulta_completa.js)
    *   *Objetivo:* Extração completa de dados de expedientes (menu SAT 0209) com rótulos em Português.
    *   *Entrada:* NUMEXP na coluna A.
    *   *Saída (CSV):* Relatório completo com 62 colunas de dados do SAT detalhando valores, bandeiras, comércio, andamento do processo e soluções, com cabeçalhos em Português.
*   [mod_detalhe_direto.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_detalhe_direto.js)
    *   *Objetivo:* Detalha ocorrências diretamente por AJAX no SAT (pesquisaDeOcorrencias + getMessageIncoming).
    *   *Entrada:* NUMINC na coluna A.
    *   *Saída (CSV):* NUMINC, CODSOLINC, INDSITEXP, TIPFRAN, BANDEIRA, SECOPE, MODO_ENTRADA, MODO_SEGURANCA, SEGURO.
*   [mod_compra_segura.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_compra_segura.js)
    *   *Objetivo:* Consulta o Message Incoming de ocorrências (via AJAX) para auditar se a transação do protocolo foi efetuada em ambiente seguro.
    *   *Entrada:* NUMINC na coluna A, Protocolo na coluna B.
    *   *Saída (CSV):* Classificação ("Compra Segura", "Compra Não Segura" ou "Sem SECOPE") associada ao protocolo.
*   [mod_reportes_fraude.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_reportes_fraude.js)
    *   *Objetivo:* Consulta reportes de fraude cadastrados (menu SAT 0181).
    *   *Entrada:* NUMEXP na coluna A, TIPFRAN na coluna B.
    *   *Saída (CSV):* Dados dos reportes de fraude localizados.
*   [mod_sat_vrol.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_sat_vrol.js)
    *   *Objetivo:* Módulo cross-system que busca dados do SAT e faz o enriquecimento consultando disputas e chargebacks diretamente no portal VROL (Visa Online) via ponte anti-CORS.
    *   *Entrada:* NUMEXP na coluna A.
    *   *Saída (CSV):* Dados consolidados do SAT cruzados com os status de chargebacks e disputas retornados do VROL.
*   [mod_siach_ocorrencias.js](file:///c:/Users/794080663/OneDrive%20-%20Stefanini/Arquivos%20-%20Automa%C3%A7%C3%B5es/Scripts/Utilit%C3%A1rios%20SAT/modules/mod_siach_ocorrencias.js)
    *   *Objetivo:* Consulta e extração completa de ocorrências no SIACH via API REST (incluindo view enriquecida, relatos, histórico e desacordos comerciais).
    *   *Entrada:* Protocolo na coluna A.
    *   *Saída (XLSX):* Planilha com 23 campos completos de ocorrências SIACH e aba de Resumo consolidado.
