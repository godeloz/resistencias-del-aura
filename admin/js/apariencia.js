/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · Apariencia del sitio (y textos del inicio)
   La vista previa es el sitio real dentro de un marco: recibe los cambios
   por mensaje y no guarda nada hasta «Publicar cambios».
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, T = RA.TOKENS;
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
        '<span class="ed-seg ap-seg" role="group" aria-label="Página"><button type="button" data-pag="inicio">Inicio</button><button type="button" data-pag="capitulo"' + (primera ? '' : ' disabled title="Publica una entrada para verla aquí"') + '>Capítulo</button></span></div>' +
        '<div class="ap-marco"><iframe title="Vista previa del sitio" src="../index.html?prevista=1"></iframe></div>' +
        '<p class="ed-nota">Es el sitio real con tus entradas publicadas. Los cambios solo se guardan al pulsar «Publicar cambios».</p></aside></div>';

    var secc = P.querySelector('.ap-secciones'), marco = P.querySelector('iframe'), caja = P.querySelector('.ap-marco');

    function anillo(sel) { return sel ? ' aria-pressed="true"' : ' aria-pressed="false"'; }
    function pintar() {
      var pal = T.paletas[ap.paleta], h = '';
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
      // Notas al pie y apuntes (A-03, A-06): se guardan en «extra»
      var ex = ap.extra || {}, colN = /^#[0-9a-f]{6}$/i.test(ex.color_nota || '') ? ex.color_nota : pal.papelSuave;
      var temaAp = { a: { extra: ex }, pal: pal };
      h += '<section class="ap-sec"><h2 class="ap-lbl">Notas al pie y apuntes</h2>' +
        '<div class="ap-color"><input type="color" data-extra="color_nota" value="' + colN.toLowerCase() + '" aria-label="Color de la hoja de notas"><span>Color de la hoja donde se leen las notas al pie' + (ex.color_nota ? '' : ' <small>(el papel suave de la paleta)</small>') + '</span>' +
          (ex.color_nota ? '<button type="button" data-extra-quitar="color_nota">Usar el de la paleta</button>' : '') + '</div>' +
        '<h3 class="ap-lbl ap-sub">Colores de las fichas de apunte <small>(cada apunte elige uno en el editor)</small></h3><div class="ap-colores">' +
        RA.coloresApunte(temaAp).map(function (c) {
          var cambiado = ((ex.colores_apunte || {})[c.clave]);
          return '<div class="ap-color"><input type="color" data-color-apunte="' + c.clave + '" value="' + c.hex.toLowerCase() + '" aria-label="' + esc(c.nombre) + '"><span>' + esc(c.nombre) + '</span>' +
            (cambiado ? '<button type="button" data-color-apunte-quitar="' + c.clave + '" title="Volver al color original">original</button>' : '') + '</div>';
        }).join('') + '</div></section>';
      h += '<section class="ap-sec"><h2 class="ap-lbl">Sellos de los apuntes <small>(categorías; se guardan al momento)</small></h2>' + htmlSellos() + '</section>';
      secc.innerHTML = h;
      contarIntro();
      vistazo();
      estado();
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
    function hashDe(p) { return p === 'capitulo' && primera ? '#/leer/' + primera.slug : '#/'; }
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
        '<span class="ed-seg ap-seg" role="group" aria-label="Página"><button type="button" data-pag="inicio">Inicio</button><button type="button" data-pag="capitulo"' + (primera ? '' : ' disabled title="Publica una entrada para verla aquí"') + '>Capítulo</button></span>' +
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
    secc.addEventListener('change', function (ev) { if (ev.target.matches('[data-extra],[data-color-apunte]')) pintar(); });
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
