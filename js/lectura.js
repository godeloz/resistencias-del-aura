/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · instancia de lectura
   Rutas:  #/                inicio
           #/cuadernos       inicio, en el carrusel
           #/leer/<slug>     capítulo o apunte
           #/referentes      universo de referentes (por definir)
           #/entrar          acceso del autor (fase 3)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, G = RA.guardado;
  var LUGAR = 'Medellín';
  /* Dentro de la vista previa de Apariencia (administrador): recibe los cambios sin guardarlos */
  var PREVISTA = /[?&]prevista=1/.test(location.search) && window.parent !== window;

  var S = {
    sitio: null, tema: null, app: null, limpiar: null,
    ultimoSlug: G.leer('ultimo', null),   // último cuaderno abierto por este lector
    prefs: {
      tam: G.leer('tam', 1),            // 0, 1, 2
      tema: G.leer('tema', null),       // 'claro' | 'oscuro' | null (el del sitio)
      modo: G.leer('modo', null),       // 'scroll' | 'paginas' | null (el del sitio)
      reacciones: G.leer('verReacciones', true)   // ver los subrayados de otros lectores
    }
  };

  /* ── Arranque ─────────────────────────────────────────────────────── */
  function iniciar() {
    S.app = document.getElementById('app');
    aplicarTam();
    // Pinta enseguida con la última apariencia conocida, mientras llega la real
    var previa = G.leer('apariencia', null);
    if (previa) RA.aplicarTema(RA.calcularTema(previa, opcionesTema()));
    if (RA.datos.modo === 'sin-config') return pintarMensaje('Sitio sin configurar',
      'Falta la URL de Supabase y la llave pública en <code>config.js</code>.', false);
    RA.datos.cargarSitio().then(function (sitio) {
      S.sitio = sitio;
      if (RA.datos.modo !== 'demo' && !PREVISTA) G.escribir('apariencia', sitio.apariencia);
      S.porSlug = {};
      sitio.entradas.forEach(function (e) { S.porSlug[e.slug] = e; });
      S.porId = {};
      sitio.entradas.forEach(function (e) { S.porId[e.id] = e; });
      aplicarTema();
      window.addEventListener('hashchange', enrutar);
      if (PREVISTA) window.addEventListener('message', function (ev) {
        var d = ev.data || {};
        if (ev.source !== window.parent || d.tipo !== 'ra-prevista') return;
        if (d.apariencia) S.sitio.apariencia = RA.normalizarApariencia(d.apariencia);
        if (d.proyecto) Object.assign(S.sitio.proyecto, d.proyecto);
        var y = window.scrollY;
        aplicarTema(); enrutar();
        window.scrollTo(0, y);
      });
      enrutar();
    }).catch(function (err) {
      console.error(err);
      pintarMensaje('No se pudo cargar', 'Revisa tu conexión e inténtalo de nuevo.', true);
    });
  }

  function opcionesTema() {
    return { oscuro: S.prefs.tema === 'oscuro' ? true : (S.prefs.tema === 'claro' ? false : undefined) };
  }
  function aplicarTema() {
    S.tema = RA.calcularTema(S.sitio.apariencia, opcionesTema());
    RA.aplicarTema(S.tema);
  }
  function aplicarTam() {
    var r = document.documentElement;
    r.classList.toggle('sin-reacciones', !S.prefs.reacciones);
    r.classList.remove('tam-0', 'tam-1', 'tam-2');
    r.classList.add('tam-' + S.prefs.tam);
  }

  function enrutar() {
    if (S.limpiar) { S.limpiar(); S.limpiar = null; }
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    var partes = h.split('/');
    if (h === '' ) return pintarInicio(false);
    if (h === 'cuadernos') return pintarInicio(true);
    if (partes[0] === 'leer' && partes[1]) return pintarEntrada(partes[1]);
    if (partes[0] === 'vista' && partes[1]) return pintarEntrada(null, null, partes[1]);
    if (partes[0] === 'referentes') return pintarReferentes(partes[1] || '');
    if (h === 'entrar') { location.href = 'admin/index.html'; return; }
    pintarMensaje('No encontrado', 'Esa página no existe.', false, true);
  }

  function titulo(t) { document.title = t ? t + ' · ' + S.sitio.proyecto.titulo : S.sitio.proyecto.titulo; }
  function anio() {
    var f = S.sitio.entradas.map(function (e) { return e.publicado_en; }).filter(Boolean).sort().pop();
    return f ? new Date(f).getFullYear() : new Date().getFullYear();
  }
  function pie() {
    return '<footer class="pie"><span>' + esc(S.sitio.proyecto.titulo) + ' · ' + LUGAR + ', ' + anio() + '</span>' +
      '<a class="acceso" href="#/entrar" aria-label="Acceso del autor"></a></footer>';
  }

  /* El título va en dos líneas: «Resistencias / del aura» */
  function tituloEnLineas(t) {
    var p = String(t).trim().split(/\s+/);
    if (p.length < 2) return esc(t);
    var corte = 1;
    if (p[0].length < 7) {
      var mitad = t.length / 2, acum = 0;
      for (var i = 0; i < p.length - 1; i++) { acum += p[i].length + 1; if (acum >= mitad) { corte = i + 1; break; } }
    }
    return esc(p.slice(0, corte).join(' ')) + '<br>' + esc(p.slice(corte).join(' '));
  }

  /* ── Mensajes (vacío, error, por construir) ──────────────────────── */
  function pintarMensaje(t, html, reintentar, volver) {
    if (S.sitio) titulo(t); else document.title = t;
    S.app.innerHTML = '<main class="mensaje"><h1>' + esc(t) + '</h1><p>' + html + '</p>' +
      (reintentar ? '<button class="boton" type="button" data-reintentar>Reintentar</button>' : '') +
      (volver ? '<a class="boton" href="#/">Volver al inicio</a>' : '') + '</main>';
    var b = S.app.querySelector('[data-reintentar]');
    if (b) b.onclick = function () { location.reload(); };
    window.scrollTo(0, 0);
  }

  /* ══ INICIO ═══════════════════════════════════════════════════════ */
  function pintarInicio(alCarrusel) {
    var sitio = S.sitio, a = sitio.apariencia, ents = sitio.entradas, t = S.tema;
    titulo(null);
    var deco = '';
    if (a.decoracion_inicio === 'patron') deco = '<span class="deco deco-patron pat p-puntos"></span>';
    if (a.decoracion_inicio === 'formas') deco = '<span class="deco deco-forma deco-forma--a"></span><span class="deco deco-forma deco-forma--b"></span>';
    var anillos = '';
    if (a.decoracion_inicio === 'aura') {
      for (var k = 0; k < 4; k++) anillos += '<span class="anillo" aria-hidden="true" style="border-color:' + t.pal.cuadernos[k] + ';animation-delay:' + (-k * 1.75) + 's"></span>';
    }
    var primero = ents.filter(function (e) { return e.tipo === 'capitulo'; })[0] || ents[0];
    var tituloHTML = tituloEnLineas(sitio.proyecto.titulo);

    S.app.innerHTML =
      '<div class="pag-inicio">' + deco +
        cabeceraSitio('') +
        '<section class="heroe">' + anillos +
          '<div class="registro"><h1 class="registro__a">' + tituloHTML + '</h1>' +
          '<span class="registro__b" aria-hidden="true">' + tituloHTML + '</span></div>' +
          '<p class="firma">' + esc(sitio.proyecto.autor) + (sitio.proyecto.autor ? ' · ' : '') + 'investigación por entregas · ' + anio() + '</p>' +
        '</section>' +
        '<section class="intro">' + (sitio.proyecto.introduccion ? '<p>' + esc(sitio.proyecto.introduccion) + '</p>' : '') +
          (primero ? '<a class="boton" href="#/leer/' + encodeURIComponent(primero.slug) + '">Empezar por ' +
            (primero.tipo === 'capitulo' ? 'el Día ' + primero.numero : 'el principio') + '</a>' : '') +
        '</section>' +
        '<section class="cuadernos" id="cuadernos" aria-label="Cuadernos">' +
          (ents.length ? '' : '<p class="vacio">Pronto, el primer cuaderno.</p>') +
        '</section>' +
        pie() +
      '</div>';

    if (ents.length) {
      var cont = S.app.querySelector('#cuadernos');
      if (a.carrusel === 'recto') montarRecto(cont, ents, alCarrusel);
      else montarAbanico(cont, ents, alCarrusel);
    }
    if (alCarrusel) {
      var c = S.app.querySelector('#cuadernos');
      requestAnimationFrame(function () { c.scrollIntoView({ behavior: RA.reduceMovimiento() ? 'auto' : 'smooth', block: 'start' }); });
    } else window.scrollTo(0, 0);
  }

  /* Cuaderno inicial del carrusel: el último que abrió este lector o, si es su primera visita, el más reciente */
  function indiceInicial(ents, alCarrusel) {
    if (S.ultimoSlug) {
      for (var i = 0; i < ents.length; i++) if (ents[i].slug === S.ultimoSlug) return i;
    }
    var mejor = 0;
    ents.forEach(function (e, i) { if ((e.publicado_en || '') > (ents[mejor].publicado_en || '')) mejor = i; });
    return mejor;
  }

  function controlesHTML() {
    return '<div class="controles"><button type="button" class="ant" aria-label="Cuaderno anterior">←</button>' +
      '<span class="contador" aria-live="polite"></span>' +
      '<button type="button" class="sig lleno" aria-label="Cuaderno siguiente">→</button></div>' +
      '<p class="pista">← desliza entre cuadernos →</p>';
  }
  function textoContador(ents, c) {
    return RA.antetitulo(ents[c]) + ' · ' + (c + 1) + ' de ' + ents.length;
  }

  function montarAbanico(cont, ents, alCarrusel) {
    var c = indiceInicial(ents, alCarrusel);
    cont.innerHTML = '<div class="abanico" role="group" aria-roledescription="carrusel">' +
      ents.map(function (e, i) { return RA.htmlCuaderno(e, S.tema, 'en-abanico', 'data-i="' + i + '" draggable="false"'); }).join('') +
      '</div>' + controlesHTML();
    var caja = cont.querySelector('.abanico');
    var tarjetas = [].slice.call(caja.querySelectorAll('.cuaderno'));
    var cont_ = cont.querySelector('.contador'), ant = cont.querySelector('.ant'), sig = cont.querySelector('.sig');

    function posicionar() {
      var movil = RA.esMovil(), ancho = caja.clientWidth;
      var x1 = movil ? ancho * 0.49 : 300, x2 = movil ? ancho * 1.05 : 560;
      var frente = movil ? 1 : 1.08;
      tarjetas.forEach(function (el, i) {
        var off = i - c, tf, z, op;
        if (off === 0) { tf = 'translate(-50%,-50%) scale(' + frente + ')'; z = 5; op = 1; }
        else if (Math.abs(off) === 1) { tf = 'translate(-50%,-50%) translateX(' + (off * x1) + 'px) scale(.86) rotate(' + (off * 2) + 'deg)'; z = 2; op = movil ? .75 : .92; }
        else if (Math.abs(off) === 2) { tf = 'translate(-50%,-50%) translateX(' + (off / 2 * x2) + 'px) scale(.72) rotate(' + (off * 2) + 'deg)'; z = 1; op = movil ? 0 : .55; }
        else { tf = 'translate(-50%,-50%) translateX(' + (Math.sign(off) * x2) + 'px) scale(.5)'; z = 0; op = 0; }
        el.style.transform = tf; el.style.zIndex = z; el.style.opacity = op;
        el.style.pointerEvents = op === 0 ? 'none' : 'auto';
        el.setAttribute('tabindex', off === 0 ? '0' : '-1');
        el.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      });
      cont_.textContent = textoContador(ents, c);
      ant.disabled = c === 0; sig.disabled = c === ents.length - 1;
    }
    function ir(n) { c = Math.max(0, Math.min(ents.length - 1, n)); posicionar(); }

    ant.onclick = function () { ir(c - 1); };
    sig.onclick = function () { ir(c + 1); };
    var arrastre = null, hubo = false;
    caja.addEventListener('pointerdown', function (ev) { arrastre = { x: ev.clientX, y: ev.clientY }; hubo = false; });
    caja.addEventListener('pointerup', function (ev) {
      if (!arrastre) return;
      var dx = ev.clientX - arrastre.x, dy = ev.clientY - arrastre.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { hubo = true; ir(c + (dx < 0 ? 1 : -1)); }
      arrastre = null;
    });
    caja.addEventListener('click', function (ev) {
      var a = ev.target.closest('.cuaderno');
      if (!a) return;
      var i = +a.getAttribute('data-i');
      if (hubo || i !== c) { ev.preventDefault(); if (!hubo) ir(i); }
      hubo = false;
    });
    caja.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(c - 1); tarjetas[c].focus(); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(c + 1); tarjetas[c].focus(); }
    });
    var alRedimensionar = function () { posicionar(); };
    window.addEventListener('resize', alRedimensionar);
    S.limpiar = function () { window.removeEventListener('resize', alRedimensionar); };
    posicionar();
  }

  function montarRecto(cont, ents, alCarrusel) {
    var c0 = indiceInicial(ents, alCarrusel);
    cont.innerHTML = '<div class="riel">' + ents.map(function (e, i) {
      return RA.htmlCuaderno(e, S.tema, '', 'data-i="' + i + '"');
    }).join('') + '</div>' + controlesHTML();
    var riel = cont.querySelector('.riel'), tarjetas = [].slice.call(riel.children);
    var cont_ = cont.querySelector('.contador'), ant = cont.querySelector('.ant'), sig = cont.querySelector('.sig');
    function actual() {
      var izq = riel.getBoundingClientRect().left + parseFloat(getComputedStyle(riel).paddingLeft), mejor = 0, d = 1e9;
      tarjetas.forEach(function (t, i) { var x = Math.abs(t.getBoundingClientRect().left - izq); if (x < d) { d = x; mejor = i; } });
      return mejor;
    }
    function refrescar() {
      var c = actual();
      cont_.textContent = textoContador(ents, c);
      ant.disabled = riel.scrollLeft <= 2;
      sig.disabled = riel.scrollLeft >= riel.scrollWidth - riel.clientWidth - 2;
    }
    function ir(i) {
      i = Math.max(0, Math.min(ents.length - 1, i));
      riel.scrollTo({ left: tarjetas[i].offsetLeft - tarjetas[0].offsetLeft, behavior: RA.reduceMovimiento() ? 'auto' : 'smooth' });
    }
    ant.onclick = function () { ir(actual() - 1); };
    sig.onclick = function () { ir(actual() + 1); };
    var t = null;
    riel.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(refrescar, 60); });
    riel.scrollLeft = tarjetas[c0].offsetLeft - tarjetas[0].offsetLeft;
    refrescar();
  }

  /* ══ REFERENTES ═══════════════════════════════════════════════════ */
  function cabeceraSitio(activa) {
    return '<header class="cabecera"><a class="logo" href="#/" aria-label="Inicio"><span class="logo__a"></span><span class="logo__b"></span></a>' +
      '<nav aria-label="Principal"><a href="#/cuadernos"' + (activa === 'cuadernos' ? ' aria-current="page"' : '') + '>Cuadernos</a>' +
      '<a href="#/referentes"' + (activa === 'referentes' ? ' aria-current="page"' : '') + '>Referentes</a></nav></header>';
  }
  function pintarReferentes(slugFiltro) {
    titulo('Referentes');
    S.app.innerHTML = '<div class="pag-referentes">' + cabeceraSitio('referentes') + '<div class="cargando"></div></div>';
    window.scrollTo(0, 0);
    RA.datos.cargarReferentes().then(function (U) {
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
      var refs = U.referentes;
      refs.forEach(function (r) { (etqDe[r.id] || []).forEach(function (id) { conteoEtq[id] = (conteoEtq[id] || 0) + 1; }); });
      var conteoTipo = {}; refs.forEach(function (r) { conteoTipo[r.tipo_id] = (conteoTipo[r.tipo_id] || 0) + 1; });
      var f = { tipo: '', etq: '', cuaderno: S.porSlug[slugFiltro] ? slugFiltro : '' };
      var cuadernosConCitas = S.sitio.entradas.filter(function (e) { return refsDe[e.slug]; });
      var topEtq = Object.keys(conteoEtq).sort(function (a, b) { return conteoEtq[b] - conteoEtq[a]; }).slice(0, 18);
      var raiz = S.app.querySelector('.pag-referentes');
      var tit = tituloEnLineas('Referentes');
      raiz.innerHTML = cabeceraSitio('referentes') +
        '<section class="rf-heroe"><div class="registro"><h1 class="registro__a">' + tit + '</h1><span class="registro__b" aria-hidden="true">' + tit + '</span></div>' +
        '<p class="rf-sub"></p></section>' +
        (refs.length ? '<div class="rf-controles">' +
          '<div class="rf-chips" role="group" aria-label="Tipo"><button type="button" data-tipo="" aria-pressed="true">Todos <span>' + refs.length + '</span></button>' +
            U.tipos.filter(function (t) { return conteoTipo[t.id]; }).map(function (t) {
              return '<button type="button" data-tipo="' + esc(t.id) + '" aria-pressed="false"><i style="background:' + esc(t.color) + '"></i>' + esc(t.nombre) + ' <span>' + conteoTipo[t.id] + '</span></button>';
            }).join('') + '</div>' +
          (cuadernosConCitas.length ? '<label class="rf-cuaderno">Citados en <select><option value="">todos los cuadernos</option>' + cuadernosConCitas.map(function (e) {
            return '<option value="' + esc(e.slug) + '"' + (e.slug === f.cuaderno ? ' selected' : '') + '>' + esc(RA.antetitulo(e) + ' · ' + e.titulo) + '</option>';
          }).join('') + '</select></label>' : '') +
          (topEtq.length ? '<div class="rf-etiquetas" role="group" aria-label="Etiquetas">' + topEtq.map(function (id) {
            return '<button type="button" data-etq="' + esc(id) + '" aria-pressed="false">#' + esc(etq[id].nombre) + '</button>';
          }).join('') + '</div>' : '') + '</div>' : '') +
        '<div class="rf-muro" aria-live="polite"></div>' + pie();
      function pintarMuro() {
        var l = refs.filter(function (r) {
          if (f.tipo && r.tipo_id !== f.tipo) return false;
          if (f.etq && (etqDe[r.id] || []).indexOf(f.etq) < 0) return false;
          if (f.cuaderno && !(refsDe[f.cuaderno] || {})[r.id]) return false;
          return true;
        });
        var e = S.porSlug[f.cuaderno];
        raiz.querySelector('.rf-sub').textContent = !refs.length ? 'Muy pronto, las lecturas, imágenes y datos que acompañan la investigación.'
          : e ? l.length + (l.length === 1 ? ' referente citado' : ' referentes citados') + ' en ' + RA.antetitulo(e) + ': «' + e.titulo + '»'
          : l.length + (l.length === 1 ? ' lectura, imagen, dato o enlace' : ' lecturas, imágenes, datos y enlaces') + ' que acompañan la investigación';
        raiz.querySelector('.rf-muro').innerHTML = l.map(function (r) {
          var t = tipos[r.tipo_id] || { color: 'var(--tA)', nombre: '' }, img = RA.urlImagen(r.imagen);
          var cuerpo = String(r.cuerpo || ''); if (cuerpo.length > 320) cuerpo = cuerpo.slice(0, 318).replace(/\s+\S*$/, '') + '…';
          var meta = [r.autor, r.fuente, r.anio].filter(Boolean).join(' · ');
          var enlace = /^https?:/i.test(r.url || '') ? r.url : '';
          return '<article class="rf-card" style="--rf:' + esc(t.color) + '">' +
            (img ? '<img class="rf-card__img" src="' + esc(img) + '" alt="" loading="lazy"' + (r.imagen_w && r.imagen_h ? ' width="' + r.imagen_w + '" height="' + r.imagen_h + '"' : '') + '>' : '') +
            '<div class="rf-card__cuerpo"><span class="antetitulo"><i style="background:' + esc(t.color) + '"></i>' + esc(t.nombre) + '</span>' +
            '<h2 class="rf-card__titulo">' + (enlace ? '<a href="' + esc(enlace) + '" target="_blank" rel="noopener">' + esc(r.titulo || 'Sin título') + ' <span aria-hidden="true">↗</span></a>' : esc(r.titulo || 'Sin título')) + '</h2>' +
            (meta ? '<p class="rf-card__meta">' + esc(meta) + '</p>' : '') +
            (cuerpo ? '<p class="rf-card__texto">' + esc(cuerpo) + '</p>' : '') +
            ((etqDe[r.id] || []).length ? '<p class="rf-card__etq">' + etqDe[r.id].map(function (id) { return '#' + esc(etq[id].nombre); }).join(' ') + '</p>' : '') +
            ((citasDe[r.id] || []).length ? '<p class="rf-card__citas">En ' + citasDe[r.id].map(function (x) {
              return '<a href="#/leer/' + encodeURIComponent(x.slug) + '" style="--c:' + RA.colorCuaderno(x, S.tema) + '">' + esc(RA.antetitulo(x)) + '</a>';
            }).join(' ') + '</p>' : '') + '</div></article>';
        }).join('') || (refs.length ? '<p class="vacio">Nada coincide con este filtro.</p>' : '');
      }
      raiz.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-tipo],[data-etq]'); if (!b) return;
        if (b.hasAttribute('data-tipo')) {
          f.tipo = b.getAttribute('data-tipo');
          raiz.querySelectorAll('[data-tipo]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        } else {
          var id = b.getAttribute('data-etq');
          f.etq = f.etq === id ? '' : id;
          raiz.querySelectorAll('[data-etq]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-etq') === f.etq); });
        }
        pintarMuro();
      });
      var sel = raiz.querySelector('.rf-cuaderno select');
      if (sel) sel.onchange = function () { f.cuaderno = this.value; history.replaceState(null, '', '#/referentes' + (f.cuaderno ? '/' + f.cuaderno : '')); pintarMuro(); };
      pintarMuro();
    }).catch(function (err) {
      console.error(err);
      pintarMensaje('No se pudo cargar', 'Revisa tu conexión e inténtalo de nuevo.', true);
    });
  }

  /* ══ ENTRADA ══════════════════════════════════════════════════════ */
  function modoDe(e) {
    if (e.tipo === 'apunte') return { modo: 'scroll', fijo: true };
    if (e.modo_lectura === 'scroll' || e.modo_lectura === 'paginas') return { modo: e.modo_lectura, fijo: true };
    return { modo: S.prefs.modo || S.sitio.apariencia.modo_lectura_defecto, fijo: false };
  }

  function pintarEntrada(slug, restaurar, vistaId) {
    var lista = S.sitio.entradas;
    S.app.innerHTML = '<div class="cargando"></div>';
    var carga = vistaId ? RA.datos.cargarVista(vistaId) : RA.datos.cargarEntrada(slug);
    carga.then(function (e) {
      if (!e && vistaId) return pintarMensaje('Vista previa', 'Para ver un borrador tienes que haber entrado como autor en este navegador.', false, true);
      if (!e) return pintarMensaje('No encontrado', 'Este cuaderno no existe o todavía no se ha publicado.', false, true);
      if (!vistaId) { S.ultimoSlug = e.slug; G.escribir('ultimo', e.slug); }
      titulo(e.titulo);
      var i = -1;
      for (var k = 0; k < lista.length; k++) if (lista[k].slug === e.slug) i = k;
      var sig = i >= 0 ? lista[i + 1] : null;
      var md = modoDe(e);
      var t = S.tema, st = RA.estiloPortada(e, t);
      var esApunte = e.tipo === 'apunte';

      var barra = '<header class="barra">' +
        '<a class="barra__volver" href="#/cuadernos" aria-label="Volver a los cuadernos">←<span> Cuadernos</span></a>' +
        '<nav class="tintas" aria-label="Cuadernos">' + lista.map(function (x) {
          return '<a href="#/leer/' + encodeURIComponent(x.slug) + '" style="background-color:' + RA.colorCuaderno(x, t) + '"' +
            ' aria-label="' + esc(RA.antetitulo(x) + ': ' + x.titulo) + '"' + (x.slug === e.slug ? ' aria-current="page"' : '') + '></a>';
        }).join('') + '</nav>' +
        '<button type="button" class="boton-aa" aria-label="Ajustes de lectura" aria-haspopup="dialog" aria-expanded="false">Aa</button>' +
        '</header>';

      var html;
      if (esApunte) {
        var origen = (e.relacionadas || []).map(function (id) { return S.porId[id]; }).filter(Boolean)[0];
        html = '<div class="pag-entrada es-apunte modo-scroll"><span class="pat p-' + esc(st.patron) + '"></span>' +
          '<span class="apunte__circulo" style="background:' + st.o2 + '"></span>' + barra +
          '<article class="libro"><div class="ficha"><span class="antetitulo">Apunte · ' + RA.minutos(e) + '</span>' +
            '<h1 class="ficha__titulo">' + esc(e.titulo) + '</h1>' +
            '<div class="cuerpo">' + RA.limpiarHTML(e.cuerpo_html) + '</div></div>' +
            (origen ? '<div class="apunte__origen-envoltura"><a class="apunte__origen" href="#/leer/' + encodeURIComponent(origen.slug) + '">Del ' +
              (origen.tipo === 'capitulo' ? 'Día ' + origen.numero : 'apunte «' + esc(origen.titulo) + '»') + ' →</a></div>' : '') +
            '<div class="final">' + finalHTML(e, sig, true) + '</div>' +
          '</article>' + pie() + '</div>';
      } else {
        var portadilla = '<section class="portadilla" style="--pc:' + st.pc + ';' + (st.imagen
            ? 'background:' + st.bg + ' url(\'' + encodeURI(st.imagen) + '\') center/cover no-repeat'
            : 'background:' + st.bg) + '">' +
          (st.imagen ? '' : '<span class="portadilla__circulo" style="background:' + st.grande1 + '"></span>' +
            '<span class="portadilla__cuadro" style="background:' + st.grande2 + '"></span>' +
            '<span class="pat p-' + esc(st.patron) + '"></span>') +
          '<span class="portadilla__costura" style="border-color:' + st.costura + '"></span>' +
          '<a class="portadilla__volver" href="#/cuadernos" aria-label="Volver a los cuadernos" style="color:' + st.fg + '">←</a>' +
          '<div class="portadilla__dentro">' +
            '<span class="portadilla__numero" style="color:' + (st.imagen ? 'var(--papel)' : st.fg) + '" aria-hidden="true">' + RA.numeroCorto(e) + '</span>' +
            '<div class="portadilla__etiqueta"><span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) +
              (S.sitio.proyecto.autor ? ' · ' + esc(S.sitio.proyecto.autor) : '') + '</span>' +
              '<h1>' + esc(e.titulo) + '</h1>' +
              (e.entradilla ? '<p class="portadilla__entradilla">' + esc(e.entradilla) + '</p>' : '') +
              '<button type="button" class="boton portadilla__leer">Leer →</button>' +
            '</div></div></section>';
        html = '<div class="pag-entrada modo-' + md.modo + '">' + barra + portadilla +
          '<article class="libro"><div class="paginas"><div class="cuerpo">' + RA.limpiarHTML(e.cuerpo_html) + '</div>' +
            '<div class="final">' + finalHTML(e, sig, false) + '</div></div></article>' + pie() + '</div>';
      }
      S.app.innerHTML = html;
      var raiz = S.app.firstChild;
      if (!esApunte) ponerCapitular(raiz.querySelector('.cuerpo'));
      raiz.querySelectorAll('.cuerpo img').forEach(function (im) { if (md.modo !== 'paginas') im.loading = 'lazy'; });
      raiz.querySelectorAll('.cuerpo a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });

      var ctx = { e: e, raiz: raiz, md: md, pag: null, vista: vistaId || null };
      if (vistaId) {
        var bv = document.createElement('div');
        bv.className = 'vista-previa';
        bv.innerHTML = '<span>Vista previa · ' + (e.estado === 'publicado' && !e.con_trabajo ? 'publicada' : 'sin publicar') + '</span><a href="admin/index.html#/entrada/' + encodeURIComponent(e.id) + '">Volver al editor</a>';
        raiz.appendChild(bv);
      }
      S.ctx = ctx;
      raiz.querySelector('.boton-aa').onclick = function () { abrirAjustes(ctx, this); };
      var leer = raiz.querySelector('.portadilla__leer');
      if (leer) leer.onclick = function () { irAlTexto(ctx); };
      if (md.modo === 'paginas') ctx.pag = montarPaginas(ctx);
      var limpiezas = [];
      if (ctx.pag) limpiezas.push(ctx.pag.destruir);
      if (RA.montarReacciones && !vistaId) limpiezas.push(RA.montarReacciones(ctx));
      S.limpiar = function () { limpiezas.forEach(function (f) { f(); }); cerrarAjustes(); quitarAviso(); S.ctx = null; };

      if (restaurar != null) irAFraccion(ctx, restaurar);
      else {
        window.scrollTo(0, 0);
        var m = G.leer('marcadores', {})[e.slug];
        if (m) avisoMarcador(ctx, m);
      }
    }).catch(function (err) {
      console.error(err);
      pintarMensaje('No se pudo cargar', 'Revisa tu conexión e inténtalo de nuevo.', true);
    });
  }

  function finalHTML(e, sig, esApunte) {
    var t = S.tema, h = '';
    h += '<p class="fin">' + (esApunte ? 'Fin del apunte' : 'Fin del día ' + e.numero) + '</p>';
    if (sig) {
      var st = RA.estiloPortada(sig, t);
      h += '<a class="siguiente" href="#/leer/' + encodeURIComponent(sig.slug) + '" style="--pc:' + st.pc + ';background:' + st.bg + ';color:' + st.fg + '">' +
        '<span class="siguiente__circulo" style="background:' + st.grande1 + '"></span><span class="pat p-' + esc(st.patron) + '"></span>' +
        '<span class="siguiente__dentro"><span class="siguiente__textos"><span class="antetitulo">Sigue · ' + esc(RA.antetitulo(sig)) + '</span>' +
        '<span class="siguiente__titulo">' + esc(sig.titulo) + '</span></span>' +
        '<span class="siguiente__boton">Seguir leyendo →</span></span></a>';
    } else {
      h += '<a class="siguiente" href="#/cuadernos" style="--pc:rgba(20,20,40,.16);background:var(--papel-suave);color:var(--tinta)"><span class="pat p-grano"></span>' +
        '<span class="siguiente__dentro"><span class="siguiente__textos"><span class="antetitulo">Por ahora, el último</span>' +
        '<span class="siguiente__titulo">Pronto, la siguiente entrega</span></span>' +
        '<span class="siguiente__boton">Ver los cuadernos →</span></span></a>';
    }
    var rel = (e.relacionadas || []).map(function (id) { return S.porId[id]; }).filter(Boolean);
    if (rel.length || e.n_referentes) {
      h += '<section class="relacionados">' + (rel.length ? '<h3>Relacionados</h3><div class="relacionados__lista">' + rel.map(function (r) {
        return '<a class="relacionado" href="#/leer/' + encodeURIComponent(r.slug) + '">' + RA.htmlMini(r, t) +
          '<span class="relacionado__textos"><span class="antetitulo">' + esc(RA.antetitulo(r)) + '</span>' +
          '<span class="relacionado__titulo">' + esc(r.titulo) + '</span></span></a>';
      }).join('') + '</div>' : '') +
      (e.n_referentes ? '<a class="ver-referentes" href="#/referentes/' + encodeURIComponent(e.slug) + '">Ver ' + (e.n_referentes === 1 ? 'el referente' : 'los ' + e.n_referentes + ' referentes') +
        ' de este ' + (esApunte ? 'apunte' : 'capítulo') + '</a>' : '') + '</section>';
    }
    return h;
  }

  /* Capitular en dos tintas sobre la primera letra del texto */
  function ponerCapitular(cuerpo) {
    var p = [].slice.call(cuerpo.querySelectorAll(':scope > p')).filter(function (x) { return x.textContent.trim(); })[0];
    if (!p) return;
    var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode()) && !n.nodeValue.trim()) { /* busca el primer texto */ }
    if (!n) return;
    var m = n.nodeValue.match(/^(\s*)([«“"'¿¡—–(]*[\p{L}\p{N}])/u);
    if (!m) return;
    var letra = m[2];
    n.nodeValue = n.nodeValue.slice(m[0].length);
    var cap = document.createElement('span');
    cap.className = 'capitular';
    cap.innerHTML = '<span class="solo-lector">' + esc(letra) + '</span><span aria-hidden="true">' + esc(letra) +
      '</span><span class="capitular__b" aria-hidden="true">' + esc(letra) + '</span>';
    n.parentNode.insertBefore(cap, n);
  }

  /* ── Posición de lectura (fracción 0–1) ─────────────────────────── */
  function fraccion(ctx) {
    if (ctx.pag) return ctx.pag.fraccion();
    var c = ctx.raiz.querySelector('.cuerpo'), r = c.getBoundingClientRect();
    var total = c.offsetHeight - window.innerHeight * 0.5;
    return total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
  }
  function irAFraccion(ctx, f) {
    if (ctx.pag) return ctx.pag.irAFraccion(f);
    var c = ctx.raiz.querySelector('.cuerpo');
    var y = c.getBoundingClientRect().top + window.scrollY;
    var total = c.offsetHeight - window.innerHeight * 0.5;
    window.scrollTo(0, f > 0 ? y + f * total : 0);
  }
  function irAlTexto(ctx) {
    if (ctx.pag) return ctx.pag.ir(1);
    var b = ctx.raiz.querySelector('.libro');
    window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - (RA.esMovil() ? 0 : 60), behavior: RA.reduceMovimiento() ? 'auto' : 'smooth' });
  }
  function repintar() {
    var ctx = S.ctx; if (!ctx) return;
    var f = fraccion(ctx), slug = ctx.e.slug;
    if (S.limpiar) { S.limpiar(); S.limpiar = null; }
    pintarEntrada(slug, f, ctx.vista);
  }

  /* ── Marcador ─────────────────────────────────────────────────────── */
  function quitarAviso() { var a = document.querySelector('.aviso-marcador'); if (a) a.remove(); }
  function avisoMarcador(ctx, m) {
    quitarAviso();
    var d = document.createElement('div');
    d.className = 'aviso-marcador'; d.setAttribute('role', 'status');
    d.innerHTML = '<span>Tienes un marcador aquí</span><button type="button" class="ir">Ir</button>' +
      '<button type="button" class="cerrar" aria-label="Cerrar aviso">×</button>';
    document.body.appendChild(d);
    d.querySelector('.ir').onclick = function () { quitarAviso(); irAFraccion(ctx, m.f); };
    d.querySelector('.cerrar').onclick = quitarAviso;
    setTimeout(function () { if (d.isConnected) d.remove(); }, 9000);
  }

  /* ── Panel de ajustes ─────────────────────────────────────────────── */
  var ICONOS = {
    luna: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1a7 7 0 1 0 7 7A5 5 0 0 1 8 1z" fill="currentColor"/></svg>',
    marcador: '<svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M1 1h10v14l-5-4-5 4z" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
    marcadorLleno: '<svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M1 1h10v14l-5-4-5 4z" stroke="currentColor" stroke-width="1.4" fill="currentColor"/></svg>',
    casa: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8l7-6 7 6v7H1z" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>'
  };

  function cerrarAjustes() {
    var p = document.querySelector('.ajustes'), v = document.querySelector('.velo');
    if (p) p.remove(); if (v) v.remove();
    document.removeEventListener('keydown', escAjustes);
    var b = document.querySelector('.boton-aa');
    if (b) { b.setAttribute('aria-expanded', 'false'); if (S.volverFoco) b.focus(); }
    S.volverFoco = false;
  }
  function escAjustes(ev) { if (ev.key === 'Escape') { S.volverFoco = true; cerrarAjustes(); } }

  function abrirAjustes(ctx, boton) {
    if (document.querySelector('.ajustes')) { S.volverFoco = true; return cerrarAjustes(); }
    var e = ctx.e, t = S.tema, lista = S.sitio.entradas;
    var marcas = G.leer('marcadores', {}), tieneMarca = !!marcas[e.slug];
    var v = document.createElement('div'); v.className = 'velo';
    var p = document.createElement('div');
    p.className = 'ajustes'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Ajustes de lectura');
    p.innerHTML = '<span class="ajustes__asa" aria-hidden="true"></span>' +
      '<div class="ajustes__botones">' +
        '<button type="button" class="redondo" data-a="tema" aria-pressed="' + t.oscuro + '" aria-label="Tema oscuro">' + ICONOS.luna + '</button>' +
        '<button type="button" class="redondo" data-a="marcador" aria-pressed="' + tieneMarca + '" aria-label="' + (tieneMarca ? 'Quitar el marcador' : 'Poner un marcador aquí') + '">' + (tieneMarca ? ICONOS.marcadorLleno : ICONOS.marcador) + '</button>' +
        '<a class="redondo" href="#/" aria-label="Volver al inicio">' + ICONOS.casa + '</a>' +
        '<a class="redondo" href="#/referentes" aria-label="Referentes">Ref.</a>' +
      '</div>' +
      '<div><h2>Cuadernos</h2><ul class="ajustes__lista">' + lista.map(function (x) {
        return '<li><a href="#/leer/' + encodeURIComponent(x.slug) + '"' + (x.slug === e.slug ? ' aria-current="page"' : '') + '>' +
          '<span class="muestra" style="background:' + RA.colorCuaderno(x, t) + '"></span>' +
          '<span>' + esc(RA.antetitulo(x)) + ' · ' + esc(x.titulo) + '</span></a></li>';
      }).join('') + '</ul></div>' +
      '<div class="ajustes__pie">' +
        '<div class="ajustes__grupo"><span id="lbl-tam">Tamaño</span><div class="tamanos" role="group" aria-labelledby="lbl-tam">' +
          [13, 17, 22].map(function (px, i) {
            return '<button type="button" data-tam="' + i + '" style="font-size:' + px + 'px" aria-pressed="' + (S.prefs.tam === i) + '" aria-label="' +
              ['Letra pequeña', 'Letra mediana', 'Letra grande'][i] + '">A</button>';
          }).join('') + '</div></div>' +
        (e.tipo === 'apunte' ? '' :
        '<div class="ajustes__grupo ajustes__grupo--der"><span id="lbl-pag">Pasar páginas</span>' +
          '<button type="button" class="interruptor" role="switch" aria-labelledby="lbl-pag" aria-checked="' + (ctx.md.modo === 'paginas') + '"' + (ctx.md.fijo ? ' disabled' : '') + '></button>' +
          (ctx.md.fijo ? '<span class="ajustes__nota">El autor fijó este modo</span>' : '') + '</div>') +
      '</div>' +
      '<div class="ajustes__fila"><span id="lbl-rea">Subrayados y reacciones de lectores<span class="ajustes__nota">Selecciona un pasaje para reaccionar</span></span>' +
        '<button type="button" class="interruptor" data-a="reacciones" role="switch" aria-labelledby="lbl-rea" aria-checked="' + S.prefs.reacciones + '"></button></div>';
    document.body.appendChild(v); document.body.appendChild(p);
    boton.setAttribute('aria-expanded', 'true');
    v.onclick = function () { S.volverFoco = true; cerrarAjustes(); };
    document.addEventListener('keydown', escAjustes);
    p.querySelector('.redondo').focus();

    p.querySelector('[data-a="tema"]').onclick = function () {
      S.prefs.tema = S.tema.oscuro ? 'claro' : 'oscuro';
      G.escribir('tema', S.prefs.tema);
      aplicarTema(); cerrarAjustes(); repintar();
    };
    p.querySelector('[data-a="marcador"]').onclick = function () {
      var m = G.leer('marcadores', {});
      if (m[e.slug]) delete m[e.slug]; else m[e.slug] = { f: fraccion(ctx), en: Date.now() };
      G.escribir('marcadores', m);
      var b = this, si = !!m[e.slug];
      b.setAttribute('aria-pressed', si);
      b.setAttribute('aria-label', si ? 'Quitar el marcador' : 'Poner un marcador aquí');
      b.innerHTML = si ? ICONOS.marcadorLleno : ICONOS.marcador;
    };
    p.querySelectorAll('[data-tam]').forEach(function (b) {
      b.onclick = function () {
        var f = fraccion(ctx);
        S.prefs.tam = +b.getAttribute('data-tam'); G.escribir('tam', S.prefs.tam); aplicarTam();
        p.querySelectorAll('[data-tam]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        if (ctx.pag) ctx.pag.recalcular(f); else irAFraccion(ctx, f);
      };
    });
    p.querySelector('[data-a="reacciones"]').onclick = function () {
      S.prefs.reacciones = !S.prefs.reacciones; G.escribir('verReacciones', S.prefs.reacciones);
      this.setAttribute('aria-checked', S.prefs.reacciones); aplicarTam();
    };
    var sw = p.querySelector('.interruptor:not([data-a])');
    if (sw && !ctx.md.fijo) sw.onclick = function () {
      S.prefs.modo = ctx.md.modo === 'paginas' ? 'scroll' : 'paginas';
      G.escribir('modo', S.prefs.modo);
      cerrarAjustes(); repintar();
    };
    p.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { cerrarAjustes(); }); });
  }

  /* ── Modo páginas ─────────────────────────────────────────────────── */
  function montarPaginas(ctx) {
    var raiz = ctx.raiz, libro = raiz.querySelector('.libro'), pags = raiz.querySelector('.paginas');
    var pagina = 0, total = 1, paso = 1;   // página 0 = portadilla
    var chip = document.createElement('span'); chip.className = 'contador-pagina'; chip.setAttribute('aria-live', 'polite');
    var fa = document.createElement('button'); fa.className = 'flecha-pagina flecha-pagina--ant'; fa.type = 'button'; fa.setAttribute('aria-label', 'Página anterior'); fa.textContent = '←';
    var fs = document.createElement('button'); fs.className = 'flecha-pagina flecha-pagina--sig'; fs.type = 'button'; fs.setAttribute('aria-label', 'Página siguiente'); fs.textContent = '→';
    raiz.appendChild(chip); raiz.appendChild(fa); raiz.appendChild(fs);

    function medir() {
      var cs = getComputedStyle(libro);
      var ancho = libro.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var gap = 48;
      pags.style.columnWidth = ancho + 'px';
      pags.style.columnGap = gap + 'px';
      pags.style.width = ancho + 'px';
      paso = ancho + gap;
      total = Math.max(1, Math.round((pags.scrollWidth + gap) / paso));
    }
    function pintar(anim) {
      raiz.classList.toggle('en-libro', pagina > 0);
      if (!anim) pags.style.transition = 'none';
      pags.style.transform = 'translateX(' + (-(Math.max(1, pagina) - 1) * paso) + 'px)';
      if (!anim) { pags.offsetWidth; pags.style.transition = ''; }
      chip.textContent = pagina === 0 ? 'Portada' : pagina + ' / ' + total;
      chip.style.display = pagina === 0 ? 'none' : '';
      fa.disabled = pagina === 0; fs.disabled = pagina >= total;
      fa.style.display = fs.style.display = pagina === 0 ? 'none' : '';
    }
    function ir(n) { pagina = Math.max(0, Math.min(total, n)); pintar(true); }
    function fraccionP() { return pagina <= 1 ? 0 : (pagina - 1) / Math.max(1, total - 1); }
    function irAFraccion(f) { medir(); pagina = f > 0 ? 1 + Math.round(f * (total - 1)) : 1; pintar(false); }

    fa.onclick = function () { ir(pagina - 1); };
    fs.onclick = function () { ir(pagina + 1); };
    function teclas(ev) {
      if (document.querySelector('.ajustes')) return;
      if (['ArrowRight', 'PageDown', ' '].indexOf(ev.key) >= 0) { ev.preventDefault(); ir(pagina + 1); }
      if (['ArrowLeft', 'PageUp'].indexOf(ev.key) >= 0) { ev.preventDefault(); ir(pagina - 1); }
    }
    document.addEventListener('keydown', teclas);

    // Toques y deslizamientos
    var ini = null;
    function abajo(ev) { ini = { x: ev.clientX, y: ev.clientY, t: Date.now() }; }
    function arriba(ev) {
      if (!ini) return;
      var dx = ev.clientX - ini.x, dy = ev.clientY - ini.y, dt = Date.now() - ini.t;
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) { ini = null; return; }   // está seleccionando texto para reaccionar
      var objetivo = ev.target;
      ini = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) return ir(pagina + (dx < 0 ? 1 : -1));
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 500 && !objetivo.closest('a,button,mark')) {
        var x = ev.clientX / window.innerWidth;
        if (pagina === 0) return;
        if (x > 0.66) ir(pagina + 1); else if (x < 0.33) ir(pagina - 1);
      }
    }
    libro.addEventListener('pointerdown', abajo);
    libro.addEventListener('pointerup', arriba);
    var por = raiz.querySelector('.portadilla');
    por.addEventListener('pointerdown', abajo);
    por.addEventListener('pointerup', function (ev) {
      if (!ini) return;
      var dx = ev.clientX - ini.x; ini = null;
      if (dx < -40) ir(1);
    });

    var f0 = null, tm = null;
    function alRedimensionar() {
      if (f0 == null) f0 = fraccionP();
      clearTimeout(tm);
      tm = setTimeout(function () { var p0 = pagina; medir(); if (p0 > 0) irAFraccion(f0); else pintar(false); f0 = null; }, 120);
    }
    window.addEventListener('resize', alRedimensionar);
    pags.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { var f = fraccionP(); medir(); if (pagina > 0) irAFraccion(f); else pintar(false); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var f = fraccionP(); medir(); if (pagina > 0) irAFraccion(f); else pintar(false); });

    medir(); pintar(false);
    return {
      ir: ir, fraccion: fraccionP, irAFraccion: irAFraccion,
      recalcular: function (f) { medir(); if (pagina === 0) pintar(false); else irAFraccion(f); },
      destruir: function () {
        document.removeEventListener('keydown', teclas);
        window.removeEventListener('resize', alRedimensionar);
        chip.remove(); fa.remove(); fs.remove();
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
