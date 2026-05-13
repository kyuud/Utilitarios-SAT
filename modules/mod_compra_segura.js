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
