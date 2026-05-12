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
