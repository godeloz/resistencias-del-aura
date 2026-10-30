/* Resistencias del aura · tema visual
   Convierte la fila «apariencia» de la base de datos en variables CSS.
   Los valores salen de docs/tokens-diseno.json. */
(function () {
  'use strict';
  var RA = window.RA;

  var T = RA.TOKENS = {
    paletas: {
      riso: { nombre: 'Riso', papel: '#F7F4EC', papelSuave: '#E9E4D6', tinta: '#1D1D3A',
        cuadernos: ['#FF48B0', '#0078BF', '#00A95C', '#FF6C2F', '#765BA7', '#00838A'],
        apunte: '#FFE800', tituloA: '#FF48B0', tituloB: '#0078BF', acento: '#FFE800', acentoTexto: '#1D1D3A', sombra: '#FF48B0' },
      saturada: { nombre: 'Saturada', papel: '#FAF8F4', papelSuave: '#ECE7E1', tinta: '#1A1718',
        cuadernos: ['#D3304A', '#3B4BD8', '#13866A', '#BF4E18', '#6A3FD0', '#C7316B'],
        apunte: '#F1E3C8', tituloA: '#D3304A', tituloB: '#3B4BD8', acento: '#D3304A', acentoTexto: '#FFFFFF', sombra: '#1A1718' },
      pastel: { nombre: 'Pastel', papel: '#F2F1EE', papelSuave: '#E4E2DC', tinta: '#111111',
        cuadernos: ['#FF9A8B', '#8EC5FF', '#7EE0D0', '#FFB37A', '#C9A7FF', '#D9F08F'],
        apunte: '#FFD86B', tituloA: '#111111', tituloB: '#FF9A8B', acento: '#FFD86B', acentoTexto: '#111111', sombra: '#111111' }
    },
    fondosSitio: { papel: null, blanco: '#FFFFFF', hueso: '#F5F2ED', gris: '#F2F1EE', lavanda: '#ECEEF2', arena: '#ECE3D9', noche: '#1D1D3A' },
    fondosAdmin: { huesoCalido: '#EFEBE1', blanco: '#FFFFFF', gris: '#F2F1EE', lavanda: '#ECEEF2', noche: '#24243F' },
    titulos: {
      jost: { familia: "'Jost', sans-serif", peso: 600, peso2: 500, mayus: true, google: 'Jost:wght@300..700' },
      bigshoulders: { familia: "'Big Shoulders Display', sans-serif", peso: 900, peso2: 800, mayus: true, google: 'Big+Shoulders+Display:wght@500..900' },
      fraunces: { familia: "'Fraunces', serif", peso: 800, peso2: 700, mayus: false, google: 'Fraunces:opsz,wght@9..144,300..900' },
      cormorant: { familia: "'Cormorant Garamond', serif", peso: 500, peso2: 600, mayus: false, google: 'Cormorant+Garamond:ital,wght@0,300..700;1,300..700' }
    },
    lectura: {
      newsreader: { familia: "'Newsreader', Georgia, serif", google: 'Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700' },
      literata: { familia: "'Literata', Georgia, serif", google: 'Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,300..600' },
      ebgaramond: { familia: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400..700;1,400..700' },
      lora: { familia: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400..700;1,400..700' }
    },
    patrones: ['grano', 'puntos', 'rayado', 'cuadricula', 'milimetrado', 'diagonal', 'tejido', 'anillos', 'ondas', 'lomos', 'damero', 'trama'],
    texto: { oscuro: '#F3F0E8' }
  };

  RA.APARIENCIA_DEFECTO = {
    paleta: 'riso', fondo_sitio: 'papel', fondo_admin: 'huesoCalido', decoracion_inicio: 'ninguna',
    carrusel: 'abanico', fuente_titulos: 'jost', fuente_texto: 'newsreader', patron_defecto: 'grano',
    modo_lectura_defecto: 'scroll', extra: {}
  };

  /* Normaliza una fila de apariencia: cualquier valor desconocido vuelve al defecto */
  RA.normalizarApariencia = function (a) {
    var d = RA.APARIENCIA_DEFECTO, r = {};
    a = a || {};
    r.paleta = T.paletas[a.paleta] ? a.paleta : d.paleta;
    r.fondo_sitio = a.fondo_sitio in T.fondosSitio ? a.fondo_sitio : d.fondo_sitio;
    r.fondo_admin = a.fondo_admin in T.fondosAdmin ? a.fondo_admin : d.fondo_admin;
    r.decoracion_inicio = ['ninguna', 'aura', 'patron', 'formas'].indexOf(a.decoracion_inicio) >= 0 ? a.decoracion_inicio : d.decoracion_inicio;
    r.carrusel = a.carrusel === 'recto' ? 'recto' : 'abanico';
    r.fuente_titulos = T.titulos[a.fuente_titulos] ? a.fuente_titulos : d.fuente_titulos;
    r.fuente_texto = T.lectura[a.fuente_texto] ? a.fuente_texto : d.fuente_texto;
    r.patron_defecto = T.patrones.indexOf(a.patron_defecto) >= 0 ? a.patron_defecto : d.patron_defecto;
    r.modo_lectura_defecto = ['paginas', 'auto'].indexOf(a.modo_lectura_defecto) >= 0 ? a.modo_lectura_defecto : 'scroll';
    r.extra = a.extra || {};
    return r;
  };

  /* Calcula el tema completo. opciones.oscuro: true/false fuerza el tema del lector */
  RA.calcularTema = function (apariencia, opciones) {
    var a = RA.normalizarApariencia(apariencia);
    var pal = T.paletas[a.paleta];
    var fondo = T.fondosSitio[a.fondo_sitio] || pal.papel;
    opciones = opciones || {};
    if (opciones.oscuro === true && RA.esClaro(fondo)) fondo = T.fondosSitio.noche;
    if (opciones.oscuro === false && !RA.esClaro(fondo)) fondo = pal.papel;
    var oscuro = !RA.esClaro(fondo);
    var tituloA = oscuro && RA.lum(pal.tituloA) < 0.1 ? pal.apunte : pal.tituloA;
    var h = T.titulos[a.fuente_titulos], t = T.lectura[a.fuente_texto];
    return {
      a: a, pal: pal, fondo: fondo, oscuro: oscuro,
      texto: oscuro ? T.texto.oscuro : pal.tinta,
      tituloA: tituloA, tituloB: pal.tituloB,
      mezcla: oscuro ? 'screen' : 'multiply',
      sombra: oscuro ? pal.tituloB : pal.sombra,
      suave: oscuro ? 'rgba(243,240,232,.14)' : pal.papelSuave,
      titulos: h, lectura: t
    };
  };

  /* Carga solo las fuentes que se usan */
  var fuentesCargadas = {};
  RA.cargarFuentes = function (tema) {
    var fams = ['Jost:wght@300..700', tema.titulos.google, tema.lectura.google]
      .filter(function (f, i, arr) { return arr.indexOf(f) === i; });
    var clave = fams.join('|');
    if (fuentesCargadas[clave]) return;
    fuentesCargadas[clave] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + fams.map(function (f) { return 'family=' + f; }).join('&') + '&display=swap';
    document.head.appendChild(l);
  };

  function rgba(hex, a) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  RA.rgba = rgba;

  /* Aplica el tema a un elemento (por defecto, toda la página) */
  RA.aplicarTema = function (tema, raiz) {
    raiz = raiz || document.documentElement;
    var p = tema.pal, s = raiz.style;
    var vars = {
      '--fondo': tema.fondo, '--texto': tema.texto,
      '--papel': p.papel, '--papel-suave': p.papelSuave, '--tinta': p.tinta, '--suave': tema.suave,
      '--tA': tema.tituloA, '--tB': tema.tituloB, '--apunte': p.apunte,
      '--acento': p.acento, '--acento-texto': p.acentoTexto, '--sombra': tema.sombra,
      '--mezcla': tema.mezcla,
      '--f-titulos': tema.titulos.familia, '--w-titulos': String(tema.titulos.peso),
      '--w2-titulos': String(tema.titulos.peso2), '--case-titulos': tema.titulos.mayus ? 'uppercase' : 'none',
      '--f-texto': tema.lectura.familia,
      '--linea': tema.oscuro ? 'rgba(243,240,232,.18)' : 'rgba(29,29,58,.14)',
      '--pc-fondo': tema.oscuro ? 'rgba(255,255,255,.08)' : 'rgba(20,20,40,.07)'
    };
    p.cuadernos.forEach(function (c, i) { vars['--c' + i] = c; });
    // Resaltador de los pasajes con reacciones: el amarillo del apunte si se nota sobre el fondo; si no, la tinta A
    var dif = Math.abs(RA.lum(p.apunte) - RA.lum(tema.fondo));
    vars['--resalte'] = tema.oscuro ? rgba(tema.tituloA, .38) : (dif > .12 ? rgba(p.apunte, .75) : rgba(p.cuadernos[0], .26));
    vars['--resalte-apunte'] = rgba(p.cuadernos[0], .3);
    Object.keys(vars).forEach(function (k) { s.setProperty(k, vars[k]); });
    raiz.classList.toggle('tema-oscuro', tema.oscuro);
    raiz.setAttribute('data-paleta', tema.a.paleta);
    if (raiz === document.documentElement) {
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', tema.fondo);
    }
    RA.cargarFuentes(tema);
  };
})();
