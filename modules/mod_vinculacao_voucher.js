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
    nome: 'Vinculação Voucher (0209)',
    icone: '🔗',
    cor: 'linear-gradient(90deg,#9b59b6,#8e44ad)',
    descricao: 'Retorna VINCVOUCHER por número de expediente',
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
