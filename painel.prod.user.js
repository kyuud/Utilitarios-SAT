// ==UserScript==
// @name         Painel Automações CEF
// @namespace    stefanini/automacoes
// @version      1.0.5
// @updateURL    https://raw.githubusercontent.com/kyuud/Utilitarios-SAT/main/painel.prod.user.js
// @downloadURL  https://raw.githubusercontent.com/kyuud/Utilitarios-SAT/main/painel.prod.user.js
// @description  Painel de controle unificado para automações SAT/SIACH/VROL
// @author       Stefanini - Automações
// @match        https://cartoes.extracaixa/*
// @match        https://cartoes.extracaixa:*/*
// @match        https://vrol.visaonline.com/*
// @match        https://www.vrol.visaonline.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-idle
// @noframes
// ==/UserScript==

/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — Tampermonkey Entry Point
 *
 *  Este arquivo é o ponto de entrada para o Tampermonkey.
 *  Para usar MANUALMENTE (sem Tampermonkey), utilize o arquivo
 *  gerado pelo build.js: painelUnificado.bundle.js
 *
 *  Para DESENVOLVIMENTO, o build.js concatena core/ + modules/
 *  e embute tudo neste wrapper.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── Guard: evita execução duplicada ──
  if (window.__PAINEL_INIT__) return;
  window.__PAINEL_INIT__ = true;

  // ===========================================================
  //  PLACEHOLDER: No build final, o conteúdo de core/* e
  //  modules/* será injetado aqui pelo build.js.
  //  Durante desenvolvimento, carregue os arquivos via
  //  servidor local (ver instruções no README).
  // ===========================================================

  // ── Modo Desenvolvimento: carrega scripts de um servidor local ──
  var DEV_MODE = false;  // Mude para true durante desenvolvimento
  var DEV_SERVER = 'http://localhost:8080/PainelUnificado';

  if (DEV_MODE) {
    var scripts = [
      '/core/utils.js',
      '/core/network.js',
      '/core/vrolBridge.js',
      '/core/persistence.js',
      '/core/dataIO.js',
      '/core/ui.js',
      // Módulos
      '/modules/mod_consulta_redes.js',
      '/modules/mod_nucaso.js',
      '/modules/mod_vinculacao_voucher.js',
      '/modules/mod_detalhe_direto.js',
      '/modules/mod_compra_segura.js',
      '/modules/mod_reportes_fraude.js',
      '/modules/mod_consulta_completa.js',
      '/modules/mod_incoming_voucher.js',
      '/modules/mod_sat_vrol.js',
      '/modules/mod_siach_ocorrencias.js',
    ];

    (async function carregarDev() {
      for (var i = 0; i < scripts.length; i++) {
        await new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = DEV_SERVER + scripts[i] + '?t=' + Date.now();
          s.onload = resolve;
          s.onerror = function () {
            console.error('[Painel] Falha ao carregar: ' + scripts[i]);
            resolve(); // continua mesmo com erro
          };
          document.head.appendChild(s);
        });
      }
      // Inicializar após todos os scripts carregarem
      if (window.__PAINEL_CORE__ &&
          window.__PAINEL_CORE__.vrolBridge &&
          window.__PAINEL_CORE__.vrolBridge.isVrolHost()) {
        window.__PAINEL_CORE__.vrolBridge.instalarServidor();
        console.log('[Painel] DEV MODE - Ponte VROL ativa.');
      } else if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {
        window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();
        console.log('[Painel] DEV MODE — Botão flutuante injetado.');
      }
    })();
    return;
  }

  // ── Modo Produção: tudo está inline (injetado pelo build.js) ──
  // BUILD_INJECT_START

