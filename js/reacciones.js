/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · reacciones de los lectores a pasajes
   · Al seleccionar texto aparece una barra con seis reacciones.
   · La selección se amplía a la frase completa (así las reacciones de
     distintos lectores se juntan en el mismo pasaje).
   · Los pasajes con reacciones se subrayan con un contador; al tocarlos
     se ven los totales y se puede poner o quitar la propia.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, G = RA.guardado;

  var LISTA = [
    ['megusta', 'Me gusta'], ['corazon', 'Me encanta'], ['risa', 'Me divierte'],
    ['asombro', 'Me asombra'], ['tristeza', 'Me entristece'], ['enojo', 'Me indigna']
  ];
  var NOMBRE = {};
  LISTA.forEach(function (x) { NOMBRE[x[0]] = x[1]; });
  RA.REACCIONES = LISTA;

  /* ── Iconos en las tintas de la paleta (sombra desplazada, como los botones) ── */
  var CARA = function (relleno, sombra, rasgos) {
    return '<circle cx="17.5" cy="17.5" r="12" style="fill:' + sombra + '"/>' +
      '<circle cx="15" cy="15" r="12" style="fill:' + relleno + '"/>' + rasgos;
  };
  var T = 'var(--tinta)';
  var DIBUJOS = {
    megusta:
      '<path transform="translate(2.5 2.5)" style="fill:var(--tA)" d="M4 13h5v14H4z M10 13l5-8c1.2-1.8 3.8-.9 3.5 1.3L18 12h6.4c1.9 0 3.3 1.8 2.8 3.6l-2 8c-.4 1.4-1.6 2.4-3.1 2.4H10z"/>' +
      '<path style="fill:var(--c1);stroke:' + T + ';stroke-width:1.3;stroke-linejoin:round" d="M4 13h5v14H4z M10 13l5-8c1.2-1.8 3.8-.9 3.5 1.3L18 12h6.4c1.9 0 3.3 1.8 2.8 3.6l-2 8c-.4 1.4-1.6 2.4-3.1 2.4H10z"/>',
    corazon:
      '<path transform="translate(2.5 2.5)" style="fill:var(--tB)" d="M15 27C5 20 2 14.5 5.5 10 8.5 6.5 13 7.5 15 11c2-3.5 6.5-4.5 9.5-1C28 14.5 25 20 15 27z"/>' +
      '<path style="fill:var(--tA)" d="M15 27C5 20 2 14.5 5.5 10 8.5 6.5 13 7.5 15 11c2-3.5 6.5-4.5 9.5-1C28 14.5 25 20 15 27z"/>',
    risa: CARA('var(--apunte)', 'var(--tA)',
      '<path d="M8.5 12.5q2-2.4 4 0M17.5 12.5q2-2.4 4 0" style="fill:none;stroke:' + T + ';stroke-width:1.6;stroke-linecap:round"/>' +
      '<path d="M8.5 16.5h13a6.5 6.5 0 0 1-13 0z" style="fill:' + T + '"/>' +
      '<path d="M5.2 12.5c-1.6 2.2-1.6 3.8 0 4.4 1.6-.6 1.6-2.2 0-4.4zM24.8 12.5c-1.6 2.2-1.6 3.8 0 4.4 1.6-.6 1.6-2.2 0-4.4z" style="fill:var(--c1)"/>'),
    asombro: CARA('var(--apunte)', 'var(--tA)',
      '<circle cx="10.8" cy="12.5" r="1.7" style="fill:' + T + '"/><circle cx="19.2" cy="12.5" r="1.7" style="fill:' + T + '"/>' +
      '<ellipse cx="15" cy="20.5" rx="2.8" ry="3.6" style="fill:' + T + '"/>'),
    tristeza: CARA('var(--apunte)', 'var(--tA)',
      '<circle cx="10.8" cy="12.5" r="1.7" style="fill:' + T + '"/><circle cx="19.2" cy="12.5" r="1.7" style="fill:' + T + '"/>' +
      '<path d="M10.5 22q4.5-4.2 9 0" style="fill:none;stroke:' + T + ';stroke-width:1.7;stroke-linecap:round"/>' +
      '<path d="M8.6 15.2c-1.7 2.4-1.7 4.1 0 4.7 1.7-.6 1.7-2.3 0-4.7z" style="fill:var(--c1)"/>'),
    enojo: CARA('var(--c3)', 'var(--tinta)',
      '<path d="M8 10l5 2M22 10l-5 2" style="fill:none;stroke:' + T + ';stroke-width:1.7;stroke-linecap:round"/>' +
      '<circle cx="11" cy="14.2" r="1.6" style="fill:' + T + '"/><circle cx="19" cy="14.2" r="1.6" style="fill:' + T + '"/>' +
      '<path d="M10.5 21.5q4.5-3.2 9 0" style="fill:none;stroke:' + T + ';stroke-width:1.7;stroke-linecap:round"/>')
  };
  RA.iconoReaccion = function (k, tam) {
    return '<svg class="icono-reaccion" width="' + (tam || 28) + '" height="' + (tam || 28) + '" viewBox="0 0 32 32" aria-hidden="true">' + (DIBUJOS[k] || '') + '</svg>';
  };

  /* Identificador anónimo de este navegador */
  RA.visitante = function () {
    var v = G.leer('visitante', null);
    if (!v || !/^[0-9a-f-]{36}$/.test(v)) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); });
      G.escribir('visitante', v);
    }
    return v;
  };

  /* ── Texto lógico de un bloque (sin las copias decorativas aria-hidden) ── */
  var BLOQUES = 'p, h2, h3, li, figcaption';
  function nodosTexto(bloque) {
    var w = document.createTreeWalker(bloque, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        return p && p.closest('[aria-hidden="true"], .pasaje-cuenta') && bloque.contains(p.closest('[aria-hidden="true"], .pasaje-cuenta'))
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var r = [], n;
    while ((n = w.nextNode())) r.push(n);
    return r;
  }
  function textoDe(bloque) { return nodosTexto(bloque).map(function (n) { return n.nodeValue; }).join(''); }
  function offsetLogico(bloque, nodo, off) {
    var r = document.createRange();
    r.setStart(bloque, 0);
    try { r.setEnd(nodo, off); } catch (e) { return 0; }
    var acc = 0;
    nodosTexto(bloque).forEach(function (t) {
      if (t === r.endContainer) acc += r.endOffset;
      else if (r.intersectsNode(t) && r.comparePoint(t, t.length) <= 0) acc += t.length;
    });
    return acc;
  }
  function normal(s) { return String(s).replace(/[\s ]+/g, ' ').trim(); }

  /* Amplía [a, b) a la frase (o frases) completa; si queda muy larga, a palabras */
  var TERMINAL = /[.!?…]/, CIERRE = /["»”’)\]]/, ESPACIO = /[\s ]/;
  function ampliar(t, a, b) {
    var n = t.length, i = 0, f = n, p, q;
    for (p = a - 1; p >= 0; p--) {
      if (TERMINAL.test(t[p])) {
        q = p + 1;
        while (q < n && CIERRE.test(t[q])) q++;
        if (q < n && ESPACIO.test(t[q]) && q <= a) { i = q; break; }
      }
    }
    while (i < n && ESPACIO.test(t[i])) i++;
    for (p = Math.max(b - 1, i); p < n; p++) {
      if (TERMINAL.test(t[p]) && (p + 1 === n || ESPACIO.test(t[p + 1]) || CIERRE.test(t[p + 1]))) {
        f = p + 1;
        while (f < n && CIERRE.test(t[f])) f++;
        break;
      }
    }
    if (f - i > 600) {   // frase demasiado larga: se queda la selección, ajustada a palabras completas
      i = a; while (i > 0 && !ESPACIO.test(t[i - 1])) i--;
      f = b; while (f < n && !ESPACIO.test(t[f])) f++;
      f = Math.min(f, i + 600);
    }
    while (f > i && ESPACIO.test(t[f - 1])) f--;
    return [i, f];
  }

  function bloqueDe(cuerpo, nodo) {
    var el = nodo.nodeType === 1 ? nodo : nodo.parentElement;
    var b = el && el.closest(BLOQUES);
    return b && cuerpo.contains(b) ? b : null;
  }

  function anclaDeSeleccion(cuerpo) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    if (!cuerpo.contains(r.commonAncestorContainer)) return null;
    var b0 = bloqueDe(cuerpo, r.startContainer);
    if (!b0) return null;
    var b1 = bloqueDe(cuerpo, r.endContainer);
    var t = textoDe(b0);
    var a = offsetLogico(b0, r.startContainer, r.startOffset);
    var b = b1 === b0 ? offsetLogico(b0, r.endContainer, r.endOffset) : t.length;
    if (normal(t.slice(a, b)).length < 3) return null;
    var x = ampliar(t, a, b);
    var cita = normal(t.slice(x[0], x[1]));
    if (cita.length < 3) return null;
    var bloques = [].slice.call(cuerpo.querySelectorAll(BLOQUES));
    return { bloque: bloques.indexOf(b0), inicio: x[0], fin: x[1], cita: cita, rect: r.getBoundingClientRect() };
  }

  /* ── Subrayados ───────────────────────────────────────────────────── */
  function quitarMarcas(cuerpo) {
    cuerpo.querySelectorAll('.pasaje-cuenta').forEach(function (c) { c.remove(); });
    cuerpo.querySelectorAll('mark.pasaje').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
    cuerpo.normalize();
  }
  function localizar(bloques, p) {
    var el = bloques[p.bloque], t, k, cita = normal(p.cita);
    if (el) {
      t = textoDe(el);
      if (normal(t.slice(p.inicio, p.fin)) === cita) return { el: el, a: p.inicio, b: p.fin };
      k = t.indexOf(p.cita);
      if (k >= 0) return { el: el, a: k, b: k + p.cita.length };
    }
    for (var i = 0; i < bloques.length; i++) {
      t = textoDe(bloques[i]); k = t.indexOf(p.cita);
      if (k >= 0) return { el: bloques[i], a: k, b: k + p.cita.length };
    }
    return null;   // el autor cambió el texto: el pasaje ya no aparece
  }
  function envolver(el, a, b, clave) {
    var acc = 0, tramos = [];
    nodosTexto(el).forEach(function (n) {
      var len = n.nodeValue.length, s = Math.max(a, acc) - acc, e = Math.min(b, acc + len) - acc;
      if (e > s) tramos.push([n, s, e, len]);
      acc += len;
    });
    var ultima = null;
    tramos.forEach(function (x) {
      var n = x[0];
      if (x[2] < x[3]) n.splitText(x[2]);
      var medio = x[1] > 0 ? n.splitText(x[1]) : n;
      if (!medio.nodeValue.trim() && medio.nodeValue.length < 2) return;
      var m = document.createElement('mark');
      m.className = 'pasaje'; m.setAttribute('data-k', clave);
      medio.parentNode.insertBefore(m, medio);
      m.appendChild(medio);
      ultima = m;
    });
    return ultima;
  }

  function agrupar(lista) {
    var orden = [], por = {};
    (lista || []).forEach(function (r) {
      var k = r.bloque + ':' + r.inicio + ':' + r.fin;
      if (!por[k]) { por[k] = { clave: k, bloque: r.bloque, inicio: r.inicio, fin: r.fin, cita: r.cita, r: {}, total: 0 }; orden.push(por[k]); }
      por[k].r[r.emoji] = { total: r.total, mia: !!r.mia };
      por[k].total += r.total;
    });
    return { orden: orden, por: por };
  }

  /* ── Montaje en una entrada ───────────────────────────────────────── */
  RA.montarReacciones = function (ctx) {
    var cuerpo = ctx.raiz.querySelector('.cuerpo');
    if (!cuerpo || !RA.datos.reacciones) return function () {};
    var vivo = true, grupos = { orden: [], por: {} }, barra = null, pop = null, popY = 0, tSel = null, enviando = false;
    var vis = RA.visitante();

    function repintar(lista) {
      if (!vivo) return;
      var f = ctx.pag ? ctx.pag.fraccion() : null;
      quitarMarcas(cuerpo);
      grupos = agrupar(lista);
      var bloques = [].slice.call(cuerpo.querySelectorAll(BLOQUES));
      grupos.orden.forEach(function (g) {
        var loc = localizar(bloques, g);
        if (!loc) return;
        var ultima = envolver(loc.el, loc.a, loc.b, g.clave);
        if (!ultima) return;
        var top = Object.keys(g.r).sort(function (x, y) { return g.r[y].total - g.r[x].total; }).slice(0, 2);
        var c = document.createElement('button');
        c.type = 'button'; c.className = 'pasaje-cuenta'; c.setAttribute('data-k', g.clave);
        c.setAttribute('aria-label', g.total + (g.total === 1 ? ' reacción' : ' reacciones') + ' a este pasaje');
        c.innerHTML = top.map(function (k) { return RA.iconoReaccion(k, 15); }).join('') + '<span aria-hidden="true">' + g.total + '</span>';
        ultima.parentNode.insertBefore(c, ultima.nextSibling);
      });
      if (ctx.pag && f != null) ctx.pag.recalcular(f);
    }

    function cargar() {
      RA.datos.reacciones(ctx.e.id, vis).then(repintar).catch(function (e) { console.warn('Reacciones:', e && e.message); });
    }

    function aviso(texto) {
      var a = document.createElement('div');
      a.className = 'aviso-reaccion'; a.setAttribute('role', 'status'); a.textContent = texto;
      document.body.appendChild(a);
      setTimeout(function () { a.remove(); }, 2600);
    }

    function enviar(ancla, emoji, alTerminar) {
      if (enviando) return;
      enviando = true;
      RA.datos.reaccionar(ctx.e.id, ancla, emoji, vis).then(function (lista) {
        repintar(lista);
        if (alTerminar) alTerminar();
      }).catch(function (e) {
        aviso(e && /Demasiadas/.test(e.message) ? 'Demasiadas reacciones seguidas. Espera unos minutos.' : 'No se pudo guardar la reacción.');
      }).then(function () { enviando = false; });
    }

    /* Barra al seleccionar */
    function cerrarBarra() { if (barra) { barra.remove(); barra = null; } }
    function abrirBarra(ancla) {
      cerrarBarra(); cerrarPop();
      barra = document.createElement('div');
      barra.className = 'barra-reacciones'; barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Reaccionar a este pasaje');
      barra.innerHTML = LISTA.map(function (x) {
        return '<button type="button" data-r="' + x[0] + '" aria-label="' + x[1] + '" title="' + x[1] + '">' + RA.iconoReaccion(x[0], 28) + '</button>';
      }).join('');
      document.body.appendChild(barra);
      colocar(barra, ancla.rect);
      barra.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });   // no pierde la selección
      barra.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          var anc = ancla;
          enviar(anc, b.getAttribute('data-r'), function () {
            var s = window.getSelection(); if (s) s.removeAllRanges();
            cerrarBarra();
          });
        };
      });
    }
    function colocar(el, rect) {
      var tactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var w = el.offsetWidth, h = el.offsetHeight;
      var x = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
      var y = tactil ? rect.bottom + 14 : rect.top - h - 12;
      if (y < 60) y = rect.bottom + 14;
      if (y + h > window.innerHeight - 8) y = Math.max(60, rect.top - h - 12);
      y = Math.max(8, Math.min(window.innerHeight - h - 8, y));
      el.style.left = x + 'px'; el.style.top = y + 'px';
    }
    function alCambiarSeleccion() {
      clearTimeout(tSel);
      tSel = setTimeout(function () {
        if (!vivo || document.documentElement.classList.contains('sin-reacciones')) return cerrarBarra();
        var anc = anclaDeSeleccion(cuerpo);
        if (anc) abrirBarra(anc); else cerrarBarra();
      }, 250);
    }
    document.addEventListener('selectionchange', alCambiarSeleccion);

    /* Ventana de un pasaje ya subrayado */
    function cerrarPop() { if (pop) { pop.remove(); pop = null; } }
    function abrirPop(clave, ancla, conTeclado) {
      cerrarPop(); cerrarBarra();
      var g = grupos.por[clave];
      if (!g) return;
      pop = document.createElement('div');
      pop.className = 'pop-reacciones'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Reacciones a este pasaje');
      pop.innerHTML = '<p class="pop-reacciones__titulo">' + g.total + (g.total === 1 ? ' reacción' : ' reacciones') + '</p>' +
        '<div class="pop-reacciones__lista">' + LISTA.map(function (x) {
          var d = g.r[x[0]] || { total: 0, mia: false };
          return '<button type="button" data-r="' + x[0] + '" aria-pressed="' + d.mia + '" aria-label="' + x[1] + ': ' + d.total + (d.mia ? ' (incluye la tuya)' : '') + '" title="' + x[1] + '">' +
            RA.iconoReaccion(x[0], 26) + '<span>' + (d.total || '') + '</span></button>';
        }).join('') + '</div><p class="pop-reacciones__nota">Toca una para sumar o quitar la tuya</p>';
      document.body.appendChild(pop);
      popY = window.scrollY;
      colocar(pop, ancla.getBoundingClientRect());
      pop.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          enviar({ bloque: g.bloque, inicio: g.inicio, fin: g.fin, cita: g.cita }, b.getAttribute('data-r'), function () {
            var nueva = cuerpo.querySelector('.pasaje-cuenta[data-k="' + clave + '"]') || cuerpo.querySelector('mark.pasaje[data-k="' + clave + '"]');
            if (nueva && grupos.por[clave]) abrirPop(clave, nueva, false); else cerrarPop();
          });
        };
      });
      if (conTeclado) { var primero = pop.querySelector('button'); if (primero) primero.focus({ preventScroll: true }); }
    }
    function alClic(ev) {
      var t = ev.target.closest && ev.target.closest('.pasaje-cuenta, mark.pasaje');
      if (t && cuerpo.contains(t)) {
        var s = window.getSelection();
        if (s && !s.isCollapsed) return;
        ev.preventDefault();
        if (document.documentElement.classList.contains('sin-reacciones')) return;
        abrirPop(t.getAttribute('data-k'), t, ev.detail === 0);
        return;
      }
      if (pop && !pop.contains(ev.target)) cerrarPop();
    }
    function alTecla(ev) { if (ev.key === 'Escape') { cerrarPop(); cerrarBarra(); } }
    function alDesplazar() { if (pop && Math.abs(window.scrollY - popY) > 60) cerrarPop(); if (barra) { var a = anclaDeSeleccion(cuerpo); if (a) colocar(barra, a.rect); else cerrarBarra(); } }
    document.addEventListener('click', alClic, true);
    document.addEventListener('keydown', alTecla);
    window.addEventListener('scroll', alDesplazar, { passive: true });

    cargar();
    return function () {
      vivo = false; cerrarBarra(); cerrarPop();
      document.removeEventListener('selectionchange', alCambiarSeleccion);
      document.removeEventListener('click', alClic, true);
      document.removeEventListener('keydown', alTecla);
      window.removeEventListener('scroll', alDesplazar);
    };
  };

  // Para pruebas
  RA._reacciones = { ampliar: ampliar, textoDe: textoDe };
})();
