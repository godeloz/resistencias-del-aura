/* Resistencias del aura · generador de portadas del administrador (A-04)
   Ventana grande desde el panel de la entrada: fondo, formas (hasta 3), patrón y número; cada color
   guarda su paleta. Las formas se arrastran y al soltarlas se pegan a la esquina, el borde o el centro
   más cercano. «Al azar» respeta lo fijado. Plantillas en apariencia.extra.portadas_plantillas.
   La receta se guarda en entradas.portada_diseno (SQL 09) y se publica con lo demás de la entrada. */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc, PO = RA.PORTADA;
  function ui() { return RA.ui; }
  function A() { return RA.admin; }
  var CLAVES = Object.keys(RA.TOKENS.paletas);
  var PATRONES = RA.TOKENS.patrones;
  var NOMBRE_PATRON = { grano: 'Grano', puntos: 'Puntos', rayado: 'Rayado', cuadricula: 'Cuadrícula', milimetrado: 'Milimetrado',
    diagonal: 'Diagonal', tejido: 'Tejido', anillos: 'Anillos', ondas: 'Ondas', lomos: 'Lomos', damero: 'Damero', trama: 'Trama', lisa: 'Lisa' };

  function copiar(o) { return JSON.parse(JSON.stringify(o)); }
  function igualRef(a, b) {
    if (!a || !b || a === 'auto' || b === 'auto') return a === b;
    if (a.hex || b.hex) return a.hex === b.hex;
    return a.p === b.p && a.i === b.i;
  }
  function lumC(h) { return RA.lum(h); }
  function contraste(a, b) { var x = lumC(a), y = lumC(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function multiplicar(a, b) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var c = [16, 8, 0].map(function (s) { return Math.round(((x >> s) & 255) * ((y >> s) & 255) / 255); });
    return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function nombreRef(ref, tema) {
    if (ref === 'auto') return { n: 'Automático', d: 'Tinta o papel según el fondo' };
    if (ref.hex) return { n: 'Color propio', d: ref.hex };
    var pal = ref.p === 'sitio' ? 'La del sitio (' + tema.pal.nombre + ')' : RA.TOKENS.paletas[ref.p].nombre + ' · fija';
    return { n: PO.nombreTinta[ref.i], d: pal };
  }

  /* ── Selector de color: las cuatro procedencias a la vista y un color propio ──
     destino: a dónde va el color. Devuelve botones con data-gp-p / data-gp-i y un input data-gp-hex. */
  function selectorColor(destino, actual, tema, op) {
    op = op || {};
    function fila(p, rotulo) {
      return '<div class="gp-pk__grupo"><span>' + rotulo + '</span><div class="gp-pk__fila">' + RA.tintasPaleta(p, tema).map(function (c, i) {
        return '<button type="button" data-gp-destino="' + destino + '" data-gp-p="' + p + '" data-gp-i="' + i + '" style="background:' + c + '" title="' + PO.nombreTinta[i] + '"' +
          ' aria-label="' + PO.nombreTinta[i] + ' · ' + (p === 'sitio' ? 'paleta del sitio' : RA.TOKENS.paletas[p].nombre) + '" aria-pressed="' + igualRef(actual, { p: p, i: i }) + '"></button>';
      }).join('') + '</div></div>';
    }
    var hx = actual && actual !== 'auto' ? (RA.colorRef(actual, tema) || '#888888') : '#888888';
    return '<div class="gp-pk">' +
      (op.auto ? '<button type="button" class="a-boton a-boton--fino" data-gp-destino="' + destino + '" data-gp-auto aria-pressed="' + (actual === 'auto') + '">Automático: tinta o papel según el fondo</button>' : '') +
      fila('sitio', 'La del sitio (' + esc(tema.pal.nombre) + ') · cambia con Apariencia') +
      CLAVES.map(function (p) { return fila(p, esc(RA.TOKENS.paletas[p].nombre) + ' · fija'); }).join('') +
      '<label class="gp-pk__propio">Color propio <input type="color" data-gp-hex="' + destino + '" value="' + hx.toLowerCase() + '"></label>' +
    '</div>';
  }

  function icono(t) {
    var a = {
      circulo: '<circle cx="12" cy="12" r="9"/>', medio: '<path d="M3 16a9 9 0 0 1 18 0z"/>', cuarto: '<path d="M4 20V4a16 16 0 0 1 16 16z"/>',
      cuadrado: '<rect x="4" y="4" width="16" height="16"/>', barra: '<rect x="2" y="9" width="20" height="6"/>', franja: '<path d="M0 14 24 6v6L0 20z"/>',
      triangulo: '<path d="M12 3l10 18H2z"/>', anillo: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="3.5"/>'
    }[t];
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' + a + '</svg>';
  }
  var CANDADO = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5.5" width="8" height="5.5" fill="currentColor"/><path d="M3.8 5.5V4a2.2 2.2 0 0 1 4.4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  /* ── Generador ─────────────────────────────────────────────────── */
  /* api: { entrada() vigente con los campos del editor, receta(), poner(receta|null), vecinos() [anterior, siguiente], tema } */
  function abrir(api) {
    var tema = api.tema, e0 = api.entrada();
    var guardada = RA.normalizarReceta(api.receta());
    var S = {
      receta: guardada || RA.recetaAutomatica(e0, tema), auto: !guardada, cambios: false,
      sel: 0, picker: null, borrando: null,
      locks: { fondo: false, formas: false, patron: false, numero: false },
      plantillas: ((A().apariencia.extra || {}).portadas_plantillas || []).filter(function (p) { return p && RA.normalizarReceta(p.receta); })
    };
    var vec = api.vecinos();
    var cuerpo = document.createElement('div'); cuerpo.className = 'gp';

    function entradaCon(r) { return Object.assign({}, e0, { portada_diseno: r, portada_imagen: null }); }
    function tocar() { S.cambios = true; S.auto = false; }
    function bgDe(r) { return RA.colorRef(r.fondo, tema); }
    function baseDe(r) { return r.fondo && r.fondo.p ? r.fondo.p : 'sitio'; }

    /* Controles */
    function candado(capa) {
      return '<button type="button" class="gp-candado" data-gp-lock="' + capa + '" aria-pressed="' + S.locks[capa] + '" title="Fijado: «Al azar» no lo cambia">' + CANDADO + (S.locks[capa] ? 'Fijado' : 'Fijar') + '</button>';
    }
    function filaColor(destino, ref, rotulo, op) {
      var nm = nombreRef(ref, tema), hx = ref === 'auto' ? null : RA.colorRef(ref, tema);
      var muestra = ref === 'auto' ? '<span class="gp-muestra" style="background:linear-gradient(135deg,' + tema.pal.tinta + ' 50%,' + tema.pal.papel + ' 50%)"></span>' : '<span class="gp-muestra" style="background:' + hx + '"></span>';
      return '<button type="button" class="gp-fila-color" data-gp-picker="' + destino + '" aria-expanded="' + (S.picker === destino) + '">' + muestra +
        '<span class="gp-fila-color__txt">' + (rotulo ? '<small>' + rotulo + '</small>' : '') + '<span>' + esc(nm.n) + '</span><small>' + esc(nm.d) + '</small></span></button>' +
        (S.picker === destino ? selectorColor(destino, ref, tema, op) : '');
    }
    function rango(id, rotulo, min, max, paso, valor, fmt) {
      return '<label class="gp-rango"><span>' + rotulo + '</span><input type="range" data-gp-rango="' + id + '" min="' + min + '" max="' + max + '" step="' + paso + '" value="' + valor + '"><output data-gp-out="' + id + '">' + fmt(valor) + '</output></label>';
    }
    var pct = function (v) { return Math.round(v * 100) + '%'; }, grados = function (v) { return Math.round(v) + '°'; };

    function htmlControles() {
      var r = S.receta, h = '';
      h += '<div class="gp-ctl"><div class="gp-ctl__cab"><h3>Fondo</h3>' + candado('fondo') + '</div>' + filaColor('fondo', r.fondo) +
        '<p class="gp-nota">Cada color guarda su paleta: el fondo puede ser de una y las formas de otra. El fondo solo cambia cuando lo eliges' +
        (S.locks.fondo ? '; fijado, «Al azar» tampoco lo toca.' : ' o con «Al azar» (fíjalo para que no lo toque).') + '</p></div>';

      h += '<div class="gp-ctl"><div class="gp-ctl__cab"><h3>Formas</h3>' + candado('formas') + '</div><div class="gp-formas">';
      r.formas.forEach(function (f, i) {
        h += '<button type="button" class="gp-forma-fila" data-gp-sel="' + i + '" aria-pressed="' + (S.sel === i) + '">' + icono(f.t) +
          '<span>' + (i + 1) + ' · ' + PO.nombreForma(f.t) + '</span><span class="gp-muestra" style="background:' + RA.colorRef(f.c, tema) + '"></span></button>';
        if (S.sel !== i) return;
        h += '<div class="gp-forma-ed"><div class="gp-tipos" role="group" aria-label="Tipo de forma">' + PO.catalogo.map(function (c) {
          return '<button type="button" data-gp-tipo="' + c[0] + '" aria-pressed="' + (f.t === c[0]) + '" title="' + c[1] + '" aria-label="' + c[1] + '">' + icono(c[0]) + '</button>';
        }).join('') + '</div>' + filaColor('f' + i, f.c, 'Color');
        h += rango('s', f.t === 'franja' ? 'Grosor' : 'Tamaño', 0.1, f.t === 'franja' ? 1 : 1.4, 0.01, f.s, pct);
        if (f.t === 'barra' || f.t === 'anillo') h += rango('g', 'Grosor', 0.06, 0.6, 0.01, f.g, pct);
        if (f.t !== 'circulo' && f.t !== 'anillo') h += rango('r', 'Rotación', -180, 180, 1, f.r, grados);
        h += '<div class="gp-ancla"><div class="gp-ancla__rejilla" role="group" aria-label="Ancla">';
        [0, 0.5, 1].forEach(function (ay) { [0, 0.5, 1].forEach(function (ax) {
          var no = f.t === 'franja' && ax !== 0.5;
          h += '<button type="button" data-gp-ax="' + ax + '" data-gp-ay="' + ay + '" aria-pressed="' + (f.ax === ax && f.ay === ay) + '"' + (no ? ' disabled class="gp-oculto"' : '') + ' aria-label="Ancla ' + ['izquierda', 'centro', 'derecha'][ax * 2] + ', ' + ['arriba', 'medio', 'abajo'][ay * 2] + '"></button>';
        }); });
        h += '</div><span class="gp-nota">Ancla. Arrastrar la forma en la portada también la cambia.</span></div>' +
          '<button type="button" class="a-boton a-boton--fino" data-gp-quitar>Quitar esta forma</button></div>';
      });
      h += '</div>' + (r.formas.length < 3 ? '<button type="button" class="a-boton a-boton--fino" data-gp-anadir>+ Añadir forma</button>' : '<span class="gp-nota">Máximo tres formas.</span>') +
        '<span class="gp-nota">Mezcla de las formas</span><div class="ed-seg" role="group" aria-label="Mezcla">' +
        '<button type="button" data-gp-mezcla="multiply" aria-pressed="' + (r.mezcla === 'multiply') + '">Sobreimpresión</button>' +
        '<button type="button" data-gp-mezcla="normal" aria-pressed="' + (r.mezcla === 'normal') + '">Tinta plana</button></div></div>';

      var bg = bgDe(r), actual = r.patron === null ? 'sitio' : r.patron, def = A().apariencia.patron_defecto;
      h += '<div class="gp-ctl"><div class="gp-ctl__cab"><h3>Patrón</h3>' + candado('patron') + '</div><div class="gp-patrones" role="group" aria-label="Patrón">' +
        ['sitio', 'lisa'].concat(PATRONES).map(function (p) {
          var cl = p === 'sitio' ? def : p;
          return '<button type="button" data-gp-patron="' + p + '" aria-pressed="' + (actual === p) + '" title="' + (p === 'sitio' ? 'El del sitio (' + NOMBRE_PATRON[def] + ')' : NOMBRE_PATRON[p]) + '"' +
            ' aria-label="' + (p === 'sitio' ? 'El patrón del sitio' : 'Patrón ' + NOMBRE_PATRON[p]) + '" style="background:' + bg + ';--pc:' + (RA.esClaro(bg) ? 'rgba(20,20,40,.36)' : 'rgba(255,255,255,.45)') + '">' +
            RA.htmlPatron(cl) + (p === 'sitio' ? '<span class="gp-patrones__sitio">Sitio</span>' : '') + '</button>';
        }).join('') + '</div><span class="gp-nota">' + (actual === 'sitio' ? 'El del sitio: ' + NOMBRE_PATRON[def] + ' (se cambia en Apariencia)' : NOMBRE_PATRON[actual]) + ' · siempre sutil</span></div>';

      h += '<div class="gp-ctl"><div class="gp-ctl__cab"><h3>Número</h3>' + candado('numero') + '</div>' + filaColor('numero', r.numero, null, { auto: true }) + '</div>';

      h += '<div class="gp-ctl"><div class="gp-ctl__cab"><h3>Plantillas</h3></div><div class="gp-plantillas">' + (S.plantillas.length ? S.plantillas.map(function (p, k) {
        if (S.borrando === k) return '<span class="gp-plantilla gp-plantilla--borrar"><button type="button" data-gp-borrar-si="' + k + '">Borrar «' + esc(p.nombre) + '»</button><button type="button" data-gp-borrar-no>No</button></span>';
        return '<span class="gp-plantilla"><button type="button" data-gp-usar="' + k + '"><span class="gp-plantilla__muestra" style="background:' + (RA.colorRef(RA.normalizarReceta(p.receta).fondo, tema) || '#ccc') + '"></span>' + esc(p.nombre) + '</button>' +
          '<button type="button" data-gp-borrar="' + k + '" aria-label="Borrar la plantilla ' + esc(p.nombre) + '">×</button></span>';
      }).join('') : '<span class="gp-nota">Aún no hay plantillas.</span>') + '</div>' +
        '<div class="gp-nueva"><input type="text" class="gp-nueva__nombre" maxlength="40" placeholder="Nombre de la plantilla" aria-label="Nombre de la plantilla">' +
        '<button type="button" class="a-boton a-boton--fino" data-gp-plantilla>Guardar como plantilla</button></div>' +
        '<p class="gp-nota">Guardan la receta completa y sirven para cualquier cuaderno.</p></div>';
      return h;
    }

    /* Vistas */
    function avisos(r) {
      var out = [], bg = bgDe(r);
      r.formas.forEach(function (f, i) {
        var c = RA.colorRef(f.c, tema), vis = r.mezcla === 'multiply' ? multiplicar(bg, c) : c;
        if (contraste(vis, bg) < 1.22) out.push('La forma ' + (i + 1) + ' (' + PO.nombreForma(f.t).toLowerCase() + ') casi no se ve sobre este fondo. Prueba otra tinta' + (r.mezcla === 'multiply' ? ' o «Tinta plana»' : '') + '.');
      });
      if (r.numero !== 'auto' && contraste(RA.colorRef(r.numero, tema), bg) < 3) out.push('El número tiene poco contraste con el fondo. «Automático» elige tinta o papel según el fondo.');
      vec.forEach(function (v) { if (v && RA.colorCuaderno(v, tema).toLowerCase() === bg.toLowerCase()) out.push('Mismo fondo que ' + (v.tipo === 'apunte' ? 'el apunte' : 'el ' + RA.antetitulo(v)) + ': en el carrusel quedarían pegados.'); });
      return out;
    }
    function marco(clase, w, h, interior) { return '<div class="gp-marco ' + clase + '" data-w="' + w + '" data-h="' + h + '"><div class="gp-escala" style="width:' + w + 'px;height:' + h + 'px">' + interior + '</div></div>'; }
    function lienzo(r, extra, conTexto) {
      var e = entradaCon(r), st = RA.estiloPortada(e, tema);
      return '<div class="gp-lienzo" style="--pc:' + st.pc + ';background:' + st.bg + ';color:' + st.fg + '">' + RA.capaFormas(r, tema) + RA.htmlPatron(st.patron) + extra(st, e) + '</div>';
    }
    function sinEnlace(html) { return html.replace(/^<a /, '<div ').replace(/<\/a>$/, '</div>').replace(/ href="[^"]*"/, ''); }
    function htmlVistas() {
      var r = S.receta, e = entradaCon(r), et = 'background:' + tema.pal.papel + ';color:' + tema.pal.tinta;
      var av = avisos(r), h = '';
      h += '<div class="gp-avisos" aria-live="polite">' + (av.length ? av.map(function (a) { return '<p class="gp-aviso">' + esc(a) + '</p>'; }).join('') : '<p class="gp-aviso gp-aviso--bien">Todo legible y distinto de sus vecinos.</p>') + '</div>';
      h += '<div class="gp-vista"><span>En el carrusel, con sus vecinos</span><div class="gp-carrusel">' +
        (vec[0] ? '<figure>' + sinEnlace(RA.htmlCuaderno(vec[0], tema, 'gp-vecino', 'tabindex="-1" aria-hidden="true"')) + '<figcaption>' + esc(RA.antetitulo(vec[0])) + '</figcaption></figure>' : '') +
        '<figure>' + sinEnlace(RA.htmlCuaderno(e, tema, 'gp-actual', 'tabindex="-1" aria-hidden="true"')) + '<figcaption>Este</figcaption></figure>' +
        (vec[1] ? '<figure>' + sinEnlace(RA.htmlCuaderno(vec[1], tema, 'gp-vecino', 'tabindex="-1" aria-hidden="true"')) + '<figcaption>' + esc(RA.antetitulo(vec[1])) + '</figcaption></figure>' : '') +
        '</div></div>';
      var ante = esc(RA.antetitulo(e)), tit = esc(e.titulo || 'Sin título'), nn = esc(RA.numeroCorto(e));
      h += '<div class="gp-vista"><span>Portadilla · computador</span>' + marco('gp-m-pd', 1440, 640, lienzo(r, function (st) {
        return '<span class="gp-pd__costura" style="border-color:' + st.costura + '"></span><div class="gp-pd__dentro"><span class="gp-pd__numero" style="color:' + st.num + '">' + nn + '</span>' +
          '<div class="gp-pd__etiqueta" style="' + et + '"><span class="antetitulo">' + ante + '</span><p class="gp-pd__h1">' + tit + '</p></div></div>';
      })) + '</div>';
      h += '<div class="gp-vistas-fila"><div class="gp-vista gp-vista--movil"><span>Portadilla · celular</span>' + marco('gp-m-pm', 390, 844, lienzo(r, function (st) {
        return '<span class="gp-pm__costura" style="border-color:' + st.costura + '"></span><div class="gp-pm__dentro"><span class="gp-pm__numero" style="color:' + st.num + '">' + nn + '</span>' +
          '<div class="gp-pm__etiqueta" style="' + et + '"><span class="antetitulo">' + ante + '</span><p class="gp-pm__h1">' + tit + '</p></div></div>';
      })) + '</div><div class="gp-vistas-col">';
      h += '<div class="gp-vista"><span>Franja «Sigue»' + (vec[0] ? ', al final ' + (vec[0].tipo === 'apunte' ? 'del apunte anterior' : 'del ' + esc(RA.antetitulo(vec[0]))) : '') + '</span>' + marco('gp-m-sg', 1440, 330, lienzo(r, function (st) {
        return '<div class="gp-sg__dentro"><div class="gp-sg__textos"><span class="antetitulo">Sigue · ' + ante + '</span><span class="gp-sg__titulo">' + tit + '</span></div>' +
          '<span class="gp-sg__boton" style="' + et + ';box-shadow:4px 4px 0 ' + tema.pal.tinta + '">Seguir leyendo →</span></div>';
      })) + '</div>';
      h += '<div class="gp-vista"><span>Relacionados y listas · miniatura</span><div class="gp-mini">' + RA.htmlMini(e, tema) + '<span><span class="antetitulo">' + ante + '</span><em>' + tit + '</em></span></div></div>';
      h += '</div></div>';
      return h;
    }
    function htmlEscenario() {
      return sinEnlace(RA.htmlCuaderno(entradaCon(S.receta), tema, 'gp-escenario', 'tabindex="-1"', { editable: true, sel: S.sel })) +
        '<p class="gp-nota">Arrastra las formas. Al soltarlas se pegan a la esquina, el borde o el centro más cercano; así la portada se adapta a cualquier formato.</p>';
    }

    function pintar() {
      cuerpo.innerHTML =
        '<div class="gp-barra"><span class="gp-estado"' + (S.auto ? '' : ' hidden') + '>Automática</span>' +
          '<button type="button" class="a-boton a-boton--fino" data-gp-azar>Al azar</button>' +
          '<button type="button" class="a-boton a-boton--fino" data-gp-auto-todo>Volver a la automática</button></div>' +
        '<div class="gp-cuerpo"><div class="gp-controles">' + htmlControles() + '</div>' +
        '<div class="gp-lado"><div class="gp-escenario-caja">' + htmlEscenario() + '</div><div class="gp-vistas">' + htmlVistas() + '</div></div></div>';
      ajustar();
    }
    function pintarControles() {
      var c = cuerpo.querySelector('.gp-controles'), y = c ? c.scrollTop : 0;
      if (c) { c.innerHTML = htmlControles(); c.scrollTop = y; }
      var est = cuerpo.querySelector('.gp-estado'); if (est) est.hidden = !S.auto;
    }
    function pintarVistas() {
      cuerpo.querySelector('.gp-escenario-caja').innerHTML = htmlEscenario();
      cuerpo.querySelector('.gp-vistas').innerHTML = htmlVistas();
      var est = cuerpo.querySelector('.gp-estado'); if (est) est.hidden = !S.auto;
      ajustar();
    }
    function todo() { pintarControles(); pintarVistas(); }
    function ajustar() {
      cuerpo.querySelectorAll('.gp-marco').forEach(function (m) {
        var W = +m.dataset.w, H = +m.dataset.h, k = m.clientWidth / W, e = m.firstElementChild;
        if (!k) return;
        e.style.transform = 'scale(' + k + ')'; m.style.height = (H * k) + 'px';
      });
    }

    /* Al azar, con candados */
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function elegir(a) { return a[Math.floor(Math.random() * a.length)]; }
    function visible(ref, bg, mezcla) { var c = RA.colorRef(ref, tema); return contraste(mezcla === 'multiply' ? multiplicar(bg, c) : c, bg) >= 1.35; }
    function azar() {
      var r = S.receta, base = baseDe(r);
      var vecBg = vec.filter(Boolean).map(function (v) { return RA.colorCuaderno(v, tema).toLowerCase(); });
      if (!S.locks.fondo) {
        var i, t = 0, l = RA.tintasPaleta(base, tema);
        do { i = Math.floor(Math.random() * 7); t++; } while (t < 40 && (vecBg.indexOf(l[i].toLowerCase()) >= 0 || igualRef(r.fondo, { p: base, i: i })));
        r.fondo = { p: base, i: i };
      }
      var bg = bgDe(r);
      if (!S.locks.formas) {
        r.mezcla = RA.lum(bg) < 0.06 ? 'normal' : (Math.random() < 0.85 ? 'multiply' : 'normal');
        var x = Math.random(), n = x < 0.25 ? 1 : x < 0.8 ? 2 : 3, fs = [], usados = [bg.toLowerCase()];
        var otras = CLAVES.filter(function (q) { return q !== (base === 'sitio' ? A().apariencia.paleta : base); });
        for (var k = 0; k < n; k++) {
          var grande = k === 0;
          var lista = grande ? ['circulo', 'circulo', 'cuarto', 'medio', 'cuadrado', 'anillo', 'triangulo'] : ['circulo', 'cuadrado', 'barra', 'barra', 'triangulo', 'anillo', 'medio', 'franja'];
          if (fs.some(function (q) { return q.t === 'franja'; })) lista = lista.filter(function (q) { return q !== 'franja'; });
          var f = { t: elegir(lista), r: 0, ax: elegir([0, 0.5, 1]), ay: elegir([0, 0.5, 1]), dx: 0, dy: 0 };
          f.s = grande ? rnd(0.62, 1.05) : rnd(0.18, 0.46);
          f.g = f.t === 'anillo' ? rnd(0.16, 0.32) : f.t === 'barra' ? rnd(0.12, 0.3) : 0.25;
          if (f.t === 'franja') { f.s = rnd(0.2, 0.5); f.r = elegir([0, 0, -12, 10, -24]); f.ax = 0.5; f.dy = f.ay === 0 ? rnd(0.08, 0.3) : f.ay === 1 ? -rnd(0.08, 0.35) : rnd(-0.1, 0.1); }
          else if (grande) {
            if (f.ax === 0.5 && f.ay === 0.5) f.ax = elegir([0, 1]);
            f.dx = f.ax === 1 ? rnd(0.08, 0.35) : f.ax === 0 ? -rnd(0.08, 0.35) : rnd(-0.1, 0.1);
            f.dy = f.ay === 1 ? rnd(0.05, 0.3) : f.ay === 0 ? -rnd(0.05, 0.3) : rnd(-0.1, 0.1);
          } else { f.dx = rnd(0.02, 0.12) * (f.ax === 1 ? -1 : 1); f.dy = rnd(0.02, 0.12) * (f.ay === 1 ? -1 : 1); }
          if (f.t === 'barra') f.r = elegir([0, 90, 90, -20, 30]);
          if (f.t === 'triangulo' || f.t === 'medio' || f.t === 'cuarto') f.r = elegir([0, 90, 180, -90, 15, -15]);
          var ref, tr = 0;
          do {   // una de cada tres, más o menos, de otra paleta
            ref = Math.random() < 0.3 ? { p: elegir(otras), i: Math.floor(Math.random() * 7) } : { p: base, i: Math.floor(Math.random() * 7) };
            tr++;
          } while (tr < 60 && (!visible(ref, bg, r.mezcla) || usados.indexOf(RA.colorRef(ref, tema).toLowerCase()) >= 0));
          f.c = ref; usados.push(RA.colorRef(ref, tema).toLowerCase()); fs.push(f);
        }
        r.formas = fs; S.sel = 0;
      }
      if (!S.locks.patron) r.patron = elegir([null, 'lisa'].concat(PATRONES));
      if (!S.locks.numero) {
        if (Math.random() < 0.7) r.numero = 'auto';
        else {
          var ops = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (q) { return { p: base, i: q }; }).filter(function (q) { return contraste(RA.colorRef(q, tema), bg) >= 3.5; });
          r.numero = ops.length ? elegir(ops) : 'auto';
        }
      }
      S.picker = null; tocar();
    }

    function ponerColor(destino, ref) {
      var r = S.receta;
      if (destino === 'fondo') r.fondo = ref;
      else if (destino === 'numero') r.numero = ref;
      else if (r.formas[+destino.slice(1)]) r.formas[+destino.slice(1)].c = ref;
    }

    /* Eventos */
    cuerpo.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || !cuerpo.contains(b)) return;
      var d = b.dataset, r = S.receta, f = r.formas[S.sel];
      if (d.gpPicker) { S.picker = S.picker === d.gpPicker ? null : d.gpPicker; return pintarControles(); }
      if (d.gpP) { ponerColor(d.gpDestino, { p: d.gpP, i: +d.gpI }); S.picker = null; tocar(); return todo(); }
      if (d.gpAuto !== undefined) { r.numero = 'auto'; S.picker = null; tocar(); return todo(); }
      if (d.gpLock) { S.locks[d.gpLock] = !S.locks[d.gpLock]; return pintarControles(); }
      if (d.gpSel !== undefined) { S.sel = +d.gpSel; S.picker = null; pintarControles(); return marcarSel(); }
      if (d.gpTipo && f) {
        f.t = d.gpTipo;
        if (f.t === 'franja') { f.s = Math.min(f.s, 0.45); f.ax = 0.5; f.dx = 0; }
        if (f.t === 'barra' && (!f.g || f.g > 0.6 || f.g === 0.25)) f.g = 0.22;
        if (f.t === 'anillo') f.g = 0.25;
        tocar(); return todo();
      }
      if (d.gpAx !== undefined && f) { f.ax = +d.gpAx; f.ay = +d.gpAy; f.dx = 0; f.dy = 0; tocar(); return todo(); }
      if (d.gpQuitar !== undefined) { r.formas.splice(S.sel, 1); S.sel = Math.max(0, S.sel - 1); S.picker = null; tocar(); return todo(); }
      if (d.gpAnadir !== undefined) {
        var bg = bgDe(r), base = baseDe(r);
        var cand = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return { p: base, i: i }; }).filter(function (q) {
          return RA.colorRef(q, tema).toLowerCase() !== bg.toLowerCase() && !r.formas.some(function (x) { return igualRef(x.c, q); }) && visible(q, bg, r.mezcla);
        });
        r.formas.push({ t: 'circulo', c: cand[0] || { p: base, i: 7 }, s: 0.3, g: 0.25, r: 0, ax: 0.5, ay: 0.5, dx: 0, dy: 0 });
        S.sel = r.formas.length - 1; tocar(); return todo();
      }
      if (d.gpMezcla) { r.mezcla = d.gpMezcla; tocar(); return todo(); }
      if (d.gpPatron) { r.patron = d.gpPatron === 'sitio' ? null : d.gpPatron; tocar(); return todo(); }
      if (d.gpAzar !== undefined) { azar(); return todo(); }
      if (d.gpAutoTodo !== undefined) {
        var limpio = Object.assign({}, e0, { portada_color: null, portada_patron: null });
        S.receta = RA.recetaAutomatica(limpio, tema); S.auto = true; S.cambios = true; S.sel = 0; S.picker = null;
        return todo();
      }
      if (d.gpUsar !== undefined) { S.receta = RA.normalizarReceta(S.plantillas[+d.gpUsar].receta); S.sel = 0; S.picker = null; tocar(); return todo(); }
      if (d.gpBorrar !== undefined) { S.borrando = +d.gpBorrar; return pintarControles(); }
      if (d.gpBorrarNo !== undefined) { S.borrando = null; return pintarControles(); }
      if (d.gpBorrarSi !== undefined) {
        var nueva = S.plantillas.slice(); nueva.splice(+d.gpBorrarSi, 1);
        return guardarPlantillas(nueva, 'Plantilla borrada');
      }
      if (d.gpPlantilla !== undefined) {
        var inp = cuerpo.querySelector('.gp-nueva__nombre'), nombre = (inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Plantilla ' + (S.plantillas.length + 1);
        return guardarPlantillas(S.plantillas.concat([{ nombre: nombre, receta: copiar(S.receta) }]), 'Plantilla «' + nombre + '» guardada');
      }
    });
    function guardarPlantillas(lista, aviso) {
      S.borrando = null;
      return RA.adm.guardarPlantillasPortada(lista).then(function (ap) {
        A().apariencia = RA.normalizarApariencia(ap);
        S.plantillas = (A().apariencia.extra.portadas_plantillas || []).slice();
        pintarControles(); ui().aviso(aviso);
      }).catch(function (err) { ui().aviso('No se guardó la plantilla: ' + err.message, 'error'); pintarControles(); });
    }
    cuerpo.addEventListener('input', function (ev) {
      var t = ev.target, f = S.receta.formas[S.sel];
      if (t.dataset.gpRango && f) {
        f[t.dataset.gpRango] = +t.value;
        var o = cuerpo.querySelector('[data-gp-out="' + t.dataset.gpRango + '"]'); if (o) o.textContent = t.dataset.gpRango === 'r' ? grados(+t.value) : pct(+t.value);
        tocar(); pintarVistas();
      } else if (t.dataset.gpHex) { ponerColor(t.dataset.gpHex, { hex: t.value.toUpperCase() }); tocar(); pintarVistas(); }
    });
    cuerpo.addEventListener('change', function (ev) { if (ev.target.dataset.gpHex) pintarControles(); });
    cuerpo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ev.target.classList.contains('gp-nueva__nombre')) { ev.preventDefault(); var b = cuerpo.querySelector('[data-gp-plantilla]'); if (b) b.click(); }
    });

    /* Arrastrar en el escenario */
    function marcarSel() { cuerpo.querySelectorAll('.gp-escenario .fz').forEach(function (el) { el.classList.toggle('fz--sel', +el.dataset.forma === S.sel); }); }
    var arr = null;
    cuerpo.addEventListener('pointerdown', function (ev) {
      var el = ev.target.closest('.gp-escenario .fz[data-forma]'); if (!el) return;
      ev.preventDefault();
      var i = +el.dataset.forma, f = S.receta.formas[i], capa = el.parentNode.getBoundingClientRect();
      if (S.sel !== i) { S.sel = i; S.picker = null; pintarControles(); marcarSel(); }
      arr = { i: i, el: el, x: ev.clientX, y: ev.clientY, dx: f.dx, dy: f.dy, W: capa.width, H: capa.height, movio: false };
      try { el.setPointerCapture(ev.pointerId); } catch (x) { /* nada */ }
      el.classList.add('fz--arrastre');
    });
    cuerpo.addEventListener('pointermove', function (ev) {
      if (!arr) return;
      var f = S.receta.formas[arr.i], SS = Math.min(arr.W, arr.H);
      var mx = (ev.clientX - arr.x) / SS, my = (ev.clientY - arr.y) / SS;
      if (Math.abs(mx) + Math.abs(my) > 0.01) arr.movio = true;
      if (f.t !== 'franja') { f.dx = arr.dx + mx; arr.el.style.setProperty('--dx', f.dx); }
      f.dy = arr.dy + my; arr.el.style.setProperty('--dy', f.dy);
    });
    function soltar() {
      if (!arr) return;
      var f = S.receta.formas[arr.i], W = arr.W, H = arr.H, SS = Math.min(W, H), movio = arr.movio;
      arr.el.classList.remove('fz--arrastre'); arr = null;
      if (!movio) return;
      var b = RA.cajaForma(f, W, H), cx = b.left + b.w / 2, cy = b.top + b.h / 2;
      if (f.t !== 'franja') {
        f.ax = cx < W / 3 ? 0 : cx > 2 * W / 3 ? 1 : 0.5;
        f.dx = (b.left - f.ax * (W - b.w)) / SS; if (Math.abs(f.dx) < 0.035) f.dx = 0;
      }
      f.ay = cy < H / 3 ? 0 : cy > 2 * H / 3 ? 1 : 0.5;
      f.dy = (b.top - f.ay * (H - b.h)) / SS; if (Math.abs(f.dy) < 0.035) f.dy = 0;
      f.dx = Math.max(-1.5, Math.min(1.5, f.dx)); f.dy = Math.max(-1.5, Math.min(1.5, f.dy));
      tocar(); todo();
    }
    cuerpo.addEventListener('pointerup', soltar);
    cuerpo.addEventListener('pointercancel', soltar);
    window.addEventListener('resize', ajustar);

    pintar();
    requestAnimationFrame(ajustar);
    var ante = RA.antetitulo(e0);
    return ui().ventana({
      titulo: 'Portada · ' + ante, cuerpo: cuerpo, clase: 'a-ventana--ancha gp-ventana',
      botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Guardar portada', valor: 'guardar', tipo: 'primario' }]
    }).then(function (v) {
      window.removeEventListener('resize', ajustar);
      function aplicar() {
        if (!S.cambios) return;
        api.poner(S.auto ? null : RA.normalizarReceta(S.receta));
        ui().aviso(S.auto ? 'La portada vuelve a ser la automática' : 'Portada guardada');
      }
      if (v === 'guardar') return aplicar();
      if (S.cambios) return ui().confirmar('Guardar la portada', 'Cerraste el generador con cambios sin guardar. ¿Los guardas?', 'Guardar').then(function (si) { if (si) aplicar(); });
    });
  }

  RA.portadasAdmin = { abrir: abrir, selectorColor: selectorColor };
})();
