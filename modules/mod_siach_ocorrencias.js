/**
 * MÓDULO: Extrator Completo de Ocorrências SIACH (REST API)
 * Consulta protocolo → lista ocorrências → view individual da ocorrência (/view/{id}).
 * Extrai dados completos de atendimento, relato e desacordo comercial.
 * Exporta XLSX com aba de resumo.
 */
(function (PAINEL) {
  'use strict';

  var API_BASE = '/siach/rest';
  var PER_PAGE = 100;

  var CSV_COLS = [
    'protocolo', 'ocorrencia_siach', 'situacao', 'fase', 'motivo', 'submotivo',
    'sla', 'contrato', 'cartao', 'titular', 'documento', 'tipo_documento',
    'telefone', 'data_abertura', 'data_sla', 'ultima_atualizacao', 'area',
    'usuario', 'area_origem', 'observacao', 'desacordo_titular', 'desacordo_relato',
    'status_consulta',
  ];

  var XLSX_HEADERS = [
    'Protocolo', 'Ocorrência SIACH', 'Situação', 'Fase', 'Motivo', 'Submotivo',
    'SLA', 'Contrato', 'Cartão', 'Titular', 'Documento', 'Tipo Documento',
    'Telefone', 'Data Abertura', 'Data SLA', 'Última Atualização', 'Área',
    'Usuário', 'Área Origem', 'Observação Completa', 'Titular Desacordo', 'Relato Desacordo',
    'Status Consulta',
  ];

  function formatarProtocolo(proto) {
    var s = String(proto).replace(/[^\d]/g, '');
    if (s.length < 2) return s;
    if (String(proto).indexOf('-') !== -1) return String(proto).trim();
    return s.slice(0, -1) + '-' + s.slice(-1);
  }

  async function consultarProtocolo(protocol) {
    var url = API_BASE + '/manter/consulta/ocorrencia/filtrar?page=1&perPage=' + PER_PAGE;
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify({ atender: true, situacoes: [], protocoloComDigito: formatarProtocolo(protocol) }),
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1)) {
      throw new Error('SESSAO_EXPIRADA');
    }
    var json = JSON.parse(text);
    return json.list || [];
  }

  async function buscarDetalheOcorrenciaView(numeroOcorrencia) {
    var url = API_BASE + '/manter/consulta/ocorrencia/view/' + numeroOcorrencia;
    var resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status + ' ao consultar view ' + numeroOcorrencia);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1)) {
      throw new Error('SESSAO_EXPIRADA');
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  PAINEL.registrarModulo({
    id: 'siach_ocorrencias',
    nome: 'Extrator SIACH Ocorrências Completo',
    icone: '📂',
    cor: 'linear-gradient(90deg,#00e5ff,#0097a7)',
    descricao: 'Extrai ocorrências completas (fase, relato, desacordo, observação) por protocolo',
    sistema: 'SIACH',
    storageKey: '_extrator_siach_completo_v1',
    intervaloMS: 50,
    tamLote: 50,
    pausaLoteMS: 3000,
    csvCols: CSV_COLS,
    xlsxHeaders: XLSX_HEADERS,
    exportFormat: 'xlsx',
    inputConfig: {
      instrucao: 'XLSX: col A = Protocolo (com dígito)',
      promptManual: 'Cole os protocolos (um por linha):',
      parseRow: function (row) {
        var v = String(row[0] || '').trim();
        return v ? v : null;
      },
      parseManual: function (line) {
        var v = line.trim();
        return v ? v : null;
      },
      toStr: function (item) { return item; },
    },
    keepaliveConfig: null, // SIACH REST não precisa de keepalive separado

    processarUm: async function (protocol, core) {
      var ocorrencias = await consultarProtocolo(protocol);

      if (!ocorrencias || ocorrencias.length === 0) {
        var vazio = {};
        CSV_COLS.forEach(function (c) { vazio[c] = ''; });
        vazio.protocolo = protocol;
        vazio.status_consulta = 'VAZIO';
        vazio.STATUS = 'VAZIO';
        return vazio;
      }

      var registros = [];
      for (var i = 0; i < ocorrencias.length; i++) {
        var occ = ocorrencias[i];
        var ocorrenciaSiach = occ.numeroOcorrencia || '';

        var viewData = null;
        try {
          viewData = await buscarDetalheOcorrenciaView(ocorrenciaSiach);
        } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') throw e;
        }

        var target = viewData || occ;

        // Fase
        var fase = '';
        try { fase = target.ultimoMovimento.fase.nome; } catch (e) { fase = target.situacao || ''; }

        // Cartão e Contrato
        var numeroCartao = '';
        try { numeroCartao = target.protocolo.cartao.numeroCartaoFormatado || target.protocolo.cartao.numeroCartao || ''; } catch (e) { }
        var contrato = '';
        try { contrato = target.protocolo.cartao.contaFormatado || core.utils.zeroFill(target.protocolo.cartao.conta, 11); } catch (e) { }

        // Titular e Documento
        var titular = '';
        try { titular = target.protocolo.cartao.titularConta || (target.cartaoTitular && target.cartaoTitular.titularConta) || ''; } catch (e) { }
        var documento = '';
        try { documento = target.protocolo.cartao.documentoTitularFormatado || target.protocolo.cartao.numeroCpfCnpj || (target.cartaoTitular && target.cartaoTitular.documentoTitularFormatado) || ''; } catch (e) { }
        var tipoDocumento = '';
        try { tipoDocumento = target.protocolo.cartao.tipoDocumento || (target.cartaoTitular && target.cartaoTitular.tipoDocumento) || ''; } catch (e) { }
        var telefone = '';
        try { telefone = target.protocolo.cartao.telefone || (target.cartaoTitular && target.cartaoTitular.telefone) || ''; } catch (e) { }

        // Datas
        var dataAbertura = '';
        try { dataAbertura = core.utils.formatarData(target.dtAbertura); } catch (e) { }
        var dataSla = '';
        try { dataSla = core.utils.formatarData(target.dtSlaVermelho); } catch (e) { }
        var ultimaAtualizacao = '';
        try { ultimaAtualizacao = core.utils.formatarData(target.ultimoMovimento.dtExecucao); } catch (e) { }

        // Área e Usuário
        var area = '';
        try { area = target.ultimoMovimento.areaAtual.nome; } catch (e) { }
        var usuario = '';
        try { usuario = target.ultimoMovimento.usuario.nome; } catch (e) { }
        var areaOrigem = '';
        try { areaOrigem = target.areaOrigem.nome || ''; } catch (e) { }

        // Outros campos
        var situacao = '';
        try { situacao = target.situacao || ''; } catch (e) { }
        var submotivo = '';
        try { submotivo = target.submotivo.nome || ''; } catch (e) { }
        var motivo = '';
        try { motivo = target.submotivo.motivo.nome || ''; } catch (e) { }
        var sla = '';
        try { sla = target.sla || ''; } catch (e) { }
        var observacao = '';
        try { observacao = target.observacao || ''; } catch (e) { }

        // Desacordo
        var desacordoTitular = '';
        try { desacordoTitular = target.desacordo.titularCartao || ''; } catch (e) { }
        var desacordoRelato = '';
        try { desacordoRelato = target.desacordo.relatoClienteOcorrido || ''; } catch (e) { }

        registros.push({
          protocolo: protocol,
          ocorrencia_siach: ocorrenciaSiach,
          situacao: situacao,
          fase: fase,
          motivo: motivo,
          submotivo: submotivo,
          sla: sla,
          contrato: contrato,
          cartao: numeroCartao,
          titular: titular,
          documento: documento,
          tipo_documento: tipoDocumento,
          telefone: telefone,
          data_abertura: dataAbertura,
          data_sla: dataSla,
          ultima_atualizacao: ultimaAtualizacao,
          area: area,
          usuario: usuario,
          area_origem: areaOrigem,
          observacao: observacao,
          desacordo_titular: desacordoTitular,
          desacordo_relato: desacordoRelato,
          status_consulta: 'ENCONTRADO',
          STATUS: 'OK',
        });

        if (i < ocorrencias.length - 1) await core.utils.esperar(150);
      }

      return registros;
    },

    gerarResumo: function (dados) {
      var protocolosUnicos = {};
      dados.forEach(function (d) { if (d.protocolo) protocolosUnicos[d.protocolo] = true; });
      var totalProtos = Object.keys(protocolosUnicos).length;
      var totalEncontradas = dados.filter(function (d) { return d.status_consulta === 'ENCONTRADO'; }).length;
      var totalVazias = dados.filter(function (d) { return d.status_consulta === 'VAZIO'; }).length;
      var totalErros = dados.filter(function (d) { return d.status_consulta && d.status_consulta.indexOf('ERRO') !== -1; }).length;

      return [
        ['Resumo da Extração Completa SIACH'],
        [''],
        ['Data/Hora da Extração', PAINEL.utils.agora()],
        ['Total de Protocolos', totalProtos],
        ['Total de Ocorrências', totalEncontradas],
        ['Protocolos Vazios', totalVazias],
        ['Erros', totalErros],
      ];
    },

    logItem: function (prefixo, item, regs, addLog) {
      var first = regs[0];
      if (!first || first.status_consulta === 'VAZIO') {
        addLog(prefixo + ' VAZIO | ' + item);
      } else if (first.status_consulta && first.status_consulta.indexOf('ERRO') !== -1) {
        addLog(prefixo + ' ' + first.status_consulta + ' | ' + item);
      } else {
        addLog(prefixo + ' OK (' + regs.length + ' ocorrência' + (regs.length > 1 ? 's' : '') + ') | ' + item);
      }
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
