/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · página de Referentes (A-18)
   Cuatro vistas sobre el mismo universo: Muro · Cuadrícula · Lista · Fichero.
   La búsqueda y los filtros definen el universo; la vista es la lente.
   Todo queda en la dirección:  #/referentes[/<cuaderno>][/r/<id>]?v=fichero&q=voz&tipo=…&etq=…&orden=antiguos
   La vista por defecto la elige el autor en Apariencia (apariencia.extra.vista_referentes).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  var VISTAS = [['muro', 'Muro'], ['cuadricula', 'Cuadrícula'], ['lista', 'Lista'], ['fichero', 'Fichero']];
  var ICONOS = {
    muro: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="2" width="7" height="9"/><rect x="11" y="2" width="7" height="5"/><rect x="2" y="13" width="7" height="5"/><rect x="11" y="9" width="7" height="9"/></svg>',
    cuadricula: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="2" width="7" height="7"/><rect x="11" y="2" width="7" height="7"/><rect x="2" y="11" width="7" height="7"/><rect x="11" y="11" width="7" height="7"/></svg>',
    lista: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="3" width="4" height="3"/><rect x="8" y="3" width="10" height="3"/><rect x="2" y="8.5" width="4" height="3"/><rect x="8" y="8.5" width="10" height="3"/><rect x="2" y="14" width="4" height="3"/><rect x="8" y="14" width="10" height="3"/></svg>',
    fichero: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="1" y="8.5" width="3" height="3"/><rect x="5" y="8.5" width="3" height="3" class="v"/><rect x="9" y="8.5" width="3" height="3" class="v"/><rect x="13" y="8.5" width="3" height="3"/><rect x="17" y="8.5" width="2" height="3" class="v"/><rect x="1" y="1" width="7" height="5"/><rect x="13" y="14" width="6" height="5"/></svg>'
  };
  var LUPA = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12.5 12.5 18 18" stroke="currentColor" stroke-width="2"/></svg>';

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function sesion(k, v) {
    try { if (v === undefined) return sessionStorage.getItem('ra-' + k); sessionStorage.setItem('ra-' + k, v); } catch (e) { /* sin almacenamiento */ }
    return null;
  }
  function recorte(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 2).replace(/\s+\S*$/, '') + '…' : t; }
  function vistaValida(v) { return VISTAS.some(function (x) { return x[0] === v; }) ? v : null; }

  /* Color de las tarjetas (decidido con Diego el 4 nov 2026). Se elige en Apariencia → Página de Referentes:
     · color:   tipo (cada tipo en una tinta) · rotacion (cada ficha en una tinta distinta) ·
                etiquetas (el color de sus etiquetas; con varias, un degradado, como las bandas de los pasajes)
     · tono:    pleno (la tarjeta entera en la tinta) · pastel (la tinta aclarada sobre el papel)
     · paleta:  la del sitio o una propia para los referentes (riso, saturada, pastel)
     · colores de las etiquetas: los de la paleta (por uso) o los del Moodboard */
  var OPCIONES = {
    color: ['rotacion', 'tipo', 'etiquetas'], tono: ['pleno', 'pastel'],
    paleta: ['sitio', 'riso', 'saturada', 'pastel'], etqcolor: ['paleta', 'moodboard']
  };
  function opcion(k, url, guardada) {
    var l = OPCIONES[k];
    return l.indexOf(url) >= 0 ? url : (l.indexOf(guardada) >= 0 ? guardada : l[0]);
  }
  function hexRGB(h) { var n = parseInt(String(h).replace('#', ''), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mezclar(a, b, t) {   // t = cuánto de a
    var x = hexRGB(a), y = hexRGB(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] * t + y[i] * (1 - t)).toString(16)).slice(-2); }).join('');
  }

  RA.referentes = { VISTAS: VISTAS, vistaValida: vistaValida, OPCIONES: OPCIONES };

  /* ctx: { raiz, S, cabecera, tituloHTML, pie, cuaderno, refId, consulta, prevista, U, vistaDefecto, titulo(t) }
     Devuelve una función para limpiar (listeners de ventana). */
  RA.referentes.pintar = function (ctx) {
    var U = ctx.U, S = ctx.S, raiz = ctx.raiz;
    var tipos = {}; U.tipos.forEach(function (t) { tipos[t.id] = t; });
    var etq = {}; U.etiquetas.forEach(function (t) { etq[t.id] = t; });
    var etqDe = {}, conteoEtq = {};
    U.pares.forEach(function (p) { if (!etq[p.etiqueta_id]) return; (etqDe[p.referente_id] = etqDe[p.referente_id] || []).push(p.etiqueta_id); });
    var citasDe = {}, refsDe = {};
    U.citas.forEach(function (c) {
      var e = S.porId[c.entrada_id]; if (!e) return;   // solo entradas publicadas
      (citasDe[c.referente_id] = citasDe[c.referente_id] || []).push(e);
      (refsDe[e.slug] = refsDe[e.slug] || {})[c.referente_id] = 1;
    });
    // De lo más antiguo a lo más reciente: por número de ficha (SQL 10) o, sin él, por fecha
    var conNumero = U.referentes.some(function (r) { return r.numero != null; });
    var asc = U.referentes.slice().sort(function (a, b) {
      if (conNumero) return (a.numero || 1e9) - (b.numero || 1e9);
      return String(a.creado_en).localeCompare(String(b.creado_en)) || String(a.id).localeCompare(String(b.id));
    });
    var porId = {};
    asc.forEach(function (r, i) {
      r._i = i; porId[r.id] = r;
      r._tipo = tipos[r.tipo_id] || { color: '#B9B4A6', nombre: '' };
      r._etq = (etqDe[r.id] || []).map(function (id) { return etq[id]; });
      r._etq.forEach(function (t) { conteoEtq[t.id] = (conteoEtq[t.id] || 0) + 1; });
      r._texto = norm([r.titulo, r.autor, r.fuente, r.anio, r.cuerpo, r._tipo.nombre].concat(r._etq.map(function (t) { return t.nombre; })).join(' '));
    });
    var conteoTipo = {}; asc.forEach(function (r) { conteoTipo[r.tipo_id] = (conteoTipo[r.tipo_id] || 0) + 1; });

    /* Colores de las tarjetas */
    var q0 = new URLSearchParams(ctx.consulta || ''), ex = ctx.extra || {};
    var cfg = {
      color: opcion('color', q0.get('color'), ex.referentes_color), tono: opcion('tono', q0.get('tono'), ex.referentes_tono),
      paleta: opcion('paleta', q0.get('paleta'), ex.referentes_paleta), etqcolor: opcion('etqcolor', q0.get('etqcolor'), ex.referentes_etiquetas_color)
    };
    var palSitio = (S.tema && S.tema.pal) || RA.TOKENS.paletas.riso;
    var pal = cfg.paleta === 'sitio' ? palSitio : RA.TOKENS.paletas[cfg.paleta];
    var tinta = pal.tinta, papel = palSitio.papel, pastel = cfg.tono === 'pastel';
    var tintas = [pal.cuadernos[1], pal.cuadernos[3], pal.cuadernos[2], pal.cuadernos[0], pal.cuadernos[4], pal.cuadernos[5], pal.apunte];
    var colorTipo = {}, colorEtq = {};
    U.tipos.slice().sort(function (a, b) { return (conteoTipo[b.id] || 0) - (conteoTipo[a.id] || 0); }).forEach(function (t, i) { colorTipo[t.id] = tintas[i % tintas.length]; });
    U.etiquetas.slice().sort(function (a, b) { return (conteoEtq[b.id] || 0) - (conteoEtq[a.id] || 0) || String(a.nombre).localeCompare(b.nombre); }).forEach(function (t, i) {
      colorEtq[t.id] = cfg.etqcolor === 'moodboard' && /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : tintas[i % tintas.length];
    });
    function sobre(c) { return RA.esClaro(c) ? '#1D1D3A' : '#FFFFFF'; }
    function promedio(l) {
      var t = [0, 0, 0]; l.forEach(function (c) { var x = hexRGB(c); t[0] += x[0]; t[1] += x[1]; t[2] += x[2]; });
      return '#' + t.map(function (v) { return ('0' + Math.round(v / l.length).toString(16)).slice(-2); }).join('');
    }
    function degradado(l) {
      if (l.length < 2) return l[0];
      return 'linear-gradient(135deg, ' + l.map(function (c, i) { return c + ' ' + Math.round(i / (l.length - 1) * 100) + '%'; }).join(', ') + ')';
    }
    asc.forEach(function (r, i) {
      var l;
      if (cfg.color === 'etiquetas') {
        l = []; r._etq.forEach(function (t) { var c = colorEtq[t.id]; if (c && l.indexOf(c) < 0) l.push(c); });
        if (!l.length) l = [mezclar(tinta, papel, .35)];
      } else if (cfg.color === 'tipo') l = [colorTipo[r.tipo_id] || tintas[0]];
      else l = [tintas[((r.numero || i + 1) * 3) % tintas.length]];   // en rotación: paso 3 en 7, nunca dos seguidas iguales
      var lt = pastel ? l.map(function (c) { return mezclar(c, papel, .4); }) : l;
      r._c = l[0];                                   // tinta principal (sombras, chips, número)
      r._g = degradado(lt);                          // fondo de la tarjeta
      r._ct = pastel ? '#1D1D3A' : sobre(promedio(l));   // texto sobre el fondo
      r._ctc = sobre(l[0]);                          // texto sobre la tinta principal
      r._cs = mezclar(l[0], papel, .22);
      r._ctipo = colorTipo[r.tipo_id] || tintas[0];
      r._cetq = r._etq.map(function (t) { return colorEtq[t.id]; });
    });
    function vars(r) { return '--rf:' + r._c + ';--rf-g:' + r._g + ';--rf-t:' + r._ct + ';--rf-s:' + r._cs + ';--rf-tipo:' + r._ctipo + ';--rf-tc:' + r._ctc; }
    var clasesForma = 'rf-forma-' + (pastel ? 'pastel' : 'plena') + ' rf-color-' + cfg.color;
    var cuadernosConCitas = S.sitio.entradas.filter(function (e) { return refsDe[e.slug]; });
    var topEtq = Object.keys(conteoEtq).sort(function (a, b) { return conteoEtq[b] - conteoEtq[a]; }).slice(0, 18);

    /* ── Estado ── */
    var q = new URLSearchParams(ctx.consulta || '');
    var f = {
      v: vistaValida(q.get('v')) || (ctx.prevista ? null : vistaValida(sesion('vista-referentes'))) || vistaValida(ctx.vistaDefecto) || 'muro',
      q: q.get('q') || '', tipo: q.get('tipo') || '', etq: q.get('etq') || '',
      cuaderno: S.porSlug[ctx.cuaderno] ? ctx.cuaderno : '', orden: q.get('orden') === 'antiguos' ? 'antiguos' : 'recientes'
    };
    if (f.tipo && !tipos[f.tipo]) f.tipo = '';
    if (f.etq && !etq[f.etq]) f.etq = '';
    var fichaAbierta = null, fichero = null, limpiezas = [];

    function rutaBase() { return '#/referentes' + (f.cuaderno ? '/' + encodeURIComponent(f.cuaderno) : ''); }
    function consultaURL() {
      var p = new URLSearchParams();
      if (f.v !== (vistaValida(ctx.vistaDefecto) || 'muro')) p.set('v', f.v);
      if (f.q) p.set('q', f.q);
      if (f.tipo) p.set('tipo', f.tipo);
      if (f.etq) p.set('etq', f.etq);
      if (f.orden === 'antiguos' && f.v !== 'fichero') p.set('orden', 'antiguos');
      ['color', 'tono', 'paleta', 'etqcolor'].forEach(function (k) { if (q0.get(k)) p.set(k, cfg[k]); });   // para comparar (no se guarda)
      var s = p.toString();
      return s ? '?' + s : '';
    }
    function actualizarURL() {
      if (ctx.prevista) return;
      var h = fichaAbierta ? '#/referentes/r/' + encodeURIComponent(fichaAbierta) : rutaBase();
      try { history.replaceState(null, '', h + consultaURL()); } catch (e) { /* nada */ }
    }

    /* ── Coincidencias ── */
    function coincide(r) {
      if (f.tipo && r.tipo_id !== f.tipo) return false;
      if (f.etq && (etqDe[r.id] || []).indexOf(f.etq) < 0) return false;
      if (f.cuaderno && !(refsDe[f.cuaderno] || {})[r.id]) return false;
      if (f.q) {
        var t = norm(f.q).trim(), m = t.match(/^(?:#|n[º°o]\.?\s*)(\d+)$/);
        if (m) return conNumero && String(r.numero) === m[1];          // «#37» o «nº 37»: solo esa ficha
        if (/^\d+$/.test(t) && conNumero && String(r.numero) === t) return true;   // «37»: la ficha y lo que diga 37
        var palabras = t.split(/\s+/).filter(Boolean);
        for (var i = 0; i < palabras.length; i++) if (r._texto.indexOf(palabras[i]) < 0) return false;
      }
      return true;
    }
    function hayFiltro() { return !!(f.q || f.tipo || f.etq || f.cuaderno); }
    function visibles() {
      var l = asc.filter(coincide);
      return f.orden === 'antiguos' ? l : l.slice().reverse();
    }

    /* ── Esqueleto ── */
    raiz.innerHTML = ctx.cabecera +
      '<section class="rf-heroe"><div class="registro"><h1 class="registro__a">' + ctx.tituloHTML + '</h1><span class="registro__b" aria-hidden="true">' + ctx.tituloHTML + '</span></div>' +
      '<p class="rf-sub"></p></section>' +
      (asc.length ? '<div class="rf-controles">' +
        '<div class="rf-barra">' +
          '<label class="rf-buscar">' + LUPA + '<span class="solo-lector">Buscar referentes</span>' +
            '<input type="search" value="' + esc(f.q) + '" placeholder="Buscar por título, autor' + (conNumero ? ' o #nº' : ' o etiqueta') + '" autocomplete="off" spellcheck="false"></label>' +
          '<div class="rf-vistas" role="group" aria-label="Vista">' + VISTAS.map(function (v) {
            return '<button type="button" data-vista="' + v[0] + '" aria-pressed="' + (f.v === v[0]) + '">' + ICONOS[v[0]] + '<span>' + v[1] + '</span></button>';
          }).join('') + '</div></div>' +
        '<div class="rf-chips" role="group" aria-label="Tipo"><button type="button" data-tipo="" aria-pressed="' + !f.tipo + '">Todos <span>' + asc.length + '</span></button>' +
          U.tipos.filter(function (t) { return conteoTipo[t.id]; }).map(function (t) {
            return '<button type="button" data-tipo="' + esc(t.id) + '" aria-pressed="' + (f.tipo === t.id) + '"><i style="background:' + esc(colorTipo[t.id]) + '"></i>' + esc(t.nombre) + ' <span>' + conteoTipo[t.id] + '</span></button>';
          }).join('') + '</div>' +
        (cuadernosConCitas.length ? '<label class="rf-cuaderno">Citados en <select><option value="">todos los cuadernos</option>' + cuadernosConCitas.map(function (e) {
          return '<option value="' + esc(e.slug) + '"' + (e.slug === f.cuaderno ? ' selected' : '') + '>' + esc(RA.antetitulo(e) + ' · ' + e.titulo) + '</option>';
        }).join('') + '</select></label>' : '') +
        (topEtq.length ? '<div class="rf-etiquetas" role="group" aria-label="Etiquetas">' + topEtq.map(function (id) {
          return '<button type="button" data-etq="' + esc(id) + '" aria-pressed="' + (f.etq === id) + '">' + (cfg.color === 'etiquetas' ? '<i style="background:' + esc(colorEtq[id]) + '"></i>' : '#') + esc(etq[id].nombre) + '</button>';
        }).join('') + '</div>' : '') +
        '<div class="rf-estado" aria-live="polite"></div>' +
      '</div>' : '') +
      '<div class="rf-zona"></div>' + ctx.pie;
    var zona = raiz.querySelector('.rf-zona'), estado = raiz.querySelector('.rf-estado');
    clasesForma.split(' ').forEach(function (c) { raiz.classList.add(c); });

    function pintarSub() {
      var sub = raiz.querySelector('.rf-sub'), e = S.porSlug[f.cuaderno], n = asc.filter(coincide).length;
      if (!asc.length) { sub.textContent = 'Muy pronto, las lecturas, imágenes y datos que acompañan la investigación.'; return; }
      if (e) { sub.textContent = n + (n === 1 ? ' referente citado' : ' referentes citados') + ' en ' + RA.antetitulo(e) + ': «' + e.titulo + '»'; return; }
      sub.textContent = asc.length + (asc.length === 1 ? ' lectura, imagen, dato o enlace' : ' lecturas, imágenes, datos y enlaces') + ' que acompañan la investigación';
    }
    function pintarEstado() {
      if (!estado) return;
      var n = asc.filter(coincide).length, h = '';
      h += '<span class="rf-estado__n">' + (hayFiltro() ? n + ' de ' + asc.length + (n === 1 ? ' coincide' : ' coinciden') : asc.length + ' referentes') + '</span>';
      if (hayFiltro()) h += '<button type="button" class="rf-limpiar" data-limpiar>Quitar filtros</button>';
      if (f.v !== 'fichero') h += '<button type="button" class="rf-orden" data-orden aria-label="Cambiar el orden">' + (f.orden === 'antiguos' ? 'Primero lo más antiguo' : 'Primero lo más reciente') + ' <span aria-hidden="true">⇅</span></button>';
      else h += '<span class="rf-estado__nota">De lo más antiguo a lo más reciente</span>';
      estado.innerHTML = h;
    }

    /* ── Tarjetas ── */
    function numero(r) { return conNumero && r.numero != null ? '<span class="rf-num">nº ' + r.numero + '</span>' : ''; }
    function citasTexto(r) {
      return (citasDe[r.id] || []).map(function (x) { return '<span class="rf-cita" style="--c:' + RA.colorCuaderno(x, S.tema) + '">' + esc(RA.antetitulo(x)) + '</span>'; }).join(' ');
    }
    function img(r, extra) {
      var u = RA.urlImagen(r.imagen);
      return u ? '<img class="rf-card__img" src="' + esc(u) + '" alt="" loading="lazy" decoding="async"' +
        (r.imagen_w && r.imagen_h ? ' width="' + r.imagen_w + '" height="' + r.imagen_h + '"' : '') + (extra || '') + '>' : '';
    }
    function tarjetaMuro(r) {
      var meta = [r.autor, r.fuente, r.anio].filter(Boolean).join(' · ');
      return '<a class="rf-card' + (r.destacado ? ' rf-card--dest' : '') + '" href="#/referentes/r/' + encodeURIComponent(r.id) + '" data-ref="' + esc(r.id) + '" style="' + vars(r) + '">' +
        img(r) + '<span class="rf-card__cuerpo"><span class="rf-card__cab"><span class="antetitulo"><i style="background:' + esc(r._ctipo) + '"></i>' + esc(r._tipo.nombre) + '</span>' + numero(r) + '</span>' +
        '<span class="rf-card__titulo">' + esc(r.titulo || 'Sin título') + '</span>' +
        (meta ? '<span class="rf-card__meta">' + esc(meta) + '</span>' : '') +
        (r.cuerpo ? '<span class="rf-card__texto">' + esc(recorte(r.cuerpo, r.destacado ? 420 : 240)) + '</span>' : '') +
        (r._etq.length ? '<span class="rf-card__etq">' + r._etq.map(function (t) { return '#' + esc(t.nombre); }).join(' ') + '</span>' : '') +
        ((citasDe[r.id] || []).length ? '<span class="rf-card__citas">En ' + citasTexto(r) + '</span>' : '') + '</span></a>';
    }
    function tarjetaCuad(r) {
      var u = RA.urlImagen(r.imagen);
      return '<a class="rf-cu' + (r.destacado ? ' rf-cu--dest' : '') + (u ? '' : ' rf-cu--sin') + '" href="#/referentes/r/' + encodeURIComponent(r.id) + '" data-ref="' + esc(r.id) + '" style="' + vars(r) + '">' +
        '<span class="rf-cu__marco">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy" decoding="async">' : '<span class="rf-cu__texto">' + esc(recorte(r.cuerpo || r.titulo, 160)) + '</span>') + '</span>' +
        '<span class="rf-cu__pie"><span class="rf-card__cab"><span class="antetitulo"><i style="background:' + esc(r._ctipo) + '"></i>' + esc(r._tipo.nombre) + '</span>' + numero(r) + '</span>' +
        '<span class="rf-cu__titulo">' + esc(r.titulo || 'Sin título') + '</span></span></a>';
    }
    function filaLista(r) {
      var meta = [r.autor, r.fuente, r.anio].filter(Boolean).join(' · ');
      return '<a class="rf-fila' + (r.destacado ? ' rf-fila--dest' : '') + '" href="#/referentes/r/' + encodeURIComponent(r.id) + '" data-ref="' + esc(r.id) + '" style="' + vars(r) + '">' +
        '<span class="rf-fila__num">' + (conNumero && r.numero != null ? r.numero : '') + (r.destacado ? '<span class="solo-lector"> (destacado)</span>' : '') + '</span>' +
        '<span class="rf-fila__textos"><span class="rf-fila__titulo">' + esc(r.titulo || 'Sin título') + '</span>' +
          (meta ? '<span class="rf-fila__meta">' + esc(meta) + '</span>' : '') + '</span>' +
        '<span class="rf-fila__tipo"><i style="background:' + esc(r._ctipo) + '"></i>' + esc(r._tipo.nombre) + '</span>' +
        '<span class="rf-fila__etq">' + r._etq.slice(0, 3).map(function (t) { return '#' + esc(t.nombre); }).join(' ') + '</span>' +
        '<span class="rf-fila__citas">' + citasTexto(r) + '</span></a>';
    }

    /* ── Zona de la vista ── */
    var muroRO = null;
    function pintarZona(desplazar) {
      if (fichero) { fichero.destruir(); fichero = null; }
      if (muroRO) { muroRO.disconnect(); muroRO = null; }
      zona.className = 'rf-zona rf-zona--' + f.v;
      if (!asc.length) { zona.innerHTML = ''; return; }
      if (f.v === 'fichero') {
        zona.innerHTML = '';
        fichero = crearFichero(zona, asc, { coincide: coincide, conNumero: conNumero, abrir: abrirFicha, citasDe: citasDe, vars: vars });
        return;
      }
      var l = visibles();
      if (!l.length) { zona.innerHTML = '<p class="vacio">Nada coincide con esta búsqueda.</p>'; return; }
      if (f.v === 'muro') {
        zona.innerHTML = '<div class="rf-muro">' + l.map(tarjetaMuro).join('') + '</div>';
        acomodarMuro(zona.firstChild);
      } else if (f.v === 'cuadricula') {
        zona.innerHTML = '<div class="rf-cuad">' + l.map(tarjetaCuad).join('') + '</div>';
      } else {
        zona.innerHTML = '<div class="rf-lista" role="list">' +
          '<div class="rf-lista__cab" aria-hidden="true"><span>Nº</span><span>Título</span><span>Tipo</span><span>Etiquetas</span><span>Citado en</span></div>' +
          l.map(filaLista).join('') + '</div>';
      }
      if (desplazar) zona.scrollIntoView({ block: 'start' });
    }

    /* Muro: rejilla con filas de 4 px. Cada tarjeta ocupa las filas de su alto; las destacadas, dos columnas. */
    function acomodarMuro(m) {
      if (!m) return;
      var marco = 0;
      function medir() {
        marco = 0;
        var cols = getComputedStyle(m).gridTemplateColumns.split(' ').filter(Boolean).length;
        m.classList.toggle('rf-muro--una', cols < 2);
        Array.prototype.forEach.call(m.children, function (c) {
          c.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((c.getBoundingClientRect().height + 26) / 4));
        });
      }
      function pedir() { if (!marco) marco = requestAnimationFrame(medir); }
      medir();
      m.querySelectorAll('img').forEach(function (i) { if (!i.complete) { i.addEventListener('load', pedir); i.addEventListener('error', pedir); } });
      if (window.ResizeObserver) { muroRO = new ResizeObserver(pedir); muroRO.observe(m); }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(pedir);
    }

    /* ── Ficha ── */
    var capa = null, devolverFoco = null;
    function ordenFicha() {
      if (f.v === 'fichero') return asc.filter(coincide);
      return visibles();
    }
    function abrirFicha(id, origen) {
      var r = porId[id]; if (!r) return;
      fichaAbierta = id; actualizarURL();
      if (!capa) {
        devolverFoco = origen || document.activeElement;
        capa = document.createElement('div');
        capa.className = 'rf-ficha ' + clasesForma;
        capa.innerHTML = '<div class="rf-ficha__fondo" data-cerrar></div><article class="rf-ficha__hoja" role="dialog" aria-modal="true" aria-labelledby="rf-ficha-titulo" tabindex="-1"></article>';
        document.body.appendChild(capa);
        document.documentElement.classList.add('con-ficha');
        capa.addEventListener('click', clicFicha);
        requestAnimationFrame(function () { if (capa) capa.classList.add('abierta'); });
      }
      var hoja = capa.querySelector('.rf-ficha__hoja'), l = ordenFicha(), i = l.indexOf(r);
      var meta = [r.autor, r.fuente, r.anio].filter(Boolean).join(' · ');
      var enlace = /^https?:/i.test(r.url || '') ? r.url : '';
      var u = RA.urlImagen(r.imagen);
      hoja.setAttribute('style', vars(r));
      hoja.innerHTML = '<header class="rf-ficha__cab"><span class="antetitulo"><i style="background:' + esc(r._ctipo) + '"></i>' + esc(r._tipo.nombre || 'Referente') + '</span>' +
          (conNumero && r.numero != null ? '<span class="rf-ficha__num">nº ' + r.numero + '</span>' : '') +
          (r.destacado ? '<span class="rf-ficha__dest">Destacado</span>' : '') +
          '<span class="rf-ficha__nav"><button type="button" data-paso="-1" aria-label="Anterior"' + (i > 0 ? '' : ' disabled') + '>‹</button>' +
          '<button type="button" data-paso="1" aria-label="Siguiente"' + (i >= 0 && i < l.length - 1 ? '' : ' disabled') + '>›</button>' +
          '<button type="button" data-cerrar aria-label="Cerrar la ficha">×</button></span></header>' +
        '<div class="rf-ficha__cuerpo">' +
          (u ? '<img class="rf-ficha__img" src="' + esc(u) + '" alt="">' : '') +
          '<h2 id="rf-ficha-titulo">' + esc(r.titulo || 'Sin título') + '</h2>' +
          (meta ? '<p class="rf-ficha__meta">' + esc(meta) + '</p>' : '') +
          // Etiquetas: a la vista, arriba del texto; cada una con su color y un clic para ver las demás fichas que la llevan
          '<div class="rf-ficha__etq"><span class="rf-ficha__lbl">' + (r._etq.length === 1 ? 'Etiqueta' : 'Etiquetas') + '</span>' +
            (r._etq.length ? r._etq.map(function (t) {
              return '<button type="button" data-ficha-etq="' + esc(t.id) + '" title="Ver las ' + (conteoEtq[t.id] || 0) + ' fichas con esta etiqueta"><i style="background:' + esc(colorEtq[t.id]) + '"></i>' + esc(t.nombre) + ' <span>' + (conteoEtq[t.id] || 0) + '</span></button>';
            }).join('') : '<span class="rf-ficha__sin">Sin etiquetas</span>') + '</div>' +
          String(r.cuerpo || '').split(/\n{1,}/).filter(function (p) { return p.trim(); }).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +

          ((citasDe[r.id] || []).length ? '<p class="rf-ficha__citas">Citado en ' + citasDe[r.id].map(function (x) {
            return '<a href="#/leer/' + encodeURIComponent(x.slug) + '" style="--c:' + RA.colorCuaderno(x, S.tema) + '">' + esc(RA.antetitulo(x)) + ' · ' + esc(x.titulo) + '</a>';
          }).join('') + '</p>' : '') +
          (enlace ? '<p><a class="boton rf-ficha__ir" href="' + esc(enlace) + '" target="_blank" rel="noopener">Abrir el enlace ↗</a></p>' : '') +
        '</div>';
      hoja.scrollTop = 0;
      var cerrar = hoja.querySelector('[data-cerrar]');
      if (cerrar) cerrar.focus({ preventScroll: true });
      if (fichero) fichero.marcar(id);
    }
    function cerrarFicha() {
      if (!capa) return;
      var c = capa; capa = null; fichaAbierta = null;
      c.classList.remove('abierta');
      document.documentElement.classList.remove('con-ficha');
      setTimeout(function () { c.remove(); }, 220);
      actualizarURL();
      if (fichero) fichero.marcar(null);
      if (devolverFoco && devolverFoco.focus && document.contains(devolverFoco)) devolverFoco.focus({ preventScroll: true });
    }
    function clicFicha(ev) {
      if (ev.target.closest('[data-cerrar]')) { cerrarFicha(); return; }
      var p = ev.target.closest('[data-paso]');
      if (p) { pasoFicha(+p.getAttribute('data-paso')); return; }
      var t = ev.target.closest('[data-ficha-etq]');
      if (t) { f.etq = t.getAttribute('data-ficha-etq'); cerrarFicha(); sincronizarControles(); cambio(true); return; }
      if (ev.target.closest('.rf-ficha__citas a')) cerrarFicha();
    }
    function pasoFicha(d) {
      var l = ordenFicha(), i = l.indexOf(porId[fichaAbierta]), r = l[i + d];
      if (!r) return;
      abrirFicha(r.id);
      if (fichero) fichero.ir(r.id, true);
    }
    function teclas(ev) {
      if (!capa) return;
      if (ev.key === 'Escape') { ev.preventDefault(); cerrarFicha(); return; }
      if (ev.key === 'ArrowLeft' && !/input|textarea/i.test(ev.target.tagName)) { ev.preventDefault(); pasoFicha(-1); return; }
      if (ev.key === 'ArrowRight' && !/input|textarea/i.test(ev.target.tagName)) { ev.preventDefault(); pasoFicha(1); return; }
      if (ev.key === 'Tab') {   // el foco se queda dentro de la ficha
        var foc = capa.querySelectorAll('button:not([disabled]), a[href]'); if (!foc.length) return;
        var a = foc[0], z = foc[foc.length - 1];
        if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
        else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
      }
    }
    document.addEventListener('keydown', teclas);
    limpiezas.push(function () { document.removeEventListener('keydown', teclas); if (capa) { capa.remove(); capa = null; document.documentElement.classList.remove('con-ficha'); } });

    /* ── Controles ── */
    function sincronizarControles() {
      raiz.querySelectorAll('[data-tipo]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-tipo') === f.tipo); });
      raiz.querySelectorAll('[data-etq]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-etq') === f.etq); });
      raiz.querySelectorAll('[data-vista]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-vista') === f.v); });
      var sel = raiz.querySelector('.rf-cuaderno select'); if (sel) sel.value = f.cuaderno;
      var bus = raiz.querySelector('.rf-buscar input'); if (bus && bus.value !== f.q) bus.value = f.q;
    }
    function cambio(filtros) {
      actualizarURL(); pintarSub(); pintarEstado();
      if (f.v === 'fichero' && fichero) { fichero.filtrar(filtros); return; }
      pintarZona();
    }
    raiz.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tipo],[data-etq],[data-vista],[data-limpiar],[data-orden]');
      if (b) {
        if (b.hasAttribute('data-tipo')) f.tipo = b.getAttribute('data-tipo');
        else if (b.hasAttribute('data-etq')) { var id = b.getAttribute('data-etq'); f.etq = f.etq === id ? '' : id; }
        else if (b.hasAttribute('data-limpiar')) { f.q = ''; f.tipo = ''; f.etq = ''; f.cuaderno = ''; }
        else if (b.hasAttribute('data-orden')) f.orden = f.orden === 'antiguos' ? 'recientes' : 'antiguos';
        else {
          var v = b.getAttribute('data-vista'); if (v === f.v) return;
          f.v = v; if (!ctx.prevista) sesion('vista-referentes', v);
          sincronizarControles(); actualizarURL(); pintarEstado(); pintarZona();
          if (v === 'fichero') {   // que el fichero quede a la vista
            var y = zona.getBoundingClientRect().top;
            if (y > window.innerHeight * .55) window.scrollBy({ top: y - 70, behavior: 'smooth' });
          }
          return;
        }
        sincronizarControles(); cambio(true);
        return;
      }
      var card = ev.target.closest('[data-ref]');
      if (card && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && ev.button === 0) { ev.preventDefault(); abrirFicha(card.getAttribute('data-ref'), card); }
    });
    var bus = raiz.querySelector('.rf-buscar input'), tBus = null;
    if (bus) bus.addEventListener('input', function () {
      var v = bus.value; clearTimeout(tBus);
      tBus = setTimeout(function () { f.q = v.trim(); cambio(true); }, 160);
    });
    if (bus) bus.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      ev.preventDefault(); clearTimeout(tBus);
      var v = bus.value.trim();
      if (v !== f.q) { f.q = v; cambio(true); }           // búsqueda nueva: el fichero va a la primera coincidencia
      else if (fichero) fichero.siguiente();             // la misma: Enter pasa a la siguiente
    });
    var sel = raiz.querySelector('.rf-cuaderno select');
    if (sel) sel.onchange = function () { f.cuaderno = this.value; cambio(true); };

    pintarSub(); pintarEstado(); pintarZona();
    actualizarURL();
    if (ctx.refId) {
      if (porId[ctx.refId]) { if (fichero) fichero.ir(ctx.refId, false); abrirFicha(ctx.refId); }
      else raiz.querySelector('.rf-sub').innerHTML = 'Este referente no está disponible · <a href="#/referentes">ver todos</a>';
    }
    return function () {
      if (fichero) fichero.destruir();
      if (muroRO) muroRO.disconnect();
      limpiezas.forEach(function (fn) { fn(); });
    };
  };

  /* ════════════════════════════════════════════════════════════════════
     FICHERO
     Una fila de cuadritos: cada ficha tiene su número; entre número y
     número, cuadritos en blanco (con la cruz de registro) que dan el ritmo.
     Las cards cuelgan de su número en zigzag, arriba o abajo según dónde
     quepan. Una destacada ocupa más cinta: después de ella vienen más blancos.
     En el computador corre de izquierda a derecha; en el celular, hacia abajo.
     ════════════════════════════════════════════════════════════════════ */
  var M = {
    celda: 22, hueco: 4,            // cuadritos de 22 px con 4 px entre ellos
    porTramo: 4,                    // un número y tres en blanco
    escritorio: { largo: 184, largoD: 392, alto: 236, altoD: 296, tallo: 30, aire: 24 },
    movil: { largo: 184, largoD: 392, tallo: 12, aire: 24 }
  };
  M.paso = M.celda + M.hueco; M.tramo = M.paso * M.porTramo;

  function esMovil() { return window.matchMedia && window.matchMedia('(max-width: 720px)').matches; }

  /* Reparte las fichas: devuelve [{r, tramo, lado, ini, largo}] y el número de tramos */
  function repartir(items, largo, largoD, aire) {
    var fin = [0, 0], ultimo = 1, k = 0, l = [];
    items.forEach(function (r) {
      var L = r.destacado ? largoD : largo;
      for (;; k++) {
        var x = k * M.tramo, libres = [0, 1].filter(function (s) { return fin[s] <= x; });
        if (!libres.length) continue;
        var lado = libres.length === 2 ? 1 - ultimo : libres[0];
        l.push({ r: r, tramo: k, lado: lado, ini: x, largo: L });
        fin[lado] = x + L + aire; ultimo = lado; k++;
        break;
      }
    });
    var tramos = Math.max(k, Math.ceil((Math.max(fin[0], fin[1]) - aire) / M.tramo)) + 1;
    return { fichas: l, tramos: tramos };
  }

  function crearFichero(zona, items, op) {
    var movil = esMovil(), cont, lienzo, mapa, ventana, barra, rep, porId = {}, nodos = {}, celdas = {}, bloques = {}, marcada = null;
    var conNum = op.conNumero;

    function construir() {
      movil = esMovil();
      var D = movil ? M.movil : M.escritorio;
      rep = repartir(items, D.largo, D.largoD, D.aire);
      var nCeldas = rep.tramos * M.porTramo, largoTotal = nCeldas * M.paso;
      var deTramo = {}; rep.fichas.forEach(function (x) { deTramo[x.tramo] = x; porId[x.r.id] = x; });

      // Barra: ir al número, extremos y coincidencias
      var h = '<div class="ff-barra">' +
        (conNum ? '<form class="ff-ir"><label>Ir al nº <input type="number" min="1" inputmode="numeric" aria-label="Número de ficha"></label><button type="submit">Ir</button></form>' : '') +
        '<span class="ff-coinc" aria-live="polite"></span>' +
        '<span class="ff-extremos"><button type="button" data-extremo="0">' + (movil ? '↑' : '←') + ' Lo más antiguo</button><button type="button" data-extremo="1">Lo más reciente ' + (movil ? '↓' : '→') + '</button></span></div>';

      // Celdas
      var c = '';
      for (var t = 0; t < rep.tramos; t++) {
        var x = deTramo[t];
        for (var j = 0; j < M.porTramo; j++) {
          if (x && j === 0) {
            c += '<span class="ff-c ff-c--n' + (x.r.destacado ? ' ff-c--d' : '') + '" data-c="' + esc(x.r.id) + '" style="--c:' + esc(x.r._g) + ';--ct:' + esc(x.r._ct) + '">' + (conNum && x.r.numero != null ? x.r.numero : '') + '</span>';
            if (x.r.destacado) j++;   // el cuadrito doble ocupa dos lugares
          } else c += '<span class="ff-c" aria-hidden="true"></span>';
        }
      }
      // Fichas
      var f = '', lineaPos, lado0, lado1;
      if (!movil) {
        var alto = D.altoD + D.tallo;   // carril de arriba: cabe una destacada
        lineaPos = alto;
        rep.fichas.forEach(function (x) {
          var al = x.r.destacado ? D.altoD : D.alto, arriba = x.lado === 0;
          var top = arriba ? lineaPos - D.tallo - al : lineaPos + M.celda + D.tallo;
          f += ficha(x, 'left:' + x.ini + 'px;top:' + top + 'px;width:' + x.largo + 'px;height:' + al + 'px') +
            '<i class="ff-tallo' + (x.r.destacado ? ' ff-tallo--d' : '') + '" data-t="' + esc(x.r.id) + '" style="left:' + (x.ini + M.celda / 2 - 1) + 'px;top:' + (arriba ? lineaPos - D.tallo : lineaPos + M.celda) + 'px;height:' + D.tallo + 'px"></i>';
        });
        lienzo = '<div class="ff-lienzo" style="width:' + (largoTotal + 40) + 'px;height:' + (lineaPos * 2 + M.celda) + 'px">' +
          '<div class="ff-linea" style="top:' + lineaPos + 'px">' + c + '</div>' + f + '</div>';
      } else {
        rep.fichas.forEach(function (x) {
          var izq = x.lado === 0;
          f += ficha(x, 'top:' + x.ini + 'px;height:' + x.largo + 'px;' + (izq ? 'right:calc(50% + ' + (M.celda / 2 + D.tallo) + 'px)' : 'left:calc(50% + ' + (M.celda / 2 + D.tallo) + 'px)')) +
            '<i class="ff-tallo ff-tallo--h' + (x.r.destacado ? ' ff-tallo--d' : '') + '" data-t="' + esc(x.r.id) + '" style="top:' + (x.ini + M.celda / 2 - 1) + 'px;width:' + D.tallo + 'px;' +
              (izq ? 'right:calc(50% + ' + (M.celda / 2) + 'px)' : 'left:calc(50% + ' + (M.celda / 2) + 'px)') + '"></i>';
        });
        lienzo = '<div class="ff-lienzo ff-lienzo--v" style="height:' + (largoTotal + 20) + 'px"><div class="ff-linea ff-linea--v">' + c + '</div>' + f + '</div>';
      }
      // Fichero completo en miniatura (computador)
      var m = movil ? '' : '<div class="ff-mapa" role="slider" tabindex="0" aria-label="Fichero completo" aria-valuemin="1" aria-valuemax="' + items.length + '" aria-valuenow="1">' +
        '<div class="ff-mapa__fila">' + items.map(function (r) {
          return '<i data-m="' + esc(r.id) + '" class="' + (r.destacado ? 'd' : '') + '" style="--c:' + esc(r._g) + '"></i>';
        }).join('') + '</div><span class="ff-mapa__ventana"></span></div>';

      zona.innerHTML = h + '<div class="ff' + (movil ? ' ff--v' : '') + '" tabindex="0" aria-label="Fichero de referentes, de lo más antiguo a lo más reciente">' + lienzo + '</div>' + m;
      cont = zona.querySelector('.ff'); mapa = zona.querySelector('.ff-mapa'); ventana = zona.querySelector('.ff-mapa__ventana'); barra = zona.querySelector('.ff-barra');
      nodos = {}; celdas = {}; bloques = {};
      zona.querySelectorAll('[data-ref]').forEach(function (n) { nodos[n.getAttribute('data-ref')] = n; });
      zona.querySelectorAll('[data-c]').forEach(function (n) { celdas[n.getAttribute('data-c')] = n; });
      zona.querySelectorAll('[data-t]').forEach(function (n) { (nodos[n.getAttribute('data-t')] || {}).tallo = n; });
      zona.querySelectorAll('[data-m]').forEach(function (n) { bloques[n.getAttribute('data-m')] = n; });
      enlazar();
      filtrar(false);
      if (marcada) marcar(marcada);
    }

    function ficha(x, estilo) {
      var r = x.r, u = RA.urlImagen(r.imagen), meta = [r.autor, r.fuente].filter(Boolean).join(' · ');
      return '<a class="ff-ficha' + (r.destacado ? ' ff-ficha--d' : '') + (u ? '' : ' ff-ficha--sin') + (x.lado === 0 ? ' ff-ficha--a' : ' ff-ficha--b') + '" href="#/referentes/r/' + encodeURIComponent(r.id) + '" data-ref="' + esc(r.id) + '" style="' + estilo + ';' + op.vars(r) + '">' +
        (u ? '<span class="ff-ficha__img"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></span>' : '') +
        '<span class="ff-ficha__cuerpo"><span class="ff-ficha__cab"><span class="antetitulo"><i style="background:' + esc(r._ctipo) + '"></i>' + esc(r._tipo.nombre) + '</span>' +
          (conNum && r.numero != null ? '<span class="rf-num">nº ' + r.numero + '</span>' : '') + '</span>' +
        '<span class="ff-ficha__titulo">' + esc(r.titulo || 'Sin título') + '</span>' +
        (u ? '' : (r.cuerpo ? '<span class="ff-ficha__texto">' + esc(recorte(r.cuerpo, r.destacado ? 360 : 200)) + '</span>' : '')) +
        (meta ? '<span class="ff-ficha__meta">' + esc(meta) + '</span>' : '') + '</span></a>';
    }

    /* Coincidencias: lo que no coincide se apaga en su sitio */
    var lista = [], cursor = -1;
    function filtrar(desplazar) {
      var algun = false; lista = [];
      items.forEach(function (r) {
        var si = op.coincide(r);
        if (si) lista.push(r); else algun = true;
        var n = nodos[r.id]; if (n) { n.classList.toggle('apagada', !si); if (n.tallo) n.tallo.classList.toggle('apagada', !si); }
        if (celdas[r.id]) celdas[r.id].classList.toggle('apagada', !si);
        if (bloques[r.id]) bloques[r.id].classList.toggle('apagada', !si);
      });
      var co = zona.querySelector('.ff-coinc');
      cursor = -1;
      if (co) co.innerHTML = algun ? (lista.length ? lista.length + (lista.length === 1 ? ' coincide' : ' coinciden') +
        ' <button type="button" data-salto="-1" aria-label="Coincidencia anterior">‹</button><button type="button" data-salto="1" aria-label="Coincidencia siguiente">›</button>' : 'Nada coincide') : '';
      if (desplazar && algun && lista.length) siguiente();
    }
    function siguiente(d) {
      if (!lista.length) return;
      cursor = (cursor + (d || 1) + lista.length) % lista.length;
      ir(lista[cursor].id, true);
    }

    function posicion(id) { var x = porId[id]; return x ? x.ini : 0; }
    function ir(id, suave) {
      var x = porId[id]; if (!x) return;
      if (!movil) {
        cont.scrollTo({ left: Math.max(0, x.ini + x.largo / 2 - cont.clientWidth / 2), behavior: suave ? 'smooth' : 'auto' });
      } else {
        var y = cont.getBoundingClientRect().top + window.scrollY + x.ini + x.largo / 2 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, y), behavior: suave ? 'smooth' : 'auto' });
      }
      var n = nodos[id]; if (n) { n.classList.remove('destello'); void n.offsetWidth; n.classList.add('destello'); }
    }
    function marcar(id) {
      if (marcada && nodos[marcada]) nodos[marcada].classList.remove('abierta');
      marcada = id;
      if (id && nodos[id]) nodos[id].classList.add('abierta');
    }

    /* Ventana del mapa */
    var raf = 0;
    function ventanaMapa() {
      raf = 0;
      if (!mapa || !items.length) return;
      var izq = cont.scrollLeft, der = izq + cont.clientWidth, a = -1, b = -1;
      rep.fichas.forEach(function (x, i) { if (x.ini + x.largo > izq && x.ini < der) { if (a < 0) a = i; b = i; } });
      if (a < 0) { a = 0; b = 0; }
      var fila = mapa.querySelector('.ff-mapa__fila'), w = fila.clientWidth, paso = w / items.length;
      ventana.style.left = (fila.offsetLeft + a * paso) + 'px';
      ventana.style.width = Math.max(6, (b - a + 1) * paso) + 'px';
      mapa.setAttribute('aria-valuenow', String(a + 1));
      mapa.setAttribute('aria-valuetext', (conNum && items[a].numero != null ? 'nº ' + items[a].numero + ' a ' + items[b].numero : (a + 1) + ' a ' + (b + 1)));
    }
    function pedirVentana() { if (!raf) raf = requestAnimationFrame(ventanaMapa); }

    function enlazar() {
      if (!movil) {
        cont.addEventListener('scroll', pedirVentana, { passive: true });
        // La rueda vertical recorre el fichero mientras haya cinta en esa dirección
        cont.addEventListener('wheel', function (ev) {
          if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX) || ev.ctrlKey) return;
          var max = cont.scrollWidth - cont.clientWidth;
          if ((ev.deltaY > 0 && cont.scrollLeft < max - 1) || (ev.deltaY < 0 && cont.scrollLeft > 0)) {
            ev.preventDefault(); cont.scrollLeft += ev.deltaY * (ev.deltaMode === 1 ? 32 : 1);
          }
        }, { passive: false });
        cont.addEventListener('keydown', function (ev) {
          var t = { ArrowRight: M.tramo * 2, ArrowLeft: -M.tramo * 2, PageDown: cont.clientWidth * .8, PageUp: -cont.clientWidth * .8 }[ev.key];
          if (t) { ev.preventDefault(); cont.scrollBy({ left: t, behavior: 'smooth' }); }
          if (ev.key === 'Home') { ev.preventDefault(); cont.scrollTo({ left: 0, behavior: 'smooth' }); }
          if (ev.key === 'End') { ev.preventDefault(); cont.scrollTo({ left: cont.scrollWidth, behavior: 'smooth' }); }
        });
        // Mapa: clic o arrastre para viajar
        var arrastrando = false;
        function aMapa(ev) {
          var fila = mapa.querySelector('.ff-mapa__fila'), r = fila.getBoundingClientRect();
          var i = Math.min(items.length - 1, Math.max(0, Math.floor((ev.clientX - r.left) / r.width * items.length)));
          var x = rep.fichas[i]; cont.scrollLeft = Math.max(0, x.ini + x.largo / 2 - cont.clientWidth / 2);
        }
        mapa.addEventListener('pointerdown', function (ev) { arrastrando = true; mapa.setPointerCapture(ev.pointerId); aMapa(ev); });
        mapa.addEventListener('pointermove', function (ev) { if (arrastrando) aMapa(ev); });
        mapa.addEventListener('pointerup', function () { arrastrando = false; });
        mapa.addEventListener('pointercancel', function () { arrastrando = false; });
        mapa.addEventListener('keydown', function (ev) {
          var d = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[ev.key]; if (!d) return;
          ev.preventDefault(); cont.scrollBy({ left: d * cont.clientWidth * .6, behavior: 'smooth' });
        });
        pedirVentana();
      }
      barra.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-extremo],[data-salto]'); if (!b) return;
        if (b.hasAttribute('data-salto')) { siguiente(+b.getAttribute('data-salto')); return; }
        var fin = b.getAttribute('data-extremo') === '1';
        if (!movil) cont.scrollTo({ left: fin ? cont.scrollWidth : 0, behavior: 'smooth' });
        else ir(items[fin ? items.length - 1 : 0].id, true);
      });
      var form = barra.querySelector('.ff-ir');
      if (form) form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = +form.querySelector('input').value; if (!n) return;
        var r = items.filter(function (x) { return x.numero === n; })[0];
        var aviso = barra.querySelector('.ff-coinc');
        if (!r) {   // número oculto o que no existe: se va al más cercano
          r = items.reduce(function (m, x) { return !m || Math.abs(x.numero - n) < Math.abs(m.numero - n) ? x : m; }, null);
          if (aviso && r) aviso.textContent = 'El nº ' + n + ' no está en el fichero; el más cercano es el ' + r.numero;
        }
        if (r) ir(r.id, true);
      });
    }

    var tRes = null;
    function alCambiarTamano() {
      clearTimeout(tRes);
      tRes = setTimeout(function () { if (esMovil() !== movil) { var guarda = marcada; zona.innerHTML = ''; construir(); if (guarda) ir(guarda, false); } else pedirVentana(); }, 150);
    }
    window.addEventListener('resize', alCambiarTamano);

    construir();
    return {
      filtrar: filtrar, siguiente: function () { siguiente(1); }, ir: ir, marcar: marcar, posicion: posicion,
      destruir: function () { window.removeEventListener('resize', alCambiarTamano); if (raf) cancelAnimationFrame(raf); }
    };
  }
  RA.referentes._repartir = repartir;   // para las pruebas
})();
