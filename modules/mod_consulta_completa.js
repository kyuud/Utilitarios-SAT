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
