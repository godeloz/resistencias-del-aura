/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · entradas con audio (A-13)
   · Un solo archivo por entrada: la narración y, en su lugar, las otras
     voces (por ejemplo, las citas de Alexa Gómez en su propia voz).
   · Tres estados de sincronización, que elige el autor en cada entrada:
       no        texto y audio van por separado
       citas     el archivo es solo la fuente de las citas: cada cita tiene
                 su inicio y su fin, y un botón discreto que hace sonar solo
                 ese fragmento (sin reproductor ni «Escuchar»; 6 nov 2026)
       completa  cada párrafo sabe cuándo empieza: se ilumina, se sigue
                 la voz y se puede saltar a un párrafo
   · Las marcas se guardan una por bloque del texto, con una huella del
     bloque (h, p). Al leer se alinean con el texto vigente: si el autor
     corrigió un párrafo, la marca lo sigue; un párrafo nuevo queda sin
     marca y comparte el tiempo del anterior.
   La primera parte (RA.audio) la usan también el editor y el marcador.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, G = RA.guardado;

  /* ══ Núcleo compartido ═══════════════════════════════════════════ */
  var BLOQUE = /^(P|H2|H3|BLOCKQUOTE|UL|OL|ASIDE|FIGURE)$/;
  var A = RA.audio = {
    SINC: ['no', 'citas', 'completa'],
    NOMBRE_SINC: { no: 'Sin sincronizar', citas: 'Solo las citas', completa: 'Completa' },
    tiene: function (a) { return !!(a && typeof a === 'object' && String(a.archivo || '').trim()); },
    sinc: function (a) { return a && A.SINC.indexOf(a.sinc) >= 0 ? a.sinc : 'no'; },
    /* Dirección del archivo: completa (https://…), o el nombre dentro del repositorio de audio
       de Apariencia; sin repositorio, la carpeta audio/ del propio sitio. */
    url: function (a, base, prefijo) {
      var f = String((a && a.archivo) || '').trim();
      if (!f) return '';
      if (/^https?:\/\//i.test(f)) return f;
      var ruta = f.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
      base = String(base || '').trim();
      if (/^https?:\/\//i.test(base)) return base.replace(/\/*$/, '/') + ruta;
      return (prefijo || '') + 'audio/' + ruta.replace(/^audio\//, '');
    },
    base: function (ap) { return (ap && ap.extra && ap.extra.audio_base) || ''; },
    tiempo: function (s) {
      s = Math.max(0, Math.floor(s || 0));
      var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
      return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
    },
    minutos: function (s) { return Math.max(1, Math.round((s || 0) / 60)); },
    /* Con décimas, para el marcador: 1:23,4 */
    tiempoFino: function (s) {
      if (s == null || !isFinite(s)) return '';
      s = Math.max(0, Math.round(s * 10) / 10);
      return A.tiempo(s) + ',' + Math.round((s % 1) * 10) % 10;
    },
    /* Lo que el autor escribe a mano: «83», «83,4», «1:23», «1:23.4», «1:02:03,5». Vacío = null; ilegible = NaN */
    leerTiempo: function (txt) {
      var s = String(txt == null ? '' : txt).trim().replace(/\s+/g, '').replace(',', '.');
      if (!s) return null;
      if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(s)) return NaN;
      var partes = s.split(':'), seg = parseFloat(partes.pop()), min = partes.length ? +partes.pop() : 0, h = partes.length ? +partes.pop() : 0;
      if (s.indexOf(':') >= 0 && seg >= 60) return NaN;
      if (h && min >= 60) return NaN;
      return Math.round((h * 3600 + min * 60 + seg) * 10) / 10;
    },
    /* Una cita con su tramo completo: inicio y fin, y el fin después del inicio */
    tramoValido: function (mk) { return !!(mk && mk.t != null && mk.f != null && isFinite(+mk.t) && isFinite(+mk.f) && +mk.f > +mk.t + 0.05); },
    /* Quién habla: 0 = narra, 1… = las voces */
    voces: function (a, autor) {
      var l = [String((a && a.narra) || 'Diego Agudelo').trim() || 'Diego Agudelo'];
      ((a && a.voces) || []).forEach(function (v) { if (v && String(v.nombre || '').trim()) l.push(String(v.nombre).trim()); });
      return l;
    },
    creditos: function (a, autor) {
      var v = A.voces(a, autor), t = 'Narra ' + v[0];
      if (v.length > 1) t += ' · con la voz de ' + v.slice(1).join(' y de ');
      return t;
    },
    normal: function (t) {
      return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    },
    huella: function (t) {
      var h = 5381;
      for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    },
    /* Texto lógico de un elemento: sin las copias decorativas (aria-hidden) */
    texto: function (el) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          return p && p.closest('[aria-hidden="true"], .pasaje-cuenta, .au-cita, button') && el.contains(p.closest('[aria-hidden="true"], .pasaje-cuenta, .au-cita, button'))
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      }), s = '', n;
      while ((n = w.nextNode())) s += n.nodeValue + ' ';
      return s.replace(/\s+/g, ' ').trim();
    },
    /* Bloques que se narran: los hijos directos del texto con algo que leer */
    bloques: function (raiz) {
      return [].slice.call(raiz ? raiz.children : []).filter(function (el) {
        if (!BLOQUE.test(el.tagName)) return false;
        if (el.tagName === 'OL' && /\bnotas-pie\b/.test(el.className)) return false;
        return !!A.normal(A.texto(el));
      });
    },
    /* Bloques de un HTML guardado (fuera del documento) */
    /* Lo que se dice en una cita, sin su autoría */
    textoCita: function (el) {
      if (el.tagName !== 'BLOCKQUOTE') return A.texto(el);
      var ps = [].slice.call(el.children).filter(function (x) { return x.tagName !== 'CITE' && !x.matches('[aria-hidden="true"], .au-cita'); });
      return ps.map(A.texto).join(' ').trim() || A.texto(el);
    },
    bloquesDeHTML: function (html, limpiar) {
      var d = document.createElement('div');
      d.innerHTML = limpiar ? limpiar(html || '') : RA.limpiarHTML(html || '');
      return A.bloques(d);
    },
    firma: function (el) {
      var n = A.normal(A.texto(el));
      return { h: A.huella(n), p: n.slice(0, 24), tag: el.tagName, cita: el.tagName === 'BLOCKQUOTE' };
    },
    /* Alinea las marcas guardadas con los bloques vigentes.
       Devuelve, por cada bloque vigente, su marca (copia) o null. editada = el bloque cambió. */
    alinear: function (firmas, marcas) {
      var n = firmas.length, m = (marcas || []).length, res = new Array(n).fill(null);
      if (!m) return res;
      var L = [], i, j;
      for (i = 0; i <= m; i++) { L.push(new Int16Array(n + 1)); }
      for (i = m - 1; i >= 0; i--) for (j = n - 1; j >= 0; j--) {
        L[i][j] = marcas[i].h === firmas[j].h ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      }
      var pares = []; i = 0; j = 0;
      while (i < m && j < n) {
        if (marcas[i].h === firmas[j].h) { pares.push([i, j]); i++; j++; }
        else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
      }
      function copia(x, editada) { var c = Object.assign({}, x); if (editada) c.editada = true; return c; }
      pares.forEach(function (pq) { res[pq[1]] = copia(marcas[pq[0]]); });
      // Huecos entre bloques que coinciden: mismo número de cada lado → se emparejan en orden (párrafos corregidos);
      // si no, solo los que empiezan igual.
      var anclas = [[-1, -1]].concat(pares).concat([[m, n]]);
      for (var k = 0; k < anclas.length - 1; k++) {
        var o0 = anclas[k][0] + 1, o1 = anclas[k + 1][0], n0 = anclas[k][1] + 1, n1 = anclas[k + 1][1];
        if (o1 <= o0 || n1 <= n0) continue;
        if (o1 - o0 === n1 - n0) { for (var q = 0; q < o1 - o0; q++) res[n0 + q] = copia(marcas[o0 + q], true); continue; }
        var oi = o0;
        for (var nj = n0; nj < n1 && oi < o1; nj++) {
          for (var b = oi; b < o1; b++) {
            if (marcas[b].p && firmas[nj].p && marcas[b].p.slice(0, 12) === firmas[nj].p.slice(0, 12)) { res[nj] = copia(marcas[b], true); oi = b + 1; break; }
          }
        }
      }
      return res;
    },
    /* Cuántos bloques tienen y no tienen marca según el estado */
    resumen: function (a, firmas) {
      var s = A.sinc(a), al = A.alinear(firmas, (a && a.marcas) || []), r = { total: firmas.length, marcados: 0, faltan: 0, citas: 0, citasMarcadas: 0, editados: 0 };
      firmas.forEach(function (f, i) {
        var mk = al[i];
        if (mk && mk.editada) r.editados++;
        var otraVoz = mk && mk.v > 0;
        if (f.cita && (otraVoz || s !== 'completa')) { r.citas++; if (mk && mk.t != null && (s === 'completa' || A.tramoValido(mk))) r.citasMarcadas++; }
        if (mk && mk.t != null) r.marcados++; else r.faltan++;
      });
      return r;
    },
    /* Color de cada voz: 0 = la tinta del cuaderno; las otras, tintas de la paleta que no se confunden con él */
    colorVoz: function (v, tema, fondoCuaderno, tinta0) {
      if (!v) return tinta0;
      var p = tema.pal, vistos = {}, l = [];
      [tema.tituloA, tema.tituloB].concat(p.cuadernos).forEach(function (c) {
        var k = String(c).toUpperCase();
        if (vistos[k] || k === String(fondoCuaderno).toUpperCase() || k === String(tinta0).toUpperCase()) return;
        vistos[k] = 1; l.push(c);
      });
      var c = l[(v - 1) % l.length] || tema.tituloA;
      c = RA.tintaLegible(c, p.tinta);
      if (tema.oscuro && RA.lum(c) < 0.14) c = RA.mezclar(c, '#FFFFFF', 0.4);
      return c;
    }
  };

  /* ══ Reproductor de la lectura ═══════════════════════════════════ */
  var IC = {
    play: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    menos: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.6 4.4l.9 5.2 5-1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="15.6" text-anchor="middle" font-size="7.2" font-family="Jost, sans-serif" font-weight="600" fill="currentColor">15</text></svg>',
    mas: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5a7 7 0 1 0 6.6 4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19.4 4.4l-.9 5.2-5-1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="15.6" text-anchor="middle" font-size="7.2" font-family="Jost, sans-serif" font-weight="600" fill="currentColor">15</text></svg>',
    abrir: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bajar: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plegar: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    lista: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.4" fill="currentColor"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor"/></svg>',
    audifonos: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3" y="14" width="5" height="7" rx="2" fill="currentColor"/><rect x="16" y="14" width="5" height="7" rx="2" fill="currentColor"/></svg>',
    seguir: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  RA.iconoAudio = function (tam) { return IC.audifonos.replace(/width="16" height="16"/, 'width="' + (tam || 16) + '" height="' + (tam || 16) + '"'); };
  var VELOCIDADES = [0.75, 1, 1.25, 1.5, 2];
  function textoVel(v) { return String(v).replace('.', ',') + '×'; }
  function onda() { return '<span class="au-onda" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'; }

  /* Un solo <audio> para todo el sitio: sigue sonando si la entrada se vuelve a pintar (tema, modo) */
  var AU = { el: null, id: null };
  RA.audioActual = function () { return AU.el; };   // para las pruebas y la consola
  function posiciones() { return G.leer('audio-pos', {}); }
  function guardarPos(id, t, dur) {
    var p = posiciones();
    if (!t || t < 5 || (dur && t > dur - 8)) delete p[id]; else p[id] = Math.round(t);
    var ks = Object.keys(p); if (ks.length > 60) delete p[ks[0]];
    G.escribir('audio-pos', p);
  }

  /* Imagen de la pantalla bloqueada: el color del cuaderno, sus formas (A-04) y su número */
  function portadaAudio(e, tema, bgCuaderno, st) {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 512;
      var g = c.getContext('2d');
      g.fillStyle = bgCuaderno; g.fillRect(0, 0, 512, 512);
      if (st.receta && !st.imagen) dibujarFormas(g, st.receta, 512, tema);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = e.tipo === 'apunte' ? RA.fichaApunte(e, tema).texto : st.num;
      g.font = '600 220px Jost, sans-serif'; g.textBaseline = 'top';
      g.fillText(RA.numeroCorto(e), 40, 40);
      return c.toDataURL('image/png');
    } catch (x) { return ''; }
  }
  function dibujarFormas(g, r, L, tema) {
    r.formas.forEach(function (f) {
      var b = RA.cajaForma(f, L, L), col = RA.colorRef(f.c, tema) || tema.tituloA;
      g.save();
      g.globalCompositeOperation = r.mezcla === 'normal' ? 'source-over' : 'multiply';
      g.translate(b.left + b.w / 2, b.top + b.h / 2); g.rotate((f.r || 0) * Math.PI / 180);
      var x = -b.w / 2, y = -b.h / 2;
      g.fillStyle = col; g.strokeStyle = col; g.beginPath();
      if (f.t === 'circulo') g.arc(0, 0, b.w / 2, 0, Math.PI * 2);
      else if (f.t === 'anillo') { g.lineWidth = Math.max(2, b.w * f.g / 2); g.arc(0, 0, b.w / 2 - g.lineWidth / 2, 0, Math.PI * 2); g.stroke(); g.restore(); return; }
      else if (f.t === 'medio') { g.arc(0, b.h / 2, b.w / 2, Math.PI, 0); g.closePath(); }
      else if (f.t === 'cuarto') { g.moveTo(x + b.w, y + b.h); g.lineTo(x, y + b.h); g.arc(x + b.w, y + b.h, b.w, Math.PI, Math.PI * 1.5); g.closePath(); }
      else if (f.t === 'triangulo') { g.moveTo(0, y); g.lineTo(x + b.w, y + b.h); g.lineTo(x, y + b.h); g.closePath(); }
      else g.rect(x, y, b.w, b.h);
      g.fill(); g.restore();
    });
  }
  function soltarAudio() {
    if (!AU.el) return;
    try { AU.el.pause(); } catch (x) { /* nada */ }
    AU.el.removeAttribute('src'); try { AU.el.load(); } catch (x) { /* nada */ }
  }

  RA.montarAudio = function (ctx) {
    var e = ctx.e, a = e.audio;
    if (!A.tiene(a)) return function () { };
    if (A.sinc(a) === 'citas') return montarCitas(ctx);
    var sitio = ctx.sitio || {}, tema = ctx.tema, raiz = ctx.raiz, cuerpo = raiz.querySelector('.cuerpo');
    var sinc = A.sinc(a), autor = (sitio.proyecto && sitio.proyecto.autor) || '';
    var nombres = A.voces(a, autor);
    var st = RA.estiloPortada(e, tema);
    var bgCuaderno = e.tipo === 'apunte' ? RA.fichaApunte(e, tema).color : st.bg;
    var tinta0 = ctx.tintas ? ctx.tintas.tc : tema.pal.tinta;
    var colores = nombres.map(function (x, v) { return A.colorVoz(v, tema, bgCuaderno, tinta0); });
    var src = A.url(a, A.base(sitio.apariencia), ctx.prefijoAudio || '');

    /* El <audio>: se reutiliza si es la misma entrada que se vuelve a pintar */
    var sigue = AU.el && AU.id === e.id && AU.modo !== 'citas' && RA.audioContinuar === e.id;
    RA.audioContinuar = null;
    if (!sigue) {
      soltarAudio();
      AU = { el: new Audio(), id: e.id, seguir: true, abierta: false };
      AU.el.preload = 'metadata';
      AU.el.src = src;
      AU.el.playbackRate = G.leer('audio-vel', 1);
      var pos = posiciones()[e.id];
      if (pos) AU.reanudar = pos;
    }
    var el = AU.el;
    var vivo = true;
    function dur() { return isFinite(el.duration) && el.duration > 0 ? el.duration : (a.duracion || 0); }

    /* ── Bloques y tiempos ── */
    var fuente = A.bloquesDeHTML(e.cuerpo_html), vistos = A.bloques(cuerpo);
    var firmas = fuente.map(A.firma);
    var marcas = sinc === 'no' ? firmas.map(function () { return null; }) : A.alinear(firmas, a.marcas || []);
    var items = firmas.map(function (f, i) {
      var mk = marcas[i];
      return { i: i, el: vistos[i] || null, cita: f.cita, tag: f.tag, t: mk && mk.t != null ? +mk.t : null, f: mk && mk.f != null ? +mk.f : null, v: mk ? (+mk.v || 0) : 0 };
    });
    var tiempos = items.filter(function (it) { return it.t != null && it.el; });
    // Tramos de otra voz: inicio y fin (el fin, si no se marcó, es el comienzo del bloque siguiente)
    var tramos = [];
    items.forEach(function (it) {
      if (!it.el || it.t == null || it.v < 1 || it.v >= nombres.length) return;
      if (sinc === 'citas' && it.f == null) return;
      var fin = it.f;
      if (fin == null) { var sg = tiempos.filter(function (x) { return x.t > it.t; })[0]; fin = sg ? sg.t : null; }
      tramos.push({ it: it, ini: it.t, fin: fin, v: it.v });
    });
    if (sinc !== 'completa') tiempos = [];
    var secciones = tiempos.filter(function (it) { return it.tag === 'H2'; });

    /* ── Barra (y pastilla, que es la barra plegada) ── */
    raiz.classList.add('con-audio');
    var barra = document.createElement('div');
    barra.className = 'au-barra plegada';
    barra.setAttribute('role', 'region');
    barra.setAttribute('aria-label', 'Audio del ' + (e.tipo === 'apunte' ? 'apunte' : 'cuaderno'));
    barra.style.setProperty('--au-voz', colores[0]);
    barra.innerHTML =
      '<button type="button" class="au-play" aria-label="Escuchar">' + IC.play + '</button>' +
      '<button type="button" class="au-pastilla"><span class="au-pastilla__texto"></span></button>' +
      '<div class="au-centro"><div class="au-quien"></div>' +
        '<div class="au-pista"><div class="au-pista__marcas"></div><div class="au-pista__lleno"></div>' +
        '<input type="range" class="au-rango" min="0" max="1000" step="1" value="0" aria-label="Posición del audio"></div>' +
        '<div class="au-tiempos"><span class="au-t">0:00</span><span class="au-d"></span></div></div>' +
      '<button type="button" class="au-boton au-menos" aria-label="Atrás 15 segundos">' + IC.menos + '</button>' +
      '<button type="button" class="au-boton au-mas" aria-label="Adelante 15 segundos">' + IC.mas + '</button>' +
      '<button type="button" class="au-boton au-vel" aria-label="Velocidad"></button>' +
      '<button type="button" class="au-boton au-abrir" aria-label="Modo escucha" title="Modo escucha">' + IC.abrir + '</button>' +
      '<button type="button" class="au-boton au-plegar" aria-label="Plegar el reproductor" title="Plegar">' + IC.plegar + '</button>';
    raiz.appendChild(barra);
    var bPlay = barra.querySelector('.au-play'), pastilla = barra.querySelector('.au-pastilla__texto'), quien = barra.querySelector('.au-quien');
    var rango = barra.querySelector('.au-rango'), lleno = barra.querySelector('.au-pista__lleno'), tT = barra.querySelector('.au-t'), tD = barra.querySelector('.au-d');
    var bVel = barra.querySelector('.au-vel');
    var chipSeguir = null;
    if (sinc === 'completa') {
      chipSeguir = document.createElement('button');
      chipSeguir.type = 'button'; chipSeguir.className = 'au-volver'; chipSeguir.hidden = true;
      chipSeguir.innerHTML = IC.seguir + ' Volver a la voz';
      raiz.appendChild(chipSeguir);
      chipSeguir.onclick = function () { AU.seguir = true; chipSeguir.hidden = true; ultimo = null; actualizar(true); };
    }
    function marcasPista(cont) {
      var d = dur(); if (!d) { cont.innerHTML = ''; return; }
      cont.innerHTML = tramos.map(function (tr) {
        var f = tr.fin == null ? d : tr.fin;
        return '<i style="left:' + (tr.ini / d * 100).toFixed(2) + '%;width:' + Math.max(0.6, (f - tr.ini) / d * 100).toFixed(2) + '%;background:' + colores[tr.v] + '"></i>';
      }).join('');
    }

    /* ── Citas de otra voz: su botón, que reproduce solo su tramo ── */
    var botonesCita = [];
    tramos.forEach(function (tr) {
      if (!tr.it.el || tr.it.tag !== 'BLOCKQUOTE') return;
      var q = tr.it.el;
      q.classList.add('au-con-voz');
      q.style.setProperty('--au-voz', colores[tr.v]);
      q.style.setProperty('--au-voz-sobre', RA.esClaro(colores[tr.v]) ? tema.pal.tinta : '#FFFFFF');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'au-cita';
      var largo = tr.fin != null ? tr.fin - tr.ini : 0;
      b.setAttribute('aria-label', 'Oír en la voz de ' + nombres[tr.v]);
      b.innerHTML = '<span class="au-cita__icono">' + IC.play + '</span>' + onda() + '<span class="au-cita__texto">Oír en su voz' + (largo ? ' · ' + A.tiempo(largo) : '') + '</span>';
      q.appendChild(b);
      b.onclick = function () { tocarTramo(tr); };
      botonesCita.push({ b: b, tr: tr });
    });
    function tocarTramo(tr) {
      if (AU.clip && AU.clip.tr === tr) { terminarTramo(true); return; }
      var antes = AU.clip ? AU.clip.volverA : el.currentTime;
      var sonaba = AU.clip ? AU.clip.sonaba : !el.paused;
      if (sinc === 'completa' && !el.paused) { el.currentTime = tr.ini; return; }   // la narración sigue desde ahí
      AU.clip = { tr: tr, volverA: antes, sonaba: sonaba };
      el.currentTime = tr.ini;
      reproducir();
    }
    function terminarTramo(detener) {
      var c = AU.clip; if (!c) return;
      AU.clip = null;
      el.pause();
      el.currentTime = c.volverA || 0;
      if (detener) actualizar(true);
    }

    /* ── Saltar a un párrafo (solo con sincronización completa): un ▶ en el margen ── */
    var saltar = null, saltarIt = null, tSaltar = null;
    if (sinc === 'completa' && tiempos.length) {
      saltar = document.createElement('button');
      saltar.type = 'button'; saltar.className = 'au-saltar'; saltar.hidden = true;
      saltar.setAttribute('aria-label', 'Escuchar desde este párrafo');
      saltar.innerHTML = IC.play;
      document.body.appendChild(saltar);
      saltar.onclick = function () {
        if (!saltarIt) return;
        AU.clip = null; AU.seguir = true; if (chipSeguir) chipSeguir.hidden = true;
        AU.desde = saltarIt; el.currentTime = saltarIt.t + 0.05; reproducir(); ocultarSaltar();
      };
      tiempos.forEach(function (it) { it.el.classList.add('au-bloque'); });
    }
    function itemDe(nodo) {
      var b = nodo && nodo.closest && nodo.closest('.au-bloque');
      if (!b) return null;
      for (var k = 0; k < tiempos.length; k++) if (tiempos[k].el === b) return tiempos[k];
      return null;
    }
    function mostrarSaltar(it) {
      if (!saltar || !it) return;
      var r = it.el.getBoundingClientRect();
      if (r.bottom < 60 || r.top > window.innerHeight - 60) return;
      saltarIt = it; clearTimeout(tSaltar);
      saltar.title = 'Escuchar desde aquí · ' + A.tiempo(it.t);
      saltar.setAttribute('aria-label', saltar.title);
      var x = r.left - 46; if (x < 4) x = Math.max(4, r.left - 6 - 34);
      saltar.style.left = Math.max(4, x) + 'px';
      saltar.style.top = Math.max(64, r.top) + 'px';
      saltar.classList.toggle('au-saltar--dentro', r.left < 50);
      saltar.hidden = false;
      tSaltar = setTimeout(ocultarSaltar, 3500);
    }
    function ocultarSaltar() { if (saltar) { saltar.hidden = true; saltarIt = null; } }
    var esperaMov = false;
    function sobreBloque(ev) {   // con el ratón: al moverse sobre un párrafo (también después de hacer scroll sin salir de él)
      if (ev.pointerType !== 'mouse' || esperaMov) return;
      esperaMov = true; var objetivo = ev.target;
      requestAnimationFrame(function () { esperaMov = false; var it = itemDe(objetivo); if (it && (it !== saltarIt || saltar.hidden)) mostrarSaltar(it); });
    }
    function tocarBloque(ev) {
      if (ev.pointerType === 'mouse') return;
      var sel = window.getSelection(); if (sel && !sel.isCollapsed) return;
      if (ev.target.closest('a,button,mark,sup,.np,cite')) return;
      if (ctx.pag) { var x = ev.clientX / window.innerWidth; if (x < 0.33 || x > 0.66) return; }
      var it = itemDe(ev.target); if (it) mostrarSaltar(it);
    }
    if (saltar) {
      cuerpo.addEventListener('pointermove', sobreBloque);
      cuerpo.addEventListener('pointerup', tocarBloque);
    }

    /* ── Seguir la voz ── */
    var ultimo = null, ultimaVoz = -1, ultimoTramo = null;
    function actual(t) {
      var r = null;
      for (var k = 0; k < tiempos.length; k++) { if (tiempos[k].t <= t + 0.25) r = tiempos[k]; else break; }   // margen: el mp3 no salta al décimo exacto
      // Recién se saltó a un bloque: el mp3 puede caer un poco antes; mientras tanto se muestra el bloque elegido
      if (AU.desde) { if (r !== AU.desde && t >= AU.desde.t - 1.5 && t < AU.desde.t + 0.3) return AU.desde; AU.desde = null; }
      return r;
    }
    function tramoEn(t) {
      if (AU.clip) return AU.clip.tr;
      for (var k = 0; k < tramos.length; k++) { var tr = tramos[k]; if (t >= tr.ini - 0.05 && (tr.fin == null || t < tr.fin)) return tr; }
      return null;
    }
    var porVoz = false;
    function llevarA(it) {
      if (!it || !it.el) return;
      if (ctx.pag) {
        var p = ctx.pag.paginaDe(it.el);
        if (p !== ctx.pag.pagina()) { porVoz = true; ctx.pag.ir(p); porVoz = false; }
        return;
      }
      var r = it.el.getBoundingClientRect(), alto = window.innerHeight;
      if (r.top >= 90 && r.bottom <= alto - 130) return;
      if (r.top >= 90 && r.top < alto * 0.55) return;   // ya empieza a la vista: no hace falta mover
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - alto * 0.28), behavior: RA.reduceMovimiento() ? 'auto' : 'smooth' });
    }
    function soltarSeguir() {
      if (sinc !== 'completa' || el.paused || !AU.seguir) return;
      AU.seguir = false; if (chipSeguir) chipSeguir.hidden = false;
    }
    function alMoverLector(ev) {
      if (ev.type === 'keydown' && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(ev.key) < 0) return;
      if (ev.type === 'keydown' && ev.target.closest && ev.target.closest('button,input,a')) return;
      if (ev.target && ev.target.closest && ev.target.closest('.au-barra,.au-escucha,.ajustes,.hoja-nota')) return;
      soltarSeguir(); ocultarSaltar();
    }
    if (sinc === 'completa') {
      window.addEventListener('wheel', alMoverLector, { passive: true });
      window.addEventListener('touchmove', alMoverLector, { passive: true });
      window.addEventListener('keydown', alMoverLector);
      if (ctx.pag) ctx.pag.alCambiar = function () { if (!porVoz) soltarSeguir(); ocultarSaltar(); };
    }
    window.addEventListener('scroll', ocultarSaltar, { passive: true });

    /* ── Pintar el estado ── */
    function pintarControles() {
      var sonando = !el.paused;
      bPlay.innerHTML = sonando ? IC.pausa : IC.play;
      bPlay.setAttribute('aria-label', sonando ? 'Pausar' : (el.currentTime > 1 || AU.reanudar ? 'Seguir escuchando' : 'Escuchar'));
      barra.classList.toggle('sonando', sonando);
      bVel.textContent = textoVel(el.playbackRate || 1);
      if (escucha) escucha.pintarControles(sonando);
      var tp = el.currentTime > 1 ? el.currentTime : AU.reanudar;
      (textosEscuchar || []).forEach(function (x) {
        x.el.textContent = sonando ? 'Sonando · ' + A.tiempo(el.currentTime) : tp ? 'Seguir escuchando · ' + A.tiempo(tp) : x.original;
      });
      botonesCita.forEach(function (x) {
        var activo = AU.clip ? AU.clip.tr === x.tr : (sonando && tramoActivo === x.tr);
        x.b.classList.toggle('activo', !!activo);
        x.b.querySelector('.au-cita__icono').innerHTML = activo && sonando ? IC.pausa : IC.play;
        x.b.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
    }
    var tramoActivo = null;
    function actualizar(forzar) {
      if (!vivo) return;
      var t = el.currentTime || 0, d = dur();
      if (AU.clip && AU.clip.tr.fin != null && t >= AU.clip.tr.fin - 0.05) { terminarTramo(false); t = el.currentTime; }
      var tv = AU.reanudar && t < 1 && el.paused ? AU.reanudar : t;
      tT.textContent = A.tiempo(tv); tD.textContent = d ? A.tiempo(d) : '';
      var fr = d ? Math.min(1, tv / d) : 0;
      lleno.style.width = (fr * 100).toFixed(2) + '%';
      if (!arrastrando) rango.value = Math.round(fr * 1000);
      rango.setAttribute('aria-valuetext', A.tiempo(tv) + ' de ' + A.tiempo(d));
      // Pastilla
      pastilla.textContent = el.error ? 'No se pudo cargar el audio' : !el.paused ? 'Sonando · ' + A.tiempo(t) :
        (t > 1 ? 'En pausa · ' + A.tiempo(t) : AU.reanudar ? 'Seguir en ' + A.tiempo(AU.reanudar) : 'Escuchar' + (d ? ' · ' + A.minutos(d) + ' min' : ''));
      // Quién habla
      var tr = tramoEn(t); tramoActivo = tr;
      var v = tr ? tr.v : 0;
      if (v !== ultimaVoz || forzar) {
        ultimaVoz = v;
        barra.style.setProperty('--au-voz', colores[v]);
        barra.classList.toggle('otra-voz', v > 0);
        quien.textContent = v > 0 ? 'Voz de ' + nombres[v] : RA.antetitulo(e) + ' · ' + e.titulo;
        ponerMetadatos(v);
      }
      if (tr !== ultimoTramo || forzar) {
        cuerpo.querySelectorAll('.au-voz-activa').forEach(function (x) { x.classList.remove('au-voz-activa'); });
        if (tr && tr.it.el && (!el.paused || AU.clip)) tr.it.el.classList.add('au-voz-activa');
        ultimoTramo = tr && (!el.paused || AU.clip) ? tr : null;
      }
      // Párrafo que suena
      if (sinc === 'completa') {
        var it = (!el.paused || t > 0.5) && !AU.clip ? actual(t) : null;
        if (it !== ultimo || forzar) {
          cuerpo.querySelectorAll('.au-actual').forEach(function (x) { if (!it || x !== it.el) x.classList.remove('au-actual'); });
          if (it && it.el) it.el.classList.add('au-actual');
          ultimo = it;
          if (it && AU.seguir && !el.paused) llevarA(it);
        }
      }
      if (escucha) escucha.actualizar(t, d);
      pintarControles();
    }

    /* ── Reproducir y pausar ── */
    function reproducir() {
      if (AU.reanudar && el.currentTime < 1 && !AU.clip) { try { el.currentTime = AU.reanudar; } catch (x) { /* nada */ } }
      AU.reanudar = null;
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (err) { if (err && err.name !== 'AbortError') console.warn('Audio:', err.message); actualizar(true); });
      barra.classList.remove('plegada');
    }
    function alternar() { if (el.paused) reproducir(); else el.pause(); }
    function saltarSeg(s) { var d = dur(); el.currentTime = Math.max(0, Math.min(d || 1e9, (el.currentTime || AU.reanudar || 0) + s)); AU.reanudar = null; actualizar(true); }
    function cambiarVel() {
      var i = VELOCIDADES.indexOf(el.playbackRate); var v = VELOCIDADES[(i + 1) % VELOCIDADES.length] || 1;
      el.playbackRate = v; G.escribir('audio-vel', v); pintarControles();
    }
    function irA(f) { var d = dur(); if (!d) return; AU.clip = null; AU.reanudar = null; el.currentTime = f * d; ultimo = null; actualizar(true); }
    bPlay.onclick = function () { if (AU.clip) { terminarTramo(true); return; } alternar(); };
    barra.querySelector('.au-pastilla').onclick = function () {
      if (barra.classList.contains('plegada') && !el.paused) { barra.classList.remove('plegada'); return; }
      if (el.paused) reproducir(); else barra.classList.remove('plegada');
    };
    barra.querySelector('.au-menos').onclick = function () { saltarSeg(-15); };
    barra.querySelector('.au-mas').onclick = function () { saltarSeg(15); };
    bVel.onclick = cambiarVel;
    barra.querySelector('.au-abrir').onclick = function () { abrirEscucha(); };
    barra.querySelector('.au-plegar').onclick = function () { barra.classList.add('plegada'); };
    var arrastrando = false;
    rango.addEventListener('input', function () {
      arrastrando = true; var d = dur(); var f = rango.value / 1000;
      lleno.style.width = (f * 100) + '%'; tT.textContent = A.tiempo(f * d);
    });
    rango.addEventListener('change', function () { arrastrando = false; irA(rango.value / 1000); });

    var ultimaGuardada = 0;
    function alTiempo() {
      actualizar();
      if (!AU.clip && Date.now() - ultimaGuardada > 5000) { ultimaGuardada = Date.now(); guardarPos(e.id, el.currentTime, dur()); }
    }
    function alPausa() {
      if (!AU.clip) guardarPos(e.id, el.currentTime, dur());
      if (!AU.clip) barra.classList.add('plegada');
      actualizar(true);
    }
    function alSonar() { barra.classList.remove('plegada'); if (sinc === 'completa' && !AU.clip) { AU.seguir = AU.seguir !== false; } ultimo = null; actualizar(true); ponerSesion(); }
    function alTerminar() { AU.clip = null; guardarPos(e.id, 0, dur()); el.currentTime = 0; barra.classList.add('plegada'); actualizar(true); }
    function alMeta() { marcasPista(barra.querySelector('.au-pista__marcas')); if (escucha) escucha.marcas(); actualizar(true); }
    function alError() { barra.classList.add('plegada', 'con-error'); actualizar(true); }
    el.addEventListener('timeupdate', alTiempo);
    el.addEventListener('pause', alPausa);
    el.addEventListener('play', alSonar);
    el.addEventListener('ended', alTerminar);
    el.addEventListener('loadedmetadata', alMeta);
    el.addEventListener('ratechange', pintarControles);
    el.addEventListener('error', alError);
    function visible() { if (document.visibilityState === 'hidden' && !AU.clip) guardarPos(e.id, el.currentTime, dur()); }
    document.addEventListener('visibilitychange', visible);

    /* ── Pantalla bloqueada y controles del sistema (Media Session) ── */
    var portadaURL = null;
    function imagenPortada() {
      if (portadaURL == null) portadaURL = portadaAudio(e, tema, bgCuaderno, st);
      return portadaURL;
    }
    function ponerMetadatos(v) {
      if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
      try {
        var img = imagenPortada();
        navigator.mediaSession.metadata = new MediaMetadata({
          title: (v > 0 ? nombres[v] + ' · ' : '') + e.titulo,
          artist: A.creditos(a, autor).replace(/^Narra /, ''),
          album: RA.antetitulo(e) + ' · ' + ((sitio.proyecto && sitio.proyecto.titulo) || ''),
          artwork: img ? [{ src: img, sizes: '512x512', type: 'image/png' }] : []
        });
      } catch (x) { /* navegador sin soporte completo */ }
    }
    function ponerSesion() {
      if (!('mediaSession' in navigator)) return;
      var ms = navigator.mediaSession;
      var h = {
        play: reproducir, pause: function () { el.pause(); },
        seekbackward: function () { saltarSeg(-15); }, seekforward: function () { saltarSeg(15); },
        seekto: function (d) { if (d && d.seekTime != null) { el.currentTime = d.seekTime; actualizar(true); } }
      };
      Object.keys(h).forEach(function (k) { try { ms.setActionHandler(k, h[k]); } catch (x) { /* acción no soportada */ } });
      ponerMetadatos(ultimaVoz < 0 ? 0 : ultimaVoz);
    }

    /* ══ Modo escucha ══ */
    var escucha = null;
    function abrirEscucha() {
      if (escucha) return;
      AU.abierta = true;
      var conTexto = sinc !== 'completa';
      var ov = document.createElement('div');
      ov.className = 'au-escucha' + (e.tipo === 'apunte' ? ' au-escucha--apunte' : '');
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Modo escucha · ' + e.titulo);
      var fgO = RA.esClaro(bgCuaderno) ? tema.pal.tinta : tema.pal.papel;
      ov.style.setProperty('--au-fondo', bgCuaderno); ov.style.setProperty('--au-fg', fgO);
      ov.style.setProperty('--pc', RA.esClaro(bgCuaderno) ? 'rgba(20,20,40,.09)' : 'rgba(255,255,255,.16)');
      var portadaHTML = RA.htmlCuaderno(e, tema, 'au-escucha__cuaderno', 'tabindex="-1" aria-hidden="true"').replace(/^<a /, '<div ').replace(/<\/a>$/, '</div>').replace(/ href="[^"]*"/, '');
      ov.innerHTML =
        '<span class="pat p-' + esc(e.tipo === 'apunte' ? 'grano' : st.patron) + '"></span>' +
        '<div class="au-escucha__cabeza">' +
          '<button type="button" class="au-boton au-escucha__cerrar" aria-label="Cerrar el modo escucha">' + IC.bajar + '</button>' +
          (conTexto ? '<span class="au-seg" role="group" aria-label="Qué ver"><button type="button" data-ver="portada" aria-pressed="true">Portada</button><button type="button" data-ver="texto" aria-pressed="false">Leer mientras escuchas</button></span>'
            : '<button type="button" class="au-escucha__texto" data-ver="lectura">Ver texto</button>') +
        '</div>' +
        '<div class="au-escucha__vista au-escucha__vista--portada">' +
          '<div class="au-escucha__portada">' + portadaHTML + '</div>' +
          '<div class="au-escucha__titulos"><span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + A.minutos(dur()) + ' min</span>' +
            '<h2>' + esc(e.titulo) + '</h2><p>' + esc(A.creditos(a, autor)) + '</p></div>' +
          '<div class="au-escucha__parrafos" aria-live="off"></div>' +
          '<div class="au-escucha__voz" hidden></div>' +
        '</div>' +
        (conTexto ? '<div class="au-escucha__vista au-escucha__vista--texto" hidden><div class="au-escucha__hoja"><div class="cuerpo">' + RA.limpiarHTML(e.cuerpo_html) + '</div></div></div>' : '') +
        '<div class="au-escucha__controles">' +
          '<div class="au-escucha__seccion"></div>' +
          '<div class="au-pista au-pista--grande"><div class="au-pista__marcas"></div><div class="au-pista__lleno"></div>' +
            '<input type="range" class="au-rango" min="0" max="1000" step="1" value="0" aria-label="Posición del audio"></div>' +
          '<div class="au-tiempos"><span class="au-t">0:00</span><span class="au-resta"></span></div>' +
          '<div class="au-escucha__botones">' +
            '<button type="button" class="au-boton au-vel" aria-label="Velocidad"></button>' +
            '<button type="button" class="au-boton au-menos" aria-label="Atrás 15 segundos">' + IC.menos + '</button>' +
            '<button type="button" class="au-escucha__play" aria-label="Escuchar">' + IC.play + '</button>' +
            '<button type="button" class="au-boton au-mas" aria-label="Adelante 15 segundos">' + IC.mas + '</button>' +
            (secciones.length > 1 ? '<button type="button" class="au-boton au-secciones" aria-label="Secciones" aria-haspopup="true">' + IC.lista + '</button>' : '<span class="au-hueco"></span>') +
          '</div>' +
          '<div class="au-escucha__menu" hidden></div>' +
        '</div>';
      document.body.appendChild(ov);
      document.documentElement.classList.add('au-escuchando');
      var r = ov.querySelector('.au-rango'), ll = ov.querySelector('.au-pista__lleno'), t1 = ov.querySelector('.au-t'), t2 = ov.querySelector('.au-resta');
      var bP = ov.querySelector('.au-escucha__play'), bV = ov.querySelector('.au-vel'), par = ov.querySelector('.au-escucha__parrafos');
      var vozCaja = ov.querySelector('.au-escucha__voz'), secc = ov.querySelector('.au-escucha__seccion'), menu = ov.querySelector('.au-escucha__menu');
      var arr = false, ultimoP = null, ultimoV = null;
      var antes = document.activeElement;
      ov.classList.toggle('con-parrafo', sinc === 'completa' && tiempos.length > 0);

      escucha = {
        el: ov,
        marcas: function () { marcasPista(ov.querySelector('.au-pista__marcas')); },
        pintarControles: function (sonando) {
          bP.innerHTML = sonando ? IC.pausa : IC.play;
          bP.setAttribute('aria-label', sonando ? 'Pausar' : 'Escuchar');
          bV.textContent = textoVel(el.playbackRate || 1);
        },
        actualizar: function (t, d) {
          var tv = AU.reanudar && t < 1 && el.paused ? AU.reanudar : t;
          var fr = d ? Math.min(1, tv / d) : 0;
          ll.style.width = (fr * 100).toFixed(2) + '%';
          if (!arr) r.value = Math.round(fr * 1000);
          r.setAttribute('aria-valuetext', A.tiempo(tv) + ' de ' + A.tiempo(d));
          t1.textContent = A.tiempo(tv); t2.textContent = d ? '−' + A.tiempo(d - tv) : '';
          // Sección
          if (secciones.length) {
            var sc = null, k; for (k = 0; k < secciones.length; k++) if (secciones[k].t <= tv + 0.05) sc = k;
            secc.textContent = sc == null ? '' : 'Sección ' + (sc + 1) + ' de ' + secciones.length + ' · ' + A.texto(secciones[sc].el);
          }
          // Párrafo que suena (completa)
          if (sinc === 'completa' && tiempos.length) {
            var it = actual(tv);
            if (it !== ultimoP) {
              ultimoP = it;
              var idx = it ? tiempos.indexOf(it) : -1, prev = idx > 0 ? tiempos[idx - 1] : null;
              par.innerHTML = (prev ? '<p class="au-escucha__previo">' + esc(recortar(A.texto(prev.el), 160, true)) + '</p>' : '') +
                (it ? '<p class="au-escucha__actual' + (it.tag === 'H2' || it.tag === 'H3' ? ' es-titulo' : '') + (it.v > 0 ? ' de-voz' : '') + '"' + (it.v > 0 ? ' style="--au-voz:' + colores[it.v] + '"' : '') + '>' +
                  (it.v > 0 ? '<span class="au-escucha__quien">' + esc(nombres[it.v]) + '</span>' : '') + esc(recortar(A.textoCita(it.el), 420)) + '</p>' :
                  '<p class="au-escucha__actual au-escucha__espera">' + (tv < 1 ? 'Toca escuchar para empezar.' : '') + '</p>');
            }
          }
          // Otra voz sobre la portada (sin sincronizar del todo)
          var tr = sinc !== 'completa' ? tramoEn(tv) : null;
          if (tr && (el.paused && !AU.clip)) tr = null;
          if (tr !== ultimoV) {
            ultimoV = tr;
            vozCaja.hidden = !tr;
            ov.classList.toggle('con-voz', !!tr);
            if (tr) {
              vozCaja.style.setProperty('--au-voz', colores[tr.v]);
              vozCaja.style.setProperty('--au-voz-fg', RA.esClaro(colores[tr.v]) ? tema.pal.tinta : tema.pal.papel);
              vozCaja.innerHTML = '<span class="au-escucha__quien">' + esc(nombres[tr.v]) + '</span><p>' + esc(recortar(A.textoCita(tr.it.el), 360)) + '</p>';
            }
          }
        },
        cerrar: function () {
          document.removeEventListener('keydown', tecla, true);
          ov.remove(); document.documentElement.classList.remove('au-escuchando');
          escucha = null; AU.abierta = false;
          if (antes && antes.focus && document.contains(antes)) antes.focus({ preventScroll: true });
        }
      };
      function recortar(s, n, alFinal) {
        if (s.length <= n) return s;
        return alFinal ? '…' + s.slice(-n).replace(/^\S*\s/, '') : s.slice(0, n).replace(/\s+\S*$/, '') + '…';
      }
      function tecla(ev) {
        if (ev.key === 'Escape') { ev.stopPropagation(); escucha.cerrar(); return; }
        if (ev.key === ' ' && !ev.target.closest('button,input,a')) { ev.preventDefault(); ev.stopPropagation(); alternar(); }
      }
      document.addEventListener('keydown', tecla, true);
      ov.querySelector('.au-escucha__cerrar').onclick = function () { escucha.cerrar(); };
      bP.onclick = function () { if (AU.clip) { terminarTramo(true); return; } alternar(); };
      ov.querySelector('.au-menos').onclick = function () { saltarSeg(-15); };
      ov.querySelector('.au-mas').onclick = function () { saltarSeg(15); };
      bV.onclick = cambiarVel;
      r.addEventListener('input', function () { arr = true; var d = dur(); ll.style.width = (r.value / 10) + '%'; t1.textContent = A.tiempo(r.value / 1000 * d); });
      r.addEventListener('change', function () { arr = false; irA(r.value / 1000); });
      ov.querySelectorAll('[data-ver]').forEach(function (b) {
        b.onclick = function () {
          var ver = b.getAttribute('data-ver');
          if (ver === 'lectura') { escucha.cerrar(); if (ultimo) { AU.seguir = true; llevarA(ultimo); } else if (ctx.irAlTexto) ctx.irAlTexto(); return; }
          ov.querySelectorAll('[data-ver]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
          ov.querySelector('.au-escucha__vista--portada').hidden = ver !== 'portada';
          ov.querySelector('.au-escucha__vista--texto').hidden = ver !== 'texto';
          ov.classList.toggle('viendo-texto', ver === 'texto');
        };
      });
      var bs = ov.querySelector('.au-secciones');
      if (bs) bs.onclick = function () {
        if (!menu.hidden) { menu.hidden = true; return; }
        menu.innerHTML = '<ul>' + secciones.map(function (s, k) {
          return '<li><button type="button" data-sec="' + k + '"><span>' + esc(A.texto(s.el)) + '</span><span>' + A.tiempo(s.t) + '</span></button></li>';
        }).join('') + '</ul>';
        menu.hidden = false;
        menu.querySelector('button').focus();
      };
      menu.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-sec]'); if (!b) return;
        var s = secciones[+b.getAttribute('data-sec')];
        AU.clip = null; AU.reanudar = null; AU.desde = s; el.currentTime = s.t + 0.05; menu.hidden = true; ultimoP = null;
        if (el.paused) reproducir(); else actualizar(true);
      });
      escucha.marcas(); actualizar(true);
      ov.querySelector('.au-escucha__play').focus({ preventScroll: true });
    }

    /* ── Botones de la portadilla y de la ficha ── */
    // Mientras el botón «Escuchar» de la portadilla está a la vista, la pastilla no hace falta (y no lo tapa)
    var io = null, bPortada = raiz.querySelector('.portadilla [data-escuchar], .ficha__audio [data-escuchar]');
    if (bPortada && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (l) { barra.classList.toggle('con-portada', !!(l[0] && l[0].isIntersecting)); });
      io.observe(bPortada);
    }
    var textosEscuchar = [].slice.call(raiz.querySelectorAll('[data-escuchar] .boton-escuchar__texto')).map(function (x) { return { el: x, original: x.textContent }; });
    raiz.querySelectorAll('[data-escuchar]').forEach(function (b) {
      b.onclick = function () {
        if (!el.paused && !AU.clip) { el.pause(); return; }
        if (el.paused) reproducir();
        if (sinc === 'completa' && ctx.irAlTexto) { AU.seguir = true; porVoz = true; ctx.irAlTexto(); porVoz = false; }
      };
    });

    alMeta();
    if (sigue && AU.abierta) { AU.abierta = false; abrirEscucha(); }
    else if (!sigue && a.abrir_escucha) abrirEscucha();
    if (sigue && !el.paused) barra.classList.remove('plegada');
    ctx.audio = { el: el, abrirEscucha: abrirEscucha };

    return function limpiar() {
      vivo = false;
      var continuar = RA.audioContinuar === e.id;
      el.removeEventListener('timeupdate', alTiempo);
      el.removeEventListener('pause', alPausa);
      el.removeEventListener('play', alSonar);
      el.removeEventListener('ended', alTerminar);
      el.removeEventListener('loadedmetadata', alMeta);
      el.removeEventListener('ratechange', pintarControles);
      el.removeEventListener('error', alError);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('wheel', alMoverLector);
      window.removeEventListener('touchmove', alMoverLector);
      window.removeEventListener('keydown', alMoverLector);
      window.removeEventListener('scroll', ocultarSaltar);
      if (saltar) saltar.remove();
      if (escucha) { var ab = true; escucha.cerrar(); AU.abierta = ab; }
      if (io) io.disconnect();
      barra.remove(); if (chipSeguir) chipSeguir.remove();
      if (!continuar) {
        if (AU.clip) { el.currentTime = AU.clip.volverA || 0; AU.clip = null; }
        guardarPos(e.id, el.currentTime, dur());
        el.pause();
        AU.abierta = false;
        if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; } catch (x) { /* nada */ } }
      }
    };
  };

  /* ══ Solo las citas (6 nov 2026) ═════════════════════════════════
     El archivo es la fuente de las citas, no una narración: cada cita con
     inicio y fin tiene un botón discreto que hace sonar solo su fragmento,
     y el audio se detiene en el fin. Sin barra, sin «Escuchar», sin modo
     escucha ni posición guardada. Una cita a la vez. */
  function montarCitas(ctx) {
    var e = ctx.e, a = e.audio, sitio = ctx.sitio || {}, tema = ctx.tema, raiz = ctx.raiz, cuerpo = raiz.querySelector('.cuerpo');
    var autor = (sitio.proyecto && sitio.proyecto.autor) || '', nombres = A.voces(a, autor);
    var st = RA.estiloPortada(e, tema), bgCuaderno = e.tipo === 'apunte' ? RA.fichaApunte(e, tema).color : st.bg;
    var tinta0 = ctx.tintas ? ctx.tintas.tc : tema.pal.tinta;
    var colores = nombres.map(function (x, v) { return A.colorVoz(v, tema, bgCuaderno, tinta0); });

    var fuente = A.bloquesDeHTML(e.cuerpo_html), vistos = A.bloques(cuerpo), firmas = fuente.map(A.firma);
    var marcas = A.alinear(firmas, a.marcas || []), citas = [];
    firmas.forEach(function (f, i) {
      var mk = marcas[i], q = vistos[i];
      if (!f.cita || !q || q.tagName !== 'BLOCKQUOTE' || !A.tramoValido(mk)) return;
      var v = +mk.v || 0; if (v < 0 || v >= nombres.length) v = 0;
      citas.push({ el: q, ini: +mk.t, fin: +mk.f, v: v });
    });
    if (!citas.length) return function () { };

    var src = A.url(a, A.base(sitio.apariencia), ctx.prefijoAudio || '');
    var sigue = AU.el && AU.id === e.id && AU.modo === 'citas' && RA.audioContinuar === e.id;
    RA.audioContinuar = null;
    if (!sigue) {
      soltarAudio();
      AU = { el: new Audio(), id: e.id, modo: 'citas', k: -1, terminada: false };
      AU.el.preload = 'metadata';
      AU.el.src = src;
    }
    var el = AU.el, vivo = true, raf = 0, reloj = 0, portadaURL = null;

    /* ── El botón de cada cita ── */
    citas.forEach(function (c, k) {
      var q = c.el, sobre = RA.esClaro(colores[c.v]) ? tema.pal.tinta : '#FFFFFF';
      q.style.setProperty('--au-voz', colores[c.v]);   // para el resaltado mientras suena
      q.style.setProperty('--au-voz-sobre', sobre);
      if (c.v > 0) q.classList.add('au-con-voz');   // la cita en otra voz toma su tinta, como en la sincronización completa
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'au-cita au-cita--sola';
      b.style.setProperty('--au-cv', colores[c.v]);   // el CSS lo pasa a --au-voz (la cita destacada lo cambia)
      b.style.setProperty('--au-cs', sobre);
      c.quien = c.v > 0 ? ' en la voz de ' + nombres[c.v] : '';
      c.largo = Math.max(0.1, c.fin - c.ini);
      b.title = 'Escuchar la cita' + c.quien;
      b.innerHTML = '<span class="au-cita__icono">' + IC.play + '</span><span class="au-cita__texto"></span><span class="au-cita__prog" aria-hidden="true"><i></i></span>';
      q.appendChild(b);
      c.b = b; c.icono = b.querySelector('.au-cita__icono'); c.txt = b.querySelector('.au-cita__texto'); c.prog = b.querySelector('.au-cita__prog i');
      b.onclick = function () { tocar(k); };
    });
    function largoTxt(s) { return A.tiempo(Math.ceil(s - 0.05)); }

    /* ── Sonar, pausar y detenerse en el fin ── */
    function tocar(k) {
      var c = citas[k]; if (!c) return;
      if (AU.k === k && !el.paused) { el.pause(); return; }
      var t = el.currentTime || 0;
      var desdeInicio = AU.k !== k || AU.terminada || t < c.ini - 0.3 || t >= c.fin - 0.05;
      AU.k = k; AU.terminada = false; AU.error = false;
      try { el.volume = 1; } catch (x) { /* volumen fijo (iOS) */ }
      if (desdeInicio) ponerEn(c.ini);
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (err) { if (err && err.name !== 'AbortError') console.warn('Audio:', err.message); pintar(); });
      ponerMetadatos(c); pintar();
    }
    function ponerEn(t) {
      if (el.readyState >= 1) { el.currentTime = t; return; }
      // Sin los metadatos todavía: se salta en cuanto lleguen (y por si el navegador ya lo admite, de una vez)
      try { el.currentTime = t; } catch (x) { /* nada */ }
      el.addEventListener('loadedmetadata', function una() { el.removeEventListener('loadedmetadata', una); if (!AU.terminada && Math.abs(el.currentTime - t) > 0.3) el.currentTime = t; });
    }
    function vigilar() {
      cancelAnimationFrame(raf); clearTimeout(reloj);
      if (!vivo || el.paused || AU.k < 0 || AU.terminada) return;
      var c = citas[AU.k], t = el.currentTime || 0, vel = el.playbackRate || 1;
      if (t >= c.fin - 0.02) { cortar(); return; }
      var falta = c.fin - t;
      if (falta < 0.15) { try { el.volume = Math.max(0, falta / 0.15); } catch (x) { /* nada */ } }   // sin golpe al cortar
      pintar();
      raf = requestAnimationFrame(vigilar);
      // Con la pantalla apagada no hay cuadros: el reloj corta a tiempo igual
      reloj = setTimeout(vigilar, Math.max(15, Math.min(250, falta / vel * 1000 - 10)));
    }
    function cortar() {
      cancelAnimationFrame(raf); clearTimeout(reloj);
      AU.terminada = true;
      el.pause();
      try { el.volume = 1; } catch (x) { /* nada */ }
      pintar();
    }

    /* ── Pintar los botones ── */
    function pintar() {
      if (!vivo) return;
      citas.forEach(function (c, k) {
        var activa = AU.k === k && !AU.terminada, sonando = activa && !el.paused;
        var pos = activa ? Math.max(0, Math.min(c.largo, (el.currentTime || 0) - c.ini)) : 0;
        var pausada = activa && el.paused && pos > 0.3;
        var txt = activa && AU.error ? 'No se pudo cargar el audio'
          : sonando ? A.tiempo(pos) + ' / ' + largoTxt(c.largo)
          : pausada ? 'En pausa · ' + A.tiempo(pos) + ' / ' + largoTxt(c.largo)
          : 'Escuchar · ' + largoTxt(c.largo);
        if (c.txt.textContent !== txt) c.txt.textContent = txt;
        if (c.sonando !== sonando) {
          c.sonando = sonando;
          c.icono.innerHTML = sonando ? IC.pausa : IC.play;
          c.b.classList.toggle('activo', sonando);
          c.b.setAttribute('aria-pressed', sonando ? 'true' : 'false');
          c.el.classList.toggle('au-voz-activa', sonando);
        }
        c.b.classList.toggle('en-pausa', pausada);
        var lbl = (sonando ? 'Pausar la cita' : 'Escuchar la cita') + c.quien + ' · ' + largoTxt(c.largo);
        if (c.b.getAttribute('aria-label') !== lbl) c.b.setAttribute('aria-label', lbl);
        c.prog.style.transform = 'scaleX(' + (activa ? (pos / c.largo).toFixed(3) : 0) + ')';
      });
    }

    /* ── Pantalla bloqueada: el nombre de la voz y la cita anterior / siguiente ── */
    function ponerMetadatos(c) {
      if (!('mediaSession' in navigator)) return;
      var ms = navigator.mediaSession;
      try {
        if (window.MediaMetadata) {
          if (portadaURL == null) portadaURL = portadaAudio(e, tema, bgCuaderno, st);
          ms.metadata = new MediaMetadata({
            title: (c.v > 0 ? nombres[c.v] : 'Cita') + ' · ' + e.titulo,
            artist: c.v > 0 ? nombres[c.v] : nombres[0],
            album: RA.antetitulo(e) + ' · ' + ((sitio.proyecto && sitio.proyecto.titulo) || ''),
            artwork: portadaURL ? [{ src: portadaURL, sizes: '512x512', type: 'image/png' }] : []
          });
        }
      } catch (x) { /* navegador sin soporte completo */ }
      var h = {
        play: function () { if (AU.k >= 0) tocar(AU.k); },
        pause: function () { el.pause(); },
        previoustrack: AU.k > 0 ? function () { tocar(AU.k - 1); } : null,
        nexttrack: AU.k < citas.length - 1 ? function () { tocar(AU.k + 1); } : null,
        seekbackward: null, seekforward: null, seekto: null
      };
      Object.keys(h).forEach(function (k) { try { ms.setActionHandler(k, h[k]); } catch (x) { /* acción no soportada */ } });
    }

    function alSonar() { vigilar(); pintar(); }
    function alPausa() { cancelAnimationFrame(raf); clearTimeout(reloj); pintar(); }
    function alTiempo() { if (!el.paused) vigilar(); else pintar(); }
    function alTerminar() { cortar(); }
    function alError() { AU.error = true; pintar(); }
    el.addEventListener('play', alSonar);
    el.addEventListener('pause', alPausa);
    el.addEventListener('timeupdate', alTiempo);
    el.addEventListener('ended', alTerminar);
    el.addEventListener('error', alError);
    pintar();
    if (sigue && !el.paused) vigilar();
    ctx.audio = { el: el, citas: citas.length };

    return function limpiar() {
      vivo = false; cancelAnimationFrame(raf); clearTimeout(reloj);
      el.removeEventListener('play', alSonar);
      el.removeEventListener('pause', alPausa);
      el.removeEventListener('timeupdate', alTiempo);
      el.removeEventListener('ended', alTerminar);
      el.removeEventListener('error', alError);
      if (RA.audioContinuar !== e.id) {
        el.pause(); AU.k = -1; AU.terminada = false;
        try { el.volume = 1; } catch (x) { /* nada */ }
        if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; } catch (x) { /* nada */ } }
      }
    };
  }
})();
