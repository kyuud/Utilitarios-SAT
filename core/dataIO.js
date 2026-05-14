/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/dataIO.js
 *  Importação (XLSX/manual) e exportação (CSV/XLSX) de dados.
 *  Carregamento do SheetJS via CDN com fallback.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  var _XLSXLib = null;

  /**
   * Carrega a biblioteca SheetJS no contexto de um documento (popup ou page).
   * Tenta CDN principal, depois fallback.
   * @param {Document} docAlvo - Documento onde injetar o <script>.
   * @returns {Promise<Object>} Referência ao XLSX global.
   */
  function carregarSheetJS(docAlvo) {
    return new Promise(function (resolve, reject) {
      // Verificar se já existe em algum contexto
      if (_XLSXLib) { resolve(_XLSXLib); return; }
      if (typeof XLSX !== 'undefined') { _XLSXLib = XLSX; resolve(_XLSXLib); return; }
      var win = docAlvo && docAlvo.defaultView;
      if (win && win.XLSX) { _XLSXLib = win.XLSX; resolve(_XLSXLib); return; }

      var script = (docAlvo || document).createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = function () {
        _XLSXLib = (win && win.XLSX) || window.XLSX;
        if (_XLSXLib) resolve(_XLSXLib);
        else reject(new Error('SheetJS carregou mas XLSX global não encontrado.'));
      };
      script.onerror = function () {
        // Fallback CDN
        var s2 = (docAlvo || document).createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s2.onload = function () {
          _XLSXLib = (win && win.XLSX) || window.XLSX;
          if (_XLSXLib) resolve(_XLSXLib);
          else reject(new Error('Fallback SheetJS falhou.'));
        };
        s2.onerror = function () { reject(new Error('Falha ao carregar SheetJS de ambos CDNs.')); };
        (docAlvo || document).head.appendChild(s2);
      };
      (docAlvo || document).head.appendChild(script);
    });
  }

  /**
   * Retorna a referência ao SheetJS já carregado.
   * @returns {Object|null}
   */
  function getXLSX() {
    return _XLSXLib;
  }

  /**
   * Abre um file picker e parseia um arquivo XLSX/XLS.
   * Retorna a lista de itens processados pela função parseRow.
   *
   * @param {Document} doc - Documento do popup (para criar o input).
   * @param {Object} config - Configuração de parsing:
   *   @param {Function} config.parseRow - Recebe row (array de cells) e retorna item ou null.
   *   @param {boolean} [config.skipHeader=true] - Pular primeira linha.
   *   @param {Function} [config.logFn] - Função de log.
   * @returns {Promise<Array>} Lista de itens parseados.
   */
  function carregarXlsx(doc, config) {
    var logFn = config.logFn || function () { };
    return new Promise(function (resolve, reject) {
      if (!_XLSXLib) { reject(new Error('SheetJS não carregado.')); return; }

      var input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.style.display = 'none';

      input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) { reject(new Error('Nenhum arquivo selecionado.')); return; }
        logFn('Lendo: ' + file.name);

        var reader = new FileReader();
        reader.onload = function (evt) {
          try {
            var data = new Uint8Array(evt.target.result);
            var wb = _XLSXLib.read(data, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var json = _XLSXLib.utils.sheet_to_json(ws, { header: 1 });

            var startIdx = config.skipHeader !== false ? 1 : 0;
            var itens = [];
            for (var i = startIdx; i < json.length; i++) {
              var row = json[i];
              if (!row || row.length === 0) continue;
              var item = config.parseRow(row);
              if (item !== null && item !== undefined) itens.push(item);
            }

            logFn(itens.length + ' itens carregados do arquivo.');
            try { doc.body.removeChild(input); } catch (e2) { }
            resolve(itens);
          } catch (err) { reject(err); }
        };
        reader.onerror = function () { reject(new Error('Erro ao ler arquivo.')); };
        reader.readAsArrayBuffer(file);
      };

      doc.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Exibe prompt para o usuário colar dados manualmente.
   * Parseia cada linha com a função parseRow.
   *
   * @param {string} promptText - Texto do prompt.
   * @param {Function} parseRow - Recebe string de uma linha, retorna item ou null.
   * @param {Object} [options] - Opções de parsing manual.
   * @param {RegExp|Function} [options.lineSplit] - Separador das linhas/itens.
   * @returns {Array} Lista de itens.
   */
  function carregarManual(promptText, parseRow) {
    var texto = prompt(promptText);
    return carregarManualTexto(texto, parseRow);
  }

  /**
   * Parseia texto informado manualmente, sem abrir prompt/modal nativo.
   *
   * @param {string} texto - Conteudo colado pelo usuario.
   * @param {Function} parseRow - Recebe string de uma linha, retorna item ou null.
   * @returns {Array} Lista de itens.
   */
  function carregarManualTexto(texto, parseRow, options) {
    if (!texto) return [];
    options = options || {};
    var lineSplit = options.lineSplit || /[\n;]+/;
    var linhas = (typeof lineSplit === 'function')
      ? lineSplit(String(texto))
      : String(texto).split(lineSplit);
    return linhas
      .map(function (v) { return v.trim(); })
      .filter(function (v) { return v !== ''; })
      .map(parseRow)
      .filter(function (v) { return v !== null && v !== undefined; });
  }

  /**
   * Gera um CSV com BOM UTF-8 e separador ; (padrão Excel Brasil).
   * Dispara download automático.
   *
   * @param {Document} doc - Documento do popup.
   * @param {Array<string>} colunas - Nomes das colunas.
   * @param {Array<Object>} resultados - Array de registros.
   * @param {string} prefixo - Prefixo do nome do arquivo (ex: 'consulta_redes').
   * @param {string} [sufixo] - Sufixo (ex: timestamp).
   */
  function escaparCSV(valor) {
    var v = (valor === null || valor === undefined) ? '' : String(valor);
    if (/[;"\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  function gerarCSV(doc, colunas, resultados, prefixo, sufixo) {
    var linhas = [colunas.map(escaparCSV).join(';')];
    resultados.forEach(function (r) {
      var vals = colunas.map(function (c) {
        return escaparCSV(r[c]);
      });
      linhas.push(vals.join(';'));
    });
    var conteudo = '\uFEFF' + linhas.join('\r\n');
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    _download(doc, blob, prefixo + '_' + (sufixo || PAINEL.utils.timestampSufixo()) + '.csv');
  }

  /**
   * Gera e baixa um arquivo XLSX com dados e aba de resumo.
   *
   * @param {Document} doc - Documento do popup.
   * @param {Object} config
   *   @param {Array<string>} config.colunas - Chaves dos dados.
   *   @param {Array<string>} config.headers - Cabeçalhos legíveis.
   *   @param {Array<Object>} config.dados - Registros.
   *   @param {string} config.nomeAba - Nome da aba principal.
   *   @param {string} config.prefixo - Prefixo do arquivo.
   *   @param {Array<Array>} [config.resumo] - Dados da aba "Resumo".
   */
  function exportarXLSX(doc, config) {
    if (!_XLSXLib) { alert('SheetJS não carregado.'); return; }

    var wsData = [config.headers];
    for (var i = 0; i < config.dados.length; i++) {
      var row = [];
      for (var j = 0; j < config.colunas.length; j++) {
        row.push(config.dados[i][config.colunas[j]] || '');
      }
      wsData.push(row);
    }

    var wb = _XLSXLib.utils.book_new();
    var ws = _XLSXLib.utils.aoa_to_sheet(wsData);
    ws['!cols'] = config.headers.map(function (h) { return { wch: Math.max(h.length + 2, 15) }; });
    _XLSXLib.utils.book_append_sheet(wb, ws, config.nomeAba || 'Dados');

    if (config.resumo) {
      var wsR = _XLSXLib.utils.aoa_to_sheet(config.resumo);
      wsR['!cols'] = [{ wch: 25 }, { wch: 30 }];
      _XLSXLib.utils.book_append_sheet(wb, wsR, 'Resumo');
    }

    var wbout = _XLSXLib.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    _download(doc, blob, config.prefixo + '_' + PAINEL.utils.timestampSufixo() + '.xlsx');
  }

  /**
   * Helper interno para disparar download.
   */
  function _download(doc, blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Exportar ──
  PAINEL.dataIO = {
    carregarSheetJS: carregarSheetJS,
    getXLSX: getXLSX,
    carregarXlsx: carregarXlsx,
    carregarManual: carregarManual,
    carregarManualTexto: carregarManualTexto,
    gerarCSV: gerarCSV,
    exportarXLSX: exportarXLSX,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
