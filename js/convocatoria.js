/* Resistencias del aura · marcas de la convocatoria (Estímulos PP Cultura 2026)
   Capa temporal: logo de PP Cultura arriba a la derecha y pie de créditos fijo
   con la leyenda obligatoria y el escudo de la Alcaldía.
   Se configura en Apariencia → Convocatoria (apariencia.extra.convocatoria).
   Con el interruptor apagado, el sitio queda exactamente como antes. */
(function () {
  'use strict';
  var RA = window.RA;

  var LEYENDA = 'Proyecto beneficiado con recursos del programa de Planeación del Desarrollo Local y Presupuesto Participativo de Cultura.';
  var DIR = 'imagenes/convocatoria/';
  var ALT_ESCUDO = 'Alcaldía de Medellín · Distrito de Ciencia, Tecnología e Innovación';
  var ALT_PP = 'Presupuesto Participativo Cultura';

  /* Versiones disponibles (archivos en imagenes/convocatoria/) */
  var ESCUDOS = {
    'alcaldia-color': { nombre: 'A color, sin contenedor', fondo: 'claro' },
    'alcaldia-negro': { nombre: 'Negro, sin contenedor', fondo: 'claro' },
    'alcaldia-blanco': { nombre: 'Blanco, sin contenedor', fondo: 'oscuro' },
    'alcaldia-contenedor-azul': { nombre: 'Contenedor azul oscuro', contenedor: true },
    'alcaldia-contenedor-blanco': { nombre: 'Contenedor blanco', contenedor: true },
    'alcaldia-contenedor-cian': { nombre: 'Contenedor cian', contenedor: true },
    'alcaldia-contenedor-amarillo': { nombre: 'Contenedor amarillo', contenedor: true }
  };
  var PPS = {
    'pp-2': { nombre: 'Azul (para fondos claros)' },
    'pp-1': { nombre: 'Azul con anillo blanco (para fondos oscuros)' },
    'pp-blanco': { nombre: 'Blanco (para fondos oscuros o de color)' }
  };
  var DEFECTO = {
    activa: true,
    escudo_claro: 'alcaldia-color', escudo_oscuro: 'alcaldia-blanco',
    pp_claro: 'pp-2', pp_oscuro: 'pp-blanco',
    pp_donde: 'inicio',       // 'inicio' | 'todas'
    plegado_inicio: false,    // cómo se ve el pie al llegar al inicio
    plegado_contenido: true   // y al llegar a la lectura, los referentes y demás páginas
  };

  function config(apariencia) {
    var c = (apariencia && apariencia.extra && apariencia.extra.convocatoria) || {}, r = {};
    r.activa = c.activa !== false;
    r.escudo_claro = ESCUDOS[c.escudo_claro] ? c.escudo_claro : DEFECTO.escudo_claro;
    r.escudo_oscuro = ESCUDOS[c.escudo_oscuro] ? c.escudo_oscuro : DEFECTO.escudo_oscuro;
    r.pp_claro = PPS[c.pp_claro] ? c.pp_claro : DEFECTO.pp_claro;
    r.pp_oscuro = PPS[c.pp_oscuro] ? c.pp_oscuro : DEFECTO.pp_oscuro;
    r.pp_donde = c.pp_donde === 'todas' ? 'todas' : 'inicio';
    r.plegado_inicio = typeof c.plegado_inicio === 'boolean' ? c.plegado_inicio : DEFECTO.plegado_inicio;
    r.plegado_contenido = typeof c.plegado_contenido === 'boolean' ? c.plegado_contenido : DEFECTO.plegado_contenido;
    return r;
  }

  /* Cómo se ve el pie al llegar: lo que el autor eligió para el inicio y para el contenido.
     Si el lector lo abre o lo pliega, se respeta durante esta visita (en esa parte del sitio).
     Cada visita nueva vuelve a lo que eligió el autor. En la vista previa del administrador no se recuerda nada. */
  var PREVISTA = /[?&]prevista=1/.test(location.search);
  function clave(v) { return 'ra-conv-plegado-' + v; }
  function elegidoPorLector(v) {
    if (PREVISTA) return null;
    try { var x = sessionStorage.getItem(clave(v)); return x === '1' ? true : (x === '0' ? false : null); } catch (e) { return null; }
  }
  function recordar(v, plegado) { if (PREVISTA) return; try { sessionStorage.setItem(clave(v), plegado ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } }

  var raiz = document.documentElement, pie = null, observador = null;
  var cfg = null, vistaActual = 'inicio', aplicado = null;
  function estadoDe(v) {
    var x = elegidoPorLector(v);
    return x !== null ? x : (v === 'inicio' ? cfg.plegado_inicio : cfg.plegado_contenido);
  }
  /* Pone el pie como corresponde a la vista, sin animación (se nota solo al plegarlo a mano) */
  function aplicarEstado() {
    if (!pie || !cfg) return;
    var k = vistaActual + '|' + cfg.plegado_inicio + '|' + cfg.plegado_contenido;
    if (k === aplicado) return;
    aplicado = k;
    pie.classList.add('conv--sin-anim');
    plegar(estadoDe(vistaActual), false);
    pie.offsetHeight;   // aplica el cambio antes de devolver la animación
    requestAnimationFrame(function () { if (pie) pie.classList.remove('conv--sin-anim'); });
  }

  function medir() {
    if (!pie) return;
    var h = pie.querySelector('.conv__cuerpo').offsetHeight;
    var plegado = pie.classList.contains('conv--plegado');
    var tab = pie.querySelector('.conv__pestana').offsetHeight;   // la pestaña sobresale por encima del pie
    raiz.style.setProperty('--pie-conv', (plegado ? 0 : h) + 'px');
    raiz.style.setProperty('--pie-tab', tab + 'px');
    raiz.style.setProperty('--pie-flot', ((plegado ? 0 : h) + tab + 8) + 'px');
  }

  function crearPie() {
    var f = document.createElement('footer');
    f.className = 'conv';
    f.setAttribute('aria-label', 'Créditos de la convocatoria');
    f.innerHTML =
      '<button type="button" class="conv__pestana" aria-expanded="true" aria-controls="conv-cuerpo">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>Créditos</span></button>' +
      '<div class="conv__cuerpo" id="conv-cuerpo">' +
        '<p class="conv__leyenda">' + LEYENDA + '</p>' +
        '<img class="conv__escudo" alt="' + ALT_ESCUDO + '" decoding="async">' +
      '</div>';
    f.querySelector('.conv__pestana').onclick = function () { plegar(!f.classList.contains('conv--plegado'), true); };
    document.body.appendChild(f);
    if (window.ResizeObserver) { observador = new ResizeObserver(medir); observador.observe(f.querySelector('.conv__cuerpo')); }
    window.addEventListener('resize', medir);
    return f;
  }

  function plegar(v, usuario) {
    if (!pie) return;
    pie.classList.toggle('conv--plegado', v);
    var b = pie.querySelector('.conv__pestana');
    b.setAttribute('aria-expanded', String(!v));
    b.setAttribute('aria-label', v ? 'Mostrar los créditos de la convocatoria' : 'Ocultar los créditos de la convocatoria');
    pie.querySelector('.conv__cuerpo').inert = v;
    medir();
    if (usuario) {
      recordar(vistaActual, v);
      // El modo páginas recalcula su alto cuando termina la transición
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 380);
    }
  }

  /* Se llama al pintar cualquier vista y al cambiar el tema */
  function actualizar(apariencia, tema) {
    var c = cfg = config(apariencia);
    raiz.classList.toggle('con-convocatoria', c.activa);
    if (!c.activa) {
      if (pie) { pie.remove(); pie = null; aplicado = null; if (observador) observador.disconnect(); }
      ['--pie-conv', '--pie-tab', '--pie-flot'].forEach(function (v) { raiz.style.removeProperty(v); });
      return;
    }
    if (!pie) pie = crearPie();
    var id = tema && tema.oscuro ? c.escudo_oscuro : c.escudo_claro;
    var img = pie.querySelector('.conv__escudo');
    if (img.getAttribute('src') !== DIR + id + '.png') img.src = DIR + id + '.png';
    pie.classList.toggle('conv--contenedor', !!ESCUDOS[id].contenedor);
    aplicarEstado();
    medir();
  }

  /* La lectura avisa en qué parte del sitio está: 'inicio' o 'contenido' */
  function vista(v) {
    vistaActual = v === 'inicio' ? 'inicio' : 'contenido';
    aplicarEstado();
  }

  /* Logo de PP para la cabecera. vista: 'inicio' | 'referentes' | 'lectura' */
  function ppHTML(apariencia, tema, vista) {
    var c = config(apariencia);
    if (!c.activa || (c.pp_donde === 'inicio' && vista !== 'inicio')) return '';
    var id = tema && tema.oscuro ? c.pp_oscuro : c.pp_claro;
    return '<img class="conv-pp conv-pp--' + vista + '" src="' + DIR + id + '.png" alt="' + ALT_PP + '" width="165" height="200">';
  }

  RA.convocatoria = {
    LEYENDA: LEYENDA, ESCUDOS: ESCUDOS, PPS: PPS, DEFECTO: DEFECTO, DIR: DIR,
    config: config, actualizar: actualizar, ppHTML: ppHTML, vista: vista,
    activa: function (apariencia) { return config(apariencia).activa; }
  };
})();
