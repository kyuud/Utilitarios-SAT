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
    CODENT: '0104',
    MENU: '0311',
  };

  var CSV_COLS = [
    'ARN_ORIGINAL', 'BANDEIRA', 'ARN_VOUCHER',
    'VALOR_VOUCHER_RAW', 'VALOR_VOUCHER_NORMALIZADO', 'STATUS',
  ];

  /**
   * Normaliza o valor numérico do Campo 11 / Dest. Amount / DE4.
   * Insere vírgula antes dos 2 últimos dígitos e remove zeros à esquerda.
   *
   * Exemplos:
   *   "000000027480" → "274,80"
   *   "000000000550" → "5,50"
   *   "000000100000" → "1000,00"
   */
  function normalizarValor(raw) {
    if (!raw || raw.trim() === '') return '';
    var limpo = raw.replace(/\D/g, '');
    if (limpo.length < 3) return limpo;
    var inteiro = limpo.slice(0, -2);
    var decimal = limpo.slice(-2);
    inteiro = inteiro.replace(/^0+/, '') || '0';
    return inteiro + ',' + decimal;
  }

  // ── Passo 1: Buscar ARN no 0311 ──
  async function buscarPorARN(arn, tipoRede, network) {
    var sIdWindow = network.getSessionId() + 'Interface';
    var params = {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: '', SECOPE: '', NUMREF: '', PAN: '', FECOPER: '',
      TIPFRANFILTRO: tipoRede, SECOPEBFILTRO: '', PANBFILTRO: '',
      NUMREFBFILTRO: arn, TIPOFACFILTRO: '', TIPOINCFILTRO: '',
      FECOPERIFILTRO: '', FECOPERFFILTRO: '',
      FECALTAIFILTRO: '', FECALTAFFILTRO: '',
      FRANQUICIA: '', TIPFRAN: tipoRede,
      SECOPEB: '', filtros: '2', PANB: '', NUMREFB: arn,
      TIPOFAC: '', TIPOINC: '', FECOPERI: '', FECOPERF: '',
      FECALTAI: '', FECALTAF: '',
      sNombreMenuAnt: CONFIG.MENU, sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: 'buscarGnral',
      sIdWindow: sIdWindow, sIdWindowPadre: 'FrameProducto',
      selFranquicias: 'true',
    };
    return await network.post(CONFIG.SERVLET_DIRECTOR, params);
  }

  // ── Passo 2: Encontrar linha 001/SIM ──
  function encontrarLinhaVoucher(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
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

      var argsStr = matchArgs[1];
      var args = [];
      var atual = '';
      var dentroAspas = false;
      for (var c = 0; c < argsStr.length; c++) {
        var ch = argsStr[c];
        if (ch === "'" && !dentroAspas) { dentroAspas = true; }
        else if (ch === "'" && dentroAspas) { dentroAspas = false; }
        else if (ch === ',' && !dentroAspas) { args.push(atual); atual = ''; }
        else { atual += ch; }
      }
      args.push(atual);

      var vincvoucher = (args[10] || '').trim().toUpperCase();
      var numTotParc = (args[11] || '').trim();

      if (numTotParc.indexOf('001') === 0 && vincvoucher === 'SIM') {
        return {
          secope: args[0] || '', pan: args[1] || '', fecoper: args[2] || '',
          codaut: args[3] || '', nomcom: args[4] || '', tipofac: args[5] || '',
          tipoinc: args[6] || '', numref: args[7] || '', impoper: args[8] || '',
          desclamon: args[9] || '', vincvoucher: vincvoucher,
          numTotParc: numTotParc, codcom: args[12] || '', fecalta: args[13] || '',
          seclote: args[14] || '', tiddet: args[15] || '', clamon: args[16] || '',
          contcur: args[17] || ''
        };
      }
    }
    return null;
  }

  // ── Passo 3: Navegar para detalhe ──
  async function navegarDetalhe(arn, tipoRede, args, network) {
    var sIdWindow = network.getSessionId() + 'Interface';
    var params = {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: args.codcom, SECOPE: args.secope, NUMREF: args.numref,
      PAN: args.pan, FECOPER: args.fecoper,
      TIPFRANFILTRO: tipoRede, SECOPEBFILTRO: '', PANBFILTRO: '',
      NUMREFBFILTRO: arn, TIPOFACFILTRO: '', TIPOINCFILTRO: '',
      FECOPERIFILTRO: '', FECOPERFFILTRO: '',
      FECALTAIFILTRO: '', FECALTAFFILTRO: '',
      FRANQUICIA: '', TIPFRAN: tipoRede,
      filtros: '1',
      SECOPEB: '', PANB: '', NUMREFB: arn,
      TIPOINC: args.tipoinc, FECOPERI: '', FECOPERF: '',
      FECALTAI: '', FECALTAF: '',
      TIPOFAC: args.tipofac, DESINC: args.tipoinc,
      SECLOTE: args.seclote, TIDDET: args.tiddet,
      IMPOPER: args.impoper, CLAMON: args.clamon,
      DESCLAMON: args.desclamon, CONTCUR: args.contcur,
      sDireccionFRCLOL1: '',
      CLAVEINICIOFRCLOL1: '', CLAVEFINFRCLOL1: '',
      PANTPAGFRCLOL1: '001', INDMASDATOSFRCLOL1: 'N',
      sNombreMenuAnt: CONFIG.MENU, sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: 'selectConsultaFranquiciasLista1',
      sIdWindow: sIdWindow, sIdWindowPadre: 'FrameProducto',
      selFranquicias: 'true',
    };
    return await network.post(CONFIG.SERVLET_DIRECTOR, params);
  }

  // ── Passo 4: Navegar para Mensagem Incoming Voucher (0884) ──
  async function navegarVoucher(detalheHtml, args, arn, tipoRede, network) {
    var sIdWindow = network.getSessionId() + 'Interface';
    var parser = new DOMParser();
    var doc = parser.parseFromString(detalheHtml, 'text/html');
    var form = doc.querySelector('form[name="FormSAT"], form#FormSAT');

    var params = {};
    if (form) {
      var inputs = form.querySelectorAll('input[name], select[name]');
      for (var i = 0; i < inputs.length; i++) {
        var name = inputs[i].getAttribute('name');
        var value = inputs[i].getAttribute('value') || '';
        if (name) params[name] = value;
      }
    }

    // Campos críticos (identificados no HAR / referência)
    if (!params.HISTORICODEREDES) params.HISTORICODEREDES = 'Y';
    if (!params.SECOPEORIGEM) params.SECOPEORIGEM = params.SECOPEB || args.secope;
    if (!params.SECOPECABECERA) params.SECOPECABECERA = params.SECOPEB || args.secope;
    if (!params.NUMREFCABECERA) params.NUMREFCABECERA = params.NUMREFB || arn;
    if (!params.PANCABECERA) params.PANCABECERA = params.PANB || args.pan;
    if (!params.VENGODEMENSAJEINCOMING) params.VENGODEMENSAJEINCOMING = '';
    if (!params.PANTALLA) params.PANTALLA = 'De Histórico De Redes';
    if (!params.SECOPEB) params.SECOPEB = args.secope;
    if (!params.PANB) params.PANB = args.pan;
    if (!params.NUMREFB) params.NUMREFB = arn;
    if (!params.CONTCUR) params.CONTCUR = args.contcur;
    if (!params.SECOPE) params.SECOPE = args.secope;
    if (!params.NUMREF) params.NUMREF = args.numref || arn;
    if (!params.PAN) params.PAN = args.pan;
    if (!params.CODCOM) params.CODCOM = args.codcom;
    if (!params.FECOPER) params.FECOPER = args.fecoper;
    if (!params.TIPFRAN) params.TIPFRAN = tipoRede;

    // Sobrescreve os campos de navegação
    params.sNombreMenuAnt = CONFIG.MENU;
    params.sNombreMenuAct = '0884';
    params.sNombreEvento = '0884';
    params.sIdWindow = sIdWindow;
    params.sIdWindowPadre = 'FrameProducto';
    params.selFranquicias = 'true';

    return await network.post(CONFIG.SERVLET_DIRECTOR, params);
  }

  // ── Passo 5: Extrair dados da página de voucher ──
  function extrairDadosVoucher(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    var acquirerRefNumber = '';
    var valorCompraRaw = '';

    // Estratégia 1: seletor CSS por classe
    var tds = doc.querySelectorAll('td.FuenteTextoBORDER');
    for (var i = 0; i < tds.length; i++) {
      var label = (tds[i].textContent || '').trim();
      var valorTd = tds[i].nextElementSibling;
      var valor = valorTd ? (valorTd.textContent || '').trim() : '';

      // ARN / Acquirer Ref
      if (!acquirerRefNumber) {
        if (label.indexOf('Acquirer Ref') !== -1 ||
            (label.indexOf('Pos 27-49') !== -1 && label.indexOf('ARN') !== -1)) {
          acquirerRefNumber = valor;
        }
      }

      // Valor
      if (!valorCompraRaw) {
        if (label.indexOf('VALOR COMPRA') !== -1 ||
            (label.indexOf('Pos 62-73') !== -1 && label.indexOf('Dest') !== -1) ||
            label.indexOf('MC - DE4 - Transsaction Amount') !== -1 ||
            (label.indexOf('DE4') !== -1 && label.indexOf('Transsaction Amount') !== -1)) {
          valorCompraRaw = valor;
        }
      }
    }

    // Estratégia 2: fallback via regex no HTML bruto
    if (!acquirerRefNumber && !valorCompraRaw) {
      // ELO: Acquirer Ref Number
      var regexAcq = /Acquirer\s*Ref\s*Number[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
      var matchAcq = html.match(regexAcq);
      if (matchAcq) acquirerRefNumber = matchAcq[1].trim();

      // VISA: Pos 27-49 - ARN
      if (!acquirerRefNumber) {
        var regexArnVisa = /Pos\s*27-49[^<]*ARN[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
        var matchArnVisa = html.match(regexArnVisa);
        if (matchArnVisa) acquirerRefNumber = matchArnVisa[1].trim();
      }

      // ELO: VALOR COMPRA-PARCELA
      var regexVal = /VALOR\s*COMPRA[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
      var matchVal = html.match(regexVal);
      if (matchVal) valorCompraRaw = matchVal[1].trim();

      // VISA: Pos 62-73 - Dest. Amount
      if (!valorCompraRaw) {
        var regexValVisa = /Pos\s*62-73[^<]*Dest[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
        var matchValVisa = html.match(regexValVisa);
        if (matchValVisa) valorCompraRaw = matchValVisa[1].trim();
      }

      // MC: DE4 - Transsaction Amount
      if (!valorCompraRaw) {
        var regexValMc = /DE4[^<]*Transsaction\s*Amount[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
        var matchValMc = html.match(regexValMc);
        if (matchValMc) valorCompraRaw = matchValMc[1].trim();
      }
    }

    return {
      acquirerRefNumber: acquirerRefNumber,
      valorCompraRaw: valorCompraRaw,
      valorCompraNormalizado: normalizarValor(valorCompraRaw)
    };
  }

  // ── Voltar ao menu de busca (reset estado SAT entre ARNs) ──
  async function voltarParaBusca(network) {
    var sIdWindow = network.getSessionId() + 'Interface';
    var params = {
      TKCSRF: '', IPROTOCOLO: '', INDEJECUCION: '',
      CODENT: CONFIG.CODENT, bOcultarBtn: 'S',
      CODCOM: '', SECOPE: '', NUMREF: '', PAN: '', FECOPER: '',
      TIPFRANFILTRO: '', SECOPEBFILTRO: '', PANBFILTRO: '',
      NUMREFBFILTRO: '', TIPOFACFILTRO: '', TIPOINCFILTRO: '',
      FECOPERIFILTRO: '', FECOPERFFILTRO: '',
      FECALTAIFILTRO: '', FECALTAFFILTRO: '',
      FRANQUICIA: '', TIPFRAN: '',
      SECOPEB: '', filtros: '2', PANB: '', NUMREFB: '',
      TIPOFAC: '', TIPOINC: '', FECOPERI: '', FECOPERF: '',
      FECALTAI: '', FECALTAF: '',
      sNombreMenuAnt: '0884', sNombreMenuAct: CONFIG.MENU,
      sNombreEvento: CONFIG.MENU,
      sIdWindow: sIdWindow, sIdWindowPadre: 'FrameProducto',
      selFranquicias: 'true',
    };
    await network.post(CONFIG.SERVLET_DIRECTOR, params);
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
        var tipfran = (row[1] != null && String(row[1]).trim() !== '') ? String(row[1]).trim() : '2';
        return { arn: arn, tipfran: tipfran };
      },
      parseManual: function (line) {
        var parts = line.split(/[,;\t]/);
        var arn = (parts[0] || '').trim();
        var tipfran = (parts[1] || '').trim() || '2';
        return arn ? { arn: arn, tipfran: tipfran } : null;
      },
      toStr: function (item) { return item.arn; },
    },
    keepaliveConfig: { url: CONFIG.SERVLET_AJAX, body: 'REQUEST_TYPE=AJAX&Peticion=VALIDATRANSMTO' },
    processarUm: async function (item, core) {
      var arn = item.arn;
      var tipoRede = item.tipfran;
      var reg = {
        ARN_ORIGINAL: arn, BANDEIRA: tipoRede,
        ARN_VOUCHER: '', VALOR_VOUCHER_RAW: '',
        VALOR_VOUCHER_NORMALIZADO: '', STATUS: 'OK',
      };
      try {
        // Passo 1: Buscar ARN
        var htmlBusca = await buscarPorARN(arn, tipoRede, core.network);
        await core.utils.esperar(200);

        // Passo 2: Encontrar linha 001/SIM
        var argsLinha = encontrarLinhaVoucher(htmlBusca);
        if (!argsLinha) { reg.STATUS = 'SEM REGISTRO 001/SIM'; return reg; }

        // Passo 3: Navegar para detalhe
        var htmlDetalhe = await navegarDetalhe(arn, tipoRede, argsLinha, core.network);
        await core.utils.esperar(200);

        // Passo 4: Navegar para Mensagem Incoming Voucher
        var htmlVoucher = await navegarVoucher(htmlDetalhe, argsLinha, arn, tipoRede, core.network);
        await core.utils.esperar(200);

        // Passo 5: Extrair dados do voucher
        var dados = extrairDadosVoucher(htmlVoucher);
        if (!dados.acquirerRefNumber && !dados.valorCompraRaw) { reg.STATUS = 'VOUCHER SEM DADOS'; return reg; }

        reg.ARN_VOUCHER = dados.acquirerRefNumber;
        reg.VALOR_VOUCHER_RAW = dados.valorCompraRaw;
        reg.VALOR_VOUCHER_NORMALIZADO = dados.valorCompraNormalizado;

        // Voltar ao estado de busca para o próximo ARN
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
      if (r && r.STATUS === 'OK') addLog(prefixo + ' OK | ' + item.arn + ' | V=' + r.VALOR_VOUCHER_NORMALIZADO);
      else if (r) addLog(prefixo + ' ' + r.STATUS + ' | ' + item.arn);
      else addLog(prefixo + ' ERRO | ' + item.arn);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
