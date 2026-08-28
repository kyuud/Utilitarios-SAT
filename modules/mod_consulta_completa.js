/**
 * MÓDULO: Consulta Completa de Expedientes (SAT Menu 0209) - Rotulada
 * Extrai TODOS os campos das páginas de busca e detalhe do SAT com rótulos em Português.
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

  var DICIONARIO_MOTINC = {
    '1': 'CARTAO NAO EXISTE',
    '2': 'CARTAO BLOQUEADO',
    '3': 'CARTAO EXCLUIDO',
    '4': 'CARTAO NAO OPERATIVO',
    '5': 'CARTAO NAO OPERATIVO CAIXAS',
    '6': 'CARTAO NAO OPER.NAO ESTAMPADO',
    '10': 'CONTA NAO OPERATIVA',
    '40': 'CODIGO DE RAZAO ERRADO',
    '50': 'CRUZADA MANUAL',
    '51': 'NAO AUTORIZADA',
    '52': 'AUT.OFF-LINE CONTABIL DENEGADA',
    '53': 'OPERACAO RECHACADA SOL.REDE',
    '54': 'TRANSACAO DUPLICADA',
    '55': 'NAO AUTORIZADA PRIORIDADE 2',
    '56': 'EXCEDE OVERLIMIT T&E',
    '57': 'ERRO TIPO FATURA BNDES',
    '58': 'AUTORIZACAO CONTESTADA',
    '60': 'ENTIDADE N.ADMITE ESTA MOEDA',
    '66': 'REJEITADO CONTA 110580',
    '67': 'CBK REJEITADO ANTES MANTIS 832',
    '70': 'OPERACAO FORA DE PRAZO',
    '71': 'EXTRATO MIGRACAO',
    '72': 'COMPRA PARCELADA MIGRACAO',
    '73': 'PRE-ARBITRAGEM-VISA',
    '75': 'CREDIARIO NAO PERMITIDO',
    '78': 'INC.MIGRADA SEM SOLUCAO',
    '79': 'INC.MIGRADA SOLUCAO',
    '80': 'NAO EXISTE COMP PARC ASSOCIADA',
    '81': 'VALOR DA PARCELA INCORRETO',
    '82': 'PARCELA DUPLICADA',
    '83': 'PARCELA VENCIDA',
    '84': 'VALOR EXCEDE MAXIMO PERMITIDO',
    '85': 'CHARGEBACK PORTAL SEM OCORRENC',
    '86': 'INC. MIGRADA SOLUCIONADA',
    '87': 'INC. MIGRADA SEM SOLUCAO',
    '95': 'INC. MIGRADA SOLUCAO'
  };

  var DICIONARIO_TIPOINC = {
    '1': 'ERRO DE INCOMING',
    '2': 'SOLICITACAO DE DOCUMENTO',
    '3': 'REVERSA SOLICITACAO DOCUMENTO',
    '5': 'CHARGEBACK',
    '6': 'REVERSA CHARGEBACK',
    '7': 'SEGUNDO CHARGEBACK',
    '8': 'REVERSAO SEGUNDO CHARGEBACK',
    '10': 'INCIDENCIA EXTRATO EM ESTUDO',
    '16': 'REAPRESENTACAO',
    '30': 'REABERTURA E CREDITO EXP',
    '35': 'REJEICAO DE CHARGEBACK',
    '55': 'CHARGEBACK PORTAL ELO INTERNAC',
    '56': 'CONF CHARGEBACK ELO PORTAL INT',
    '57': 'CANC CHARGEBACK PORTAL ELO INT',
    '58': 'CONF CANC CHRGBK PORT ELO INT',
    '77': 'PRE ARBITRAGEM MASTER',
    '80': 'SINISTRO',
    '90': 'GESTAO MEDIACAO',
    '95': 'AJUSTES REALIZADOS',
    '99': 'INC. MIGRACAO SEM HISTORICO',
    '100': 'INC. MIGRADA SEM SOLUCAO',
    '101': 'INC. MIGRADA SOLUCIONADA',
    '102': 'INC. MIGRADA SEM SOLUCAO'
  };

  var COLUNAS = [
    // --- Página de Busca ---
    { key: 'NUMEXP', header: 'Nº Processo' },
    { key: 'NUMINC', header: 'Nº Ocorrência' },
    { key: 'PAN', header: 'Nº Cartão' },
    { key: 'PROTOCOLO', header: 'Protocolo' },
    { key: 'TIPOEXP', header: 'Tipo Expediente' },
    { key: 'DESTIPOEXP', header: 'Contabilização' },
    { key: 'CODCOM', header: 'Código do Estabelecimento' },
    { key: 'TIPFRAN', header: 'Cód. Bandeira' },
    { key: 'DESFRARED', header: 'Bandeira' },
    { key: 'FECALTA', header: 'Data Abertura' },
    { key: 'INDSITEXP', header: 'Situação Expediente' },
    { key: 'DESSITFRAUDE', header: 'Situação Reporte Fraude' },
    { key: 'FECCIERRE', header: 'Data Finalização Processo' },
    { key: 'INDPLAVEN', header: 'Prazo de Vencimento' },
    { key: 'IMPFAC', header: 'Valor em R$' },
    { key: 'VINCVOUCHER', header: 'Voucher Identificado' },
    { key: 'NUCASO', header: 'Nº Caso' },

    // --- Dados da Ocorrência (Incidência) ---
    { key: 'TIPOINC', header: 'Cód. Tipo Ocorrência' },
    { key: 'DESINC', header: 'Tipo Ocorrência' },
    { key: 'MOTINC', header: 'Cód. Motivo' },
    { key: 'DESMOTINC', header: 'Motivo Ocorrência' },

    // --- Página de Detalhe ---
    { key: 'NUMREF', header: 'ARN' },
    { key: 'PANB', header: 'Cartão Formatado' },
    { key: 'CLAMON', header: 'Cód. Moeda Convertida' },
    { key: 'NOMCOMRED', header: 'Estabelecimento' },
    { key: 'CODACT', header: 'Ramo Atividade (MCC)' },
    { key: 'NUMAUT', header: 'Nº Autorização' },
    { key: 'FECFAC', header: 'Data da Compra' },
    { key: 'CODRAZ', header: 'Código Razão' },
    { key: 'CODENT', header: 'Entidade' },
    { key: 'CODREG', header: 'Região' },
    { key: 'MODOOBTAUT', header: 'Transação Segura' },
    { key: 'CODTERM', header: 'Cód. Terminal' },
    { key: 'INDDEBCRE', header: 'Abonado Deb/Cred' },
    { key: 'CODENTEMI', header: 'Entidade Emissora' },
    { key: 'INDANUL', header: 'Ind. Anulação' },
    { key: 'INDRET', header: 'Ind. Retenção' },
    { key: 'FECCONTA', header: 'Data Contabilização' },
    { key: 'REFERMERCAN', header: 'Referência Mercantil' },
    { key: 'CODPROECI', header: 'Cód. Processo ECI' },
    { key: 'CODSOLCON', header: 'Cód. Solução Confirmada' },
    { key: 'TIPOSOL', header: 'Tipo Solução' },
    { key: 'DESSOLINC', header: 'Descrição Solução' },
    { key: 'FECSOLINC', header: 'Data Solução' },
    { key: 'USUARIOSOL', header: 'Usuário Solução' },
    { key: 'FECHORASOL', header: 'Data/Hora Solução' },
    { key: 'CODSUBFRA', header: 'Submotivo Reporte Fraude' },
    { key: 'NUMREFREM', header: 'Nº Remessa Ref.' },
    { key: 'CODRAZCHA', header: 'Cód. Razão Chargeback' },
    { key: 'FECCONTASOL', header: 'Data Contab. Solução' },
    { key: 'CLAMONDIV', header: 'Moeda Original' },
    { key: 'CODACTESP', header: 'Atividade Específica' },
    { key: 'TIPOFAC', header: 'Cód. Tipo Fatura' },
    { key: 'DESTIPFAC', header: 'Descrição Tipo Fatura' },
    { key: 'SIAIDCD', header: 'Nº Switch Autorização' },
    { key: 'CUENTA', header: 'Contrato' },
    { key: 'CENTALTA', header: 'Agência' },
    { key: 'CODESTCTA', header: 'Situação da Conta' },
    { key: 'CODBLQCTA1', header: 'Último Bloqueio da Conta' },
    { key: 'INDSITTAR', header: 'Situação do Cartão' },
    { key: 'CODBLQ_PAN', header: 'Bloqueio do Cartão' },

    // --- Status ---
    { key: 'STATUS', header: 'Status Processamento' }
  ];

  var CSV_COLS = COLUNAS.map(function (c) { return c.header; });

  function extrairCampoSingle(html, fieldName) {
    if (!html) return '';
    var r1 = new RegExp("name=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m1 = html.match(r1);
    if (m1 && m1[1] !== '') return m1[1];

    var r2 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*name=['\"]" + fieldName + "['\"]", 'i');
    var m2 = html.match(r2);
    if (m2 && m2[1] !== '') return m2[1];

    var r3 = new RegExp("id=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m3 = html.match(r3);
    if (m3 && m3[1] !== '') return m3[1];

    var r4 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*id=['\"]" + fieldName + "['\"]", 'i');
    var m4 = html.match(r4);
    return (m4 && m4[1] !== '') ? m4[1] : '';
  }

  function extrairCampoMelhorado(campo, htmlDetalhe, dbBusca) {
    // 1. Se veio do Javascript da busca (FECCIERRE, DESSITFRAUDE, INDPLAVEN)
    if (dbBusca && dbBusca[campo] !== undefined && dbBusca[campo] !== '') {
      return dbBusca[campo];
    }

    // 2. Extrair do HTML do detalhe
    var val = extrairCampoSingle(htmlDetalhe, campo);
    if (val !== '') return val;

    // 3. Fallbacks e resoluções específicas
    if (campo === 'CODSOLCON') {
      return extrairCampoSingle(htmlDetalhe, 'CODSOLINC') || extrairCampoSingle(htmlDetalhe, 'CODSOLINCAUX');
    }

    if (campo === 'CLAMONDIV') {
      var clamon = extrairCampoSingle(htmlDetalhe, 'CLAMON');
      if (clamon) {
        var rOpt = new RegExp("<option[^>]*(?:value|data-CLAMON)=['\"]?" + clamon + "['\"]?[^>]*>", 'i');
        var mOpt = htmlDetalhe.match(rOpt);
        if (mOpt) {
          var mDes = mOpt[0].match(/data-DESCLAMONLARGA=['\"]([^'\"]+)['\"]/i);
          if (mDes) return mDes[1];
          var mTitle = mOpt[0].match(/title=['\"]([^'\"]+)['\"]/i);
          if (mTitle && mTitle[1].indexOf(' - ') !== -1) {
            return mTitle[1].split(' - ')[1].trim();
          }
        }
        if (clamon === '986') return 'REAL';
        if (clamon === '840') return 'DOLAR';
      }
    }

    if (campo === 'CODSUBFRA') {
      var mCod = htmlDetalhe.match(/var\s+codSubFrau\s*=\s*['\"]([^'\"]*)['\"]/i);
      var mDes = htmlDetalhe.match(/var\s+desSubFrau\s*=\s*['\"]([^'\"]*)['\"]/i);
      var cSub = mCod ? mCod[1].trim() : '';
      var dSub = mDes ? mDes[1].trim() : '';
      if (cSub || dSub) return (cSub + '/' + dSub).replace(/^\/|\/$/g, '');
    }

    return '';
  }

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
    var sIdWindow = network.getSessionId() + 'Interface';
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'IPROTOCOLO', value: '' }, { name: 'FECSOLINC', value: '' },
      { name: 'DESFRARED', value: '' }, { name: 'MAS_DATOS', value: '' }, { name: 'CONTCUR', value: '' },
      { name: 'SELECCION', value: '' }, { name: 'LISTA', value: '' }, { name: 'CODENT', value: CONFIG.CODENT },
      { name: 'bOcultarBtn', value: 'S' }, { name: 'bIncidencia', value: 'N' },
      { name: 'FECALTA', value: '' }, { name: 'FECCIERRE', value: '' }, { name: 'INDPLAVEN', value: '' },
      { name: 'TIPOFAC', value: '' }, { name: 'INDNORCOR', value: '' }, { name: 'DESTIPFRAN', value: '' },
      { name: 'FECFAC', value: '' }, { name: 'IMPFAC', value: '' }, { name: 'FECALTAINC', value: '' },
      { name: 'NUMREF', value: '' }, { name: 'DESINC', value: '' }, { name: 'INDINCPEN', value: '' },
      { name: 'CODREG', value: '' }, { name: 'NUMREFREM', value: '' }, { name: 'NUMREFFACREM', value: '' },
      { name: 'INDAJENA', value: '' }, { name: 'NUMAUT', value: '' }, { name: 'CODACT', value: '' },
      { name: 'INDDEBCRE', value: '' }, { name: 'FECCMB', value: '' }, { name: 'CMBAPLI', value: '' },
      { name: 'IMPLIQ', value: '' }, { name: 'INDERROR', value: '' }, { name: 'CODRAZ', value: '' },
      { name: 'CODSOLINCAUX', value: '' }, { name: 'TIPOSOL', value: '' }, { name: 'FECLIQ', value: '' },
      { name: 'CODFUNFRAN', value: '' }, { name: 'CODACTESP', value: '' }, { name: 'MODOOBTAUT', value: '' },
      { name: 'TEXTOINICIO', value: '' }, { name: 'INDAPLEXT', value: '' }, { name: 'INDANUL', value: '' },
      { name: 'INDRET', value: '' }, { name: 'FECCONTA', value: '' }, { name: 'FECCONTASOL', value: '' },
      { name: 'CLAMON', value: '' }, { name: 'CLAMONDIV', value: '' }, { name: 'FECPROCIN', value: '' },
      { name: 'CODSUBFRA', value: '' }, { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'CODRAZCHA', value: '' }, { name: 'INDCOMINC', value: '' }, { name: 'INDCOMPCUO', value: '' },
      { name: 'SIAIDCD', value: '' }, { name: 'NUMOPECUO', value: '' }, { name: 'CODTERM', value: '' },
      { name: 'IMPBONIF', value: '' }, { name: 'DEPARTAMENTO', value: '' }, { name: 'REFERMERCAN', value: '' },
      { name: 'CODPROECI', value: '' }, { name: 'NUMTALON', value: '' }, { name: 'CODENTEMI', value: '' },
      { name: 'TIPOFACEMI', value: '' }, { name: 'CODENTUMO', value: '' }, { name: 'CODOFIUMO', value: '' },
      { name: 'USUARIOUMO', value: '' }, { name: 'CODTERMUMO', value: '' },
      { name: 'TEXTO1', value: '' }, { name: 'TEXTO2', value: '' }, { name: 'TEXTO3', value: '' },
      { name: 'TEXTO4', value: '' }, { name: 'TEXTO5', value: '' }, { name: 'TEXTO6', value: '' },
      { name: 'TEXTO7', value: '' }, { name: 'TEXTO8', value: '' },
      { name: 'DESSOLINC', value: '' }, { name: 'DESTIPOSOL', value: '' }, { name: 'INDSITEXP', value: '' },
      { name: 'PROTOCOLO', value: '' }, { name: 'TIPOEXP', value: '' }, { name: 'TIPOLISTADO', value: '' },
      { name: 'INDBOLET', value: '' }, { name: 'SALIDARED', value: '' }, { name: 'CODSOLCON', value: '' },
      { name: 'IMPMIN', value: '' }, { name: 'CLAMONMIN', value: '' }, { name: 'SWITCHCENTRO', value: '' },
      { name: 'CONUMINC', value: '' }, { name: 'VENGOBUS', value: 'Y' }, { name: 'PANTJERARQUICA', value: 'Y' },
      { name: 'NUMINCSELECT', value: '' }, { name: 'CONSUL', value: '' }, { name: 'INDORIINC', value: '' },
      { name: 'PANFILTRO', value: '' }, { name: 'TIPFRANFILTRO', value: '' }, { name: 'EMPRESAFILTRO', value: '' },
      { name: 'INDSITEXPFILTRO', value: '' }, { name: 'TIPOINCFILTRO', value: '' },
      { name: 'TIPOEXPFILTRO', value: '' }, { name: 'INDINCPENFILTRO', value: '' },
      { name: 'FECINIFILTRO', value: '' }, { name: 'FECFINFILTRO', value: '' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'PROTOCOLOFILTRO', value: '' },
      { name: 'CODCOMFILTRO', value: '' }, { name: 'INDORIINCFILTRO', value: '' },
      { name: 'MOTINCFILTRO', value: '' }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'FILTREPORINCIDENCIA', value: '' }, { name: 'IMPLIQ', value: '' },
      { name: 'CLAMONLIQ', value: '' }, { name: 'BusquedaUnitaria', value: '' },
      { name: 'TipoFiltro', value: '' }, { name: 'VCRFORM', value: '' }, { name: 'VcrReturnCode', value: '' },
      { name: 'NUMPAN', value: '' }, { name: 'CODSOLINCFILTRO', value: '' },
      { name: 'PageOperCuotas', value: '' }, { name: 'PageMovimentoCredito', value: '' },
      { name: 'PageConsultaContratos', value: '' }, { name: 'PageConsultaAutorizaciones', value: '' },
      { name: 'TIPFRANAUX', value: '' }, { name: 'CUENTA', value: '' }, { name: 'NUMDOC', value: '' },
      { name: 'CENTALTA', value: '' }, { name: 'INDINCCONTINA', value: '' },
      { name: 'CHPRASFILTRO', value: '' }, { name: 'NUMCASOFILTRO', value: '' },
      { name: 'SECOPEFRAUDEAUX', value: '' }, { name: 'PANFRAUDEAUX', value: '' },
      { name: 'PageBusquedaExpedientes', value: 'Y' }, { name: 'PageConsultaContratosInativos', value: '' },
      { name: 'INDFRAUDEENV', value: '' }, { name: 'NUMPARCELA', value: '' },
      { name: 'radioTipoFiltro', value: 'Expedientes' }, { name: 'NUMINC', value: '' },
      { name: 'RadioFiltro', value: 'on' }, { name: 'NUMEXP', value: numExp },
      { name: 'CHPRAS', value: '' }, { name: 'PAN', value: '' }, { name: 'NPROTOCOLO', value: '' },
      { name: 'NUCASO', value: '' }, { name: 'TIPFRAN', value: '' }, { name: 'TIPOINC', value: '' },
      { name: 'FECINI', value: '' }, { name: 'FECFIN', value: '' }, { name: 'MOTINC', value: '' },
      { name: 'CODCOM', value: '' }, { name: 'NOMCOMRED', value: '' },
      { name: 'TIPOEXP1', value: '' }, { name: 'TIPOEXP2', value: '' },
      { name: 'TIPOLISTADO1', value: '' }, { name: 'TIPOLISTADO2', value: '' },
      { name: 'TIPOPROTOCOLO', value: 'N' }, { name: 'MIGRACION', value: 'N' },
      { name: 'CODSOLINC', value: '' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'buscarGnral' },
      { name: 'sIdWindow', value: sIdWindow }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
      { name: 'BusquedaExpedientes', value: 'true' },
    ]);
  }

  async function passo2b(numExp, dadosBusca, network) {
    try {
      var htmlInc = await network.post(CONFIG.SERVLET_AJAX, {
        REQUEST_TYPE: 'AJAX',
        CODENT: CONFIG.CODENT,
        CODPAIS2: CONFIG.CODPAIS,
        bOcultarBtn: 'S',
        bIncidencia: 'N',
        VENGOBUS: 'Y',
        PANTJERARQUICA: 'Y',
        NUMEXPFILTRO: numExp,
        FILTREPOREXPEDIENTE: 'S',
        PageBusquedaExpedientes: 'Y',
        radioTipoFiltro: 'Expedientes',
        RadioFiltro: 'on',
        NUMEXP: numExp,
        PAN: (dadosBusca && dadosBusca.PAN) || '',
        TIPFRAN: (dadosBusca && dadosBusca.TIPFRAN) || '',
        CODCOM: (dadosBusca && dadosBusca.CODCOM) || '',
        FECALTA: (dadosBusca && dadosBusca.FECALTA) || '',
        INDSITEXP: (dadosBusca && dadosBusca.INDSITEXP) || '',
        TIPOEXP: (dadosBusca && dadosBusca.TIPOEXP) || '',
        DESFRARED: (dadosBusca && dadosBusca.DESFRARED) || '',
        Peticion: 'ListadoEXP',
        sClave: numExp,
        MOTIPOEXP: 'F',
      });
      var reInci = /ConsultaInci\(getFormulario\(this\),((?:'[^']*',?\s*)+)\)/g;
      var matchInci;
      var listaIncidencias = [];
      while ((matchInci = reInci.exec(htmlInc)) !== null) {
        var argsInci = [];
        var reArgInci = /'([^']*)'/g;
        var amInci;
        while ((amInci = reArgInci.exec(matchInci[1])) !== null) argsInci.push(amInci[1]);
        var motCod = (argsInci[9] || '').trim();
        var tipoCod = (argsInci[7] || '').trim();
        var desInc = (argsInci[8] || '').trim() || DICIONARIO_TIPOINC[tipoCod] || '';
        var desMot = DICIONARIO_MOTINC[motCod] || '';
        listaIncidencias.push({
          NUMINC: (argsInci[0] || '').trim(),
          TIPOFAC: argsInci[1] || '',
          DESTIPFAC: argsInci[2] || '',
          TIPOINC: tipoCod,
          DESINC: desInc,
          MOTINC: motCod,
          DESMOTINC: desMot,
        });
      }

      if (listaIncidencias.length === 0) return {};

      // Se houver mais de uma ocorrência, pegar o primeiro registro onde o número da ocorrência é diferente do número do processo
      if (listaIncidencias.length > 1) {
        var expStr = String(numExp).trim();
        var diferente = listaIncidencias.find(function (item) {
          return item.NUMINC && item.NUMINC !== expStr;
        });
        if (diferente) return diferente;
      }

      return listaIncidencias[0];
    } catch (e) {
      return {};
    }
  }

  async function passo3(numExp, dadosBusca, network) {
    var sIdWindow = network.getSessionId() + 'Interface';
    var numInc = (dadosBusca && dadosBusca.NUMINC) ? dadosBusca.NUMINC : numExp;
    return await network.post(CONFIG.SERVLET_DIRECTOR, [
      { name: 'TKCSRF', value: '' }, { name: 'IPROTOCOLO', value: '' },
      { name: 'CODENT', value: CONFIG.CODENT }, { name: 'bOcultarBtn', value: 'S' },
      { name: 'bIncidencia', value: 'N' }, { name: 'CODPAIS2', value: CONFIG.CODPAIS },
      { name: 'VENGOBUS', value: 'Y' }, { name: 'PANTJERARQUICA', value: 'Y' },
      { name: 'NUMEXPFILTRO', value: numExp }, { name: 'FILTREPOREXPEDIENTE', value: 'S' },
      { name: 'PageBusquedaExpedientes', value: 'Y' },
      { name: 'NUMINC', value: numInc },
      { name: 'NUMEXP', value: (dadosBusca && dadosBusca.CODCOM) || '' },
      { name: 'PAN', value: (dadosBusca && dadosBusca.PAN) || '' },
      { name: 'TIPFRAN', value: (dadosBusca && dadosBusca.TIPFRAN) || '' },
      { name: 'sNombreMenuAnt', value: CONFIG.MENU }, { name: 'sNombreMenuAct', value: CONFIG.MENU },
      { name: 'sNombreEvento', value: 'selectIncidenciasB' },
      { name: 'sIdWindow', value: sIdWindow }, { name: 'sIdWindowPadre', value: 'FrameProducto' },
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
      if (args.length < 20) continue;
      var chave = args[2] + '|' + args[3];
      if (vistos[chave]) continue;
      vistos[chave] = true;
      resultados.push({
        NUMEXP: args[2] || '',
        PAN: args[3] || '',
        PROTOCOLO: args[4] || '',
        TIPOEXP: args[5] || '',
        DESTIPOEXP: args[6] || '',
        CODCOM: args[7] || '',
        TIPFRAN: args[8] || '',
        DESFRARED: args[9] || '',
        FECALTA: args[10] || '',
        INDSITEXP: args[11] || '',
        DESSITFRAUDE: args[12] || '',
        FECCIERRE: args[13] || '',
        INDPLAVEN: args[15] || '',
        IMPFAC: args[18] || '',
        VINCVOUCHER: args[19] || '',
        NUCASO: args[20] || '',
      });
    }
    return resultados;
  }

  PAINEL.registrarModulo({
    id: 'consulta_completa',
    nome: 'Extrator de Informações de Ocorrências',
    icone: '📊',
    cor: 'linear-gradient(90deg,#3498db,#2ecc71)',
    descricao: 'Extrai TODOS os campos de busca + detalhe por NUMEXP (com rótulos em português)',
    sistema: 'SAT',
    storageKey: '_sat_completa_rotulada_v1',
    intervaloMS: 50,
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
      var reg = {};
      COLUNAS.forEach(function (c) { reg[c.header] = ''; });
      reg['Status Processamento'] = 'OK';
      reg['Nº Processo'] = numExp;
      reg.STATUS = 'OK';

      try {
        // === PASSO 1 - Navegar ===
        await passo1(core.network);
        await core.utils.esperar(300);

        // === PASSO 2 - Pesquisar ===
        var htmlBusca = await passo2(numExp, core.network);
        var dadosBusca = extrairDadosBusca(htmlBusca);
        var db = (dadosBusca && dadosBusca.length > 0) ? dadosBusca[0] : null;

        if (!db) {
          reg['Status Processamento'] = 'OCORRENCIA NAO ENCONTRADA';
          reg.STATUS = 'OCORRENCIA NAO ENCONTRADA';
          return reg;
        }

        // Dados da incidência vêm do AJAX
        var inc = await passo2b(numExp, db, core.network);
        db.NUMINC = inc.NUMINC || '';
        db.DESTIPFAC = inc.DESTIPFAC || '';
        db.TIPOINC = inc.TIPOINC || '';
        db.DESINC = inc.DESINC || '';
        db.MOTINC = inc.MOTINC || '';
        db.DESMOTINC = inc.DESMOTINC || '';
        await core.utils.esperar(300);

        // === PASSO 3 - Selecionar e extrair detalhe ===
        var htmlDetalhe = await passo3(numExp, db, core.network);

        // Mapear todas as colunas
        COLUNAS.forEach(function (c) {
          if (c.key === 'STATUS') return;
          reg[c.header] = extrairCampoMelhorado(c.key, htmlDetalhe, db);
        });

      } catch (e) {
        if (e.message === 'SESSAO_EXPIRADA') throw e;
        reg['Status Processamento'] = 'ERRO: ' + e.message;
        reg.STATUS = 'ERRO: ' + e.message;
      }
      return reg;
    },
    logItem: function (prefixo, item, regs, addLog) {
      var r = regs[0];
      if (r && r['Status Processamento'] === 'OK') {
        addLog(prefixo + ' OK | ' + item +
          ' | Cartao:' + (r['Nº Cartão'] || '-') +
          ' | ARN:' + (r['ARN'] || '-') +
          ' | Sit:' + (r['Situação Expediente'] || '-') +
          ' | Solucao:' + (r['Data Solução'] || '-') +
          ' | Fin:' + (r['Data Finalização Processo'] || '-'));
      } else if (r) {
        addLog(prefixo + ' ' + (r['Status Processamento'] || r.STATUS || 'ERRO') + ' | ' + item);
      } else {
        addLog(prefixo + ' ERRO | ' + item);
      }
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
