/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/utils.js
 *  Funções utilitárias compartilhadas por todos os módulos.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Pausa a execução por um tempo determinado (delay assíncrono).
   * @param {number} ms - Milissegundos.
   * @returns {Promise<void>}
   */
  function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Retorna data/hora atual formatada: "2026-05-08 14:30:00"
   * @returns {string}
   */
  function agora() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }

  /**
   * Formata uma data ISO para "YYYY-MM-DD".
   * @param {string} dateStr - String de data (ISO ou qualquer formato Date-parseable).
   * @returns {string}
   */
  function formatarData(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().replace(/[TZ].*/g, '').trim();
    } catch (e) {
      return String(dateStr);
    }
  }

  /**
   * Preenche com zeros à esquerda.
   * @param {*} valor
   * @param {number} tamanho
   * @returns {string}
   */
  function zeroFill(valor, tamanho) {
    var s = String(valor || '');
    while (s.length < tamanho) s = '0' + s;
    return s;
  }

  /**
   * Gera sufixo de timestamp para nomes de arquivo.
   * Ex: "2026-05-08-14-30-00"
   * @returns {string}
   */
  function timestampSufixo() {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  }

  /**
   * Extrai o valor de um campo hidden input de um HTML SAT.
   * Tenta diversas combinações de name/id + value.
   * @param {string} html - HTML completo.
   * @param {string} fieldName - Nome do campo.
   * @returns {string}
   */
  function extrairCampoHTML(html, fieldName) {
    var r1 = new RegExp("name=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m1 = html.match(r1);
    if (m1) return m1[1];
    var r2 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*name=['\"]" + fieldName + "['\"]", 'i');
    var m2 = html.match(r2);
    if (m2) return m2[1];
    var r3 = new RegExp("id=['\"]" + fieldName + "['\"][^>]*value=['\"]([^'\"]*?)['\"]", 'i');
    var m3 = html.match(r3);
    if (m3) return m3[1];
    var r4 = new RegExp("value=['\"]([^'\"]*?)['\"][^>]*id=['\"]" + fieldName + "['\"]", 'i');
    var m4 = html.match(r4);
    return m4 ? m4[1] : '';
  }

  /**
   * Parseia resposta SAT no formato SIDATOS:K1=V1|K2=V2|...
   * @param {string} response - String de resposta do SAT.
   * @returns {Object} Mapa chave→valor.
   */
  function parseSIDATOS(response) {
    var result = {};
    var str = response;
    var idx = str.indexOf('SIDATOS:');
    if (idx !== -1) str = str.substring(idx + 8);
    var pairs = str.split('|');
    for (var i = 0; i < pairs.length; i++) {
      var eqIdx = pairs[i].indexOf('=');
      if (eqIdx > 0) {
        var key = pairs[i].substring(0, eqIdx).trim();
        var val = pairs[i].substring(eqIdx + 1);
        if (key) result[key] = val;
      }
    }
    return result;
  }

  /**
   * Extrai valor adjacente via XPath em um DOM parseado.
   * Busca o td-label e retorna o texto do td-sibling.
   * @param {Document} doc - DOM parseado.
   * @param {string} xpath - XPath para o label.
   * @returns {string}
   */
  function extractByXPath(doc, xpath) {
    try {
      var result = doc.evaluate(xpath, doc.body || doc.documentElement, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (result.snapshotLength > 0) {
        var sibling = result.snapshotItem(0).parentNode.children[1];
        return sibling ? sibling.textContent.trim() : '';
      }
    } catch (e) { }
    return '';
  }

  /**
   * Mapa de códigos de bandeira para nomes.
   */
  var CODIGO_PARA_BANDEIRA = {
    '1': 'VISA',
    '2': 'MASTERCARD',
    '7': 'ELO',
    '14': 'ELO INTERNACIONAL'
  };

  // ── Exportar ──
  PAINEL.utils = {
    esperar: esperar,
    agora: agora,
    formatarData: formatarData,
    zeroFill: zeroFill,
    timestampSufixo: timestampSufixo,
    extrairCampoHTML: extrairCampoHTML,
    parseSIDATOS: parseSIDATOS,
    extractByXPath: extractByXPath,
    CODIGO_PARA_BANDEIRA: CODIGO_PARA_BANDEIRA,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
