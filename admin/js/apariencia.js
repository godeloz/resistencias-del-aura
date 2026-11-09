/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · Apariencia del sitio (y textos del inicio)
   La vista previa es el sitio real dentro de un marco: recibe los cambios
   por mensaje y no guarda nada hasta «Publicar cambios».
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, T = RA.TOKENS;
  var REPO_GITHUB = 'godeloz/resistencias-del-aura';   // donde corre la Action que prepara los PDF (A-22)
  function A() { return RA.admin; }
  function ui() { return RA.ui; }
  RA.paginas = RA.paginas || {};

  var NOMBRES = {
    fondoSitio: { papel: 'Papel de la paleta', blanco: 'Blanco', hueso: 'Hueso', gris: 'Gris claro', lavanda: 'Lavanda gris', arena: 'Arena', noche: 'Noche (oscuro)' },
    fondoAdmin: { huesoCalido: 'Hueso cálido', blanco: 'Blanco', gris: 'Gris claro', lavanda: 'Lavanda gris', noche: 'Noche' },
    deco: [['ninguna', 'Ninguna', 'fondo liso'], ['aura', 'Aura', 'anillos que laten'], ['patron', 'Patrón', 'puntos muy sutiles'], ['formas', 'Formas', 'manchas de tinta lentas']],
    titulos: { jost: 'Jost', bigshoulders: 'Big Shoulders', fraunces: 'Fraunces', cormorant: 'Cormorant' },
    lectura: { newsreader: 'Newsreader', literata: 'Literata', ebgaramond: 'EB Garamond', lora: 'Lora' },
    patrones: { grano: 'Grano', puntos: 'Puntos', rayado: 'Rayado', cuadricula: 'Cuadrícula', milimetrado: 'Milimetrado', diagonal: 'Diagonal', tejido: 'Tejido', anillos: 'Anillos', ondas: 'Ondas', lomos: 'Lomos', damero: 'Damero', trama: 'Trama' }
  };
  var CAMPOS = ['paleta', 'fondo_sitio', 'fondo_admin', 'decoracion_inicio', 'carrusel', 'fuente_titulos', 'fuente_texto', 'patron_defecto', 'modo_lectura_defecto'];

  function cargarTodasLasFuentes() {
    if (document.getElementById('fuentes-todas')) return;
    var fams = ['Jost:wght@300..700'];
    Object.keys(T.titulos).forEach(function (k) { fams.push(T.titulos[k].google); });
    Object.keys(T.lectura).forEach(function (k) { fams.push(T.lectura[k].google); });
    var l = document.createElement('link');
    l.id = 'fuentes-todas'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + fams.filter(function (f, i, a) { return a.indexOf(f) === i; }).map(function (f) { return 'family=' + f; }).join('&') + '&display=swap';
    document.head.appendChild(l);
  }

  RA.paginas.apariencia = function () {
    document.title = 'Apariencia · Administración';
    cargarTodasLasFuentes();
    var P = A().principal;
    var guardada = Object.assign({}, A().apariencia), proyectoG = Object.assign({}, A().proyecto);
    // Los campos firma, firma_anio y lugar existen desde el SQL 05; antes de correrlo se muestran desactivados.
    var CON05 = 'firma' in proyectoG, TEXTOS = ['titulo', 'autor', 'introduccion'].concat(CON05 ? ['firma', 'firma_anio', 'lugar'] : []);
    function textosDe(x) {
      return { titulo: x.titulo || '', autor: x.autor || '', introduccion: x.introduccion || '',
        firma: x.firma == null ? 'investigación por entregas' : x.firma, firma_anio: x.firma_anio !== false, lugar: x.lugar == null ? 'Medellín' : x.lugar };
    }
    function copiaAp(x) { var c = Object.assign({}, x); c.extra = JSON.parse(JSON.stringify(x.extra || {})); return c; }
    var ap = copiaAp(guardada), pr = textosDe(proyectoG);
    var sellos = undefined;   // undefined = cargando · null = falta el SQL 06 · [] = lista
    var vistaHoja = 'claro';  // muestra de la hoja de notas: claro o noche (no se guarda)
    var vista = { tam: 'movil', pagina: 'inicio' };
    var primera = (A().entradas || []).filter(function (e) { return e.estado === 'publicado'; })[0];

    P.innerHTML = '<div class="ap">' +
      '<div class="ap-opciones"><header class="a-cabecera"><h1>Apariencia del sitio</h1><div class="a-acciones">' +
        '<span class="ap-estado" aria-live="polite"></span>' +
        '<button type="button" class="a-boton" data-ap="descartar">Descartar</button>' +
        '<button type="button" class="a-boton a-boton--primario" data-ap="publicar">Publicar cambios</button></div></header>' +
        '<div class="ap-secciones"></div></div>' +
      '<aside class="ap-vista"><div class="ap-vista__barra"><span class="ap-lbl">Vista previa</span>' +
        '<span class="ed-seg ap-seg" role="group" aria-label="Tamaño"><button type="button" data-tam="movil">Móvil</button><button type="button" data-tam="escritorio">Escritorio</button></span>' +
        '<span class="ed-seg ap-seg" role="group" aria-label="Página"><button type="button" data-pag="inicio">Inicio</button><button type="button" data-pag="capitulo"' + (primera ? '' : ' disabled title="Publica una entrada para verla aquí"') + '>Capítulo</button><button type="button" data-pag="referentes">Referentes</button></span></div>' +
        '<div class="ap-marco"><iframe title="Vista previa del sitio" src="../index.html?prevista=1"></iframe></div>' +
        '<p class="ed-nota">Es el sitio real con tus entradas publicadas. Los cambios solo se guardan al pulsar «Publicar cambios».</p></aside></div>';

    var secc = P.querySelector('.ap-secciones'), marco = P.querySelector('iframe'), caja = P.querySelector('.ap-marco');

    function anillo(sel) { return sel ? ' aria-pressed="true"' : ' aria-pressed="false"'; }
    function pintar() {
      var pal = T.paletas[ap.paleta], h = '';
      h += htmlConvocatoria(pal);
      h += '<section class="ap-sec"><h2 class="ap-lbl">Textos del inicio</h2>' +
        '<label class="a-campo">Título del proyecto<input type="text" data-pr="titulo" value="' + esc(pr.titulo) + '"></label>' +
        '<label class="a-campo">Autor<input type="text" data-pr="autor" value="' + esc(pr.autor) + '"></label>' +
        '<label class="a-campo">Línea bajo el título <span class="ap-ayuda">(va después del autor)</span><input type="text" data-pr="firma" value="' + esc(pr.firma) + '" placeholder="investigación por entregas"' + (CON05 ? '' : ' disabled') + '></label>' +
        '<label class="ap-check"><input type="checkbox" data-pr="firma_anio"' + (pr.firma_anio ? ' checked' : '') + (CON05 ? '' : ' disabled') + '> Agregar al final el año de la última publicación</label>' +
        '<label class="a-campo">Lugar en el pie de página<input type="text" data-pr="lugar" value="' + esc(pr.lugar) + '" placeholder="Medellín"' + (CON05 ? '' : ' disabled') + '></label>' +
        '<p class="ed-nota ap-vistazo">Así se verá: <b class="ap-vistazo__firma"></b><br>Pie: <b class="ap-vistazo__pie"></b></p>' +
        (CON05 ? '' : '<p class="ed-nota ap-falta">Para editar la línea bajo el título y el lugar, corre en Supabase el archivo <code>supabase/05-textos-y-lectura.sql</code> (SQL Editor → pegar → Run) y recarga esta página.</p>') +
        '<label class="a-campo">Introducción <span class="ap-cuenta"></span><textarea rows="5" data-pr="introduccion">' + esc(pr.introduccion) + '</textarea></label></section>';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Grupo de paleta</h2><div class="ap-fila">' + Object.keys(T.paletas).map(function (k) {
        var p = T.paletas[k];
        return '<button type="button" class="ap-op ap-paleta" data-campo="paleta" data-valor="' + k + '"' + anillo(ap.paleta === k) + ' style="background:' + p.papel + ';color:' + p.tinta + '">' +
          '<span class="ap-tiras">' + p.cuadernos.concat([p.apunte]).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span><b>' + p.nombre + '</b></button>';
      }).join('') + '</div></section>';
      h += '<section class="ap-sec ap-dos"><div><h2 class="ap-lbl">Fondo del sitio (lectura)</h2><div class="ap-circulos">' + Object.keys(T.fondosSitio).map(function (k) {
          var c = T.fondosSitio[k] || pal.papel;
          return '<button type="button" class="ap-circulo" data-campo="fondo_sitio" data-valor="' + k + '"' + anillo(ap.fondo_sitio === k) + ' style="background:' + c + '" title="' + NOMBRES.fondoSitio[k] + '" aria-label="' + NOMBRES.fondoSitio[k] + '"></button>';
        }).join('') + '</div><span class="ed-nota">' + NOMBRES.fondoSitio[ap.fondo_sitio] + '</span></div>' +
        '<div><h2 class="ap-lbl">Fondo del administrador</h2><div class="ap-circulos">' + Object.keys(T.fondosAdmin).map(function (k) {
          return '<button type="button" class="ap-circulo" data-campo="fondo_admin" data-valor="' + k + '"' + anillo(ap.fondo_admin === k) + ' style="background:' + T.fondosAdmin[k] + '" title="' + NOMBRES.fondoAdmin[k] + '" aria-label="' + NOMBRES.fondoAdmin[k] + '"></button>';
        }).join('') + '</div><span class="ed-nota">' + NOMBRES.fondoAdmin[ap.fondo_admin] + '</span></div></section>';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Decoración de fondo del inicio</h2><div class="ap-fila">' + NOMBRES.deco.map(function (d) {
        return '<button type="button" class="ap-op" data-campo="decoracion_inicio" data-valor="' + d[0] + '"' + anillo(ap.decoracion_inicio === d[0]) + '><b>' + d[1] + '</b><small>' + d[2] + '</small></button>';
      }).join('') + '</div></section>';
      h += '<section class="ap-sec ap-dos"><div><h2 class="ap-lbl">Carrusel de portadas</h2><div class="ap-fila">' +
          [['abanico', 'Abanico'], ['recto', 'Recto']].map(function (k) { return '<button type="button" class="ap-op" data-campo="carrusel" data-valor="' + k[0] + '"' + anillo(ap.carrusel === k[0]) + '><b>' + k[1] + '</b></button>'; }).join('') + '</div></div>' +
        '<div><h2 class="ap-lbl">Lectura por defecto</h2><div class="ap-fila">' +
          [['scroll', 'Scroll', ''], ['paginas', 'Pasar páginas', ''], ['auto', 'Automático', 'páginas en el celular, scroll en el computador']].map(function (k) { return '<button type="button" class="ap-op" data-campo="modo_lectura_defecto" data-valor="' + k[0] + '"' + anillo(ap.modo_lectura_defecto === k[0]) + '><b>' + k[1] + '</b>' + (k[2] ? '<small>' + k[2] + '</small>' : '') + '</button>'; }).join('') + '</div>' +
          '<span class="ed-nota">Aplica a las entradas en «Elige el lector». El lector puede cambiarlo en el panel «Aa».</span></div></section>';
      h += '<section class="ap-sec ap-dos"><div><h2 class="ap-lbl">Tipografía de títulos</h2><div class="ap-rejilla">' + Object.keys(T.titulos).map(function (k) {
          var f = T.titulos[k];
          return '<button type="button" class="ap-op ap-fuente" data-campo="fuente_titulos" data-valor="' + k + '"' + anillo(ap.fuente_titulos === k) + ' style="font-family:' + f.familia + ';font-weight:' + f.peso + ';text-transform:' + (f.mayus ? 'uppercase' : 'none') + ';font-size:20px">' + NOMBRES.titulos[k] + '</button>';
        }).join('') + '</div></div>' +
        '<div><h2 class="ap-lbl">Tipografía de lectura</h2><div class="ap-rejilla">' + Object.keys(T.lectura).map(function (k) {
          return '<button type="button" class="ap-op ap-fuente" data-campo="fuente_texto" data-valor="' + k + '"' + anillo(ap.fuente_texto === k) + ' style="font-family:' + T.lectura[k].familia + ';font-size:18px">' + NOMBRES.lectura[k] + '</button>';
        }).join('') + '</div></div></section>';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Patrón por defecto de las portadas sin imagen <small>(cada entrada puede cambiarlo)</small></h2><div class="ap-patrones">' + T.patrones.map(function (k, i) {
        var c = pal.cuadernos[i % pal.cuadernos.length], cl = RA.esClaro(c);
        return '<button type="button" class="ap-patron" data-campo="patron_defecto" data-valor="' + k + '"' + anillo(ap.patron_defecto === k) + ' title="' + NOMBRES.patrones[k] + '" aria-label="' + NOMBRES.patrones[k] + '" style="background:' + c + ';--pc:' + (cl ? 'rgba(20,20,40,.18)' : 'rgba(255,255,255,.3)') + '"><span class="pat p-' + k + '"></span><span class="ap-patron__n">' + NOMBRES.patrones[k] + '</span></button>';
      }).join('') + '</div></section>';
      // Notas al pie (A-20): la hoja que sube desde abajo. Se guarda en extra.hoja_nota
      var ex = ap.extra || {};
      var temaAp = { a: { extra: ex }, pal: pal };
      h += htmlHojaNota(pal);
      // Fichas de apunte (A-06): se guardan en extra.colores_apunte
      h += '<section class="ap-sec"><h2 class="ap-lbl">Fichas de apunte</h2>' +
        '<h3 class="ap-lbl ap-sub">Colores de las fichas <small>(cada apunte elige uno en el editor)</small></h3><div class="ap-colores">' +
        RA.coloresApunte(temaAp).map(function (c) {
          var cambiado = ((ex.colores_apunte || {})[c.clave]);
          return '<div class="ap-color"><input type="color" data-color-apunte="' + c.clave + '" value="' + c.hex.toLowerCase() + '" aria-label="' + esc(c.nombre) + '"><span>' + esc(c.nombre) + '</span>' +
            (cambiado ? '<button type="button" data-color-apunte-quitar="' + c.clave + '" title="Volver al color original">original</button>' : '') + '</div>';
        }).join('') + '</div></section>';
      // Página de Referentes (A-18): vista con la que abre y color de las tarjetas. Todo en «extra»
      var vr = ex.vista_referentes || 'muro', rc = ex.referentes_color || 'rotacion', rt = ex.referentes_tono || 'pleno',
        rp = ex.referentes_paleta || 'sitio', re = ex.referentes_etiquetas_color || 'paleta';
      function opRef(k, actual, l) {
        return '<div class="ap-fila">' + l.map(function (v) {
          return '<button type="button" class="ap-op" data-extra-op="' + k + '" data-valor="' + v[0] + '"' + anillo(actual === v[0]) + '><b>' + v[1] + '</b>' + (v[2] ? '<small>' + v[2] + '</small>' : '') + '</button>';
        }).join('') + '</div>';
      }
      h += '<section class="ap-sec"><h2 class="ap-lbl">Página de Referentes</h2>' +
        '<h3 class="ap-lbl ap-sub">Vista con la que abre</h3>' +
        opRef('vista_referentes', vr, [['muro', 'Muro', 'tarjetas de alto libre'], ['cuadricula', 'Cuadrícula', 'todas del mismo tamaño'], ['lista', 'Lista', 'una fila por referente'], ['fichero', 'Fichero', 'la cinta, de lo más antiguo a lo más reciente']]) +
        '<span class="ed-nota">El lector puede cambiar de vista mientras recorre la página; cuando vuelve otro día, abre de nuevo con esta.</span>' +
        '<h3 class="ap-lbl ap-sub">Color de las tarjetas</h3>' +
        opRef('referentes_color', rc, [['rotacion', 'En rotación', 'cada ficha en una tinta distinta'], ['tipo', 'Por tipo', 'cada tipo en una tinta'], ['etiquetas', 'Por etiquetas', 'con varias etiquetas, un degradado']]) +
        '<h3 class="ap-lbl ap-sub">Tono</h3>' +
        opRef('referentes_tono', rt, [['pleno', 'Tinta plena', 'la tarjeta entera en su color'], ['pastel', 'Pastel', 'el color aclarado sobre el papel']]) +
        (rc === 'etiquetas' ? '<h3 class="ap-lbl ap-sub">Colores de las etiquetas</h3>' +
          opRef('referentes_etiquetas_color', re, [['paleta', 'De la paleta', 'las más usadas, en tintas distintas'], ['moodboard', 'Los del Moodboard', 'el color que cada etiqueta tiene allá']]) : '') +
        '<h3 class="ap-lbl ap-sub">Paleta de los referentes <small>(puede ser distinta a la del sitio)</small></h3><div class="ap-fila">' +
          [['sitio', 'La del sitio']].concat(Object.keys(T.paletas).map(function (k) { return [k, T.paletas[k].nombre]; })).map(function (v) {
            var p = v[0] === 'sitio' ? pal : T.paletas[v[0]];
            return '<button type="button" class="ap-op ap-paleta" data-extra-op="referentes_paleta" data-valor="' + v[0] + '"' + anillo(rp === v[0]) + ' style="background:' + p.papel + ';color:' + p.tinta + '">' +
              '<span class="ap-tiras">' + p.cuadernos.concat([p.apunte]).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span><b>' + v[1] + '</b></button>';
          }).join('') + '</div></section>';
      // Compartir y PDF (A-22): el botón en la lectura y el texto de derechos del colofón. Todo en «extra»
      var cm = ex.compartir === 'no' ? 'no' : 'si';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Compartir y PDF</h2>' +
        '<h3 class="ap-lbl ap-sub">Botón «Compartir» de los cuadernos y apuntes</h3>' +
        opRef('compartir', cm, [['si', 'Mostrar', 'al final de cada entrada y en «Aa»'], ['no', 'Ocultar']]) +
        '<label class="a-campo">Derechos en el colofón del PDF <span class="ap-ayuda">(si lo dejas vacío: «© año ' + esc(pr.autor || 'autor') + '. Todos los derechos reservados.»)</span>' +
          '<input type="text" data-extra-texto="pdf_derechos" maxlength="240" value="' + esc(ex.pdf_derechos || '') + '" placeholder="Por ejemplo: CC BY-NC 4.0 · puedes compartirlo citando la fuente, sin fines comerciales"></label>' +
        '<p class="ed-nota">GitHub prepara el PDF y la imagen para WhatsApp y redes de cada entrada publicada: cada vez que subes cambios y cada hora, de 7 a.m. a 11 p.m. ' +
          'Mientras no estén al día, el botón «Descargar PDF» abre la versión para imprimir.</p>' +
        '<p class="ap-enlaces">' + (primera ? '<a href="../index.html#/imprimir/' + encodeURIComponent(primera.slug) + '" target="_blank" rel="noopener">Ver la versión para imprimir de «' + esc(primera.titulo) + '»</a>' : '') +
          '<a href="https://github.com/' + REPO_GITHUB + '/actions/workflows/publicar.yml" target="_blank" rel="noopener">Actualizar ahora en GitHub ↗</a></p></section>';
      // Audio (A-13): dónde están los archivos. Se guarda en extra.audio_base. Va antes de los sellos (pintarSellos usa la última sección)
      h += '<section class="ap-sec"><h2 class="ap-lbl">Audio de las entradas</h2>' +
        '<label class="a-campo">Dirección del repositorio de audio<input type="url" data-extra-texto="audio_base" value="' + esc(ex.audio_base || '') + '" placeholder="https://tu-usuario.github.io/resistencias-del-aura-audio/" spellcheck="false"></label>' +
        '<p class="ed-nota">Cada entrada con audio busca aquí su archivo por el nombre (por ejemplo, <code>dia-7-alexa.mp3</code>). ' +
        'Si lo dejas vacío, se busca en la carpeta <code>audio/</code> de este mismo sitio. En cada entrada también puedes pegar una dirección completa.</p>' +
        (ex.audio_base && !/^https:\/\//i.test(ex.audio_base) ? '<p class="ed-nota ap-falta">La dirección debe empezar por https://</p>' : '') + '</section>';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Sellos de los apuntes <small>(categorías; se guardan al momento)</small></h2>' + htmlSellos() + '</section>';
      secc.innerHTML = h;
      contarIntro();
      vistazo();
      estado();
    }
    /* ── Editor de la hoja de notas al pie (A-20) ─────────────────────
       Muestra en vivo arriba y, debajo, cada elemento que se puede cambiar. */
    var NOMBRES_HN = {
      patron: { ninguno: 'Sin patrón', grano: 'Grano', puntos: 'Puntos', trama: 'Trama', rayado: 'Rayado', cuadricula: 'Cuadrícula', milimetrado: 'Milimetrado', diagonal: 'Diagonal', tejido: 'Tejido', anillos: 'Anillos', ondas: 'Ondas', lomos: 'Lomos', damero: 'Damero' }
    };
    function hojaCfg(pal) { return RA.configHoja(ap.extra, pal); }
    function hnOps(k, actual, ops) {
      return '<div class="ap-fila">' + ops.map(function (o) {
        return '<button type="button" class="ap-op" data-hn="' + k + '" data-valor="' + o[0] + '"' + anillo(String(actual) === String(o[0])) + '><b>' + o[1] + '</b>' + (o[2] ? '<small>' + o[2] + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    }
    function hnColor(k, valor, etiqueta) {
      return '<label class="ap-color ap-hn-propio"><input type="color" data-hn-color="' + k + '" value="' + String(valor).toLowerCase() + '" aria-label="' + esc(etiqueta) + '"><span>' + etiqueta + '</span></label>';
    }
    function tintasMuestra(pal, oscuro) {
      var tc = RA.tintaLegible(pal.cuadernos[2], pal.tinta), tc2 = RA.tintaLegible(pal.tituloB, pal.tinta);
      if (oscuro) { if (RA.lum(tc) < 0.14) tc = RA.mezclar(tc, '#FFFFFF', 0.4); if (RA.lum(tc2) < 0.14) tc2 = RA.mezclar(tc2, '#FFFFFF', 0.4); }
      return { tc: tc, tc2: tc2, sobre: RA.lum(tc) < 0.3 ? '#FFFFFF' : pal.tinta };
    }
    function htmlMuestraHoja(pal) {
      var cfg = hojaCfg(pal), osc = vistaHoja === 'noche', tintas = tintasMuestra(pal, osc);
      var est = RA.estiloHojaDe(cfg, pal, osc, tintas), mf = RA.marcasNotaDe(cfg, pal) || {};
      var vars = Object.keys(est.vars).map(function (k) { return k + ':' + est.vars[k]; }).join(';');
      var pagina = '--tc:' + tintas.tc + ';--tc2:' + tintas.tc2 + ';--tc-sobre:' + tintas.sobre + ';--sombra:' + (osc ? pal.tituloB : pal.sombra) + ';' +
        Object.keys(mf).map(function (k) { return k + ':' + mf[k]; }).join(';') +
        ';background:' + (osc ? T.fondosSitio.noche : pal.papel) + ';color:' + (osc ? '#F3F0E8' : pal.tinta);
      var boton = function (t, l, off) { return '<button type="button" tabindex="-1"' + (off ? ' disabled' : '') + ' aria-label="' + l + '">' + t + '</button>'; };
      return '<div class="ap-hoja-muestra" style="' + pagina + '" aria-hidden="true">' +
        '<p class="ap-hoja-muestra__texto">…la copia técnica disuelve el aquí y el ahora de la obra<span class="np-marca">' + RA.simboloNota(0, 13) + '</span>, pero no todo lo que se reproduce pierde su temblor. En los cuadernos de la ciudad<span class="np-marca abierta">' + RA.simboloNota(1, 13) + '</span> sobreviven gestos que ninguna máquina alcanza a fijar.</p>' +
        '<section class="hoja-nota hoja-nota--muestra abierta ' + est.clases.join(' ') + '" style="' + vars + '">' +
          '<div class="hoja-nota__asa"></div><header class="hoja-nota__cab"><span class="hoja-nota__marca">' + RA.simboloNota(1, 18) + '</span>' +
          '<span class="hoja-nota__titulo">Nota 2 de 5</span><span class="hoja-nota__nav">' + boton('‹', 'Anterior') + boton('›', 'Siguiente') + '</span>' + boton('×', 'Cerrar') + '</header>' +
          '<div class="hoja-nota__cuerpo"><p>Los cuadernos son los del taller de la Comuna 13, revisados entre marzo y junio. Cito de <em>Cuaderno de clase</em>, sin paginar.</p>' +
          '<p>Varias páginas tienen dibujos encima del texto; los transcribí sin ellos. Ver también el <a href="#" tabindex="-1">archivo de la Biblioteca Pública Piloto</a>.</p></div>' +
        '</section></div>';
    }
    function htmlHojaNota(pal) {
      var cfg = hojaCfg(pal), h = ap.extra.hoja_nota || {};
      var pc = RA.esClaro(cfg.fondo) ? 'rgba(20,20,40,' + RA.HOJA.intensidad[cfg.intensidad][0] * 2.2 + ')' : 'rgba(255,255,255,' + RA.HOJA.intensidad[cfg.intensidad][1] * 2.2 + ')';
      var grupos = [['De la paleta', [[pal.papelSuave, 'Papel suave (el original)'], [pal.papel, 'Papel'], [pal.apunte, 'Apunte']].concat(pal.cuadernos.map(function (c, i) { return [c, 'Tinta ' + (i + 1)]; })).concat([[pal.tinta, 'Tinta']])]].concat(RA.HOJA.colores);
      var conocido = false;
      var colores = grupos.map(function (g) {
        return '<div class="ap-hn-grupo"><span class="ap-hn-grupo__t">' + g[0] + '</span><div class="ap-hn-colores">' + g[1].map(function (c, i) {
          var orig = g[0] === 'De la paleta' && i === 0, sel = orig ? !cfg.fondoPropio : (cfg.fondoPropio && cfg.fondo === c[0].toUpperCase());
          if (sel) conocido = true;
          return '<button type="button" class="ap-hn-color" data-hn="fondo" data-valor="' + (orig ? '' : c[0]) + '"' + anillo(sel) + ' style="background:' + c[0] + '" title="' + esc(c[1]) + '" aria-label="' + esc(c[1]) + '"></button>';
        }).join('') + '</div></div>';
      }).join('');
      return '<section class="ap-sec ap-hn"><h2 class="ap-lbl">Notas al pie <small>(la hoja que sube desde abajo)</small></h2>' +
        '<div class="ap-hn-vista"><div class="ap-hn-vista__barra"><span class="ap-lbl">Muestra</span><span class="ed-seg ap-seg" role="group" aria-label="Muestra en">' +
          '<button type="button" data-hn-vista="claro" aria-pressed="' + (vistaHoja === 'claro') + '">Claro</button><button type="button" data-hn-vista="noche" aria-pressed="' + (vistaHoja === 'noche') + '">Noche</button></span></div>' +
          '<div class="ap-hn-muestra">' + htmlMuestraHoja(pal) + '</div></div>' +
        '<h3 class="ap-lbl ap-sub">Color de fondo</h3>' + colores +
        '<div class="ap-fila ap-hn-otro">' + hnColor('fondo', cfg.fondo, 'Otro color') + '<span class="ed-nota">' + (cfg.fondoPropio ? (conocido ? '' : 'Color propio: ') + esc(cfg.fondo) : 'Ahora: el papel suave de la paleta') + '</span></div>' +
        '<h3 class="ap-lbl ap-sub">Patrón</h3><div class="ap-patrones">' + RA.HOJA.patrones.map(function (k) {
          return '<button type="button" class="ap-patron" data-hn="patron" data-valor="' + k + '"' + anillo(cfg.patron === k) + ' title="' + NOMBRES_HN.patron[k] + '" aria-label="' + NOMBRES_HN.patron[k] + '" style="background:' + cfg.fondo + ';--pc:' + pc + '">' +
            (k === 'ninguno' ? '' : '<span class="pat p-' + k + '"></span>') + '<span class="ap-patron__n">' + NOMBRES_HN.patron[k] + '</span></button>';
        }).join('') + '</div>' +
        (cfg.patron === 'ninguno' ? '' : '<h3 class="ap-lbl ap-sub">Intensidad del patrón</h3>' +
          hnOps('intensidad', cfg.intensidad, [['sutil', 'Sutil', 'la regla del sitio'], ['media', 'Media'], ['marcada', 'Marcada']])) +
        '<h3 class="ap-lbl ap-sub">Color del texto</h3>' +
        '<div class="ap-fila">' + '<button type="button" class="ap-op" data-hn="texto" data-valor=""' + anillo(cfg.texto === 'auto') + '><b>Automático</b><small>oscuro o claro según el fondo</small></button>' +
          hnColor('texto', cfg.texto === 'auto' ? (RA.esClaro(cfg.fondo) ? pal.tinta : '#F3F0E8') : cfg.texto, 'Elegir un color') + '</div>' +
        '<h3 class="ap-lbl ap-sub">Filete de arriba</h3>' +
        '<div class="ap-fila">' + [['cuaderno', 'Del cuaderno', 'cambia con cada capítulo'], ['ninguno', 'Sin filete']].map(function (o) {
          return '<button type="button" class="ap-op" data-hn="filete" data-valor="' + o[0] + '"' + anillo(cfg.filete === o[0]) + '><b>' + o[1] + '</b>' + (o[2] ? '<small>' + o[2] + '</small>' : '') + '</button>';
        }).join('') + hnColor('filete_color', cfg.filete_color, cfg.filete === 'fijo' ? 'Un color fijo (elegido)' : 'Un color fijo') + '</div>' +
        (cfg.filete === 'ninguno' ? '' : '<h3 class="ap-lbl ap-sub">Grosor del filete</h3>' + hnOps('grosor', cfg.grosor, [['fino', 'Fino'], ['medio', 'Medio', 'el original'], ['grueso', 'Grueso']])) +
        '<h3 class="ap-lbl ap-sub">Color de las marcas <small>(los símbolos en el texto, en la hoja y en la lista final)</small></h3>' +
        '<div class="ap-fila"><button type="button" class="ap-op" data-hn="marcas" data-valor="cuaderno"' + anillo(cfg.marcas === 'cuaderno') + '><b>Del cuaderno</b><small>el original</small></button>' +
          hnColor('marcas_color', cfg.marcas_color, cfg.marcas === 'fijo' ? 'Un color fijo (elegido)' : 'Un color fijo') + '</div>' +
        '<div class="ap-dos"><div><h3 class="ap-lbl ap-sub">Esquinas</h3>' + hnOps('esquinas', cfg.esquinas, [['redondas', 'Redondeadas'], ['rectas', 'Rectas']]) + '</div>' +
          '<div><h3 class="ap-lbl ap-sub">Sombra</h3>' + hnOps('sombra', cfg.sombra, [['suave', 'Suave'], ['ninguna', 'Ninguna'], ['desplazada', 'Desplazada', 'como las citas destacadas']]) + '</div></div>' +
        '<div class="ap-dos"><div><h3 class="ap-lbl ap-sub">Letra</h3>' + hnOps('letra', cfg.letra, [['lectura', 'La de lectura'], ['titulos', 'La de títulos'], ['interfaz', 'Jost']]) + '</div>' +
          '<div><h3 class="ap-lbl ap-sub">Tamaño de la letra</h3>' + hnOps('tam', cfg.tam, [['pequena', 'Pequeña'], ['normal', 'Normal'], ['grande', 'Grande']]) + '</div></div>' +
        '<h3 class="ap-lbl ap-sub">Alto máximo de la hoja <small>(si la nota es más larga, se desplaza dentro)</small></h3>' +
        hnOps('alto', cfg.alto, [[40, '40 %'], [50, '50 %'], [60, '60 %', 'el original'], [70, '70 %']]) +
        '<h3 class="ap-lbl ap-sub">En el modo noche</h3>' +
        hnOps('noche', cfg.noche, [['oscurecer', 'Oscurecer la hoja', 'para que no encandile'], ['igual', 'Mantener el color']]) +
        '<p><button type="button" class="a-boton a-boton--fino" data-hn-original' + (Object.keys(h).length || ap.extra.color_nota ? '' : ' disabled') + '>Volver al diseño original</button></p>' +
        '<span class="ed-nota">Vale para todas las notas del sitio y para las fichas de los referentes que se abren desde las citas.</span></section>';
    }
    function pintarMuestraHoja() {
      var m = secc.querySelector('.ap-hn-muestra'); if (m) m.innerHTML = htmlMuestraHoja(T.paletas[ap.paleta]);
    }
    function cambiarHoja(k, v) {
      var h = Object.assign({}, ap.extra.hoja_nota || {});
      if (v === '' || v == null) delete h[k]; else h[k] = v;
      if (k === 'filete_color') h.filete = 'fijo';
      if (k === 'marcas_color') h.marcas = 'fijo';
      if (k === 'fondo') delete ap.extra.color_nota;   // el formato anterior (solo el color)
      if (Object.keys(h).length) ap.extra.hoja_nota = h; else delete ap.extra.hoja_nota;
    }

    /* Marcas de la convocatoria (Estímulos PP Cultura): logo de PP y pie de créditos. Se guardan en extra.convocatoria */
    function htmlConvocatoria(pal) {
      var CV = RA.convocatoria; if (!CV) return '';
      var c = CV.config(ap), D = CV.DIR;
      function seg(k, ops) {
        return '<div class="ap-fila">' + ops.map(function (o) {
          return '<button type="button" class="ap-op" data-conv="' + k + '" data-valor="' + o[0] + '"' + anillo(String(c[k]) === o[0]) + '><b>' + o[1] + '</b>' + (o[2] ? '<small>' + o[2] + '</small>' : '') + '</button>';
        }).join('') + '</div>';
      }
      function logos(k, lista, fondo) {
        return '<div class="ap-logos">' + Object.keys(lista).map(function (id) {
          return '<button type="button" class="ap-logo" data-conv="' + k + '" data-valor="' + id + '"' + anillo(c[k] === id) + ' style="background:' + fondo + '" title="' + esc(lista[id].nombre) + '">' +
            '<img src="../' + D + id + '.png" alt=""><span style="color:' + (RA.esClaro(fondo) ? '#1D1D3A' : '#F3F0E8') + '">' + esc(lista[id].nombre) + '</span></button>';
        }).join('') + '</div>';
      }
      var h = '<section class="ap-sec ap-conv"><h2 class="ap-lbl">Convocatoria · Estímulos PP Cultura <small>(marcas temporales)</small></h2>' +
        '<label class="ap-check"><input type="checkbox" data-conv-activa' + (c.activa ? ' checked' : '') + '> Mostrar el logo de PP y el pie de créditos</label>';
      if (!c.activa) return h + '<p class="ed-nota">Apagado: el sitio se ve como antes de la convocatoria.</p></section>';
      h += '<div class="ap-dos"><div><h3 class="ap-lbl ap-sub">Pie de créditos al llegar al inicio</h3>' +
          seg('plegado_inicio', [['false', 'Abierto'], ['true', 'Plegado']]) + '</div>' +
        '<div><h3 class="ap-lbl ap-sub">Al llegar al contenido</h3>' +
          seg('plegado_contenido', [['false', 'Abierto'], ['true', 'Plegado']]) + '<span class="ed-nota">Lectura de cuadernos y apuntes, y referentes.</span></div></div>' +
        '<p class="ed-nota">El lector siempre puede abrirlo o plegarlo con la pestaña «Créditos»; su elección dura lo que dure su visita.</p>' +
        '<h3 class="ap-lbl ap-sub">Logo de PP Cultura (arriba a la derecha)</h3>' +
          seg('pp_donde', [['inicio', 'Solo en el inicio'], ['todas', 'En todas las páginas', 'también en la barra de lectura']]) +
        '<div class="ap-dos"><div><h3 class="ap-lbl ap-sub">PP · fondo claro</h3>' + logos('pp_claro', CV.PPS, pal.papel) + '</div>' +
          '<div><h3 class="ap-lbl ap-sub">PP · fondo oscuro</h3>' + logos('pp_oscuro', CV.PPS, T.fondosSitio.noche) + '</div></div>' +
        '<h3 class="ap-lbl ap-sub">Escudo de la Alcaldía · fondo claro</h3>' + logos('escudo_claro', CV.ESCUDOS, pal.papel) +
        '<h3 class="ap-lbl ap-sub">Escudo de la Alcaldía · fondo oscuro</h3>' + logos('escudo_oscuro', CV.ESCUDOS, T.fondosSitio.noche) +
        '<span class="ed-nota">«Fondo oscuro» se usa cuando el sitio o el lector están en tema noche.</span>' +
        htmlTamanos(c, pal) +
        '<h3 class="ap-lbl ap-sub">Leyenda obligatoria <small>(texto exacto de la convocatoria; no se edita)</small></h3>' +
        '<p class="ap-conv-leyenda">' + esc(CV.LEYENDA) + '</p></section>';
      return h;
    }
    /* Tamaño de los logos: una barra por logo, con pestañas Computador / Celular.
       El celular puede seguir al computador en proporción (la de los tamaños originales) o tener sus propios tamaños.
       La muestra está en tamaño real: en Celular mide 390 px, el ancho de un teléfono. */
    var dispConv = 'esc';
    function htmlTamanos(c, pal) {
      var CV = RA.convocatoria, L = CV.LIMITES, mov = dispConv === 'mov', prop = c.tam_movil === 'proporcional';
      var kE = mov ? 'escudo_mov' : 'escudo_esc', kP = mov ? 'pp_mov' : 'pp_esc', fijo = mov && prop;
      function barra(k, nombre, max) {
        return '<label class="ap-tam__fila"><span>' + nombre + '</span>' +
          '<input type="range" data-conv-tam="' + k + '" min="' + L[k][0] + '" max="' + max + '" step="1" value="' + c[k] + '"' + (fijo ? ' disabled' : '') + ' aria-label="' + nombre + ' en ' + (mov ? 'el celular' : 'el computador') + '">' +
          '<output data-conv-salida="' + k + '">' + c[k] + ' px</output></label>';
      }
      var esc1 = c.escudo_claro, cont = !!CV.ESCUDOS[esc1].contenedor;
      var fondoPie = 'color-mix(in srgb, ' + pal.papel + ' 94%, ' + pal.tinta + ')';
      return '<h3 class="ap-lbl ap-sub">Tamaño de los logos</h3>' +
        '<div class="ap-tam__barra"><span class="ed-seg ap-seg" role="group" aria-label="Pantalla">' +
          '<button type="button" data-conv-disp="esc" aria-pressed="' + !mov + '">Computador</button>' +
          '<button type="button" data-conv-disp="mov" aria-pressed="' + mov + '">Celular</button></span>' +
          '<button type="button" class="a-boton a-boton--fino" data-conv-tam-original>Tamaños originales</button></div>' +
        (mov ? '<label class="ap-check"><input type="checkbox" data-conv-prop' + (prop ? ' checked' : '') + '> <span>Igual que en el computador, en proporción <span class="ap-ayuda">(un poco más pequeños, como en el diseño original)</span></span></label>' : '') +
        '<div class="ap-tam">' + barra(kE, 'Escudo de la Alcaldía', L[kE][1]) + barra(kP, 'Sello de PP', c[kE]) + '</div>' +
        '<p class="ed-nota">' + (fijo ? 'Desmarca la casilla para elegir otros tamaños en el celular. ' : '') +
          'El sello de PP llega como máximo al alto del escudo: la guía pide que ningún logo se vea más grande que el escudo de la Alcaldía.</p>' +
        '<div class="ap-muestra' + (mov ? ' ap-muestra--movil' : '') + '" style="background:' + pal.papel + ';color:' + pal.tinta + '" aria-hidden="true">' +
          '<div class="ap-muestra__cab"><span class="ap-muestra__logo" style="--a:' + pal.tituloA + ';--b:' + pal.tituloB + '"></span>' +
            '<img data-conv-muestra="' + kP + '" src="../' + CV.DIR + c.pp_claro + '.png" style="height:' + c[kP] + 'px" alt=""></div>' +
          '<div class="ap-muestra__pie' + (cont ? ' ap-muestra__pie--cont' : '') + '" style="background:' + fondoPie + '">' +
            '<p>' + esc(CV.LEYENDA) + '</p>' +
            '<img data-conv-muestra="' + kE + '" src="../' + CV.DIR + esc1 + '.png" style="height:' + Math.round(c[kE] * (cont ? 1.24 : 1)) + 'px" alt=""></div>' +
        '</div>' +
        '<p class="ed-nota ap-muestra__nota">Muestra en tamaño real' + (mov ? ', con el ancho de un celular (390 px). La vista previa de la derecha también es de celular.' :
          '. Para verlo en la página completa, abre la vista previa de <button type="button" class="ap-enlace" data-conv-ver-esc>escritorio</button>.') + '</p>';
    }
    function ajustarTamano(k, v) {
      ap.extra = ap.extra || {};
      var c = Object.assign({}, ap.extra.convocatoria || {}), CV = RA.convocatoria, actual = CV.config(ap);
      // Al pasar a tamaños propios del celular, se parte de los que ya tenía en proporción
      if (k.slice(-4) === '_mov' && actual.tam_movil === 'proporcional') { c.tam_movil = 'propio'; c.escudo_mov = actual.escudo_mov; c.pp_mov = actual.pp_mov; }
      c[k] = v;
      var esE = k.indexOf('escudo_') === 0, kP = 'pp_' + k.split('_')[1];
      if (esE && (c[kP] == null ? actual[kP] : c[kP]) > v) c[kP] = v;   // el sello nunca más alto que el escudo
      ap.extra.convocatoria = c;
      return CV.config(ap);
    }
    function cambiarConv(k, v) {
      ap.extra = ap.extra || {};
      var c = Object.assign({}, ap.extra.convocatoria || {}); c[k] = v;
      ap.extra.convocatoria = c;
      pintar(); enviar();
    }
    function anioUltimo() {
      var f = (A().entradas || []).map(function (e) { return e.publicado_en; }).filter(Boolean).sort().pop();
      return f ? new Date(f).getFullYear() : new Date().getFullYear();
    }
    function vistazo() {
      var a = secc.querySelector('.ap-vistazo__firma'), b = secc.querySelector('.ap-vistazo__pie'); if (!a) return;
      var partes = [pr.autor.trim(), pr.firma.trim()].filter(Boolean); if (pr.firma_anio) partes.push(anioUltimo());
      a.textContent = partes.join(' · ') || '(nada)';
      b.textContent = (pr.titulo.trim() || 'Resistencias del aura') + ' · ' + (pr.lugar.trim() ? pr.lugar.trim() + ', ' : '') + anioUltimo();
    }

    function contarIntro() {
      var n = RA.contarPalabras(RA.esc(pr.introduccion));
      var c = secc.querySelector('.ap-cuenta'); if (c) c.textContent = '(' + n + ' palabras; se sugieren unas 90)';
    }
    function htmlSellos() {
      if (sellos === undefined) return '<p class="ed-nota">Cargando…</p>';
      if (sellos === null) return '<p class="ed-nota ap-falta-06">Para crear sellos, corre en Supabase el archivo <code>supabase/06-sellos-de-apuntes.sql</code> (SQL Editor → pegar → Run) y recarga esta página.</p>';
      return '<div class="ap-sellos">' + sellos.map(function (sl) {
        return '<div class="ap-sello">' + RA.selloHTML(sl) + '<input type="text" maxlength="40" data-sello-nombre="' + esc(sl.id) + '" value="' + esc(sl.nombre) + '" aria-label="Nombre del sello">' +
          '<input type="color" data-sello-color="' + esc(sl.id) + '" value="' + esc(String(sl.color).toLowerCase()) + '" aria-label="Color del sello">' +
          '<button type="button" class="a-boton a-boton--fino" data-sello-quitar="' + esc(sl.id) + '">Quitar</button></div>';
      }).join('') + '</div><p><button type="button" class="a-boton a-boton--fino" data-sello-nuevo>+ Añadir sello</button></p>' +
        '<p class="ed-nota">Cada apunte puede llevar un sello o ninguno. El sello aparece en la ficha del apunte y en su portada.</p>';
    }
    function pintarSellos() { var el = secc.querySelector('.ap-sellos'); var sec = el ? el.closest('.ap-sec') : [].slice.call(secc.querySelectorAll('.ap-sec')).pop(); if (sec) sec.innerHTML = '<h2 class="ap-lbl">Sellos de los apuntes <small>(categorías; se guardan al momento)</small></h2>' + htmlSellos(); }
    RA.adm.sellos().then(function (l) { sellos = l; pintarSellos(); }).catch(function () { sellos = null; pintarSellos(); });
    var tSello = {};
    function guardarSello(sl) {
      clearTimeout(tSello[sl.id]);
      tSello[sl.id] = setTimeout(function () {
        RA.adm.guardarSello({ id: sl.id, nombre: sl.nombre.trim() || 'Sello', color: sl.color, orden: sl.orden || 0 })
          .then(function () { ui().aviso('Sello guardado'); }).catch(function (e) { ui().aviso('No se guardó el sello: ' + e.message, 'error'); });
      }, 500);
    }
    function hayCambios() {
      return CAMPOS.some(function (k) { return ap[k] !== guardada[k]; }) || JSON.stringify(ap.extra || {}) !== JSON.stringify(guardada.extra || {}) ||
        TEXTOS.some(function (k) { return pr[k] !== textosDe(proyectoG)[k]; });
    }
    function estado() {
      var c = hayCambios();
      P.querySelector('.ap-estado').textContent = c ? 'Cambios sin publicar' : 'Al día';
      P.querySelector('[data-ap="publicar"]').disabled = !c;
      P.querySelector('[data-ap="descartar"]').disabled = !c;
    }
    function enviar() {
      [marco, grande && grande.querySelector('iframe')].forEach(function (f) {
        if (!f) return;
        try { f.contentWindow.postMessage({ tipo: 'ra-prevista', apariencia: ap, proyecto: pr }, '*'); } catch (e) { /* aún cargando */ }
      });
    }
    function fondoAdminVivo() {
      var fondo = T.fondosAdmin[ap.fondo_admin] || '#EFEBE1', osc = !RA.esClaro(fondo), r = document.documentElement.style;
      r.setProperty('--a-fondo', fondo);
      r.setProperty('--a-texto', osc ? '#F3F0E8' : T.paletas[ap.paleta].tinta);
      r.setProperty('--a-panel', osc ? '#2E2E52' : '#FFFFFF');
      r.setProperty('--a-suave', osc ? 'rgba(243,240,232,.6)' : 'rgba(29,29,58,.6)');
      r.setProperty('--a-linea', osc ? 'rgba(243,240,232,.2)' : 'rgba(29,29,58,.16)');
    }
    /* El marco de la barra lateral siempre muestra el móvil (390 px).
       El iframe va en posición absoluta: así su ancho no empuja la columna. */
    function tamano() {
      P.querySelectorAll('[data-tam]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tam') === vista.tam); });
      P.querySelectorAll('.ap-vista [data-pag]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pag') === vista.pagina); });
      var ancho = 390, alto = 760, disp = caja.clientWidth;
      var k = Math.min(1, disp / ancho);
      marco.style.width = ancho + 'px'; marco.style.height = alto + 'px';
      marco.style.transform = 'scale(' + k + ')';
      marco.style.left = Math.max(0, Math.round((disp - ancho * k) / 2)) + 'px';
      caja.style.height = Math.round(alto * k) + 'px';
      if (grande) ajustarGrande();
    }
    function hashDe(p) { return p === 'capitulo' && primera ? '#/leer/' + primera.slug : p === 'referentes' ? '#/referentes' : '#/'; }
    function irA(p) {
      vista.pagina = p;
      [marco, grande && grande.querySelector('iframe')].forEach(function (f) {
        if (!f) return;
        try { f.contentWindow.location.hash = hashDe(p); } catch (e) { /* nada */ }
      });
      if (grande) grande.querySelectorAll('[data-pag]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pag') === vista.pagina); });
      tamano();
    }

    /* Vista de escritorio: ocupa toda la ventana, con «Volver a móvil» y «× Cerrar» siempre a la vista */
    var grande = null;
    function abrirGrande() {
      if (grande) return;
      vista.tam = 'escritorio';
      grande = document.createElement('div');
      grande.className = 'ap-grande';
      grande.setAttribute('role', 'dialog'); grande.setAttribute('aria-modal', 'true'); grande.setAttribute('aria-label', 'Vista previa de escritorio');
      grande.innerHTML = '<div class="ap-grande__barra"><span class="ap-lbl">Vista previa · escritorio</span>' +
        '<span class="ed-seg ap-seg" role="group" aria-label="Página"><button type="button" data-pag="inicio">Inicio</button><button type="button" data-pag="capitulo"' + (primera ? '' : ' disabled title="Publica una entrada para verla aquí"') + '>Capítulo</button><button type="button" data-pag="referentes">Referentes</button></span>' +
        '<button type="button" class="a-boton" data-grande="movil">Volver a móvil</button>' +
        '<button type="button" class="a-boton a-boton--primario" data-grande="cerrar">× Cerrar</button></div>' +
        '<div class="ap-grande__caja"><iframe title="Vista previa de escritorio" src="../index.html?prevista=1' + hashDe(vista.pagina) + '"></iframe></div>';
      document.body.appendChild(grande);
      document.body.classList.add('ap-grande-abierta');
      var f = grande.querySelector('iframe');
      f.addEventListener('load', function () { enviar(); setTimeout(enviar, 400); });
      grande.querySelectorAll('[data-pag]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-pag') === vista.pagina);
        b.onclick = function () { irA(b.getAttribute('data-pag')); };
      });
      grande.querySelectorAll('[data-grande]').forEach(function (b) { b.onclick = cerrarGrande; });
      document.addEventListener('keydown', escGrande);
      ajustarGrande(); tamano();
      grande.querySelector('[data-grande="cerrar"]').focus();
    }
    function ajustarGrande() {
      var caja2 = grande.querySelector('.ap-grande__caja'), f = grande.querySelector('iframe');
      var w = caja2.clientWidth, h = caja2.clientHeight, ancho = 1280;
      var k = Math.min(1, w / ancho);
      f.style.width = ancho + 'px'; f.style.height = Math.round(h / k) + 'px';
      f.style.transform = 'scale(' + k + ')';
      f.style.left = Math.max(0, Math.round((w - ancho * k) / 2)) + 'px';
    }
    function escGrande(ev) { if (ev.key === 'Escape') cerrarGrande(); }
    function cerrarGrande() {
      if (!grande) return;
      document.removeEventListener('keydown', escGrande);
      grande.remove(); grande = null;
      document.body.classList.remove('ap-grande-abierta');
      vista.tam = 'movil'; tamano();
      var b = P.querySelector('[data-tam="escritorio"]'); if (b) b.focus();
    }

    marco.addEventListener('load', function () { enviar(); setTimeout(enviar, 400); });
    // Hoja de notas (A-20)
    secc.addEventListener('click', function (ev) {
      var v = ev.target.closest('[data-hn-vista]');
      if (v) { vistaHoja = v.getAttribute('data-hn-vista'); secc.querySelectorAll('[data-hn-vista]').forEach(function (x) { x.setAttribute('aria-pressed', x === v); }); pintarMuestraHoja(); return; }
      if (ev.target.closest('[data-hn-original]')) { delete ap.extra.hoja_nota; delete ap.extra.color_nota; pintar(); enviar(); return; }
      var b = ev.target.closest('[data-hn]'); if (!b) return;
      var k = b.getAttribute('data-hn'), val = b.getAttribute('data-valor');
      cambiarHoja(k, k === 'alto' ? Number(val) : val);
      if (k === 'filete' && val === 'cuaderno') { var h = ap.extra.hoja_nota || {}; delete h.filete_color; }
      if (k === 'marcas' && val === 'cuaderno') { var h2 = ap.extra.hoja_nota || {}; delete h2.marcas_color; }
      pintar(); enviar();
    });
    secc.addEventListener('input', function (ev) {
      var t = ev.target, k = t.getAttribute('data-hn-color'); if (!k) return;
      cambiarHoja(k, t.value.toUpperCase());
      pintarMuestraHoja(); estado(); clearTimeout(secc._th); secc._th = setTimeout(enviar, 150);
    });
    secc.addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-hn-color')) pintar(); });
    secc.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-conv]'); if (!b) return;
      var k = b.getAttribute('data-conv'), v = b.getAttribute('data-valor');
      cambiarConv(k, v === 'true' ? true : (v === 'false' ? false : v));
    });
    secc.addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-conv-activa')) cambiarConv('activa', ev.target.checked); });
    secc.addEventListener('input', function (ev) {
      var t = ev.target, k = t.getAttribute('data-conv-tam'); if (!k) return;
      var c = ajustarTamano(k, Number(t.value)), kP = 'pp_' + k.split('_')[1], cont = !!RA.convocatoria.ESCUDOS[c.escudo_claro].contenedor;
      [k, kP].forEach(function (x) {
        var o = secc.querySelector('[data-conv-salida="' + x + '"]'); if (o) o.textContent = c[x] + ' px';
        var r = secc.querySelector('[data-conv-tam="' + x + '"]'); if (r && x !== k) { r.value = c[x]; }
        var m = secc.querySelector('[data-conv-muestra="' + x + '"]'); if (m) m.style.height = Math.round(c[x] * (x.indexOf('escudo') === 0 && cont ? 1.24 : 1)) + 'px';
      });
      if (k.indexOf('escudo_') === 0) { var rp = secc.querySelector('[data-conv-tam="' + kP + '"]'); if (rp) rp.max = c[k]; }
      estado(); clearTimeout(secc._tc); secc._tc = setTimeout(enviar, 120);
    });
    secc.addEventListener('change', function (ev) {
      if (!ev.target.hasAttribute('data-conv-prop')) return;
      var CV = RA.convocatoria, actual = CV.config(ap), c = Object.assign({}, ap.extra.convocatoria || {});
      if (ev.target.checked) { c.tam_movil = 'proporcional'; delete c.escudo_mov; delete c.pp_mov; }
      else { c.tam_movil = 'propio'; c.escudo_mov = actual.escudo_mov; c.pp_mov = actual.pp_mov; }
      ap.extra.convocatoria = c; pintar(); enviar();
    });
    secc.addEventListener('click', function (ev) {
      var d = ev.target.closest('[data-conv-disp]');
      if (d) { dispConv = d.getAttribute('data-conv-disp'); pintar(); return; }
      if (ev.target.closest('[data-conv-tam-original]')) {
        var c = Object.assign({}, ap.extra.convocatoria || {});
        ['escudo_esc', 'pp_esc', 'escudo_mov', 'pp_mov', 'tam_movil'].forEach(function (k) { delete c[k]; });
        ap.extra.convocatoria = c; pintar(); enviar(); return;
      }
      if (ev.target.closest('[data-conv-ver-esc]')) abrirGrande();
    });
    secc.addEventListener('click', function (ev) {
      var o = ev.target.closest('[data-extra-op]'); if (!o) return;
      ap.extra = ap.extra || {}; ap.extra[o.getAttribute('data-extra-op')] = o.getAttribute('data-valor');
      pintar(); enviar();
      if (/referentes/.test(o.getAttribute('data-extra-op')) && vista.pagina !== 'referentes') irA('referentes');
      if (o.getAttribute('data-extra-op') === 'compartir' && primera && vista.pagina !== 'capitulo') irA('capitulo');
    });
    secc.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-campo]'); if (!b) return;
      ap[b.getAttribute('data-campo')] = b.getAttribute('data-valor');
      if (b.getAttribute('data-campo') === 'fondo_admin' || b.getAttribute('data-campo') === 'paleta') fondoAdminVivo();
      pintar(); enviar();
    });
    secc.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-extra-quitar],[data-color-apunte-quitar],[data-sello-quitar],[data-sello-nuevo]'); if (!b) return;
      if (b.hasAttribute('data-extra-quitar')) { delete ap.extra[b.getAttribute('data-extra-quitar')]; pintar(); enviar(); return; }
      if (b.hasAttribute('data-color-apunte-quitar')) {
        var ca = Object.assign({}, ap.extra.colores_apunte || {}); delete ca[b.getAttribute('data-color-apunte-quitar')];
        ap.extra.colores_apunte = ca; if (!Object.keys(ca).length) delete ap.extra.colores_apunte; pintar(); enviar(); return;
      }
      if (b.hasAttribute('data-sello-nuevo')) {
        var pal = T.paletas[ap.paleta];
        RA.adm.guardarSello({ nombre: 'Sello ' + (sellos.length + 1), color: pal.cuadernos[sellos.length % pal.cuadernos.length], orden: sellos.length + 1 })
          .then(function (fila) { sellos.push(fila); pintarSellos(); var i = secc.querySelector('[data-sello-nombre="' + fila.id + '"]'); if (i) { i.focus(); i.select(); } })
          .catch(function (e) { ui().aviso('No se pudo crear el sello: ' + e.message, 'error'); });
        return;
      }
      if (b.hasAttribute('data-sello-quitar')) {
        var id = b.getAttribute('data-sello-quitar'), sl = sellos.filter(function (x) { return x.id === id; })[0];
        ui().confirmar('Quitar el sello', 'Se quitará «' + esc(sl.nombre) + '». Los apuntes que lo llevan quedan sin sello.', 'Quitar', true).then(function (si) {
          if (!si) return;
          RA.adm.borrarSello(id).then(function () { sellos = sellos.filter(function (x) { return x.id !== id; }); pintarSellos(); ui().aviso('Sello quitado'); })
            .catch(function (e) { ui().aviso('No se pudo quitar: ' + e.message, 'error'); });
        });
      }
    });
    secc.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.hasAttribute('data-extra-texto')) {
        var kt = t.getAttribute('data-extra-texto'), vt = t.value.trim();
        if (vt) ap.extra[kt] = vt; else delete ap.extra[kt];
        estado(); return;
      }
      if (t.hasAttribute('data-extra')) { ap.extra[t.getAttribute('data-extra')] = t.value.toUpperCase(); estado(); clearTimeout(secc._t); secc._t = setTimeout(enviar, 150); return; }
      if (t.hasAttribute('data-color-apunte')) {
        ap.extra.colores_apunte = Object.assign({}, ap.extra.colores_apunte || {}); ap.extra.colores_apunte[t.getAttribute('data-color-apunte')] = t.value.toUpperCase();
        estado(); clearTimeout(secc._t); secc._t = setTimeout(enviar, 150); return;
      }
      if (t.hasAttribute('data-sello-nombre') || t.hasAttribute('data-sello-color')) {
        var sid = t.getAttribute('data-sello-nombre') || t.getAttribute('data-sello-color'), s2 = sellos.filter(function (x) { return x.id === sid; })[0];
        if (!s2) return;
        if (t.hasAttribute('data-sello-nombre')) s2.nombre = t.value; else s2.color = t.value.toUpperCase();
        var muestra = t.parentNode.querySelector('.sello'); if (muestra) { muestra.outerHTML = RA.selloHTML(s2); }
        guardarSello(s2); return;
      }
    });
    secc.addEventListener('change', function (ev) { if (ev.target.matches('[data-extra],[data-color-apunte],[data-extra-texto]')) pintar(); });
    secc.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-pr'); if (!k) return;
      pr[k] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value; contarIntro(); vistazo(); estado();
      clearTimeout(secc._t); secc._t = setTimeout(enviar, 250);
    });
    P.querySelectorAll('[data-tam]').forEach(function (b) { b.onclick = function () { if (b.getAttribute('data-tam') === 'escritorio') abrirGrande(); else cerrarGrande(); }; });
    P.querySelectorAll('.ap-vista [data-pag]').forEach(function (b) { b.onclick = function () { irA(b.getAttribute('data-pag')); }; });
    P.querySelector('[data-ap="descartar"]').onclick = function () {
      ap = copiaAp(guardada);
      pr = textosDe(proyectoG);
      fondoAdminVivo(); pintar(); enviar();
    };
    P.querySelector('[data-ap="publicar"]').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Publicando…';
      var campos = {}; CAMPOS.forEach(function (k) { campos[k] = ap[k]; });
      campos.extra = ap.extra || {};
      var textos = { titulo: pr.titulo.trim() || 'Resistencias del aura', autor: pr.autor.trim(), introduccion: pr.introduccion.trim() };
      if (CON05) { textos.firma = pr.firma.trim(); textos.firma_anio = !!pr.firma_anio; textos.lugar = pr.lugar.trim(); }
      Promise.all([RA.adm.guardarApariencia(campos), RA.adm.guardarProyecto(textos)])
        .then(function (r) {
          guardada = RA.normalizarApariencia(r[0]); proyectoG = r[1]; pr = textosDe(proyectoG);
          A().aplicarTemaAdmin(r[0]); A().proyecto = r[1];
          RA.guardado.escribir('apariencia', r[0]);
          b.textContent = 'Publicar cambios'; estado(); ui().aviso('Apariencia publicada');
        }).catch(function (e) { b.textContent = 'Publicar cambios'; b.disabled = false; ui().aviso('No se pudo publicar: ' + e.message, 'error'); });
    };
    window.addEventListener('resize', tamano);
    A().limpiar = function () {
      window.removeEventListener('resize', tamano);
      cerrarGrande();
      if (hayCambios()) A().aplicarTemaAdmin(guardada);   // salir sin publicar: el administrador vuelve a lo guardado
    };
    pintar(); tamano();
  };
})();
