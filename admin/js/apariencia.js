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
    var ap = Object.assign({}, guardada), pr = { titulo: proyectoG.titulo || '', autor: proyectoG.autor || '', introduccion: proyectoG.introduccion || '' };
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
          [['scroll', 'Scroll'], ['paginas', 'Pasar páginas']].map(function (k) { return '<button type="button" class="ap-op" data-campo="modo_lectura_defecto" data-valor="' + k[0] + '"' + anillo(ap.modo_lectura_defecto === k[0]) + '><b>' + k[1] + '</b></button>'; }).join('') + '</div>' +
          '<span class="ed-nota">Aplica a las entradas en «Elige el lector»</span></div></section>';
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
      secc.innerHTML = h;
      contarIntro();
      estado();
    }

    function contarIntro() {
      var n = RA.contarPalabras(RA.esc(pr.introduccion));
      var c = secc.querySelector('.ap-cuenta'); if (c) c.textContent = '(' + n + ' palabras; se sugieren unas 90)';
    }
    function hayCambios() {
      return CAMPOS.some(function (k) { return ap[k] !== guardada[k]; }) ||
        ['titulo', 'autor', 'introduccion'].some(function (k) { return pr[k] !== (proyectoG[k] || ''); });
    }
    function estado() {
      var c = hayCambios();
      P.querySelector('.ap-estado').textContent = c ? 'Cambios sin publicar' : 'Al día';
      P.querySelector('[data-ap="publicar"]').disabled = !c;
      P.querySelector('[data-ap="descartar"]').disabled = !c;
    }
    function enviar() {
      try { marco.contentWindow.postMessage({ tipo: 'ra-prevista', apariencia: ap, proyecto: pr }, '*'); } catch (e) { /* aún cargando */ }
    }
    function fondoAdminVivo() {
      var fondo = T.fondosAdmin[ap.fondo_admin] || '#EFEBE1', osc = !RA.esClaro(fondo), r = document.documentElement.style;
      r.setProperty('--a-fondo', fondo);
      r.setProperty('--a-texto', osc ? '#F3F0E8' : T.paletas[ap.paleta].tinta);
      r.setProperty('--a-panel', osc ? '#2E2E52' : '#FFFFFF');
      r.setProperty('--a-suave', osc ? 'rgba(243,240,232,.6)' : 'rgba(29,29,58,.6)');
      r.setProperty('--a-linea', osc ? 'rgba(243,240,232,.2)' : 'rgba(29,29,58,.16)');
    }
    function tamano() {
      P.querySelectorAll('[data-tam]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tam') === vista.tam); });
      P.querySelectorAll('[data-pag]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pag') === vista.pagina); });
      var ancho = vista.tam === 'movil' ? 390 : 1280, alto = vista.tam === 'movil' ? 760 : 900;
      var k = Math.min(1, (caja.clientWidth - 4) / ancho);
      marco.style.width = ancho + 'px'; marco.style.height = alto + 'px';
      marco.style.transform = 'scale(' + k + ')';
      marco.style.marginLeft = Math.max(0, Math.round((caja.clientWidth - 4 - ancho * k) / 2)) + 'px';
      caja.style.height = Math.round(alto * k + 4) + 'px';
    }
    function irA(p) {
      vista.pagina = p;
      try {
        marco.contentWindow.location.hash = p === 'capitulo' && primera ? '#/leer/' + primera.slug : '#/';
      } catch (e) { /* nada */ }
      tamano();
    }

    marco.addEventListener('load', function () { enviar(); setTimeout(enviar, 400); });
    secc.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-campo]'); if (!b) return;
      ap[b.getAttribute('data-campo')] = b.getAttribute('data-valor');
      if (b.getAttribute('data-campo') === 'fondo_admin' || b.getAttribute('data-campo') === 'paleta') fondoAdminVivo();
      pintar(); enviar();
    });
    secc.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-pr'); if (!k) return;
      pr[k] = ev.target.value; contarIntro(); estado();
      clearTimeout(secc._t); secc._t = setTimeout(enviar, 250);
    });
    P.querySelectorAll('[data-tam]').forEach(function (b) { b.onclick = function () { vista.tam = b.getAttribute('data-tam'); tamano(); }; });
    P.querySelectorAll('[data-pag]').forEach(function (b) { b.onclick = function () { irA(b.getAttribute('data-pag')); }; });
    P.querySelector('[data-ap="descartar"]').onclick = function () {
      ap = Object.assign({}, guardada);
      pr = { titulo: proyectoG.titulo || '', autor: proyectoG.autor || '', introduccion: proyectoG.introduccion || '' };
      fondoAdminVivo(); pintar(); enviar();
    };
    P.querySelector('[data-ap="publicar"]').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Publicando…';
      var campos = {}; CAMPOS.forEach(function (k) { campos[k] = ap[k]; });
      Promise.all([RA.adm.guardarApariencia(campos), RA.adm.guardarProyecto({ titulo: pr.titulo.trim() || 'Resistencias del aura', autor: pr.autor.trim(), introduccion: pr.introduccion.trim() })])
        .then(function (r) {
          guardada = RA.normalizarApariencia(r[0]); proyectoG = r[1];
          A().aplicarTemaAdmin(r[0]); A().proyecto = r[1];
          RA.guardado.escribir('apariencia', r[0]);
          b.textContent = 'Publicar cambios'; estado(); ui().aviso('Apariencia publicada');
        }).catch(function (e) { b.textContent = 'Publicar cambios'; b.disabled = false; ui().aviso('No se pudo publicar: ' + e.message, 'error'); });
    };
    window.addEventListener('resize', tamano);
    A().limpiar = function () {
      window.removeEventListener('resize', tamano);
      if (hayCambios()) A().aplicarTemaAdmin(guardada);   // salir sin publicar: el administrador vuelve a lo guardado
    };
    pintar(); tamano();
  };
})();
