/* Resistencias del aura · portadas de cuaderno
   Anatomía: color · dos formas sobreimpresas (multiply) · patrón · costura · número · etiqueta de papel.
   Si la entrada tiene imagen, la imagen reemplaza el color y las formas. */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;

  /* Formas sobreimpresas, en px sobre una portada base de 290 × 410 */
  var FORMAS = [
    ['right:-60px;top:60px;width:230px;height:230px', 'left:40px;bottom:130px;width:120px;height:56px'],
    ['right:-40px;top:-40px;width:160px;height:160px', ''],
    ['left:60px;top:40px;width:250px;height:250px', 'right:20px;top:20px;width:64px;height:210px'],
    ['left:-50px;top:90px;width:240px;height:240px', 'right:30px;top:50px;width:90px;height:90px;border-radius:6px'],
    ['right:-30px;top:30px;width:200px;height:200px', 'left:30px;top:200px;width:180px;height:28px'],
    ['right:-90px;top:-60px;width:300px;height:300px', 'left:40px;top:150px;width:110px;height:110px'],
    ['left:20px;top:70px;width:170px;height:170px', 'right:10px;top:20px;width:40px;height:260px']
  ];
  var FORMA_CAPITULO = [0, 2, 3, 4, 5, 6];

  /* Índice de color del cuaderno: −1 para apuntes */
  function indiceColor(e, n) {
    if (e.tipo === 'apunte') return -1;
    if (e.portada_color != null) return e.portada_color % n;
    return ((e.numero || 1) - 1) % n;
  }

  /* Colores y detalles de una portada */
  RA.estiloPortada = function (e, tema) {
    var p = tema.pal, cs = p.cuadernos, n = cs.length;
    var ci = indiceColor(e, n);
    var bg = ci < 0 ? p.apunte : cs[ci];
    var claro = RA.esClaro(bg);
    var forma = ci < 0 ? FORMAS[1] : FORMAS[FORMA_CAPITULO[ci % FORMA_CAPITULO.length]];
    var img = e.portada_imagen && RA.urlImagen ? RA.urlImagen(e.portada_imagen) : null;
    return {
      ci: ci, bg: bg, claro: claro, imagen: img,
      o1: cs[(Math.max(ci, 1) + 2) % n],
      o2: ci < 0 ? cs[3 % n] : (ci === 0 ? p.apunte : cs[(ci + 4) % n]),
      grande1: ci < 0 ? cs[3 % n] : cs[(ci + 2) % n],   // portadilla y franja «siguiente»
      grande2: p.apunte,
      fg: claro ? p.tinta : p.papel,
      pc: claro ? 'rgba(20,20,40,.16)' : 'rgba(255,255,255,.28)',
      costura: claro ? 'rgba(29,29,58,.45)' : 'rgba(247,244,236,.85)',
      patron: e.portada_patron || tema.a.patron_defecto,
      forma: forma
    };
  };

  function fondo(st) {
    return st.imagen
      ? 'background:' + st.bg + ' url(\'' + encodeURI(st.imagen) + '\') center/cover no-repeat'
      : 'background:' + st.bg;
  }

  /* Portada completa (carrusel). clase: «cuaderno--abanico» o «cuaderno--recto» */
  RA.htmlCuaderno = function (e, tema, clase, atributos) {
    var st = RA.estiloPortada(e, tema);
    var formas = st.imagen ? '' :
      '<span class="cuaderno__forma cuaderno__forma--circulo" style="' + st.forma[0] + ';background:' + st.o1 + '"></span>' +
      (st.forma[1] ? '<span class="cuaderno__forma" style="' + st.forma[1] + ';background:' + st.o2 + '"></span>' : '');
    return '<a class="cuaderno ' + (clase || '') + (e.tipo === 'apunte' ? ' es-apunte' : '') + '" href="#/leer/' + encodeURIComponent(e.slug) + '" ' + (atributos || '') +
      ' aria-label="' + esc(RA.antetitulo(e) + ': ' + e.titulo) + '">' +
      '<span class="cuaderno__lienzo" style="--pc:' + st.pc + ';' + fondo(st) + '">' +
        formas +
        (st.imagen ? '' : '<span class="pat p-' + esc(st.patron) + '"></span>') +
        '<span class="cuaderno__costura" style="border-color:' + st.costura + '"></span>' +
        '<span class="cuaderno__numero" style="color:' + (st.imagen ? 'var(--papel)' : st.fg) + '">' + RA.numeroCorto(e) + '</span>' +
        '<span class="cuaderno__etiqueta">' +
          '<span class="antetitulo">' + esc(RA.antetitulo(e)) + ' · ' + RA.minutos(e) + '</span>' +
          '<span class="cuaderno__titulo">' + esc(e.titulo) + '</span>' +
        '</span>' +
      '</span></a>';
  };

  /* Miniatura (relacionados) */
  RA.htmlMini = function (e, tema) {
    var st = RA.estiloPortada(e, tema);
    return '<span class="mini" style="' + fondo(st) + '">' +
      (st.imagen ? '' : '<span class="mini__circulo" style="background:' + st.o1 + '"></span>') +
      '<span class="mini__costura" style="border-color:' + st.costura + '"></span></span>';
  };

  /* Muestra de color (lista de cuadernos y barra de tintas) */
  RA.colorCuaderno = function (e, tema) { return RA.estiloPortada(e, tema).bg; };
})();
