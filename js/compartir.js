/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · compartir un cuaderno o un apunte (A-22)

   Dos entradas: la píldora «Compartir este cuaderno» al final de la
   entrada y el botón redondo en la hoja «Aa». Las dos abren la misma
   hoja (en el celular sube desde abajo, como «Aa»):
     · Compartir…            hoja nativa del dispositivo (si la hay)
     · WhatsApp
     · Copiar enlace
     · Copiar referencia      APA 7, con la cursiva si el destino la acepta
     · Enviar por correo
     · Descargar PDF          el que genera la GitHub Action al publicar
                              (compartir/manifiesto.json); si todavía no
                              está al día, la vista de impresión
                              (#/imprimir/<slug>) con «Guardar como PDF».

   Enlaces: si la Action ya creó la página de la entrada (e/<slug>/, con
   su título y su portada para WhatsApp y redes), se comparte esa; si no,
   el enlace de siempre (#/leer/<slug>).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  var ZONA = 'America/Bogota';

  /* ── Utilidades que comparten la hoja, la vista de impresión y la tarjeta ── */
  var C = RA.compartir = {};

  /* Dirección del sitio (termina en /). La vista de impresión la recibe de la Action (?base=…) */
  C.base = function (q) {
    var b = q && q.get && q.get('base');
    if (b && /^https:\/\/[^\s"'<>]+$/i.test(b)) return b.replace(/\/?$/, '/');
    return location.origin + location.pathname.replace(/[^/]*$/, '');
  };
  /* La página del sitio a la que se le pegan las rutas con # (la de la Action, o esta misma) */
  C.pagina = function (q) {
    var b = q && q.get && q.get('base');
    return b && /^https:\/\/[^\s"'<>]+$/i.test(b) ? C.base(q) : location.origin + location.pathname;
  };
  /* Enlace de una entrada: la página para redes (e/<slug>/) o la ruta de lectura */
  C.enlace = function (e, q, bonito) {
    return bonito ? C.base(q) + 'e/' + encodeURIComponent(e.slug) + '/' : C.pagina(q) + '#/leer/' + encodeURIComponent(e.slug);
  };
  /* Fecha en español, en la hora de Medellín (la Action corre en UTC) */
  C.fecha = function (iso, corta) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    try {
      return d.toLocaleDateString('es-CO', corta ? { day: 'numeric', month: 'long', timeZone: ZONA } : { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA });
    } catch (x) { return d.toISOString().slice(0, 10); }
  };
  C.anio = function (iso) {
    var d = iso ? new Date(iso) : new Date();
    try { return +d.toLocaleDateString('en-US', { year: 'numeric', timeZone: ZONA }); } catch (x) { return d.getFullYear(); }
  };
  /* «Diego Agudelo Gómez» → «Agudelo Gómez, D.» (en español, dos apellidos cuando hay tres palabras o más) */
  C.autorAPA = function (nombre) {
    var p = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    if (p.length === 1) return p[0];
    var apellidos = p.length >= 3 ? p.slice(-2) : p.slice(-1), nombres = p.slice(0, p.length - apellidos.length);
    return apellidos.join(' ') + ', ' + nombres.map(function (n) { return n.charAt(0).toUpperCase() + '.'; }).join(' ');
  };
  /* Título como se cita: «Día 5: La voz que vuelve» · «Apunte A2: …» */
  C.tituloCita = function (e) {
    var t = String(e.titulo || '').trim();
    if (e.tipo === 'apunte') return 'Apunte' + (e.n_apunte ? ' A' + e.n_apunte : '') + ': ' + t;
    return e.numero ? 'Día ' + e.numero + ': ' + t : t;
  };
  function cierre(t) { return /[.?!…»"”]$/.test(t) ? t : t + '.'; }
  /* Referencia APA 7 (entrada de un sitio por entregas): {texto, html} */
  C.referencia = function (e, proyecto, url) {
    var autor = C.autorAPA(proyecto && proyecto.autor), iso = e.publicado_en || e.actualizado_en;
    var fecha = iso ? C.anio(iso) + ', ' + C.fecha(iso, true) : 's. f.';
    var obra = (proyecto && proyecto.titulo) || 'Resistencias del aura';
    var t = cierre(C.tituloCita(e));
    var a = autor ? cierre(autor) + ' ' : '';
    return {
      texto: a + '(' + fecha + '). ' + t + ' ' + obra + '. ' + url,
      html: esc(a) + '(' + esc(fecha) + '). ' + esc(t) + ' <i>' + esc(obra) + '</i>. ' + esc(url)
    };
  };
  function sinTildes(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  C.slugTexto = function (s, max) {
    var r = sinTildes(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (max && r.length > max) r = r.slice(0, max).replace(/-[^-]*$/, '');
    return r;
  };
  /* Nombre del archivo: Resistencias-del-aura_Dia-05_la-voz-que-vuelve.pdf */
  C.nombreArchivo = function (e, proyecto) {
    var num = e.tipo === 'apunte' ? 'Apunte-A' + (e.n_apunte || '') : (e.numero ? 'Dia-' + (e.numero < 10 ? '0' : '') + e.numero : 'Capitulo');
    return [C.slugTexto((proyecto && proyecto.titulo) || 'Resistencias del aura'), num, C.slugTexto(e.titulo, 48).toLowerCase()].filter(Boolean).join('_') + '.pdf';
  };

  /* compartir/manifiesto.json lo escribe la Action. Sin él (o en local) todo sigue con los enlaces de siempre. */
  var promesa = null;
  C.manifiesto = function () {
    if (RA.datos && RA.datos.modo === 'demo') return Promise.resolve(null);
    if (!promesa) {
      promesa = fetch('compartir/manifiesto.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (m) { return m && m.entradas ? m : null; })
        .catch(function () { return null; });
    }
    return promesa;
  };
  /* El PDF y la página para redes de una entrada, si están al día con lo publicado */
  C.generado = function (m, e) {
    var x = m && m.entradas && m.entradas[e.slug];
    if (!x) return null;
    return { pagina: !!x.pagina, pdf: x.pdf && x.version === e.actualizado_en ? x : null };
  };

  /* ── Íconos (trazo de 1,6 px, como los de «Aa») ── */
  function svg(d, extra) {
    return '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  }
  var IC = C.ICONOS = {
    compartir: svg('<circle cx="15" cy="4.5" r="2.3"/><circle cx="5" cy="10" r="2.3"/><circle cx="15" cy="15.5" r="2.3"/><path d="M7.1 8.9l5.8-3.3M7.1 11.1l5.8 3.3"/>'),
    nativo: svg('<path d="M10 2.5v10M6.2 6.2L10 2.5l3.8 3.7"/><path d="M6 9.5H4.5v8h11v-8H14"/>'),
    whatsapp: svg('<path d="M3.2 16.8l1-3.4A7.3 7.3 0 1 1 6.8 16z"/><path d="M7.6 6.6c.3-.4.8-.4 1 .1l.6 1.4c.1.3 0 .6-.2.8l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.8-.2l1.4.6c.5.2.5.7.1 1-.6.6-1.4.9-2.2.6a7 7 0 0 1-4.2-4.2c-.3-.8 0-1.6.4-2.4z" stroke-width="1.2"/>'),
    enlace: svg('<path d="M8.3 11.7a3.2 3.2 0 0 0 4.5 0l2.6-2.6a3.2 3.2 0 0 0-4.5-4.5l-.9.9"/><path d="M11.7 8.3a3.2 3.2 0 0 0-4.5 0l-2.6 2.6a3.2 3.2 0 0 0 4.5 4.5l.9-.9"/>'),
    cita: svg('<path d="M3.5 10.5h4v5h-4zM3.5 10.5C3.5 7 5 5 7.5 4.5M12 10.5h4v5h-4zM12 10.5c0-3.5 1.5-5.5 4-6"/>'),
    correo: svg('<rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M3 5.5l7 5.5 7-5.5"/>'),
    pdf: svg('<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5"/><path d="M10 9v5.5M7.7 12.3L10 14.6l2.3-2.3"/>'),
    listo: svg('<path d="M4 10.5l4 4 8-9"/>'),
    cerrar: svg('<path d="M5 5l10 10M15 5L5 15"/>')
  };

  /* ¿Se muestra Compartir? En Apariencia → Compartir y PDF se puede apagar (extra.compartir = 'no') */
  C.activo = function (apariencia) { return !(apariencia && apariencia.extra && apariencia.extra.compartir === 'no'); };
  C.botonFinal = function (e) {
    return '<p class="compartir-fin"><button type="button" class="boton-compartir" data-compartir>' + IC.compartir +
      '<span>Compartir este ' + (e.tipo === 'apunte' ? 'apunte' : 'cuaderno') + '</span></button></p>';
  };

  /* ── Portapapeles: con la API moderna y, si no está, con una selección escondida ── */
  function copiarViejo(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; t.style.top = '0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
    t.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('sin portapapeles'));
  }
  C.copiar = function (texto, html) {
    var cb = navigator.clipboard;
    if (html && cb && cb.write && window.ClipboardItem) {
      try {
        return cb.write([new window.ClipboardItem({
          'text/plain': new Blob([texto], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' })
        })]).catch(function () { return C.copiar(texto); });
      } catch (x) { /* sigue con texto plano */ }
    }
    if (cb && cb.writeText) return cb.writeText(texto).catch(function () { return copiarViejo(texto); });
    return copiarViejo(texto);
  };

  /* ══ La hoja ═════════════════════════════════════════════════════ */
  var abierta = null;
  C.cerrar = function (devolverFoco) {
    if (!abierta) return;
    var a = abierta; abierta = null;
    a.panel.remove(); a.velo.remove();
    document.removeEventListener('keydown', a.teclas);
    if (a.boton) { a.boton.setAttribute('aria-expanded', 'false'); if (devolverFoco && a.boton.isConnected) a.boton.focus({ preventScroll: true }); }
  };
  C.abierta = function () { return !!abierta; };

  /* op: {e, sitio, tema, boton} */
  C.abrir = function (op) {
    if (abierta && !abierta.panel.isConnected) { document.removeEventListener('keydown', abierta.teclas); abierta = null; }   // la quitó otra vista
    if (abierta) { C.cerrar(true); return; }
    var e = op.e, sitio = op.sitio, proyecto = sitio.proyecto || {}, tema = op.tema;
    var obra = proyecto.titulo || 'Resistencias del aura';
    var tipoTxt = e.tipo === 'apunte' ? 'apunte' : 'cuaderno';
    var nativo = typeof navigator.share === 'function';

    var velo = document.createElement('div'); velo.className = 'velo';
    var p = document.createElement('div');
    p.className = 'ajustes compartir';
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Compartir este ' + tipoTxt);
    p.innerHTML = '<span class="ajustes__asa" aria-hidden="true"></span>' +
      '<div class="compartir__cab">' + RA.htmlMini(e, tema) +
        '<div class="compartir__textos"><span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) + '</span>' +
        '<span class="compartir__titulo">' + esc(e.titulo) + '</span></div>' +
        '<button type="button" class="compartir__cerrar" aria-label="Cerrar">' + IC.cerrar + '</button></div>' +
      '<ul class="compartir__lista">' +
        (nativo ? fila('nativo', IC.nativo, 'Compartir…', 'Con las apps de este dispositivo') : '') +
        '<li><a class="compartir__op" data-op="whatsapp" target="_blank" rel="noopener" href="#">' + IC.whatsapp + textos('WhatsApp', '') + '</a></li>' +
        fila('enlace', IC.enlace, 'Copiar enlace', '') +
        fila('referencia', IC.cita, 'Copiar referencia', 'APA 7') +
        '<li><a class="compartir__op" data-op="correo" href="#">' + IC.correo + textos('Enviar por correo', '') + '</a></li>' +
        '<li class="compartir__pdf"><button type="button" class="compartir__op" data-op="pdf" aria-busy="true">' + IC.pdf + textos('Descargar PDF', 'Preparando…') + '</button></li>' +
      '</ul>';
    document.body.appendChild(velo); document.body.appendChild(p);
    if (op.boton) op.boton.setAttribute('aria-expanded', 'true');

    function teclas(ev) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); C.cerrar(true); } }
    abierta = { panel: p, velo: velo, boton: op.boton, teclas: teclas };
    document.addEventListener('keydown', teclas);
    velo.onclick = function () { C.cerrar(true); };
    p.querySelector('.compartir__cerrar').onclick = function () { C.cerrar(true); };
    (p.querySelector('.compartir__op') || p).focus({ preventScroll: true });

    // Enlaces y PDF: según lo que haya generado la Action (se averigua una vez por visita)
    var url = C.enlace(e, null, false), pdf = null;
    function ponerEnlaces() {
      var corto = RA.antetitulo(e) + ' · ' + e.titulo;
      p.querySelector('[data-op="whatsapp"]').href = 'https://wa.me/?text=' + encodeURIComponent('«' + e.titulo + '» · ' + RA.antetitulo(e) + ' de ' + obra + '\n' + url);
      var cuerpo = 'Te comparto este ' + tipoTxt + ' de ' + obra + (proyecto.autor ? ', de ' + proyecto.autor : '') + ':\n\n' +
        corto + '\n' + (e.entradilla ? e.entradilla + '\n' : '') + '\n' + url;
      p.querySelector('[data-op="correo"]').href = 'mailto:?subject=' + encodeURIComponent(obra + ' · ' + C.tituloCita(e)) + '&body=' + encodeURIComponent(cuerpo);
    }
    ponerEnlaces();
    var bPdf = p.querySelector('[data-op="pdf"]');
    var listo = false;
    function ponerPdf(m) {
      if (listo || !p.isConnected) return;
      listo = true;
      var g = C.generado(m, e);
      if (g && g.pagina) { url = C.enlace(e, null, true); ponerEnlaces(); }
      pdf = g && g.pdf;
      bPdf.removeAttribute('aria-busy');
      var sub = bPdf.querySelector('small');
      if (pdf) {
        var a = document.createElement('a');
        a.className = 'compartir__op'; a.setAttribute('data-op', 'pdf');
        a.href = pdf.pdf; a.setAttribute('download', pdf.archivo || C.nombreArchivo(e, proyecto));
        a.innerHTML = IC.pdf + textos('Descargar PDF', 'A5' + (pdf.paginas ? ' · ' + pdf.paginas + ' páginas' : '') + (pdf.kb ? ' · ' + tamano(pdf.kb) : ''));
        a.addEventListener('click', function () { setTimeout(function () { C.cerrar(false); }, 150); });
        bPdf.replaceWith(a); bPdf = a;
      } else if (sub) sub.textContent = 'Se abre para guardarlo o imprimirlo';
    }
    C.manifiesto().then(ponerPdf);
    setTimeout(function () { ponerPdf(null); }, 2500);   // si el servidor tarda, no se queda esperando

    p.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-op]'); if (!b) return;
      var k = b.getAttribute('data-op');
      if (k === 'nativo') {
        ev.preventDefault();
        navigator.share({ title: RA.antetitulo(e) + ' · ' + e.titulo + ' · ' + obra, text: e.entradilla || ('Un ' + tipoTxt + ' de ' + obra), url: url })
          .then(function () { C.cerrar(true); }).catch(function () { /* cancelado: la hoja sigue abierta */ });
      } else if (k === 'enlace') {
        ev.preventDefault();
        C.copiar(url).then(function () { avisar(b, 'Enlace copiado', ''); }, function () { avisar(b, 'No se pudo copiar', url); });
      } else if (k === 'referencia') {
        ev.preventDefault();
        var r = C.referencia(e, proyecto, url);
        C.copiar(r.texto, '<span>' + r.html + '</span>').then(function () { avisar(b, 'Referencia copiada', 'APA 7'); }, function () { avisar(b, 'No se pudo copiar', r.texto); });
      } else if (k === 'pdf' && b.tagName === 'BUTTON') {
        ev.preventDefault();
        var dir = C.pagina() + '#/imprimir/' + encodeURIComponent(e.slug) + '?imprimir=1';
        var w = null;
        try { w = window.open(dir, '_blank'); } catch (x) { w = null; }
        C.cerrar(false);
        if (!w) location.hash = '#/imprimir/' + encodeURIComponent(e.slug) + '?imprimir=1';
      } else if (k === 'whatsapp' || k === 'correo') {
        setTimeout(function () { C.cerrar(false); }, 150);
      }
    });
  };

  function textos(t, sub) { return '<span class="compartir__op-t"><span>' + esc(t) + '</span>' + (sub != null ? '<small>' + esc(sub) + '</small>' : '') + '</span>'; }
  function fila(k, ic, t, sub) { return '<li><button type="button" class="compartir__op" data-op="' + k + '">' + ic + textos(t, sub) + '</button></li>'; }
  function tamano(kb) { return kb >= 1000 ? (Math.round(kb / 100) / 10).toString().replace('.', ',') + ' MB' : Math.max(1, Math.round(kb)) + ' KB'; }
  function avisar(b, t, sub) {
    var s = b.querySelector('.compartir__op-t');
    if (!b._antes) b._antes = { html: s.innerHTML, ic: b.querySelector('svg').outerHTML };
    s.innerHTML = '<span>' + esc(t) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '');
    b.querySelector('svg').outerHTML = IC.listo;
    b.classList.add('hecho');
    clearTimeout(b._t);
    b._t = setTimeout(function () {
      if (!b.isConnected) return;
      s.innerHTML = b._antes.html; b.querySelector('svg').outerHTML = b._antes.ic; b.classList.remove('hecho'); b._antes = null;
    }, 2200);
  }
})();
