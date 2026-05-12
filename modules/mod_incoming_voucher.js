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
    nome: 'Incoming Voucher (0311→0884)',
    icone: '🧾',
    cor: 'linear-gradient(90deg,#e0a526,#f39c12)',
    descricao: 'Extrai ARN Voucher + Valor Compra por ARN',
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
