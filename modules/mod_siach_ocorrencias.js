/**
 * MÓDULO: Extrator de Ocorrências SIACH (REST API)
 * Consulta protocolo → lista ocorrências EM_ANDAMENTO → detalhe/transações.
 * Saída: uma linha por transação (ou uma por ocorrência sem transação).
 * Exporta XLSX com aba de resumo.
 */
(function (PAINEL) {
  'use strict';

  var API_BASE = '/siach/rest';
  var PER_PAGE = 100;

  var CSV_COLS = [
    'protocolo', 'ocorrencia_siach', 'situacao', 'fase', 'submotivo', 'sla',
    'contrato', 'cartao', 'tipfran', 'bandeira', 'opcao_bandeira',
    'data_abertura', 'data_sla', 'ultima_atualizacao', 'area',
    'ocorrencia_sat', 'data_transacao', 'estabelecimento', 'titular_cartao',
    'valor_original', 'valor_nacional', 'valor_dolar',
    'moeda', 'pais', 'tipo_transacao', 'tipo_lancamento_fatura',
    'status_reinclusao', 'cartao_transacao', 'descricao_retorno',
    'status_consulta',
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
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ atender: true, situacoes: [], protocoloComDigito: formatarProtocolo(protocol) }),
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && (text.indexOf('login') !== -1 || text.indexOf('unauthorized') !== -1))
      throw new Error('SESSAO_EXPIRADA');
    var json = JSON.parse(text);
    return json.list || [];
  }

  async function buscarDetalheOcorrencia(numOcorrencia) {
    var resp = await fetch(API_BASE + '/manter/expediente/' + numOcorrencia, {
      method: 'GET', headers: { Accept: 'application/json' }, credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (text.length < 500 && text.indexOf('login') !== -1) throw new Error('SESSAO_EXPIRADA');
    try { var data = JSON.parse(text); return Array.isArray(data) ? data : []; } catch (e) { return []; }
  }

  PAINEL.registrarModulo({
    id: 'siach_ocorrencias',
    nome: 'Extrator SIACH Ocorrências',
    icone: '📂',
    cor: 'linear-gradient(90deg,#00e5ff,#0097a7)',
    descricao: 'Extrai ocorrências EM_ANDAMENTO + transações por protocolo',
    sistema: 'SIACH',
    storageKey: '_extrator_siach_v1',
    intervaloMS: 800,
    tamLote: 50,
    pausaLoteMS: 3000,
    csvCols: CSV_COLS,
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
        return {
          protocolo: protocol, ocorrencia_siach: '', situacao: '', fase: '',
          submotivo: '', sla: '', contrato: '', cartao: '', tipfran: '', bandeira: '',
          opcao_bandeira: '', data_abertura: '', data_sla: '', ultima_atualizacao: '',
          area: '', ocorrencia_sat: '', data_transacao: '', estabelecimento: '',
          titular_cartao: '', valor_original: '', valor_nacional: '', valor_dolar: '',
          moeda: '', pais: '', tipo_transacao: '', tipo_lancamento_fatura: '',
          status_reinclusao: '', cartao_transacao: '', descricao_retorno: '',
          status_consulta: 'VAZIO',
        };
      }

      var registros = [];
      for (var i = 0; i < ocorrencias.length; i++) {
        var occ = ocorrencias[i];
        if (occ.situacao !== 'EM_ANDAMENTO') continue;

        var fase = ''; try { fase = occ.ultimoMovimento.fase.nome; } catch (e) { fase = occ.situacao || ''; }
        var numCartao = ''; try { numCartao = occ.protocolo.cartao.numeroCartao || ''; } catch (e) { }
        var tipfran = ''; try { tipfran = String(occ.protocolo.cartao.tipfran || occ.protocolo.tipfran || ''); } catch (e) { }
        var bandeira = (PAINEL.utils && PAINEL.utils.CODIGO_PARA_BANDEIRA) ? (PAINEL.utils.CODIGO_PARA_BANDEIRA[tipfran] || '') : '';
        var contrato = ''; try { contrato = core.utils.zeroFill(occ.protocolo.cartao.conta, 11); } catch (e) { }
        var dtAbertura = ''; try { dtAbertura = core.utils.formatarData(occ.dtAbertura); } catch (e) { }
        var dtSla = ''; try { dtSla = core.utils.formatarData(occ.dtSlaVermelho); } catch (e) { }
        var ultAtualiz = ''; try { ultAtualiz = core.utils.formatarData(occ.ultimoMovimento.dtExecucao); } catch (e) { }
        var area = ''; try { area = occ.ultimoMovimento.areaAtual.nome; } catch (e) { }
        var numOcorr = occ.numeroOcorrencia || '';
        var situacao = occ.situacao || '';
        var submotivo = ''; try { submotivo = occ.submotivo.nome || ''; } catch (e) { }
        var sla = occ.sla || '';

        var dadosBase = {
          protocolo: protocol, ocorrencia_siach: numOcorr, situacao: situacao,
          fase: fase, submotivo: submotivo, sla: sla, contrato: contrato,
          cartao: numCartao, tipfran: tipfran, bandeira: bandeira,
          opcao_bandeira: tipfran ? (tipfran + ' - ' + bandeira) : '',
          data_abertura: dtAbertura, data_sla: dtSla,
          ultima_atualizacao: ultAtualiz, area: area,
        };

        var transacoes = [];
        try { transacoes = await buscarDetalheOcorrencia(numOcorr); } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') throw e;
        }

        if (transacoes.length === 0) {
          var r = {};
          for (var k in dadosBase) r[k] = dadosBase[k];
          r.ocorrencia_sat = ''; r.data_transacao = ''; r.estabelecimento = '';
          r.titular_cartao = ''; r.valor_original = ''; r.valor_nacional = '';
          r.valor_dolar = ''; r.moeda = ''; r.pais = ''; r.tipo_transacao = '';
          r.tipo_lancamento_fatura = ''; r.status_reinclusao = '';
          r.cartao_transacao = ''; r.descricao_retorno = '';
          r.status_consulta = 'ENCONTRADO';
          registros.push(r);
        } else {
          for (var t = 0; t < transacoes.length; t++) {
            var tx = transacoes[t];
            var r = {};
            for (var k in dadosBase) r[k] = dadosBase[k];
            r.ocorrencia_sat = tx.numeroRetorno || '';
            r.data_transacao = tx.dataTransacao || '';
            r.estabelecimento = tx.nomeEstabelecimento || '';
            r.titular_cartao = tx.titularCartao || '';
            r.valor_original = tx.valorOriginalFormatado || String(tx.valorOriginal || '');
            r.valor_nacional = tx.valorNacionalFormatado || String(tx.valorNacional || '');
            r.valor_dolar = tx.valorDolarFormatado || String(tx.valorDolar || '');
            r.moeda = (tx.nomeMoeda || '').trim();
            r.pais = tx.nomePais || '';
            r.tipo_transacao = tx.tipoTransacao || '';
            r.tipo_lancamento_fatura = tx.tipoLancamentoFatura || '';
            r.status_reinclusao = tx.dataReinclusaoTransacao || '';
            r.cartao_transacao = tx.numeroCartaoFormatado || '';
            r.descricao_retorno = tx.descricaoRetorno || '';
            r.status_consulta = 'ENCONTRADO';
            registros.push(r);
          }
        }
        if (i < ocorrencias.length - 1) await core.utils.esperar(300);
      }

      return registros.length > 0 ? registros : {
        protocolo: protocol, status_consulta: 'VAZIO',
        ocorrencia_siach: '', situacao: '', fase: '', submotivo: '', sla: '',
        contrato: '', cartao: '', tipfran: '', bandeira: '', opcao_bandeira: '',
        data_abertura: '', data_sla: '', ultima_atualizacao: '', area: '',
        ocorrencia_sat: '', data_transacao: '', estabelecimento: '', titular_cartao: '',
        valor_original: '', valor_nacional: '', valor_dolar: '', moeda: '', pais: '',
        tipo_transacao: '', tipo_lancamento_fatura: '', status_reinclusao: '',
        cartao_transacao: '', descricao_retorno: '',
      };
    },
    logItem: function (prefixo, item, regs, addLog) {
      var first = regs[0];
      if (first.status_consulta === 'VAZIO') addLog(prefixo + ' VAZIO | ' + item);
      else addLog(prefixo + ' OK (' + regs.length + ' tx) | ' + item);
    },
  });

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
