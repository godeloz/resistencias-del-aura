/* Resistencias del aura · utilidades comunes (lectura y administración) */
(function () {
  'use strict';
  var RA = window.RA = window.RA || {};

  /* Escapa texto para meterlo en HTML */
  RA.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Luminancia relativa (WCAG) de un color #RRGGBB */
  RA.lum = function (hex) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    var ch = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  RA.UMBRAL = 0.28;
  RA.esClaro = function (hex) { return RA.lum(hex) > RA.UMBRAL; };

  /* Almacenamiento del navegador: solo comodidades del lector. Nunca falla. */
  RA.guardado = {
    leer: function (k, def) {
      try { var v = localStorage.getItem('ra:' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    escribir: function (k, v) {
      try { localStorage.setItem('ra:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
    },
    borrar: function (k) { try { localStorage.removeItem('ra:' + k); } catch (e) { /* nada */ } }
  };

  RA.reduceMovimiento = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  RA.esMovil = function () {
    return window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  };

  /* Etiquetas de una entrada. Los apuntes se numeran A1, A2… según su orden en el carrusel
     (RA.numerarApuntes). Un capítulo sin número de día muestra «Capítulo». */
  RA.numeroCorto = function (e) {
    if (e.tipo === 'apunte') return 'A' + (e.n_apunte || '');
    if (!e.numero) return '—';
    return e.numero < 10 ? '0' + e.numero : String(e.numero);
  };
  RA.antetitulo = function (e) {
    if (e.tipo === 'apunte') return 'Apunte' + (e.n_apunte ? ' A' + e.n_apunte : '');
    return e.numero ? 'Día ' + e.numero : 'Capítulo';
  };
  RA.numerarApuntes = function (lista) {
    var n = 0;
    (lista || []).forEach(function (e) { if (e.tipo === 'apunte') e.n_apunte = ++n; else delete e.n_apunte; });
    return lista;
  };

  /* Mezcla dos colores #RRGGBB (t = 0 → a, t = 1 → b) */
  RA.mezclar = function (a, b, t) {
    var x = parseInt(String(a).replace('#', ''), 16), y = parseInt(String(b).replace('#', ''), 16);
    var c = [16, 8, 0].map(function (s) { var u = (x >> s) & 255, v = (y >> s) & 255; return Math.round(u + (v - u) * t); });
    return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('').toUpperCase();
  };
  /* Tinta del cuaderno legible sobre papel: los colores muy claros (Pastel) se oscurecen hacia la tinta */
  RA.tintaLegible = function (hex, tinta) {
    return RA.lum(hex) > 0.42 ? RA.mezclar(hex, tinta || '#1D1D3A', 0.5) : hex;
  };

  /* ── Apuntes: ficha de archivo (A-06) ──
     El color se guarda en portada_color (índice de esta lista) y el patrón en portada_patron. */
  RA.APUNTE = {
    colores: [
      ['apunte', 'Apunte de la paleta', null], ['manila', 'Manila', '#EAD9A8'], ['kraft', 'Kraft', '#CDAE83'],
      ['gris', 'Gris archivo', '#DAD7CF'], ['hueso', 'Hueso', '#FBF8F0'], ['azul', 'Azul ficha', '#CFE1EC'],
      ['rosa', 'Rosa ficha', '#F4D6DC'], ['menta', 'Menta', '#D6EADA'], ['lila', 'Lila', '#E2DCF0']
    ],
    patrones: ['lisa', 'puntos', 'trama', 'cuadricula', 'milimetrado', 'anillos', 'ondas', 'damero', 'diagonal'],
    nombrePatron: { lisa: 'Lisa', puntos: 'Puntos', trama: 'Trama', cuadricula: 'Cuadrícula', milimetrado: 'Milimetrado',
      anillos: 'Anillos', ondas: 'Ondas', damero: 'Damero', diagonal: 'Diagonal' }
  };
  /* Colores de apunte vigentes: los de la lista, con lo que se haya cambiado en Apariencia (extra.colores_apunte) */
  RA.coloresApunte = function (tema) {
    var cambios = (tema && tema.a && tema.a.extra && tema.a.extra.colores_apunte) || {};
    return RA.APUNTE.colores.map(function (c) {
      var hex = /^#[0-9a-f]{6}$/i.test(cambios[c[0]] || '') ? cambios[c[0]] : (c[2] || (tema ? tema.pal.apunte : '#FFE800'));
      return { clave: c[0], nombre: c[1], hex: hex };
    });
  };
  RA.fichaApunte = function (e, tema) {
    var l = RA.coloresApunte(tema), i = e.portada_color != null && l[e.portada_color] ? e.portada_color : 0;
    var pat = RA.APUNTE.patrones.indexOf(e.portada_patron) >= 0 ? e.portada_patron : 'lisa';
    return { color: l[i].hex, indice: i, patron: pat };
  };
  /* Sello (categoría) de un apunte. Los sellos se crean en el administrador (SQL 06). */
  RA.sellos = {};
  RA.ponerSellos = function (lista) { RA.sellos = {}; (lista || []).forEach(function (s) { RA.sellos[s.id] = s; }); };
  RA.selloDe = function (e) { return (e && e.tipo === 'apunte' && e.sello_id && RA.sellos[e.sello_id]) || null; };
  RA.selloHTML = function (s, clase) {
    if (!s) return '';
    var t = String(s.nombre || '').trim();
    return '<span class="sello ' + (clase || '') + '" style="--sello:' + RA.esc(/^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#1D1D3A') + '">' + RA.esc(t) + '</span>';
  };

  /* ── Notas al pie (A-03): familia «Marcas de tinta», 12 símbolos ──
     Se dibujan con currentColor. Desde la nota 13 se repiten (en otra tinta: lo decide quien los pinta). */
  var SIMB = [
    ['ojo', '<path d="M2 12 Q12 3 22 12 Q12 21 2 12Z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/>'],
    ['chispa', '<path d="M12 2 Q13.2 10.8 22 12 Q13.2 13.2 12 22 Q10.8 13.2 2 12 Q10.8 10.8 12 2Z" fill="currentColor"/>'],
    ['espiral', '<path d="M12 12 a2 2 0 0 1 2 2 a4 4 0 0 1 -4 4 a6 6 0 0 1 -6 -6 a8 8 0 0 1 8 -8 a9 9 0 0 1 9 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'],
    ['ola', '<path d="M2 14 Q6 8 10 14 T18 14 T24 12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'],
    ['gota', '<path d="M12 3 Q19 12 19 15.5 A7 7 0 0 1 5 15.5 Q5 12 12 3Z" fill="currentColor"/>'],
    ['asterisco', [0, 45, 90, 135].map(function (r) { return '<rect x="10.8" y="3" width="2.4" height="18" rx="1.2" fill="currentColor" transform="rotate(' + r + ' 12 12)"/>'; }).join('')],
    ['luna', '<path d="M15 3 A9.5 9.5 0 1 0 21.5 15.5 A7.5 7.5 0 1 1 15 3Z" fill="currentColor"/>'],
    ['llama', '<path d="M12 2 C13 7 18.5 9 18.5 15 A6.5 6.5 0 0 1 5.5 15 C5.5 11 8.5 10 9 6 C10.8 8 11 10 11.6 11.5 C13 8.5 12.6 5 12 2Z" fill="currentColor"/>'],
    ['hoja', '<path d="M4 20 C4 10 10 4 20 4 C20 14 14 20 4 20Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 20 L14 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'],
    ['llave', '<circle cx="7" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11.2 12 H21.5 M17 12 V16 M20.5 12 V15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'],
    ['nudo', '<path d="M12 12 C9 7 3 7 3 12 C3 17 9 17 12 12 C15 7 21 7 21 12 C21 17 15 17 12 12Z" fill="none" stroke="currentColor" stroke-width="2.3"/>'],
    ['aura', '<circle cx="12" cy="12" r="3.3" fill="currentColor"/><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/>']
  ];
  RA.SIMBOLOS_NOTA = SIMB.map(function (s) { return s[0]; });
  /* i: posición de la nota desde 0. Devuelve el SVG del símbolo (tam en px) */
  RA.simboloNota = function (i, tam) {
    tam = tam || 14;
    return '<svg class="np-simbolo" width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + SIMB[i % SIMB.length][1] + '</svg>';
  };
  /* Marca de una nota: símbolo (por defecto) o número */
  RA.marcaNota = function (i, estilo, tam) {
    return estilo === 'numeros' ? '<span class="np-num" aria-hidden="true">' + (i + 1) + '</span>' : RA.simboloNota(i, tam);
  };
  /* Íconos de la cabecera (A-12), en las dos tintas del título, sobreimpresas como en la risografía.
     Referentes: seis fichas como en el muro del Moodboard. Cuadernos: dos cuadernos en abanico. */
  RA.iconoReferentes = function (tam) {
    var t = ['A', 'B', 'B', 'A', 'A', 'B'];
    var r = [[1, 1, 12], [1, 15, 8], [9, 1, 7], [9, 10, 13], [17, 1, 9], [17, 12, 11]].map(function (f, i) {
      return '<rect x="' + f[0] + '" y="' + f[1] + '" width="6" height="' + f[2] + '" rx="1.6" fill="var(--t' + t[i] + ')"/>';
    }).join('');
    return '<svg class="icono-nav" width="' + (tam || 22) + '" height="' + (tam || 22) + '" viewBox="0 0 24 24" aria-hidden="true">' + r + '</svg>';
  };
  function dibujoCuadernos(tA, tB, forma, mezcla) {
    var m = mezcla ? ' style="mix-blend-mode:' + mezcla + '"' : '';
    return '<rect x="2.5" y="3" width="11.5" height="17.5" rx="1.6" transform="rotate(-9 8 21)" fill="' + tB + '"' + m + '/>' +
      '<rect x="9" y="3.5" width="11.5" height="17.5" rx="1.6" transform="rotate(7 15 21)" fill="' + tA + '"' + m + '/>' +
      '<circle class="icono-nav__forma" cx="16.2" cy="9.4" r="2.3" fill="' + forma + '"/>';
  }
  RA.iconoCuadernos = function (tam) {
    return '<svg class="icono-nav" width="' + (tam || 22) + '" height="' + (tam || 22) + '" viewBox="0 0 24 24" aria-hidden="true">' +
      dibujoCuadernos('var(--tA)', 'var(--tB)', 'var(--fondo)') + '</svg>';
  };
  /* El mismo dibujo como archivo SVG independiente (favicon), con los colores de la paleta */
  RA.svgCuadernos = function (tA, tB, forma, mezcla) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g style="isolation:isolate">' + dibujoCuadernos(tA, tB, forma, mezcla || 'multiply') + '</g></svg>';
  };

  RA.minutos = function (e) { return (e.minutos || 1) + ' min'; };

  /* Estilos de cita (A-05). La clase va en el <blockquote>; sin clase = cita en bloque. */
  RA.ESTILOS_CITA = [
    ['destacada', 'Destacada en bloque', 'A'], ['comillas', 'Grande con comillas', 'B'], ['epigrafe', 'Epígrafe', 'C'],
    ['', 'Cita en bloque', 'D'], ['registro', 'En dos tintas', 'E'], ['testimonio', 'Testimonio', 'F'],
    ['papel', 'Papel pegado', 'G'], ['filetes', 'Entre filetes', 'H']
  ];
  RA.CLASES_CITA = RA.ESTILOS_CITA.map(function (x) { return x[0]; }).filter(Boolean);

  /* Limpieza del HTML de una entrada antes de mostrarlo */
  RA.limpiarHTML = function (h) {
    if (window.DOMPurify) {
      return window.DOMPurify.sanitize(h || '', {
        ALLOWED_TAGS: ['p', 'br', 'em', 'strong', 'i', 'b', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'cite',
          'h2', 'h3', 'figure', 'figcaption', 'img', 'hr', 'sup', 'sub', 'aside', 'span'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'title', 'width', 'height', 'loading'],
        ALLOW_DATA_ATTR: false
      });
    }
    // Sin DOMPurify (no debería pasar): se muestra como texto plano
    var d = document.createElement('div');
    d.textContent = String(h || '').replace(/<[^>]+>/g, ' ');
    return '<p>' + d.innerHTML + '</p>';
  };
})();
