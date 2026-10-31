/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · editor de entradas (al estilo Substack)
   · Guardado automático. Un borrador se guarda directo en la entrada;
     una entrada publicada guarda sus cambios en una copia de trabajo
     privada, hasta que se pulsa «Publicar cambios».
   · Si falla la conexión, los cambios quedan respaldados en este navegador.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  function A() { return RA.admin; }
  function ui() { return RA.ui; }

  /* ── Limpieza del HTML ────────────────────────────────────────────── */
  var PERMITIDAS = { P: 1, H2: 1, H3: 1, STRONG: 1, EM: 1, U: 1, S: 1, SUP: 1, SUB: 1, A: 1, UL: 1, OL: 1, LI: 1,
    BLOCKQUOTE: 1, CITE: 1, HR: 1, FIGURE: 1, IMG: 1, FIGCAPTION: 1, ASIDE: 1, BR: 1 };
  var RENOMBRAR = { B: 'STRONG', I: 'EM', H1: 'H2', H4: 'H3', H5: 'H3', H6: 'H3', DIV: 'P', SECTION: 'P', ARTICLE: 'P', HEADER: 'P', FOOTER: 'P' };
  var BLOQUE = /^(P|H2|H3|UL|OL|BLOCKQUOTE|HR|FIGURE|ASIDE)$/;
  var FUERA = 'script,style,button,input,select,textarea,iframe,object,embed,svg,video,audio,form,meta,link,noscript,template,.ed-quitar';

  function renombrar(el, tag) {
    var n = el.ownerDocument.createElement(tag);
    while (el.firstChild) n.appendChild(el.firstChild);
    el.parentNode.replaceChild(n, el);
    return n;
  }
  function desenvolver(el) {
    var p = el.parentNode;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  }
  function vacio(el) { return !el.textContent.replace(/[\s ​]/g, '') && !el.querySelector('img,hr'); }

  RA.limpiarEditor = function (html) {
    var doc = new DOMParser().parseFromString('<div id="r">' + String(html || '') + '</div>', 'text/html');
    var raiz = doc.getElementById('r');
    raiz.querySelectorAll(FUERA).forEach(function (x) { x.remove(); });
    (function recorrer(nodo) {
      [].slice.call(nodo.childNodes).forEach(function (h) {
        if (h.nodeType === 8) { h.remove(); return; }
        if (h.nodeType !== 1) return;
        var tag = h.tagName;
        if (RENOMBRAR[tag]) {
          // un DIV dentro de un párrafo o de una lista no se vuelve párrafo: se desenvuelve
          if (tag === 'DIV' && nodo !== raiz && !/^(BLOCKQUOTE|ASIDE)$/.test(nodo.tagName)) { recorrer(h); desenvolver(h); return; }
          h = renombrar(h, RENOMBRAR[tag]); tag = h.tagName;
        }
        recorrer(h);
        if (!PERMITIDAS[tag]) { desenvolver(h); return; }
        var guardar = {};
        if (tag === 'A') { var href = h.getAttribute('href') || ''; if (/^(https?:|mailto:|#)/i.test(href)) guardar.href = href; }
        if (tag === 'IMG') {
          var src = h.getAttribute('src') || '';
          if (!/^(https?:|\.{0,2}\/)/i.test(src)) { h.remove(); return; }
          guardar.src = src; guardar.alt = h.getAttribute('alt') || '';
        }
        if (tag === 'BLOCKQUOTE') {   // estilos de cita (A-05)
          var cl = String(h.className || '').split(/\s+/).filter(function (c) { return RA.CLASES_CITA.indexOf(c) >= 0; })[0];
          if (cl) guardar['class'] = cl;
        }
        if (tag === 'ASIDE') guardar['class'] = 'nota';
        if (tag === 'SUP' && /\bnp\b/.test(h.className)) { guardar['class'] = 'np'; h.textContent = ''; }   // marca de nota al pie (A-03)
        if (tag === 'OL' && /\bnotas-pie\b/.test(h.className)) guardar['class'] = 'notas-pie' + (/\bnumeros\b/.test(h.className) ? ' numeros' : '');
        [].slice.call(h.attributes).forEach(function (at) { h.removeAttribute(at.name); });
        Object.keys(guardar).forEach(function (k) { h.setAttribute(k, guardar[k]); });
        if (tag === 'A' && !guardar.href) desenvolver(h);
      });
    })(raiz);
    // Figuras: solo imagen y pie
    raiz.querySelectorAll('figure').forEach(function (f) {
      var img = f.querySelector('img');
      if (!img) { f.remove(); return; }
      var pie = f.querySelector('figcaption');
      var texto = pie ? pie.innerHTML.trim() : '';
      f.innerHTML = '';
      f.appendChild(img);
      if (pie && vacio(pie) === false) { var c = doc.createElement('figcaption'); c.innerHTML = texto; f.appendChild(c); }
    });
    // Imágenes sueltas: pasan a figura
    raiz.querySelectorAll('img').forEach(function (img) {
      if (img.parentNode.tagName === 'FIGURE') return;
      var f = doc.createElement('figure');
      var bloque = img; while (bloque.parentNode !== raiz) bloque = bloque.parentNode;
      img.remove(); f.appendChild(img);
      raiz.insertBefore(f, bloque.nextSibling);
    });
    raiz.querySelectorAll('cite').forEach(function (c) { if (vacio(c)) c.remove(); });
    raiz.querySelectorAll('strong,em,u,s,sup:not(.np),sub,a').forEach(function (x) { if (!x.textContent && !x.querySelector('br')) x.remove(); });
    // Texto suelto en la raíz: a un párrafo
    var suelto = null;
    [].slice.call(raiz.childNodes).forEach(function (h) {
      var esBloque = h.nodeType === 1 && BLOQUE.test(h.tagName);
      if (esBloque) { suelto = null; return; }
      if (h.nodeType === 3 && !h.nodeValue.trim() && !suelto) { h.remove(); return; }
      if (h.nodeType === 1 && h.tagName === 'BR' && !suelto) { h.remove(); return; }
      if (!suelto) { suelto = doc.createElement('p'); raiz.insertBefore(suelto, h); }
      suelto.appendChild(h);
    });
    // Citas y notas: su contenido va en párrafos
    raiz.querySelectorAll('blockquote, aside').forEach(function (b) {
      var s = null;
      [].slice.call(b.childNodes).forEach(function (h) {
        if (h.nodeType === 1 && /^(P|CITE|UL|OL)$/.test(h.tagName)) { s = null; return; }
        if (h.nodeType === 3 && !h.nodeValue.trim()) { h.remove(); return; }
        if (!s) { s = doc.createElement('p'); b.insertBefore(s, h); }
        s.appendChild(h);
      });
      if (vacio(b)) b.remove();
    });
    raiz.querySelectorAll('li').forEach(function (li) { if (vacio(li)) li.remove(); });
    raiz.querySelectorAll('ul,ol').forEach(function (l) { if (!l.querySelector('li')) l.remove(); });
    // Párrafos vacíos: nunca dos seguidos ni en las puntas
    [].slice.call(raiz.children).forEach(function (el) {
      if (/^(P|H2|H3)$/.test(el.tagName) && vacio(el)) {
        var prev = el.previousElementSibling;
        if (el.tagName !== 'P' || !prev || (prev.tagName === 'P' && vacio(prev))) el.remove();
        else el.innerHTML = '<br>';
      }
    });
    while (raiz.lastElementChild && raiz.lastElementChild.tagName === 'P' && vacio(raiz.lastElementChild)) raiz.lastElementChild.remove();
    return raiz.innerHTML.replace(/​/g, '').replace(/&nbsp;/g, ' ').replace(/ {2,}/g, ' ');
  };
  RA.contarPalabras = function (html) {
    var d = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    var m = (d.body.textContent || '').match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu);
    return m ? m.length : 0;
  };
  /* «Día 8: Título» → {numero: 8, titulo: 'Título'} */
  RA.separarDia = function (t) {
    var m = String(t || '').match(/^\s*D[ií]a\s+(\d{1,3})\s*[:.\-–—]\s*(.+)$/i);
    if (!m) return { numero: null, titulo: String(t || '').trim() };
    var tit = m[2].trim();
    return { numero: +m[1], titulo: tit.charAt(0).toUpperCase() + tit.slice(1) };
  };
  RA.minutosDe = function (palabras) { return Math.max(1, Math.ceil((palabras || 0) / 230)); };

  /* Texto de una nota al pie: párrafos con negrita, cursiva y enlaces */
  RA.limpiarNota = function (html) {
    var d = document.createElement('div');
    d.innerHTML = RA.limpiarEditor(html || '');
    [].slice.call(d.children).forEach(function (b) {
      if (b.tagName === 'P') return;
      if (/^(FIGURE|HR)$/.test(b.tagName)) { b.remove(); return; }
      var partes = /^(UL|OL)$/.test(b.tagName) ? [].slice.call(b.querySelectorAll('li')) :
        /^(BLOCKQUOTE|ASIDE)$/.test(b.tagName) ? [].slice.call(b.children) : [b];
      partes.forEach(function (x) { var p = document.createElement('p'); p.innerHTML = x.innerHTML; d.insertBefore(p, b); });
      b.remove();
    });
    d.querySelectorAll('u,s,sup,sub,cite,h2,h3,li,ul,ol').forEach(desenvolver);
    d.querySelectorAll('p').forEach(function (p) { if (vacio(p)) p.remove(); });
    return d.innerHTML.trim();
  };
  var contadorNp = 0;
  function idNota() { return 'np' + Date.now().toString(36) + (contadorNp++); }
  function pastillaHTML(id) { return '<span class="ed-np" contenteditable="false" data-np="' + id + '" role="button" tabindex="-1"></span>'; }
  function placeholderCita(q) { return /\btestimonio\b/.test(q.className) ? 'Nombre · rol, lugar' : 'Autor, obra, página (opcional)'; }

  /* HTML guardado → HTML para editar (figuras con pie editable y botón para quitar).
     notas (opcional): recibe las notas al pie {lista: {id: html}, estilo}; las marcas pasan a pastillas. */
  function paraEditar(html, notas) {
    var d = document.createElement('div');
    d.innerHTML = RA.limpiarEditor(html || '');   // limpio antes de tocar el DOM (sin atributos peligrosos)
    if (notas) {
      var ol = [].slice.call(d.querySelectorAll('ol.notas-pie')).pop();
      var textos = ol ? [].slice.call(ol.children).map(function (li) { return RA.limpiarNota(li.innerHTML); }) : [];
      if (ol) { if (/\bnumeros\b/.test(ol.className)) notas.estilo = 'numeros'; ol.remove(); }
      [].slice.call(d.querySelectorAll('sup.np')).forEach(function (sp, i) {
        if (i >= textos.length) { sp.remove(); return; }
        var id = idNota(); notas.lista[id] = textos[i];
        var t = document.createElement('div'); t.innerHTML = pastillaHTML(id);
        sp.replaceWith(t.firstChild);
      });
    }
    d.querySelectorAll('figure').forEach(function (f) {
      f.setAttribute('contenteditable', 'false');
      var pie = f.querySelector('figcaption');
      if (!pie) { pie = document.createElement('figcaption'); f.appendChild(pie); }
      pie.setAttribute('contenteditable', 'true');
      pie.setAttribute('data-placeholder', 'Escribe el pie de foto…');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ed-quitar'; b.setAttribute('aria-label', 'Quitar la imagen'); b.textContent = '×';
      f.appendChild(b);
    });
    d.querySelectorAll('blockquote').forEach(function (q) {
      var c = q.querySelector('cite');
      if (!c) { c = document.createElement('cite'); q.appendChild(c); }
      c.setAttribute('data-placeholder', placeholderCita(q));
    });
    if (!d.innerHTML.trim()) d.innerHTML = '<p><br></p>';
    return d.innerHTML;
  }

  /* ══ Abrir el editor ═════════════════════════════════════════════ */
  RA.editor = {};
  RA.editor.abrir = function (id) {
    var P = A().principal;
    P.innerHTML = '<div class="a-pagina"><p class="a-cargando">Abriendo…</p></div>';
    Promise.all([RA.adm.entrada(id), A().recargar(), RA.adm.reaccionesDe(id), RA.adm.tipos().catch(function () { return []; }),
      RA.adm.sellos().catch(function () { return null; })])
      .then(function (r) {
        if (!r[0]) { P.innerHTML = '<div class="a-pagina"><p class="a-vacio">Esta entrada no existe. <a href="#/">Volver</a></p></div>'; return; }
        var deLista = (A().entradas || []).filter(function (x) { return x.id === id; })[0];
        if (deLista && deLista.n_apunte) r[0].n_apunte = deLista.n_apunte;
        montar(r[0], r[2], r[3], r[4]);
      }).catch(function (e) { console.error(e); ui().aviso('No se pudo abrir: ' + e.message, 'error'); });
  };

  function montar(e, reacciones, tipos, sellos) {
    var P = A().principal, T = A().tema;
    var vig = A().vigente(e);
    var st = {
      e: e, version: 0, guardada: 0, guardando: false, t: null, error: false,
      campos: {}, rel: (e.relacionadas || []).slice(), refs: (e.referentes || []).slice(),
      notas: (e.notas || []).slice(), reacciones: reacciones || [], tipos: tipos || [], refInfo: {},
      ultimo: e.trabajo ? null : e.actualizado_en, rango: null, vivo: true,
      np: { lista: {}, estilo: 'simbolos' },   // notas al pie: texto de cada una y estilo de las marcas
      sellos: sellos   // null = falta el SQL 06
    };
    // El sello del apunte se guarda solo si la base ya tiene la columna (SQL 06)
    RA.adm.EDITABLES.concat('sello_id' in e ? ['sello_id'] : []).forEach(function (k) { st.campos[k] = vig[k]; });
    var CLAVE_RESPALDO = 'respaldo:' + e.id;
    document.title = (vig.titulo || 'Sin título') + ' · Editor';

    P.innerHTML =
      '<div class="ed">' +
        '<div class="ed-barra"><a class="ed-volver" href="#/">← Entradas</a><span class="ed-estado" aria-live="polite"></span>' +
          '<span class="ed-acciones"><button type="button" class="a-boton" data-a="vista">Vista previa</button>' +
          '<button type="button" class="a-boton a-boton--primario" data-a="publicar"></button>' +
          '<button type="button" class="a-boton a-boton--icono" data-a="mas" aria-label="Más acciones" aria-haspopup="menu">···</button></span></div>' +
        '<div class="ed-zona">' +
          '<div class="ed-hoja">' +
            '<div class="ed-herramientas" role="toolbar" aria-label="Formato">' +
              '<select class="ed-sel" data-h="bloque" aria-label="Tipo de bloque"><option value="p">Párrafo</option><option value="h2">Subtítulo</option><option value="h3">Subtítulo menor</option></select>' +
              herr('negrita', '<b>B</b>', 'Negrita (⌘B)') + herr('cursiva', '<i>I</i>', 'Cursiva (⌘I)') + herr('enlace', 'Enlace', 'Enlace (⌘K)') +
              '<span class="ed-sep"></span>' +
              herr('cita', 'Cita ▾', 'Cita: elige el estilo') + herr('separador', '· · ·', 'Separador') +
              herr('lista', 'Lista', 'Lista con viñetas') +
              '<span class="ed-sep"></span>' +
              herr('notapie', 'Nota al pie', 'Nota al pie (en el cursor)') +
              '<span class="ed-sep"></span>' +
              herr('imagen', 'Imagen', 'Imagen con pie de foto') + herr('nota', 'Recuadro', 'Recuadro: nota del autor dentro del texto (se publica)') + herr('importar', 'Importar .docx', 'Importar .docx, .md o .txt') +
            '</div>' +
            '<div class="ed-papel">' +
              '<div class="ed-aviso-respaldo" hidden></div>' +
              '<textarea class="ed-titulo" rows="1" placeholder="Título" aria-label="Título"></textarea>' +
              '<textarea class="ed-entradilla" rows="1" placeholder="Entradilla opcional: una línea que aparece bajo el título…" aria-label="Entradilla"></textarea>' +
              '<div class="ed-texto cuerpo" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto de la entrada" spellcheck="true" lang="es"></div>' +
              '<p class="ed-conteo"></p>' +
            '</div>' +
          '</div>' +
          '<aside class="ed-panel" aria-label="Ajustes de la entrada"></aside>' +
        '</div>' +
      '</div>';

    var raiz = P.querySelector('.ed'), titulo = raiz.querySelector('.ed-titulo'), entradilla = raiz.querySelector('.ed-entradilla');
    var texto = raiz.querySelector('.ed-texto'), panel = raiz.querySelector('.ed-panel'), estadoEl = raiz.querySelector('.ed-estado');
    var botonPublicar = raiz.querySelector('[data-a="publicar"]'), conteo = raiz.querySelector('.ed-conteo');

    titulo.value = vig.titulo || '';
    entradilla.value = vig.entradilla || '';
    texto.innerHTML = paraEditar(vig.cuerpo_html, st.np);
    pintarPastillas();
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, false); } catch (x) { /* nada */ }
    autoAlto(titulo); autoAlto(entradilla);

    function herr(k, html, etiqueta) {
      return '<button type="button" class="ed-herr" data-h="' + k + '" aria-label="' + etiqueta + '" title="' + etiqueta + '">' + html + '</button>';
    }
    function autoAlto(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

    /* ── Estado y guardado ─────────────────────────────────────────── */
    function publicada() { return st.e.estado === 'publicado'; }
    function pintarEstado() {
      var txt;
      if (st.guardando) txt = 'Guardando…';
      else if (st.error) txt = 'Sin conexión: tus cambios quedan en este navegador y se reintenta';
      else if (st.version > st.guardada) txt = 'Cambios sin guardar';
      else if (publicada() && st.e.trabajo) txt = 'Publicada · cambios sin publicar' + (st.ultimo ? ', guardados ' + ui().fecha(st.ultimo) : '');
      else if (publicada()) txt = 'Publicada · al día';
      else txt = 'Borrador' + (st.ultimo ? ' · guardado ' + ui().fecha(st.ultimo) : '');
      estadoEl.textContent = txt;
      estadoEl.className = 'ed-estado' + (st.error ? ' con-error' : '');
      if (!publicada()) { botonPublicar.textContent = 'Publicar'; botonPublicar.disabled = false; }
      else if (st.e.trabajo || st.version > st.guardada) { botonPublicar.textContent = 'Publicar cambios'; botonPublicar.disabled = false; }
      else { botonPublicar.textContent = 'Publicada ✓'; botonPublicar.disabled = true; }
      var pal = st.campos.palabras || 0;
      conteo.textContent = ui().numero(pal) + (pal === 1 ? ' palabra' : ' palabras') + ' · ' + RA.minutosDe(pal) + ' min de lectura';
    }
    var reloj = setInterval(function () { if (st.vivo) pintarEstado(); }, 30000);

    function recoger() {
      var c = st.campos;
      c.titulo = titulo.value.replace(/\s+/g, ' ').trim();
      c.entradilla = entradilla.value.replace(/\s+/g, ' ').trim();
      c.cuerpo_html = cuerpoConNotas();
      c.palabras = RA.contarPalabras(c.cuerpo_html);
      c.minutos = RA.minutosDe(c.palabras);
      return Object.assign({}, c);
    }
    function cambio() {
      st.version++;
      st.campos.palabras = RA.contarPalabras(texto.innerHTML);
      pintarEstado();
      try { RA.guardado.escribir(CLAVE_RESPALDO, { t: Date.now(), campos: recoger() }); } catch (x) { /* nada */ }
      clearTimeout(st.t);
      st.t = setTimeout(guardar, 1200);
    }
    function guardar() {
      clearTimeout(st.t);
      if (st.version === st.guardada) return Promise.resolve();
      if (st.guardando) return st.promesa;
      var v = st.version, campos = recoger();
      st.guardando = true; pintarEstado();
      var p;
      if (!publicada()) {
        var nuevo = RA.adm.slugLibre(Object.assign({ id: st.e.id }, campos), A().entradas);
        if (nuevo !== st.e.slug) campos.slug = nuevo;
        p = RA.adm.guardarEntrada(st.e.id, campos).then(function (r) {
          if (campos.slug) st.e.slug = campos.slug;
          Object.assign(st.e, campos);
          return r;
        });
      } else {
        p = RA.adm.guardarTrabajo(st.e.id, campos).then(function (r) { st.e.trabajo = campos; return r; });
      }
      st.promesa = p.then(function (r) {
        st.guardando = false; st.error = false; st.guardada = v; st.ultimo = (r && r.actualizado_en) || new Date().toISOString();
        if (st.version === v) RA.guardado.borrar(CLAVE_RESPALDO);
        pintarEstado(); pintarPanel();
        if (st.version > v) st.t = setTimeout(guardar, 400);
      }).catch(function (err) {
        console.error(err);
        st.guardando = false; st.error = true; pintarEstado();
        st.t = setTimeout(guardar, 5000);
      });
      return st.promesa;
    }
    A().antesDeSalir = function () { return guardar(); };

    /* Respaldo local más nuevo que lo guardado en el servidor */
    (function () {
      var r = RA.guardado.leer(CLAVE_RESPALDO, null);
      var servidor = Date.parse(st.e.actualizado_en || 0);
      if (!r || !r.campos || r.t <= servidor + 2000) { if (r) RA.guardado.borrar(CLAVE_RESPALDO); return; }
      var av = raiz.querySelector('.ed-aviso-respaldo');
      av.hidden = false;
      av.innerHTML = 'Hay cambios de ' + esc(ui().fecha(new Date(r.t).toISOString())) + ' guardados en este navegador que no llegaron al servidor. ' +
        '<button type="button" class="a-boton a-boton--primario" data-r="si">Recuperarlos</button> <button type="button" class="a-boton" data-r="no">Descartar</button>';
      av.querySelector('[data-r="si"]').onclick = function () {
        var c = r.campos;
        Object.keys(c).forEach(function (k) { st.campos[k] = c[k]; });
        st.np.lista = {};
        titulo.value = c.titulo || ''; entradilla.value = c.entradilla || ''; texto.innerHTML = paraEditar(c.cuerpo_html, st.np); pintarPastillas();
        autoAlto(titulo); autoAlto(entradilla); av.hidden = true; pintarPanel(); cambio();
      };
      av.querySelector('[data-r="no"]').onclick = function () { RA.guardado.borrar(CLAVE_RESPALDO); av.hidden = true; };
    })();

    /* ── Publicar y otras acciones ──────────────────────────────────── */
    botonPublicar.onclick = function () {
      guardar().then(function () {
        var c = recoger();
        if (!c.titulo) { ui().aviso('Ponle un título antes de publicar', 'error'); titulo.focus(); return; }
        if (c.palabras < 1) { ui().aviso('La entrada no tiene texto', 'error'); texto.focus(); return; }
        var otro = c.tipo === 'capitulo' && A().entradas.filter(function (x) {
          return x.id !== st.e.id && x.estado === 'publicado' && x.tipo === 'capitulo' && A().vigente(x).numero === c.numero;
        })[0];
        var ya = publicada();
        return ui().confirmar(ya ? 'Publicar los cambios' : 'Publicar la entrada',
          (ya ? 'Los lectores verán la versión nueva de «' + esc(c.titulo) + '».' : '«' + esc(c.titulo) + '» quedará visible para todos en el sitio.') +
          (otro ? '<br><br><strong>Ojo:</strong> ya hay otro Día ' + c.numero + ' publicado («' + esc(A().vigente(otro).titulo) + '»).' : ''),
          ya ? 'Publicar cambios' : 'Publicar').then(function (si) {
          if (!si) return;
          var campos = recoger();
          if (!ya) campos.slug = RA.adm.slugLibre(Object.assign({ id: st.e.id }, campos), A().entradas);
          return RA.adm.publicar(st.e.id, campos, ya).then(function () {
            Object.assign(st.e, campos, { estado: 'publicado', trabajo: null });
            if (!ya) st.e.publicado_en = new Date().toISOString();
            st.guardada = st.version; RA.guardado.borrar(CLAVE_RESPALDO);
            ui().aviso(ya ? 'Cambios publicados' : 'Publicada');
            pintarEstado(); pintarPanel(); A().recargar();
          });
        });
      }).catch(function (err) { ui().aviso('No se pudo publicar: ' + err.message, 'error'); });
    };
    raiz.querySelector('[data-a="vista"]').onclick = function () {
      var ventana = window.open('', '_blank');
      guardar().then(function () {
        var url = '../index.html#/vista/' + st.e.id;
        if (ventana) ventana.location.href = url; else window.open(url, '_blank');
      });
    };
    raiz.querySelector('[data-a="mas"]').onclick = function (ev) {
      var b = ev.currentTarget;
      var opciones = [];
      if (publicada() && st.e.trabajo) opciones.push(['descartar', 'Descartar los cambios sin publicar']);
      if (publicada()) opciones.push(['despublicar', 'Despublicar (vuelve a borrador)']);
      opciones.push(['eliminar', 'Eliminar la entrada']);
      menu(b, opciones, function (k) {
        if (k === 'descartar') ui().confirmar('Descartar cambios', 'Se perderán los cambios hechos desde la última publicación.', 'Descartar', true).then(function (si) {
          if (!si) return;
          clearTimeout(st.t);
          RA.adm.descartarTrabajo(st.e.id).then(function () { RA.guardado.borrar(CLAVE_RESPALDO); RA.editor.abrir(st.e.id); ui().aviso('Cambios descartados'); });
        });
        if (k === 'despublicar') ui().confirmar('Despublicar', '«' + esc(st.campos.titulo) + '» dejará de verse en el sitio. Los cambios sin publicar se conservan en el borrador.', 'Despublicar', true).then(function (si) {
          if (!si) return;
          guardar().then(function () {
            return RA.adm.despublicar(st.e.id, recoger());
          }).then(function () { ui().aviso('Ahora es un borrador'); RA.editor.abrir(st.e.id); })
            .catch(function (err) { ui().aviso('No se pudo: ' + err.message, 'error'); });
        });
        if (k === 'eliminar') ui().confirmar('Eliminar la entrada', 'Se borrarán «' + esc(st.campos.titulo || 'Sin título') + '», sus imágenes, sus notas privadas y sus reacciones. No se puede deshacer.', 'Eliminar', true).then(function (si) {
          if (!si) return;
          clearTimeout(st.t); st.version = st.guardada;
          RA.adm.eliminar(st.e.id).then(function () { RA.guardado.borrar(CLAVE_RESPALDO); ui().aviso('Entrada eliminada'); location.hash = '#/'; })
            .catch(function (err) { ui().aviso('No se pudo eliminar: ' + err.message, 'error'); });
        });
      });
    };
    function menu(ancla, opciones, alElegir) {
      var viejo = document.querySelector('.a-menu'); if (viejo) { viejo.remove(); return; }
      var m = document.createElement('div'); m.className = 'a-menu'; m.setAttribute('role', 'menu');
      m.innerHTML = opciones.map(function (o) { return '<button type="button" role="menuitem" data-k="' + o[0] + '"' + (o[0] === 'eliminar' ? ' class="peligro"' : '') + '>' + esc(o[1]) + '</button>'; }).join('');
      document.body.appendChild(m);
      var r = ancla.getBoundingClientRect();
      m.style.top = (r.bottom + 6) + 'px'; m.style.right = (window.innerWidth - r.right) + 'px';
      m.querySelector('button').focus();
      function cerrar(ev) { if (ev && m.contains(ev.target)) return; m.remove(); document.removeEventListener('mousedown', cerrar); }
      setTimeout(function () { document.addEventListener('mousedown', cerrar); }, 0);
      m.onclick = function (ev) { var b = ev.target.closest('button'); if (!b) return; cerrar(); alElegir(b.getAttribute('data-k')); };
      m.onkeydown = function (ev) { if (ev.key === 'Escape') { cerrar(); ancla.focus(); } };
    }

    /* ── Escritura ─────────────────────────────────────────────────── */
    titulo.addEventListener('input', function () { autoAlto(titulo); cambio(); pintarPortadaMini(); });
    entradilla.addEventListener('input', function () { autoAlto(entradilla); cambio(); });
    titulo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); entradilla.focus(); } });
    entradilla.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); ponerCursorAlInicio(); } });
    texto.addEventListener('input', function () {
      if (!texto.innerHTML.trim() || texto.innerHTML === '<br>') texto.innerHTML = '<p><br></p>';
      pintarPastillas();
      cambio();
    });
    function ponerCursorAlInicio() {
      texto.focus();
      var r = document.createRange(); r.setStart(texto.firstChild || texto, 0); r.collapse(true);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }

    // Recordar la selección dentro del texto (la barra de herramientas la necesita)
    function alSeleccionar() {
      var s = getSelection();
      if (s.rangeCount && texto.contains(s.getRangeAt(0).commonAncestorContainer)) {
        st.rango = s.getRangeAt(0).cloneRange();
        var b = bloqueActual();
        raiz.querySelector('[data-h="bloque"]').value = b && /^H[23]$/.test(b.tagName) ? b.tagName.toLowerCase() : 'p';
      }
    }
    document.addEventListener('selectionchange', alSeleccionar);
    function restaurar() {
      texto.focus({ preventScroll: true });
      if (st.rango) { var s = getSelection(); s.removeAllRanges(); s.addRange(st.rango); }
    }
    function bloqueActual() {
      var r = st.rango; if (!r) return null;
      var n = r.startContainer; if (n.nodeType !== 1) n = n.parentNode;
      while (n && n !== texto && n.parentNode !== texto) n = n.parentNode;
      return n && n !== texto ? n : null;
    }
    function bloqueInterno() {
      var r = st.rango; if (!r) return null;
      var n = r.startContainer; if (n.nodeType !== 1) n = n.parentNode;
      return n.closest ? n.closest('p,h2,h3,li') : null;
    }

    /* Barra de herramientas */
    raiz.querySelector('.ed-herramientas').addEventListener('mousedown', function (ev) { if (ev.target.closest('.ed-herr')) ev.preventDefault(); });
    raiz.querySelector('[data-h="bloque"]').onchange = function () {
      var v = this.value; restaurar();
      var dentro = bloqueInterno();
      if (dentro && dentro.closest('blockquote,aside')) envolverEn(dentro.closest('blockquote,aside'), null);
      document.execCommand('formatBlock', false, v);
      cambio();
    };
    raiz.querySelector('.ed-herramientas').addEventListener('click', function (ev) {
      var b = ev.target.closest('.ed-herr'); if (!b) return;
      var h = b.getAttribute('data-h');
      if (h === 'imagen') return elegirArchivo('image/*', false, function (fs) { restaurar(); insertarImagenes(fs); });
      if (h === 'importar') return elegirArchivo('.docx,.md,.markdown,.txt', false, function (fs) { importar(fs[0]); });
      if (h === 'cita') return menuCita(b);
      if (h === 'notapie') return nuevaNota();
      restaurar();
      if (h === 'negrita') document.execCommand('bold');
      if (h === 'cursiva') document.execCommand('italic');
      if (h === 'lista') document.execCommand('insertUnorderedList');
      if (h === 'enlace') return pedirEnlace();
      if (h === 'nota') alternarEnvoltura('aside', 'nota');
      if (h === 'separador') insertarSeparador();
      cambio();
    });
    texto.addEventListener('keydown', function (ev) {
      var mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === 'k') { ev.preventDefault(); alSeleccionar(); pedirEnlace(); }
    });

    /* Cita destacada, cita en bloque y nota: envuelven el bloque actual (o lo liberan) */
    function alternarEnvoltura(tag, clase) {
      var b = bloqueActual(); if (!b) return;
      var actual = b.tagName === tag.toUpperCase() && (b.className || '') === clase;
      if (/^(BLOCKQUOTE|ASIDE)$/.test(b.tagName)) { envolverEn(b, null); if (actual) return; b = bloqueActual(); }
      if (!b || /^(FIGURE|HR|UL|OL)$/.test(b.tagName)) return;
      var w = document.createElement(tag);
      if (clase) w.className = clase;
      texto.insertBefore(w, b);
      var p = b.tagName === 'P' ? b : renombrar(b, 'P');
      w.appendChild(p);
      if (tag === 'blockquote') { var c = document.createElement('cite'); w.appendChild(c); c.setAttribute('data-placeholder', placeholderCita(w)); }
      var r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); st.rango = r.cloneRange();
    }
    function envolverEn(w) {   // libera el contenido de una cita o nota
      var primero = null;
      [].slice.call(w.childNodes).forEach(function (h) {
        if (h.nodeType === 1 && h.tagName === 'CITE') { if (vacio(h)) return; h = renombrar(h, 'P'); }
        texto.insertBefore(h, w); if (!primero) primero = h;
      });
      w.remove();
      if (primero) { var r = document.createRange(); r.selectNodeContents(primero); r.collapse(false); var s = getSelection(); s.removeAllRanges(); s.addRange(r); st.rango = r.cloneRange(); }
    }
    function insertarSeparador() {
      var b = bloqueActual();
      var hr = document.createElement('hr'), p = document.createElement('p'); p.innerHTML = '<br>';
      if (b) { texto.insertBefore(hr, b.nextSibling); texto.insertBefore(p, hr.nextSibling); }
      else { texto.appendChild(hr); texto.appendChild(p); }
      var r = document.createRange(); r.setStart(p, 0); r.collapse(true);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); st.rango = r.cloneRange();
    }

    function pedirEnlace() {
      var r = st.rango;
      var nodo = r && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode);
      var actual = nodo && nodo.closest && nodo.closest('a');
      if (!actual && (!r || r.collapsed)) { ui().aviso('Selecciona primero el texto del enlace'); return; }
      var cuerpo = document.createElement('div');
      cuerpo.innerHTML = '<label class="a-campo">Dirección<input type="url" placeholder="https://…" value="' + esc(actual ? actual.getAttribute('href') : '') + '"></label>';
      var inp = cuerpo.querySelector('input');
      var botones = [{ texto: 'Cancelar', valor: null }];
      if (actual) botones.push({ texto: 'Quitar enlace', valor: 'quitar' });
      botones.push({ texto: 'Aplicar', valor: function () { return 'ok'; }, tipo: 'primario' });
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); cuerpo.closest('.a-ventana').querySelector('.a-boton--primario').click(); } });
      ui().ventana({ titulo: actual ? 'Editar enlace' : 'Añadir enlace', cuerpo: cuerpo, botones: botones }).then(function (v) {
        if (!v) { restaurar(); return; }
        restaurar();
        if (actual) { var rr = document.createRange(); rr.selectNodeContents(actual); var s = getSelection(); s.removeAllRanges(); s.addRange(rr); }
        if (v === 'quitar') document.execCommand('unlink');
        else {
          var url = inp.value.trim();
          if (url && !/^(https?:|mailto:|#)/i.test(url)) url = 'https://' + url;
          if (url) document.execCommand('createLink', false, url);
        }
        cambio();
      });
    }

    /* ── Imágenes ──────────────────────────────────────────────────── */
    function elegirArchivo(accept, multiple, alElegir) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple; inp.hidden = true;
      document.body.appendChild(inp);
      inp.onchange = function () { var f = [].slice.call(inp.files || []); inp.remove(); if (f.length) alElegir(f); };
      inp.click();
    }
    function insertarImagenes(archivos) {
      archivos.filter(function (f) { return /^image\//.test(f.type); }).forEach(function (f) {
        var fig = document.createElement('figure');
        fig.setAttribute('contenteditable', 'false'); fig.className = 'subiendo';
        fig.innerHTML = '<div class="ed-subiendo">Subiendo ' + esc(f.name || 'imagen') + '…</div>';
        var b = bloqueActual();
        if (b && b.parentNode === texto) texto.insertBefore(fig, b.nextSibling); else texto.appendChild(fig);
        if (!fig.nextElementSibling) { var p = document.createElement('p'); p.innerHTML = '<br>'; texto.appendChild(p); }
        RA.adm.subirImagen(f, 'entradas/' + st.e.id).then(function (r) {
          var tmp = document.createElement('div');
          tmp.innerHTML = paraEditar('<figure><img src="' + esc(r.url) + '" alt=""><figcaption></figcaption></figure>');
          var nueva = tmp.firstChild;
          fig.replaceWith(nueva);
          nueva.querySelector('figcaption').focus();
          cambio();
        }).catch(function (err) {
          fig.remove(); ui().aviso('No se pudo subir la imagen: ' + err.message, 'error');
        });
      });
    }
    texto.addEventListener('click', function (ev) {
      var q = ev.target.closest('.ed-quitar');
      if (q) { ev.preventDefault(); q.closest('figure').remove(); cambio(); }
    });
    texto.addEventListener('paste', function (ev) {
      var dt = ev.clipboardData; if (!dt) return;
      var imgs = [].slice.call(dt.files || []).filter(function (f) { return /^image\//.test(f.type); });
      if (imgs.length) { ev.preventDefault(); alSeleccionar(); insertarImagenes(imgs); return; }
      if (ev.target.closest && ev.target.closest('figcaption, cite')) {   // en pies y autores, solo texto
        ev.preventDefault(); document.execCommand('insertText', false, dt.getData('text/plain').replace(/\s+/g, ' ')); return;
      }
      var html = dt.getData('text/html'), plano = dt.getData('text/plain');
      ev.preventDefault();
      if (html) {
        // Las marcas de nota que vienen de este mismo editor (cortar y pegar) conservan su nota
        var doc = new DOMParser().parseFromString(html.replace(/<!--[\s\S]*?-->/g, ''), 'text/html');
        doc.querySelectorAll('.ed-np[data-np]').forEach(function (x) { x.replaceWith(doc.createTextNode('\uE000' + x.getAttribute('data-np') + '\uE001')); });
        var limpio = RA.limpiarEditor(doc.body.innerHTML).replace(/\uE000([\w-]+)\uE001/g, function (m, id) {
          if (st.np.lista[id] == null) return '';
          if (texto.querySelector('.ed-np[data-np="' + id + '"]')) { var nuevo = idNota(); st.np.lista[nuevo] = st.np.lista[id]; id = nuevo; }   // copia
          return pastillaHTML(id);
        }).replace(/[\uE000\uE001]/g, '');
        document.execCommand('insertHTML', false, limpio);
        pintarPastillas();
      } else if (plano) {
        var partes = plano.replace(/\r\n?/g, '\n').split(/\n{2,}/);
        if (partes.length === 1) document.execCommand('insertText', false, plano);
        else document.execCommand('insertHTML', false, partes.map(function (x) { return '<p>' + esc(x).replace(/\n/g, '<br>') + '</p>'; }).join(''));
      }
      cambio();
    });
    texto.addEventListener('dragover', function (ev) { if (ev.dataTransfer && [].indexOf.call(ev.dataTransfer.types, 'Files') >= 0) { ev.preventDefault(); texto.classList.add('soltando'); } });
    texto.addEventListener('dragleave', function () { texto.classList.remove('soltando'); });
    texto.addEventListener('drop', function (ev) {
      texto.classList.remove('soltando');
      var fs = [].slice.call((ev.dataTransfer && ev.dataTransfer.files) || []);
      if (!fs.length) return;
      ev.preventDefault();
      var docs = fs.filter(function (f) { return RA.importador.accepts(f.name); });
      if (docs.length) return importar(docs[0]);
      var r = document.caretRangeFromPoint ? document.caretRangeFromPoint(ev.clientX, ev.clientY) : null;
      if (r) st.rango = r;
      insertarImagenes(fs);
    });

    /* ── Importar un archivo dentro de esta entrada ───────────────── */
    function importar(f) {
      var I = RA.importador;
      if (!I.accepts(f.name)) { ui().aviso('Solo se pueden importar .docx, .md y .txt', 'error'); return; }
      I.parseFile(f).then(function (doc) {
        var pieza = I.finish(doc, I.pieces(doc, false)[0]);
        var html = RA.limpiarEditor(pieza.html);
        var hayTexto = RA.contarPalabras(RA.limpiarEditor(texto.innerHTML)) > 0;
        var avisos = [];
        if (doc.stats.images) avisos.push(doc.stats.images === 1 ? 'la imagen no se importa' : 'las ' + doc.stats.images + ' imágenes no se importan');
        if (doc.stats.links) avisos.push('los enlaces quedan como texto');
        if (doc.stats.tracked) avisos.push('tenía control de cambios: entra con los cambios aceptados');
        if (doc.stats.footnotes) avisos.push(doc.stats.footnotes === 1 ? '1 nota al pie' : doc.stats.footnotes + ' notas al pie');
        if (pieza.notes.length) avisos.push(pieza.notes.length + (pieza.notes.length === 1 ? ' comentario pasa' : ' comentarios pasan') + ' a tus notas privadas');
        var detalle = ui().numero(pieza.words) + ' palabras' + (avisos.length ? ' · ' + avisos.join(' · ') : '');
        var elegir = hayTexto ? ui().ventana({ titulo: 'Importar «' + f.name + '»', texto: esc(detalle) + '<br><br>La entrada ya tiene texto. ¿Qué hago con el archivo?',
          botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Añadir al final', valor: 'final' }, { texto: 'Reemplazar el texto', valor: 'reemplazar', tipo: 'peligro' }] })
          : Promise.resolve('reemplazar');
        return elegir.then(function (modo) {
          if (!modo) return;
          if (modo === 'reemplazar') { st.np.lista = {}; texto.innerHTML = paraEditar(html, st.np); }
          else texto.insertAdjacentHTML('beforeend', paraEditar(html, st.np));
          pintarPastillas();
          if (!titulo.value.trim() && pieza.title) {
            var sd = RA.separarDia(pieza.title);
            titulo.value = sd.titulo; autoAlto(titulo);
            if (sd.numero && st.campos.tipo === 'capitulo') st.campos.numero = sd.numero;
          }
          if (pieza.notes.length) { st.notas = st.notas.concat(pieza.notes); guardarNotas(); }
          cambio(); pintarPanel();
          ui().aviso('Importado: ' + detalle);
        });
      }).catch(function (err) { console.error(err); ui().aviso('No se pudo leer «' + f.name + '»: ' + err.message, 'error'); });
    }

    /* ══ Notas al pie (A-03) ═══════════════════════════════════════
       En el editor, cada marca es una «pastilla» (no editable) con el id de su nota.
       Al guardar, las pastillas pasan a <sup class="np"></sup> y las notas a una lista final. */
    function pastillas() { return [].slice.call(texto.querySelectorAll('.ed-np[data-np]')); }
    function pintarPastillas() {
      var vistas = {};
      pastillas().forEach(function (pl) {
        var id = pl.getAttribute('data-np');
        if (st.np.lista[id] == null || vistas[id]) { pl.remove(); return; }   // sin nota o repetida
        vistas[id] = true;
      });
      pastillas().forEach(function (pl, i) {
        var marca = RA.marcaNota(i, st.np.estilo, 13) + '<b class="ed-np__n">' + (i + 1) + '</b>';
        if (pl.innerHTML !== marca) pl.innerHTML = marca;
        var txt = textoNota(pl.getAttribute('data-np'));
        pl.title = 'Nota ' + (i + 1) + ': ' + txt.slice(0, 120) + (txt.length > 120 ? '…' : '') + ' (toca para editarla)';
        pl.classList.toggle('ed-np--vuelta', i >= 12);
      });
    }
    function textoNota(id) {
      var d = document.createElement('div'); d.innerHTML = String(st.np.lista[id] || '').replace(/<\/p>\s*<p>/g, '</p> <p>');
      return d.textContent.replace(/\s+/g, ' ').trim();
    }
    function cuerpoConNotas() {
      var clon = texto.cloneNode(true), orden = [];
      clon.querySelectorAll('.ed-np[data-np]').forEach(function (pl) {
        var id = pl.getAttribute('data-np');
        if (st.np.lista[id] == null || orden.indexOf(id) >= 0) { pl.remove(); return; }
        orden.push(id);
        var sp = document.createElement('sup'); sp.className = 'np'; pl.replaceWith(sp);
      });
      var html = RA.limpiarEditor(clon.innerHTML);
      if (orden.length) html += '<ol class="notas-pie' + (st.np.estilo === 'numeros' ? ' numeros' : '') + '">' +
        orden.map(function (id) { return '<li>' + (st.np.lista[id] || '<p></p>') + '</li>'; }).join('') + '</ol>';
      return html;
    }

    /* Borrar una marca pide confirmación (cortar no: es para moverla). ⌘Z la recupera. */
    texto.addEventListener('beforeinput', function (ev) {
      if (st.borrandoNota) return;
      var ti = ev.inputType || '';
      if (/^history|deleteByCut/.test(ti)) return;
      if (!/^(delete|insertText|insertReplacementText|insertFromPaste|insertParagraph|insertLineBreak|insertFromDrop)/.test(ti)) return;
      var rs = ev.getTargetRanges ? ev.getTargetRanges() : [];
      var afectadas = pastillas().filter(function (pl) {
        return rs.some(function (sr) {
          if (sr.collapsed) return false;
          var r = document.createRange();
          try { r.setStart(sr.startContainer, sr.startOffset); r.setEnd(sr.endContainer, sr.endOffset); } catch (x) { return false; }
          return r.intersectsNode(pl);
        });
      });
      if (!afectadas.length) return;
      ev.preventDefault();
      var nums = afectadas.map(function (pl) { return pastillas().indexOf(pl) + 1; });
      var rango = document.createRange(), sr0 = rs[0], srN = rs[rs.length - 1];
      rango.setStart(sr0.startContainer, sr0.startOffset); rango.setEnd(srN.endContainer, srN.endOffset);
      ui().confirmar(nums.length === 1 ? '¿Borrar la nota ' + nums[0] + '?' : '¿Borrar ' + nums.length + ' notas?',
        'Se borrará la marca del texto junto con el texto de la nota. Si fue sin querer, también puedes recuperarla con ⌘Z.',
        nums.length === 1 ? 'Borrar la nota' : 'Borrar las notas', true).then(function (si) {
        texto.focus({ preventScroll: true });
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(rango);
        if (!si) { sel.collapseToEnd(); return; }
        st.borrandoNota = true;
        if (/^insert/.test(ti) && ev.data) document.execCommand('insertText', false, ev.data);
        else if (/^insertParagraph/.test(ti)) { document.execCommand('delete'); document.execCommand('insertParagraph'); }
        else document.execCommand('delete');
        st.borrandoNota = false;
        pintarPastillas(); cambio(); pintarPanel();
      });
    });
    texto.addEventListener('click', function (ev) {
      var pl = ev.target.closest('.ed-np[data-np]'); if (!pl) return;
      ev.preventDefault();
      abrirCajaNota(pl.getAttribute('data-np'), pl);
    });

    function nuevaNota() {
      var r = st.rango;
      if (!r || !texto.contains(r.startContainer)) { ui().aviso('Pon el cursor en el texto donde va la nota'); return; }
      var nodo = r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentNode;
      if (nodo.closest && nodo.closest('figure, figcaption, cite')) { ui().aviso('Las notas van en el texto, no en pies de foto ni autorías'); return; }
      abrirCajaNota(null, null, r.cloneRange());
    }

    /* El recuadro para escribir la nota: negrita, cursiva, enlace y párrafos */
    function abrirCajaNota(id, pastilla, rango) {
      var vieja = document.querySelector('.ed-np-caja'); if (vieja) vieja.remove();
      var esNueva = !id, num = esNueva ? null : pastillas().indexOf(pastilla) + 1;
      if (esNueva) {   // el número que tendrá: cuántas marcas hay antes del cursor
        num = 1 + pastillas().filter(function (pl) { return rango.comparePoint(pl, 0) < 0; }).length;
      }
      var caja = document.createElement('div');
      caja.className = 'ed-np-caja'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-label', 'Nota al pie ' + num);
      caja.innerHTML = '<div class="ed-np-caja__cab"><span class="ed-np-caja__marca">' + RA.marcaNota(num - 1, st.np.estilo, 16) + '</span>' +
        '<b>' + (esNueva ? 'Nota al pie nueva' : 'Nota ' + num) + '</b><span class="ed-np-caja__herr">' +
        '<button type="button" data-c="negrita" aria-label="Negrita"><b>B</b></button><button type="button" data-c="cursiva" aria-label="Cursiva"><i>I</i></button>' +
        '<button type="button" data-c="enlace" aria-label="Enlace">Enlace</button></span></div>' +
        '<div class="ed-np-caja__texto" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto de la nota" lang="es" spellcheck="true" data-placeholder="Escribe la nota…"></div>' +
        '<div class="ed-np-caja__pie">' + (esNueva ? '' : '<button type="button" class="a-boton a-boton--fino ed-np-caja__borrar" data-c="borrar">Borrar la nota</button>') +
        '<span class="ed-np-caja__ayuda">Enter: párrafo nuevo · ⌘Enter: guardar</span>' +
        '<button type="button" class="a-boton" data-c="cancelar">Cancelar</button><button type="button" class="a-boton a-boton--primario" data-c="guardar">Guardar nota</button></div>';
      document.body.appendChild(caja);
      var area = caja.querySelector('.ed-np-caja__texto');
      area.innerHTML = esNueva ? '<p><br></p>' : (st.np.lista[id] || '<p><br></p>');
      // Posición: debajo de la marca o del cursor
      var ref = pastilla ? pastilla.getBoundingClientRect() : (rango.getClientRects()[0] || rango.getBoundingClientRect());
      if (!ref || (!ref.width && !ref.height && !ref.top)) ref = texto.getBoundingClientRect();
      var ancho = Math.min(520, window.innerWidth - 24);
      caja.style.width = ancho + 'px';
      caja.style.left = Math.max(12, Math.min(window.innerWidth - ancho - 12, ref.left - 40)) + window.scrollX + 'px';
      caja.style.top = (ref.bottom + window.scrollY + 10) + 'px';
      var rc = caja.getBoundingClientRect();
      if (rc.bottom > window.innerHeight - 8) window.scrollBy({ top: rc.bottom - window.innerHeight + 24, behavior: 'smooth' });
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (x) { /* nada */ }
      area.focus();
      var rr = document.createRange(); rr.selectNodeContents(area); rr.collapse(false); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(rr);
      var rangoCaja = null;
      area.addEventListener('keyup', function () { var s2 = getSelection(); if (s2.rangeCount) rangoCaja = s2.getRangeAt(0).cloneRange(); });
      area.addEventListener('mouseup', function () { var s2 = getSelection(); if (s2.rangeCount) rangoCaja = s2.getRangeAt(0).cloneRange(); });
      area.addEventListener('paste', function (ev) {
        var dt = ev.clipboardData; if (!dt) return; ev.preventDefault();
        var h = dt.getData('text/html');
        if (h) document.execCommand('insertHTML', false, RA.limpiarNota(h));
        else document.execCommand('insertText', false, dt.getData('text/plain'));
      });
      function cerrar() { caja.remove(); document.removeEventListener('keydown', teclas, true); }
      function guardarNota() {
        var html = RA.limpiarNota(area.innerHTML);
        if (!html) {
          if (esNueva) { cerrar(); restaurar(); return; }
          return borrarNota();
        }
        if (esNueva) {
          var nid = idNota(); st.np.lista[nid] = html;
          var t = document.createElement('div'); t.innerHTML = pastillaHTML(nid); var pl = t.firstChild;
          var r = rango; r.collapse(false);
          r.insertNode(pl);
          var desp = document.createRange(); desp.setStartAfter(pl); desp.collapse(true);
          cerrar();
          texto.focus({ preventScroll: true });
          var s3 = getSelection(); s3.removeAllRanges(); s3.addRange(desp); st.rango = desp.cloneRange();
        } else { st.np.lista[id] = html; cerrar(); }
        pintarPastillas(); cambio(); pintarPanel();
      }
      function borrarNota() {
        ui().confirmar('¿Borrar la nota ' + num + '?', 'Se borrará la marca del texto junto con el texto de la nota.', 'Borrar la nota', true).then(function (si) {
          if (!si) return;
          var pl = texto.querySelector('.ed-np[data-np="' + id + '"]'); if (pl) pl.remove();
          delete st.np.lista[id]; cerrar(); pintarPastillas(); cambio(); pintarPanel();
        });
      }
      function enlaceCaja() {
        var r = rangoCaja;
        if (!r || r.collapsed) { ui().aviso('Selecciona primero el texto del enlace'); return; }
        var cuerpo = document.createElement('div');
        cuerpo.innerHTML = '<label class="a-campo">Dirección<input type="url" placeholder="https://…"></label>';
        ui().ventana({ titulo: 'Añadir enlace', cuerpo: cuerpo, botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Aplicar', valor: function () { return cuerpo.querySelector('input').value.trim(); }, tipo: 'primario' }] }).then(function (url) {
          area.focus(); var s4 = getSelection(); s4.removeAllRanges(); s4.addRange(r);
          if (!url) return;
          if (!/^(https?:|mailto:|#)/i.test(url)) url = 'https://' + url;
          document.execCommand('createLink', false, url);
        });
      }
      function teclas(ev) {
        if (!caja.isConnected) return;
        if (document.querySelector('.a-ventana')) return;
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar(); restaurar(); }
        if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && caja.contains(ev.target)) { ev.preventDefault(); guardarNota(); }
        if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k' && caja.contains(ev.target)) { ev.preventDefault(); enlaceCaja(); }
      }
      document.addEventListener('keydown', teclas, true);
      caja.addEventListener('mousedown', function (ev) { if (ev.target.closest('.ed-np-caja__herr button')) ev.preventDefault(); });
      caja.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-c]'); if (!b) return;
        var c = b.getAttribute('data-c');
        if (c === 'negrita') document.execCommand('bold');
        if (c === 'cursiva') document.execCommand('italic');
        if (c === 'enlace') enlaceCaja();
        if (c === 'cancelar') { cerrar(); restaurar(); }
        if (c === 'guardar') guardarNota();
        if (c === 'borrar') borrarNota();
      });
    }

    /* Notas en el formato anterior (marcas 1, 2, 3… y una lista «Notas» al final) */
    function notasAntiguas() {
      var ols = [].slice.call(texto.children).filter(function (x) { return x.tagName === 'OL'; });
      if (!ols.length) return null;
      var ol = ols[ols.length - 1];
      var sups = [].slice.call(texto.querySelectorAll('sup')).filter(function (x) {
        return !x.closest('.ed-np') && !ol.contains(x) && /^\s*\d{1,3}\s*$/.test(x.textContent) && (x.compareDocumentPosition(ol) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      if (!sups.length) return null;
      var prev = ol.previousElementSibling;
      var titulo = prev && /^(H2|H3|P)$/.test(prev.tagName) && /^\s*notas?\s*:?\s*$/i.test(prev.textContent) ? prev : null;
      var lis = [].slice.call(ol.children).filter(function (x) { return x.tagName === 'LI'; });
      if (!titulo && sups.length !== lis.length) return null;   // no parece una lista de notas
      var problemas = [];
      function antes(x) {
        var r = document.createRange(); r.setStart(texto, 0); r.setEndBefore(x);
        var t = r.toString().replace(/\s+/g, ' ').trim(); return '«…' + t.slice(-40) + '»';
      }
      if (sups.length !== lis.length) problemas.push('Hay ' + sups.length + ' marcas en el texto y ' + lis.length + ' notas en la lista final.');
      for (var k = 0; k < sups.length; k++) {
        var n = parseInt(sups[k].textContent, 10);
        if (n !== k + 1) { problemas.push('La marca número ' + (k + 1) + ' del texto dice «' + n + '». Está después de ' + antes(sups[k]) + '.'); break; }
      }
      return { sups: sups, ol: ol, titulo: titulo, lis: lis, problemas: problemas };
    }
    function convertirNotas() {
      var x = notasAntiguas();
      if (!x) { ui().aviso('No encontré notas en el formato anterior'); return; }
      if (x.problemas.length) {
        ui().ventana({ titulo: 'No se convirtieron las notas', texto: 'Para no pegar una nota a la marca equivocada, no cambié nada.<br><br>' +
          x.problemas.map(esc).join('<br><br>') + '<br><br>Corrige las marcas o la lista en el texto y vuelve a intentarlo.', botones: [{ texto: 'Entendido', valor: true, tipo: 'primario' }] });
        return;
      }
      x.sups.forEach(function (sp, k) {
        var id = idNota(); st.np.lista[id] = RA.limpiarNota(x.lis[k].innerHTML) || '<p>' + esc(x.lis[k].textContent) + '</p>';
        var t = document.createElement('div'); t.innerHTML = pastillaHTML(id); sp.replaceWith(t.firstChild);
      });
      x.ol.remove(); if (x.titulo) x.titulo.remove();
      pintarPastillas(); cambio(); pintarPanel();
      ui().aviso('Se convirtieron ' + x.sups.length + (x.sups.length === 1 ? ' nota' : ' notas') + '. Revísalas en la vista previa y publica cuando quieras.');
    }

    /* ══ Citas (A-05): un botón con menú de estilos ══════════════════ */
    function citaActual() { var b = bloqueActual(); return b && b.tagName === 'BLOCKQUOTE' ? b : null; }
    function menuCita(boton) {
      var q = citaActual(), actual = q ? (q.className || '') : null;
      var ops = RA.ESTILOS_CITA.map(function (x) {
        return [x[0] || 'bloque', x[2] + ' · ' + x[1] + (actual !== null && actual === x[0] ? '  ✓' : '')];
      });
      if (q) {
        var vinc = q.querySelector('cite a[href^="#/referentes/r/"]');
        ops.push(vinc ? ['desvincular', 'Quitar el vínculo al referente'] : ['vincular', 'Vincular la autoría a un referente…']);
        ops.push(['quitar', 'Quitar la cita']);
      }
      menu(boton, ops, function (k) {
        restaurar();
        var q2 = citaActual();
        if (k === 'quitar') { if (q2) envolverEn(q2); cambio(); return; }
        if (k === 'vincular') return vincularReferente(q2);
        if (k === 'desvincular') { var a = q2 && q2.querySelector('cite a'); if (a) desenvolver(a); cambio(); return; }
        var clase = k === 'bloque' ? '' : k;
        if (q2) {
          q2.className = clase;
          var c = q2.querySelector('cite'); if (!c) { c = document.createElement('cite'); q2.appendChild(c); }
          c.setAttribute('data-placeholder', placeholderCita(q2));
        } else alternarEnvoltura('blockquote', clase);
        cambio();
      });
    }
    function vincularReferente(q) {
      if (!q) return;
      var cuerpo = document.createElement('div');
      cuerpo.innerHTML = '<p class="ed-nota">La autoría que escribiste se conserva y sigue siendo editable. El lector podrá tocarla para ver la ficha del referente.</p>' +
        '<input type="search" class="a-buscar" placeholder="Buscar referentes por título…" aria-label="Buscar referentes"><div class="ed-resultados ed-resultados--ventana" role="listbox"></div>';
      var inp = cuerpo.querySelector('input'), res = cuerpo.querySelector('.ed-resultados'), elegido = null, tt = null;
      function buscar() {
        RA.adm.buscarReferentes(inp.value.trim().toLowerCase()).then(function (l) {
          res.innerHTML = l.length ? l.map(function (r) {
            st.refInfo[r.id] = r;
            var tipo = st.tipos.filter(function (x) { return x.id === r.tipo_id; })[0];
            return '<button type="button" role="option" data-id="' + esc(r.id) + '"><span class="ed-ref__color" style="background:' + (tipo ? tipo.color : '#ccc') + '"></span>' + esc(r.titulo + (r.autor ? ' · ' + r.autor : '')) + '</button>';
          }).join('') : '<p class="ed-nota">No hay referentes con ese título.</p>';
        }).catch(function () { res.innerHTML = '<p class="ed-nota">No se pudieron buscar los referentes.</p>'; });
      }
      inp.oninput = function () { clearTimeout(tt); tt = setTimeout(buscar, 200); };
      var prom = ui().ventana({ titulo: 'Vincular la autoría a un referente', cuerpo: cuerpo, botones: [{ texto: 'Cancelar', valor: null }] });
      res.onclick = function (ev) {
        var b = ev.target.closest('[data-id]'); if (!b) return;
        elegido = b.getAttribute('data-id');
        var v = cuerpo.closest('.a-ventana'); var bc = v && v.querySelector('.a-boton'); if (bc) bc.click();
      };
      buscar(); setTimeout(function () { inp.focus(); }, 30);
      prom.then(function () {
        if (!elegido) { restaurar(); return; }
        var r = st.refInfo[elegido] || {};
        var c = q.querySelector('cite'); if (!c) { c = document.createElement('cite'); q.appendChild(c); }
        var viejo = c.querySelector('a'); if (viejo) desenvolver(viejo);
        if (!c.textContent.trim()) c.textContent = r.autor || r.titulo || 'Referente';
        var a = document.createElement('a'); a.href = '#/referentes/r/' + encodeURIComponent(elegido);
        while (c.firstChild) a.appendChild(c.firstChild);
        c.appendChild(a);
        if (st.refs.indexOf(elegido) < 0) { st.refs.push(elegido); guardarRef(); }   // queda también entre los referentes de la entrada
        cambio(); ui().aviso('Autoría vinculada a «' + (r.titulo || 'el referente') + '»');
      });
    }

    /* ══ Panel lateral ════════════════════════════════════════════ */
    function seccion(t, html, extra) { return '<section class="ed-sec"' + (extra || '') + '><h2 class="ed-sec__t">' + t + '</h2>' + html + '</section>'; }
    function pintarPortadaMini() {
      var c = panel.querySelector('.ed-portada__mini');
      if (!c) return;
      var e = Object.assign({}, st.e, st.campos, { titulo: titulo.value || 'Sin título' });
      c.innerHTML = RA.htmlCuaderno(e, T, 'cuaderno--mini', 'tabindex="-1" aria-hidden="true"');
    }
    function pintarPanel() {
      if (!st.vivo) return;
      var c = st.campos, e = Object.assign({}, st.e, c), pal = T.pal, lista = A().entradas;
      var idx = lista.findIndex(function (x) { return x.id === st.e.id; });
      var colorActual = RA.colorCuaderno(e, T);
      var patronActual = c.portada_patron || '';
      var h = '';
      h += seccion('Tipo de entrada', '<div class="ed-seg" role="group" aria-label="Tipo">' +
        '<button type="button" data-tipo="capitulo" aria-pressed="' + (c.tipo === 'capitulo') + '">Capítulo</button>' +
        '<button type="button" data-tipo="apunte" aria-pressed="' + (c.tipo === 'apunte') + '">Apunte</button></div>' +
        (c.tipo === 'capitulo' ? '<label class="ed-dia">Día <input type="number" min="1" max="999" step="1" value="' + (c.numero || 1) + '" aria-label="Número de día"></label>' : ''));
      if (c.tipo === 'apunte') {   // A-06: ficha de archivo con color, patrón y sello
        var fa = RA.fichaApunte(e, T), colsA = RA.coloresApunte(T);
        h += seccion('Ficha del apunte',
          '<div class="ed-portada"><div class="ed-portada__mini"></div><div class="ed-portada__ops">' +
            '<span class="ed-sub">Color</span><div class="ed-muestras" role="group" aria-label="Color de la ficha">' +
            colsA.map(function (col, i) { return '<button type="button" class="ed-color" data-color-apunte="' + i + '" style="background:' + col.hex + '" aria-pressed="' + (fa.indice === i) + '" aria-label="' + esc(col.nombre) + '" title="' + esc(col.nombre) + '"></button>'; }).join('') +
            '</div><span class="ed-nota">' + esc(colsA[fa.indice].nombre) + '</span>' +
            '<span class="ed-sub">Patrón</span><div class="ed-muestras ed-muestras--patron" role="group" aria-label="Patrón de la ficha">' +
            RA.APUNTE.patrones.map(function (p) {
              return '<button type="button" class="ed-patron" data-patron-apunte="' + p + '" aria-pressed="' + (fa.patron === p) + '" title="' + RA.APUNTE.nombrePatron[p] + '" aria-label="Patrón ' + RA.APUNTE.nombrePatron[p] + '" style="background:' + fa.color + ';--pc:rgba(20,20,40,.22)">' + (p === 'lisa' ? '' : '<span class="pat p-' + p + '"></span>') + '</button>';
            }).join('') + '</div>' +
          '</div></div>');
        h += seccion('Sello', st.sellos === null ? '<p class="ed-nota">Para ponerle un sello (categoría) al apunte, corre en Supabase el archivo <code>supabase/06-sellos-de-apuntes.sql</code> y recarga.</p>' :
          '<div class="ed-chips">' + '<button type="button" class="ed-chip ed-chip--sello" data-sello="" aria-pressed="' + (!c.sello_id) + '">Sin sello</button>' +
          st.sellos.map(function (sl) {
            return '<button type="button" class="ed-chip ed-chip--sello" data-sello="' + esc(sl.id) + '" aria-pressed="' + (c.sello_id === sl.id) + '" style="--sello:' + esc(sl.color) + '"><i></i>' + esc(sl.nombre) + '</button>';
          }).join('') + '</div><span class="ed-nota">' + (st.sellos.length ? '' : 'Todavía no hay sellos. ') + 'Los sellos se crean en <a href="#/apariencia">Apariencia</a>.</span>');
      } else
      h += seccion('Portada',
        '<div class="ed-portada"><div class="ed-portada__mini"></div><div class="ed-portada__ops">' +
          '<button type="button" class="a-boton a-boton--fino" data-portada="subir">' + (c.portada_imagen ? 'Cambiar imagen' : 'Subir imagen') + '</button>' +
          (c.portada_imagen ? '<button type="button" class="a-boton a-boton--fino" data-portada="quitar">Quitar imagen</button>' : '<span class="ed-nota">Sin imagen: color y patrón</span>') +
          (c.tipo === 'capitulo' ? '<div class="ed-muestras" role="group" aria-label="Color de la portada">' +
            '<button type="button" class="ed-color ed-color--auto" data-color="" aria-pressed="' + (c.portada_color == null) + '" title="Automático: según el número del día">A</button>' +
            pal.cuadernos.map(function (col, i) { return '<button type="button" class="ed-color" data-color="' + i + '" style="background:' + col + '" aria-pressed="' + (c.portada_color === i) + '" aria-label="Color ' + (i + 1) + '"></button>'; }).join('') +
          '</div>' : '<span class="ed-nota">Los apuntes usan el color del apunte</span>') +
          '<div class="ed-muestras ed-muestras--patron" role="group" aria-label="Patrón">' +
            '<button type="button" class="ed-patron" data-patron="" aria-pressed="' + (!patronActual) + '" title="Por defecto (' + esc(A().apariencia.patron_defecto) + ')" style="background:' + colorActual + ';--pc:' + (RA.esClaro(colorActual) ? 'rgba(20,20,40,.3)' : 'rgba(255,255,255,.4)') + '"><span class="pat p-' + A().apariencia.patron_defecto + '"></span><span class="ed-patron__def">def.</span></button>' +
            RA.TOKENS.patrones.map(function (p) {
              return '<button type="button" class="ed-patron" data-patron="' + p + '" aria-pressed="' + (patronActual === p) + '" title="' + p + '" aria-label="Patrón ' + p + '" style="background:' + colorActual + ';--pc:' + (RA.esClaro(colorActual) ? 'rgba(20,20,40,.3)' : 'rgba(255,255,255,.4)') + '"><span class="pat p-' + p + '"></span></button>';
            }).join('') +
          '</div></div></div>');
      h += seccion('Modo de lectura', '<div class="ed-opciones" role="group" aria-label="Modo de lectura">' +
        // «Automático» necesita el SQL 05 (lo delata el campo «firma» del proyecto)
        [['scroll', 'Scroll'], ['paginas', 'Páginas']].concat(A().proyecto && 'firma' in A().proyecto ? [['auto', 'Automático']] : []).concat([['lector', 'Elige el lector']]).map(function (m) {
          return '<button type="button" data-modo="' + m[0] + '" aria-pressed="' + (c.modo_lectura === m[0]) + '">' + m[1] + '</button>';
        }).join('') + '</div>' + (c.tipo === 'apunte' ? '<span class="ed-nota">Los apuntes siempre se leen en scroll</span>' :
          c.modo_lectura === 'auto' ? '<span class="ed-nota">Páginas en el celular y scroll en el computador. El lector puede cambiarlo.</span>' :
          c.modo_lectura === 'lector' ? '<span class="ed-nota">Usa la lectura por defecto de Apariencia y el lector puede cambiarla.</span>' : ''));
      var pls = pastillas(), antiguas = notasAntiguas();
      h += seccion('Notas al pie <span class="ed-cuenta">' + pls.length + '</span>',
        '<div class="ed-seg" role="group" aria-label="Marcas de las notas"><button type="button" data-np-estilo="simbolos" aria-pressed="' + (st.np.estilo !== 'numeros') + '">Símbolos</button>' +
        '<button type="button" data-np-estilo="numeros" aria-pressed="' + (st.np.estilo === 'numeros') + '">Números</button></div>' +
        (pls.length ? '<div class="ed-np-lista">' + pls.map(function (pl, i) {
          var t = textoNota(pl.getAttribute('data-np'));
          return '<button type="button" class="ed-np-fila" data-np-ir="' + esc(pl.getAttribute('data-np')) + '"><span class="ed-np-fila__marca' + (i >= 12 ? ' ed-np--vuelta' : '') + '">' + RA.marcaNota(i, st.np.estilo, 13) + '</span>' +
            '<span>' + esc(t.slice(0, 90)) + (t.length > 90 ? '…' : '') + '</span></button>';
        }).join('') + '</div>' : '') +
        (antiguas ? '<div class="ed-aviso-notas"><p>Este texto tiene ' + antiguas.sups.length + ' notas en el formato anterior (números y una lista «Notas» al final).</p>' +
          '<button type="button" class="a-boton a-boton--primario a-boton--fino" data-convertir-notas>Convertir notas</button></div>' : '') +
        '<span class="ed-nota">Para añadir una, pon el cursor en el texto y usa «Nota al pie» en la barra. Toca una marca para editarla.</span>');
      h += seccion('Relacionados', '<div class="ed-chips">' + st.rel.map(function (id) {
        var x = lista.filter(function (y) { return y.id === id; })[0]; if (!x) return '';
        var v = A().vigente(x), col = RA.colorCuaderno(v, T);
        return '<span class="ed-chip" style="background:' + col + ';color:' + (RA.esClaro(col) ? pal.tinta : pal.papel) + '">' + esc(RA.antetitulo(v)) + (v.tipo === 'apunte' ? ' · ' + esc(v.titulo.slice(0, 22)) : '') +
          '<button type="button" data-quitar-rel="' + id + '" aria-label="Quitar ' + esc(RA.antetitulo(v)) + '">×</button></span>';
      }).join('') + '<button type="button" class="ed-chip ed-chip--mas" data-anadir="rel">+ añadir</button></div><div class="ed-buscador" data-buscador="rel" hidden></div>');
      h += seccion('Referentes del Moodboard', '<div class="ed-refs">' + st.refs.map(function (id) {
        var r = st.refInfo[id], tipo = r && st.tipos.filter(function (t) { return t.id === r.tipo_id; })[0];
        return '<span class="ed-ref"><span class="ed-ref__color" style="background:' + (tipo ? tipo.color : '#ccc') + '"></span><span>' + esc(r ? r.titulo : id) + '</span>' +
          '<button type="button" data-quitar-ref="' + esc(id) + '" aria-label="Desvincular">×</button></span>';
      }).join('') + '<button type="button" class="ed-chip ed-chip--mas" data-anadir="ref">+ vincular referente</button></div><div class="ed-buscador" data-buscador="ref" hidden></div>');
      h += seccion('Posición', '<div class="ed-posicion"><span>' + (idx + 1) + ' de ' + lista.length + ' en el carrusel</span>' +
        '<span><button type="button" class="a-mini" data-pos="-1" aria-label="Subir una posición"' + (idx <= 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="a-mini" data-pos="1" aria-label="Bajar una posición"' + (idx >= lista.length - 1 ? ' disabled' : '') + '>↓</button></span></div>', ' data-sec="posicion"');
      h += seccion('Notas privadas <span class="ed-cuenta">' + st.notas.length + '</span>',
        '<p class="ed-nota">Solo tú las ves. Nunca se publican.</p><div class="ed-notas">' + st.notas.map(function (n, i) {
          return '<div class="ed-nota-priv">' + (n.cita ? '<q>' + esc(n.cita.slice(0, 160)) + '</q>' : '') + '<span>' + esc(n.texto || '') + '</span>' +
            (n.respuestas && n.respuestas.length ? '<small>' + n.respuestas.map(esc).join(' · ') + '</small>' : '') +
            '<button type="button" data-quitar-nota="' + i + '" aria-label="Borrar la nota">×</button></div>';
        }).join('') + '</div><div class="ed-nueva-nota"><textarea rows="2" placeholder="Escribe una nota privada…" aria-label="Nota privada nueva"></textarea><button type="button" class="a-boton a-boton--fino" data-nota-nueva>Añadir</button></div>');
      if (st.reacciones.length) h += seccion('Reacciones de lectores <span class="ed-cuenta">' + st.reacciones.reduce(function (n, p) { return n + p.total; }, 0) + '</span>',
        '<div class="ed-reacciones">' + st.reacciones.map(function (p, i) {
          return '<div class="ed-reaccion"><q>' + esc(p.cita.slice(0, 140)) + '</q><span class="ed-reaccion__iconos">' +
            Object.keys(p.r).map(function (k) { return RA.iconoReaccion(k, 18) + '<b>' + p.r[k] + '</b>'; }).join(' ') + '</span>' +
            '<button type="button" data-borrar-reac="' + i + '" aria-label="Borrar las reacciones de este pasaje">×</button></div>';
        }).join('') + '</div>');
      h += seccion('Enlace', '<code class="ed-enlace">#/leer/' + esc(st.e.slug) + '</code>' +
        (publicada() ? '<span class="ed-nota">Fijo desde que se publicó</span>' : '<span class="ed-nota">Se ajusta solo hasta que publiques</span>'));
      panel.innerHTML = h;
      pintarPortadaMini();
    }

    function cambiarCampo(k, v) { st.campos[k] = v; cambio(); pintarPanel(); }
    function guardarNotas() {
      RA.adm.guardarNotas(st.e.id, st.notas).catch(function (err) { ui().aviso('No se guardaron las notas: ' + err.message, 'error'); });
    }

    panel.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var d = b.dataset;
      if (d.tipo) {
        if (d.tipo === st.campos.tipo) return;
        st.campos.portada_patron = null; st.campos.portada_color = null;
        if (d.tipo === 'apunte') st.campos.numero = null;
        else st.campos.numero = A().entradas.filter(function (x) { return x.tipo === 'capitulo' && x.id !== st.e.id; })
          .reduce(function (m, x) { return Math.max(m, A().vigente(x).numero || 0); }, 0) + 1;
        return cambiarCampo('tipo', d.tipo);
      }
      if (d.color !== undefined) return cambiarCampo('portada_color', d.color === '' ? null : +d.color);
      if (d.colorApunte !== undefined) return cambiarCampo('portada_color', +d.colorApunte);
      if (d.patronApunte !== undefined) return cambiarCampo('portada_patron', d.patronApunte);
      if (d.sello !== undefined) return cambiarCampo('sello_id', d.sello || null);
      if (d.npEstilo) { st.np.estilo = d.npEstilo; pintarPastillas(); cambio(); return pintarPanel(); }
      if (d.npIr) {
        var pl = texto.querySelector('.ed-np[data-np="' + d.npIr + '"]');
        if (pl) { pl.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { abrirCajaNota(d.npIr, pl); }, 350); }
        return;
      }
      if (d.convertirNotas !== undefined) return convertirNotas();
      if (d.patron !== undefined) return cambiarCampo('portada_patron', d.patron || null);
      if (d.modo) return cambiarCampo('modo_lectura', d.modo);
      if (d.portada === 'quitar') return cambiarCampo('portada_imagen', null);
      if (d.portada === 'subir') return elegirArchivo('image/*', false, function (fs) {
        b.disabled = true; b.textContent = 'Subiendo…';
        RA.adm.subirImagen(fs[0], 'portadas/' + st.e.id).then(function (r) { cambiarCampo('portada_imagen', r.ruta); })
          .catch(function (err) { ui().aviso('No se pudo subir: ' + err.message, 'error'); pintarPanel(); });
      });
      if (d.quitarRel) { st.rel = st.rel.filter(function (x) { return x !== d.quitarRel; }); return guardarRel(); }
      if (d.quitarRef) { st.refs = st.refs.filter(function (x) { return x !== d.quitarRef; }); return guardarRef(); }
      if (d.anadir) return abrirBuscador(d.anadir);
      if (d.pos) return mover(+d.pos);
      if (d.quitarNota !== undefined) {
        return ui().confirmar('Borrar la nota', 'La nota privada se borrará.', 'Borrar', true).then(function (si) {
          if (!si) return; st.notas.splice(+d.quitarNota, 1); guardarNotas(); pintarPanel();
        });
      }
      if (d.notaNueva !== undefined) {
        var ta = panel.querySelector('.ed-nueva-nota textarea'), t = ta.value.trim();
        if (!t) return;
        st.notas.push({ id: 'n-' + Date.now().toString(36), texto: t, cita: '', creada: new Date().toISOString() });
        guardarNotas(); pintarPanel(); return;
      }
      if (d.borrarReac !== undefined) {
        var p = st.reacciones[+d.borrarReac];
        return ui().confirmar('Borrar reacciones', 'Se borrarán las ' + p.total + ' reacciones al pasaje «' + esc(p.cita.slice(0, 80)) + '…».', 'Borrar', true).then(function (si) {
          if (!si) return;
          RA.adm.borrarReaccionesDePasaje(st.e.id, p).then(function () { st.reacciones.splice(+d.borrarReac, 1); pintarPanel(); ui().aviso('Reacciones borradas'); })
            .catch(function (err) { ui().aviso('No se pudo: ' + err.message, 'error'); });
        });
      }
    });
    panel.addEventListener('change', function (ev) {
      if (ev.target.matches('.ed-dia input')) {
        var n = Math.max(1, Math.min(999, parseInt(ev.target.value, 10) || 1));
        cambiarCampo('numero', n);
      }
    });

    // Los guardados van en fila: cada uno manda la lista completa y no puede adelantarse al anterior
    var fila = Promise.resolve();
    function enFila(fn) { fila = fila.then(fn, fn); return fila; }
    function guardarRel() {
      pintarPanel();
      var ids = st.rel.slice();
      enFila(function () { return RA.adm.guardarRelacionadas(st.e.id, ids); }).catch(function (err) { ui().aviso('No se guardaron los relacionados: ' + err.message, 'error'); });
    }
    function guardarRef() {
      pintarPanel();
      var ids = st.refs.slice();
      enFila(function () { return RA.adm.guardarReferentes(st.e.id, ids); }).catch(function (err) { ui().aviso('No se guardaron los referentes: ' + err.message, 'error'); });
    }
    function mover(delta) {
      var l = A().entradas, i = l.findIndex(function (x) { return x.id === st.e.id; }), a = i + delta;
      if (i < 0 || a < 0 || a >= l.length) return;
      var x = l.splice(i, 1)[0]; l.splice(a, 0, x);
      l.forEach(function (y, k) { y.orden = k + 1; });
      pintarPanel();
      var btn = panel.querySelector('[data-pos="' + delta + '"]'); if (btn && !btn.disabled) btn.focus();
      RA.adm.reordenar(l.map(function (y) { return y.id; })).catch(function (err) { ui().aviso('No se guardó la posición: ' + err.message, 'error'); });
    }

    /* Buscadores de relacionados y referentes */
    function abrirBuscador(cual) {
      var caja = panel.querySelector('[data-buscador="' + cual + '"]');
      caja.hidden = false;
      caja.innerHTML = '<input type="search" placeholder="' + (cual === 'rel' ? 'Buscar entre las entradas…' : 'Buscar referentes…') + '" aria-label="Buscar"><div class="ed-resultados" role="listbox"></div>';
      var inp = caja.querySelector('input'), res = caja.querySelector('.ed-resultados'), t = null;
      function mostrar(items) {
        res.innerHTML = items.length ? items.map(function (it) {
          return '<button type="button" role="option" data-id="' + esc(it.id) + '"><span class="ed-ref__color" style="background:' + it.color + '"></span>' + esc(it.texto) + '</button>';
        }).join('') : '<p class="ed-nota">' + (cual === 'ref' ? 'No hay referentes. Se importan desde el Moodboard en la fase 4.' : 'No hay más entradas.') + '</p>';
      }
      function buscar() {
        var q = inp.value.trim().toLowerCase();
        if (cual === 'rel') {
          mostrar(A().entradas.filter(function (x) { return x.id !== st.e.id && st.rel.indexOf(x.id) < 0; }).map(function (x) {
            var v = A().vigente(x); return { id: x.id, color: RA.colorCuaderno(v, T), texto: RA.antetitulo(v) + ' · ' + (v.titulo || 'Sin título') };
          }).filter(function (it) { return !q || it.texto.toLowerCase().indexOf(q) >= 0; }).slice(0, 12));
        } else {
          RA.adm.buscarReferentes(q).then(function (l) {
            mostrar(l.filter(function (r) { return st.refs.indexOf(r.id) < 0; }).map(function (r) {
              st.refInfo[r.id] = r;
              var tipo = st.tipos.filter(function (tt) { return tt.id === r.tipo_id; })[0];
              return { id: r.id, color: tipo ? tipo.color : '#ccc', texto: r.titulo + (r.fuente ? ' · ' + r.fuente : '') };
            }));
          }).catch(function () { mostrar([]); });
        }
      }
      inp.oninput = function () { clearTimeout(t); t = setTimeout(buscar, 200); };
      inp.onkeydown = function (ev) { if (ev.key === 'Escape') { caja.hidden = true; } };
      res.onclick = function (ev) {
        var b = ev.target.closest('[data-id]'); if (!b) return;
        if (cual === 'rel') { st.rel.push(b.getAttribute('data-id')); guardarRel(); }
        else { st.refs.push(b.getAttribute('data-id')); guardarRef(); }
      };
      buscar(); inp.focus();
    }

    // Datos de los referentes ya vinculados
    if (st.refs.length) RA.adm.buscarReferentes(null, st.refs).then(function (l) {
      l.forEach(function (r) { st.refInfo[r.id] = r; }); pintarPanel();
    }).catch(function () { /* nada */ });

    function alSalirDeLaPagina(ev) { if (st.version > st.guardada || st.guardando) { ev.preventDefault(); ev.returnValue = ''; } }
    window.addEventListener('beforeunload', alSalirDeLaPagina);
    A().limpiar = function () {
      st.vivo = false;
      if (!A().saliendo) guardar();
      clearInterval(reloj);
      document.removeEventListener('selectionchange', alSeleccionar);
      window.removeEventListener('beforeunload', alSalirDeLaPagina);
      A().antesDeSalir = null;
      var m = document.querySelector('.a-menu'); if (m) m.remove();
    };

    pintarPanel(); pintarEstado();
    if (!vig.titulo) titulo.focus();
  }
})();
