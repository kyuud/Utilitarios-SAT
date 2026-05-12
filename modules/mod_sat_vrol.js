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
