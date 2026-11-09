/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · versión para imprimir y PDF (A-22)

   #/imprimir/<slug>                 vista de impresión en A5 (en pantalla se ve como hojas)
   #/imprimir/<slug>?imprimir=1      … y abre el diálogo de impresión al terminar de cargar
   #/imprimir/<slug>?tarjeta=1       la imagen para redes (1200 × 630) que usa la GitHub Action
   Parámetros que pasa la Action: base=https://…/ (dirección del sitio) y enlace=bonito (e/<slug>/).

   Hojas: 1 portada (la misma receta de la portadilla) · 2 apertura (solo capítulos) ·
          texto con encabezados y folio · colofón (fin, cómo citar, QR, sigue, créditos).
   Siempre en claro, sobre blanco, con la paleta vigente. El color del cuaderno es solo un acento.
   Cuando todo cargó (letras, imágenes, QR) marca <html data-impreso="listo">.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  var QR_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  var PX_MM = 96 / 25.4;

  function C() { return RA.compartir; }

  /* ── QR (qrcode-generator, desde jsDelivr; si no carga, el colofón sigue sin él) ── */
  function cargarQR() {
    if (window.qrcode) return Promise.resolve(true);
    return new Promise(function (listo) {
      var s = document.createElement('script');
      s.src = QR_URL; s.async = true;
      s.onload = function () { listo(!!window.qrcode); };
      s.onerror = function () { listo(false); };
      document.head.appendChild(s);
      setTimeout(function () { listo(!!window.qrcode); }, 8000);
    });
  }
  function svgQR(texto, color) {
    var q = window.qrcode(0, 'M');
    q.addData(texto); q.make();
    var n = q.getModuleCount(), d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
    return '<svg class="imp-qr__svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="Código QR del enlace">' +
      '<path d="' + d + '" fill="' + color + '"/></svg>';
  }

  /* Texto para content: "…" en CSS */
  function cssTexto(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\f]+/g, ' ') + '"'; }
  function mayus(s) { try { return String(s).toLocaleUpperCase('es'); } catch (x) { return String(s).toUpperCase(); } }
  function corto(s, n) { s = String(s || '').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

  /* Título en dos tintas (registro ya acomodado) */
  function registro(titulo, clase) {
    return '<div class="imp-registro ' + (clase || '') + '"><span class="imp-registro__a">' + esc(titulo) + '</span>' +
      '<span class="imp-registro__b" aria-hidden="true">' + esc(titulo) + '</span></div>';
  }

  /* ── Colores de la entrada ── */
  function colores(e, t) {
    var pal = t.pal, esApunte = e.tipo === 'apunte';
    var st = RA.estiloPortada(e, t), fa = esApunte ? RA.fichaApunte(e, t) : null;
    var color = esApunte ? fa.color : st.bg;
    // Tinta del cuaderno sobre blanco. Las fichas de apunte claras (amarillo, manila, hueso…) se vuelven turbias
    // al oscurecerlas: para ellas, la tinta de la paleta.
    var tc = esApunte && RA.lum(color) > 0.42 ? pal.tinta : RA.tintaLegible(color, pal.tinta);
    var tc2 = RA.tintaLegible(pal.tituloB, pal.tinta);
    if (tc2.toUpperCase() === tc.toUpperCase()) tc2 = RA.tintaLegible(pal.tituloA, pal.tinta);
    return { st: st, fa: fa, color: color, tc: tc, tc2: tc2, sobre: RA.lum(tc) < 0.3 ? '#FFFFFF' : pal.tinta };
  }

  /* ══ Hojas ══════════════════════════════════════════════════════ */
  function portada(e, t, k, proyecto) {
    var obra = '<span class="imp-portada__obra">' + esc(proyecto.titulo || '') + (proyecto.autor ? ' · ' + esc(proyecto.autor) : '') + '</span>';
    if (e.tipo === 'apunte') {
      var fa = k.fa, sello = RA.selloDe(e);
      return '<section class="imp-hoja imp-portada imp-portada--apunte">' +
        '<div class="imp-ficha' + (fa.claro ? '' : ' imp-ficha--oscura') + '">' +
          '<span class="imp-ficha__pestana" style="background-color:' + fa.color + ';color:' + fa.texto + '">' + esc(RA.numeroCorto(e)) + '</span>' +
          '<div class="imp-ficha__carton" style="background-color:' + fa.color + ';color:' + fa.texto + ';--pc:' + fa.pc + '">' +
            (fa.patron !== 'lisa' ? '<span class="pat p-' + esc(fa.patron) + '"></span>' : '') +
            (sello ? RA.selloHTML(sello, 'sello--ficha') : '') +
            '<span class="antetitulo">Apunte · ' + RA.minutos(e) + '</span><span class="imp-ficha__filete"></span>' +
            '<h1 class="imp-ficha__titulo">' + esc(e.titulo) + '</h1>' +
            (e.entradilla ? '<p class="imp-ficha__entradilla">' + esc(e.entradilla) + '</p>' : '') +
          '</div></div>' + obra + '</section>';
    }
    var st = k.st;
    return '<section class="imp-hoja imp-portada" style="--pc:' + st.pc + ';' + (st.imagen
        ? 'background:' + st.bg + ' url(\'' + encodeURI(st.imagen) + '\') center/cover no-repeat'
        : 'background:' + st.bg) + ';color:' + st.fg + '">' +
      (st.imagen ? '' : RA.capaFormas(st.receta, t) + RA.htmlPatron(st.patron)) +
      '<span class="imp-portada__costura" style="border-color:' + st.costura + '"></span>' +
      '<span class="imp-portada__numero" style="color:' + (st.imagen ? 'var(--papel)' : st.num) + '" aria-hidden="true">' + RA.numeroCorto(e) + '</span>' +
      '<div class="imp-portada__etiqueta"><span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) + '</span>' +
        '<h1>' + esc(e.titulo) + '</h1></div>' +
      obra + '</section>';
  }

  function apertura(e, t, k, proyecto, conAudio) {
    var datos = [];
    if (proyecto.autor) datos.push(['Texto', proyecto.autor]);
    if (conAudio) datos.push(['Audio', RA.audio.creditos(e.audio, proyecto.autor || '') + (e.audio.duracion ? ' · ' + RA.audio.minutos(e.audio.duracion) + ' min' : '')]);
    var pub = C().fecha(e.publicado_en);
    if (pub) datos.push(['Publicado', pub]);
    datos.push(['Lectura', RA.minutos(e)]);
    return '<section class="imp-hoja imp-apertura">' +
      registro(proyecto.titulo || 'Resistencias del aura', 'imp-registro--apertura') +
      '<div class="imp-apertura__centro">' +
        '<span class="imp-apertura__num" aria-hidden="true">' + esc(RA.numeroCorto(e)) + '</span>' +
        '<span class="antetitulo">' + esc(RA.antetitulo(e)) + '</span>' +
        '<h1 class="imp-apertura__titulo">' + esc(e.titulo) + '</h1>' +
        (e.entradilla ? '<p class="imp-apertura__entradilla">' + esc(e.entradilla) + '</p>' : '') +
      '</div>' +
      '<dl class="imp-datos">' + datos.map(function (d) { return '<div><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '</section>';
  }

  function cuadritos() { return '<span class="imp-cuadros" aria-hidden="true"><i></i><i></i><i></i></span>'; }

  function colofon(e, t, k, op, url, conAudio) {
    var sitio = op.sitio, proyecto = sitio.proyecto || {}, extra = (sitio.apariencia && sitio.apariencia.extra) || {};
    var esApunte = e.tipo === 'apunte', sig = op.siguiente;
    var ref = C().referencia(e, proyecto, url);
    var fin = esApunte ? 'Fin del apunte' : e.numero ? 'Fin del día ' + e.numero : 'Fin del capítulo';
    var derechos = String(extra.pdf_derechos || '').trim() ||
      '© ' + C().anio(e.publicado_en) + (proyecto.autor ? ' ' + proyecto.autor : '') + '. Todos los derechos reservados.';
    var creditos = [];
    if (proyecto.autor) creditos.push('Texto: ' + proyecto.autor);
    if (conAudio) creditos.push('Audio: ' + RA.audio.creditos(e.audio, proyecto.autor || '').replace(/^Narra /, 'narra '));
    var siguiente = '';
    if (sig) {
      var sc = sig.tipo === 'apunte' ? RA.fichaApunte(sig, t).color : RA.estiloPortada(sig, t).bg;
      var sclaro = RA.esClaro(sc);
      siguiente = '<div class="imp-sigue" style="background:' + sc + ';color:' + (sclaro ? t.pal.tinta : t.pal.papel) + '">' +
        '<span class="antetitulo">Sigue · ' + esc(RA.antetitulo(sig)) + '</span><span class="imp-sigue__titulo">' + esc(sig.titulo) + '</span></div>';
    } else {
      siguiente = '<div class="imp-sigue imp-sigue--ultimo"><span class="antetitulo">Por ahora, el último</span><span class="imp-sigue__titulo">Pronto, la siguiente entrega</span></div>';
    }
    var conv = '';
    if (RA.convocatoria && RA.convocatoria.activa(sitio.apariencia)) {
      var cf = RA.convocatoria.config(sitio.apariencia), dir = RA.convocatoria.DIR;
      conv = '<div class="imp-conv"><p>' + esc(RA.convocatoria.LEYENDA) + '</p><div class="imp-conv__logos">' +
        '<img src="' + dir + cf.escudo_claro + '.png" alt="Alcaldía de Medellín · Distrito de Ciencia, Tecnología e Innovación" class="imp-conv__escudo">' +
        '<img src="' + dir + cf.pp_claro + '.png" alt="Presupuesto Participativo Cultura" class="imp-conv__pp"></div></div>';
    }
    var linea = url.replace(/^https?:\/\//, '');
    return '<section class="imp-hoja imp-colofon">' +
      '<div class="imp-colofon__fin"><p class="imp-fin">' + esc(fin) + '</p>' + cuadritos() + '</div>' +
      '<div class="imp-colofon__cita"><h2>Cómo citar</h2><p class="imp-ref">' + ref.html + '</p></div>' +
      '<div class="imp-qr"><div class="imp-qr__codigo"></div><div class="imp-qr__textos">' +
        '<span class="antetitulo">' + (conAudio ? 'Léelo y escúchalo en línea' : 'Léelo en línea') + '</span>' +
        '<a class="imp-qr__url" href="' + esc(url) + '">' + esc(linea) + '</a></div></div>' +
      siguiente +
      '<div class="imp-creditos">' + (creditos.length ? '<p>' + esc(creditos.join(' · ')) + '</p>' : '') +
        '<p>' + esc(derechos) + '</p>' +
        '<p class="imp-version">' + esc(proyecto.titulo || '') + ' · versión del ' + esc(C().fecha(e.actualizado_en || e.publicado_en)) + '</p></div>' +
      conv +
      '</section>';
  }

  /* Encabezados y folio: van en los márgenes de cada página (@page) */
  function estiloPaginas(e, proyecto, k) {
    var izq = mayus(proyecto.titulo || 'Resistencias del aura');
    var der = mayus(RA.antetitulo(e) + ' · ' + corto(e.titulo, 46));
    var cabeza = 'font-family: var(--f-ui); font-size: 6.4pt; font-weight: 500; letter-spacing: .16em; color: #6E6D80; vertical-align: bottom; padding-bottom: 5mm;';
    var folio = 'font-family: var(--f-ui); font-size: 7.5pt; font-weight: 600; letter-spacing: .06em; color: ' + k.tc + '; vertical-align: top; padding-top: 6mm;';
    var nada = '@top-left { content: none } @top-right { content: none } @bottom-left { content: none } @bottom-right { content: none }';
    return '@page { size: 148mm 210mm; margin: 19mm 15mm 21mm 15mm; }\n' +
      '@page :left { margin-left: 15mm; margin-right: 19mm; @top-left { content: ' + cssTexto(izq) + '; ' + cabeza + ' } @bottom-left { content: counter(page); ' + folio + ' } }\n' +
      '@page :right { margin-left: 19mm; margin-right: 15mm; @top-right { content: ' + cssTexto(der) + '; ' + cabeza + ' } @bottom-right { content: counter(page); ' + folio + ' } }\n' +
      '@page portada { margin: 0; ' + nada + ' }\n@page apertura { margin: 0; ' + nada + ' }\n@page colofon { margin: 0; ' + nada + ' }\n';
  }

  /* Cuerpo: el mismo HTML de la lectura, con la capitular, las citas, las notas al final y los enlaces absolutos */
  function prepararCuerpo(raiz, e, pagina) {
    var cuerpo = raiz.querySelector('.imp-texto .cuerpo');
    if (e.tipo !== 'apunte' && RA.ponerCapitular) RA.ponerCapitular(cuerpo);
    if (RA.prepararCitas) RA.prepararCitas({ raiz: raiz.querySelector('.imp-texto'), e: e });
    // Notas al pie: la marca en su sitio y la lista al final del texto
    var lista = [].slice.call(cuerpo.querySelectorAll('ol.notas-pie')).pop();
    var marcas = [].slice.call(cuerpo.querySelectorAll('sup.np'));
    if (lista || marcas.length) {
      var estilo = lista && /\bnumeros\b/.test(lista.className) ? 'numeros' : 'simbolos';
      var notas = lista ? [].slice.call(lista.children).filter(function (x) { return x.tagName === 'LI'; }).map(function (li) { return li.innerHTML; }) : [];
      if (lista) lista.remove();
      marcas.forEach(function (m, i) {
        if (i >= notas.length) return m.remove();
        m.className = 'np imp-np' + (i >= 12 ? ' imp-np--vuelta' : '');
        m.innerHTML = RA.marcaNota(i, estilo, 8);
      });
      if (notas.length) {
        var s = document.createElement('section');
        s.className = 'imp-notas';
        s.innerHTML = '<h2>Notas</h2><ol>' + notas.map(function (h, i) {
          return '<li><span class="imp-notas__marca' + (i >= 12 ? ' imp-np--vuelta' : '') + (estilo === 'numeros' ? ' imp-notas__marca--num' : '') + '" aria-hidden="true">' + RA.marcaNota(i, estilo, 8) + '</span>' +
            '<div class="imp-notas__texto"><span class="solo-lector">Nota ' + (i + 1) + ': </span>' + h + '</div></li>';
        }).join('') + '</ol>';
        cuerpo.parentNode.appendChild(s);
      }
    }
    // Enlaces internos (referentes, otros cuadernos): con la dirección completa, para que sirvan en el PDF
    raiz.querySelectorAll('.imp-texto a[href^="#"]').forEach(function (a) { a.setAttribute('href', pagina + a.getAttribute('href')); });
    raiz.querySelectorAll('.imp-texto img').forEach(function (im) { im.loading = 'eager'; im.decoding = 'sync'; });
  }

  function esperarImagenes(raiz) {
    var imgs = [].slice.call(raiz.querySelectorAll('img'));
    var fondos = [].slice.call(raiz.querySelectorAll('.imp-portada, .tarjeta-og__portada')).map(function (el) {
      var m = (el.getAttribute('style') || '').match(/url\('([^']+)'\)/);
      if (!m) return null;
      var im = new Image(); im.src = m[1]; return im;
    }).filter(Boolean);
    return Promise.all(imgs.concat(fondos).map(function (im) {
      if (im.complete && im.naturalWidth) return Promise.resolve();
      return new Promise(function (ok) {
        im.addEventListener('load', ok, { once: true }); im.addEventListener('error', ok, { once: true });
        setTimeout(ok, 20000);
      });
    }));
  }

  function zoomPantalla(raiz) {
    var ancho = 148 * PX_MM + 32;
    // En el celular, el ancho de la pantalla: el de la ventana puede haberse estirado con la hoja
    var w = Math.min(document.documentElement.clientWidth || window.innerWidth, (window.screen && window.screen.width) || 1e4);
    raiz.style.setProperty('--imp-zoom', String(Math.min(1, w / ancho)));
  }

  /* ══ Tarjeta para redes (1200 × 630) ═════════════════════════════ */
  function tarjeta(op, k, url) {
    var e = op.e, t = op.tema, proyecto = op.sitio.proyecto || {}, pal = t.pal, izq;
    if (e.tipo === 'apunte') {
      var fa = k.fa;
      izq = '<div class="tarjeta-og__portada tarjeta-og__portada--apunte" style="background:' + pal.papel + '">' +
        '<div class="imp-ficha' + (fa.claro ? '' : ' imp-ficha--oscura') + '"><span class="imp-ficha__pestana" style="background-color:' + fa.color + ';color:' + fa.texto + '">' + esc(RA.numeroCorto(e)) + '</span>' +
        '<div class="imp-ficha__carton" style="background-color:' + fa.color + ';color:' + fa.texto + ';--pc:' + fa.pc + '">' +
          (fa.patron !== 'lisa' ? '<span class="pat p-' + esc(fa.patron) + '"></span>' : '') +
          '<span class="antetitulo">Apunte · ' + RA.minutos(e) + '</span><span class="imp-ficha__filete"></span>' +
          '<span class="tarjeta-og__numero-ficha">' + esc(RA.numeroCorto(e)) + '</span></div></div></div>';
    } else {
      var st = k.st;
      izq = '<div class="tarjeta-og__portada" style="--pc:' + st.pc + ';' + (st.imagen ? 'background:' + st.bg + ' url(\'' + encodeURI(st.imagen) + '\') center/cover no-repeat' : 'background:' + st.bg) + '">' +
        (st.imagen ? '' : RA.capaFormas(st.receta, t) + RA.htmlPatron(st.patron)) +
        '<span class="imp-portada__costura" style="border-color:' + st.costura + '"></span>' +
        '<span class="tarjeta-og__numero" style="color:' + (st.imagen ? 'var(--papel)' : st.num) + '">' + RA.numeroCorto(e) + '</span></div>';
    }
    var dominio = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return '<div class="tarjeta-og" style="--tc:' + k.tc + ';--tc2:' + k.tc2 + '">' + izq +
      '<div class="tarjeta-og__texto" style="background:' + pal.papel + ';color:' + pal.tinta + '">' +
        registro(proyecto.titulo || 'Resistencias del aura', 'imp-registro--tarjeta') +
        '<div class="tarjeta-og__medio"><span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) + (proyecto.autor ? ' · ' + esc(proyecto.autor) : '') + '</span>' +
        '<h1 class="tarjeta-og__titulo">' + esc(e.titulo) + '</h1>' +
        (e.entradilla ? '<p class="tarjeta-og__entradilla">' + esc(e.entradilla) + '</p>' : '') + '</div>' +
        '<span class="tarjeta-og__dominio">' + esc(dominio) + cuadritos() + '</span>' +
      '</div></div>';
  }

  /* ══ Pintar ══════════════════════════════════════════════════════
     op: {raiz, e, sitio, tema, siguiente, consulta (URLSearchParams)}. Devuelve la limpieza. */
  RA.imprimir = {
    pintar: function (op) {
      var q = op.consulta, e = op.e, t = op.tema, sitio = op.sitio, proyecto = sitio.proyecto || {};
      var raizDoc = document.documentElement, vigente = true;
      var pagina = C().pagina(q), url = C().enlace(e, q, q.get('enlace') === 'bonito');
      var k = colores(e, t);
      var conAudio = !!(RA.audio && RA.audio.tiene(e.audio) && RA.audio.sinc(e.audio) !== 'citas');
      var vars = '--tc:' + k.tc + ';--tc2:' + k.tc2 + ';--tc-sobre:' + k.sobre + ';--imp-color:' + k.color +
        ';--np:' + k.tc + ';--np2:' + k.tc2 + ';--np-sobre:' + k.sobre;

      if (q.get('tarjeta') === '1') {
        raizDoc.classList.add('modo-tarjeta');
        op.raiz.innerHTML = tarjeta(op, k, url);
        var tj = op.raiz.firstChild;
        Promise.all([document.fonts ? document.fonts.ready : null, esperarImagenes(tj)]).then(function () {
          if (!vigente) return;
          // Un título largo se achica hasta caber (con el antetítulo, la entradilla y el dominio)
          var h1 = tj.querySelector('.tarjeta-og__titulo'), caja = tj.querySelector('.tarjeta-og__texto'), fs = 64;
          while (caja.scrollHeight > caja.clientHeight + 1 && fs > 30) { fs -= 2; h1.style.fontSize = fs + 'px'; }
          raizDoc.setAttribute('data-impreso', 'listo');
        });
        return function () { vigente = false; raizDoc.classList.remove('modo-tarjeta'); raizDoc.removeAttribute('data-impreso'); };
      }

      var esApunte = e.tipo === 'apunte';
      document.title = [proyecto.titulo || 'Resistencias del aura', RA.antetitulo(e), e.titulo].join(' — ');
      var estilo = document.createElement('style');
      estilo.id = 'imp-paginas'; estilo.textContent = estiloPaginas(e, proyecto, k);
      document.head.appendChild(estilo);

      op.raiz.innerHTML =
        '<div class="imp-barra"><a class="imp-barra__volver" href="#/leer/' + encodeURIComponent(e.slug) + '">← <span>Volver al ' + (esApunte ? 'apunte' : 'cuaderno') + '</span></a>' +
          '<span class="imp-barra__nota">Versión para imprimir · A5</span>' +
          '<button type="button" class="boton imp-barra__imprimir" data-imprimir>Guardar como PDF</button></div>' +
        '<p class="imp-ayuda">En la ventana que se abre, elige <b>Guardar como PDF</b> como destino. Si no ves los colores, activa «Gráficos de fondo».</p>' +
        '<div class="impreso' + (esApunte ? ' impreso--apunte' : '') + '" style="' + vars + '">' +
          portada(e, t, k, proyecto) +
          (esApunte ? '' : apertura(e, t, k, proyecto, conAudio)) +
          '<article class="imp-texto"><div class="cuerpo">' + RA.limpiarHTML(e.cuerpo_html) + '</div></article>' +
          colofon(e, t, k, op, url, conAudio) +
        '</div>';
      raizDoc.classList.add('modo-impreso');
      var hojas = op.raiz.querySelector('.impreso');
      prepararCuerpo(hojas, e, pagina);
      zoomPantalla(op.raiz);
      var alRedimensionar = function () { zoomPantalla(op.raiz); };
      window.addEventListener('resize', alRedimensionar);
      op.raiz.querySelector('[data-imprimir]').onclick = function () { window.print(); };
      window.scrollTo(0, 0);

      var qr = cargarQR().then(function (ok) {
        var caja = hojas.querySelector('.imp-qr__codigo');
        if (ok && caja) { try { caja.innerHTML = svgQR(url, t.pal.tinta); } catch (x) { caja.remove(); } }
        else if (caja) caja.remove();
      });
      Promise.all([document.fonts ? document.fonts.ready : null, esperarImagenes(hojas), qr]).then(function () {
        if (!vigente) return;
        raizDoc.setAttribute('data-impreso', 'listo');
        if (q.get('imprimir') === '1') setTimeout(function () { if (vigente) window.print(); }, 350);
      });

      return function () {
        vigente = false;
        window.removeEventListener('resize', alRedimensionar);
        estilo.remove();
        raizDoc.classList.remove('modo-impreso');
        raizDoc.removeAttribute('data-impreso');
      };
    }
  };
})();
