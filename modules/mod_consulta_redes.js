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
