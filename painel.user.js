// ==UserScript==
// @name         Painel Automações CEF
// @namespace    stefanini/automacoes
// @version      1.0.9
// @updateURL    https://raw.githubusercontent.com/kyuud/Utilitarios-SAT/main/painel.prod.user.js
// @downloadURL  https://raw.githubusercontent.com/kyuud/Utilitarios-SAT/main/painel.prod.user.js
// @description  Painel de controle unificado para automações SAT/SIACH/VROL
// @author       Wallyson Batista
// @match        https://cartoes.extracaixa/*
// @match        https://cartoes.extracaixa:*/*
// @match        https://vrol.visaonline.com/*
// @match        https://www.vrol.visaonline.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_info
// @grant        unsafeWindow
// @run-at       document-idle
// @noframes
// ==/UserScript==

/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — Tampermonkey Entry Point
 *
 *  Este arquivo é o ponto de entrada para o Tampermonkey.
 *  Para usar MANUALMENTE (sem Tampermonkey), utilize o arquivo
 *  gerado pelo build.js: painelUnificado.bundle.js
 *
 *  Para DESENVOLVIMENTO, o build.js concatena core/ + modules/
 *  e embute tudo neste wrapper.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── Guard: evita execução duplicada ──
  if (window.__PAINEL_INIT__) return;
  window.__PAINEL_INIT__ = true;
  window.__PAINEL_VERSION__ = '1.0.9';

  // ===========================================================
  //  PLACEHOLDER: No build final, o conteúdo de core/* e
  //  modules/* será injetado aqui pelo build.js.
  //  Durante desenvolvimento, carregue os arquivos via
  //  servidor local (ver instruções no README).
  // ===========================================================

  // ── Modo Desenvolvimento: carrega scripts de um servidor local ──
  var DEV_MODE = false;  // Mude para true durante desenvolvimento
  var DEV_SERVER = 'http://localhost:8080/PainelUnificado';

  if (DEV_MODE) {
    var scripts = [
      '/core/utils.js',
      '/core/network.js',
      '/core/vrolBridge.js',
      '/core/persistence.js',
      '/core/dataIO.js',
      '/core/ui.js',
      // Módulos
      '/modules/mod_consulta_redes.js',
      '/modules/mod_nucaso.js',
      '/modules/mod_vinculacao_voucher.js',
      '/modules/mod_detalhe_direto.js',
      '/modules/mod_compra_segura.js',
      '/modules/mod_reportes_fraude.js',
      '/modules/mod_consulta_completa.js',
      '/modules/mod_incoming_voucher.js',
      '/modules/mod_sat_vrol.js',
      '/modules/mod_siach_ocorrencias.js',
    ];

    (async function carregarDev() {
      for (var i = 0; i < scripts.length; i++) {
        await new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = DEV_SERVER + scripts[i] + '?t=' + Date.now();
          s.onload = resolve;
          s.onerror = function () {
            console.error('[Painel] Falha ao carregar: ' + scripts[i]);
            resolve(); // continua mesmo com erro
          };
          document.head.appendChild(s);
        });
      }
      // Inicializar após todos os scripts carregarem
      if (window.__PAINEL_CORE__ &&
          window.__PAINEL_CORE__.vrolBridge &&
          window.__PAINEL_CORE__.vrolBridge.isVrolHost()) {
        window.__PAINEL_CORE__.vrolBridge.instalarServidor();
        console.log('[Painel] DEV MODE - Ponte VROL ativa.');
      } else if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {
        window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();
        console.log('[Painel] DEV MODE — Botão flutuante injetado.');
      }
    })();
    return;
  }

  // ── Modo Produção: tudo está inline (injetado pelo build.js) ──
  // BUILD_INJECT_START
  // (O build.js substituirá esta seção pelo conteúdo dos scripts)
  // BUILD_INJECT_END

  // ── Inicializar ──
  if (window.__PAINEL_CORE__ &&
      window.__PAINEL_CORE__.vrolBridge &&
      window.__PAINEL_CORE__.vrolBridge.isVrolHost()) {
    window.__PAINEL_CORE__.vrolBridge.instalarServidor();
    console.log('[Painel] Ponte VROL ativa.');
  } else if (window.__PAINEL_CORE__ && window.__PAINEL_CORE__.ui) {
    window.__PAINEL_CORE__.ui.injetarBotaoFlutuante();
    console.log('[Painel] Botão flutuante injetado com sucesso.');
  }

})();
