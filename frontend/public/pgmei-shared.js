/* Comportamento compartilhado das telas internas do PGMEI (estudo).
   As páginas foram salvas com SingleFile e não possuem Bootstrap/jQuery. */
(function () {
  function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

  function maskCnpj(v) {
    var d = onlyDigits(v).slice(0, 14), o = '';
    for (var i = 0; i < d.length; i++) {
      if (i === 2) o += '.'; if (i === 5) o += '.'; if (i === 8) o += '/'; if (i === 12) o += '-';
      o += d[i];
    }
    return o;
  }

  function getCnpj() {
    var daUrl = onlyDigits(new URLSearchParams(window.location.search).get('cnpj') || '');
    if (daUrl.length === 14) {
      try { sessionStorage.setItem('pgmei_cnpj', daUrl); } catch (e) {}
      return daUrl;
    }
    // Sem CNPJ na URL (ex: após um F5 na raiz) — recupera a sessão
    var daSessao = '';
    try { daSessao = onlyDigits(sessionStorage.getItem('pgmei_cnpj') || ''); } catch (e) {}
    return daSessao;
  }

  function encerrarSessao() {
    try {
      sessionStorage.removeItem('pgmei_cnpj');
      sessionStorage.removeItem('pgmei_nome');
      sessionStorage.removeItem('pgmei_cnpj_fmt');
    } catch (e) {}
  }

  function preencherContribuinte(cnpj) {
    var elCnpj = document.getElementById('pg-cnpj');
    var elNome = document.getElementById('pg-nome');
    if (elCnpj) elCnpj.textContent = cnpj ? maskCnpj(cnpj) : '--';
    if (!cnpj) { if (elNome) elNome.textContent = 'CNPJ não informado'; return; }

    // Usa o nome já em cache (buscado durante o carregamento da tela de identificação)
    var emCache = '';
    try { emCache = sessionStorage.getItem('pgmei_nome') || ''; } catch (e) {}
    if (elNome && emCache) elNome.textContent = emCache;

    fetch('/api/consulta-cnpj/' + cnpj)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var nome = data.nome || 'Contribuinte não localizado';
        if (elNome) elNome.textContent = nome;
        if (elCnpj && data.cnpj_formatado) elCnpj.textContent = data.cnpj_formatado;
        try {
          sessionStorage.setItem('pgmei_nome', nome);
          sessionStorage.setItem('pgmei_cnpj_fmt', data.cnpj_formatado || '');
        } catch (e) {}
      })
      .catch(function () {
        if (elNome && !emCache) elNome.textContent = 'Não foi possível consultar o nome agora.';
      });
  }

  function ajustarLinksNavbar(cnpj) {
    var qs = cnpj ? ('?cnpj=' + cnpj) : '';
    document.querySelectorAll('nav .navbar-nav > li > a').forEach(function (a) {
      var t = (a.textContent || '').trim().toLowerCase();
      if (t.indexOf('inicio') === 0 || t.indexOf('início') === 0) {
        // "Inicio" mantém o contribuinte logado na tela inicial
        a.setAttribute('href', '/pgmei2.html' + qs);
      } else if (t.indexOf('sair') === 0) {
        // "Sair" encerra a sessão e volta para a tela de identificação
        a.setAttribute('href', '/pgmei.html');
        a.addEventListener('click', encerrarSessao);
      } else if (t.indexOf('emitir guia') === 0) {
        a.setAttribute('href', '/pgmei3.html' + qs);
      }
    });
  }

  function criarPopover() {
    var el = document.createElement('div');
    el.id = 'pg-popover';
    el.innerHTML = '<h3 class="pop-title"></h3><div class="pop-body"></div>';
    document.body.appendChild(el);
    return el;
  }

  function dropdownNavbar(popover) {
    function fecharTudo() {
      document.querySelectorAll('.dropdown.open, .bootstrap-select.open').forEach(function (o) {
        o.classList.remove('open');
        var a = o.querySelector('.dropdown-toggle');
        if (a) a.setAttribute('aria-expanded', 'false');
      });
      popover.classList.remove('show');
    }

    document.querySelectorAll('.dropdown > .dropdown-toggle').forEach(function (tg) {
      tg.addEventListener('click', function (e) {
        e.preventDefault();
        var li = tg.parentNode;
        var aberto = li.classList.contains('open');
        fecharTudo();
        if (!aberto) {
          li.classList.add('open');
          tg.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.querySelectorAll('.dropdown-menu li.disabled > a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var rect = a.getBoundingClientRect();
        popover.querySelector('.pop-title').textContent = a.getAttribute('data-original-title') || 'Acesso restrito';
        popover.querySelector('.pop-body').textContent = a.getAttribute('data-content') || '';
        popover.classList.add('show');
        popover.style.top = (rect.top + window.pageYOffset) + 'px';
        popover.style.left = (rect.right + window.pageXOffset + 10) + 'px';
      });
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('.dropdown') || e.target.closest('.bootstrap-select') || e.target.closest('#pg-popover')) return;
      fecharTudo();
    });
  }

  /* Reproduz o bootstrap-select (combo de Ano-Calendário) sem a lib original */
  function selectpicker() {
    document.querySelectorAll('.btn-group.bootstrap-select').forEach(function (grupo) {
      var select = grupo.querySelector('select');
      var botao = grupo.querySelector('.dropdown-toggle');
      var menu = grupo.querySelector('.dropdown-menu');
      var rotulo = grupo.querySelector('.filter-option');
      if (!select || !botao || !menu) return;

      menu.classList.remove('open', 'sf-hidden');
      menu.removeAttribute('style');

      var lista = document.createElement('ul');
      lista.className = 'dropdown-menu-inner';
      Array.prototype.forEach.call(select.options, function (opt, idx) {
        var texto = (opt.textContent || '').trim();
        if (!texto) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-testid', 'ano-opcao-' + texto);
        a.innerHTML = '<span class="text">' + texto + '</span>';
        a.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          select.selectedIndex = idx;
          if (rotulo) rotulo.textContent = texto;
          botao.classList.remove('bs-placeholder');
          lista.querySelectorAll('li').forEach(function (o) { o.classList.remove('selected'); });
          li.classList.add('selected');
          grupo.classList.remove('open');
          botao.setAttribute('aria-expanded', 'false');
          select.dispatchEvent(new Event('change'));
        });
        li.appendChild(a);
        lista.appendChild(li);
      });
      menu.innerHTML = '';
      menu.appendChild(lista);

      botao.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var aberto = grupo.classList.contains('open');
        document.querySelectorAll('.dropdown.open, .bootstrap-select.open').forEach(function (o) {
          o.classList.remove('open');
        });
        if (!aberto) {
          grupo.classList.add('open');
          botao.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  function spinnerLadda(btn) {
    var alvo = btn.querySelector('.ladda-spinner');
    if (!alvo || alvo.dataset.pronto) return;
    var barras = '';
    for (var k = 0; k < 12; k++) {
      barras += '<i style="transform:rotate(' + (k * 30) + 'deg);animation-delay:' + (-(12 - k) / 12).toFixed(3) + 's"></i>';
    }
    alvo.innerHTML = '<span class="pgmei-ladda">' + barras + '</span>';
    alvo.dataset.pronto = '1';
  }

  function criarBanner() {
    var el = document.createElement('div');
    el.id = 'pgmei-banner';
    el.innerHTML = '<span class="pgmei-banner-icon"></span><span class="pgmei-banner-msg"></span>'
      + '<button type="button" class="pgmei-banner-close" aria-label="Fechar">&times;</button>';
    var secao = document.querySelector('section[role=contentinfo]') || document.querySelector('section');
    if (secao && secao.parentNode) secao.parentNode.insertBefore(el, secao);
    else document.body.insertBefore(el, document.body.firstChild);
    return el;
  }

  var ESCUDO = '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M12 2L4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z" fill="#fff"/>'
    + '<rect x="11" y="7" width="2" height="7" rx="1" fill="#b5312b"/>'
    + '<rect x="11" y="16" width="2" height="2" rx="1" fill="#b5312b"/></svg>';

  window.PGMEI = {
    onlyDigits: onlyDigits,
    maskCnpj: maskCnpj,
    getCnpj: getCnpj,
    spinnerLadda: spinnerLadda,
    init: function () {
      var cnpj = getCnpj();
      if (!cnpj) {
        // sem sessão: volta para a identificação
        window.location.replace('/pgmei.html');
        return '';
      }
      preencherContribuinte(cnpj);
      ajustarLinksNavbar(cnpj);
      dropdownNavbar(criarPopover());
      selectpicker();

      var banner = criarBanner();
      var icone = banner.querySelector('.pgmei-banner-icon');
      var msg = banner.querySelector('.pgmei-banner-msg');
      var timer = null;
      function esconder() { if (timer) { clearTimeout(timer); timer = null; } banner.className = ''; }
      banner.querySelector('.pgmei-banner-close').addEventListener('click', esconder);
      window.PGMEI.alerta = function (texto) {
        if (timer) clearTimeout(timer);
        banner.classList.remove('fade-out');
        banner.className = 'show err';
        icone.innerHTML = ESCUDO;
        msg.textContent = texto;
        timer = setTimeout(function () {
          banner.classList.add('fade-out');
          setTimeout(function () { banner.className = ''; }, 800);
        }, 2000);
      };
      return cnpj;
    }
  };
})();
