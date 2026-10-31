/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · notas al pie (A-03) y citas (A-05) en la lectura

   Formato guardado en cuerpo_html:
     · la marca en el texto:   <sup class="np"></sup>   (vacía: el símbolo
       lo pone la lectura y así no altera el texto de las reacciones)
     · las notas, al final:     <ol class="notas-pie [numeros]"><li><p>…</p></li>…</ol>
       La marca N corresponde a la nota N (por orden de aparición).

   La nota se abre en una hoja que sube desde abajo (igual en scroll y en
   páginas), de máximo 60 % del alto, que nunca tapa su marca.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  var NADA = function () {};

  function movimiento() { return RA.reduceMovimiento() ? 'auto' : 'smooth'; }

  /* ── La hoja (se usa para las notas y para los referentes de las citas) ── */
  function crearHoja(opciones) {
    var el = document.createElement('section');
    el.className = 'hoja-nota';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('tabindex', '-1');
    el.innerHTML = '<div class="hoja-nota__asa" aria-hidden="true"></div>' +
      '<header class="hoja-nota__cab"><span class="hoja-nota__marca"></span><span class="hoja-nota__titulo"></span>' +
      '<span class="hoja-nota__nav"><button type="button" class="hoja-nota__ant" aria-label="Nota anterior">‹</button>' +
      '<button type="button" class="hoja-nota__sig" aria-label="Nota siguiente">›</button></span>' +
      '<button type="button" class="hoja-nota__cerrar" aria-label="Cerrar">×</button></header>' +
      '<div class="hoja-nota__cuerpo"></div>';
    Object.keys(opciones.estilo || {}).forEach(function (k) { el.style.setProperty(k, opciones.estilo[k]); });
    document.body.appendChild(el);
    var cab = el.querySelector('.hoja-nota__cab'), asa = el.querySelector('.hoja-nota__asa');
    var cuerpo = el.querySelector('.hoja-nota__cuerpo');
    var abierta = false, alCerrar = null;

    function abrir(cfg) {
      el.querySelector('.hoja-nota__marca').innerHTML = cfg.marca || '';
      el.querySelector('.hoja-nota__titulo').textContent = cfg.titulo || '';
      el.setAttribute('aria-label', cfg.titulo || 'Nota');
      el.querySelector('.hoja-nota__cerrar').setAttribute('aria-label', cfg.cerrar || 'Cerrar');
      var nav = el.querySelector('.hoja-nota__nav');
      nav.hidden = !cfg.nav;
      if (cfg.nav) {
        el.querySelector('.hoja-nota__ant').disabled = !cfg.nav.ant;
        el.querySelector('.hoja-nota__sig').disabled = !cfg.nav.sig;
      }
      cuerpo.innerHTML = cfg.html || '';
      cuerpo.scrollTop = 0;
      cuerpo.querySelectorAll('a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
      alCerrar = cfg.alCerrar || null;
      el.style.transform = '';
      if (!abierta) {
        abierta = true;
        el.classList.add('abierta');
        document.addEventListener('keydown', teclas);
        document.addEventListener('pointerdown', fuera, true);
      }
      el.focus({ preventScroll: true });
    }
    function cerrar(devolverFoco) {
      if (!abierta) return;
      abierta = false;
      el.classList.remove('abierta');
      el.style.transform = '';
      document.removeEventListener('keydown', teclas);
      document.removeEventListener('pointerdown', fuera, true);
      RA.hojaCerradaEn = Date.now();
      var f = alCerrar; alCerrar = null;
      if (f) f(devolverFoco !== false);
    }
    function teclas(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(true); }
      else if (opciones.alTecla) opciones.alTecla(ev);
    }
    function fuera(ev) {
      if (el.contains(ev.target)) return;
      if (opciones.dentro && opciones.dentro(ev.target)) return;
      cerrar(false);
    }
    el.querySelector('.hoja-nota__cerrar').onclick = function () { cerrar(true); };
    el.querySelector('.hoja-nota__ant').onclick = function () { if (opciones.alNavegar) opciones.alNavegar(-1); };
    el.querySelector('.hoja-nota__sig').onclick = function () { if (opciones.alNavegar) opciones.alNavegar(1); };

    // Deslizar hacia abajo para cerrar (desde el asa o la cabecera)
    var y0 = null, dy = 0;
    function abajo(ev) { if (ev.target.closest('button')) return; y0 = ev.clientY; dy = 0; el.classList.add('arrastrando'); try { (ev.currentTarget).setPointerCapture(ev.pointerId); } catch (x) { /* nada */ } }
    function mover(ev) { if (y0 == null) return; dy = Math.max(0, ev.clientY - y0); el.style.transform = 'translate(-50%, ' + dy + 'px)'; }
    function arriba() {
      if (y0 == null) return;
      y0 = null; el.classList.remove('arrastrando');
      if (dy > 70) cerrar(true); else el.style.transform = '';
    }
    [asa, cab].forEach(function (z) {
      z.addEventListener('pointerdown', abajo); z.addEventListener('pointermove', mover);
      z.addEventListener('pointerup', arriba); z.addEventListener('pointercancel', arriba);
    });

    return {
      el: el, abrir: abrir, cerrar: cerrar,
      abierta: function () { return abierta; },
      alto: function () { return el.getBoundingClientRect().height; },
      destruir: function () { cerrar(false); el.remove(); }
    };
  }

  /* Colores de la hoja: el «color de nota» de Apariencia (o el papel suave de la paleta) */
  function estiloHoja(ctx) {
    var t = ctx.tema, pal = t.pal, extra = (t.a && t.a.extra) || {};
    var base = /^#[0-9a-f]{6}$/i.test(extra.color_nota || '') ? extra.color_nota : pal.papelSuave;
    var oscuro = t.oscuro;
    return {
      '--hoja-fondo': oscuro ? RA.mezclar(base, '#14141C', 0.8) : base,
      '--hoja-texto': oscuro ? '#F3F0E8' : pal.tinta,
      '--hoja-pc': oscuro ? 'rgba(255,255,255,.07)' : 'rgba(20,20,40,.09)',
      '--tc': ctx.tintas.tc, '--tc2': ctx.tintas.tc2, '--tc-sobre': ctx.tintas.sobre
    };
  }

  /* ══ Notas al pie ════════════════════════════════════════════════ */
  RA.montarNotas = function (ctx) {
    var cuerpo = ctx.raiz.querySelector('.cuerpo');
    if (!cuerpo) return NADA;
    var lista = [].slice.call(cuerpo.querySelectorAll('ol.notas-pie')).pop();
    var marcas = [].slice.call(cuerpo.querySelectorAll('sup.np'));
    if (!lista && !marcas.length) return NADA;
    var estilo = lista && /\bnumeros\b/.test(lista.className) ? 'numeros' : 'simbolos';
    var notas = lista ? [].slice.call(lista.children).filter(function (x) { return x.tagName === 'LI'; }).map(function (li) { return li.innerHTML; }) : [];
    if (lista) lista.remove();
    marcas.forEach(function (m, i) { if (i >= notas.length) m.remove(); });
    marcas = marcas.slice(0, notas.length);
    var total = notas.length;
    if (!total) return NADA;
    function marcaHTML(i, tam) { return RA.marcaNota(i, estilo, tam); }

    var botones = marcas.map(function (m, i) {
      m.innerHTML = '<button type="button" class="np-marca' + (i >= 12 ? ' np-marca--vuelta' : '') + (estilo === 'numeros' ? ' np-marca--num' : '') +
        '" aria-label="Nota ' + (i + 1) + '" aria-expanded="false" aria-haspopup="dialog">' + marcaHTML(i, 13) + '</button>';
      return m.firstChild;
    });

    // Lista plegada al final del texto
    var det = document.createElement('details');
    det.className = 'notas-final';
    det.innerHTML = '<summary><span class="notas-final__t">Notas · ' + total + '</span></summary><ol>' + notas.map(function (h, i) {
      return '<li><span class="notas-final__marca' + (i >= 12 ? ' np-marca--vuelta' : '') + (estilo === 'numeros' ? ' np-marca--num' : '') + '" aria-hidden="true">' + marcaHTML(i, 12) + '</span>' +
        '<div class="notas-final__texto"><span class="solo-lector">Nota ' + (i + 1) + ': </span>' + h + '</div></li>';
    }).join('') + '</ol>';
    cuerpo.parentNode.insertBefore(det, cuerpo.nextSibling);
    det.addEventListener('toggle', function () { if (ctx.pag) ctx.pag.recalcular(ctx.pag.fraccion()); });
    det.querySelectorAll('a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });

    var actual = -1, y0 = null, empujado = false;
    var libro = ctx.raiz.querySelector('.libro');
    var hoja = crearHoja({
      estilo: estiloHoja(ctx),
      dentro: function (t) { return !!t.closest('.np-marca'); },
      alNavegar: function (d) { var n = actual + d; if (n >= 0 && n < total) abrir(n, true); },
      alTecla: function (ev) {
        if (ev.key === 'ArrowLeft' && actual > 0) { ev.preventDefault(); abrir(actual - 1, true); }
        if (ev.key === 'ArrowRight' && actual < total - 1) { ev.preventDefault(); abrir(actual + 1, true); }
      }
    });

    function abrir(i, navegando) {
      if (actual >= 0 && botones[actual]) { botones[actual].classList.remove('abierta'); botones[actual].setAttribute('aria-expanded', 'false'); }
      actual = i;
      botones[i].classList.add('abierta'); botones[i].setAttribute('aria-expanded', 'true');
      if (!hoja.abierta() && !ctx.pag) { y0 = window.scrollY; empujado = false; }
      hoja.abrir({
        marca: '<span class="' + (i >= 12 ? 'np-marca--vuelta' : '') + (estilo === 'numeros' ? ' np-marca--num' : '') + '">' + marcaHTML(i, 18) + '</span>',
        titulo: 'Nota ' + (i + 1) + ' de ' + total, cerrar: 'Cerrar la nota',
        nav: total > 1 ? { ant: i > 0, sig: i < total - 1 } : null,
        html: notas[i], alCerrar: alCerrar
      });
      requestAnimationFrame(function () { asegurarVisible(botones[i], navegando); });
    }
    function alCerrar(devolverFoco) {
      var b = botones[actual];
      if (b) { b.classList.remove('abierta'); b.setAttribute('aria-expanded', 'false'); if (devolverFoco) b.focus({ preventScroll: true }); }
      actual = -1;
      if (ctx.pag) { libro.style.transform = ''; }
      else {
        document.documentElement.style.removeProperty('--hoja-alto');
        document.body.classList.remove('con-hoja');
        if (empujado && y0 != null) window.scrollTo({ top: y0, behavior: movimiento() });
      }
      y0 = null; empujado = false;
    }

    /* La hoja nunca tapa su marca: el texto sube lo necesario */
    function asegurarVisible(marca, navegando) {
      var alto = Math.min(hoja.alto(), window.innerHeight * 0.6), vh = window.innerHeight;
      var limite = vh - alto - 18, barra = ctx.raiz.querySelector('.barra');
      var techo = barra ? Math.max(0, barra.getBoundingClientRect().bottom) + 12 : 12;
      if (ctx.pag) {
        var r = marca.getBoundingClientRect();
        if (r.right < 0 || r.left > window.innerWidth) { libro.style.transform = ''; ctx.pag.irAElemento(marca); r = marca.getBoundingClientRect(); }
        else if (libro.style.transform) { var y = parseFloat((libro.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0; r = { top: r.top - y, bottom: r.bottom - y }; }
        var dy = r.bottom > limite ? r.bottom - limite : 0;
        libro.style.transform = dy ? 'translateY(' + (-dy) + 'px)' : '';
        return;
      }
      document.documentElement.style.setProperty('--hoja-alto', Math.ceil(alto) + 'px');
      document.body.classList.add('con-hoja');
      var q = marca.getBoundingClientRect();
      if (q.bottom > limite) { empujado = true; window.scrollBy({ top: q.bottom - limite, behavior: movimiento() }); }
      else if (q.top < techo) { empujado = true; window.scrollBy({ top: q.top - techo - (navegando ? 40 : 0), behavior: movimiento() }); }
    }

    cuerpo.addEventListener('click', function (ev) {
      var b = ev.target.closest('.np-marca'); if (!b) return;
      ev.preventDefault();
      var i = botones.indexOf(b); if (i < 0) return;
      if (i === actual && hoja.abierta()) hoja.cerrar(true); else abrir(i, hoja.abierta());
    });

    return function () {
      if (hoja.abierta()) hoja.cerrar(false);
      hoja.destruir();
      document.documentElement.style.removeProperty('--hoja-alto');
      document.body.classList.remove('con-hoja');
    };
  };

  /* ══ Citas ═══════════════════════════════════════════════════════ */
  function iniciales(nombre) {
    var p = String(nombre || '').trim().split(/\s+/).filter(function (x) { return /^[\p{L}]/u.test(x); });
    return (p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '');
  }
  RA.prepararCitas = function (ctx) {
    var cuerpo = ctx.raiz.querySelector('.cuerpo');
    if (!cuerpo) return NADA;
    // Testimonio: la voz va arriba, con sus iniciales
    cuerpo.querySelectorAll('blockquote.testimonio').forEach(function (q) {
      var c = q.querySelector('cite');
      var nombre = c ? c.textContent.split(/\s*[·|,—–]\s*/)[0] : '';
      var ini = iniciales(nombre);
      if (c) q.insertBefore(c, q.firstChild);
      if (ini) {
        var s = document.createElement('span');
        s.className = 'testimonio__iniciales'; s.setAttribute('aria-hidden', 'true'); s.textContent = ini.toUpperCase();
        q.insertBefore(s, q.firstChild);
      }
    });
    // Autoría vinculada a un referente: se abre su ficha en la hoja
    var enlaces = cuerpo.querySelectorAll('cite a[href^="#/referentes/r/"]');
    if (!enlaces.length) return NADA;
    var hoja = null;
    function abrirRef(id, a) {
      RA.datos.cargarReferentes().then(function (U) {
        var r = U.referentes.filter(function (x) { return x.id === id; })[0];
        if (!r) { location.hash = '#/referentes/r/' + encodeURIComponent(id); return; }
        var tipo = U.tipos.filter(function (x) { return x.id === r.tipo_id; })[0] || { nombre: '', color: 'var(--tc)' };
        var img = RA.urlImagen(r.imagen), meta = [r.autor, r.fuente, r.anio].filter(Boolean).join(' · ');
        var texto = String(r.cuerpo || ''); if (texto.length > 700) texto = texto.slice(0, 698).replace(/\s+\S*$/, '') + '…';
        var enlace = /^https?:/i.test(r.url || '') ? r.url : '';
        if (!hoja) hoja = crearHoja({ estilo: estiloHoja(ctx), dentro: function (t) { return !!t.closest('cite a[href^="#/referentes/r/"]'); } });
        hoja.abrir({
          marca: '<span class="hoja-ref__tipo" style="background:' + esc(tipo.color) + '"></span>',
          titulo: tipo.nombre ? 'Referente · ' + tipo.nombre : 'Referente', cerrar: 'Cerrar el referente',
          html: '<div class="hoja-ref">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') +
            '<h3>' + (enlace ? '<a href="' + esc(enlace) + '" target="_blank" rel="noopener">' + esc(r.titulo || 'Sin título') + ' ↗</a>' : esc(r.titulo || 'Sin título')) + '</h3>' +
            (meta ? '<p class="hoja-ref__meta">' + esc(meta) + '</p>' : '') + (texto ? '<p>' + esc(texto) + '</p>' : '') +
            '<p><a class="hoja-ref__ver" href="#/referentes/r/' + encodeURIComponent(r.id) + '">Ver en Referentes →</a></p></div>',
          alCerrar: function (foco) { if (foco) a.focus({ preventScroll: true }); }
        });
      }).catch(function () { location.hash = '#/referentes/r/' + encodeURIComponent(id); });
    }
    function clic(ev) {
      var a = ev.target.closest('cite a[href^="#/referentes/r/"]'); if (!a) return;
      ev.preventDefault();
      abrirRef(decodeURIComponent(a.getAttribute('href').slice('#/referentes/r/'.length)), a);
    }
    cuerpo.addEventListener('click', clic);
    return function () { cuerpo.removeEventListener('click', clic); if (hoja) hoja.destruir(); };
  };
})();
