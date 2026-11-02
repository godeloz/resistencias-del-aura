/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · audio de una entrada en el editor (A-13)
   · Sección «Audio» del panel lateral: resumen y acciones.
   · Ventana «Audio del cuaderno»: archivo, créditos, sincronización.
   · Ventana «Marcar tiempos»: se escucha el audio y se pulsa la barra
     espaciadora cuando empieza cada bloque (o el inicio y el fin de cada
     cita en otra voz). Las marcas se guardan una por bloque, con su huella,
     para que sigan a su párrafo aunque el texto cambie después.
   El audio va en el campo «audio» de la entrada (SQL 08) y se publica
   como los demás campos: mientras no publiques, queda en la copia de trabajo.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, AU = RA.audio;
  function ui() { return RA.ui; }
  var NOMBRE_TAG = { P: 'Párrafo', H2: 'Subtítulo', H3: 'Subtítulo menor', BLOCKQUOTE: 'Cita', UL: 'Lista', OL: 'Lista', ASIDE: 'Recuadro', FIGURE: 'Figura' };
  var CORTO_TAG = { P: '¶', H2: 'T', H3: 't', BLOCKQUOTE: '“', UL: '•', OL: '1.', ASIDE: '▢', FIGURE: 'Fig' };

  function narradorDefecto() { return 'Diego Agudelo'; }   // decisión de Diego (2 nov 2026): normalmente narra él
  function bloquesDe(api) { return AU.bloquesDeHTML(api.cuerpo(), RA.limpiarEditor); }
  function urlDe(a, api) { return AU.url(a, AU.base(api.apariencia), '../'); }

  /* Duración de un archivo de audio (lee solo los metadatos) */
  function medir(url) {
    return new Promise(function (ok, mal) {
      if (!url) return mal(new Error('sin-archivo'));
      var el = new Audio(); el.preload = 'metadata';
      var t = setTimeout(function () { limpiar(); mal(new Error('tiempo')); }, 20000);
      function limpiar() { clearTimeout(t); el.removeAttribute('src'); try { el.load(); } catch (x) { /* nada */ } }
      el.addEventListener('loadedmetadata', function () { var d = el.duration; limpiar(); isFinite(d) && d > 0 ? ok(d) : mal(new Error('sin-duracion')); });
      el.addEventListener('error', function () { limpiar(); mal(new Error('no-carga')); });
      el.src = url;
    });
  }

  /* ── Sección del panel ─────────────────────────────────────────── */
  function resumenHTML(a, api) {
    var s = AU.sinc(a), firmas = bloquesDe(api).map(AU.firma), r = AU.resumen(a, firmas);
    var h = '';
    if (s === 'completa') h += r.faltan ? '<span class="au-ad__alerta">' + r.marcados + ' de ' + r.total + ' bloques con su tiempo · faltan ' + r.faltan + '</span>'
      : '<span class="au-ad__ok">Los ' + r.total + ' bloques tienen su tiempo</span>';
    if (s === 'citas') h += !r.citas ? '<span class="au-ad__alerta">El texto no tiene citas: usa el botón «Cita» del editor</span>'
      : r.citasMarcadas < r.citas ? '<span class="au-ad__alerta">' + r.citasMarcadas + ' de ' + r.citas + (r.citas === 1 ? ' cita marcada' : ' citas marcadas') + '</span>'
      : '<span class="au-ad__ok">' + (r.citas === 1 ? 'La cita tiene' : 'Las ' + r.citas + ' citas tienen') + ' su tramo</span>';
    if (s === 'no') h += '<span class="ed-nota">Texto y audio van por separado: el lector puede pausar y seguir leyendo.</span>';
    if (s !== 'no' && r.editados) h += '<span class="ed-nota">' + r.editados + (r.editados === 1 ? ' bloque cambió' : ' bloques cambiaron') + ' desde que marcaste: las marcas los siguen. Revisa que coincidan.</span>';
    if (a.revisar && s !== 'no') h += '<span class="au-ad__alerta">Reemplazaste el audio: revisa las marcas</span>';
    return h;
  }
  function seccionHTML(api) {
    var a = api.audio();
    if (!api.conColumna) return '<p class="ed-nota">Para ponerle audio a la entrada, corre en Supabase el archivo <code>supabase/08-audio.sql</code> y recarga.</p>';
    if (!AU.tiene(a)) return '<p class="ed-nota">La entrada no tiene audio.</p><button type="button" class="a-boton a-boton--fino" data-audio="editar">+ Añadir audio</button>';
    var nombre = String(a.archivo).split('/').pop();
    return '<div class="au-ad">' +
      '<div class="au-ad__archivo"><span class="au-ad__icono">' + RA.iconoAudio(16) + '</span><span><b>' + esc(nombre) + '</b>' +
        (a.duracion ? ' · ' + AU.tiempo(a.duracion) : ' · <span class="au-ad__alerta">sin duración</span>') + '</span></div>' +
      '<span class="ed-nota">' + esc(AU.creditos(a, api.autor)) + '</span>' +
      '<span class="au-ad__estado">' + esc(AU.NOMBRE_SINC[AU.sinc(a)]) + (a.abrir_escucha ? ' · abre en modo escucha' : '') + '</span>' +
      resumenHTML(a, api) +
      '<div class="au-ad__acciones"><button type="button" class="a-boton a-boton--fino" data-audio="editar">Editar audio</button>' +
        (AU.sinc(a) !== 'no' ? '<button type="button" class="a-boton a-boton--primario a-boton--fino" data-audio="marcar">Marcar tiempos</button>' : '') +
        '<button type="button" class="a-boton a-boton--fino au-ad__quitar" data-audio="quitar">Quitar</button></div></div>';
  }

  /* ── Ventana: archivo, créditos y sincronización ─────────────────── */
  function editar(api) {
    var a0 = api.audio() || {}, a = JSON.parse(JSON.stringify(a0));
    if (!a.narra) a.narra = narradorDefecto(api);
    a.voces = (a.voces || []).slice();
    if (!a.sinc) a.sinc = 'no';
    var refs = api.referentes();   // referentes vinculados a la entrada: [{id, titulo, autor}]
    var cuerpo = document.createElement('div');
    cuerpo.className = 'au-ed';
    var base = AU.base(api.apariencia);
    function pintar() {
      cuerpo.innerHTML =
        '<label class="a-campo">Archivo<input type="text" data-k="archivo" value="' + esc(a.archivo || '') + '" placeholder="dia-7-alexa.mp3 o https://…" spellcheck="false" autocomplete="off"></label>' +
        '<p class="ed-nota au-ed__donde"></p>' +
        '<div class="au-ed__prueba"><button type="button" class="a-boton a-boton--fino" data-a="probar">Comprobar el archivo</button><span class="au-ed__resultado" aria-live="polite">' +
          (a.duracion ? 'Duración: ' + AU.tiempo(a.duracion) : '') + '</span></div>' +
        '<label class="a-campo">Narra<input type="text" data-k="narra" value="' + esc(a.narra || '') + '"></label>' +
        '<div class="a-campo"><span>Otras voces <small class="au-ed__ayuda">(sus citas tienen su propio botón y su color)</small></span>' +
          '<div class="au-ed__voces">' + a.voces.map(function (v, i) {
            return '<div class="au-ed__voz"><input type="text" data-voz="' + i + '" value="' + esc(v.nombre || '') + '" placeholder="Nombre" aria-label="Nombre de la voz ' + (i + 1) + '">' +
              '<select data-voz-ref="' + i + '" aria-label="Referente de la voz ' + (i + 1) + '"><option value="">Sin referente</option>' + refs.map(function (r) {
                return '<option value="' + esc(r.id) + '"' + (v.referente_id === r.id ? ' selected' : '') + '>' + esc((r.titulo || '').slice(0, 50) + (r.autor ? ' · ' + r.autor : '')) + '</option>';
              }).join('') + '</select>' +
              '<button type="button" class="a-mini" data-quitar-voz="' + i + '" aria-label="Quitar la voz">×</button></div>';
          }).join('') + '</div>' +
          '<button type="button" class="a-boton a-boton--fino au-ed__mas" data-a="voz">+ Añadir voz</button>' +
          (refs.length ? '' : '<span class="ed-nota">Para vincular una voz a su referente, primero vincúlalo a la entrada en «Referentes del Moodboard».</span>') + '</div>' +
        '<div class="a-campo"><span>Sincronización</span><div class="au-ed__sinc" role="radiogroup" aria-label="Sincronización">' +
          [['no', 'Sin sincronizar', 'Texto y audio van por separado.'], ['citas', 'Solo las citas', 'Las citas en otra voz tienen su botón. El resto no se ilumina.'],
            ['completa', 'Completa', 'Párrafos y citas marcados: se ilumina y se sigue la voz.']].map(function (o) {
            return '<button type="button" role="radio" data-sinc="' + o[0] + '" aria-checked="' + (a.sinc === o[0]) + '"><b>' + o[1] + '</b><span>' + o[2] + '</span></button>';
          }).join('') + '</div></div>' +
        '<label class="ap-check"><input type="checkbox" data-k="abrir_escucha"' + (a.abrir_escucha ? ' checked' : '') + '> Abrir el cuaderno directamente en modo escucha</label>';
      donde();
    }
    function donde() {
      var p = cuerpo.querySelector('.au-ed__donde'), f = String(a.archivo || '').trim();
      if (!f) { p.innerHTML = base ? 'Escribe el nombre del archivo en tu repositorio de audio (' + esc(base) + ') o pega una dirección completa.' :
        'Escribe el nombre del archivo (va en la carpeta <code>audio/</code> del sitio) o pega una dirección completa. El repositorio de audio se configura en <a href="#/apariencia">Apariencia</a>.'; return; }
      p.innerHTML = 'Se escuchará desde: <code>' + esc(AU.url({ archivo: f }, base, '')) + '</code>';
    }
    function probar() {
      var r = cuerpo.querySelector('.au-ed__resultado');
      if (!String(a.archivo || '').trim()) { r.textContent = 'Escribe primero el archivo.'; r.className = 'au-ed__resultado au-ad__alerta'; return Promise.resolve(false); }
      r.textContent = 'Comprobando…'; r.className = 'au-ed__resultado';
      return medir(urlDe(a, api)).then(function (d) {
        a.duracion = Math.round(d * 10) / 10;
        r.textContent = 'Se escucha bien · duración ' + AU.tiempo(d); r.className = 'au-ed__resultado au-ad__ok';
        return true;
      }).catch(function () {
        r.textContent = 'No se pudo abrir el audio. Revisa el nombre, que el archivo ya esté publicado en GitHub y la dirección del repositorio.';
        r.className = 'au-ed__resultado au-ad__alerta';
        return false;
      });
    }
    cuerpo.addEventListener('input', function (ev) {
      var t = ev.target, k = t.getAttribute('data-k');
      if (k === 'archivo') { a.archivo = t.value.trim(); delete a.duracion; cuerpo.querySelector('.au-ed__resultado').textContent = ''; donde(); }
      else if (k === 'narra') a.narra = t.value;
      else if (t.hasAttribute('data-voz')) a.voces[+t.getAttribute('data-voz')].nombre = t.value;
    });
    cuerpo.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.getAttribute('data-k') === 'abrir_escucha') a.abrir_escucha = t.checked;
      if (t.getAttribute('data-k') === 'archivo' && a.archivo) probar();
      if (t.hasAttribute('data-voz-ref')) {
        var i = +t.getAttribute('data-voz-ref'), r = refs.filter(function (x) { return x.id === t.value; })[0];
        a.voces[i].referente_id = t.value || null;
        if (r && !String(a.voces[i].nombre || '').trim()) { a.voces[i].nombre = r.autor || r.titulo || ''; pintar(); }
      }
    });
    cuerpo.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-a') === 'probar') return probar();
      if (b.getAttribute('data-a') === 'voz') { a.voces.push({ nombre: '' }); pintar(); var ins = cuerpo.querySelectorAll('[data-voz]'); ins[ins.length - 1].focus(); return; }
      if (b.hasAttribute('data-quitar-voz')) { a.voces.splice(+b.getAttribute('data-quitar-voz'), 1); pintar(); return; }
      if (b.hasAttribute('data-sinc')) { a.sinc = b.getAttribute('data-sinc'); cuerpo.querySelectorAll('[data-sinc]').forEach(function (x) { x.setAttribute('aria-checked', x === b); }); }
    });
    pintar();
    var nuevo = !AU.tiene(a0);
    return ui().ventana({
      titulo: nuevo ? 'Añadir audio' : 'Audio de la entrada', cuerpo: cuerpo, clase: 'a-ventana--ancha au-ventana',
      botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Guardar', valor: 'guardar', tipo: 'primario' }]
    }).then(function (v) {
      if (v !== 'guardar') return;
      if (!String(a.archivo || '').trim()) { ui().aviso('Falta el archivo de audio', 'error'); return; }
      a.voces = a.voces.filter(function (x) { return String(x.nombre || '').trim(); }).map(function (x) {
        var o = { nombre: String(x.nombre).trim() }; if (x.referente_id) o.referente_id = x.referente_id; return o;
      });
      a.narra = String(a.narra || '').trim() || narradorDefecto(api);
      if (!a.abrir_escucha) delete a.abrir_escucha;
      // Si se cambió el archivo y ya había marcas, quedan por revisar
      if (a0.archivo && a0.archivo !== a.archivo && (a.marcas || []).some(function (m) { return m && m.t != null; })) a.revisar = true;
      var listo = a.duracion ? Promise.resolve() : medir(urlDe(a, api)).then(function (d) { a.duracion = Math.round(d * 10) / 10; }).catch(function () {
        ui().aviso('Se guardó, pero no se pudo leer la duración del audio. Revisa el archivo.', 'error');
      });
      return listo.then(function () {
        api.poner(a);
        ui().aviso(nuevo ? 'Audio añadido' : 'Audio guardado');
        if (nuevo && a.sinc !== 'no') setTimeout(function () { marcar(api); }, 150);
      });
    });
  }

  /* ── Ventana: marcar tiempos ───────────────────────────────────── */
  function marcar(api) {
    var a = JSON.parse(JSON.stringify(api.audio() || {}));
    var s = AU.sinc(a), nombres = AU.voces(a, api.autor);
    var bloques = bloquesDe(api), firmas = bloques.map(AU.firma);
    var al = AU.alinear(firmas, a.marcas || []);
    // Filas: todos los bloques (completa) o solo las citas (citas)
    var filas = firmas.map(function (f, i) {
      var m = al[i] || {}, texto = AU.texto(bloques[i]);
      var v = m.v != null ? +m.v : 0;
      if (f.cita && m.t == null && nombres.length > 1) {   // cita sin marcar: si su autoría nombra una voz, se propone esa voz
        var cite = bloques[i].querySelector('cite'), quien = AU.normal(cite ? cite.textContent : '');
        for (var k = 1; k < nombres.length; k++) { var n = AU.normal(nombres[k]); if (n && quien.indexOf(n.split(' ')[0]) >= 0) { v = k; break; } }
        if (!v && s === 'citas') v = 1;
      }
      return { i: i, f: f, texto: texto, t: m.t != null ? +m.t : null, fin: m.f != null ? +m.f : null, v: v, editada: !!m.editada };
    });
    var visibles = s === 'citas' ? filas.filter(function (r) { return r.f.cita; }) : filas;
    if (!visibles.length) {
      ui().aviso(s === 'citas' ? 'El texto no tiene citas. Agrega las citas con el botón «Cita» o elige otra sincronización.' : 'La entrada no tiene texto todavía.', 'error');
      return Promise.resolve();
    }
    var objetivo = { fila: null, que: 'ini' };
    function primeraSinMarca() {
      for (var k = 0; k < visibles.length; k++) {
        var r = visibles[k];
        if (r.t == null) return { fila: r, que: 'ini' };
        if (necesitaFin(r) && r.fin == null) return { fila: r, que: 'fin' };
      }
      return { fila: visibles[visibles.length - 1], que: 'ini' };
    }
    function necesitaFin(r) { return r.f.cita && r.v > 0 && s === 'citas'; }
    function admiteFin(r) { return r.f.cita && r.v > 0; }
    objetivo = primeraSinMarca();
    var cambios = false;

    var el = new Audio(); el.preload = 'auto'; el.src = urlDe(a, api);
    var cuerpo = document.createElement('div');
    cuerpo.className = 'au-mk';
    cuerpo.innerHTML =
      (a.revisar ? '<div class="au-mk__revisar"><span>Reemplazaste el audio después de marcar. Escucha y corrige lo que se haya corrido.</span><button type="button" class="a-boton a-boton--fino" data-a="revisado">Las marcas están bien</button></div>' : '') +
      '<div class="au-mk__reproductor">' +
        '<button type="button" class="a-boton a-boton--fino au-mk__play" data-a="play" aria-label="Reproducir">▶</button>' +
        '<button type="button" class="a-mini" data-a="-5" aria-label="Atrás 5 segundos">−5</button>' +
        '<button type="button" class="a-mini" data-a="+5" aria-label="Adelante 5 segundos">+5</button>' +
        '<input type="range" class="au-mk__rango" min="0" max="1000" step="1" value="0" aria-label="Posición del audio">' +
        '<span class="au-mk__tiempo">0:00</span>' +
        '<select class="au-mk__vel" aria-label="Velocidad"><option value="1">1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select>' +
      '</div>' +
      '<p class="ed-nota">' + (s === 'citas'
        ? 'Pon el audio. Cuando empiece cada cita en otra voz, pulsa la <b>barra espaciadora</b> (o «Marcar»); vuelve a pulsarla cuando termine.'
        : 'Pon el audio y pulsa la <b>barra espaciadora</b> (o «Marcar») cuando empiece cada bloque. Toca una fila para elegirla; toca su tiempo para escuchar desde ahí. Las flechas ← → mueven el audio 5 segundos.') + '</p>' +
      '<div class="au-mk__marcar"><button type="button" class="a-boton a-boton--primario" data-a="marcar"></button>' +
        '<span class="au-mk__ajuste">Ajustar la fila elegida: <button type="button" class="a-mini" data-a="-0.5">−0,5</button><button type="button" class="a-mini" data-a="+0.5">+0,5</button></span></div>' +
      '<div class="au-mk__lista" role="list"></div>' +
      '<p class="au-mk__resumen ed-nota" aria-live="polite"></p>';
    var lista = cuerpo.querySelector('.au-mk__lista'), bMarcar = cuerpo.querySelector('[data-a="marcar"]'), bPlay = cuerpo.querySelector('[data-a="play"]');
    var rango = cuerpo.querySelector('.au-mk__rango'), tEl = cuerpo.querySelector('.au-mk__tiempo'), resumen = cuerpo.querySelector('.au-mk__resumen');
    function d() { return isFinite(el.duration) && el.duration > 0 ? el.duration : (a.duracion || 0); }

    function voces(r) {
      if (!r.f.cita || nombres.length < 2) return '';
      return '<select data-fila-voz="' + r.i + '" aria-label="Quién habla en esta cita">' + nombres.map(function (n, k) {
        return '<option value="' + k + '"' + (r.v === k ? ' selected' : '') + '>' + esc(k ? n : 'Narra · ' + n) + '</option>';
      }).join('') + '</select>';
    }
    function pintarLista() {
      var prev = -1;
      lista.innerHTML = visibles.map(function (r) {
        var desorden = r.t != null && r.t < prev; if (r.t != null) prev = r.t;
        var activa = objetivo.fila === r;
        return '<div class="au-mk__fila' + (activa ? ' activa' : '') + (r.t == null ? ' sin' : '') + (desorden ? ' desorden' : '') + '" role="listitem" data-fila="' + r.i + '">' +
          '<span class="au-mk__tipo" title="' + esc(NOMBRE_TAG[r.f.tag] || '') + '">' + esc(CORTO_TAG[r.f.tag] || '·') + '</span>' +
          '<span class="au-mk__texto">' + esc(r.texto.slice(0, 110)) + (r.texto.length > 110 ? '…' : '') + (r.editada ? ' <em class="au-mk__editada">cambió</em>' : '') + '</span>' +
          voces(r) +
          '<button type="button" class="au-mk__t' + (activa && objetivo.que === 'ini' ? ' objetivo' : '') + '" data-ir="' + r.i + '" data-cual="ini" aria-label="Inicio">' + (r.t == null ? '—' : AU.tiempo(r.t) + dec(r.t)) + '</button>' +
          (admiteFin(r) ? '<button type="button" class="au-mk__t au-mk__t--fin' + (activa && objetivo.que === 'fin' ? ' objetivo' : '') + '" data-ir="' + r.i + '" data-cual="fin" aria-label="Fin">' + (r.fin == null ? (s === 'citas' ? 'fin —' : 'fin auto') : '→ ' + AU.tiempo(r.fin) + dec(r.fin)) + '</button>' : '') +
          (r.t != null ? '<button type="button" class="a-mini au-mk__borrar" data-borrar="' + r.i + '" aria-label="Borrar la marca">×</button>' : '<span class="au-mk__hueco"></span>') +
        '</div>';
      }).join('');
      pintarMarcar();
      var c = 0, ci = 0, cf = 0; visibles.forEach(function (r) { if (r.t != null) c++; if (necesitaFin(r)) { ci++; if (r.t != null && r.fin != null) cf++; } });
      resumen.textContent = s === 'citas' ? cf + ' de ' + ci + (ci === 1 ? ' cita con inicio y fin' : ' citas con inicio y fin') : c + ' de ' + visibles.length + ' bloques marcados';
    }
    function dec(t) { return ',' + Math.floor((t % 1) * 10); }
    function pintarMarcar() {
      var r = objetivo.fila;
      var pos = visibles.indexOf(r) + 1;
      bMarcar.textContent = r ? (objetivo.que === 'fin' ? 'Marcar el fin de la cita' : 'Marcar el inicio de ' + (r.f.cita ? 'la cita' : (NOMBRE_TAG[r.f.tag] || 'bloque').toLowerCase() + ' ' + pos)) + ' · espacio' : 'Marcar';
    }
    function enfocarFila() {
      var f = lista.querySelector('.au-mk__fila.activa');
      if (f) { var lr = lista.getBoundingClientRect(), fr = f.getBoundingClientRect(); if (fr.top < lr.top || fr.bottom > lr.bottom) lista.scrollTop += fr.top - lr.top - lr.height * 0.35; }
    }
    function filaPorI(i) { return filas[i]; }
    function siguiente() {
      var r = objetivo.fila;
      if (objetivo.que === 'ini' && necesitaFin(r)) { objetivo = { fila: r, que: 'fin' }; return; }
      var k = visibles.indexOf(r);
      objetivo = { fila: visibles[Math.min(visibles.length - 1, k + 1)], que: 'ini' };
      if (k === visibles.length - 1) objetivo.fin = true;
    }
    function hacerMarca() {
      var r = objetivo.fila; if (!r) return;
      var t = Math.round((el.currentTime || 0) * 10) / 10;
      if (objetivo.que === 'fin') r.fin = t; else r.t = t;
      cambios = true;
      var ultima = visibles.indexOf(r) === visibles.length - 1 && (objetivo.que === 'fin' || !necesitaFin(r));
      siguiente(); pintarLista(); enfocarFila();
      if (ultima) ui().aviso('Marcaste el último ' + (s === 'citas' ? 'tramo' : 'bloque'));
    }
    function ajustar(delta) {
      var r = objetivo.fila; if (!r) return;
      var cual = objetivo.que === 'fin' && r.fin != null ? 'fin' : (r.t != null ? 't' : null);
      if (!cual) { var ant = visibles[visibles.indexOf(r) - 1]; if (ant && ant.t != null) { r = ant; cual = 't'; } else return; }
      r[cual] = Math.max(0, Math.round((r[cual] + delta) * 10) / 10);
      cambios = true; pintarLista();
      el.currentTime = Math.max(0, r[cual] - 0.4);
    }
    function pintarTiempo() {
      var t = el.currentTime || 0, du = d();
      tEl.textContent = AU.tiempo(t) + dec(t) + ' / ' + AU.tiempo(du);
      if (!arr) rango.value = du ? Math.round(t / du * 1000) : 0;
      bPlay.textContent = el.paused ? '▶' : '❚❚';
      bPlay.setAttribute('aria-label', el.paused ? 'Reproducir' : 'Pausar');
      // fila que suena
      var sonando = null;
      visibles.forEach(function (r) { if (r.t != null && r.t <= t) sonando = r; });
      lista.querySelectorAll('.au-mk__fila.suena').forEach(function (x) { x.classList.remove('suena'); });
      if (sonando) { var fx = lista.querySelector('[data-fila="' + sonando.i + '"]'); if (fx) fx.classList.add('suena'); }
    }
    var arr = false;
    el.addEventListener('timeupdate', pintarTiempo);
    el.addEventListener('play', pintarTiempo); el.addEventListener('pause', pintarTiempo);
    el.addEventListener('loadedmetadata', function () { if (!a.duracion || Math.abs(a.duracion - el.duration) > 1) { a.duracion = Math.round(el.duration * 10) / 10; cambios = true; } pintarTiempo(); });
    el.addEventListener('error', function () { tEl.textContent = 'No se pudo abrir el audio'; });
    rango.addEventListener('input', function () { arr = true; });
    rango.addEventListener('change', function () { arr = false; el.currentTime = rango.value / 1000 * d(); });
    cuerpo.querySelector('.au-mk__vel').onchange = function () { el.playbackRate = +this.value; };

    cuerpo.addEventListener('click', function (ev) {
      var b = ev.target.closest('button');
      var fila = ev.target.closest('[data-fila]');
      if (b) {
        var ac = b.getAttribute('data-a');
        if (ac === 'play') { if (el.paused) el.play().catch(function () { ui().aviso('No se pudo reproducir el audio', 'error'); }); else el.pause(); return; }
        if (ac === '-5' || ac === '+5') { el.currentTime = Math.max(0, el.currentTime + (+ac)); return; }
        if (ac === 'marcar') return hacerMarca();
        if (ac === '-0.5' || ac === '+0.5') return ajustar(+ac);
        if (ac === 'revisado') { a.revisar = false; cambios = true; b.parentNode.remove(); return; }
        if (b.hasAttribute('data-ir')) {
          var r = filaPorI(+b.getAttribute('data-ir')), cual = b.getAttribute('data-cual');
          objetivo = { fila: r, que: cual === 'fin' ? 'fin' : 'ini' };
          var tt = cual === 'fin' ? r.fin : r.t;
          if (tt != null) { el.currentTime = Math.max(0, tt - (cual === 'fin' ? 2 : 0)); if (el.paused) el.play().catch(function () { /* nada */ }); }
          pintarLista(); return;
        }
        if (b.hasAttribute('data-borrar')) {
          var rb = filaPorI(+b.getAttribute('data-borrar')); rb.t = null; rb.fin = null; cambios = true;
          objetivo = { fila: rb, que: 'ini' }; pintarLista(); return;
        }
        return;
      }
      if (fila && !ev.target.closest('select')) { objetivo = { fila: filaPorI(+fila.getAttribute('data-fila')), que: 'ini' }; pintarLista(); }
    });
    cuerpo.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.hasAttribute('data-fila-voz')) { var r = filaPorI(+t.getAttribute('data-fila-voz')); r.v = +t.value; if (!r.v) r.fin = null; cambios = true; pintarLista(); }
    });
    function tecla(ev) {
      if (!document.body.contains(cuerpo)) return;
      var t = ev.target;
      if (t.closest && t.closest('input:not([type="range"]), select, textarea')) return;
      if (ev.key === ' ' || ev.code === 'Space') { ev.preventDefault(); hacerMarca(); return; }
      if (ev.key === 'ArrowLeft' && !t.closest('input')) { ev.preventDefault(); el.currentTime = Math.max(0, el.currentTime - 5); }
      if (ev.key === 'ArrowRight' && !t.closest('input')) { ev.preventDefault(); el.currentTime = el.currentTime + 5; }
    }
    document.addEventListener('keydown', tecla, true);
    pintarLista(); pintarTiempo();
    setTimeout(function () { enfocarFila(); bMarcar.focus({ preventScroll: true }); }, 60);

    function guardar() {
      a.marcas = filas.map(function (r) {
        var m = { h: r.f.h, p: r.f.p };
        if (r.t != null) m.t = r.t;
        if (r.fin != null && admiteFin(r)) m.f = r.fin;
        if (r.v && r.f.cita) m.v = r.v;
        return m;
      });
      delete a.revisar;
      api.poner(a);
      ui().aviso('Marcas guardadas');
    }
    function cerrarAudio() { document.removeEventListener('keydown', tecla, true); el.pause(); el.removeAttribute('src'); try { el.load(); } catch (x) { /* nada */ } }
    return ui().ventana({
      titulo: 'Marcar tiempos · ' + AU.NOMBRE_SINC[s].toLowerCase(), cuerpo: cuerpo, clase: 'a-ventana--ancha au-ventana au-ventana--marcar',
      botones: [{ texto: 'Cancelar', valor: 'cancelar' }, { texto: 'Guardar marcas', valor: 'guardar', tipo: 'primario' }]
    }).then(function (v) {
      cerrarAudio();
      if (v === 'guardar') return guardar();
      if (v === null && cambios) {
        return ui().confirmar('Guardar las marcas', 'Cerraste la ventana con marcas sin guardar. ¿Las guardas?', 'Guardar').then(function (si) { if (si) guardar(); });
      }
    });
  }

  /* Aviso antes de publicar (texto para la confirmación; vacío si todo está bien) */
  function avisoPublicar(api) {
    var a = api.audio();
    if (!api.conColumna || !AU.tiene(a)) return '';
    var s = AU.sinc(a), r = AU.resumen(a, bloquesDe(api).map(AU.firma)), l = [];
    if (!a.duracion) l.push('no se ha podido leer la duración del audio');
    if (s === 'completa' && r.faltan) l.push(r.faltan + (r.faltan === 1 ? ' bloque no tiene' : ' bloques no tienen') + ' marca de tiempo (comparten el tiempo del anterior)');
    if (s === 'citas' && r.citasMarcadas < r.citas) l.push((r.citas - r.citasMarcadas) + (r.citas - r.citasMarcadas === 1 ? ' cita no tiene' : ' citas no tienen') + ' su tramo marcado');
    if (a.revisar && s !== 'no') l.push('reemplazaste el audio y no has revisado las marcas');
    return l.length ? '<br><br><strong>Audio:</strong> ' + esc(l.join('; ')) + '.' : '';
  }

  RA.audioAdmin = {
    seccionHTML: seccionHTML,
    avisoPublicar: avisoPublicar,
    accion: function (k, api) {
      if (k === 'editar') return editar(api);
      if (k === 'marcar') return marcar(api);
      if (k === 'quitar') return ui().confirmar('Quitar el audio', 'La entrada dejará de tener audio y se borrarán sus marcas de tiempo. El archivo no se borra de su repositorio.', 'Quitar', true)
        .then(function (si) { if (si) { api.poner(null); ui().aviso('Audio quitado'); } });
    },
    medir: medir
  };
})();