// ── core/utils.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/utils.js
 *  Funções utilitárias compartilhadas por todos os módulos.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Pausa a execução por um tempo determinado (delay assíncrono).
   * @param {number} ms - Milissegundos.
   * @returns {Promise<void>}
   */
  function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Retorna data/hora atual formatada: "2026-05-08 14:30:00"
   * @returns {string}
   */
  function agora() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }

  /**
   * Formata uma data ISO para "YYYY-MM-DD".
   * @param {string} dateStr - String de data (ISO ou qualquer formato Date-parseable).
   * @returns {string}
   */
  function formatarData(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().replace(/[TZ].*/g, '').trim();
    } catch (e) {
      return String(dateStr);
    }
  }

  /**
   * Preenche com zeros à esquerda.
   * @param {*} valor
   * @param {number} tamanho
   * @returns {string}
   */
  function zeroFill(valor, tamanho) {
    var s = String(valor || '');
    while (s.length < tamanho) s = '0' + s;
    return s;
  }

  /**
   * Gera sufixo de timestamp para nomes de arquivo.
   * Ex: "2026-05-08-14-30-00"
   * @returns {string}
   */
  function timestampSufixo() {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  }

  /**
   * Extrai o valor de um campo hidden input de um HTML SAT.
   * Tenta diversas combinações de name/id + value.
   * @param {string} html - HTML completo.
   * @param {string} fieldName - Nome do campo.
   * @returns {string}
   */
  function extrairCampoHTML(html, fieldName) {
    var r1 = new RegExp("name=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m1 = html.match(r1);
    if (m1) return m1[1];
    var r2 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*name=['\"]" + fieldName + "['\"]", 'i');
    var m2 = html.match(r2);
    if (m2) return m2[1];
    var r3 = new RegExp("id=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m3 = html.match(r3);
    if (m3) return m3[1];
    var r4 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*id=['\"]" + fieldName + "['\"]", 'i');
    var m4 = html.match(r4);
    return m4 ? m4[1] : '';
  }

  /**
   * Parseia resposta SAT no formato SIDATOS:K1=V1|K2=V2|...
   * @param {string} response - String de resposta do SAT.
   * @returns {Object} Mapa chave→valor.
   */
  function parseSIDATOS(response) {
    var result = {};
    var str = response;
    var idx = str.indexOf('SIDATOS:');
    if (idx !== -1) str = str.substring(idx + 8);
    var pairs = str.split('|');
    for (var i = 0; i < pairs.length; i++) {
      var eqIdx = pairs[i].indexOf('=');
      if (eqIdx > 0) {
        var key = pairs[i].substring(0, eqIdx).trim();
        var val = pairs[i].substring(eqIdx + 1);
        if (key) result[key] = val;
      }
    }
    return result;
  }

  /**
   * Extrai valor adjacente via XPath em um DOM parseado.
   * Busca o td-label e retorna o texto do td-sibling.
   * @param {Document} doc - DOM parseado.
   * @param {string} xpath - XPath para o label.
   * @returns {string}
   */
  function extractByXPath(doc, xpath) {
    try {
      var result = doc.evaluate(xpath, doc.body || doc.documentElement, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (result.snapshotLength > 0) {
        var sibling = result.snapshotItem(0).parentNode.children[1];
        return sibling ? sibling.textContent.trim() : '';
      }
    } catch (e) { }
    return '';
  }

  /**
   * Mapa de códigos de bandeira para nomes.
   */
  var CODIGO_PARA_BANDEIRA = {
    '1': 'VISA',
    '2': 'MASTERCARD',
    '7': 'ELO',
    '14': 'ELO INTERNACIONAL'
  };

  // ── Exportar ──
  PAINEL.utils = {
    esperar: esperar,
    agora: agora,
    formatarData: formatarData,
    zeroFill: zeroFill,
    timestampSufixo: timestampSufixo,
    extrairCampoHTML: extrairCampoHTML,
    parseSIDATOS: parseSIDATOS,
    extractByXPath: extractByXPath,
    CODIGO_PARA_BANDEIRA: CODIGO_PARA_BANDEIRA,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── core/network.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/network.js
 *  Camada de rede: POST para servlets SAT, gerenciamento de
 *  sessão, detecção de expiração e keepalive.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Obtém o ID da sessão Java (JSESSIONID) a partir dos cookies.
   * @returns {string}
   * @throws {Error} 'SESSAO_EXPIRADA' se não encontrado.
   */
  function getSessionId() {
    var m = document.cookie.match(/JSESSIONID=([^;]+)/);
    if (m) return m[1];
    throw new Error('SESSAO_EXPIRADA');
  }

  /**
   * Verifica se o HTML de resposta indica sessão expirada.
   * @param {string} text - Corpo da resposta.
   * @returns {boolean}
   */
  function isSessaoExpirada(text) {
    return text.length < 2000 &&
      text.indexOf('login') !== -1 &&
      text.indexOf('IdSession') === -1;
  }

  /**
   * Codifica parâmetros (Object ou Array de {name,value}) para urlencoded.
   * @param {Object|Array} params
   * @returns {string}
   */
  function encodeParams(params) {
    if (typeof params === 'string') return params;

    if (Array.isArray(params)) {
      return params.map(function (p) {
        return encodeURIComponent(p.name) + '=' + encodeURIComponent(p.value || '');
      }).join('&');
    }

    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null) v = '';
      if (Array.isArray(v)) {
        v.forEach(function (vi) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(vi));
        });
      } else {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
    });
    return parts.join('&');
  }

  /**
   * POST genérico para servlets SAT (same-origin).
   * Detecta sessão expirada automaticamente.
   *
   * @param {string} url - URL destino (ex: '/sat/servlet/ServletDirector').
   * @param {Object|Array|string} params - Parâmetros do POST.
   * @param {Object} [opts] - Opções adicionais.
   * @param {string} [opts.contentType] - Content-Type (default: urlencoded).
   * @param {string} [opts.credentials] - 'same-origin' | 'include' (default: same-origin).
   * @returns {Promise<string>} HTML/texto de resposta.
   * @throws {Error} 'SESSAO_EXPIRADA' ou 'HTTP {status}'.
   */
  async function post(url, params, opts) {
    opts = opts || {};
    var body = encodeParams(params);
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
      body: body,
      credentials: opts.credentials || 'same-origin',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (isSessaoExpirada(text)) throw new Error('SESSAO_EXPIRADA');
    return text;
  }

  /**
   * POST para SAT com credentials: include (para cross-origin ou SIACH).
   * Wrapper de conveniência.
   */
  async function postInclude(url, params, contentType) {
    return post(url, params, {
      contentType: contentType || 'application/x-www-form-urlencoded',
      credentials: 'include',
    });
  }

  /**
   * POST JSON para APIs REST (SIACH).
   * @param {string} url
   * @param {Object} body - Objeto a ser enviado como JSON.
   * @returns {Promise<Object>} Resposta parseada como JSON.
   */
  async function postJSON(url, body) {
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1)) {
      throw new Error('SESSAO_EXPIRADA');
    }
    return JSON.parse(text);
  }

  /**
   * GET JSON para APIs REST.
   * @param {string} url
   * @returns {Promise<Object>}
   */
  async function getJSON(url) {
    var resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1)) {
      throw new Error('SESSAO_EXPIRADA');
    }
    return JSON.parse(text);
  }

  // ── Keepalive ──

  var _keepaliveTimers = {};

  /**
   * Inicia keepalive periódico para manter sessão ativa.
   * @param {string} id - Identificador único (ex: 'sat', 'siach').
   * @param {string} url - URL do endpoint de keepalive.
   * @param {Object|string} body - Corpo da requisição.
   * @param {Object} [opts] - Opções (credentials, contentType, intervalo, logFn).
   * @returns {string} ID do timer.
   */
  function iniciarKeepalive(id, url, body, opts) {
    opts = opts || {};
    var intervalo = opts.intervalo || (5 * 60 * 1000); // 5 min
    var logFn = opts.logFn || function () { };

    // Limpar anterior se existir
    pararKeepalive(id);

    _keepaliveTimers[id] = setInterval(function () {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
        body: typeof body === 'string' ? body : encodeParams(body),
        credentials: opts.credentials || 'same-origin',
      }).then(function () {
        logFn('[keepalive] Sessão ' + id + ' renovada.');
      }).catch(function () {
        logFn('[keepalive] Falha ao renovar ' + id + '.');
      });
    }, intervalo);

    return id;
  }

  /**
   * Para um keepalive específico.
   * @param {string} id
   */
  function pararKeepalive(id) {
    if (_keepaliveTimers[id]) {
      clearInterval(_keepaliveTimers[id]);
      delete _keepaliveTimers[id];
    }
  }

  /**
   * Para todos os keepalives ativos.
   */
  function pararTodosKeepalives() {
    Object.keys(_keepaliveTimers).forEach(pararKeepalive);
  }

  // ── Exportar ──
  PAINEL.network = {
    getSessionId: getSessionId,
    post: post,
    postInclude: postInclude,
    postJSON: postJSON,
    getJSON: getJSON,
    encodeParams: encodeParams,
    iniciarKeepalive: iniciarKeepalive,
    pararKeepalive: pararKeepalive,
    pararTodosKeepalives: pararTodosKeepalives,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── core/vrolBridge.js ──
/**
 * PAINEL UNIFICADO - core/vrolBridge.js
 *
 * Ponte SAT <-> VROL via storage do Tampermonkey.
 *
 * Por que existe:
 * - Chamadas fetch do SAT para o VROL dependem de CORS e de cookies de terceiro.
 * - Alguns navegadores bloqueiam esses cookies, entao o VROL parece "nao logado"
 *   mesmo com uma aba do VROL autenticada.
 * - Quando este userscript tambem roda numa aba do VROL, essa aba faz as chamadas
 *   como first-party e devolve o resultado para a aba SAT pelo GM_* storage.
 */
(function (PAINEL) {
  'use strict';

  var VROL_HOST_RE = /(^|\.)vrol\.visaonline\.com$/i;
  var REQ_KEY = '__painel_vrol_request__';
  var RESP_PREFIX = '__painel_vrol_response__';
  var STATUS_KEY = '__painel_vrol_status__';
  var DEFAULT_TIMEOUT = 25000;

  function isVrolHost() {
    return VROL_HOST_RE.test(window.location.hostname || '');
  }

  function hasGMBridge() {
    return typeof GM_setValue === 'function' &&
      typeof GM_addValueChangeListener === 'function';
  }

  function parseValue(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (e) { return null; }
  }

  function stringifyValue(value) {
    return JSON.stringify(value);
  }

  function removeValue(key) {
    try {
      if (typeof GM_deleteValue === 'function') GM_deleteValue(key);
    } catch (e) { }
  }

  function encodeByDict(obj) {
    return Object.keys(obj).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] || '');
    }).join('&');
  }

  function convertToDOM(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function limparTextoVrol(valor) {
    return String(valor || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function codigoDisputaVrol(valor) {
    var texto = limparTextoVrol(valor);
    var m = texto.match(/^[A-Za-z0-9]+/);
    return m ? m[0] : '';
  }

  async function getTokenVrol() {
    try {
      var result = await fetch('/rolol/jsp/performance_form.jsp', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        method: 'GET',
        credentials: 'include',
      });
      var response = await result.text();
      var responseDom = convertToDOM(response);
      var inputEl = responseDom.querySelector('input[type="hidden"][id]') ||
        responseDom.querySelector('input[id][value]');
      if (!inputEl || !inputEl.id || !inputEl.value) return null;
      if (/user|senha|password|login/i.test(inputEl.id)) return null;
      return { tokenKey: inputEl.id, tokenValue: inputEl.value };
    } catch (e) {
      return null;
    }
  }

  async function getCaseByArn(numref) {
    var tokens = await getTokenVrol();
    if (!tokens) return { status: 'undone', reason: 'VROL NAO LOGADO', data: null };

    var body = encodeURIComponent(tokens.tokenKey) + '=' + encodeURIComponent(tokens.tokenValue) +
      '&skipPotentialDuplicateCheck=false&request_only_locale=en_US' +
      '&tiSummaryRequest.viewCaseFromAdjQueue=&searchHistoryList=-1' +
      '&tiSummaryRequest.repository=VISA&tiSummaryRequest.cardAccountNumber=' +
      '&tiSummaryRequest.terminalId=&tiSummaryRequest.transactionId=' +
      '&tiSummaryRequest.acquirerReferenceNumber=' + encodeURIComponent(numref) +
      '&tiSummaryRequest.consumerAccountNumber=' +
      '&tiSummaryRequest.startDate=&tiSummaryRequest.creditDate=' +
      '&tiSummaryRequest.endDate=' +
      '&tiSummaryRequest.transactionTypeIncluded=EL' +
      '&tiSummaryRequest.dpsOriginalTransactionType=' +
      '&tiSummaryRequest.nonDPSOriginalTransactionType=' +
      '&__checkbox_tiSummaryRequest.showDupAuthInd=true' +
      '&tiSummaryRequest.authFinInclusion=INCLUDE_BOTH' +
      '&tiSummaryRequest.originalTransactionStatus=' +
      '&tiSummaryRequest.doingOneClick=&tiSummaryRequest.caseId=' +
      '&tiSummaryRequest.pinTransactionToCase=' +
      '&tiSummaryRequest.pinTransactionInvocationSource=' +
      '&tiSummaryRequest.queueFilterSid=&tiSummaryRequest.resultsSortField=' +
      '&tiSummaryRequest.extrTranSid=&tiSummaryRequest.authCode=' +
      '&tiSummaryRequest.networkId=&tiSummaryRequest.retrievalReferenceNumber=' +
      '&tiSummaryRequest.businessApplicationId=' +
      '&tiSummaryRequest.merchantCategoryCode=' +
      '&__checkbox_tiSummaryRequest.includeCreditReversalAdjustments=true';

    try {
      var request = await fetch('/rolti/web/ti/ti-summary.action', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'cache-control': 'max-age=0',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body,
        method: 'POST',
        credentials: 'include',
      });

      if (request.status !== 200) {
        return { status: 'undone', reason: 'TIMEOUT VROL', data: null };
      }

      var response = await request.text();
      var responseDom = convertToDOM(response);
      var trsElement = responseDom.querySelectorAll('table[id="results"] tr');

      if (!trsElement || trsElement.length < 3) {
        return { status: 'undone', reason: 'SEM CASOS NO VROL', data: null };
      }

      var lineElement = trsElement[2];
      var tdsTexts = Array.from(lineElement.querySelectorAll('td'))
        .filter(function (item) {
          return (!item.style || !item.style.display) || item.style.display !== 'none';
        })
        .map(function (item) {
          return limparTextoVrol(item.innerText || item.textContent || '');
        })
        .slice(1, 22);

      return {
        status: 'done',
        reason: '',
        data: {
          ASSOC_DISPUTE: codigoDisputaVrol(tdsTexts[0]),
          TRANSACTION_DATE_TIME: tdsTexts[1] || '',
          CPD_SETTLED_DATE: tdsTexts[2] || '',
          TRAN_TYPE: tdsTexts[3] || '',
          RESPONSE_CODE: tdsTexts[4] || '',
          TOTAL_TRAN_AMOUNT: tdsTexts[5] || '',
          DR_CR: tdsTexts[6] || '',
          MERCHANT_LOCATION: tdsTexts[7] || '',
          PI: tdsTexts[8] || '',
          RDR: tdsTexts[9] || '',
          MOTO_ECI: tdsTexts[10] || '',
          NETWORK_ID: tdsTexts[11] || '',
          ENTRY_MODE: tdsTexts[12] || '',
          AUTH_CODE: tdsTexts[13] || '',
          MCC: tdsTexts[14] || '',
          TRANSACTION_ID_RETRIEVAL_REF: tdsTexts[15] || '',
          MERCHANT_IDENTIFIER: tdsTexts[16] || '',
          INSTALLMENT_COUNT: tdsTexts[17] || '',
          ARN: tdsTexts[18] || '',
          CARD: tdsTexts[19] || '',
          CVV2: tdsTexts[20] || '',
        },
      };
    } catch (e) {
      return { status: 'undone', reason: 'TIMEOUT VROL', data: null };
    }
  }

  async function getPageCaseVrol(isPan, tokenkey, tokenvalue, options) {
    try {
      var params;
      if (isPan) {
        params = {
          QuickSearchValue: options.PAN,
          tempValue: options.PAN,
          bk2que: '',
          AcquirerReferenceNumber: '',
          TransactionNumber: '',
          SearchCaseNumber: '',
          tokenNumber: options.PAN,
          CardAccountNumber: options.PAN,
        };
      } else {
        params = {
          QuickSearchValue: options.NUMREF,
          tempValue: options.NUMREF,
          bk2que: '',
          AcquirerReferenceNumber: options.NUMREF,
          TransactionNumber: '',
          SearchCaseNumber: '',
          tokenNumber: '',
          CardAccountNumber: '',
        };
      }
      params[tokenkey] = tokenvalue;

      var request = await fetch('/rolol/CaseFolderDispatcher?action=QuickSearch&configurable=true&fetchDefinition=true', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: encodeByDict(params),
        method: 'POST',
        credentials: 'include',
      });
      return { status: 'done', reason: '', data: await request.json() };
    } catch (e) {
      return { status: 'undone', reason: 'TIMEOUT VROL', data: null };
    }
  }

  async function getCountCbksVrol(options) {
    try {
      var t = await getTokenVrol();
      if (!t) return { status: 'undone', reason: 'VROL NAO LOGADO', data: { casos_abertos: 0 } };
      var result = await getPageCaseVrol(true, t.tokenKey, t.tokenValue, options);
      if (result.status !== 'done') return { status: 'done', reason: '', data: { casos_abertos: 0 } };
      if (result.data && result.data.caseNumber) return { status: 'done', reason: '', data: { casos_abertos: 1 } };
      if (result.data && result.data.errorMessageList && result.data.errorMessageList[0] === 'No cases found') {
        return { status: 'done', reason: '', data: { casos_abertos: 0 } };
      }
      if (result.data && result.data.data) {
        return {
          status: 'done',
          reason: '',
          data: {
            casos_abertos: result.data.data.filter(function (item) {
              return parseInt(item.daysToAct, 10) > 0;
            }).length,
          },
        };
      }
      return { status: 'done', reason: '', data: { casos_abertos: 0 } };
    } catch (e) {
      return { status: 'undone', reason: 'TIMEOUT VROL', data: { casos_abertos: 0 } };
    }
  }

  async function checkCaseBlankVrol(options) {
    try {
      var t = await getTokenVrol();
      if (!t) return { status: 'undone', reason: 'VROL NAO LOGADO', data: null };
      var result = await getPageCaseVrol(false, t.tokenKey, t.tokenValue, options);
      if (result.status === 'undone') return { status: 'undone', reason: 'TIMEOUT VROL', data: null };

      if (result.data) {
        var numrefsIguais = [];
        if (result.data.data) {
          numrefsIguais = result.data.data.filter(function (item) {
            return item.arnRrnText && item.arnRrnText.indexOf(options.NUMREF.substring(17, 23)) > -1;
          });
        }
        if (numrefsIguais.length > 0 || result.data.caseNumber) {
          var numsCaso = [];
          if (result.data.caseNumber) numsCaso.push(result.data.caseNumber);
          numrefsIguais.forEach(function (item) {
            if (item.caseNumber && numsCaso.indexOf(item.caseNumber) === -1) numsCaso.push(item.caseNumber);
          });
          return {
            status: 'undone',
            reason: 'Existe caso criado no VROL',
            data: { numeroCasoDisputa: numsCaso.join(', ') },
          };
        }
      }
      return { status: 'done', reason: '', data: null };
    } catch (e) {
      return { status: 'undone', reason: 'TIMEOUT VROL', data: null };
    }
  }

  async function executarAcao(action, payload) {
    payload = payload || {};
    if (action === 'ping') {
      return {
        status: 'done',
        host: window.location.hostname,
        href: window.location.href,
        hasToken: !!(await getTokenVrol()),
      };
    }
    if (action === 'getToken') return await getTokenVrol();
    if (action === 'getCaseByArn') return await getCaseByArn(payload.NUMREF || payload.numref || '');
    if (action === 'getCountCbks') return await getCountCbksVrol({ PAN: payload.PAN || '' });
    if (action === 'checkCaseBlank') return await checkCaseBlankVrol({ NUMREF: payload.NUMREF || '' });
    throw new Error('ACAO_VROL_DESCONHECIDA');
  }

  function instalarServidor(logFn) {
    logFn = logFn || function () { };
    if (!isVrolHost()) return false;
    if (window.__PAINEL_VROL_BRIDGE_SERVER__) return true;
    window.__PAINEL_VROL_BRIDGE_SERVER__ = true;

    if (!hasGMBridge()) {
      console.warn('[Painel VROL] GM_* indisponivel. Reinstale o userscript atualizado.');
      return false;
    }

    GM_setValue(STATUS_KEY, stringifyValue({
      online: true,
      ts: Date.now(),
      href: window.location.href,
    }));

    GM_addValueChangeListener(REQ_KEY, function (_name, _oldValue, newValue) {
      var msg = parseValue(newValue);
      if (!msg || msg.source !== 'PAINEL_VROL' || !msg.id || !msg.action) return;

      (async function () {
        var respKey = RESP_PREFIX + msg.id;
        try {
          var result = await executarAcao(msg.action, msg.payload || {});
          GM_setValue(respKey, stringifyValue({
            source: 'PAINEL_VROL',
            id: msg.id,
            ok: true,
            result: result,
            ts: Date.now(),
          }));
        } catch (e) {
          GM_setValue(respKey, stringifyValue({
            source: 'PAINEL_VROL',
            id: msg.id,
            ok: false,
            error: (e && e.message) || String(e),
            ts: Date.now(),
          }));
        }
      })();
    });

    window.addEventListener('beforeunload', function () {
      try {
        GM_setValue(STATUS_KEY, stringifyValue({
          online: false,
          ts: Date.now(),
          href: window.location.href,
        }));
      } catch (e) { }
    });

    console.log('[Painel VROL] Ponte ativa. Mantenha esta aba aberta durante consultas SAT+VROL.');
    logFn('[Painel VROL] Ponte ativa.');
    return true;
  }

  function request(action, payload, timeoutMS) {
    timeoutMS = timeoutMS || DEFAULT_TIMEOUT;
    if (!hasGMBridge()) {
      return Promise.reject(new Error('PONTE_VROL_INDISPONIVEL'));
    }

    return new Promise(function (resolve, reject) {
      var id = Date.now() + '_' + Math.random().toString(36).slice(2);
      var respKey = RESP_PREFIX + id;
      var done = false;
      var listenerId = null;

      function cleanup() {
        done = true;
        clearTimeout(timer);
        try {
          if (listenerId !== null && typeof GM_removeValueChangeListener === 'function') {
            GM_removeValueChangeListener(listenerId);
          }
        } catch (e) { }
        removeValue(respKey);
      }

      var timer = setTimeout(function () {
        if (done) return;
        cleanup();
        reject(new Error('PONTE_VROL_SEM_RESPOSTA'));
      }, timeoutMS);

      listenerId = GM_addValueChangeListener(respKey, function (_name, _oldValue, newValue) {
        if (done) return;
        var msg = parseValue(newValue);
        if (!msg || msg.source !== 'PAINEL_VROL' || msg.id !== id) return;
        cleanup();
        if (msg.ok) resolve(msg.result);
        else reject(new Error(msg.error || 'ERRO_PONTE_VROL'));
      });

      GM_setValue(REQ_KEY, stringifyValue({
        source: 'PAINEL_VROL',
        id: id,
        action: action,
        payload: payload || {},
        ts: Date.now(),
      }));
    });
  }

  function status() {
    if (typeof GM_getValue !== 'function') return null;
    return parseValue(GM_getValue(STATUS_KEY, ''));
  }

  PAINEL.vrolBridge = {
    isVrolHost: isVrolHost,
    hasGMBridge: hasGMBridge,
    instalarServidor: instalarServidor,
    request: request,
    status: status,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── core/persistence.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/persistence.js
 *  Persistência genérica via localStorage para retomada de
 *  processamento após expiração de sessão.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Gera assinatura de uma lista para validar compatibilidade na retomada.
   * Combina os 3 primeiros itens + tamanho total.
   * @param {Array} lista - Lista de itens (strings ou objects).
   * @param {Function} [toStr] - Função para converter item em string (default: String).
   * @returns {string}
   */
  function gerarAssinatura(lista, toStr) {
    toStr = toStr || String;
    return lista.slice(0, 3).map(toStr).join(',') + '|' + lista.length;
  }

  /**
   * Salva o progresso atual no localStorage.
   * @param {string} chave - Chave de storage única do módulo.
   * @param {Object} estado - Objeto contendo:
   *   @param {Array} estado.listaOriginal - Lista completa de itens.
   *   @param {Object} estado.processados - Mapa de itens já processados.
   *   @param {Array} estado.resultados - Resultados acumulados.
   *   @param {Object} [estado.stats] - Contadores opcionais.
   *   @param {Function} [estado.toStr] - Função para gerar assinatura dos itens.
   */
  function salvarProgresso(chave, estado) {
    try {
      localStorage.setItem(chave, JSON.stringify({
        assinatura: gerarAssinatura(estado.listaOriginal, estado.toStr),
        processados: estado.processados,
        resultados: estado.resultados,
        stats: estado.stats || null,
        ts: new Date().toISOString(),
      }));
    } catch (e) { /* quota exceeded or private browsing */ }
  }

  /**
   * Verifica se existe progresso salvo compatível com a lista fornecida.
   * Se existir, pergunta ao usuário se deseja continuar.
   *
   * @param {string} chave - Chave de storage do módulo.
   * @param {Array} lista - Lista atual de itens.
   * @param {Function} [toStr] - Mesma função usada em salvarProgresso.
   * @param {Function} [confirmFn] - Função de confirmação no contexto da UI.
   * @returns {Object|null} Estado salvo {processados, resultados, stats} ou null.
   */
  function tentarRetomar(chave, lista, toStr, confirmFn) {
    try {
      var salvo = localStorage.getItem(chave);
      if (!salvo) return null;

      var estado = JSON.parse(salvo);
      var assinatura = gerarAssinatura(lista, toStr);

      if (estado.assinatura !== assinatura) {
        localStorage.removeItem(chave);
        return null;
      }

      var nProc = Object.keys(estado.processados).length;
      var confirmar = confirmFn || function (mensagem) { return confirm(mensagem); };
      if (nProc > 0 && confirmar(
        'Progresso anterior encontrado: ' + nProc + '/' + lista.length + ' itens.\n' +
        'Continuar de onde parou?'
      )) {
        return {
          processados: estado.processados,
          resultados: estado.resultados,
          stats: estado.stats || null,
        };
      }

      localStorage.removeItem(chave);
    } catch (e) { }
    return null;
  }

  /**
   * Remove progresso salvo.
   * @param {string} chave
   */
  function limparProgresso(chave) {
    try { localStorage.removeItem(chave); } catch (e) { }
  }

  // ── Exportar ──
  PAINEL.persistence = {
    gerarAssinatura: gerarAssinatura,
    salvarProgresso: salvarProgresso,
    tentarRetomar: tentarRetomar,
    limparProgresso: limparProgresso,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── core/dataIO.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/dataIO.js
 *  Importação (XLSX/manual) e exportação (CSV/XLSX) de dados.
 *  Carregamento do SheetJS via CDN com fallback.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  var _XLSXLib = null;

  /**
   * Carrega a biblioteca SheetJS no contexto de um documento (popup ou page).
   * Tenta CDN principal, depois fallback.
   * @param {Document} docAlvo - Documento onde injetar o <script>.
   * @returns {Promise<Object>} Referência ao XLSX global.
   */
  function carregarSheetJS(docAlvo) {
    return new Promise(function (resolve, reject) {
      // Verificar se já existe em algum contexto
      if (_XLSXLib) { resolve(_XLSXLib); return; }
      if (typeof XLSX !== 'undefined') { _XLSXLib = XLSX; resolve(_XLSXLib); return; }
      var win = docAlvo && docAlvo.defaultView;
      if (win && win.XLSX) { _XLSXLib = win.XLSX; resolve(_XLSXLib); return; }

      var script = (docAlvo || document).createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = function () {
        _XLSXLib = (win && win.XLSX) || window.XLSX;
        if (_XLSXLib) resolve(_XLSXLib);
        else reject(new Error('SheetJS carregou mas XLSX global não encontrado.'));
      };
      script.onerror = function () {
        // Fallback CDN
        var s2 = (docAlvo || document).createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s2.onload = function () {
          _XLSXLib = (win && win.XLSX) || window.XLSX;
          if (_XLSXLib) resolve(_XLSXLib);
          else reject(new Error('Fallback SheetJS falhou.'));
        };
        s2.onerror = function () { reject(new Error('Falha ao carregar SheetJS de ambos CDNs.')); };
        (docAlvo || document).head.appendChild(s2);
      };
      (docAlvo || document).head.appendChild(script);
    });
  }

  /**
   * Retorna a referência ao SheetJS já carregado.
   * @returns {Object|null}
   */
  function getXLSX() {
    return _XLSXLib;
  }

  /**
   * Abre um file picker e parseia um arquivo XLSX/XLS.
   * Retorna a lista de itens processados pela função parseRow.
   *
   * @param {Document} doc - Documento do popup (para criar o input).
   * @param {Object} config - Configuração de parsing:
   *   @param {Function} config.parseRow - Recebe row (array de cells) e retorna item ou null.
   *   @param {boolean} [config.skipHeader=true] - Pular primeira linha.
   *   @param {Function} [config.logFn] - Função de log.
   * @returns {Promise<Array>} Lista de itens parseados.
   */
  function carregarXlsx(doc, config) {
    var logFn = config.logFn || function () { };
    return new Promise(function (resolve, reject) {
      if (!_XLSXLib) { reject(new Error('SheetJS não carregado.')); return; }

      var input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.style.display = 'none';

      input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) { reject(new Error('Nenhum arquivo selecionado.')); return; }
        logFn('Lendo: ' + file.name);

        var reader = new FileReader();
        reader.onload = function (evt) {
          try {
            var data = new Uint8Array(evt.target.result);
            var wb = _XLSXLib.read(data, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var json = _XLSXLib.utils.sheet_to_json(ws, { header: 1 });

            var startIdx = config.skipHeader !== false ? 1 : 0;
            var itens = [];
            for (var i = startIdx; i < json.length; i++) {
              var row = json[i];
              if (!row || row.length === 0) continue;
              var item = config.parseRow(row);
              if (item !== null && item !== undefined) itens.push(item);
            }

            logFn(itens.length + ' itens carregados do arquivo.');
            try { doc.body.removeChild(input); } catch (e2) { }
            resolve(itens);
          } catch (err) { reject(err); }
        };
        reader.onerror = function () { reject(new Error('Erro ao ler arquivo.')); };
        reader.readAsArrayBuffer(file);
      };

      doc.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Exibe prompt para o usuário colar dados manualmente.
   * Parseia cada linha com a função parseRow.
   *
   * @param {string} promptText - Texto do prompt.
   * @param {Function} parseRow - Recebe string de uma linha, retorna item ou null.
   * @param {Object} [options] - Opções de parsing manual.
   * @param {RegExp|Function} [options.lineSplit] - Separador das linhas/itens.
   * @returns {Array} Lista de itens.
   */
  function carregarManual(promptText, parseRow) {
    var texto = prompt(promptText);
    return carregarManualTexto(texto, parseRow);
  }

  /**
   * Parseia texto informado manualmente, sem abrir prompt/modal nativo.
   *
   * @param {string} texto - Conteudo colado pelo usuario.
   * @param {Function} parseRow - Recebe string de uma linha, retorna item ou null.
   * @returns {Array} Lista de itens.
   */
  function carregarManualTexto(texto, parseRow, options) {
    if (!texto) return [];
    options = options || {};
    var lineSplit = options.lineSplit || /[\n;]+/;
    var linhas = (typeof lineSplit === 'function')
      ? lineSplit(String(texto))
      : String(texto).split(lineSplit);
    return linhas
      .map(function (v) { return v.trim(); })
      .filter(function (v) { return v !== ''; })
      .map(parseRow)
      .filter(function (v) { return v !== null && v !== undefined; });
  }

  /**
   * Gera um CSV com BOM UTF-8 e separador ; (padrão Excel Brasil).
   * Dispara download automático.
   *
   * @param {Document} doc - Documento do popup.
   * @param {Array<string>} colunas - Nomes das colunas.
   * @param {Array<Object>} resultados - Array de registros.
   * @param {string} prefixo - Prefixo do nome do arquivo (ex: 'consulta_redes').
   * @param {string} [sufixo] - Sufixo (ex: timestamp).
   */
  function escaparCSV(valor) {
    var v = (valor === null || valor === undefined) ? '' : String(valor);
    if (/[;"\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  function gerarCSV(doc, colunas, resultados, prefixo, sufixo) {
    var linhas = [colunas.map(escaparCSV).join(';')];
    resultados.forEach(function (r) {
      var vals = colunas.map(function (c) {
        return escaparCSV(r[c]);
      });
      linhas.push(vals.join(';'));
    });
    var conteudo = '\uFEFF' + linhas.join('\r\n');
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    _download(doc, blob, prefixo + '_' + (sufixo || PAINEL.utils.timestampSufixo()) + '.csv');
  }

  /**
   * Gera e baixa um arquivo XLSX com dados e aba de resumo.
   *
   * @param {Document} doc - Documento do popup.
   * @param {Object} config
   *   @param {Array<string>} config.colunas - Chaves dos dados.
   *   @param {Array<string>} config.headers - Cabeçalhos legíveis.
   *   @param {Array<Object>} config.dados - Registros.
   *   @param {string} config.nomeAba - Nome da aba principal.
   *   @param {string} config.prefixo - Prefixo do arquivo.
   *   @param {Array<Array>} [config.resumo] - Dados da aba "Resumo".
   */
  function exportarXLSX(doc, config) {
    if (!_XLSXLib) { alert('SheetJS não carregado.'); return; }

    var wsData = [config.headers];
    for (var i = 0; i < config.dados.length; i++) {
      var row = [];
      for (var j = 0; j < config.colunas.length; j++) {
        row.push(config.dados[i][config.colunas[j]] || '');
      }
      wsData.push(row);
    }

    var wb = _XLSXLib.utils.book_new();
    var ws = _XLSXLib.utils.aoa_to_sheet(wsData);
    ws['!cols'] = config.headers.map(function (h) { return { wch: Math.max(h.length + 2, 15) }; });
    _XLSXLib.utils.book_append_sheet(wb, ws, config.nomeAba || 'Dados');

    if (config.resumo) {
      var wsR = _XLSXLib.utils.aoa_to_sheet(config.resumo);
      wsR['!cols'] = [{ wch: 25 }, { wch: 30 }];
      _XLSXLib.utils.book_append_sheet(wb, wsR, 'Resumo');
    }

    var wbout = _XLSXLib.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    _download(doc, blob, config.prefixo + '_' + PAINEL.utils.timestampSufixo() + '.xlsx');
  }

  /**
   * Helper interno para disparar download.
   */
  function _download(doc, blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Exportar ──
  PAINEL.dataIO = {
    carregarSheetJS: carregarSheetJS,
    getXLSX: getXLSX,
    carregarXlsx: carregarXlsx,
    carregarManual: carregarManual,
    carregarManualTexto: carregarManualTexto,
    gerarCSV: gerarCSV,
    exportarXLSX: exportarXLSX,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── core/ui.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/ui.js
 *  Motor de UI: popup, menu de módulos, tela de execução,
 *  log, progresso, timer e orquestração do loop principal.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  var _modulos = [];
  var _pw = null;      // popup window
  var _doc = null;     // popup document

  // ══════════════════════════════════════════════════════════
  //  REGISTRO DE MÓDULOS
  // ══════════════════════════════════════════════════════════

  /**
   * Registra um módulo no painel.
   * @param {Object} mod - Objeto de módulo seguindo o contrato.
   */
  function registrarModulo(mod) {
    _modulos.push(mod);
  }

  // ══════════════════════════════════════════════════════════
  //  CSS DO PAINEL
  // ══════════════════════════════════════════════════════════
  var CSS = [
    'html,body{margin:0;height:100%;overflow:hidden;}',
    'body{background:#0c0c14;color:#ddd;font-family:"Segoe UI",Consolas,monospace;font-size:12px;display:flex;flex-direction:column;}',
    '*{box-sizing:border-box;}',

    /* Header */
    '#hdr{background:linear-gradient(135deg,#0d1b2a,#1b2838);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2a3a4a;flex-shrink:0;}',
    '#hdr .title{color:#56cfe1;font-weight:700;font-size:14px;letter-spacing:0.5px;}',
    '#hdr .subtitle{color:#667;font-size:10px;margin-top:2px;}',

    /* Buttons */
    '.btn{border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;font-family:inherit;transition:all 0.15s ease;font-weight:600;}',
    '.btn:hover{opacity:0.85;transform:translateY(-1px);}',
    '.btn:active{transform:translateY(0);}',
    '.btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;}',
    '.btn-sm{padding:4px 9px;font-size:10px;}',

    /* Menu grid */
    '#menu{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;}',
    '.mod-card{background:#141c28;border:1px solid #1e2d3d;border-radius:6px;padding:10px 12px;cursor:pointer;transition:all 0.2s ease;display:flex;flex-direction:column;gap:4px;}',
    '.mod-card:hover{background:#1a2636;border-color:#56cfe1;transform:translateY(-2px);box-shadow:0 4px 12px rgba(86,207,225,0.1);}',
    '.mod-card .mc-icon{font-size:20px;line-height:1;}',
    '.mod-card .mc-nome{font-weight:600;font-size:11px;color:#e0e0e0;}',
    '.mod-card .mc-desc{font-size:9px;color:#667;line-height:1.3;}',
    '.mod-card .mc-tag{display:inline-block;font-size:8px;padding:1px 5px;border-radius:3px;color:#fff;font-weight:600;margin-top:2px;width:fit-content;}',

    /* Exec view */
    '#exec{display:none;flex:1;flex-direction:column;overflow:hidden;}',
    '#actions{padding:8px 12px;border-bottom:1px solid #1e2d3d;flex-shrink:0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
    '#actions .hint{color:#555;font-size:9px;margin-left:6px;}',
    '#manualBox{display:none;padding:8px 12px;border-bottom:1px solid #1e2d3d;background:#101722;flex-shrink:0;}',
    '#manualBox .manual-title{color:#aaa;font-size:10px;margin-bottom:6px;white-space:pre-line;}',
    '#manualInput{width:100%;min-height:92px;max-height:180px;resize:vertical;background:#0b1020;color:#e8e8e8;border:1px solid #26364a;border-radius:4px;padding:8px;font-family:Consolas,monospace;font-size:11px;line-height:1.4;outline:none;}',
    '#manualInput:focus{border-color:#9b59b6;box-shadow:0 0 0 1px rgba(155,89,182,0.35);}',
    '#manualBox .manual-actions{display:flex;gap:6px;align-items:center;margin-top:6px;}',
    '#manualBox .manual-count{color:#667;font-size:9px;margin-left:auto;}',
    '#info{padding:8px 12px;flex-shrink:0;}',
    '#pt{margin-bottom:5px;color:#aaa;font-size:11px;}',
    '#pbar-bg{background:#1a1a2e;border-radius:4px;height:8px;overflow:hidden;}',
    '#pb{height:8px;width:0%;transition:width 0.3s ease;border-radius:4px;}',
    '#st{margin-top:6px;letter-spacing:0.5px;font-size:11px;}',
    '#tm{margin-top:3px;color:#555;font-size:10px;}',
    '#logarea{flex:1 1 auto;overflow-y:auto;padding:6px 12px 10px;border-top:1px solid #111;min-height:0;}',
    '.log-line{padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);white-space:pre-wrap;word-break:break-all;font-size:11px;font-family:Consolas,monospace;line-height:1.4;}',
  ].join('\n');

  // ══════════════════════════════════════════════════════════
  //  CRIAR POPUP
  // ══════════════════════════════════════════════════════════

  /**
   * Abre ou reutiliza o popup do painel.
   * @returns {{pw: Window, doc: Document}}
   */
  function abrirPopup() {
    if (_pw && !_pw.closed) {
      _pw.focus();
      return { pw: _pw, doc: _doc };
    }

    _pw = window.open('', '__painel_unificado__',
      'width=700,height=620,top=40,left=40,resizable=yes,scrollbars=no,toolbar=no,menubar=no');

    if (!_pw) {
      alert('Popup bloqueado! Permita popups para este site e tente novamente.');
      return null;
    }

    _pw.document.open();
    _pw.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Painel Automações</title>' +
      '<style>' + CSS + '</style>' +
      '</head><body>' +

      /* Header */
      '<div id="hdr">' +
        '<div>' +
          '<div class="title">⚡ Painel de Automações</div>' +
          '<div class="subtitle">SAT • SIACH • VROL</div>' +
        '</div>' +
        '<div id="hdr-btns">' +
          '<button class="btn btn-sm" id="btnVoltar" style="background:#334;color:#aaa;display:none;">← Menu</button>' +
        '</div>' +
      '</div>' +

      /* Menu view */
      '<div id="menu"></div>' +

      /* Exec view */
      '<div id="exec">' +
        '<div id="actions"></div>' +
        '<div id="manualBox"></div>' +
        '<div id="info">' +
          '<div id="pt">Aguardando input...</div>' +
          '<div id="pbar-bg"><div id="pb"></div></div>' +
          '<div id="st"></div>' +
          '<div id="tm">⏱ 00:00</div>' +
        '</div>' +
        '<div id="logarea"></div>' +
      '</div>' +

      '</body></html>'
    );
    _pw.document.close();
    _doc = _pw.document;

    // Cleanup on close
    _pw.addEventListener('beforeunload', function () {
      PAINEL.network.pararTodosKeepalives();
    });

    renderizarMenu();
    _vincularVoltar();

    return { pw: _pw, doc: _doc };
  }

  // ══════════════════════════════════════════════════════════
  //  RENDERIZAR MENU DE MÓDULOS
  // ══════════════════════════════════════════════════════════

  function renderizarMenu() {
    if (!_doc) return;
    var menuDiv = _doc.getElementById('menu');
    if (!menuDiv) return;
    menuDiv.innerHTML = '';

    var cores = {
      'SAT': '#1e6f5c',
      'SIACH': '#0077b6',
      'SAT+VROL': '#7b2d8e',
      'SAT+SIACH': '#d4740e',
    };

    _modulos.forEach(function (mod, idx) {
      var card = _doc.createElement('div');
      card.className = 'mod-card';
      card.innerHTML =
        '<div class="mc-icon">' + (mod.icone || '📋') + '</div>' +
        '<div class="mc-nome">' + mod.nome + '</div>' +
        '<div class="mc-desc">' + (mod.descricao || '') + '</div>' +
        '<div class="mc-tag" style="background:' + (cores[mod.sistema] || '#444') + ';">' +
          mod.sistema +
        '</div>';
      card.addEventListener('click', function () { iniciarModulo(mod); });
      menuDiv.appendChild(card);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NAVEGAÇÃO MENU ↔ EXECUÇÃO
  // ══════════════════════════════════════════════════════════

  function mostrarExec() {
    if (!_doc) return;
    _doc.getElementById('menu').style.display = 'none';
    _doc.getElementById('exec').style.display = 'flex';
    _doc.getElementById('btnVoltar').style.display = '';
  }

  function mostrarMenu() {
    if (!_doc) return;
    _doc.getElementById('menu').style.display = 'grid';
    _doc.getElementById('exec').style.display = 'none';
    _doc.getElementById('btnVoltar').style.display = 'none';
    PAINEL.network.pararTodosKeepalives();
    renderizarMenu();
  }

  function confirmarNoPainel(mensagem) {
    var painelWin = (_doc && _doc.defaultView) || _pw || window;
    if (painelWin.focus) painelWin.focus();
    return painelWin.confirm(mensagem);
  }

  function _vincularVoltar() {
    var btn = _doc.getElementById('btnVoltar');
    if (btn) btn.addEventListener('click', function () {
      if (confirmarNoPainel('Voltar ao menu? O progresso do módulo atual será mantido.')) {
        mostrarMenu();
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  FUNÇÕES DE UI (log, progresso, timer)
  // ══════════════════════════════════════════════════════════

  function addLog(txt) {
    if (!_doc) return;
    var logDiv = _doc.getElementById('logarea');
    if (!logDiv) return;
    var d = _doc.createElement('div');
    d.className = 'log-line';
    d.textContent = txt;
    logDiv.appendChild(d);
    while (logDiv.children.length > 400) logDiv.removeChild(logDiv.firstChild);
    setTimeout(function () { logDiv.scrollTop = logDiv.scrollHeight; }, 0);
  }

  function updateOverlay(atual, total, stats, inicioTs, corBarra) {
    if (!_doc) return;
    var pct = total > 0 ? Math.round(atual / total * 100) : 0;
    var pb = _doc.getElementById('pb');
    var pt = _doc.getElementById('pt');
    var st = _doc.getElementById('st');
    var tm = _doc.getElementById('tm');

    if (pb) {
      pb.style.width = pct + '%';
      pb.style.background = corBarra || 'linear-gradient(90deg,#56cfe1,#2ecc71)';
    }
    if (pt) pt.textContent = '[' + atual + '/' + total + '] ' + pct + '%';

    if (st && stats) {
      var parts = [];
      Object.keys(stats).forEach(function (k) {
        parts.push(k + ': ' + stats[k]);
      });
      st.textContent = parts.join('  │  ');
    }

    if (inicioTs > 0 && tm) {
      var elapsed = Math.floor((Date.now() - inicioTs) / 1000);
      var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var ss = String(elapsed % 60).padStart(2, '0');
      var eta = '';
      if (atual > 0 && atual < total) {
        var restSec = Math.floor(elapsed / atual * (total - atual));
        eta = ' │ ETA: ' + String(Math.floor(restSec / 60)).padStart(2, '0') +
          ':' + String(restSec % 60).padStart(2, '0');
      }
      tm.textContent = '⏱ ' + mm + ':' + ss + eta;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  INICIAR MÓDULO — Monta UI + orquestra execução
  // ══════════════════════════════════════════════════════════

  function iniciarModulo(mod) {
    mostrarExec();

    // Limpar estado visual
    var logDiv = _doc.getElementById('logarea');
    if (logDiv) logDiv.innerHTML = '';
    var pt = _doc.getElementById('pt');
    if (pt) pt.textContent = 'Aguardando input...';
    var pb = _doc.getElementById('pb');
    if (pb) pb.style.width = '0%';
    var st = _doc.getElementById('st');
    if (st) st.textContent = '';
    var tm = _doc.getElementById('tm');
    if (tm) tm.textContent = '⏱ 00:00';
    var hdr = _doc.getElementById('hdr');
    if (hdr) hdr.style.background = '';

    // Atualizar título
    var titleEl = _doc.querySelector('#hdr .title');
    if (titleEl) titleEl.textContent = (mod.icone || '📋') + ' ' + mod.nome;

    addLog('Módulo carregado: ' + mod.nome);
    addLog('Sistema: ' + mod.sistema);

    // Montar actions
    var actDiv = _doc.getElementById('actions');
    actDiv.innerHTML = '';
    var manualBox = _doc.getElementById('manualBox');
    if (manualBox) {
      manualBox.innerHTML = '';
      manualBox.style.display = 'none';
    }

    // Botão XLSX
    var btnXlsx = _doc.createElement('button');
    btnXlsx.className = 'btn';
    btnXlsx.style.cssText = 'background:#3498db;color:#fff;';
    btnXlsx.textContent = '▶ Carregar XLSX';
    actDiv.appendChild(btnXlsx);

    // Botão Manual
    var btnManual = _doc.createElement('button');
    btnManual.className = 'btn';
    btnManual.style.cssText = 'background:#9b59b6;color:#fff;';
    btnManual.textContent = '▶ Manual';
    actDiv.appendChild(btnManual);

    // Botão CSV parcial
    var btnCsv = _doc.createElement('button');
    btnCsv.className = 'btn btn-sm';
    btnCsv.style.cssText = 'background:#2ecc71;color:#fff;';
    btnCsv.textContent = '⇩ CSV parcial';
    actDiv.appendChild(btnCsv);

    // Botão Parar
    var btnStop = _doc.createElement('button');
    btnStop.className = 'btn btn-sm';
    btnStop.style.cssText = 'background:#e74c3c;color:#fff;';
    btnStop.textContent = '■ Parar';
    actDiv.appendChild(btnStop);

    // Hint
    if (mod.inputConfig && mod.inputConfig.instrucao) {
      var hint = _doc.createElement('span');
      hint.className = 'hint';
      hint.textContent = mod.inputConfig.instrucao;
      actDiv.appendChild(hint);
    }

    // Config UI extra (ex: dropdown bandeira)
    if (mod.configUI) mod.configUI(_doc);

    // Area de input manual dentro do proprio painel
    var parseManual = mod.inputConfig.parseManual || function (line) {
      return mod.inputConfig.parseRow([line]);
    };
    var manualInput = null;
    var manualCount = null;
    var btnManualRun = null;

    var manualLineSplit = mod.inputConfig.manualLineSplit || /[\n;]+/;

    function dividirEntradasManual(texto) {
      if (!texto) return [];
      return (typeof manualLineSplit === 'function')
        ? manualLineSplit(String(texto))
        : String(texto).split(manualLineSplit);
    }

    function contarEntradasManual(texto) {
      if (!texto) return 0;
      return dividirEntradasManual(texto)
        .map(function (v) { return v.trim(); })
        .filter(function (v) { return v !== ''; })
        .length;
    }

    function atualizarContagemManual() {
      if (!manualInput || !manualCount) return;
      var qtd = contarEntradasManual(manualInput.value);
      manualCount.textContent = qtd + (qtd === 1 ? ' item' : ' itens');
    }

    if (manualBox) {
      var manualTitle = _doc.createElement('div');
      manualTitle.className = 'manual-title';
      manualTitle.textContent = mod.inputConfig.promptManual || 'Cole os itens (um por linha):';

      manualInput = _doc.createElement('textarea');
      manualInput.id = 'manualInput';
      manualInput.placeholder = 'Cole os itens aqui';
      manualInput.spellcheck = false;

      var manualActions = _doc.createElement('div');
      manualActions.className = 'manual-actions';

      btnManualRun = _doc.createElement('button');
      btnManualRun.className = 'btn';
      btnManualRun.style.cssText = 'background:#9b59b6;color:#fff;';
      btnManualRun.textContent = 'Processar';

      var btnManualCancel = _doc.createElement('button');
      btnManualCancel.className = 'btn btn-sm';
      btnManualCancel.style.cssText = 'background:#334;color:#aaa;';
      btnManualCancel.textContent = 'Cancelar';

      manualCount = _doc.createElement('span');
      manualCount.className = 'manual-count';
      manualCount.textContent = '0 itens';

      manualActions.appendChild(btnManualRun);
      manualActions.appendChild(btnManualCancel);
      manualActions.appendChild(manualCount);
      manualBox.appendChild(manualTitle);
      manualBox.appendChild(manualInput);
      manualBox.appendChild(manualActions);

      manualInput.addEventListener('input', atualizarContagemManual);
      manualInput.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && btnManualRun) {
          btnManualRun.click();
        }
      });
      btnManualCancel.addEventListener('click', function () {
        manualBox.style.display = 'none';
      });
    }

    // ── Estado de execução ──
    var _parar = false;
    var _resultados = [];

    btnStop.addEventListener('click', function () {
      _parar = true;
      btnStop.textContent = 'Parando...';
      btnStop.disabled = true;
      btnStop.style.background = '#888';
      addLog('>>> Parada solicitada. Aguardando fim do item atual...');
    });

    btnCsv.addEventListener('click', function () {
      if (_resultados.length === 0) { addLog('Nenhum resultado para exportar.'); return; }
      if (mod.exportFormat === 'xlsx') {
        addLog('Exportação XLSX parcial não implementada. Use CSV.');
      }
      PAINEL.dataIO.gerarCSV(_doc, mod.csvCols, _resultados, mod.id, 'parcial_' + PAINEL.utils.timestampSufixo());
    });

    // ── Função de execução do lote ──
    async function executarLote(lista) {
      if (!lista || lista.length === 0) { addLog('Nenhum item para processar.'); return; }

      // Reset
      _parar = false;
      _resultados = [];
      var processados = {};
      var stats = { '✅': 0, '❌': 0 };
      var inicioTs = Date.now();

      // Keepalive
      if (mod.keepaliveConfig) {
        PAINEL.network.iniciarKeepalive(
          mod.id, mod.keepaliveConfig.url, mod.keepaliveConfig.body,
          { logFn: addLog, credentials: mod.keepaliveConfig.credentials }
        );
      }

      // Inicialização do módulo (ex: navegação inicial SAT)
      if (mod.inicializar) {
        addLog('Inicializando módulo...');
        try {
          await mod.inicializar({
            network: PAINEL.network, utils: PAINEL.utils,
            dataIO: PAINEL.dataIO, addLog: addLog, doc: _doc,
          });
        } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') {
            addLog('>>> SESSÃO EXPIRADA durante inicialização.');
            PAINEL.network.pararTodosKeepalives();
            return;
          }
          addLog('AVISO: Inicialização falhou — ' + e.message);
        }
      }

      // Retomada
      var toStr = mod.inputConfig.toStr || String;
      var estadoSalvo = PAINEL.persistence.tentarRetomar(
        mod.storageKey || ('_painel_' + mod.id),
        lista,
        toStr,
        confirmarNoPainel
      );
      var paraProcessar = lista.slice();

      if (estadoSalvo) {
        processados = estadoSalvo.processados;
        _resultados = estadoSalvo.resultados;
        if (estadoSalvo.stats) stats = estadoSalvo.stats;
        paraProcessar = lista.filter(function (it) { return !processados[toStr(it)]; });
        addLog('Retomando: ' + paraProcessar.length + ' itens restantes.');
      }

      var total = lista.length;
      var jaProcessados = Object.keys(processados).length;
      var sessaoExp = false;

      addLog('Início │ Total: ' + total + ' │ A processar: ' + paraProcessar.length);

      // Esconder ações de input
      btnXlsx.style.display = 'none';
      btnManual.style.display = 'none';
      if (manualBox) manualBox.style.display = 'none';

      for (var i = 0; i < paraProcessar.length; i++) {
        var item = paraProcessar[i];
        var chaveItem = toStr(item);
        var idxGlobal = jaProcessados + i + 1;
        var largura = String(total).length;
        var prefixo = '[' + String(idxGlobal).padStart(largura, '0') + '/' + total + ']';

        if (_parar) {
          addLog('>>> Processamento interrompido no item ' + (i + 1) + '.');
          PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
            listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
          });
          var ptE = _doc.getElementById('pt');
          if (ptE) ptE.textContent = 'PARADO — reabra o painel para continuar.';
          break;
        }

        updateOverlay(idxGlobal, total, stats, inicioTs, mod.cor);

        try {
          var regs = await mod.processarUm(item, {
            addLog: addLog,
            network: PAINEL.network,
            utils: PAINEL.utils,
            dataIO: PAINEL.dataIO,
            doc: _doc,
          });

          // processarUm pode retornar um objeto ou array de objetos
          if (!Array.isArray(regs)) regs = [regs];
          var itemOk = true;
          regs.forEach(function (reg) {
            _resultados.push(reg);
            var ok = !reg.STATUS || reg.STATUS === 'OK' || reg.STATUS.indexOf('OK') === 0;
            if (!ok) itemOk = false;
          });
          if (itemOk) stats['✅']++; else stats['❌']++;

          // Log customizado ou default
          if (mod.logItem) {
            mod.logItem(prefixo, item, regs, addLog);
          } else {
            var firstReg = regs[0];
            var statusTxt = firstReg.STATUS || 'OK';
            addLog(prefixo + ' ' + statusTxt + ' │ ' + chaveItem);
          }

        } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') {
            addLog('>>> SESSÃO EXPIRADA no item ' + (i + 1) + '. Progresso salvo.');
            PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
              listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
            });
            sessaoExp = true;
            var hdrE = _doc.getElementById('hdr');
            if (hdrE) hdrE.style.background = 'linear-gradient(135deg,#5c0000,#2a0000)';
            var ptE2 = _doc.getElementById('pt');
            if (ptE2) ptE2.textContent = 'SESSÃO EXPIRADA — faça login e reabra o painel.';
            break;
          }
          stats['❌']++;
          var regErro = {};
          mod.csvCols.forEach(function (c) { regErro[c] = ''; });
          regErro.STATUS = 'ERRO: ' + e.message;
          _resultados.push(regErro);
          addLog(prefixo + ' ERRO │ ' + chaveItem + ' │ ' + e.message);
        }

        processados[chaveItem] = true;
        PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
          listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
        });

        // Controle de intervalo e lotes
        if (!sessaoExp && !_parar && i < paraProcessar.length - 1) {
          if (mod.tamLote && ((i + 1) % mod.tamLote === 0)) {
            var numLote = Math.ceil((i + 1) / mod.tamLote);
            addLog('--- Lote ' + numLote + ' concluído. Pausa de ' + ((mod.pausaLoteMS || 3000) / 1000) + 's...');
            await PAINEL.utils.esperar(mod.pausaLoteMS || 3000);
            addLog('--- Retomando...');
          } else {
            await PAINEL.utils.esperar(mod.intervaloMS || 300);
          }
        }
      }

      // Finalização
      updateOverlay(total, total, stats, inicioTs, mod.cor);
      addLog('');
      addLog('══════════ RESUMO ══════════');
      Object.keys(stats).forEach(function (k) {
        addLog('  ' + k + ' : ' + stats[k]);
      });
      addLog('  TOTAL : ' + total);

      if (!sessaoExp && !_parar) {
        PAINEL.persistence.limparProgresso(mod.storageKey || ('_painel_' + mod.id));
        if (mod.exportFormat === 'xlsx') {
          PAINEL.dataIO.exportarXLSX(_doc, {
            colunas: mod.csvCols,
            headers: mod.xlsxHeaders || mod.csvCols,
            dados: _resultados,
            nomeAba: mod.nome,
            prefixo: mod.id,
            resumo: mod.gerarResumo ? mod.gerarResumo(_resultados, stats) : null,
          });
        } else {
          PAINEL.dataIO.gerarCSV(_doc, mod.csvCols, _resultados, mod.id);
        }
      }

      PAINEL.network.pararTodosKeepalives();

      // Mostrar botões novamente
      btnXlsx.style.display = '';
      btnManual.style.display = '';
      btnStop.textContent = '■ Parar';
      btnStop.disabled = false;
      btnStop.style.background = '#e74c3c';
    }

    // ── Vincular eventos de input ──
    btnXlsx.addEventListener('click', async function () {
      try {
        await PAINEL.dataIO.carregarSheetJS(_doc);
        var lista = await PAINEL.dataIO.carregarXlsx(_doc, {
          parseRow: mod.inputConfig.parseRow,
          skipHeader: mod.inputConfig.skipHeader !== false,
          logFn: addLog,
        });
        await executarLote(lista);
      } catch (e) {
        addLog('ERRO: ' + e.message);
      }
    });

    btnManual.addEventListener('click', function () {
      if (!manualBox || !manualInput) {
        addLog('ERRO: campo manual nao encontrado no painel.');
        return;
      }
      manualBox.style.display = 'block';
      atualizarContagemManual();
      setTimeout(function () { manualInput.focus(); }, 0);
    });

    if (btnManualRun) {
      btnManualRun.addEventListener('click', async function () {
        var lista;
        try {
          lista = PAINEL.dataIO.carregarManualTexto(manualInput.value, parseManual, {
            lineSplit: manualLineSplit,
          });
        } catch (e) {
          addLog('ERRO no input manual: ' + e.message);
          return;
        }

        if (lista.length > 0) {
          addLog(lista.length + ' itens informados manualmente.');
          btnManualRun.disabled = true;
          try {
            await PAINEL.dataIO.carregarSheetJS(_doc);
          } catch (e) { /* ok se não precisar de XLSX para manual */ }
          try {
            await executarLote(lista);
          } finally {
            btnManualRun.disabled = false;
          }
        } else {
          addLog('Nenhum item informado.');
          manualInput.focus();
        }
      });
    }

    addLog('Pronto. Selecione o XLSX ou insira manualmente.');
  }

  // ══════════════════════════════════════════════════════════
  //  BOTÃO FLUTUANTE (injetado na página SAT/SIACH)
  // ══════════════════════════════════════════════════════════

  /**
   * Encontra o melhor document para injetar o botão flutuante.
   * O SAT usa framesets — document.body é <frameset>, não <body>.
   * Tentamos: body real → frames visíveis → fallback abrirPopup direto.
   */
  function _encontrarDocAlvo() {
    // 1. Documento atual tem body real (não frameset)?
    if (document.body && document.body.tagName !== 'FRAMESET') {
      return document;
    }
    // 2. Tentar frames/iframes visíveis
    var frames = document.querySelectorAll('frame, iframe');
    for (var i = 0; i < frames.length; i++) {
      try {
        var fd = frames[i].contentDocument || frames[i].contentWindow.document;
        if (fd && fd.body && fd.body.tagName !== 'FRAMESET') {
          return fd;
        }
      } catch (e) { /* cross-origin, skip */ }
    }
    // 3. Tentar recursivamente em sub-frames
    for (var i = 0; i < frames.length; i++) {
      try {
        var fd = frames[i].contentDocument || frames[i].contentWindow.document;
        if (!fd) continue;
        var subFrames = fd.querySelectorAll('frame, iframe');
        for (var j = 0; j < subFrames.length; j++) {
          try {
            var sfd = subFrames[j].contentDocument || subFrames[j].contentWindow.document;
            if (sfd && sfd.body && sfd.body.tagName !== 'FRAMESET') {
              return sfd;
            }
          } catch (e2) { }
        }
      } catch (e) { }
    }
    return null;
  }

  /**
   * Injeta um botão flutuante no canto inferior direito da página.
   * Ao clicar, abre o popup do painel.
   * Lida com framesets (SAT) injetando no primeiro frame com <body> real.
   * Se não encontrar alvo, abre o popup diretamente.
   */
  function injetarBotaoFlutuante() {
    var docAlvo = _encontrarDocAlvo();

    if (!docAlvo) {
      console.warn('[Painel] Nenhum body encontrado (frameset). Abrindo popup direto...');
      abrirPopup();
      return;
    }

    // Evitar duplicatas
    if (docAlvo.getElementById('__painel_fab__')) return;

    var fab = docAlvo.createElement('div');
    fab.id = '__painel_fab__';
    fab.innerHTML = '⚡';
    fab.title = 'Painel de Automações (ou digite painelAbrir() no console)';
    fab.style.cssText = [
      'position:fixed;bottom:20px;right:20px;z-index:999999;',
      'width:48px;height:48px;border-radius:50%;',
      'background:linear-gradient(135deg,#56cfe1,#3498db);',
      'color:#fff;font-size:22px;',
      'display:flex;align-items:center;justify-content:center;',
      'cursor:pointer;box-shadow:0 4px 16px rgba(52,152,219,0.4);',
      'transition:all 0.2s ease;user-select:none;',
    ].join('');

    fab.addEventListener('mouseenter', function () {
      fab.style.transform = 'scale(1.1)';
      fab.style.boxShadow = '0 6px 20px rgba(52,152,219,0.6)';
    });
    fab.addEventListener('mouseleave', function () {
      fab.style.transform = 'scale(1)';
      fab.style.boxShadow = '0 4px 16px rgba(52,152,219,0.4)';
    });
    fab.addEventListener('click', function () {
      abrirPopup();
    });

    docAlvo.body.appendChild(fab);
    console.log('[Painel] Botão ⚡ injetado com sucesso.');
  }

  // ── Exportar ──
  PAINEL.ui = {
    registrarModulo: registrarModulo,
    abrirPopup: abrirPopup,
    mostrarMenu: mostrarMenu,
    injetarBotaoFlutuante: injetarBotaoFlutuante,
    addLog: addLog,
    updateOverlay: updateOverlay,
  };

  // Atalho direto no core
  PAINEL.registrarModulo = registrarModulo;

  // Atalho global para abrir via console: painelAbrir()
  window.painelAbrir = abrirPopup;

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_compra_segura.js ──
/**
 * MÓDULO: Extrator Compra Segura (ServletAjax)
 * Extrai MODO_ENTRADA, MODO_SEGURANÇA e CODSOLINC
 * usando pesquisaDeOcorrencias + getMessageIncoming.
 * Similar ao detalhe_direto mas focado em classificação de segurança.
 */
(function (PAINEL) {
  'use strict';

  var SAT_AJAX = '/sat/servlet/ServletAjax';
  var SAT_DIRECTOR = '/sat/servlet/ServletDirector';
  var MODOS_SEGUROS = { 1: ['05', '07'], 7: ['05', '83'], 2: ['C', 'M'] };

  var CSV_COLS = [
    'NUMINC', 'PROTOCOLO', 'CODSOLINC', 'TIPFRAN', 'BANDEIRA',
    'SECOPE', 'MODO_ENTRADA', 'MODO_SEGURANCA', 'SEGURO', 'STATUS',
  ];

  function classificarSeguro(tipfran, modoEntrada) {
    var tip = parseInt(tipfran);
    var me = String(modoEntrada || '').trim();
    if (!me || !MODOS_SEGUROS[tip]) return '';
    return MODOS_SEGUROS[tip].indexOf(me) !== -1 ? 'Sim' : 'Não';
  }

  async function satPesquisaOcorrencia(numinc, network) {
    var response = await network.postInclude(SAT_AJAX, {
      FUNCTION: 'pesquisaDeOcorrencias',
      CODENT: '0104',
      NUMINCSELECT: String(numinc),
      Peticion: 'unitariaIncidenciasSOL',
    }, 'application/x-www-form-urlencoded;charset=ISO-8859-15');

    if (response.indexOf('MPA0070') !== -1 || response.indexOf('MPE0004') !== -1)
      return { status: 'undone', reason: 'não existe no SAT' };
    if (response.indexOf('ERROR :') !== -1) {
      var m = response.match(/ERROR\s*:([A-Za-z0-9]+)/);
      return { status: 'undone', reason: 'erro SAT: ' + (m ? m[1] : '?') };
    }
    var campos = PAINEL.utils.parseSIDATOS(response);
    return {
      status: 'done', SECOPE: campos.SECOPE || '',
      TIPFRAN: campos.TIPFRAN || '', CODSOLINC: campos.CODSOLINC || '',
    };
  }

  async function satGetMessageIncoming(tipfran, secope, network) {
    var html = await network.postInclude(SAT_DIRECTOR, {
      FUNCTION: 'getMessageIncoming', CODENT: '0104',
      TIPFRAN: String(tipfran), SECOPE: String(secope),
      sNombreMenuAnt: '0078', sNombreMenuAct: '0602',
      sNombreEvento: '0602', sIdWindowPadre: 'FrameProducto',
      conFranquicias: 'true',
    });
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var me = '', ms = '', tip = parseInt(tipfran);
    var xp = PAINEL.utils.extractByXPath;

    if (tip === 1) {
      me = xp(doc, "//td[text()='Visa- Pos 162-163 - Pos Entry Mode']");
      ms = xp(doc, "//td[text()='Visa- Pos 116 - MOTO ECI Indicator']");
    } else if (tip === 2) {
      me = xp(doc, "//td[text()='MC - DE22 Subfield 7 - Card Imput Mode']");
      ms = xp(doc, "//td[text()='MC - PDS 52 - ELECTR COMER SEC LEVEL']");
    } else if (tip === 7) {
      me = xp(doc, "//td[text()='Elo - Campo 26 - Modo Entrada']");
      ms = xp(doc, "//td[text()='Elo - Campo 38 - Ind Moto-Com Eletr']");
    } else if (tip === 14) {
      me = xp(doc, "//td[text()='Elo Int-campo 65- Modo de Entrada PAN']");
      ms = xp(doc, "//td[text()='Elo Int-campo 67-p339- Cap.dados Cartao no POS']");
    }
    return { MODO_ENTRADA: me, MODO_SEGURANCA: ms };
  }

  PAINEL.registrarModulo({
    id: 'compra_segura',
    nome: 'Extrator Modo de entrada/Segurança',
    icone: '🛡️',
    cor: 'linear-gradient(90deg,#2ecc71,#27ae60)',
    descricao: 'Classifica transações como Segura/Não Segura por ocorrência',
    sistema: 'SAT',
    storageKey: '_sat_compra_segura_v1',
    intervaloMS: 200,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMINC, col B = PROTOCOLO (opcional)',
      promptManual: 'Cole as ocorrências (uma por linha):',
      parseRow: function (row) {
        var v = String(row[0] || '').trim();
        if (!v) return null;
        return { numinc: v, protocolo: String(row[1] || '').trim() };
      },
      parseManual: function (line) {
        var parts = line.split(/[,;\t]/);
        var v = parts[0].trim();
        return v ? { numinc: v, protocolo: (parts[1] || '').trim() } : null;
      },
      toStr: function (item) { return item.numinc; },
    },
    keepaliveConfig: {
      url: SAT_DIRECTOR, body: 'FUNCTION=keepalive&CODENT=0104', credentials: 'include',
    },
    processarUm: async function (item, core) {
      var reg = {
        NUMINC: item.numinc, PROTOCOLO: item.protocolo || '',
        CODSOLINC: '', TIPFRAN: '', BANDEIRA: '', SECOPE: '',
        MODO_ENTRADA: '', MODO_SEGURANCA: '', SEGURO: '', STATUS: 'OK',
      };

      var resPesq = await satPesquisaOcorrencia(item.numinc, core.network);
      if (resPesq.status !== 'done') { reg.STATUS = resPesq.reason || 'NAO ENCONTRADO'; return reg; }

      reg.CODSOLINC = resPesq.CODSOLINC;
      reg.TIPFRAN = resPesq.TIPFRAN;
      reg.BANDEIRA = PAINEL.utils.CODIGO_PARA_BANDEIRA[resPesq.TIPFRAN] || '';
      reg.SECOPE = resPesq.SECOPE;

      if (resPesq.SECOPE) {
        await core.utils.esperar(300);
        var resMI = await satGetMessageIncoming(resPesq.TIPFRAN, resPesq.SECOPE, core.network);
        reg.MODO_ENTRADA = resMI.MODO_ENTRADA || '';
        reg.MODO_SEGURANCA = resMI.MODO_SEGURANCA || '';
        reg.SEGURO = classificarSeguro(resPesq.TIPFRAN, reg.MODO_ENTRADA);
      } else {
        reg.STATUS = 'OK (sem SECOPE)';
      }
      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' ' + (r.SEGURO || '?') + ' | ' + item.numinc + ' | ME=' + r.MODO_ENTRADA);
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item.numinc);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_consulta_completa.js ──
/**
 * MÓDULO: Consulta Completa de Expedientes (SAT Menu 0209)
 * Extrai TODOS os campos das páginas de busca e detalhe do SAT.
 * Pipeline: passo1(navegar) → passo2(pesquisar) → passo2b(incidências) → passo3(detalhe).
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    CODENT: '0104', CODPAIS: '76', CODPERFIL: 'BK05',
    DESCODENT: 'CAIXA ECONOMICA FEDERAL', MENU: '0209',
  };

  var CAMPOS_DETALHE = [
    'NUMREF', 'PANB', 'CLAMON', 'NOMCOMRED', 'CODACT',
    'NUMAUT', 'FECFAC', 'CODRAZ', 'CODENT', 'CODREG',
    'MODOOBTAUT', 'CODTERM', 'FECCIERRE', 'INDDEBCRE', 'INDPLAVEN',
    'CODENTEMI', 'INDANUL', 'INDRET', 'FECCONTA', 'REFERMERCAN',
    'CODPROECI', 'CODSOLCON', 'TIPOSOL', 'DESSOLINC', 'CODSUBFRA',
    'NUMREFREM', 'CODRAZCHA', 'FECCONTASOL', 'CLAMONDIV', 'CODACTESP', 'TIPOFAC',
  ];

  var CSV_COLS = [
    'NUMEXP', 'PAN', 'PROTOCOLO', 'TIPOEXP', 'DESTIPOEXP',
    'CODCOM', 'TIPFRAN', 'DESFRARED', 'FECALTA', 'INDSITEXP',
    'IMPFAC', 'VINCVOUCHER', 'NUCASO',
    'NUMREF', 'PANB', 'CLAMON', 'NOMCOMRED', 'CODACT',
    'NUMAUT', 'FECFAC', 'CODRAZ', 'CODENT', 'CODREG',
    'MODOOBTAUT', 'CODTERM', 'FECCIERRE', 'INDDEBCRE', 'INDPLAVEN',
    'CODENTEMI', 'INDANUL', 'INDRET', 'FECCONTA', 'REFERMERCAN',
    'CODPROECI', 'CODSOLCON', 'TIPOSOL', 'DESSOLINC', 'CODSUBFRA',
    'NUMREFREM', 'CODRAZCHA', 'FECCONTASOL', 'CLAMONDIV', 'CODACTESP',
    'TIPOFAC', 'DESTIPFAC', 'STATUS',
  ];

  async function passo1(network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      CODPERFIL: CONFIG.CODPERFIL, CODENT: CONFIG.CODENT, CODPAIS: CONFIG.CODPAIS,
      DESCODENT: CONFIG.DESCODENT, DESENTIDAD: CONFIG.DESCODENT,
      AUX_CODPERFIL: CONFIG.CODPERFIL, PROCESOSCRITICOS: '', NoCapaProteccion: 'S',
      sNombreMenuAnt: '', sNombreMenuAct: CONFIG.MENU,
      indexPrincipal: ['true', 'true', 'true', 'true', 'true', 'true'],
      sNombreEvento: CONFIG.MENU, sIdWindow: w, sIdWindowPadre: 'FrameProducto', sTarget: w,
    });
  }

  async function passo2(numExp, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'VENGOBUS', value: 'Y' }, { name: 'PANTJERARQUICA', value: 'Y' },
      { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'radioTipoFiltro', value: 'Expedientes' }, { name: 'RadioFiltro', value: 'on' },
      { name: 'NUMEXP', value: numExp }, { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'TIPOPROTOCOLO', value: 'N' }, { name: 'MIGRACION', value: 'N' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'buscarGnral' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  async function passo2b(numExp, dadosBusca, network) {
    try {
      var htmlInc = await network.post(CONFIG.SERVLET_AJAX, {
        REQUEST_TYPE: 'AJAX', CODENT: CONFIG.CODENT, CODPAIS2: CONFIG.CODPAIS,
        bOcultarBtn: 'S', bIncidencia: 'N', VENGOBUS: 'Y', PANTJERARQUICA: 'Y',
        NUMEXPFILTRO: numExp, FILTREPOREXPEDIENTE: 'S', PageBusquedaExpedientes: 'Y',
        radioTipoFiltro: 'Expedientes', RadioFiltro: 'on', NUMEXP: numExp,
        PAN: (dadosBusca && dadosBusca.PAN) || '',
        TIPFRAN: (dadosBusca && dadosBusca.TIPFRAN) || '',
        CODCOM: (dadosBusca && dadosBusca.CODCOM) || '',
        FECALTA: (dadosBusca && dadosBusca.FECALTA) || '',
        INDSITEXP: (dadosBusca && dadosBusca.INDSITEXP) || '',
        Peticion: 'ListadoEXP', sClave: numExp, MOTIPOEXP: 'F',
      });
      var reInci = /ConsultaInci\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/;
      var m = htmlInc.match(reInci);
      if (m) {
        var args = [], ra = /'([^']*)'/g, am;
        while ((am = ra.exec(m[1])) !== null) args.push(am[1]);
        return args[2] || '';
      }
    } catch (e) { }
    return '';
  }

  async function passo3(numExp, dadosBusca, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'CODPAIS2', value: CONFIG.CODPAIS }, { name: 'VENGOBUS', value: 'Y' },
      { name: 'PANTJERARQUICA', value: 'Y' }, { name: 'NUMEXPFILTRO', value: numExp },
      { name: 'FILTREPOREXPEDIENTE', value: 'S' }, { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'NUMINC', value: numExp },
      { name: 'NUMEXP', value: (dadosBusca && dadosBusca.CODCOM) || '' },
      { name: 'PAN', value: (dadosBusca && dadosBusca.PAN) || '' },
      { name: 'TIPFRAN', value: (dadosBusca && dadosBusca.TIPFRAN) || '' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'selectIncidenciasB' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  function extrairDadosBusca(html) {
    var resultados = [];
    var re = /Consulta\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/g;
    var match, vistos = {};
    while ((match = re.exec(html)) !== null) {
      var args = [], ra = /'([^']*)'/g, am;
      while ((am = ra.exec(match[1])) !== null) args.push(am[1]);
      var chave = args[2] + '|' + args[3];
      if (vistos[chave]) continue;
      vistos[chave] = true;
      resultados.push({
        NUMEXP: args[2] || '', PAN: args[3] || '', PROTOCOLO: args[4] || '',
        TIPOEXP: args[5] || '', DESTIPOEXP: args[6] || '', CODCOM: args[7] || '',
        TIPFRAN: args[8] || '', DESFRARED: args[9] || '', FECALTA: args[10] || '',
        INDSITEXP: args[11] || '', IMPFAC: args[18] || '',
        VINCVOUCHER: args[19] || '', NUCASO: args[20] || '',
      });
    }
    return resultados;
  }

  PAINEL.registrarModulo({
    id: 'consulta_completa',
    nome: 'Extrator de Informações de Ocorrências',
    icone: '📊',
    cor: 'linear-gradient(90deg,#3498db,#2ecc71)',
    descricao: 'Extrai TODOS os campos de busca + detalhe por NUMEXP',
    sistema: 'SAT',
    storageKey: '_sat_completa_v1',
    intervaloMS: 200,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMEXP',
      promptManual: 'Cole os expedientes (um por linha):',
      parseRow: function (row) { var v = String(row[0] || '').trim(); return v || null; },
      parseManual: function (line) { return line.trim() || null; },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    processarUm: async function (numExp, core) {
      var reg = { STATUS: 'OK' };
      CSV_COLS.forEach(function (c) { if (!reg[c]) reg[c] = ''; });
      reg.NUMEXP = numExp;

      await passo1(core.network);
      await core.utils.esperar(400);

      var htmlBusca = await passo2(numExp, core.network);
      var dados = extrairDadosBusca(htmlBusca);
      if (dados.length === 0) { reg.STATUS = 'OCORRENCIA NAO ENCONTRADA'; return reg; }

      var db = dados[0];
      ['NUMEXP','PAN','PROTOCOLO','TIPOEXP','DESTIPOEXP','CODCOM','TIPFRAN',
       'DESFRARED','FECALTA','INDSITEXP','IMPFAC','VINCVOUCHER','NUCASO'
      ].forEach(function (k) { reg[k] = db[k] || ''; });

      reg.DESTIPFAC = await passo2b(numExp, db, core.network);
      await core.utils.esperar(400);

      var htmlDetalhe = await passo3(numExp, db, core.network);
      CAMPOS_DETALHE.forEach(function (campo) {
        reg[campo] = core.utils.extrairCampoHTML(htmlDetalhe, campo);
      });

      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item + ' | PAN=' + (r.PAN||'-').slice(-4));
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_consulta_redes.js ──
/**
 * ═══════════════════════════════════════════════════════════
 *  MÓDULO: Consulta Redes (SAT Menu 0311)
 *
 *  Pesquisa em lote no Histórico de Redes por ARN, extrai todos
 *  os campos da tabela de resultados.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    CODENT: '0104',
    MENU: '0311',
  };

  var CSV_COLS = [
    'ARN_BUSCADO', 'TIPFRAN_BUSCADO', 'SECOPE', 'PAN', 'PAN_DIFERENTE',
    'DATA_COMPRA', 'CODIGO_AUTORIZACAO', 'NOME_COMERCIO', 'TIPO_FATURA_DESC',
    'TIPO_OCORRENCIA_DESC', 'ARN', 'VALOR_OPERACAO', 'MOEDA_DESC',
    'VINCULACAO_VOUCHER', 'NUM_PARCELA_TOTAL', 'CODIGO_COMERCIO',
    'DATA_INCLUSAO', 'SEC_LOTE', 'TID_DET', 'CODIGO_MOEDA', 'CONTCUR',
    'STATUS',
  ];

  /**
   * Faz a requisição POST ao ServletDirector replicando o evento
   * 'buscarGnral' do menu 0311 (Pesquisa De Histórico De Redes).
   */
  async function buscarPorARN(arn, tipoRede, network) {
    var sIdWindow = network.getSessionId() + 'Interface';

    var params = {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: '', SECOPE: '', NUMREF: '', PAN: '',
      FECOPER: '',
      TIPFRANFILTRO: tipoRede, SECOPEBFILTRO: '', PANBFILTRO: '',
      NUMREFBFILTRO: arn,
      TIPOFACFILTRO: '', TIPOINCFILTRO: '',
      FECOPERIFILTRO: '', FECOPERFFILTRO: '',
      FECALTAIFILTRO: '', FECALTAFFILTRO: '',
      FRANQUICIA: '', TIPFRAN: tipoRede,
      SECOPEB: '',
      filtros: '2',
      PANB: '',
      NUMREFB: arn,
      TIPOFAC: '', TIPOINC: '',
      FECOPERI: '', FECOPERF: '',
      FECALTAI: '', FECALTAF: '',
      sNombreMenuAnt: CONFIG.MENU,
      sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: 'buscarGnral',
      sIdWindow: sIdWindow,
      sIdWindowPadre: 'FrameProducto',
      selFranquicias: 'true',
    };

    return await network.post(CONFIG.SERVLET_DIRECTOR, params);
  }

  /**
   * Parseia o HTML de resposta e extrai os dados de cada linha da tabela.
   * Localiza a tabela 'Listado_*' e extrai os argumentos da função
   * JavaScript Consulta1() embutida em cada <a onclick>.
   */
  function extrairDadosDaResposta(html, arnBuscado) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var tabela = doc.querySelector('table[id^="Listado_"]');
    if (!tabela) return [];

    var resultadosExtraidos = [];
    var linhas = tabela.querySelectorAll('tr');

    for (var i = 1; i < linhas.length; i++) {
      var linha = linhas[i];
      var primeiroLink = linha.querySelector('a[onclick]');
      if (!primeiroLink) continue;

      var onclick = primeiroLink.getAttribute('onclick');
      if (!onclick || onclick.indexOf('Consulta1') === -1) continue;

      var matchArgs = onclick.match(/Consulta1\([^,]+,(.+?)\);event/);
      if (!matchArgs) continue;

      var argsStr = matchArgs[1];
      var args = [];
      var atual = '';
      var dentroAspas = false;
      for (var c = 0; c < argsStr.length; c++) {
        var ch = argsStr[c];
        if (ch === "'" && !dentroAspas) {
          dentroAspas = true;
        } else if (ch === "'" && dentroAspas) {
          dentroAspas = false;
        } else if (ch === ',' && !dentroAspas) {
          args.push(atual);
          atual = '';
        } else {
          atual += ch;
        }
      }
      args.push(atual);

      if (args.length >= 19) {
        resultadosExtraidos.push({
          ARN_BUSCADO: arnBuscado,
          TIPFRAN_BUSCADO: '',
          SECOPE: args[0] || '',
          PAN: args[1] || '',
          DATA_COMPRA: args[2] || '',
          CODIGO_AUTORIZACAO: args[3] || '',
          NOME_COMERCIO: args[4] || '',
          TIPO_FATURA_DESC: args[5] || '',
          TIPO_OCORRENCIA_DESC: args[6] || '',
          ARN: args[7] || '',
          VALOR_OPERACAO: args[8] || '',
          MOEDA_DESC: args[9] || '',
          VINCULACAO_VOUCHER: args[10] || '',
          NUM_PARCELA_TOTAL: args[11] || '',
          CODIGO_COMERCIO: args[12] || '',
          DATA_INCLUSAO: args[13] || '',
          SEC_LOTE: args[14] || '',
          TID_DET: args[15] || '',
          CODIGO_MOEDA: args[16] || '',
          CONTCUR: args[17] || '',
          STATUS: 'OK',
        });
      }
    }

    return resultadosExtraidos;
  }

  // ── Registrar módulo no painel ──
  PAINEL.registrarModulo({
    id: 'consulta_redes',
    nome: 'Consulta Histórico de Redes',
    icone: '🌐',
    cor: 'linear-gradient(90deg,#00b4d8,#0077b6)',
    descricao: 'Extrator de informações do ARN no Histórico de Redes',
    sistema: 'SAT',
    storageKey: '_sat_redes_v1',
    intervaloMS: 300,

    csvCols: CSV_COLS,
    exportFormat: 'csv',

    inputConfig: {
      instrucao: 'XLSX: col A = ARN, col B = TIPFRAN (1=VISA, 2=MC, 7=ELO)',
      promptManual: 'Cole os ARNs (um por linha).\nFormato opcional: ARN,TIPFRAN\n(Padrão TIPFRAN = 2 Mastercard)',
      parseRow: function (row) {
        var arn = String(row[0] || '').trim();
        if (!arn) return null;
        return { arn: arn, tipfran: String(row[1] || '2').trim() };
      },
      parseManual: function (line) {
        var parts = line.split(/[,;\t]/);
        var arn = parts[0].trim();
        if (!arn) return null;
        return { arn: arn, tipfran: (parts[1] || '2').trim() };
      },
      toStr: function (item) { return item.arn; },
    },

    keepaliveConfig: {
      url: CONFIG.SERVLET_AJAX,
      body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO',
    },

    /**
     * Processa um único item (ARN + bandeira).
     * Retorna array de registros extraídos da tabela SAT.
     */
    processarUm: async function (item, core) {
      var arn = item.arn;
      var tipoRede = item.tipfran;

      var htmlBusca = await buscarPorARN(arn, tipoRede, core.network);
      var dados = extrairDadosDaResposta(htmlBusca, arn);

      if (dados.length === 0) {
        var regVazio = {};
        CSV_COLS.forEach(function (c) { regVazio[c] = ''; });
        regVazio.ARN_BUSCADO = arn;
        regVazio.TIPFRAN_BUSCADO = tipoRede;
        regVazio.STATUS = 'SEM RESULTADO';
        return [regVazio];
      }

      // Preenche TIPFRAN_BUSCADO e analisa PANs
      var pansUnicos = {};
      dados.forEach(function (d) {
        d.TIPFRAN_BUSCADO = tipoRede;
        if (d.PAN) pansUnicos[d.PAN] = true;
      });
      var temPanDiferente = Object.keys(pansUnicos).length > 1 ? 'SIM' : 'NAO';
      dados.forEach(function (d) { d.PAN_DIFERENTE = temPanDiferente; });

      return dados;
    },

    /**
     * Log customizado por item processado.
     */
    logItem: function (prefixo, item, regs, addLog) {
      var first = regs[0];
      if (first.STATUS !== 'OK' && first.STATUS !== '') {
        addLog(prefixo + ' ' + first.STATUS + ' │ ARN=' + item.arn);
      } else {
        addLog(prefixo + ' OK (' + regs.length + ' reg) │ ARN=' + item.arn +
          ' │ PAN=' + (first.PAN || '-'));
      }
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_detalhe_direto.js ──
/**
 * MÓDULO: SAT Detalhe Direto (ServletAjax)
 * Extrai CODSOLINC, INDSITEXP, MODO_ENTRADA, MODO_SEGURANÇA
 * usando pesquisaDeOcorrencias + getMessageIncoming.
 */
(function (PAINEL) {
  'use strict';

  var SAT_AJAX = '/sat/servlet/ServletAjax';
  var SAT_DIRECTOR = '/sat/servlet/ServletDirector';
  var MODOS_SEGUROS = { 1: ['05', '07'], 7: ['05', '83'], 2: ['C', 'M'] };

  var CSV_COLS = [
    'NUMINC', 'CODSOLINC', 'INDSITEXP', 'TIPFRAN', 'BANDEIRA',
    'SECOPE', 'MODO_ENTRADA', 'MODO_SEGURANCA', 'SEGURO', 'STATUS',
  ];

  function classificarSeguro(tipfran, modoEntrada) {
    var tip = parseInt(tipfran);
    var me = String(modoEntrada || '').trim();
    if (!me || !MODOS_SEGUROS[tip]) return '';
    return MODOS_SEGUROS[tip].indexOf(me) !== -1 ? 'Sim' : 'Não';
  }

  async function satPesquisaOcorrencia(numinc, network) {
    var response = await network.postInclude(SAT_AJAX, {
      FUNCTION: 'pesquisaDeOcorrencias',
      CODENT: '0104',
      NUMINCSELECT: String(numinc),
      Peticion: 'unitariaIncidenciasSOL',
    }, 'application/x-www-form-urlencoded;charset=ISO-8859-15');

    if (response.indexOf('MPA0070') !== -1 || response.indexOf('MPE0004') !== -1)
      return { status: 'undone', reason: 'não existe no SAT' };
    if (response.indexOf('ERROR :') !== -1) {
      var m = response.match(/ERROR\s*:([A-Za-z0-9]+)/);
      return { status: 'undone', reason: 'erro SAT: ' + (m ? m[1] : '?') };
    }

    var campos = PAINEL.utils.parseSIDATOS(response);
    return {
      status: 'done',
      SECOPE: campos.SECOPE || '',
      TIPFRAN: campos.TIPFRAN || '',
      CODSOLINC: campos.CODSOLINC || '',
      INDSITEXP: campos.INDSITEXP || '',
    };
  }

  async function satGetMessageIncoming(tipfran, secope, network) {
    var html = await network.postInclude(SAT_DIRECTOR, {
      FUNCTION: 'getMessageIncoming',
      CODENT: '0104',
      TIPFRAN: String(tipfran),
      SECOPE: String(secope),
      sNombreMenuAnt: '0078',
      sNombreMenuAct: '0602',
      sNombreEvento: '0602',
      sIdWindowPadre: 'FrameProducto',
      conFranquicias: 'true',
    });

    var doc = new DOMParser().parseFromString(html, 'text/html');
    var me = '', ms = '';
    var tip = parseInt(tipfran);
    var xp = PAINEL.utils.extractByXPath;

    if (tip === 1) {
      me = xp(doc, "//td[text()='Visa- Pos 162-163 - Pos Entry Mode']");
      ms = xp(doc, "//td[text()='Visa- Pos 116 - MOTO ECI Indicator']");
    } else if (tip === 2) {
      me = xp(doc, "//td[text()='MC - DE22 Subfield 7 - Card Imput Mode']");
      ms = xp(doc, "//td[text()='MC - PDS 52 - ELECTR COMER SEC LEVEL']");
    } else if (tip === 7) {
      me = xp(doc, "//td[text()='Elo - Campo 26 - Modo Entrada']");
      ms = xp(doc, "//td[text()='Elo - Campo 38 - Ind Moto-Com Eletr']");
    } else if (tip === 14) {
      me = xp(doc, "//td[text()='Elo Int-campo 65- Modo de Entrada PAN']");
      ms = xp(doc, "//td[text()='Elo Int-campo 67-p339- Cap.dados Cartao no POS']");
    }

    return { MODO_ENTRADA: me, MODO_SEGURANCA: ms };
  }

  PAINEL.registrarModulo({
    id: 'detalhe_direto',
    nome: 'Consulta Solução de Ocorrência',
    icone: '🔎',
    cor: 'linear-gradient(90deg,#f39c12,#e67e22)',
    descricao: 'Código de solução + Modo Entrada/Segurança de ocorrência',
    sistema: 'SAT',
    storageKey: '_sat_detalhe_direto_v2',
    intervaloMS: 200,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMINC (número de ocorrência)',
      promptManual: 'Cole as ocorrências (uma por linha):',
      parseRow: function (row) { var v = String(row[0] || '').trim(); return v || null; },
      parseManual: function (line) { var v = line.trim(); return v || null; },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: {
      url: SAT_DIRECTOR,
      body: 'FUNCTION=keepalive&CODENT=0104',
      credentials: 'include',
    },
    processarUm: async function (numinc, core) {
      var reg = {
        NUMINC: numinc, CODSOLINC: '', INDSITEXP: '', TIPFRAN: '', BANDEIRA: '',
        SECOPE: '', MODO_ENTRADA: '', MODO_SEGURANCA: '', SEGURO: '', STATUS: 'OK',
      };

      var resPesq = await satPesquisaOcorrencia(numinc, core.network);
      if (resPesq.status !== 'done') {
        reg.STATUS = resPesq.reason || 'NAO ENCONTRADO';
        return reg;
      }

      reg.CODSOLINC = resPesq.CODSOLINC;
      reg.INDSITEXP = resPesq.INDSITEXP;
      reg.TIPFRAN = resPesq.TIPFRAN;
      reg.BANDEIRA = PAINEL.utils.CODIGO_PARA_BANDEIRA[resPesq.TIPFRAN] || '';
      reg.SECOPE = resPesq.SECOPE;

      if (resPesq.SECOPE) {
        await core.utils.esperar(300);
        var resMI = await satGetMessageIncoming(resPesq.TIPFRAN, resPesq.SECOPE, core.network);
        reg.MODO_ENTRADA = resMI.MODO_ENTRADA || '';
        reg.MODO_SEGURANCA = resMI.MODO_SEGURANCA || '';
        reg.SEGURO = classificarSeguro(resPesq.TIPFRAN, reg.MODO_ENTRADA);
      } else {
        reg.STATUS = 'OK (sem SECOPE)';
      }

      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item + ' | SOL=' + r.CODSOLINC + ' ME=' + r.MODO_ENTRADA);
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_incoming_voucher.js ──
/**
 * MÓDULO: Mensagem Incoming Voucher por ARN (SAT Menu 0311→0884)
 * Pipeline: buscarGnral → encontrarLinha001/SIM → detalhe → voucher → extrairDados.
 * Extrai Acquirer Ref Number e Valor Compra-Parcela.
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    CODENT: '0104', MENU: '0311',
  };

  var CSV_COLS = [
    'ARN_ORIGINAL', 'BANDEIRA', 'ARN_VOUCHER',
    'VALOR_VOUCHER_RAW', 'VALOR_VOUCHER_NORMALIZADO', 'STATUS',
  ];

  function normalizarValor(raw) {
    if (!raw || raw.trim() === '') return '';
    var limpo = raw.replace(/\D/g, '');
    if (limpo.length < 3) return limpo;
    var inteiro = limpo.slice(0, -2).replace(/^0+/, '') || '0';
    return inteiro + ',' + limpo.slice(-2);
  }

  // ── Passo 1: Buscar ARN no 0311 ──
  async function buscarPorARN(arn, tipoRede, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: '', SECOPE: '', NUMREF: '', PAN: '', FECOPER: '',
      TIPFRANFILTRO: tipoRede, NUMREFBFILTRO: arn,
      FRANQUICIA: '', TIPFRAN: tipoRede,
      SECOPEB: '', filtros: '2', PANB: '', NUMREFB: arn,
      sNombreMenuAnt: CONFIG.MENU, sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: 'buscarGnral',
      sIdWindow: w, sIdWindowPadre: 'FrameProducto',
      selFranquicias: 'true',
    });
  }

  // ── Passo 2: Encontrar linha 001/SIM ──
  function encontrarLinhaVoucher(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var tabela = doc.querySelector('table[id^="Listado_"]');
    if (!tabela) return null;
    var linhas = tabela.querySelectorAll('tr');
    for (var i = 1; i < linhas.length; i++) {
      var link = linhas[i].querySelector('a[onclick]');
      if (!link) continue;
      var onclick = link.getAttribute('onclick');
      if (!onclick || onclick.indexOf('Consulta1') === -1) continue;
      var matchArgs = onclick.match(/Consulta1\([^,]+,(.+?)\);event/);
      if (!matchArgs) continue;
      var argsStr = matchArgs[1], args = [], atual = '', dentroAspas = false;
      for (var c = 0; c < argsStr.length; c++) {
        var ch = argsStr[c];
        if (ch === "'" && !dentroAspas) dentroAspas = true;
        else if (ch === "'" && dentroAspas) dentroAspas = false;
        else if (ch === ',' && !dentroAspas) { args.push(atual); atual = ''; }
        else atual += ch;
      }
      args.push(atual);
      var vincvoucher = (args[10] || '').trim().toUpperCase();
      var numTotParc = (args[11] || '').trim();
      if (numTotParc.indexOf('001') === 0 && vincvoucher === 'SIM') {
        return {
          secope: args[0]||'', pan: args[1]||'', fecoper: args[2]||'',
          codaut: args[3]||'', nomcom: args[4]||'', tipofac: args[5]||'',
          tipoinc: args[6]||'', numref: args[7]||'', impoper: args[8]||'',
          desclamon: args[9]||'', contcur: args[17]||'',
          codcom: args[12]||'', fecalta: args[13]||'',
          seclote: args[14]||'', tiddet: args[15]||'', clamon: args[16]||'',
        };
      }
    }
    return null;
  }

  // ── Passo 3: Navegar para detalhe ──
  async function navegarDetalhe(arn, tipoRede, args, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: args.codcom, SECOPE: args.secope, NUMREF: args.numref,
      PAN: args.pan, FECOPER: args.fecoper,
      TIPFRANFILTRO: tipoRede, NUMREFBFILTRO: arn,
      FRANQUICIA: '', TIPFRAN: tipoRede, filtros: '1',
      SECOPEB: '', PANB: '', NUMREFB: arn,
      TIPOINC: args.tipoinc, TIPOFAC: args.tipofac, DESINC: args.tipoinc,
      SECLOTE: args.seclote, TIDDET: args.tiddet,
      IMPOPER: args.impoper, CLAMON: args.clamon,
      DESCLAMON: args.desclamon, CONTCUR: args.contcur,
      PANTPAGFRCLOL1: '001', INDMASDATOSFRCLOL1: 'N',
      sNombreMenuAnt: CONFIG.MENU, sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: 'selectConsultaFranquiciasLista1',
      sIdWindow: w, sIdWindowPadre: 'FrameProducto', selFranquicias: 'true',
    });
  }

  // ── Passo 4: Navegar para Mensagem Incoming Voucher (0884) ──
  async function navegarVoucher(detalheHtml, args, arn, tipoRede, network) {
    var w = network.getSessionId() + 'Interface';
    var doc = new DOMParser().parseFromString(detalheHtml, 'text/html');
    var form = doc.querySelector('form[name="FormSAT"], form#FormSAT');
    var params = {};
    if (form) {
      var inputs = form.querySelectorAll('input[name], select[name]');
      for (var i = 0; i < inputs.length; i++) {
        var name = inputs[i].getAttribute('name');
        if (name) params[name] = inputs[i].getAttribute('value') || '';
      }
    }
    // Campos críticos
    params.HISTORICODEREDES = params.HISTORICODEREDES || 'Y';
    params.SECOPEORIGEM = params.SECOPEORIGEM || params.SECOPEB || args.secope;
    params.SECOPECABECERA = params.SECOPECABECERA || params.SECOPEB || args.secope;
    params.NUMREFCABECERA = params.NUMREFCABECERA || params.NUMREFB || arn;
    params.PANCABECERA = params.PANCABECERA || params.PANB || args.pan;
    params.PANTALLA = params.PANTALLA || 'De Histórico De Redes';
    params.SECOPEB = params.SECOPEB || args.secope;
    params.PANB = params.PANB || args.pan;
    params.NUMREFB = params.NUMREFB || arn;
    params.CONTCUR = params.CONTCUR || args.contcur;
    params.TIPFRAN = params.TIPFRAN || tipoRede;
    params.sNombreMenuAnt = CONFIG.MENU;
    params.sNombreMenuAct = '0884';
    params.sNombreEvento = '0884';
    params.sIdWindow = w;
    params.sIdWindowPadre = 'FrameProducto';
    params.selFranquicias = 'true';
    return await network.post(CONFIG.SERVLET_DIRECTOR, params);
  }

  // ── Passo 5: Extrair dados da página de voucher ──
  function extrairDadosVoucher(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var arn = '', valor = '';
    var tds = doc.querySelectorAll('td.FuenteTextoBORDER');
    for (var i = 0; i < tds.length; i++) {
      var label = (tds[i].textContent || '').trim();
      var valorTd = tds[i].nextElementSibling;
      var v = valorTd ? (valorTd.textContent || '').trim() : '';
      if (!arn && (label.indexOf('Acquirer Ref') !== -1 ||
          (label.indexOf('Pos 27-49') !== -1 && label.indexOf('ARN') !== -1))) arn = v;
      if (!valor && (label.indexOf('VALOR COMPRA') !== -1 ||
          (label.indexOf('Pos 62-73') !== -1 && label.indexOf('Dest') !== -1))) valor = v;
    }
    return { acquirerRefNumber: arn, valorCompraRaw: valor, valorCompraNormalizado: normalizarValor(valor) };
  }

  // ── Voltar ao menu de busca ──
  async function voltarParaBusca(network) {
    var w = network.getSessionId() + 'Interface';
    await network.post(CONFIG.SERVLET_DIRECTOR, {
      TKCSRF: '', CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      sNombreMenuAnt: '0884', sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: CONFIG.MENU,
      sIdWindow: w, sIdWindowPadre: 'FrameProducto', selFranquicias: 'true',
    });
  }

  PAINEL.registrarModulo({
    id: 'incoming_voucher',
    nome: 'Vinculação Voucher - Extrator',
    icone: '🎟️',
    cor: 'linear-gradient(90deg,#9b59b6,#8e44ad)',
    descricao: 'Extrai ARN + Valor do voucher por ARN de transação vinculada',
    sistema: 'SAT',
    storageKey: '_sat_incoming_voucher_v1',
    intervaloMS: 500,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = ARN, col B = TIPFRAN (default 2)',
      promptManual: 'Cole os ARNs (um por linha).\nFormato: ARN,TIPFRAN',
      parseRow: function (row) {
        var arn = String(row[0] || '').trim();
        if (!arn) return null;
        var tipfran = (row[1] != null) ? String(row[1]).trim() : '2';
        return { arn: arn, tipfran: tipfran };
      },
      parseManual: function (line) {
        var parts = line.split(/[,;\t]/);
        var arn = parts[0].trim();
        return arn ? { arn: arn, tipfran: (parts[1] || '2').trim() } : null;
      },
      toStr: function (item) { return item.arn; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    processarUm: async function (item, core) {
      var reg = {
        ARN_ORIGINAL: item.arn, BANDEIRA: item.tipfran,
        ARN_VOUCHER: '', VALOR_VOUCHER_RAW: '',
        VALOR_VOUCHER_NORMALIZADO: '', STATUS: 'OK',
      };
      try {
        var htmlBusca = await buscarPorARN(item.arn, item.tipfran, core.network);
        await core.utils.esperar(200);

        var argsLinha = encontrarLinhaVoucher(htmlBusca);
        if (!argsLinha) { reg.STATUS = 'SEM REGISTRO 001/SIM'; return reg; }

        var htmlDetalhe = await navegarDetalhe(item.arn, item.tipfran, argsLinha, core.network);
        await core.utils.esperar(200);

        var htmlVoucher = await navegarVoucher(htmlDetalhe, argsLinha, item.arn, item.tipfran, core.network);
        await core.utils.esperar(200);

        var dados = extrairDadosVoucher(htmlVoucher);
        if (!dados.acquirerRefNumber && !dados.valorCompraRaw) { reg.STATUS = 'VOUCHER SEM DADOS'; return reg; }

        reg.ARN_VOUCHER = dados.acquirerRefNumber;
        reg.VALOR_VOUCHER_RAW = dados.valorCompraRaw;
        reg.VALOR_VOUCHER_NORMALIZADO = dados.valorCompraNormalizado;

        await voltarParaBusca(core.network);
        await core.utils.esperar(200);
      } catch (e) {
        if (e.message === 'SESSAO_EXPIRADA') throw e;
        if (reg.STATUS === 'OK') reg.STATUS = 'ERRO: ' + e.message;
        try { await voltarParaBusca(core.network); } catch (e2) { }
      }
      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item.arn + ' | V=' + r.VALOR_VOUCHER_NORMALIZADO);
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item.arn);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_nucaso.js ──
/**
 * MÓDULO: Consulta NUCASO (SAT Menu 0209)
 * Verifica se NUCASO está preenchido por número de expediente.
 * 2 requisições por item (sem abrir detalhe).
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    CODENT: '0104', CODPAIS: '76', CODPERFIL: 'BK05',
    DESCODENT: 'CAIXA ECONOMICA FEDERAL', MENU: '0209',
  };

  var CSV_COLS = ['NUMEXP', 'NUCASO', 'TEM_CASO', 'STATUS'];

  async function passo1(network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      CODPERFIL: CONFIG.CODPERFIL, CODENT: CONFIG.CODENT, CODPAIS: CONFIG.CODPAIS,
      DESCODENT: CONFIG.DESCODENT, DESENTIDAD: CONFIG.DESCODENT,
      AUX_CODPERFIL: CONFIG.CODPERFIL, PROCESOSCRITICOS: '', NoCapaProteccion: 'S',
      sNombreMenuAnt: '', sNombreMenuAct: CONFIG.MENU,
      indexPrincipal: ['true', 'true', 'true', 'true', 'true', 'true'],
      sNombreEvento: CONFIG.MENU, sIdWindow: w, sIdWindowPadre: 'FrameProducto', sTarget: w,
    });
  }

  async function passo2(numExp, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'IPROTOCOLO', value: '' }, { name: 'FECSOLINC', value: '' },
      { name: 'DESFRARED', value: '' }, { name: 'MAS_DATOS', value: '' }, { name: 'CONTCUR', value: '' },
      { name: 'SELECCION', value: '' }, { name: 'LISTA', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'FILTREPORINCIDENCIA', value: '' }, { name: 'VENGOBUS', value: 'Y' },
      { name: 'PANTJERARQUICA', value: 'Y' }, { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'radioTipoFiltro', value: 'Expedientes' }, { name: 'RadioFiltro', value: 'on' },
      { name: 'NUMEXP', value: numExp }, { name: 'TIPOPROTOCOLO', value: 'N' },
      { name: 'MIGRACION', value: 'N' }, { name: 'CODSOLINC', value: '' },
      { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'buscarGnral' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  function extrairNucaso(html) {
    var re = /Consulta\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/;
    var m = html.match(re);
    if (!m) return null;
    var args = [], ra = /'([^']*)'/g, am;
    while ((am = ra.exec(m[1])) !== null) args.push(am[1]);
    return args[20] || '';
  }

  PAINEL.registrarModulo({
    id: 'nucaso',
    nome: 'Extrator de número de caso de bandeira',
    icone: '🏷️',
    cor: 'linear-gradient(90deg,#f1c40f,#f39c12)',
    descricao: 'Extrai o número do caso de bandeira por número de ocorrência',
    sistema: 'SAT',
    storageKey: '_sat_nucaso_v1',
    intervaloMS: 100,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMEXP',
      promptManual: 'Cole os expedientes (um por linha):',
      parseRow: function (row) { var v = String(row[0] || '').trim(); return v || null; },
      parseManual: function (line) { var v = line.trim(); return v || null; },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    inicializar: async function (core) {
      await passo1(core.network);
      await core.utils.esperar(200);
    },
    processarUm: async function (numExp, core) {
      var html = await passo2(numExp, core.network);
      var v = extrairNucaso(html);
      if (v === null) return { NUMEXP: numExp, NUCASO: '', TEM_CASO: '', STATUS: 'OCORRENCIA NAO ENCONTRADA' };
      var temCaso = (v && v.trim() !== '') ? 'SIM' : 'NAO';
      return { NUMEXP: numExp, NUCASO: v, TEM_CASO: temCaso, STATUS: 'OK' };
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item + ' | Caso: ' + r.NUCASO);
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_reportes_fraude.js ──
/**
 * MÓDULO: Consulta Reportes de Fraude (SAT Menu 0181)
 * Consulta em lote de reportes de fraude por NUMEXP + TIPFRAN.
 * Usa lotes de 120 itens com pausa entre lotes.
 */
(function (PAINEL) {
  'use strict';

  var BASE = '/sat/servlet';

  var CSV_COLS = [
    'DataHora', 'NumeroExpediente', 'TIPFRAN', 'STATUS',
    'PAN', 'DESFRAUDE', 'DESSITUAC', 'DESINDSIT',
    'Estabelecimento', 'NUMREF', 'CONTCUR',
  ];

  function limparCampo(valor) {
    return String(valor == null ? '' : valor).trim().replace(/^["']+|["']+$/g, '');
  }

  function montarItem(numexpValor, tipfranValor) {
    var numexp = limparCampo(numexpValor);
    if (!numexp || !/^\d+$/.test(numexp)) return null;

    var tipfran = limparCampo(tipfranValor);
    if (!tipfran || !/^\d+$/.test(tipfran)) tipfran = '1';

    return { numexp: numexp, tipfran: tipfran };
  }

  function getDataHoje() {
    try { if (typeof sFechaSistema !== 'undefined' && sFechaSistema) return sFechaSistema; } catch (e) { }
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
  }

  async function buscarRegistros(NUMEXPAUX, tipfran, network, utils) {
    var sessionId = network.getSessionId();
    var sIdWindow = sessionId + 'Interface';
    var dataHoje = getDataHoje();

    // Pre-request AJAX
    await network.post(BASE + '/ServletAjax', {
      REQUEST_TYPE: 'AJAX', Peticion: 'VALIDATRANSMTO',
      EventoEjecutar: 'deleteAndGoesToRecordConsHistoricoFranquiciasII',
      OperacionSolicitada: 'BUSCAR',
    });

    // Main search request
    var htmlBusca = await network.post(BASE + '/ServletDirector', {
      TKCSRF: '', IPROTOCOLO: '', NUMREFD: '', PAND: '',
      DESFRAUDE: '', CONTCUR: '', CODSUBF: '', INDPAG: '',
      DESCLAMONLIQ: '', DESINDNORC: '', VALIDAR: '',
      TIPOBUSQUEDA: 'P', OPERACION: '', TITULO: '', DESSUBFRAUDE: '',
      CODENT: '0104', EXIBIRLISTAGEM: 'S', SWITCHPAIS: '',
      CODPAIS: '', OPCION: 'A', PageGestaoFraude: 'Y',
      PageBusquedaExpedientes: '', VENHOMSGINCOMING: '',
      PageDetalhaOcorrencia: '', showMenuDetalhaOcorrencia: '',
      sFechaSistema: dataHoje, INDSITFRAUDE: '', TIPFRAN: tipfran,
      PAN: '', SECOPE: '', SITUACION: '', DESSITUAC: '',
      CODFRAUDE: '', FECOPER: '', INDSITFRAUD: '', DESINDSIT: '',
      CODSUBFRAUDE: '', FECALTA: '', USUARIO: 'USUARIO',
      TIDDET: '', SECOPEORI: '', CODAUT: '', NUMREF: '',
      FECOPERD: '', FECCONTA: '', NOMCOM: '', INDNORCOR: '',
      TIPOFAC: '', DESTIPOFAC: '', NUMEXP: '', CLAMONLIQ: '', IMPLIQ: '',
      nombreJSP: 'consHistoricoFranquiciasII',
      PRIMERA_CARGA_consHistoricoFranquiciasII: '',
      operacionestado: '', operacionCRITICA: 'BUSCAR', condes: '',
      sDireccion: '', BusquedaRealizada: '',
      TxtEventoEjecutar: 'deleteAndGoesToRecordConsHistoricoFranquiciasII',
      TxtOperacionSolicitada: 'BUSCAR',
      USUARIOCRITICOMTO: '', CLAVEUSUARIOCRITICOMTO: '',
      BusquedaMANTok: 'Y', OCULTAFILTROS: '',
      TIPFRANAUX: tipfran, PANAUX: '', NUMREFAUX: '',
      NUMEXPAUX: NUMEXPAUX,
      FECOPERAUX: '', FECALTAAUX: '', SITFRAUDEAUX: '', INDSITFRAUDEAUX: '',
      sNombreMenuAnt: '0181', sNombreMenuAct: '0181',
      sNombreEvento: 'viewConsHistoricoFranquiciasII',
      sIdWindow: sIdWindow, sIdWindowPadre: 'FrameProducto',
      consHistoricoFranquiciasII: 'true',
    });

    // Parse results
    var registrosVistos = {};
    var reConsulta = /Consulta\(getFormulario[^,]+,\s*([^)]+)\)/g;
    var mc;
    while ((mc = reConsulta.exec(htmlBusca)) !== null) {
      var reSingleQ = /'([^']*)'/g;
      var a = [], sq;
      while ((sq = reSingleQ.exec(mc[1])) !== null) a.push(sq[1]);
      if (a[20] && !registrosVistos[a[20]]) registrosVistos[a[20]] = a;
    }
    return Object.values(registrosVistos);
  }

  PAINEL.registrarModulo({
    id: 'reportes_fraude',
    nome: 'Consulta Reportes de Fraude',
    icone: '🚨',
    cor: 'linear-gradient(90deg,#e74c3c,#c0392b)',
    descricao: 'Consulta reportes de fraude em lote por ocorrência (ELO e VISA)',
    sistema: 'SAT',
    storageKey: '_consulta_reportes_v1',
    intervaloMS: 50,
    tamLote: 120,
    pausaLoteMS: 2000,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMEXP, col B = TIPFRAN (default 1)',
      promptManual: 'Cole os expedientes (um por linha).\nFormato: NUMEXP,TIPFRAN',
      manualLineSplit: /\r?\n/,
      parseRow: function (row) {
        return montarItem(row[0], row[1]);
      },
      parseManual: function (line) {
        var parts = String(line || '').split(/[,;\t_]/);
        return montarItem(parts[0], parts[1]);
      },
      toStr: function (item) { return item.numexp + ',' + item.tipfran; },
    },
    keepaliveConfig: {
      url: BASE + '/ServletAjax',
      body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO&EventoEjecutar=deleteAndGoesToRecordConsHistoricoFranquiciasII&OperacionSolicitada=BUSCAR',
    },
    processarUm: async function (item, core) {
      var regs = await buscarRegistros(item.numexp, item.tipfran, core.network, core.utils);
      var ts = core.utils.agora();

      if (regs.length === 0) {
        return {
          DataHora: ts, NumeroExpediente: item.numexp, TIPFRAN: item.tipfran,
          STATUS: 'VAZIO', PAN: '', DESFRAUDE: '', DESSITUAC: '',
          DESINDSIT: '', Estabelecimento: '', NUMREF: '', CONTCUR: '',
        };
      }

      return regs.map(function (a) {
        return {
          DataHora: ts,
          NumeroExpediente: item.numexp,
          TIPFRAN: item.tipfran,
          STATUS: 'ENCONTRADO',
          PAN: a[0] || '',
          DESFRAUDE: a[3] || '',
          DESSITUAC: a[4] || '',
          DESINDSIT: a[5] || '',
          Estabelecimento: a[11] || '',
          NUMREF: a[12] || '',
          CONTCUR: a[20] || '',
        };
      });
    },
    logItem: function (prefixo, item, regs, addLog) {
      var first = regs[0];
      if (first.STATUS === 'VAZIO') addLog(prefixo + ' VAZIO | ' + item.numexp);
      else addLog(prefixo + ' OK (' + regs.length + ' reg) | ' + item.numexp);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_sat_vrol.js ──
/**
 * MÓDULO: SAT + VROL Consulta (SAT 0209 + ws-vcr JSON + VROL API)
 * Pipeline: SAT(passo1→passo2→passo3→NUMREF+PAN) → ws-vcr(getTransacao) → VROL(chargebacks+caseCheck).
 * A consulta principal de transação usa o endpoint JSON /ws-vcr (same-origin, sem ponte).
 * checkCaseBlank e getCountCbks ainda usam a ponte Tampermonkey (domínio vrol.visaonline.com).
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    WS_VCR_BASE: '/ws-vcr/rs/vcr',
    CODENT: '0104', CODPAIS: '76', CODPERFIL: 'BK05',
    DESCODENT: 'CAIXA ECONOMICA FEDERAL', MENU: '0209',
  };

  var CSV_COLS = [
    'NUMEXP', 'VINCVOUCHER', 'TIPO_COMPRA', 'NUMREF',
    'VROL_TRAN_DATE', 'VROL_AMOUNT', 'VROL_MERCHANT', 'VROL_MCC',
    'VROL_TRAN_TYPE', 'VROL_ENTRY_MODE', 'VROL_AUTH_CODE', 'VROL_DISPUTE',
    'VROL_RESPONSE_CODE', 'VROL_INSTALLMENT_COUNT', 'VROL_CARD',
    'CASOS_ABERTOS_VROL', 'CASO_EXISTENTE_VROL', 'STATUS',
  ];

  // ── Mapa de moedas ISO 4217 ──
  var MOEDAS = {
    '986': 'BRL', '840': 'USD', '978': 'EUR', '826': 'GBP',
    '032': 'ARS', '152': 'CLP', '604': 'PEN', '484': 'MXN',
    '600': 'PYG', '858': 'UYU', '170': 'COP', '188': 'CRC',
  };

  // ── Helpers de formatação ──

  /**
   * Converte epoch milliseconds para formato MM/DD/YY.
   * Ex: 1777852800000 → "05/04/26"
   */
  function formatarDataEpoch(epochMs) {
    if (!epochMs) return '';
    var d = new Date(epochMs);
    var mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    var dd = String(d.getUTCDate()).padStart(2, '0');
    var yy = String(d.getUTCFullYear()).slice(-2);
    return mm + '/' + dd + '/' + yy;
  }

  /**
   * Formata valor + código moeda → "18.00 BRL"
   */
  function formatarValor(valor, codigoMoeda) {
    if (valor === null || valor === undefined) return '';
    var sigla = MOEDAS[String(codigoMoeda)] || codigoMoeda || '';
    return String(Number(valor).toFixed(2)) + (sigla ? ' ' + sigla : '');
  }

  /**
   * Monta string do merchant: "NOME LOJISTACIDADE PAIS"
   * Reproduz o formato do HTML do VROL (tudo concatenado).
   */
  function formatarMerchant(nome, cidade, pais) {
    var partes = [nome || ''];
    if (cidade) partes.push(cidade);
    if (pais) partes.push(pais);
    return partes.join('');
  }

  // ── SAT helpers ──

  async function passo1(network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      CODPERFIL: CONFIG.CODPERFIL, CODENT: CONFIG.CODENT, CODPAIS: CONFIG.CODPAIS,
      DESCODENT: CONFIG.DESCODENT, DESENTIDAD: CONFIG.DESCODENT,
      AUX_CODPERFIL: CONFIG.CODPERFIL, PROCESOSCRITICOS: '', NoCapaProteccion: 'S',
      sNombreMenuAnt: '', sNombreMenuAct: CONFIG.MENU,
      indexPrincipal: ['true','true','true','true','true','true'],
      sNombreEvento: CONFIG.MENU, sIdWindow: w, sIdWindowPadre: 'FrameProducto', sTarget: w,
    });
  }

  async function passo2(numExp, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'VENGOBUS', value: 'Y' }, { name: 'PANTJERARQUICA', value: 'Y' },
      { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'radioTipoFiltro', value: 'Expedientes' }, { name: 'RadioFiltro', value: 'on' },
      { name: 'NUMEXP', value: numExp }, { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'TIPOPROTOCOLO', value: 'N' }, { name: 'MIGRACION', value: 'N' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'buscarGnral' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  async function passo3(numExp, db, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'CODPAIS2', value: CONFIG.CODPAIS }, { name: 'VENGOBUS', value: 'Y' },
      { name: 'PANTJERARQUICA', value: 'Y' }, { name: 'NUMEXPFILTRO', value: numExp },
      { name: 'FILTREPOREXPEDIENTE', value: 'S' }, { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'NUMINC', value: numExp },
      { name: 'NUMEXP', value: (db && db.CODCOM) || '' },
      { name: 'PAN', value: (db && db.PAN) || '' },
      { name: 'TIPFRAN', value: (db && db.TIPFRAN) || '' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'selectIncidenciasB' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  function extrairDadosBusca(html) {
    var resultados = [];
    var re = /Consulta\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/g;
    var match, vistos = {};
    while ((match = re.exec(html)) !== null) {
      var args = [], ra = /'([^']*)'/g, am;
      while ((am = ra.exec(match[1])) !== null) args.push(am[1]);
      var chave = args[2] + '|' + args[3];
      if (vistos[chave]) continue; vistos[chave] = true;
      resultados.push({
        NUMEXP: args[2]||'', PAN: args[3]||'', CODCOM: args[7]||'',
        TIPFRAN: args[8]||'', VINCVOUCHER: args[19]||'',
      });
    }
    return resultados;
  }

  // ── ws-vcr (JSON, same-origin) ──

  /**
   * Consulta transação VROL via endpoint REST JSON no mesmo domínio do SAT.
   * POST /ws-vcr/rs/vcr/getTransacao/{NUMREF}/{PAN}/0/N
   * Retorna JSON com dados completos da transação.
   *
   * @param {string} numref - Número de referência (ARN).
   * @param {string} pan - Número do cartão.
   * @returns {Promise<Object>} { status, reason, data }
   */
  async function getTransacaoVCR(numref, pan) {
    if (!numref || !pan) {
      return { status: 'undone', reason: 'NUMREF OU PAN VAZIO', data: null };
    }

    var url = CONFIG.WS_VCR_BASE + '/getTransacao/'
      + encodeURIComponent(numref) + '/'
      + encodeURIComponent(pan) + '/0/N';

    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: '',
        credentials: 'include',
      });

      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          return { status: 'undone', reason: 'SESSAO EXPIRADA', data: null };
        }
        return { status: 'undone', reason: 'HTTP ' + resp.status, data: null };
      }

      var json = await resp.json();

      if (!json || !json.transacao) {
        return { status: 'undone', reason: 'SEM TRANSACAO NO VCR', data: null };
      }

      var t = json.transacao;
      return {
        status: 'done',
        reason: '',
        data: {
          TRANSACTION_DATE_TIME: formatarDataEpoch(t.dataTransacao),
          TOTAL_TRAN_AMOUNT: formatarValor(t.valorTransacao, t.moedaTransacao),
          MERCHANT_LOCATION: formatarMerchant(t.nomeLojista, t.cidadeLojista, t.paisLojista),
          MCC: t.codigoCategoriaLojista || '',
          TRAN_TYPE: t.descricaoTipoTransacao || '',
          ENTRY_MODE: t.modoEntradaPOS || '',
          AUTH_CODE: t.codigoAutorizacao || '',
          RESPONSE_CODE: t.codigoRespostaAutorizacao || '',
          INSTALLMENT_COUNT: (t.numeroParcela || '').trim(),
          CARD: t.numeroCartao || '',
          // Campos extras disponíveis no JSON
          NETWORK_ID: t.idNetwork || '',
          MOTO_ECI: t.motoEciCode || '',
          CPD_SETTLED_DATE: formatarDataEpoch(t.cpd),
          DR_CR: t.descricaoValorTransacao || '',
        },
      };
    } catch (e) {
      return { status: 'undone', reason: 'ERRO VCR: ' + (e.message || e), data: null };
    }
  }

  // ── Ponte VROL (para checkCaseBlank e getCountCbks) ──

  var _ponteAtiva = false;

  function ponteVrolDisponivel() {
    return !!(PAINEL.vrolBridge &&
      PAINEL.vrolBridge.hasGMBridge &&
      PAINEL.vrolBridge.hasGMBridge() &&
      PAINEL.vrolBridge.request);
  }

  async function chamarPonteVrol(action, payload, timeoutMS) {
    if (!ponteVrolDisponivel()) throw new Error('PONTE_VROL_INDISPONIVEL');
    return await PAINEL.vrolBridge.request(action, payload || {}, timeoutMS || 25000);
  }

  async function chamarPonteVrolComRetry(action, payload, timeoutMS) {
    try {
      return await chamarPonteVrol(action, payload, timeoutMS);
    } catch (e) {
      await new Promise(function (resolve) { setTimeout(resolve, 1500); });
      return await chamarPonteVrol(action, payload, timeoutMS);
    }
  }

  async function getCountCbksVrol(options) {
    try {
      return await chamarPonteVrol('getCountCbks', options);
    } catch (e) {
      return { status: 'done', reason: '', data: { casos_abertos: 0 } };
    }
  }

  async function checkCaseBlankVrol(options) {
    try {
      return await chamarPonteVrol('checkCaseBlank', options);
    } catch (e) {
      return { status: 'done', reason: '', data: null };
    }
  }

  function classificarCompra(ic) {
    var v = String(ic || '').trim();
    return (v && v !== '0' && v !== '1') ? 'PARCELADA' : 'A VISTA';
  }

  PAINEL.registrarModulo({
    id: 'sat_vrol',
    nome: 'SAT + VROL Consulta',
    icone: '🌐',
    cor: 'linear-gradient(90deg,#1abc9c,#2980b9)',
    descricao: 'SAT busca + VCR transação (JSON) + VROL disputa/chargeback por NUMEXP',
    sistema: 'SAT+VROL',
    storageKey: '_sat_vrol_v1',
    intervaloMS: 1500,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMEXP. Ponte VROL opcional (apenas para casos/chargebacks).',
      promptManual: 'Cole os expedientes (um por linha):',
      parseRow: function (row) { return String(row[0] || '').trim() || null; },
      parseManual: function (line) { return line.trim() || null; },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    inicializar: async function (core) {
      // Ponte VROL é opcional — usada apenas para checkCaseBlank e getCountCbks
      if (ponteVrolDisponivel()) {
        try {
          var ping = await chamarPonteVrolComRetry('ping', {}, 8000);
          if (ping && ping.hasToken) {
            _ponteAtiva = true;
            if (core.addLog) core.addLog('VROL: ponte Tampermonkey ativa (casos/chargebacks habilitados).');
          } else if (core.addLog) {
            core.addLog('VROL: ponte ativa, token nao confirmado. Casos/chargebacks podem falhar.');
          }
        } catch (e) {
          if (core.addLog) core.addLog('VROL: ponte indisponivel. Casos/chargebacks serao ignorados.');
        }
      } else {
        if (core.addLog) core.addLog('VROL: sem ponte Tampermonkey. Consulta de transacao funciona normalmente (JSON). Casos/chargebacks serao ignorados.');
      }
    },
    processarUm: async function (numExp, core) {
      var reg = { STATUS: 'OK' };
      CSV_COLS.forEach(function (c) { reg[c] = reg[c] || ''; });
      reg.NUMEXP = numExp;

      // ── SAT ──
      await passo1(core.network);
      await core.utils.esperar(400);
      var htmlBusca = await passo2(numExp, core.network);
      var dados = extrairDadosBusca(htmlBusca);
      if (dados.length === 0) { reg.STATUS = 'OCORRENCIA NAO ENCONTRADA'; return reg; }
      reg.VINCVOUCHER = dados[0].VINCVOUCHER || '';
      var pan = dados[0].PAN || '';
      await core.utils.esperar(400);

      var htmlDetalhe = await passo3(numExp, dados[0], core.network);
      reg.NUMREF = core.utils.extrairCampoHTML(htmlDetalhe, 'NUMREF');

      if (!reg.NUMREF || reg.NUMREF.trim() === '') { reg.STATUS = 'SEM NUMREF'; return reg; }
      if (!pan) { reg.STATUS = 'SEM PAN'; return reg; }

      // ── ws-vcr (JSON, same-origin) ──
      var vcrResult = await getTransacaoVCR(reg.NUMREF, pan);
      if (vcrResult.status === 'done' && vcrResult.data) {
        var d = vcrResult.data;
        reg.VROL_TRAN_DATE = d.TRANSACTION_DATE_TIME;
        reg.VROL_AMOUNT = d.TOTAL_TRAN_AMOUNT;
        reg.VROL_MERCHANT = d.MERCHANT_LOCATION;
        reg.VROL_MCC = d.MCC;
        reg.VROL_TRAN_TYPE = d.TRAN_TYPE;
        reg.VROL_ENTRY_MODE = d.ENTRY_MODE;
        reg.VROL_AUTH_CODE = d.AUTH_CODE;
        reg.VROL_RESPONSE_CODE = d.RESPONSE_CODE;
        reg.VROL_INSTALLMENT_COUNT = d.INSTALLMENT_COUNT;
        reg.VROL_CARD = d.CARD;
        reg.TIPO_COMPRA = classificarCompra(d.INSTALLMENT_COUNT);
      } else {
        // FALLBACK: Se ws-vcr falhar, tenta usar a ponte VROL com HTML parsing
        try {
          var vrolResult = await chamarPonteVrolComRetry('getCaseByArn', { NUMREF: reg.NUMREF });
          if (vrolResult.status === 'done' && vrolResult.data) {
            var hd = vrolResult.data;
            reg.VROL_TRAN_DATE = hd.TRANSACTION_DATE_TIME;
            reg.VROL_AMOUNT = hd.TOTAL_TRAN_AMOUNT;
            reg.VROL_MERCHANT = hd.MERCHANT_LOCATION;
            reg.VROL_MCC = hd.MCC;
            reg.VROL_TRAN_TYPE = hd.TRAN_TYPE;
            reg.VROL_ENTRY_MODE = hd.ENTRY_MODE;
            reg.VROL_AUTH_CODE = hd.AUTH_CODE;
            reg.VROL_DISPUTE = hd.ASSOC_DISPUTE; // O HTML tem essa coluna
            reg.VROL_RESPONSE_CODE = hd.RESPONSE_CODE;
            reg.VROL_INSTALLMENT_COUNT = hd.INSTALLMENT_COUNT;
            reg.VROL_CARD = hd.CARD;
            reg.TIPO_COMPRA = classificarCompra(hd.INSTALLMENT_COUNT);
          } else {
            reg.STATUS = vrolResult.reason || vcrResult.reason || 'ERRO VCR E PONTE';
            return reg;
          }
        } catch (fallbackError) {
          reg.STATUS = vcrResult.reason || 'ERRO VCR (SEM PONTE PARA FALLBACK)';
          return reg;
        }
      }

      // ── VROL ponte (casos e chargebacks) ──
      if (reg.VROL_CARD) {
        try {
          var cbk = await getCountCbksVrol({ PAN: reg.VROL_CARD });
          if (cbk.status === 'done') reg.CASOS_ABERTOS_VROL = String(cbk.data.casos_abertos);
        } catch (e) { reg.CASOS_ABERTOS_VROL = ''; }
      }
      if (reg.NUMREF) {
        try {
          var chk = await checkCaseBlankVrol({ NUMREF: reg.NUMREF });
          var numCaso = (chk.status === 'undone' && chk.data) ? chk.data.numeroCasoDisputa : '';
          reg.CASO_EXISTENTE_VROL = numCaso ? (numCaso || 'SIM') : 'NAO';
          if (!reg.VROL_DISPUTE && numCaso) {
            reg.VROL_DISPUTE = numCaso; // Popula VROL_DISPUTE se o JSON não tinha
          }
        } catch (e) { reg.CASO_EXISTENTE_VROL = 'NAO'; }
      }
      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item + ' | ' + r.TIPO_COMPRA + ' | CBKs=' + (r.CASOS_ABERTOS_VROL||'0'));
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_siach_ocorrencias.js ──
/**
 * MÓDULO: Extrator de Ocorrências SIACH (REST API)
 * Consulta protocolo → lista ocorrências EM_ANDAMENTO → detalhe/transações.
 * Saída: uma linha por transação (ou uma por ocorrência sem transação).
 * Exporta XLSX com aba de resumo.
 */
(function (PAINEL) {
  'use strict';

  var API_BASE = '/siach/rest';
  var PER_PAGE = 100;

  var CSV_COLS = [
    'protocolo', 'ocorrencia_siach', 'situacao', 'fase', 'submotivo', 'sla',
    'contrato', 'cartao', 'tipfran', 'bandeira', 'opcao_bandeira',
    'data_abertura', 'data_sla', 'ultima_atualizacao', 'area',
    'ocorrencia_sat', 'data_transacao', 'estabelecimento', 'titular_cartao',
    'valor_original', 'valor_nacional', 'valor_dolar',
    'moeda', 'pais', 'tipo_transacao', 'tipo_lancamento_fatura',
    'status_reinclusao', 'cartao_transacao', 'descricao_retorno',
    'status_consulta',
  ];

  function formatarProtocolo(proto) {
    var s = String(proto).replace(/[^\d]/g, '');
    if (s.length < 2) return s;
    if (String(proto).indexOf('-') !== -1) return String(proto).trim();
    return s.slice(0, -1) + '-' + s.slice(-1);
  }

  async function consultarProtocolo(protocol) {
    var url = API_BASE + '/manter/consulta/ocorrencia/filtrar?page=1&perPage=' + PER_PAGE;
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ atender: true, situacoes: [], protocoloComDigito: formatarProtocolo(protocol) }),
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1))
      throw new Error('SESSAO_EXPIRADA');
    var json = JSON.parse(text);
    return json.list || [];
  }

  async function buscarDetalheOcorrencia(numOcorrencia) {
    var resp = await fetch(API_BASE + '/manter/expediente/' + numOcorrencia, {
      method: 'GET', headers: { Accept: 'application/json' }, credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && text.indexOf('login') !== -1) throw new Error('SESSAO_EXPIRADA');
    try { var data = JSON.parse(text); return Array.isArray(data) ? data : []; } catch (e) { return []; }
  }

  PAINEL.registrarModulo({
    id: 'siach_ocorrencias',
    nome: 'Extrator SIACH Ocorrências',
    icone: '📂',
    cor: 'linear-gradient(90deg,#00e5ff,#0097a7)',
    descricao: 'Extrai ocorrências EM_ANDAMENTO + transações por protocolo',
    sistema: 'SIACH',
    storageKey: '_extrator_siach_v1',
    intervaloMS: 800,
    tamLote: 50,
    pausaLoteMS: 3000,
    csvCols: CSV_COLS,
    exportFormat: 'xlsx',
    inputConfig: {
      instrucao: 'XLSX: col A = Protocolo (com dígito)',
      promptManual: 'Cole os protocolos (um por linha):',
      parseRow: function (row) {
        var v = String(row[0] || '').trim();
        return v ? v : null;
      },
      parseManual: function (line) {
        var v = line.trim();
        return v ? v : null;
      },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: null, // SIACH REST não precisa de keepalive separado

    processarUm: async function (protocol, core) {
      var ocorrencias = await consultarProtocolo(protocol);

      if (!ocorrencias || ocorrencias.length === 0) {
        return {
          protocolo: protocol, ocorrencia_siach: '', situacao: '', fase: '',
          submotivo: '', sla: '', contrato: '', cartao: '', tipfran: '', bandeira: '',
          opcao_bandeira: '', data_abertura: '', data_sla: '', ultima_atualizacao: '',
          area: '', ocorrencia_sat: '', data_transacao: '', estabelecimento: '',
          titular_cartao: '', valor_original: '', valor_nacional: '', valor_dolar: '',
          moeda: '', pais: '', tipo_transacao: '', tipo_lancamento_fatura: '',
          status_reinclusao: '', cartao_transacao: '', descricao_retorno: '',
          status_consulta: 'VAZIO',
        };
      }

      var registros = [];
      for (var i = 0; i < ocorrencias.length; i++) {
        var occ = ocorrencias[i];
        if (occ.situacao !== 'EM_ANDAMENTO') continue;

        var fase = ''; try { fase = occ.ultimoMovimento.fase.nome; } catch (e) { fase = occ.situacao || ''; }
        var numCartao = ''; try { numCartao = occ.protocolo.cartao.numeroCartao || ''; } catch (e) { }
        var tipfran = ''; try { tipfran = String(occ.protocolo.cartao.tipfran || occ.protocolo.tipfran || ''); } catch (e) { }
        var bandeira = (PAINEL.utils && PAINEL.utils.CODIGO_PARA_BANDEIRA) ? (PAINEL.utils.CODIGO_PARA_BANDEIRA[tipfran] || '') : '';
        var contrato = ''; try { contrato = core.utils.zeroFill(occ.protocolo.cartao.conta, 11); } catch (e) { }
        var dtAbertura = ''; try { dtAbertura = core.utils.formatarData(occ.dtAbertura); } catch (e) { }
        var dtSla = ''; try { dtSla = core.utils.formatarData(occ.dtSlaVermelho); } catch (e) { }
        var ultAtualiz = ''; try { ultAtualiz = core.utils.formatarData(occ.ultimoMovimento.dtExecucao); } catch (e) { }
        var area = ''; try { area = occ.ultimoMovimento.areaAtual.nome; } catch (e) { }
        var numOcorr = occ.numeroOcorrencia || '';
        var situacao = occ.situacao || '';
        var submotivo = ''; try { submotivo = occ.submotivo.nome || ''; } catch (e) { }
        var sla = occ.sla || '';

        var dadosBase = {
          protocolo: protocol, ocorrencia_siach: numOcorr, situacao: situacao,
          fase: fase, submotivo: submotivo, sla: sla, contrato: contrato,
          cartao: numCartao, tipfran: tipfran, bandeira: bandeira,
          opcao_bandeira: tipfran ? (tipfran + ' - ' + bandeira) : '',
          data_abertura: dtAbertura, data_sla: dtSla,
          ultima_atualizacao: ultAtualiz, area: area,
        };

        var transacoes = [];
        try { transacoes = await buscarDetalheOcorrencia(numOcorr); } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') throw e;
        }

        if (transacoes.length === 0) {
          var r = {};
          for (var k in dadosBase) r[k] = dadosBase[k];
          r.ocorrencia_sat = ''; r.data_transacao = ''; r.estabelecimento = '';
          r.titular_cartao = ''; r.valor_original = ''; r.valor_nacional = '';
          r.valor_dolar = ''; r.moeda = ''; r.pais = ''; r.tipo_transacao = '';
          r.tipo_lancamento_fatura = ''; r.status_reinclusao = '';
          r.cartao_transacao = ''; r.descricao_retorno = '';
          r.status_consulta = 'ENCONTRADO';
          registros.push(r);
        } else {
          for (var t = 0; t < transacoes.length; t++) {
            var tx = transacoes[t];
            var r = {};
            for (var k in dadosBase) r[k] = dadosBase[k];
            r.ocorrencia_sat = tx.numeroRetorno || '';
            r.data_transacao = tx.dataTransacao || '';
            r.estabelecimento = tx.nomeEstabelecimento || '';
            r.titular_cartao = tx.titularCartao || '';
            r.valor_original = tx.valorOriginalFormatado || String(tx.valorOriginal || '');
            r.valor_nacional = tx.valorNacionalFormatado || String(tx.valorNacional || '');
            r.valor_dolar = tx.valorDolarFormatado || String(tx.valorDolar || '');
            r.moeda = (tx.nomeMoeda || '').trim();
            r.pais = tx.nomePais || '';
            r.tipo_transacao = tx.tipoTransacao || '';
            r.tipo_lancamento_fatura = tx.tipoLancamentoFatura || '';
            r.status_reinclusao = tx.dataReinclusaoTransacao || '';
            r.cartao_transacao = tx.numeroCartaoFormatado || '';
            r.descricao_retorno = tx.descricaoRetorno || '';
            r.status_consulta = 'ENCONTRADO';
            registros.push(r);
          }
        }
        if (i < ocorrencias.length - 1) await core.utils.esperar(300);
      }

      return registros.length > 0 ? registros : {
        protocolo: protocol, status_consulta: 'VAZIO',
        ocorrencia_siach: '', situacao: '', fase: '', submotivo: '', sla: '',
        contrato: '', cartao: '', tipfran: '', bandeira: '', opcao_bandeira: '',
        data_abertura: '', data_sla: '', ultima_atualizacao: '', area: '',
        ocorrencia_sat: '', data_transacao: '', estabelecimento: '', titular_cartao: '',
        valor_original: '', valor_nacional: '', valor_dolar: '', moeda: '', pais: '',
        tipo_transacao: '', tipo_lancamento_fatura: '', status_reinclusao: '',
        cartao_transacao: '', descricao_retorno: '',
      };
    },
    logItem: function (prefixo, item, regs, addLog) {
      var first = regs[0];
      if (first.status_consulta === 'VAZIO') addLog(prefixo + ' VAZIO | ' + item);
      else addLog(prefixo + ' OK (' + regs.length + ' tx) | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// ── modules/mod_vinculacao_voucher.js ──
/**
 * MÓDULO: Consulta Vinculação Voucher (SAT Menu 0209)
 * Retorna VINCVOUCHER (SIM/NAO) por número de expediente.
 * 2 requisições por item (sem abrir detalhe).
 */
(function (PAINEL) {
  'use strict';

  var CONFIG = {
    SERVLET_DIRECTOR: '/sat/servlet/ServletDirector',
    SERVLET_AJAX: '/sat/servlet/ServletAjax',
    CODENT: '0104', CODPAIS: '76', CODPERFIL: 'BK05',
    DESCODENT: 'CAIXA ECONOMICA FEDERAL', MENU: '0209',
  };

  var CSV_COLS = ['NUMEXP', 'VINCVOUCHER', 'STATUS'];

  async function passo1(network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, {
      CODPERFIL: CONFIG.CODPERFIL, CODENT: CONFIG.CODENT, CODPAIS: CONFIG.CODPAIS,
      DESCODENT: CONFIG.DESCODENT, DESENTIDAD: CONFIG.DESCODENT,
      AUX_CODPERFIL: CONFIG.CODPERFIL, PROCESOSCRITICOS: '', NoCapaProteccion: 'S',
      sNombreMenuAnt: '', sNombreMenuAct: CONFIG.MENU,
      indexPrincipal: ['true', 'true', 'true', 'true', 'true', 'true'],
      sNombreEvento: CONFIG.MENU, sIdWindow: w, sIdWindowPadre: 'FrameProducto', sTarget: w,
    });
  }

  async function passo2(numExp, network) {
    var w = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'IPROTOCOLO', value: '' }, { name: 'FECSOLINC', value: '' },
      { name: 'DESFRARED', value: '' }, { name: 'MAS_DATOS', value: '' }, { name: 'CONTCUR', value: '' },
      { name: 'SELECCION', value: '' }, { name: 'LISTA', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'FILTREPORINCIDENCIA', value: '' }, { name: 'VENGOBUS', value: 'Y' },
      { name: 'PANTJERARQUICA', value: 'Y' }, { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'radioTipoFiltro', value: 'Expedientes' }, { name: 'RadioFiltro', value: 'on' },
      { name: 'NUMEXP', value: numExp }, { name: 'TIPOPROTOCOLO', value: 'N' },
      { name: 'MIGRACION', value: 'N' }, { name: 'CODSOLINC', value: '' },
      { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'buscarGnral' },
      { name: 'sIdWindow', value: w }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  function extrairVoucher(html) {
    var re = /Consulta\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/;
    var m = html.match(re);
    if (!m) return null;
    var args = [], ra = /'([^']*)'/g, am;
    while ((am = ra.exec(m[1])) !== null) args.push(am[1]);
    return args[19] || '';
  }

  PAINEL.registrarModulo({
    id: 'vinculacao_voucher',
    nome: 'Pesquisa de Vinculação Voucher',
    icone: '🔗',
    cor: 'linear-gradient(90deg,#3498db,#2980b9)',
    descricao: 'Verifica se a ocorrência possui voucher vinculado',
    sistema: 'SAT',
    storageKey: '_painel_vincvoucher_v1',
    intervaloMS: 100,
    csvCols: CSV_COLS,
    exportFormat: 'csv',
    inputConfig: {
      instrucao: 'XLSX: col A = NUMEXP',
      promptManual: 'Cole os expedientes (um por linha):',
      parseRow: function (row) { var v = String(row[0] || '').trim(); return v || null; },
      parseManual: function (line) { var v = line.trim(); return v || null; },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    inicializar: async function (core) {
      await passo1(core.network);
      await core.utils.esperar(200);
    },
    processarUm: async function (numExp, core) {
      var html = await passo2(numExp, core.network);
      var v = extrairVoucher(html);
      if (v === null) return { NUMEXP: numExp, VINCVOUCHER: '', STATUS: 'OCORRENCIA NAO ENCONTRADA' };
      return { NUMEXP: numExp, VINCVOUCHER: v, STATUS: 'OK' };
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item + ' | Voucher: ' + r.VINCVOUCHER);
      else addLog(prefixo + ' ' + r.STATUS + ' | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});


// BUILD_INJECT_END

  // ── Inicializar ──
  if (window.__PAINEL_CORE__ &&
      window.__PAINEL_CORE__.vrolBridge &&
      window.__PAINEL_CORE__.vrolBridge.isVrolHost()) {
    window.__PAINEL_CORE__.vrolBridge.instalarServidor();
    console.log('[Painel] Ponte VROL ativa.');
  } else if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {
    window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();
    console.log('[Painel] Botão flutuante injetado com sucesso.');
  }

})();
