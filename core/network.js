/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/network.js
 *  Camada de rede: POST para servlets SAT, gerenciamento de
 *  sessão, detecção de expiração e keepalive.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  /**
   * Obtém o ID da sessão Java (JSESSIONID) a partir dos cookies.
   * @returns {string}
   * @throws {Error} 'SESSAO_EXPIRADA' se não encontrado.
   */
  function getSessionId() {
    var m = document.cookie.match(/JSESSIONID=([^;]+)/);
    if (m) return m[1];
    throw new Error('SESSAO_EXPIRADA');
  }

  /**
   * Verifica se o HTML de resposta indica sessão expirada.
   * @param {string} text - Corpo da resposta.
   * @returns {boolean}
   */
  function isSessaoExpirada(text) {
    return text.length < 2000 &&
      text.indexOf('login') !== -1 &&
      text.indexOf('IdSession') === -1;
  }

  /**
   * Codifica parâmetros (Object ou Array de {name,value}) para urlencoded.
   * @param {Object|Array} params
   * @returns {string}
   */
  function encodeParams(params) {
    if (typeof params === 'string') return params;

    if (Array.isArray(params)) {
      return params.map(function (p) {
        return encodeURIComponent(p.name) + '=' + encodeURIComponent(p.value || '');
      }).join('&');
    }

    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null) v = '';
      if (Array.isArray(v)) {
        v.forEach(function (vi) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(vi));
        });
      } else {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
    });
    return parts.join('&');
  }

  /**
   * POST genérico para servlets SAT (same-origin).
   * Detecta sessão expirada automaticamente.
   *
   * @param {string} url - URL destino (ex: '/sat/servlet/ServletDirector').
   * @param {Object|Array|string} params - Parâmetros do POST.
   * @param {Object} [opts] - Opções adicionais.
   * @param {string} [opts.contentType] - Content-Type (default: urlencoded).
   * @param {string} [opts.credentials] - 'same-origin' | 'include' (default: same-origin).
   * @returns {Promise<string>} HTML/texto de resposta.
   * @throws {Error} 'SESSAO_EXPIRADA' ou 'HTTP {status}'.
   */
  async function post(url, params, opts) {
    opts = opts || {};
    var body = encodeParams(params);
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
      body: body,
      credentials: opts.credentials || 'same-origin',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('SESSAO_EXPIRADA');
      throw new Error('HTTP ' + resp.status);
    }
    var text = await resp.text();
    if (isSessaoExpirada(text)) throw new Error('SESSAO_EXPIRADA');
    return text;
  }

  /**
   * POST para SAT com credentials: include (para cross-origin ou SIACH).
   * Wrapper de conveniência.
   */
  async function postInclude(url, params, contentType) {
    return post(url, params, {
      contentType: contentType || 'application/x-www-form-urlencoded',
      credentials: 'include',
    });
  }

  /**
   * POST JSON para APIs REST (SIACH).
   * @param {string} url
   * @param {Object} body - Objeto a ser enviado como JSON.
   * @returns {Promise<Object>} Resposta parseada como JSON.
   */
  async function postJSON(url, body) {
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(body),
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
    return JSON.parse(text);
  }

  /**
   * GET JSON para APIs REST.
   * @param {string} url
   * @returns {Promise<Object>}
   */
  async function getJSON(url) {
    var resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
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
    return JSON.parse(text);
  }

  // ── Keepalive ──

  var _keepaliveTimers = {};

  /**
   * Inicia keepalive periódico para manter sessão ativa.
   * @param {string} id - Identificador único (ex: 'sat', 'siach').
   * @param {string} url - URL do endpoint de keepalive.
   * @param {Object|string} body - Corpo da requisição.
   * @param {Object} [opts] - Opções (credentials, contentType, intervalo, logFn).
   * @returns {string} ID do timer.
   */
  function iniciarKeepalive(id, url, body, opts) {
    opts = opts || {};
    var intervalo = opts.intervalo || (5 * 60 * 1000); // 5 min
    var logFn = opts.logFn || function () { };

    // Limpar anterior se existir
    pararKeepalive(id);

    _keepaliveTimers[id] = setInterval(function () {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
        body: typeof body === 'string' ? body : encodeParams(body),
        credentials: opts.credentials || 'same-origin',
      }).then(function () {
        logFn('[keepalive] Sessão ' + id + ' renovada.');
      }).catch(function () {
        logFn('[keepalive] Falha ao renovar ' + id + '.');
      });
    }, intervalo);

    return id;
  }

  /**
   * Para um keepalive específico.
   * @param {string} id
   */
  function pararKeepalive(id) {
    if (_keepaliveTimers[id]) {
      clearInterval(_keepaliveTimers[id]);
      delete _keepaliveTimers[id];
    }
  }

  /**
   * Para todos os keepalives ativos.
   */
  function pararTodosKeepalives() {
    Object.keys(_keepaliveTimers).forEach(pararKeepalive);
  }

  // ── Exportar ──
  PAINEL.network = {
    getSessionId: getSessionId,
    post: post,
    postInclude: postInclude,
    postJSON: postJSON,
    getJSON: getJSON,
    encodeParams: encodeParams,
    iniciarKeepalive: iniciarKeepalive,
    pararKeepalive: pararKeepalive,
    pararTodosKeepalives: pararTodosKeepalives,
  };

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
