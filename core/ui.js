/**
 * ═══════════════════════════════════════════════════════════
 *  PAINEL UNIFICADO — core/ui.js
 *  Motor de UI: popup, menu de módulos, tela de execução,
 *  log, progresso, timer e orquestração do loop principal.
 * ═══════════════════════════════════════════════════════════
 */
(function (PAINEL) {
  'use strict';

  var _modulos = [];
  var _pw = null;      // popup window
  var _doc = null;     // popup document

  // ══════════════════════════════════════════════════════════
  //  REGISTRO DE MÓDULOS
  // ══════════════════════════════════════════════════════════

  /**
   * Registra um módulo no painel.
   * @param {Object} mod - Objeto de módulo seguindo o contrato.
   */
  function registrarModulo(mod) {
    _modulos.push(mod);
  }

  // ══════════════════════════════════════════════════════════
  //  CSS DO PAINEL
  // ══════════════════════════════════════════════════════════
  var CSS = [
    'html,body{margin:0;height:100%;overflow:hidden;}',
    'body{background:#0c0c14;color:#ddd;font-family:"Segoe UI",Consolas,monospace;font-size:12px;display:flex;flex-direction:column;}',
    '*{box-sizing:border-box;}',

    /* Header */
    '#hdr{background:linear-gradient(135deg,#0d1b2a,#1b2838);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2a3a4a;flex-shrink:0;}',
    '#hdr .title{color:#56cfe1;font-weight:700;font-size:14px;letter-spacing:0.5px;}',
    '#hdr .subtitle{color:#667;font-size:10px;margin-top:2px;}',

    /* Buttons */
    '.btn{border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;font-family:inherit;transition:all 0.15s ease;font-weight:600;}',
    '.btn:hover{opacity:0.85;transform:translateY(-1px);}',
    '.btn:active{transform:translateY(0);}',
    '.btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;}',
    '.btn-sm{padding:4px 9px;font-size:10px;}',

    /* Menu grid */
    '#menu{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;}',
    '.mod-card{background:#141c28;border:1px solid #1e2d3d;border-radius:6px;padding:10px 12px;cursor:pointer;transition:all 0.2s ease;display:flex;flex-direction:column;gap:4px;}',
    '.mod-card:hover{background:#1a2636;border-color:#56cfe1;transform:translateY(-2px);box-shadow:0 4px 12px rgba(86,207,225,0.1);}',
    '.mod-card .mc-icon{font-size:20px;line-height:1;}',
    '.mod-card .mc-nome{font-weight:600;font-size:11px;color:#e0e0e0;}',
    '.mod-card .mc-desc{font-size:9px;color:#667;line-height:1.3;}',
    '.mod-card .mc-tag{display:inline-block;font-size:8px;padding:1px 5px;border-radius:3px;color:#fff;font-weight:600;margin-top:2px;width:fit-content;}',

    /* Exec view */
    '#exec{display:none;flex:1;flex-direction:column;overflow:hidden;}',
    '#actions{padding:8px 12px;border-bottom:1px solid #1e2d3d;flex-shrink:0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
    '#actions .hint{color:#555;font-size:9px;margin-left:6px;}',
    '#manualBox{display:none;padding:8px 12px;border-bottom:1px solid #1e2d3d;background:#101722;flex-shrink:0;}',
    '#manualBox .manual-title{color:#aaa;font-size:10px;margin-bottom:6px;white-space:pre-line;}',
    '#manualInput{width:100%;min-height:92px;max-height:180px;resize:vertical;background:#0b1020;color:#e8e8e8;border:1px solid #26364a;border-radius:4px;padding:8px;font-family:Consolas,monospace;font-size:11px;line-height:1.4;outline:none;}',
    '#manualInput:focus{border-color:#9b59b6;box-shadow:0 0 0 1px rgba(155,89,182,0.35);}',
    '#manualBox .manual-actions{display:flex;gap:6px;align-items:center;margin-top:6px;}',
    '#manualBox .manual-count{color:#667;font-size:9px;margin-left:auto;}',
    '#info{padding:8px 12px;flex-shrink:0;}',
    '#pt{margin-bottom:5px;color:#aaa;font-size:11px;}',
    '#pbar-bg{background:#1a1a2e;border-radius:4px;height:8px;overflow:hidden;}',
    '#pb{height:8px;width:0%;transition:width 0.3s ease;border-radius:4px;}',
    '#st{margin-top:6px;letter-spacing:0.5px;font-size:11px;}',
    '#tm{margin-top:3px;color:#555;font-size:10px;}',
    '#logarea{flex:1 1 auto;overflow-y:auto;padding:6px 12px 10px;border-top:1px solid #111;min-height:0;}',
    '.log-line{padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);white-space:pre-wrap;word-break:break-all;font-size:11px;font-family:Consolas,monospace;line-height:1.4;}',
  ].join('\n');

  // ══════════════════════════════════════════════════════════
  //  CRIAR POPUP
  // ══════════════════════════════════════════════════════════

  /**
   * Abre ou reutiliza o popup do painel.
   * @returns {{pw: Window, doc: Document}}
   */
  function abrirPopup() {
    if (_pw && !_pw.closed) {
      _pw.focus();
      return { pw: _pw, doc: _doc };
    }

    _pw = window.open('', '__painel_unificado__',
      'width=700,height=620,top=40,left=40,resizable=yes,scrollbars=no,toolbar=no,menubar=no');

    if (!_pw) {
      alert('Popup bloqueado! Permita popups para este site e tente novamente.');
      return null;
    }

    _pw.document.open();
    _pw.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Painel Automações</title>' +
      '<style>' + CSS + '</style>' +
      '</head><body>' +

      /* Header */
      '<div id="hdr">' +
        '<div>' +
          '<div class="title">⚡ Painel de Automações</div>' +
          '<div class="subtitle">SAT • SIACH • VROL</div>' +
        '</div>' +
        '<div id="hdr-btns">' +
          '<button class="btn btn-sm" id="btnVoltar" style="background:#334;color:#aaa;display:none;">← Menu</button>' +
        '</div>' +
      '</div>' +

      /* Menu view */
      '<div id="menu"></div>' +

      /* Exec view */
      '<div id="exec">' +
        '<div id="actions"></div>' +
        '<div id="manualBox"></div>' +
        '<div id="info">' +
          '<div id="pt">Aguardando input...</div>' +
          '<div id="pbar-bg"><div id="pb"></div></div>' +
          '<div id="st"></div>' +
          '<div id="tm">⏱ 00:00</div>' +
        '</div>' +
        '<div id="logarea"></div>' +
      '</div>' +

      '</body></html>'
    );
    _pw.document.close();
    _doc = _pw.document;

    // Cleanup on close
    _pw.addEventListener('beforeunload', function () {
      PAINEL.network.pararTodosKeepalives();
    });

    renderizarMenu();
    _vincularVoltar();

    return { pw: _pw, doc: _doc };
  }

  // ══════════════════════════════════════════════════════════
  //  RENDERIZAR MENU DE MÓDULOS
  // ══════════════════════════════════════════════════════════

  function renderizarMenu() {
    if (!_doc) return;
    var menuDiv = _doc.getElementById('menu');
    if (!menuDiv) return;
    menuDiv.innerHTML = '';

    var cores = {
      'SAT': '#1e6f5c',
      'SIACH': '#0077b6',
      'SAT+VROL': '#7b2d8e',
      'SAT+SIACH': '#d4740e',
    };

    _modulos.forEach(function (mod, idx) {
      var card = _doc.createElement('div');
      card.className = 'mod-card';
      card.innerHTML =
        '<div class="mc-icon">' + (mod.icone || '📋') + '</div>' +
        '<div class="mc-nome">' + mod.nome + '</div>' +
        '<div class="mc-desc">' + (mod.descricao || '') + '</div>' +
        '<div class="mc-tag" style="background:' + (cores[mod.sistema] || '#444') + ';">' +
          mod.sistema +
        '</div>';
      card.addEventListener('click', function () { iniciarModulo(mod); });
      menuDiv.appendChild(card);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NAVEGAÇÃO MENU ↔ EXECUÇÃO
  // ══════════════════════════════════════════════════════════

  function mostrarExec() {
    if (!_doc) return;
    _doc.getElementById('menu').style.display = 'none';
    _doc.getElementById('exec').style.display = 'flex';
    _doc.getElementById('btnVoltar').style.display = '';
  }

  function mostrarMenu() {
    if (!_doc) return;
    _doc.getElementById('menu').style.display = 'grid';
    _doc.getElementById('exec').style.display = 'none';
    _doc.getElementById('btnVoltar').style.display = 'none';
    PAINEL.network.pararTodosKeepalives();
    renderizarMenu();
  }

  function confirmarNoPainel(mensagem) {
    var painelWin = (_doc && _doc.defaultView) || _pw || window;
    if (painelWin.focus) painelWin.focus();
    return painelWin.confirm(mensagem);
  }

  function _vincularVoltar() {
    var btn = _doc.getElementById('btnVoltar');
    if (btn) btn.addEventListener('click', function () {
      if (confirmarNoPainel('Voltar ao menu? O progresso do módulo atual será mantido.')) {
        mostrarMenu();
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  FUNÇÕES DE UI (log, progresso, timer)
  // ══════════════════════════════════════════════════════════

  function addLog(txt) {
    if (!_doc) return;
    var logDiv = _doc.getElementById('logarea');
    if (!logDiv) return;
    var d = _doc.createElement('div');
    d.className = 'log-line';
    d.textContent = txt;
    logDiv.appendChild(d);
    while (logDiv.children.length > 400) logDiv.removeChild(logDiv.firstChild);
    setTimeout(function () { logDiv.scrollTop = logDiv.scrollHeight; }, 0);
  }

  function updateOverlay(atual, total, stats, inicioTs, corBarra) {
    if (!_doc) return;
    var pct = total > 0 ? Math.round(atual / total * 100) : 0;
    var pb = _doc.getElementById('pb');
    var pt = _doc.getElementById('pt');
    var st = _doc.getElementById('st');
    var tm = _doc.getElementById('tm');

    if (pb) {
      pb.style.width = pct + '%';
      pb.style.background = corBarra || 'linear-gradient(90deg,#56cfe1,#2ecc71)';
    }
    if (pt) pt.textContent = '[' + atual + '/' + total + '] ' + pct + '%';

    if (st && stats) {
      var parts = [];
      Object.keys(stats).forEach(function (k) {
        parts.push(k + ': ' + stats[k]);
      });
      st.textContent = parts.join('  │  ');
    }

    if (inicioTs > 0 && tm) {
      var elapsed = Math.floor((Date.now() - inicioTs) / 1000);
      var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var ss = String(elapsed % 60).padStart(2, '0');
      var eta = '';
      if (atual > 0 && atual < total) {
        var restSec = Math.floor(elapsed / atual * (total - atual));
        eta = ' │ ETA: ' + String(Math.floor(restSec / 60)).padStart(2, '0') +
          ':' + String(restSec % 60).padStart(2, '0');
      }
      tm.textContent = '⏱ ' + mm + ':' + ss + eta;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  INICIAR MÓDULO — Monta UI + orquestra execução
  // ══════════════════════════════════════════════════════════

  function iniciarModulo(mod) {
    mostrarExec();

    // Limpar estado visual
    var logDiv = _doc.getElementById('logarea');
    if (logDiv) logDiv.innerHTML = '';
    var pt = _doc.getElementById('pt');
    if (pt) pt.textContent = 'Aguardando input...';
    var pb = _doc.getElementById('pb');
    if (pb) pb.style.width = '0%';
    var st = _doc.getElementById('st');
    if (st) st.textContent = '';
    var tm = _doc.getElementById('tm');
    if (tm) tm.textContent = '⏱ 00:00';
    var hdr = _doc.getElementById('hdr');
    if (hdr) hdr.style.background = '';

    // Atualizar título
    var titleEl = _doc.querySelector('#hdr .title');
    if (titleEl) titleEl.textContent = (mod.icone || '📋') + ' ' + mod.nome;

    addLog('Módulo carregado: ' + mod.nome);
    addLog('Sistema: ' + mod.sistema);

    // Montar actions
    var actDiv = _doc.getElementById('actions');
    actDiv.innerHTML = '';
    var manualBox = _doc.getElementById('manualBox');
    if (manualBox) {
      manualBox.innerHTML = '';
      manualBox.style.display = 'none';
    }

    // Botão XLSX
    var btnXlsx = _doc.createElement('button');
    btnXlsx.className = 'btn';
    btnXlsx.style.cssText = 'background:#3498db;color:#fff;';
    btnXlsx.textContent = '▶ Carregar XLSX';
    actDiv.appendChild(btnXlsx);

    // Botão Manual
    var btnManual = _doc.createElement('button');
    btnManual.className = 'btn';
    btnManual.style.cssText = 'background:#9b59b6;color:#fff;';
    btnManual.textContent = '▶ Manual';
    actDiv.appendChild(btnManual);

    // Botão CSV parcial
    var btnCsv = _doc.createElement('button');
    btnCsv.className = 'btn btn-sm';
    btnCsv.style.cssText = 'background:#2ecc71;color:#fff;';
    btnCsv.textContent = '⇩ CSV parcial';
    actDiv.appendChild(btnCsv);

    // Botão Parar
    var btnStop = _doc.createElement('button');
    btnStop.className = 'btn btn-sm';
    btnStop.style.cssText = 'background:#e74c3c;color:#fff;';
    btnStop.textContent = '■ Parar';
    actDiv.appendChild(btnStop);

    // Hint
    if (mod.inputConfig && mod.inputConfig.instrucao) {
      var hint = _doc.createElement('span');
      hint.className = 'hint';
      hint.textContent = mod.inputConfig.instrucao;
      actDiv.appendChild(hint);
    }

    // Config UI extra (ex: dropdown bandeira)
    if (mod.configUI) mod.configUI(_doc);

    // Area de input manual dentro do proprio painel
    var parseManual = mod.inputConfig.parseManual || function (line) {
      return mod.inputConfig.parseRow([line]);
    };
    var manualInput = null;
    var manualCount = null;
    var btnManualRun = null;

    function contarEntradasManual(texto) {
      if (!texto) return 0;
      return String(texto).split(/[\n;]+/)
        .map(function (v) { return v.trim(); })
        .filter(function (v) { return v !== ''; })
        .length;
    }

    function atualizarContagemManual() {
      if (!manualInput || !manualCount) return;
      var qtd = contarEntradasManual(manualInput.value);
      manualCount.textContent = qtd + (qtd === 1 ? ' item' : ' itens');
    }

    if (manualBox) {
      var manualTitle = _doc.createElement('div');
      manualTitle.className = 'manual-title';
      manualTitle.textContent = mod.inputConfig.promptManual || 'Cole os itens (um por linha):';

      manualInput = _doc.createElement('textarea');
      manualInput.id = 'manualInput';
      manualInput.placeholder = 'Cole os itens aqui';
      manualInput.spellcheck = false;

      var manualActions = _doc.createElement('div');
      manualActions.className = 'manual-actions';

      btnManualRun = _doc.createElement('button');
      btnManualRun.className = 'btn';
      btnManualRun.style.cssText = 'background:#9b59b6;color:#fff;';
      btnManualRun.textContent = 'Processar';

      var btnManualCancel = _doc.createElement('button');
      btnManualCancel.className = 'btn btn-sm';
      btnManualCancel.style.cssText = 'background:#334;color:#aaa;';
      btnManualCancel.textContent = 'Cancelar';

      manualCount = _doc.createElement('span');
      manualCount.className = 'manual-count';
      manualCount.textContent = '0 itens';

      manualActions.appendChild(btnManualRun);
      manualActions.appendChild(btnManualCancel);
      manualActions.appendChild(manualCount);
      manualBox.appendChild(manualTitle);
      manualBox.appendChild(manualInput);
      manualBox.appendChild(manualActions);

      manualInput.addEventListener('input', atualizarContagemManual);
      manualInput.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && btnManualRun) {
          btnManualRun.click();
        }
      });
      btnManualCancel.addEventListener('click', function () {
        manualBox.style.display = 'none';
      });
    }

    // ── Estado de execução ──
    var _parar = false;
    var _resultados = [];

    btnStop.addEventListener('click', function () {
      _parar = true;
      btnStop.textContent = 'Parando...';
      btnStop.disabled = true;
      btnStop.style.background = '#888';
      addLog('>>> Parada solicitada. Aguardando fim do item atual...');
    });

    btnCsv.addEventListener('click', function () {
      if (_resultados.length === 0) { addLog('Nenhum resultado para exportar.'); return; }
      if (mod.exportFormat === 'xlsx') {
        addLog('Exportação XLSX parcial não implementada. Use CSV.');
      }
      PAINEL.dataIO.gerarCSV(_doc, mod.csvCols, _resultados, mod.id, 'parcial_' + PAINEL.utils.timestampSufixo());
    });

    // ── Função de execução do lote ──
    async function executarLote(lista) {
      if (!lista || lista.length === 0) { addLog('Nenhum item para processar.'); return; }

      // Reset
      _parar = false;
      _resultados = [];
      var processados = {};
      var stats = { '✅': 0, '❌': 0 };
      var inicioTs = Date.now();

      // Keepalive
      if (mod.keepaliveConfig) {
        PAINEL.network.iniciarKeepalive(
          mod.id, mod.keepaliveConfig.url, mod.keepaliveConfig.body,
          { logFn: addLog, credentials: mod.keepaliveConfig.credentials }
        );
      }

      // Inicialização do módulo (ex: navegação inicial SAT)
      if (mod.inicializar) {
        addLog('Inicializando módulo...');
        try {
          await mod.inicializar({
            network: PAINEL.network, utils: PAINEL.utils,
            dataIO: PAINEL.dataIO, addLog: addLog, doc: _doc,
          });
        } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') {
            addLog('>>> SESSÃO EXPIRADA durante inicialização.');
            PAINEL.network.pararTodosKeepalives();
            return;
          }
          addLog('AVISO: Inicialização falhou — ' + e.message);
        }
      }

      // Retomada
      var toStr = mod.inputConfig.toStr || String;
      var estadoSalvo = PAINEL.persistence.tentarRetomar(
        mod.storageKey || ('_painel_' + mod.id),
        lista,
        toStr,
        confirmarNoPainel
      );
      var paraProcessar = lista.slice();

      if (estadoSalvo) {
        processados = estadoSalvo.processados;
        _resultados = estadoSalvo.resultados;
        if (estadoSalvo.stats) stats = estadoSalvo.stats;
        paraProcessar = lista.filter(function (it) { return !processados[toStr(it)]; });
        addLog('Retomando: ' + paraProcessar.length + ' itens restantes.');
      }

      var total = lista.length;
      var jaProcessados = Object.keys(processados).length;
      var sessaoExp = false;

      addLog('Início │ Total: ' + total + ' │ A processar: ' + paraProcessar.length);

      // Esconder ações de input
      btnXlsx.style.display = 'none';
      btnManual.style.display = 'none';
      if (manualBox) manualBox.style.display = 'none';

      for (var i = 0; i < paraProcessar.length; i++) {
        var item = paraProcessar[i];
        var chaveItem = toStr(item);
        var idxGlobal = jaProcessados + i + 1;
        var largura = String(total).length;
        var prefixo = '[' + String(idxGlobal).padStart(largura, '0') + '/' + total + ']';

        if (_parar) {
          addLog('>>> Processamento interrompido no item ' + (i + 1) + '.');
          PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
            listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
          });
          var ptE = _doc.getElementById('pt');
          if (ptE) ptE.textContent = 'PARADO — reabra o painel para continuar.';
          break;
        }

        updateOverlay(idxGlobal, total, stats, inicioTs, mod.cor);

        try {
          var regs = await mod.processarUm(item, {
            addLog: addLog,
            network: PAINEL.network,
            utils: PAINEL.utils,
            dataIO: PAINEL.dataIO,
            doc: _doc,
          });

          // processarUm pode retornar um objeto ou array de objetos
          if (!Array.isArray(regs)) regs = [regs];
          var itemOk = true;
          regs.forEach(function (reg) {
            _resultados.push(reg);
            var ok = !reg.STATUS || reg.STATUS === 'OK' || reg.STATUS.indexOf('OK') === 0;
            if (!ok) itemOk = false;
          });
          if (itemOk) stats['✅']++; else stats['❌']++;

          // Log customizado ou default
          if (mod.logItem) {
            mod.logItem(prefixo, item, regs, addLog);
          } else {
            var firstReg = regs[0];
            var statusTxt = firstReg.STATUS || 'OK';
            addLog(prefixo + ' ' + statusTxt + ' │ ' + chaveItem);
          }

        } catch (e) {
          if (e.message === 'SESSAO_EXPIRADA') {
            addLog('>>> SESSÃO EXPIRADA no item ' + (i + 1) + '. Progresso salvo.');
            PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
              listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
            });
            sessaoExp = true;
            var hdrE = _doc.getElementById('hdr');
            if (hdrE) hdrE.style.background = 'linear-gradient(135deg,#5c0000,#2a0000)';
            var ptE2 = _doc.getElementById('pt');
            if (ptE2) ptE2.textContent = 'SESSÃO EXPIRADA — faça login e reabra o painel.';
            break;
          }
          stats['❌']++;
          var regErro = {};
          mod.csvCols.forEach(function (c) { regErro[c] = ''; });
          regErro.STATUS = 'ERRO: ' + e.message;
          _resultados.push(regErro);
          addLog(prefixo + ' ERRO │ ' + chaveItem + ' │ ' + e.message);
        }

        processados[chaveItem] = true;
        PAINEL.persistence.salvarProgresso(mod.storageKey || ('_painel_' + mod.id), {
          listaOriginal: lista, processados: processados, resultados: _resultados, stats: stats, toStr: toStr,
        });

        // Controle de intervalo e lotes
        if (!sessaoExp && !_parar && i < paraProcessar.length - 1) {
          if (mod.tamLote && ((i + 1) % mod.tamLote === 0)) {
            var numLote = Math.ceil((i + 1) / mod.tamLote);
            addLog('--- Lote ' + numLote + ' concluído. Pausa de ' + ((mod.pausaLoteMS || 3000) / 1000) + 's...');
            await PAINEL.utils.esperar(mod.pausaLoteMS || 3000);
            addLog('--- Retomando...');
          } else {
            await PAINEL.utils.esperar(mod.intervaloMS || 300);
          }
        }
      }

      // Finalização
      updateOverlay(total, total, stats, inicioTs, mod.cor);
      addLog('');
      addLog('══════════ RESUMO ══════════');
      Object.keys(stats).forEach(function (k) {
        addLog('  ' + k + ' : ' + stats[k]);
      });
      addLog('  TOTAL : ' + total);

      if (!sessaoExp && !_parar) {
        PAINEL.persistence.limparProgresso(mod.storageKey || ('_painel_' + mod.id));
        if (mod.exportFormat === 'xlsx') {
          PAINEL.dataIO.exportarXLSX(_doc, {
            colunas: mod.csvCols,
            headers: mod.xlsxHeaders || mod.csvCols,
            dados: _resultados,
            nomeAba: mod.nome,
            prefixo: mod.id,
            resumo: mod.gerarResumo ? mod.gerarResumo(_resultados, stats) : null,
          });
        } else {
          PAINEL.dataIO.gerarCSV(_doc, mod.csvCols, _resultados, mod.id);
        }
      }

      PAINEL.network.pararTodosKeepalives();

      // Mostrar botões novamente
      btnXlsx.style.display = '';
      btnManual.style.display = '';
      btnStop.textContent = '■ Parar';
      btnStop.disabled = false;
      btnStop.style.background = '#e74c3c';
    }

    // ── Vincular eventos de input ──
    btnXlsx.addEventListener('click', async function () {
      try {
        await PAINEL.dataIO.carregarSheetJS(_doc);
        var lista = await PAINEL.dataIO.carregarXlsx(_doc, {
          parseRow: mod.inputConfig.parseRow,
          skipHeader: mod.inputConfig.skipHeader !== false,
          logFn: addLog,
        });
        await executarLote(lista);
      } catch (e) {
        addLog('ERRO: ' + e.message);
      }
    });

    btnManual.addEventListener('click', function () {
      if (!manualBox || !manualInput) {
        addLog('ERRO: campo manual nao encontrado no painel.');
        return;
      }
      manualBox.style.display = 'block';
      atualizarContagemManual();
      setTimeout(function () { manualInput.focus(); }, 0);
    });

    if (btnManualRun) {
      btnManualRun.addEventListener('click', async function () {
        var lista;
        try {
          lista = PAINEL.dataIO.carregarManualTexto(manualInput.value, parseManual);
        } catch (e) {
          addLog('ERRO no input manual: ' + e.message);
          return;
        }

        if (lista.length > 0) {
          addLog(lista.length + ' itens informados manualmente.');
          btnManualRun.disabled = true;
          try {
            await PAINEL.dataIO.carregarSheetJS(_doc);
          } catch (e) { /* ok se não precisar de XLSX para manual */ }
          try {
            await executarLote(lista);
          } finally {
            btnManualRun.disabled = false;
          }
        } else {
          addLog('Nenhum item informado.');
          manualInput.focus();
        }
      });
    }

    addLog('Pronto. Selecione o XLSX ou insira manualmente.');
  }

  // ══════════════════════════════════════════════════════════
  //  BOTÃO FLUTUANTE (injetado na página SAT/SIACH)
  // ══════════════════════════════════════════════════════════

  /**
   * Encontra o melhor document para injetar o botão flutuante.
   * O SAT usa framesets — document.body é <frameset>, não <body>.
   * Tentamos: body real → frames visíveis → fallback abrirPopup direto.
   */
  function _encontrarDocAlvo() {
    // 1. Documento atual tem body real (não frameset)?
    if (document.body && document.body.tagName !== 'FRAMESET') {
      return document;
    }
    // 2. Tentar frames/iframes visíveis
    var frames = document.querySelectorAll('frame, iframe');
    for (var i = 0; i < frames.length; i++) {
      try {
        var fd = frames[i].contentDocument || frames[i].contentWindow.document;
        if (fd && fd.body && fd.body.tagName !== 'FRAMESET') {
          return fd;
        }
      } catch (e) { /* cross-origin, skip */ }
    }
    // 3. Tentar recursivamente em sub-frames
    for (var i = 0; i < frames.length; i++) {
      try {
        var fd = frames[i].contentDocument || frames[i].contentWindow.document;
        if (!fd) continue;
        var subFrames = fd.querySelectorAll('frame, iframe');
        for (var j = 0; j < subFrames.length; j++) {
          try {
            var sfd = subFrames[j].contentDocument || subFrames[j].contentWindow.document;
            if (sfd && sfd.body && sfd.body.tagName !== 'FRAMESET') {
              return sfd;
            }
          } catch (e2) { }
        }
      } catch (e) { }
    }
    return null;
  }

  /**
   * Injeta um botão flutuante no canto inferior direito da página.
   * Ao clicar, abre o popup do painel.
   * Lida com framesets (SAT) injetando no primeiro frame com <body> real.
   * Se não encontrar alvo, abre o popup diretamente.
   */
  function injetarBotaoFlutuante() {
    var docAlvo = _encontrarDocAlvo();

    if (!docAlvo) {
      console.warn('[Painel] Nenhum body encontrado (frameset). Abrindo popup direto...');
      abrirPopup();
      return;
    }

    // Evitar duplicatas
    if (docAlvo.getElementById('__painel_fab__')) return;

    var fab = docAlvo.createElement('div');
    fab.id = '__painel_fab__';
    fab.innerHTML = '⚡';
    fab.title = 'Painel de Automações (ou digite painelAbrir() no console)';
    fab.style.cssText = [
      'position:fixed;bottom:20px;right:20px;z-index:999999;',
      'width:48px;height:48px;border-radius:50%;',
      'background:linear-gradient(135deg,#56cfe1,#3498db);',
      'color:#fff;font-size:22px;',
      'display:flex;align-items:center;justify-content:center;',
      'cursor:pointer;box-shadow:0 4px 16px rgba(52,152,219,0.4);',
      'transition:all 0.2s ease;user-select:none;',
    ].join('');

    fab.addEventListener('mouseenter', function () {
      fab.style.transform = 'scale(1.1)';
      fab.style.boxShadow = '0 6px 20px rgba(52,152,219,0.6)';
    });
    fab.addEventListener('mouseleave', function () {
      fab.style.transform = 'scale(1)';
      fab.style.boxShadow = '0 4px 16px rgba(52,152,219,0.4)';
    });
    fab.addEventListener('click', function () {
      abrirPopup();
    });

    docAlvo.body.appendChild(fab);
    console.log('[Painel] Botão ⚡ injetado com sucesso.');
  }

  // ── Exportar ──
  PAINEL.ui = {
    registrarModulo: registrarModulo,
    abrirPopup: abrirPopup,
    mostrarMenu: mostrarMenu,
    injetarBotaoFlutuante: injetarBotaoFlutuante,
    addLog: addLog,
    updateOverlay: updateOverlay,
  };

  // Atalho direto no core
  PAINEL.registrarModulo = registrarModulo;

  // Atalho global para abrir via console: painelAbrir()
  window.painelAbrir = abrirPopup;

})(window.__PAINEL_CORE__ = window.__PAINEL_CORE__ || {});
