/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/persistence.js
 *  Persistência genérica via localStorage para retomada de
 *  processamento após expiração de sessão.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Gera assinatura de uma lista para validar compatibilidade na retomada.
   * Combina os 3 primeiros itens + tamanho total.
   * @param {Array} lista - Lista de itens (strings ou objects).
   * @param {Function} [toStr] - Função para converter item em string (default: String).
   * @returns {string}
   */
  function gerarAssinatura(lista, toStr) {
    toStr = toStr || String;
    return lista.slice(0, 3).map(toStr).join(',') + '|' + lista.length;
  }

  /**
   * Salva o progresso atual no localStorage.
   * @param {string} chave - Chave de storage única do módulo.
   * @param {Object} estado - Objeto contendo:
   *   @param {Array} estado.listaOriginal - Lista completa de itens.
   *   @param {Object} estado.processados - Mapa de itens já processados.
   *   @param {Array} estado.resultados - Resultados acumulados.
   *   @param {Object} [estado.stats] - Contadores opcionais.
   *   @param {Function} [estado.toStr] - Função para gerar assinatura dos itens.
   */
  function salvarProgresso(chave, estado) {
    try {
      localStorage.setItem(chave, JSON.stringify({
        assinatura: gerarAssinatura(estado.listaOriginal, estado.toStr),
        processados: estado.processados,
        resultados: estado.resultados,
        stats: estado.stats || null,
        ts: new Date().toISOString(),
      }));
    } catch (e) { /* quota exceeded or private browsing */ }
  }

  /**
   * Verifica se existe progresso salvo compatível com a lista fornecida.
   * Se existir, pergunta ao usuário se deseja continuar.
   *
   * @param {string} chave - Chave de storage do módulo.
   * @param {Array} lista - Lista atual de itens.
   * @param {Function} [toStr] - Mesma função usada em salvarProgresso.
   * @param {Function} [confirmFn] - Função de confirmação no contexto da UI.
   * @returns {Object|null} Estado salvo {processados, resultados, stats} ou null.
   */
  function tentarRetomar(chave, lista, toStr, confirmFn) {
    try {
      var salvo = localStorage.getItem(chave);
      if (!salvo) return null;

      var estado = JSON.parse(salvo);
      var assinatura = gerarAssinatura(lista, toStr);

      if (estado.assinatura !== assinatura) {
        localStorage.removeItem(chave);
        return null;
      }

      var nProc = Object.keys(estado.processados).length;
      var confirmar = confirmFn || function (mensagem) { return confirm(mensagem); };
      if (nProc > 0 && confirmar(
        'Progresso anterior encontrado: ' + nProc + '/' + lista.length + ' itens.\n' +
        'Continuar de onde parou?'
      )) {
        return {
          processados: estado.processados,
          resultados: estado.resultados,
          stats: estado.stats || null,
        };
      }

      localStorage.removeItem(chave);
    } catch (e) { }
    return null;
  }

  /**
   * Remove progresso salvo.
   * @param {string} chave
   */
  function limparProgresso(chave) {
    try { localStorage.removeItem(chave); } catch (e) { }
  }

  // ── Exportar ──
  PAINEL.persistence = {
    gerarAssinatura: gerarAssinatura,
    salvarProgresso: salvarProgresso,
    tentarRetomar: tentarRetomar,
    limparProgresso: limparProgresso,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
