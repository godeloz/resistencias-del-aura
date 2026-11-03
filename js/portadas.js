/* Resistencias del aura · portadas de cuaderno
   Anatomía: fondo · formas sobreimpresas (multiply) · patrón · costura · número · etiqueta de papel.
   Si la entrada tiene imagen, la imagen reemplaza el fondo y las formas.

   A-04 · Generador de portadas: cada cuaderno puede guardar una receta (entradas.portada_diseno, SQL 09).
   Sin receta, la portada automática de siempre (según el número del día) se expresa como receta,
   así todo se dibuja con un solo motor.
   - Cada color guarda su paleta: {p:'sitio'|'riso'|'saturada'|'pastel', i:0–8} o {hex:'#…'}.
     «sitio» sigue la paleta de Apariencia; las demás quedan fijas.
   - Las formas se anclan (ax, ay ∈ {0, .5, 1}) y se miden frente al lado corto del marco (cqmin):
     la misma receta se acomoda al cuaderno, la portadilla, la miniatura y la franja «Sigue». */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;

  var CATALOGO = [['circulo', 'Círculo'], ['medio', 'Medio círculo'], ['cuarto', 'Cuarto de círculo'], ['cuadrado', 'Cuadrado'],
    ['barra', 'Barra'], ['franja', 'Franja'], ['triangulo', 'Triángulo'], ['anillo', 'Anillo']];
  var TIPOS = CATALOGO.map(function (c) { return c[0]; });
  RA.PORTADA = {
    catalogo: CATALOGO,
    nombreTinta: ['Tinta 1', 'Tinta 2', 'Tinta 3', 'Tinta 4', 'Tinta 5', 'Tinta 6', 'Apunte', 'Tinta oscura', 'Papel'],
    nombreForma: function (t) { for (var i = 0; i < CATALOGO.length; i++) if (CATALOGO[i][0] === t) return CATALOGO[i][1]; return t; }
  };

  /* ── Colores ── */
  function tintas(pal) { return pal.cuadernos.concat([pal.apunte, pal.tinta, pal.papel]); }
  function esPaleta(p) { return Object.prototype.hasOwnProperty.call(RA.TOKENS.paletas, p); }
  RA.tintasPaleta = function (p, tema) { return tintas(p !== 'sitio' && esPaleta(p) ? RA.TOKENS.paletas[p] : tema.pal); };
  RA.colorRef = function (ref, tema) {
    if (!ref || typeof ref !== 'object') return null;
    if (ref.hex) return /^#[0-9a-f]{6}$/i.test(ref.hex) ? ref.hex : null;
    return RA.tintasPaleta(ref.p, tema)[ref.i] || null;
  };

  /* ── Receta: se limpia siempre antes de usarla (valores en rango, nada de texto libre en el CSS) ── */
  function num(v, min, max, d) { v = +v; return isFinite(v) ? Math.max(min, Math.min(max, v)) : d; }
  function limpiarRef(x) {
    if (!x || typeof x !== 'object') return null;
    if (x.hex != null) return /^#[0-9a-f]{6}$/i.test(x.hex) ? { hex: String(x.hex).toUpperCase() } : null;
    var p = x.p === 'sitio' || esPaleta(x.p) ? x.p : null, i = Math.floor(+x.i);
    return p && i >= 0 && i <= 8 ? { p: p, i: i } : null;
  }
  function ancla(v) { v = +v; return v === 0 || v === 0.5 || v === 1 ? v : 0; }
  RA.limpiarRefColor = limpiarRef;
  RA.normalizarReceta = function (r) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
    var fondo = limpiarRef(r.fondo);
    if (!fondo) return null;
    var formas = (Array.isArray(r.formas) ? r.formas : []).slice(0, 3).map(function (f) {
      if (!f || TIPOS.indexOf(f.t) < 0) return null;
      var c = limpiarRef(f.c); if (!c) return null;
      return { t: f.t, c: c, s: num(f.s, 0.05, 1.6, 0.5), g: num(f.g, 0.04, 0.8, 0.25), r: num(f.r, -360, 360, 0),
        ax: f.t === 'franja' ? 0.5 : ancla(f.ax), ay: ancla(f.ay), dx: f.t === 'franja' ? 0 : num(f.dx, -1.5, 1.5, 0), dy: num(f.dy, -1.5, 1.5, 0) };
    }).filter(Boolean);
    var patron = r.patron == null ? null : (r.patron === 'lisa' || RA.TOKENS.patrones.indexOf(r.patron) >= 0 ? r.patron : null);
    return { v: 1, fondo: fondo, formas: formas, mezcla: r.mezcla === 'normal' ? 'normal' : 'multiply', patron: patron,
      numero: r.numero && r.numero !== 'auto' ? (limpiarRef(r.numero) || 'auto') : 'auto' };
  };

  /* Caja sin rotar de una forma, en las unidades de W y H (lo mismo que hace el CSS de .fz) */
  RA.cajaForma = function (f, W, H) {
    var SS = Math.min(W, H), L = f.s * SS, w = L, h = L;
    if (f.t === 'medio') h = L / 2;
    else if (f.t === 'barra') h = L * f.g;
    else if (f.t === 'franja') { w = (W + H) * 1.6; h = f.s * SS * 0.4; }
    return { left: f.t === 'franja' ? W / 2 - w / 2 : f.ax * (W - w) + f.dx * SS, top: f.ay * (H - h) + f.dy * SS, w: w, h: h };
  };

  /* ── La portada automática de siempre, como receta ──
     Las formas de antes, en px sobre una portada de 290 × 410, pasadas a anclas. */
  var FORMAS_PX = [
    ['right:-60px;top:60px;width:230px;height:230px', 'left:40px;bottom:130px;width:120px;height:56px'],
    ['right:-40px;top:-40px;width:160px;height:160px', ''],
    ['left:60px;top:40px;width:250px;height:250px', 'right:20px;top:20px;width:64px;height:210px'],
    ['left:-50px;top:90px;width:240px;height:240px', 'right:30px;top:50px;width:90px;height:90px'],
    ['right:-30px;top:30px;width:200px;height:200px', 'left:30px;top:200px;width:180px;height:28px'],
    ['right:-90px;top:-60px;width:300px;height:300px', 'left:40px;top:150px;width:110px;height:110px'],
    ['left:20px;top:70px;width:170px;height:170px', 'right:10px;top:20px;width:40px;height:260px']
  ];
  var FORMA_CAPITULO = [0, 2, 3, 4, 5, 6];
  function formaDesdeCss(css, primera, color) {
    var W = 290, H = 410, SS = 290, o = {};
    css.split(';').forEach(function (d) { var p = d.split(':'); if (p.length === 2) o[p[0].trim()] = parseFloat(p[1]); });
    var sw = o.width, sh = o.height, f;
    var left = o.left != null ? o.left : W - o.right - sw, top = o.top != null ? o.top : H - o.bottom - sh;
    if (primera) f = { t: 'circulo', s: sw / SS, g: 0.25, r: 0 };
    else if (Math.abs(sw - sh) < 1) f = { t: 'cuadrado', s: sw / SS, g: 0.25, r: 0 };
    else { var lg = Math.max(sw, sh); f = { t: 'barra', s: lg / SS, g: Math.min(sw, sh) / lg, r: sh > sw ? 90 : 0 }; }
    f.ax = o.right != null ? 1 : 0; f.ay = o.bottom != null ? 1 : 0; f.dx = 0; f.dy = 0;
    var b = RA.cajaForma(f, W, H);
    f.dx = (left + sw / 2 - b.w / 2 - f.ax * (W - b.w)) / SS;
    f.dy = (top + sh / 2 - b.h / 2 - f.ay * (H - b.h)) / SS;
    f.c = color;
    return f;
  }
  /* Índice de color del cuaderno: −1 para apuntes */
  function indiceColor(e, n) {
    if (e.tipo === 'apunte') return -1;
    if (e.portada_color != null) return e.portada_color % n;
    return ((e.numero || 1) - 1) % n;
  }
  RA.recetaAutomatica = function (e, tema) {
    var n = tema.pal.cuadernos.length, ci = Math.max(0, indiceColor(e, n)), fx = FORMAS_PX[FORMA_CAPITULO[ci % FORMA_CAPITULO.length]];
    var formas = [formaDesdeCss(fx[0], true, { p: 'sitio', i: (Math.max(ci, 1) + 2) % n })];
    if (fx[1]) formas.push(formaDesdeCss(fx[1], false, ci === 0 ? { p: 'sitio', i: 6 } : { p: 'sitio', i: (ci + 4) % n }));
    var pat = e.portada_patron && (e.portada_patron === 'lisa' || RA.TOKENS.patrones.indexOf(e.portada_patron) >= 0) ? e.portada_patron : null;
    return { v: 1, fondo: { p: 'sitio', i: ci }, formas: formas, mezcla: 'multiply', patron: pat, numero: 'auto' };
  };
  /* Receta vigente de un cuaderno: la guardada o la automática */
  RA.recetaDe = function (e, tema) {
    if (e.tipo === 'apunte') return null;
    return RA.normalizarReceta(e.portada_diseno) || RA.recetaAutomatica(e, tema);
  };

  /* ── Capa de fondo y formas. Es un «container» (css/lectura.css · .ra-capa):
     las medidas de cada forma salen del marco que la contiene. ── */
  function n3(v) { return Math.round(v * 10000) / 10000; }
  RA.capaFormas = function (r, tema, op) {
    op = op || {};
    var bg = RA.colorRef(r.fondo, tema) || tema.pal.cuadernos[0];
    return '<span class="ra-capa' + (op.editable ? ' ra-capa--editable' : '') + '" style="background:' + bg + '">' + r.formas.map(function (f, i) {
      var col = RA.colorRef(f.c, tema) || bg;
      return '<span class="fz fz--' + f.t + (op.editable && op.sel === i ? ' fz--sel' : '') + '"' + (op.editable ? ' data-forma="' + i + '"' : '') +
        ' style="--s:' + n3(f.s) + ';--g:' + n3(f.g) + ';--r:' + n3(f.r) + ';--ax:' + f.ax + ';--ay:' + f.ay + ';--dx:' + n3(f.dx) + ';--dy:' + n3(f.dy) +
        ';--c:' + col + ';mix-blend-mode:' + (r.mezcla === 'normal' ? 'normal' : 'multiply') + '"></span>';
    }).join('') + '</span>';
  };
  RA.htmlPatron = function (p) { return p && p !== 'lisa' ? '<span class="pat p-' + esc(p) + '"></span>' : ''; };

  /* Colores y detalles de una portada */
  RA.estiloPortada = function (e, tema) {
    var p = tema.pal, cs = p.cuadernos, n = cs.length;
    var ci = indiceColor(e, n), r = RA.recetaDe(e, tema);
    var bg = ci < 0 ? RA.fichaApunte(e, tema).color : RA.colorRef(r.fondo, tema);
    var claro = RA.esClaro(bg);
    var img = e.portada_imagen && RA.urlImagen ? RA.urlImagen(e.portada_imagen) : null;
    var fg = claro ? p.tinta : p.papel;
    var f1 = r && r.formas[0] ? RA.colorRef(r.formas[0].c, tema) : null;
    return {
      ci: ci, bg: bg, claro: claro, imagen: img, receta: r,
      o1: f1 || cs[(Math.max(ci, 1) + 2) % n],
      grande1: f1 || (ci < 0 ? cs[3 % n] : cs[(ci + 2) % n]),   // segunda tinta del cuaderno (citas, modo escucha)
      grande2: p.apunte,
      fg: fg,                                                     // texto sobre la portada
      num: r && r.numero !== 'auto' ? (RA.colorRef(r.numero, tema) || fg) : fg,   // el número grande
      pc: claro ? 'rgba(20,20,40,.09)' : 'rgba(255,255,255,.16)',   // patrones siempre sutiles (30 oct 2026)
      costura: claro ? 'rgba(29,29,58,.45)' : 'rgba(247,244,236,.85)',
      patron: r ? (r.patron === null ? tema.a.patron_defecto : r.patron) : (e.portada_patron || tema.a.patron_defecto)
    };
  };

  function fondo(st) {
    return st.imagen
      ? 'background:' + st.bg + ' url(\'' + encodeURI(st.imagen) + '\') center/cover no-repeat'
      : 'background:' + st.bg;
  }

  /* Ícono de audífonos en las portadas de las entradas con audio (A-13) */
  function audioPortada(e) {
    if (!e.con_audio || !RA.iconoAudio) return '';
    return '<span class="cuaderno__audio" title="Con audio">' + RA.iconoAudio(14) + '</span>';
  }

  /* Portada de un apunte: ficha de archivo con pestaña, su color y su patrón (A-06) */
  function htmlFichaApunte(e, tema, clase, atributos) {
    var f = RA.fichaApunte(e, tema), sello = RA.selloDe ? RA.selloDe(e) : null;
    return '<a class="cuaderno cuaderno--ficha es-apunte ' + (clase || '') + (f.claro ? '' : ' ficha-oscura') + '" href="#/leer/' + encodeURIComponent(e.slug) + '" ' + (atributos || '') +
      ' aria-label="' + esc(RA.antetitulo(e) + ': ' + e.titulo + (e.con_audio ? ' · con audio' : '')) + '">' +
      '<span class="cuaderno__lienzo">' +
        '<span class="ficha-pestana" style="background-color:' + f.color + ';color:' + f.texto + '">' + esc(RA.numeroCorto(e)) + '</span>' +
        '<span class="ficha-carton" style="background-color:' + f.color + ';color:' + f.texto + ';--pc:' + f.pc + '">' +
          (f.patron !== 'lisa' ? '<span class="pat p-' + esc(f.patron) + '"></span>' : '') +
          (sello ? RA.selloHTML(sello, 'sello--portada') : '') +
          audioPortada(e) +
          '<span class="ficha-carton__textos"><span class="antetitulo">Apunte · ' + RA.minutos(e) + '</span>' +
          '<span class="ficha-carton__filete"></span>' +
          '<span class="cuaderno__titulo">' + esc(e.titulo) + '</span></span>' +
        '</span>' +
      '</span></a>';
  }

  /* Portada completa (carrusel). clase: «cuaderno--abanico» o «cuaderno--recto».
     op: {editable, sel} para el generador del administrador. */
  RA.htmlCuaderno = function (e, tema, clase, atributos, op) {
    if (e.tipo === 'apunte') return htmlFichaApunte(e, tema, clase, atributos);
    var st = RA.estiloPortada(e, tema);
    return '<a class="cuaderno ' + (clase || '') + '" href="#/leer/' + encodeURIComponent(e.slug) + '" ' + (atributos || '') +
      ' aria-label="' + esc(RA.antetitulo(e) + ': ' + e.titulo + (e.con_audio ? ' · con audio' : '')) + '">' +
      '<span class="cuaderno__lienzo" style="--pc:' + st.pc + ';' + fondo(st) + '">' +
        (st.imagen ? '' : RA.capaFormas(st.receta, tema, op) + RA.htmlPatron(st.patron)) +
        '<span class="cuaderno__costura" style="border-color:' + st.costura + '"></span>' +
        '<span class="cuaderno__numero" style="color:' + (st.imagen ? 'var(--papel)' : st.num) + '">' + RA.numeroCorto(e) + '</span>' +
        audioPortada(e) +
        '<span class="cuaderno__etiqueta">' +
          '<span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) + '</span>' +
          '<span class="cuaderno__titulo">' + esc(e.titulo) + '</span>' +
        '</span>' +
      '</span></a>';
  };

  /* Miniatura (relacionados y listas del administrador) */
  RA.htmlMini = function (e, tema) {
    if (e.tipo === 'apunte') {
      var f = RA.fichaApunte(e, tema);
      return '<span class="mini mini--ficha" style="background-color:' + f.color + ';--pc:' + f.pc + '">' +
        (f.patron !== 'lisa' ? '<span class="pat p-' + esc(f.patron) + '"></span>' : '') + '<span class="mini__pestana" style="color:' + f.texto + '">' + esc(RA.numeroCorto(e)) + '</span></span>';
    }
    var st = RA.estiloPortada(e, tema);
    return '<span class="mini" style="' + fondo(st) + '">' +
      (st.imagen ? '' : RA.capaFormas(st.receta, tema)) +
      '<span class="mini__costura" style="border-color:' + st.costura + '"></span></span>';
  };

  /* Muestra de color (lista de cuadernos y barra de tintas) */
  RA.colorCuaderno = function (e, tema) { return e.tipo === 'apunte' ? RA.fichaApunte(e, tema).color : RA.estiloPortada(e, tema).bg; };
})();
