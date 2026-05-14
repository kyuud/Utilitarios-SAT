/**
 * MÓDULO: Consulta Reportes de Fraude (SAT Menu 0181)
 * Consulta em lote de reportes de fraude por NUMEXP + TIPFRAN.
 * Usa lotes de 120 itens com pausa entre lotes.
 */
(function (PAINEL) {
  'use strict';

  var BASE = 'https://cartoes.extracaixa/sat/servlet';

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

  function getPageValue(nome) {
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow[nome]) return unsafeWindow[nome];
    } catch (e) { }
    try {
      if (window[nome]) return window[nome];
    } catch (e2) { }
    return '';
  }

  function getSessionIdReportes(network) {
    var idSession = getPageValue('IdSession');
    if (idSession) return idSession;
    return network.getSessionId();
  }

  function getDataHoje() {
    var dataSistema = getPageValue('sFechaSistema');
    if (dataSistema) return dataSistema;
    try { if (typeof sFechaSistema !== 'undefined' && sFechaSistema) return sFechaSistema; } catch (e) { }
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
  }

  async function postReportes(endpoint, params, network, checkSessao) {
    var text = await network.post(BASE + '/' + endpoint, params, { credentials: 'include' });
    if (checkSessao && text.indexOf('IdSession') === -1 && text.length < 6000) {
      throw new Error('SESSAO_EXPIRADA');
    }
    return text;
  }

  async function buscarRegistros(NUMEXPAUX, tipfran, network, utils) {
    var sessionId = getSessionIdReportes(network);
    var sIdWindow = sessionId + 'Interface';
    var dataHoje = getDataHoje();

    // Pre-request AJAX
    await postReportes('ServletAjax', {
      REQUEST_TYPE: 'AJAX', Peticion: 'VALIDATRANSMTO',
      EventoEjecutar: 'deleteAndGoesToRecordConsHistoricoFranquiciasII',
      OperacionSolicitada: 'BUSCAR',
    }, network);

    // Main search request
    var htmlBusca = await postReportes('ServletDirector', {
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
      Cache_mantMantenimiento: '', CacheMtoTxt: '', CacheMtoNUEVOEDITARTxt: '',
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
    }, network, true);

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
      credentials: 'include',
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
          PAN: a[2] || '',
          DESFRAUDE: a[4] || '',
          DESSITUAC: a[6] || '',
          DESINDSIT: a[7] || '',
          Estabelecimento: a[24] || '',
          NUMREF: a[3] || '',
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
