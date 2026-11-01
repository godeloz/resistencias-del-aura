/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · importar desde el Moodboard y administrar referentes
   · Solo LEE moodboard.json y las imágenes que el autor elige en su navegador.
     El Moodboard no cambia.
   · Conserva los id de las cards: se puede reimportar sin duplicar.
   · Nunca importa la nota personal de las cards («note») ni los pasajes.
   · Los capítulos llegan como borradores, sin resaltados ni marcas de
     comentario; los comentarios pasan a notas privadas. Al importar, el
     autor decide si cada uno es cuaderno (con su número de día) o apunte.
   · Referentes: toda la biblioteca, uno o varios proyectos o las cards sin
     proyecto, con filtros por tipo, etiqueta, favoritas, imagen y estado.
   · Avisos: si un capítulo importado cambia en el Moodboard, se compara con
     el sitio y el autor aprueba o descarta (columna «origen», SQL 07).
     Nada de lo que ven los lectores cambia sin su aprobación.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  function A() { return RA.admin; }
  function ui() { return RA.ui; }
  RA.paginas = RA.paginas || {};

  /* ── Limpieza de un capítulo del Moodboard (mismas reglas que generar-demo.py) ── */
  RA.limpiarCapituloMoodboard = function (html) {
    var d = new DOMParser().parseFromString('<div id="r">' + String(html || '') + '</div>', 'text/html');
    var r = d.getElementById('r');
    r.querySelectorAll('span.nota, [data-nota]').forEach(function (x) { x.remove(); });   // marcas de comentario
    r.querySelectorAll('span').forEach(function (s) {
      var st = (s.getAttribute('style') || '').replace(/\s+/g, '');
      var tag = /font-style:italic/.test(st) ? 'em' : /font-weight:(bold|700)/.test(st) ? 'strong' : null;
      if (tag) { var n = d.createElement(tag); while (s.firstChild) n.appendChild(s.firstChild); s.replaceWith(n); }
    });
    // limpiarEditor quita los resaltados (span) y deja solo el formato permitido; después se van los corchetes
    // que envolvían una marca de comentario, aunque estuvieran dentro de otro span
    return RA.limpiarEditor(r.innerHTML).replace(/\[\s*\]/g, '').replace(/\u00a0/g, ' ').replace(/ {2,}/g, ' ').replace(/ +([.,;:])/g, '$1');
  };

  /* ══ Comparar textos (avisos de cambios) ═══════════════════════════ */
  /* Firma de un texto: los párrafos y su texto, con cursivas y negritas marcadas.
     No depende de cómo el navegador o el editor escriben el HTML (atributos, espacios). */
  RA.mbFirma = function (html) {
    var d = new DOMParser().parseFromString('<div id="r">' + String(html || '') + '</div>', 'text/html');
    var out = [];
    (function andar(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { out.push(c.nodeValue); continue; }
        if (c.nodeType !== 1) continue;
        var t = c.tagName;
        var bloque = /^(P|H[1-6]|LI|BLOCKQUOTE|FIGURE|FIGCAPTION|DIV|UL|OL|HR|BR|ASIDE|SECTION|PRE|TABLE|TR|TD)$/.test(t);
        var marca = (t === 'EM' || t === 'I') ? 'i' : (t === 'STRONG' || t === 'B') ? 'b' : null;
        if (bloque) out.push('\n');
        if (marca) out.push('\uE001' + marca + '\uE002');
        andar(c);
        if (marca) out.push('\uE001/' + marca + '\uE002');
        if (bloque) out.push('\n');
      }
    })(d.getElementById('r'));
    return out.join('').replace(/[ ​]/g, ' ').replace(/[ \t\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n+/g, '\n')
      .trim();
  };
  function sinMarcas(s) { return String(s).replace(/\uE001\/?[ib]\uE002/g, ''); }

  /* LCS sobre dos listas; devuelve operaciones [['=',a,b] | ['-',a] | ['+',b]] */
  function lcs(a, b, igual) {
    var n = a.length, m = b.length, i, j;
    if (n * m > 4e6) return null;
    var T = []; for (i = 0; i <= n; i++) T.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) T[i][j] = igual(a[i], b[j]) ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    var ops = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (igual(a[i], b[j])) { ops.push(['=', a[i], b[j]]); i++; j++; }
      else if (T[i + 1][j] >= T[i][j + 1]) ops.push(['-', a[i++]]);
      else ops.push(['+', b[j++]]);
    }
    while (i < n) ops.push(['-', a[i++]]);
    while (j < m) ops.push(['+', b[j++]]);
    return ops;
  }
  function diffPalabras(viejo, nuevo) {
    var A1 = sinMarcas(viejo).split(/\s+/).filter(Boolean), B1 = sinMarcas(nuevo).split(/\s+/).filter(Boolean);
    var ops = lcs(A1, B1, function (x, y) { return x === y; });
    if (!ops) return '<del class="im-del">' + esc(sinMarcas(viejo)) + '</del> <ins class="im-ins">' + esc(sinMarcas(nuevo)) + '</ins>';
    var tramos = [];   // [{tipo, palabras}]
    ops.forEach(function (o) {
      var ult = tramos[tramos.length - 1];
      if (ult && ult.tipo === o[0]) ult.palabras.push(o[1]); else tramos.push({ tipo: o[0], palabras: [o[1]] });
    });
    var CTX = 12;   // en párrafos largos, solo unas palabras alrededor de cada cambio
    var h = tramos.map(function (tr, k) {
      var w = tr.palabras;
      if (tr.tipo === '-') return '<del class="im-del">' + esc(w.join(' ')) + '</del>';
      if (tr.tipo === '+') return '<ins class="im-ins">' + esc(w.join(' ')) + '</ins>';
      var primero = k === 0, ultimo = k === tramos.length - 1;
      if (tramos.length > 1 && w.length > CTX * 2 + 4) {
        if (primero) return '… ' + esc(w.slice(-CTX).join(' '));
        if (ultimo) return esc(w.slice(0, CTX).join(' ')) + ' …';
        return esc(w.slice(0, CTX).join(' ')) + ' <span class="im-dif__corte">[…]</span> ' + esc(w.slice(-CTX).join(' '));
      }
      return esc(w.join(' '));
    }).join(' ');
    if (sinMarcas(viejo) === sinMarcas(nuevo)) h = esc(sinMarcas(nuevo).split(/\s+/).slice(0, CTX * 2).join(' ')) + ' … <span class="im-dif__formato">cambió la cursiva o la negrita</span>';
    return h;
  }
  /* Comparación por párrafos y, dentro de cada párrafo cambiado, por palabras */
  RA.mbComparar = function (htmlSitio, htmlMoodboard) {
    var A1 = RA.mbFirma(htmlSitio).split('\n').filter(Boolean), B1 = RA.mbFirma(htmlMoodboard).split('\n').filter(Boolean);
    var ops = lcs(A1, B1, function (x, y) { return x === y; }) || [['-', A1.join(' ')], ['+', B1.join(' ')]];
    var trozos = [], cambios = 0, iguales = 0, k = 0;
    function cerrarIguales() {
      if (!iguales) return;
      trozos.push('<p class="im-dif__iguales">' + (iguales === 1 ? '1 párrafo sin cambios' : iguales + ' párrafos sin cambios') + '</p>');
      iguales = 0;
    }
    while (k < ops.length) {
      if (ops[k][0] === '=') { iguales++; k++; continue; }
      cerrarIguales();
      var quitados = [], puestos = [];
      while (k < ops.length && ops[k][0] !== '=') { (ops[k][0] === '-' ? quitados : puestos).push(ops[k][1]); k++; }
      var par = Math.min(quitados.length, puestos.length), x;
      for (x = 0; x < par; x++) trozos.push('<p class="im-dif__p">' + diffPalabras(quitados[x], puestos[x]) + '</p>');
      for (x = par; x < quitados.length; x++) trozos.push('<p class="im-dif__p im-dif__p--fuera"><del class="im-del">' + esc(sinMarcas(quitados[x])) + '</del></p>');
      for (x = par; x < puestos.length; x++) trozos.push('<p class="im-dif__p im-dif__p--nuevo"><ins class="im-ins">' + esc(sinMarcas(puestos[x])) + '</ins></p>');
      cambios += Math.max(quitados.length, puestos.length);
    }
    cerrarIguales();
    return { html: trozos.join(''), cambios: cambios };
  };

  /* Estado de un capítulo del Moodboard frente a su entrada en el sitio */
  RA.mbEstadoCapitulo = function (c, e) {
    var H = RA.limpiarCapituloMoodboard(c.html), T = c.title || '';
    var r = { c: c, e: e, H: H, T: T, palabras: RA.contarPalabras(H) };
    if (!e) { r.estado = 'nuevo'; return r; }
    var sitio = e.trabajo && e.trabajo.cuerpo_html != null ? e.trabajo.cuerpo_html : e.cuerpo_html;
    var fH = RA.mbFirma(H), fS = RA.mbFirma(sitio), o = e.origen;
    r.sitio = sitio;
    if (!o || o.html == null) {   // importado antes del SQL 07: no se sabe de qué lado vino el cambio
      r.estado = fH === fS ? 'aldia' : 'distinto';
      r.sinBase = true;
      return r;
    }
    var fO = RA.mbFirma(o.html);
    r.cambioTexto = fH !== fO;
    r.cambioTitulo = (o.titulo || '') !== T;
    r.editadoSitio = fS !== fO;
    r.estado = (r.cambioTexto || r.cambioTitulo) ? 'cambio' : 'aldia';
    r.conflicto = r.cambioTexto && r.editadoSitio && fS !== fH;
    if (r.cambioTexto && fS === fH) { r.estado = r.cambioTitulo ? 'cambio' : 'aldia'; r.cambioTexto = false; }   // ya tiene ese texto
    return r;
  };
  RA.mbHayAviso = function (r) { return r.estado === 'cambio' || r.estado === 'distinto'; };

  /* ══ La carpeta del Moodboard (en Chrome y Edge se recuerda) ═══════ */
  var MB = RA.mb = { datos: null, imagenes: {}, leido: null, nombre: '', avisos: 0, filtros: null, sel: null };
  MB.puedeRecordar = typeof window.showDirectoryPicker === 'function';
  var almacen = {
    abrir: function () {
      return new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('ra-moodboard', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('carpeta'); };
          r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
        } catch (x) { rej(x); }
      });
    },
    leer: function () {
      if (MB.handle) return Promise.resolve(MB.handle);
      return almacen.abrir().then(function (db) {
        return new Promise(function (res) {
          var q = db.transaction('carpeta').objectStore('carpeta').get('datos');
          q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); };
        });
      }).catch(function () { return null; });
    },
    guardar: function (h) {
      MB.handle = h;
      return almacen.abrir().then(function (db) {
        return new Promise(function (res) {
          try {
            var tx = db.transaction('carpeta', 'readwrite'); tx.objectStore('carpeta').put(h, 'datos');
            tx.oncomplete = res; tx.onerror = res;
          } catch (x) { res(); }
        });
      }).catch(function () { /* el navegador no deja guardarla: se recuerda solo en esta visita */ });
    }
  };
  function permiso(h, pedir) {
    if (!h || !h.queryPermission) return Promise.resolve(!!h);
    return h.queryPermission({ mode: 'read' }).then(function (p) {
      if (p === 'granted') return true;
      return pedir ? h.requestPermission({ mode: 'read' }).then(function (q) { return q === 'granted'; }) : false;
    }).catch(function () { return false; });
  }
  /* Lee moodboard.json y las imágenes desde una carpeta elegida con showDirectoryPicker.
     Sirve la carpeta «datos» o la carpeta «Moodboard de investigacion» que la contiene. */
  function leerCarpeta(h) {
    function json(dir) { return dir.getFileHandle('moodboard.json').then(function (f) { return { dir: dir, f: f }; }); }
    return json(h).catch(function () { return h.getDirectoryHandle('datos').then(json); }).catch(function () {
      throw new Error('En esa carpeta no está moodboard.json. Elige la carpeta «datos» del Moodboard.');
    }).then(function (x) {
      return x.f.getFile().then(function (archivo) {
        return x.dir.getDirectoryHandle('imagenes').then(function (dimg) {
          var imagenes = {}, cola = [];
          return (function recorrer(it) {
            return it.next().then(function (paso) {
              if (paso.done) return Promise.all(cola).then(function () { return imagenes; });
              var ent = paso.value[1];
              if (ent.kind === 'file' && /\.(jpe?g|png|gif|webp|avif)$/i.test(ent.name)) cola.push(ent.getFile().then(function (f) { imagenes[f.name] = f; }));
              return recorrer(it);
            });
          })(dimg.entries());
        }).catch(function () { return {}; }).then(function (imagenes) { return { json: archivo, imagenes: imagenes }; });
      });
    });
  }
  /* Lee desde una lista de archivos (carpeta elegida con el selector clásico, o archivos sueltos) */
  function leerArchivos(archivos) {
    var json = archivos.filter(function (f) {
      var ruta = f.webkitRelativePath || f.name;
      return /(^|\/)moodboard\.json$/i.test(ruta) && !/respaldos\//i.test(ruta);
    }).sort(function (a, b) { return (a.webkitRelativePath || a.name).length - (b.webkitRelativePath || b.name).length; })[0];
    if (!json) return Promise.reject(new Error('No encontré moodboard.json entre los archivos elegidos'));
    var imagenes = {};
    archivos.forEach(function (f) {
      var ruta = f.webkitRelativePath || f.name;
      if (/respaldos\//i.test(ruta)) return;
      if (/\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)) imagenes[f.name] = f;
    });
    return Promise.resolve({ json: json, imagenes: imagenes });
  }
  function cargar(x, nombre) {
    return x.json.text().then(function (t) {
      var datos = JSON.parse(t);
      if (!datos || !Array.isArray(datos.cards) || !Array.isArray(datos.projects)) throw new Error('El archivo no parece un moodboard.json');
      datos.chapters = datos.chapters || []; datos.types = datos.types || []; datos.tags = datos.tags || [];
      MB.datos = datos; MB.imagenes = x.imagenes; MB.leido = new Date().toISOString(); MB.nombre = nombre || '';
      return datos;
    });
  }
  /* Cuenta los capítulos con cambios y pone el número en «Importar» (barra lateral) */
  MB.contarAvisos = function () {
    if (!MB.datos) return Promise.resolve(0);
    return RA.adm.entradasMoodboard().then(function (r) {
      var por = {}; r.lista.forEach(function (e) { por[e.origen_moodboard] = e; });
      var n = MB.datos.chapters.filter(function (c) { return !c.sample && por[c.id] && RA.mbHayAviso(RA.mbEstadoCapitulo(c, por[c.id])); }).length;
      MB.marcarAvisos(n);
      return n;
    }).catch(function () { return 0; });
  };
  MB.marcarAvisos = function (n) {
    MB.avisos = n;
    var a = document.querySelector('.a-lateral nav a[data-s="importar"]');
    if (!a) return;
    var b = a.querySelector('.a-lateral__avisos');
    if (!n) { if (b) b.remove(); a.removeAttribute('title'); return; }
    if (!b) { b = document.createElement('span'); b.className = 'a-lateral__avisos'; a.appendChild(b); }
    b.textContent = n;
    a.title = n === 1 ? '1 capítulo cambió en el Moodboard' : n + ' capítulos cambiaron en el Moodboard';
  };
  /* Al entrar al administrador: si el navegador recuerda la carpeta y ya dio permiso, revisa en silencio */
  MB.alArrancar = function () {
    if (!MB.puedeRecordar) return;
    almacen.leer().then(function (h) {
      if (!h) return;
      MB.handle = h;
      return permiso(h, false).then(function (si) {
        if (!si) return;
        return leerCarpeta(h).then(function (x) { return cargar(x, h.name); }).then(MB.contarAvisos);
      });
    }).catch(function () { /* nada: se revisa al abrir Importar */ });
  };

  /* ══ Página «Importar» ═════════════════════════════════════════════ */
  RA.paginas.importar = function () {
    document.title = 'Importar · Administración';
    var P = A().principal;
    P.innerHTML = '<div class="a-pagina im"><header class="a-cabecera"><h1>Importar desde el Moodboard</h1>' +
      '<p class="a-cabecera__nota">Trae cards como referentes y capítulos como cuadernos o apuntes. Solo se leen los archivos: el Moodboard no cambia. ' +
      'La nota personal de las cards y los pasajes nunca se importan.</p></header>' +
      '<div class="im-fuente"></div><div class="im-vista"></div></div>';
    var fuente = P.querySelector('.im-fuente'), caja = P.querySelector('.im-vista');

    function pintarFuente() {
      if (MB.datos) {
        var D = MB.datos, caps = D.chapters.filter(function (c) { return !c.sample; }).length;
        fuente.className = 'im-fuente im-fuente--leida';
        fuente.innerHTML = '<span class="im-fuente__punto" aria-hidden="true"></span><span class="im-fuente__texto">Moodboard leído ' + esc(ui().fecha(MB.leido)) +
          ' · ' + D.cards.filter(function (c) { return !c.sample; }).length + ' cards · ' + caps + (caps === 1 ? ' capítulo' : ' capítulos') + '</span>' +
          '<button type="button" class="a-boton a-boton--fino" data-elegir="otra-vez">Volver a leer</button>' +
          (MB.puedeRecordar ? '<button type="button" class="a-boton a-boton--fino" data-elegir="carpeta">Elegir otra carpeta</button>' : '');
      } else {
        fuente.className = 'im-fuente';
        fuente.innerHTML =
          (MB.handle ? '<button type="button" class="a-boton a-boton--primario" data-elegir="otra-vez">Revisar el Moodboard</button>' +
            '<button type="button" class="a-boton" data-elegir="carpeta">Elegir otra carpeta</button>'
            : '<button type="button" class="a-boton a-boton--primario" data-elegir="carpeta">Elegir la carpeta «datos» del Moodboard</button>') +
          '<button type="button" class="a-boton a-boton--fino" data-elegir="archivos">o elegir moodboard.json y las imágenes sueltas</button>' +
          '<p class="ed-nota">' + (MB.handle ? 'Tu navegador recuerda la carpeta «' + esc(MB.handle.name || 'datos') + '». Puede pedirte permiso para leerla.'
            : 'La carpeta está en «Moodboard de investigacion/datos». Ahí están moodboard.json y la carpeta «imagenes».' +
              (MB.puedeRecordar ? ' Este navegador la recordará para la próxima vez.' : ' En este navegador hay que elegirla cada vez; en Chrome o Edge se recuerda.')) + '</p>';
      }
      fuente.querySelectorAll('[data-elegir]').forEach(function (b) { b.onclick = function () { elegir(b.getAttribute('data-elegir')); }; });
    }
    function elegir(como) {
      var p;
      if (como === 'otra-vez' && MB.handle) p = permiso(MB.handle, true).then(function (si) {
        if (!si) throw new Error('El navegador no dio permiso para leer la carpeta');
        return leerCarpeta(MB.handle).then(function (x) { return cargar(x, MB.handle.name); });
      });
      else if ((como === 'carpeta' || como === 'otra-vez') && MB.puedeRecordar) p = window.showDirectoryPicker({ id: 'moodboard-datos', mode: 'read' }).then(function (h) {
        return leerCarpeta(h).then(function (x) { almacen.guardar(h); return cargar(x, h.name); });
      });
      else p = new Promise(function (res) {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.hidden = true; inp.multiple = true;
        if (como !== 'archivos') { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
        else inp.accept = '.json,image/*';
        document.body.appendChild(inp);
        inp.onchange = function () { var fs = [].slice.call(inp.files || []); inp.remove(); res(fs); };
        inp.click();
      }).then(function (fs) { if (!fs.length) return null; return leerArchivos(fs).then(function (x) { return cargar(x, ''); }); });
      p.then(function (d) { if (d) { pintarFuente(); vista(); } }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        console.error(e); ui().aviso('No se pudo leer el Moodboard: ' + e.message, 'error');
      });
    }

    almacen.leer().then(function (h) { if (h && !MB.handle) MB.handle = h; pintarFuente(); if (MB.datos) vista(); });

    /* ── Vista con las dos pestañas ── */
    function vista() {
      caja.innerHTML = '<p class="a-cargando">Comparando con el sitio…</p>';
      Promise.all([RA.adm.referentes(), RA.adm.entradasMoodboard(), A().recargar(), RA.adm.sellos().catch(function () { return null; })]).then(function (r) {
        montar(MB.datos, r[0], r[1], r[3]);
      }).catch(function (e) { console.error(e); caja.innerHTML = ''; ui().aviso('No se pudo comparar con el sitio: ' + e.message, 'error'); });
    }

    function montar(D, sitio, deMB, sellos) {
      var tipos = {}; D.types.forEach(function (t) { tipos[t.id] = t; });
      var etiquetas = {}; D.tags.forEach(function (t) { etiquetas[t.id] = t; });
      var proyectos = D.projects.filter(function (p) { return !p.sample; });
      var aura = (proyectos.filter(function (p) { return /aura/i.test(p.name); })[0] || proyectos[0] || {}).id;
      var cards = D.cards.filter(function (c) { return !c.sample; });
      var enMB = {}; D.cards.forEach(function (c) { enMB[c.id] = 1; });

      /* Referentes del sitio, para comparar */
      var refSitio = {}, etqSitio = {};
      sitio.referentes.forEach(function (x) { refSitio[x.id] = x; });
      sitio.pares.forEach(function (p) { (etqSitio[p.referente_id] = etqSitio[p.referente_id] || []).push(p.etiqueta_id); });
      function imagenDe(c) { return c.image && c.image.file ? 'referentes/' + c.image.file : (c.image && c.image.url) || null; }
      function estadoCard(c) {
        var s = refSitio[c.id];
        if (!s) return 'nueva';
        var igual = (s.titulo || '') === (c.title || '') && (s.cuerpo || '') === (c.body || '') && (s.url || '') === (c.url || '') &&
          (s.autor || '') === (c.author || '') && (s.fuente || '') === (c.source || '') && String(s.anio || '') === String(c.year || '') &&
          (s.tipo_id || null) === (tipos[c.typeId] ? c.typeId : null) && (s.imagen || null) === imagenDe(c) &&
          (etqSitio[c.id] || []).slice().sort().join(',') === (c.tagIds || []).filter(function (t) { return etiquetas[t]; }).slice().sort().join(',');
        return igual ? 'igual' : 'cambio';
      }
      var est = {}; cards.forEach(function (c) { est[c.id] = estadoCard(c); });
      var huerfanos = sitio.referentes.filter(function (x) { return !enMB[x.id]; });

      /* Filtros (se recuerdan en este navegador) y selección (en esta visita) */
      var F = MB.filtros || RA.guardado.leer('importar-filtros', null) || {};
      F = { alcance: F.alcance || [aura], tipos: F.tipos || [], etq: F.etq || [], fav: !!F.fav, img: !!F.img, estado: F.estado || 'todas', capProyecto: F.capProyecto || aura, verTodas: false, q: '' };
      F.alcance = F.alcance.filter(function (a) { return a === '*' || a === '-' || proyectos.some(function (p) { return p.id === a; }); });
      if (!F.alcance.length) F.alcance = [aura];
      if (!proyectos.some(function (p) { return p.id === F.capProyecto; })) F.capProyecto = aura;
      MB.filtros = F;
      function recordar() { try { RA.guardado.escribir('importar-filtros', { alcance: F.alcance, tipos: F.tipos, etq: F.etq, fav: F.fav, img: F.img, estado: F.estado, capProyecto: F.capProyecto }); } catch (x) { /* nada */ } }
      // Con cada lectura nueva del Moodboard se proponen marcadas las cards nuevas o cambiadas de lo que estás viendo
      if (!MB.sel || MB.selLeido !== MB.leido) {
        MB.sel = {}; MB.selLeido = MB.leido;
        // Las cambiadas siempre; las nuevas solo si estás mirando proyectos (no toda la biblioteca ni las sin proyecto)
        var porProyecto = F.alcance.indexOf('*') < 0 && F.alcance.indexOf('-') < 0;
        cards.forEach(function (c) { if (enAlcance(c) && (est[c.id] === 'cambio' || (est[c.id] === 'nueva' && porProyecto))) MB.sel[c.id] = 1; });
      }
      var sel = MB.sel;
      var selCap = {}, eleccion = {};   // capítulos nuevos marcados y su tipo/número/sello

      function enAlcance(c) {
        if (F.alcance.indexOf('*') >= 0) return true;
        var ps = c.projectIds || [];
        if (F.alcance.indexOf('-') >= 0 && !ps.length) return true;
        return ps.some(function (p) { return F.alcance.indexOf(p) >= 0; });
      }
      function pasa(c, sin) {
        if (!enAlcance(c)) return false;
        if (sin !== 'tipos' && F.tipos.length && F.tipos.indexOf(c.typeId) < 0) return false;
        if (sin !== 'etq' && F.etq.length && !(c.tagIds || []).some(function (t) { return F.etq.indexOf(t) >= 0; })) return false;
        if (F.fav && !c.fav) return false;
        if (F.img && !(c.image && (c.image.file || c.image.url))) return false;
        if (sin !== 'estado' && F.estado !== 'todas' && est[c.id] !== F.estado) return false;
        return true;
      }

      var deMBpor = {}; deMB.lista.forEach(function (e) { deMBpor[e.origen_moodboard] = e; });
      var info = {};   // estado de cada capítulo del Moodboard
      function calcularCaps() {
        info = {};
        D.chapters.forEach(function (c) { if (!c.sample) info[c.id] = RA.mbEstadoCapitulo(c, deMBpor[c.id]); });
        var n = Object.keys(info).filter(function (k) { return RA.mbHayAviso(info[k]); }).length;
        MB.marcarAvisos(n);
        return n;
      }
      var nAvisos = calcularCaps();
      var pestana = MB.pestana || (nAvisos ? 'caps' : 'refs');

      caja.innerHTML =
        (deMB.sinOrigen ? '<p class="im-aviso-sql">Para que el sitio te avise cuando un capítulo cambie en el Moodboard, corre en Supabase el archivo <code>supabase/07-origen-moodboard.sql</code> y recarga. Mientras tanto se compara el texto del sitio con el del Moodboard.</p>' : '') +
        '<div class="im-pestanas" role="tablist">' +
          '<button type="button" role="tab" data-p="refs">Referentes <span class="im-pestanas__n" data-n="refs"></span></button>' +
          '<button type="button" role="tab" data-p="caps">Capítulos y apuntes <span class="im-pestanas__n" data-n="caps"></span></button></div>' +
        '<section class="im-panel" data-panel="refs"></section><section class="im-panel" data-panel="caps"></section>' +
        '<div class="im-pie"><button type="button" class="a-boton a-boton--primario im-ir">Importar</button><div class="im-registro" aria-live="polite"></div></div>';
      var panR = caja.querySelector('[data-panel="refs"]'), panC = caja.querySelector('[data-panel="caps"]'), reg = caja.querySelector('.im-registro');
      caja.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { pestana = MB.pestana = b.getAttribute('data-p'); mostrarPestana(); }; });
      function mostrarPestana() {
        caja.querySelectorAll('[data-p]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-p') === pestana); });
        panR.hidden = pestana !== 'refs'; panC.hidden = pestana !== 'caps';
      }

      /* ── Pestaña Referentes ── */
      MB.urls = MB.urls || {};
      function urlDe(f) { return MB.urls[f.name] || (MB.urls[f.name] = URL.createObjectURL(f)); }
      function chip(attr, valor, activo, texto, color, n) {
        return '<button type="button" class="im-chip" ' + attr + '="' + esc(valor) + '" aria-pressed="' + !!activo + '">' +
          (color ? '<i style="background:' + esc(color) + '"></i>' : '') + esc(texto) + (n != null ? ' <span class="im-chip__n">' + n + '</span>' : '') + '</button>';
      }
      function pintarRefs() {
        var cuentaT = {}, cuentaE = {}, cuentaS = { nueva: 0, cambio: 0, igual: 0 };
        cards.filter(function (c) { return pasa(c, 'tipos'); }).forEach(function (c) { cuentaT[c.typeId] = (cuentaT[c.typeId] || 0) + 1; });
        cards.filter(function (c) { return pasa(c, 'etq'); }).forEach(function (c) { (c.tagIds || []).forEach(function (t) { cuentaE[t] = (cuentaE[t] || 0) + 1; }); });
        cards.filter(function (c) { return pasa(c, 'estado'); }).forEach(function (c) { cuentaS[est[c.id]]++; });
        var lista = cards.filter(function (c) { return pasa(c); });
        var etqOrden = D.tags.filter(function (t) { return cuentaE[t.id] || F.etq.indexOf(t.id) >= 0; })
          .sort(function (a, b) { return (cuentaE[b.id] || 0) - (cuentaE[a.id] || 0) || a.name.localeCompare(b.name, 'es'); });
        var q = F.q && F.q.trim() ? RA.slugificar(F.q).replace(/-/g, ' ') : '';
        var etqVisibles = etqOrden.filter(function (t) { return !q || RA.slugificar(t.name).replace(/-/g, ' ').indexOf(q) >= 0; });
        var LIM = 16, recorte = !F.verTodas && !q && etqVisibles.length > LIM;
        if (recorte) etqVisibles = etqVisibles.filter(function (t, i) { return i < LIM || F.etq.indexOf(t.id) >= 0; });
        panR.innerHTML =
          '<div class="im-filtros">' +
            '<div class="im-fila"><span class="im-fila__t">De dónde</span><div class="im-chips">' +
              chip('data-alc', '*', F.alcance.indexOf('*') >= 0, 'Toda la biblioteca', null, cards.length) +
              proyectos.map(function (p) { return chip('data-alc', p.id, F.alcance.indexOf(p.id) >= 0, p.name, null, cards.filter(function (c) { return (c.projectIds || []).indexOf(p.id) >= 0; }).length); }).join('') +
              chip('data-alc', '-', F.alcance.indexOf('-') >= 0, 'Sin proyecto', null, cards.filter(function (c) { return !(c.projectIds || []).length; }).length) +
            '</div></div>' +
            '<div class="im-fila"><span class="im-fila__t">Tipos</span><div class="im-chips">' +
              D.types.filter(function (t) { return cuentaT[t.id] || F.tipos.indexOf(t.id) >= 0; }).map(function (t) { return chip('data-tipo', t.id, F.tipos.indexOf(t.id) >= 0, t.name, t.color, cuentaT[t.id] || 0); }).join('') +
            '</div></div>' +
            '<div class="im-fila"><span class="im-fila__t">Etiquetas</span><div class="im-chips">' +
              '<input type="search" class="im-buscar-etq" placeholder="Buscar etiqueta…" aria-label="Buscar etiqueta" value="' + esc(F.q || '') + '">' +
              etqVisibles.map(function (t) { return chip('data-etq', t.id, F.etq.indexOf(t.id) >= 0, t.name, t.color, cuentaE[t.id] || 0); }).join('') +
              (recorte ? '<button type="button" class="im-chip im-chip--mas" data-ver-etq>Ver las ' + etqOrden.length + '</button>' : '') +
              (!etqVisibles.length ? '<span class="ed-nota">Ninguna coincide.</span>' : '') +
            '</div></div>' +
            '<div class="im-fila"><span class="im-fila__t">Además</span><div class="im-chips">' +
              chip('data-extra', 'fav', F.fav, 'Favoritas') + chip('data-extra', 'img', F.img, 'Con imagen') +
            '</div></div>' +
            '<div class="im-fila"><span class="im-fila__t">Frente al sitio</span><div class="im-chips">' +
              chip('data-est', 'todas', F.estado === 'todas', 'Todas', null, cuentaS.nueva + cuentaS.cambio + cuentaS.igual) +
              chip('data-est', 'nueva', F.estado === 'nueva', 'Nuevas', null, cuentaS.nueva) +
              chip('data-est', 'cambio', F.estado === 'cambio', 'Cambiaron en el Moodboard', null, cuentaS.cambio) +
              chip('data-est', 'igual', F.estado === 'igual', 'Sin cambios', null, cuentaS.igual) +
            '</div></div>' +
          '</div>' +
          '<div class="im-titulo im-titulo--refs">' + resumenRefs(lista) + '</div>' +
          '<label class="im-opcion"><input type="checkbox" class="im-publicos"' + (MB.publicos === false ? '' : ' checked') + '> Los referentes nuevos quedan públicos (luego puedes ocultar cualquiera en «Referentes»)</label>' +
          '<label class="im-opcion"><input type="checkbox" class="im-resubir"' + (MB.resubir ? ' checked' : '') + '> Volver a subir imágenes que ya estén en el sitio</label>' +
          '<div class="im-rejilla">' + lista.map(function (c) {
            var t = tipos[c.typeId] || {}, f = c.image && c.image.file && MB.imagenes[c.image.file];
            var u = f ? urlDe(f) : (c.image && c.image.url) || (refSitio[c.id] && RA.urlImagen(refSitio[c.id].imagen)) || '';
            var e = est[c.id];
            return '<label class="im-card im-card--' + e + '"><input type="checkbox" data-ref="' + esc(c.id) + '"' + (sel[c.id] ? ' checked' : '') + '>' +
              '<span class="im-card__img"' + (u ? ' style="background-image:url(\'' + esc(u) + '\')"' : '') + '></span>' +
              '<span class="im-card__tipo"><i style="background:' + esc(t.color || '#ccc') + '"></i>' + esc(t.name || c.typeId) + '</span>' +
              '<span class="im-card__titulo">' + esc(c.title || 'Sin título') + '</span>' +
              '<span class="im-card__etq">' + (c.tagIds || []).map(function (id) { return etiquetas[id] ? esc(etiquetas[id].name) : ''; }).filter(Boolean).join(' · ') + '</span>' +
              '<span class="im-card__estado">' + (e === 'nueva' ? 'Nueva' : e === 'cambio' ? 'Cambió · se actualiza' : 'En el sitio, sin cambios') +
                (refSitio[c.id] && !refSitio[c.id].publico ? ' · oculta' : '') + '</span></label>';
          }).join('') + '</div>' +
          (lista.length ? '' : '<p class="a-vacio">Ninguna card cumple estos filtros.</p>') +
          (huerfanos.length ? '<details class="im-huerfanos"><summary>En el sitio, pero ya no están en el Moodboard <span class="ed-cuenta">' + huerfanos.length + '</span></summary>' +
            '<p class="ed-nota">Se borraron del Moodboard. No se quitan solas: decide qué hacer con cada una.</p>' +
            huerfanos.map(function (x) {
              return '<div class="im-huerfano"><span>' + esc(x.titulo || 'Sin título') + (x.publico ? '' : ' <em>(oculta)</em>') + '</span>' +
                (x.publico ? '<button type="button" class="a-boton a-boton--fino" data-ocultar="' + esc(x.id) + '">Ocultar</button>' : '') +
                '<button type="button" class="a-boton a-boton--fino" data-quitar="' + esc(x.id) + '">Quitar del sitio</button></div>';
            }).join('') + '</details>' : '');
        var inp = panR.querySelector('.im-buscar-etq');
        inp.oninput = function () {
          F.q = inp.value; var pos = inp.selectionStart; pintarRefs();
          var n = panR.querySelector('.im-buscar-etq'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* nada */ }
        };
        contar();
      }
      function resumenRefs(lista) {
        var nSel = Object.keys(sel).filter(function (id) { return enMB[id]; }).length, nSelFiltro = lista.filter(function (c) { return sel[c.id]; }).length;
        var faltan = lista.filter(function (c) { return c.image && c.image.file && !MB.imagenes[c.image.file]; }).length;
        return '<p class="im-resumen"><b>' + lista.length + '</b> ' + (lista.length === 1 ? 'card coincide' : 'cards coinciden') +
          ' · <b>' + nSelFiltro + '</b> ' + (nSelFiltro === 1 ? 'marcada' : 'marcadas') + (nSel !== nSelFiltro ? ' (' + nSel + ' en total)' : '') +
          (faltan ? ' · <span class="im-aviso">faltan ' + faltan + ' imágenes: elige la carpeta «datos» completa</span>' : '') + '</p>' +
          '<span class="im-marcar"><button type="button" class="a-boton a-boton--fino" data-marcar="1"' + (lista.length ? '' : ' disabled') + '>Marcar ' + (lista.length === 1 ? 'esta' : 'las ' + lista.length) + '</button>' +
          '<button type="button" class="a-boton a-boton--fino" data-marcar="0"' + (nSelFiltro ? '' : ' disabled') + '>Desmarcar estas</button>' +
          (nSel ? '<button type="button" class="a-boton a-boton--fino" data-marcar="todo0">Desmarcar todo</button>' : '') +
          '<button type="button" class="a-boton a-boton--fino" data-limpiar>Quitar filtros</button></span>';
      }
      function alternar(lista, v) { var i = lista.indexOf(v); if (i >= 0) lista.splice(i, 1); else lista.push(v); }
      panR.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        var v;
        if ((v = b.getAttribute('data-alc')) !== null) {
          if (v === '*') F.alcance = ['*'];
          else { F.alcance = F.alcance.filter(function (a) { return a !== '*'; }); alternar(F.alcance, v); if (!F.alcance.length) F.alcance = ['*']; }
        } else if ((v = b.getAttribute('data-tipo')) !== null) alternar(F.tipos, v);
        else if ((v = b.getAttribute('data-etq')) !== null) alternar(F.etq, v);
        else if ((v = b.getAttribute('data-extra')) !== null) F[v] = !F[v];
        else if ((v = b.getAttribute('data-est')) !== null) F.estado = v;
        else if (b.hasAttribute('data-ver-etq')) F.verTodas = true;
        else if (b.hasAttribute('data-limpiar')) { F.tipos = []; F.etq = []; F.fav = false; F.img = false; F.estado = 'todas'; F.q = ''; }
        else if ((v = b.getAttribute('data-marcar')) !== null) {
          if (v === 'todo0') Object.keys(sel).forEach(function (k) { delete sel[k]; });
          else cards.filter(function (c) { return pasa(c); }).forEach(function (c) { if (v === '1') sel[c.id] = 1; else delete sel[c.id]; });
        } else if ((v = b.getAttribute('data-ocultar') || b.getAttribute('data-quitar'))) {
          var quitar = b.hasAttribute('data-quitar'), x = refSitio[v];
          (quitar ? ui().confirmar('Quitar del sitio', '«' + esc(x.titulo) + '» dejará de estar en el sitio y en los capítulos que lo citan.', 'Quitar', true) : Promise.resolve(true)).then(function (si) {
            if (!si) return;
            return (quitar ? RA.adm.eliminarReferente(v) : RA.adm.cambiarPublico([v], false)).then(function () {
              if (quitar) { huerfanos = huerfanos.filter(function (h) { return h.id !== v; }); delete refSitio[v]; } else x.publico = false;
              pintarRefs(); ui().aviso(quitar ? 'Quitado del sitio' : 'Ahora está oculto');
            });
          }).catch(function (e) { ui().aviso('No se pudo: ' + e.message, 'error'); });
          return;
        } else return;
        recordar(); pintarRefs();
      });
      panR.addEventListener('change', function (ev) {
        var x = ev.target;
        if (x.hasAttribute('data-ref')) {
          if (x.checked) sel[x.getAttribute('data-ref')] = 1; else delete sel[x.getAttribute('data-ref')];
          panR.querySelector('.im-titulo--refs').innerHTML = resumenRefs(cards.filter(function (c) { return pasa(c); }));
          contar();
        }
        if (x.classList.contains('im-publicos')) MB.publicos = x.checked;
        if (x.classList.contains('im-resubir')) MB.resubir = x.checked;
      });

      /* ── Pestaña Capítulos y apuntes ── */
      function numerosUsados(sinId) {
        var u = {};
        A().entradas.forEach(function (x) { var v = A().vigente(x); if (x.id !== sinId && v.tipo === 'capitulo' && v.numero) u[v.numero] = v.titulo || 'Sin título'; });
        return u;
      }
      function pintarCaps() {
        var caps = D.chapters.filter(function (c) { return !c.sample && c.projectId === F.capProyecto; }).sort(function (a, b) { return a.order - b.order; });
        var nuevos = caps.filter(function (c) { return info[c.id].estado === 'nuevo'; });
        var avisos = caps.filter(function (c) { return RA.mbHayAviso(info[c.id]); });
        var porCap = {}; D.chapters.forEach(function (c) { porCap[c.id] = c; });
        var sueltos = deMB.lista.filter(function (e) { return !porCap[e.origen_moodboard]; });
        panC.innerHTML =
          '<div class="im-titulo"><label class="a-campo im-proyecto-cap">Proyecto del Moodboard<select class="im-proyecto">' + proyectos.map(function (p) {
            return '<option value="' + esc(p.id) + '"' + (p.id === F.capProyecto ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '</select></label>' +
          (nuevos.length ? '<span class="im-marcar"><button type="button" class="a-boton a-boton--fino" data-capmarcar="1">Marcar los nuevos</button><button type="button" class="a-boton a-boton--fino" data-capmarcar="0">Ninguno</button></span>' : '') + '</div>' +
          '<p class="ed-nota">Los nuevos llegan como borradores: tú eliges si cada uno es un cuaderno (con su número de día) o un apunte. Se quitan los resaltados y las marcas de comentario; los comentarios pasan a tus notas privadas. ' +
            'Si un capítulo ya importado cambia en el Moodboard, aquí te aviso y tú decides si se aplica. Lo que ven los lectores no cambia sin tu aprobación.</p>' +
          (avisos.length ? '<p class="im-avisos-resumen">' + (avisos.length === 1 ? '1 capítulo cambió' : avisos.length + ' capítulos cambiaron') + ' en el Moodboard desde que lo importaste.</p>' : '') +
          '<div class="im-caps">' + caps.map(function (c) {
            var r = info[c.id], e = r.e;
            if (r.estado === 'nuevo') {
              var el = eleccion[c.id] || (eleccion[c.id] = { tipo: 'capitulo', numero: RA.separarDia(c.title).numero || '', sello: '' });
              var marcado = !!selCap[c.id];
              return '<div class="im-cap im-cap--nuevo' + (marcado ? ' im-cap--marcado' : '') + '" data-fila="' + esc(c.id) + '">' +
                '<input type="checkbox" data-cap="' + esc(c.id) + '"' + (marcado ? ' checked' : '') + ' aria-label="Importar «' + esc(c.title || 'Sin título') + '»">' +
                '<span class="im-cap__textos"><span class="im-cap__titulo">' + esc(c.title || 'Sin título') + '</span>' +
                  '<span class="a-fila__dato">' + RA.ui.numero(r.palabras) + ' palabras' + ((c.notes || []).length ? ' · ' + c.notes.length + ' comentarios' : '') + (r.palabras ? '' : ' · vacío') + '</span></span>' +
                '<span class="im-cap__como">' +
                  '<select data-como="' + esc(c.id) + '" aria-label="Importar como"><option value="capitulo"' + (el.tipo === 'capitulo' ? ' selected' : '') + '>Cuaderno</option><option value="apunte"' + (el.tipo === 'apunte' ? ' selected' : '') + '>Apunte</option></select>' +
                  (el.tipo === 'capitulo' ? '<label class="im-cap__dia">Día <input type="number" min="1" max="999" inputmode="numeric" data-num="' + esc(c.id) + '" value="' + esc(el.numero) + '" aria-label="Número del día"></label>'
                    : (sellos && sellos.length ? '<select data-sello="' + esc(c.id) + '" aria-label="Sello del apunte"><option value="">Sin sello</option>' + sellos.map(function (s) { return '<option value="' + esc(s.id) + '"' + (el.sello === s.id ? ' selected' : '') + '>' + esc(s.nombre) + '</option>'; }).join('') + '</select>' : '')) +
                '</span>' +
                '<span class="a-chip a-chip--borrador">Nuevo</span>' +
                '<span class="im-cap__error" role="alert"></span></div>';
            }
            var v = A().vigente(Object.assign({}, e, { trabajo: e.trabajo }));
            var et = A().estado(e);
            var texto = r.estado === 'aldia' ? (r.editadoSitio ? 'Al día · lo editaste en el sitio' : 'Al día con el Moodboard')
              : r.estado === 'distinto' ? 'El texto es distinto del Moodboard'
              : r.cambioTexto ? (r.conflicto ? 'Cambió en el Moodboard · también lo editaste en el sitio' : 'Cambió en el Moodboard') : 'Cambió el título en el Moodboard';
            return '<div class="im-cap im-cap--existe' + (RA.mbHayAviso(r) ? ' im-cap--aviso' : '') + '" data-fila="' + esc(c.id) + '">' +
              '<span class="im-cap__marca" aria-hidden="true"></span>' +
              '<span class="im-cap__textos"><span class="im-cap__titulo">' + esc(c.title || 'Sin título') + '</span>' +
                '<span class="a-fila__dato">En el sitio: ' + esc(RA.antetitulo(v)) + ' · ' + esc(v.titulo || 'Sin título') + '</span></span>' +
              '<span class="im-cap__estado' + (RA.mbHayAviso(r) ? ' im-cap__estado--aviso' : '') + '">' + texto + '</span>' +
              '<span class="a-chip a-chip--' + et.clase + '">' + et.texto + '</span>' +
              '<span class="im-cap__acciones">' + (RA.mbHayAviso(r) ? '<button type="button" class="a-boton a-boton--fino a-boton--primario" data-ver="' + esc(c.id) + '">Ver cambios</button>' : '') +
                '<a class="a-boton a-boton--fino" href="#/entrada/' + esc(e.id) + '">Abrir</a></span></div>';
          }).join('') + '</div>' +
          (caps.length ? '' : '<p class="a-vacio">Este proyecto no tiene capítulos.</p>') +
          (sueltos.length ? '<details class="im-huerfanos"><summary>En el sitio, pero ya no están en el Moodboard <span class="ed-cuenta">' + sueltos.length + '</span></summary>' +
            '<p class="ed-nota">Su capítulo se borró del Moodboard. En el sitio siguen como estaban.</p>' +
            sueltos.map(function (e) { return '<div class="im-huerfano"><span>' + esc(RA.antetitulo(A().vigente(e)) + ' · ' + (A().vigente(e).titulo || 'Sin título')) + '</span><a class="a-boton a-boton--fino" href="#/entrada/' + esc(e.id) + '">Abrir</a></div>'; }).join('') +
            '</details>' : '');
        panC.querySelector('.im-proyecto').onchange = function () { F.capProyecto = this.value; recordar(); pintarCaps(); };
        contar();
      }
      panC.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        var v;
        if ((v = b.getAttribute('data-capmarcar')) !== null) {
          D.chapters.forEach(function (c) { if (c.projectId === F.capProyecto && info[c.id] && info[c.id].estado === 'nuevo') { if (v === '1') selCap[c.id] = 1; else delete selCap[c.id]; } });
          pintarCaps();
        }
        if ((v = b.getAttribute('data-ver'))) verCambios(info[v]);
      });
      panC.addEventListener('change', function (ev) {
        var x = ev.target, id;
        if ((id = x.getAttribute('data-cap'))) { if (x.checked) selCap[id] = 1; else delete selCap[id]; x.closest('.im-cap').classList.toggle('im-cap--marcado', x.checked); contar(); }
        if ((id = x.getAttribute('data-como'))) { eleccion[id].tipo = x.value; selCap[id] = 1; pintarCaps(); var n = panC.querySelector('[data-num="' + id + '"]'); if (n) n.focus(); }
        if ((id = x.getAttribute('data-sello'))) eleccion[id].sello = x.value;
      });
      panC.addEventListener('input', function (ev) {
        var x = ev.target, id = x.getAttribute('data-num');
        if (!id) return;
        eleccion[id].numero = x.value.replace(/\D/g, '');
        if (eleccion[id].numero && !selCap[id]) { selCap[id] = 1; var cb = panC.querySelector('[data-cap="' + id + '"]'); cb.checked = true; cb.closest('.im-cap').classList.add('im-cap--marcado'); }
        var fila = x.closest('.im-cap'); fila.classList.remove('im-cap--error'); fila.querySelector('.im-cap__error').textContent = '';
        contar();
      });

      /* ── Ver cambios de un capítulo y aprobarlos ── */
      function verCambios(r) {
        var e = r.e, publicada = e.estado === 'publicado';
        var dif = RA.mbComparar(r.sitio, r.H);
        var tituloSitio = A().vigente(e).titulo || '', tituloMB = RA.separarDia(r.T).titulo;
        var cuerpo = document.createElement('div');
        cuerpo.className = 'im-dif';
        cuerpo.innerHTML =
          (r.conflicto ? '<p class="im-dif__alerta"><b>También lo editaste en el sitio.</b> Si traes lo del Moodboard, se reemplazan los cambios que hiciste aquí en el texto. En la comparación, lo tachado es lo que hay hoy en el sitio.</p>' : '') +
          (r.sinBase ? '<p class="im-dif__alerta">Este capítulo se importó antes de que existieran los avisos, así que no sé si la diferencia viene del Moodboard o de lo que editaste en el sitio. Revísala con cuidado.</p>' : '') +
          '<p class="im-dif__leyenda"><del class="im-del">tachado</del> lo que hay en el sitio · <ins class="im-ins">resaltado</ins> lo que trae el Moodboard</p>' +
          (dif.cambios ? '<div class="im-dif__texto">' + dif.html + '</div>' : '<p class="ed-nota">El texto es igual; solo cambió el título.</p>') +
          (tituloMB !== tituloSitio ? '<label class="im-opcion im-dif__titulo"><input type="checkbox" class="im-con-titulo"' + (r.cambioTitulo ? ' checked' : '') + '> Cambiar también el título: «' + esc(tituloSitio) + '» → «' + esc(tituloMB) + '»</label>' : '') +
          '<p class="ed-nota">' + (publicada ? 'La entrada está publicada. «Aplicar» deja el texto nuevo como cambios sin publicar: los lectores siguen viendo la versión actual hasta que la publiques. Portada, número, sello y modo de lectura no cambian.'
            : 'La entrada es un borrador: el texto nuevo reemplaza al anterior. Portada, número, sello y modo de lectura no cambian.') + '</p>';
        var botones = [{ texto: 'Cerrar', valor: null }];
        if (!deMB.sinOrigen) botones.push({ texto: r.conflicto ? 'Quedarme con lo del sitio' : 'Descartar el aviso', valor: 'descartar' });
        botones.push({ texto: r.conflicto ? 'Traer lo del Moodboard' : 'Aplicar', valor: 'aplicar', tipo: publicada ? '' : 'primario' });
        if (publicada) botones.push({ texto: r.conflicto ? 'Traer y publicar' : 'Aplicar y publicar', valor: 'publicar', tipo: 'primario' });
        ui().ventana({ titulo: 'Cambios en «' + (r.T || 'Sin título') + '»', cuerpo: cuerpo, botones: botones, clase: 'a-ventana--ancha' }).then(function (accion) {
          if (!accion) return;
          var conTitulo = !!(cuerpo.querySelector('.im-con-titulo') || {}).checked;
          var p = accion === 'descartar' ? descartar(r) : aplicar(r, conTitulo, accion === 'publicar');
          return p.then(function () {
            ui().aviso(accion === 'descartar' ? 'Aviso descartado: te aviso de nuevo si vuelve a cambiar' : accion === 'publicar' ? 'Cambios aplicados y publicados' : publicada ? 'Aplicado como cambios sin publicar' : 'Aplicado al borrador');
            return refrescarCaps();
          });
        }).catch(function (err) { console.error(err); ui().aviso('No se pudo: ' + err.message, 'error'); });
      }
      function origenDe(r, extra) {
        return Object.assign({ moodboard_id: r.c.id, html: r.H, titulo: r.T, actualizado: r.c.updatedAt ? new Date(r.c.updatedAt).toISOString() : null, importado_en: new Date().toISOString() }, extra || {});
      }
      function notasDeMoodboard(c) {
        return (c.notes || []).map(function (n) {
          return { id: n.id, texto: n.text || '', cita: /^\[?\d+\]?$/.test(String(n.quote || '').trim()) ? '' : String(n.quote || '').trim(),
            resuelta: !!n.resolved, respuestas: (n.replies || []).map(function (x) { return x.text; }),
            creada: new Date(n.createdAt || Date.now()).toISOString(), origen: 'moodboard' };
        }).filter(function (n) { return n.texto; });
      }
      function aplicar(r, conTitulo, publicar) {
        return RA.adm.entrada(r.e.id).then(function (e) {
          var v = A().vigente(e), pal = RA.contarPalabras(r.H);
          var nuevos = { cuerpo_html: r.H, palabras: pal, minutos: RA.minutosDe(pal) };
          if (conTitulo) nuevos.titulo = RA.separarDia(r.T).titulo;
          var p;
          if (e.estado !== 'publicado') p = RA.adm.guardarEntrada(e.id, nuevos);
          else {
            var campos = {};
            RA.adm.EDITABLES.concat('sello_id' in e ? ['sello_id'] : []).forEach(function (k) { campos[k] = v[k]; });
            Object.assign(campos, nuevos);
            p = publicar ? RA.adm.publicar(e.id, campos, true) : RA.adm.guardarTrabajo(e.id, campos);
          }
          return p.then(function () { return RA.adm.notasDe(e.id); }).then(function (previas) {
            return RA.adm.guardarNotas(e.id, previas.filter(function (n) { return n.origen !== 'moodboard'; }).concat(notasDeMoodboard(r.c)));
          }).then(function () {
            return RA.adm.guardarOrigen(e.id, origenDe(r)).catch(function (err) { if (!deMB.sinOrigen) throw err; });
          });
        });
      }
      /* Descartar: se toma la versión del Moodboard como vista; solo vuelve a avisar si cambia otra vez */
      function descartar(r) {
        var o = r.e.origen || {};
        return RA.adm.guardarOrigen(r.e.id, origenDe(r, { importado_en: o.importado_en || null, descartado_en: new Date().toISOString() }));
      }
      function refrescarCaps() {
        return Promise.all([RA.adm.entradasMoodboard(), A().recargar()]).then(function (x) {
          deMB = x[0]; deMBpor = {}; deMB.lista.forEach(function (e) { deMBpor[e.origen_moodboard] = e; });
          calcularCaps(); pintarCaps();
        });
      }

      /* ── Contador y botón Importar ── */
      function contar() {
        var nr = Object.keys(sel).filter(function (id) { return enMB[id]; }).length, nc = Object.keys(selCap).length;
        var b = caja.querySelector('.im-ir');
        b.textContent = 'Importar ' + nr + (nr === 1 ? ' referente' : ' referentes') + ' y ' + nc + (nc === 1 ? ' capítulo' : ' capítulos');
        b.disabled = !(nr + nc);
        var nR = caja.querySelector('[data-n="refs"]'), nC = caja.querySelector('[data-n="caps"]');
        nR.textContent = nr ? nr + (nr === 1 ? ' marcado' : ' marcados') : '';
        var av = Object.keys(info).filter(function (k) { return RA.mbHayAviso(info[k]); }).length;
        nC.textContent = [nc ? nc + (nc === 1 ? ' marcado' : ' marcados') : '', av ? (av === 1 ? '1 aviso' : av + ' avisos') : ''].filter(Boolean).join(' · ');
        nC.classList.toggle('im-pestanas__n--aviso', !!av);
      }
      caja.querySelector('.im-ir').onclick = function () { importar(); };

      function validarCaps() {
        var usados = numerosUsados(), enLote = {}, malos = 0;
        Object.keys(selCap).forEach(function (id) {
          var el = eleccion[id], fila = panC.querySelector('[data-fila="' + id + '"]'), msg = '';
          if (el.tipo === 'capitulo') {
            var n = parseInt(el.numero, 10);
            if (!n || n < 1) msg = 'Escribe el número del día';
            else if (usados[n]) msg = 'Ya existe el Día ' + n + ' («' + usados[n] + '»)';
            else if (enLote[n]) msg = 'Dos capítulos con el Día ' + n;
            enLote[n] = 1;
          }
          if (fila) { fila.classList.toggle('im-cap--error', !!msg); fila.querySelector('.im-cap__error').textContent = msg; }
          if (msg) malos++;
        });
        return malos;
      }

      function importar() {
        var refs = cards.filter(function (c) { return sel[c.id]; });
        var capitulos = D.chapters.filter(function (c) { return selCap[c.id] && info[c.id] && info[c.id].estado === 'nuevo'; }).sort(function (a, b) { return a.order - b.order; });
        if (capitulos.length && validarCaps()) { pestana = MB.pestana = 'caps'; mostrarPestana(); ui().aviso('Revisa los números de día marcados en rojo', 'error'); return; }
        var publicos = MB.publicos !== false, resubir = !!MB.resubir;
        var boton = caja.querySelector('.im-ir');
        boton.disabled = true; caja.classList.add('im--ocupado');
        reg.innerHTML = '';
        function log(t, clase) { var p = document.createElement('p'); if (clase) p.className = clase; p.textContent = t; reg.appendChild(p); return p; }
        var hechos = { imagenes: 0, nuevos: 0, caps: 0, fallas: [] }, paso;
        var usadosT = {}, usadasE = {};
        refs.forEach(function (c) { usadosT[c.typeId] = 1; (c.tagIds || []).forEach(function (t) { usadasE[t] = 1; }); });
        var filasT = D.types.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return usadosT[x.t.id]; })
          .map(function (x) { return { id: x.t.id, nombre: x.t.name, color: x.t.color || '#999999', kind: x.t.kind || 'note', orden: x.i }; });
        var filasE = D.tags.filter(function (t) { return usadasE[t.id]; }).map(function (t) { return { id: t.id, nombre: t.name, color: t.color || '#999999' }; });

        var cadena = Promise.resolve();
        if (refs.length) cadena = cadena.then(function () {
          paso = log('Tipos y etiquetas…');
          return RA.adm.guardarTipos(filasT).then(function () { return RA.adm.guardarEtiquetas(filasE); }).then(function () {
            paso.textContent = '✓ ' + filasT.length + ' tipos y ' + filasE.length + ' etiquetas';
            paso = log('Imágenes…');
            return RA.adm.listarCarpeta('referentes').catch(function () { return []; });
          }).then(function (enSitio) {
            var hay = {}; enSitio.forEach(function (n) { hay[n] = 1; });
            var pendientes = refs.filter(function (c) { return c.image && c.image.file && MB.imagenes[c.image.file] && (resubir || !hay[c.image.file]); });
            var sub = Promise.resolve(), k = 0;
            pendientes.forEach(function (c) {
              sub = sub.then(function () {
                return RA.adm.subirArchivo('referentes/' + c.image.file, MB.imagenes[c.image.file], true).then(function () { hechos.imagenes++; hay[c.image.file] = 1; })
                  .catch(function (e) { hechos.fallas.push('Imagen ' + c.image.file + ': ' + e.message); })
                  .then(function () { k++; paso.textContent = 'Imágenes… ' + k + ' de ' + pendientes.length; });
              });
            });
            return sub.then(function () {
              paso.textContent = '✓ ' + hechos.imagenes + (hechos.imagenes === 1 ? ' imagen subida' : ' imágenes subidas') + (pendientes.length ? '' : ' (ya estaban en el sitio)');
              var filas = refs.map(function (c) {
                var img = null;
                if (c.image && c.image.file && (MB.imagenes[c.image.file] || hay[c.image.file])) img = 'referentes/' + c.image.file;
                else if (c.image && c.image.url) img = c.image.url;
                else if (c.image && c.image.file && refSitio[c.id]) img = refSitio[c.id].imagen || null;   // sin la imagen a mano, se conserva la del sitio
                var f = { id: c.id, tipo_id: tipos[c.typeId] ? c.typeId : null, titulo: c.title || '', cuerpo: c.body || '', url: c.url || '',
                  autor: c.author || '', fuente: c.source || '', anio: String(c.year || ''), imagen: img,
                  imagen_w: (c.image && c.image.w) || null, imagen_h: (c.image && c.image.h) || null,
                  creado_en: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
                  actualizado_en: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString() };
                // «note» (nota personal) nunca se copia
                if (!refSitio[c.id]) { f.publico = publicos; hechos.nuevos++; }
                return f;
              });
              paso = log('Referentes…');
              var nuevos = filas.filter(function (f) { return 'publico' in f; }), viejos = filas.filter(function (f) { return !('publico' in f); });
              return RA.adm.guardarFilasReferentes(nuevos).then(function () { return RA.adm.guardarFilasReferentes(viejos); }).then(function () {
                var pares = [];
                refs.forEach(function (c) { (c.tagIds || []).forEach(function (t) { if (etiquetas[t]) pares.push({ referente_id: c.id, etiqueta_id: t }); }); });
                return RA.adm.reemplazarEtiquetasDe(refs.map(function (c) { return c.id; }), pares);
              }).then(function () {
                paso.textContent = '✓ ' + filas.length + (filas.length === 1 ? ' referente' : ' referentes') + ' (' + hechos.nuevos + (hechos.nuevos === 1 ? ' nuevo' : ' nuevos') + ', ' + (filas.length - hechos.nuevos) + ' actualizados)';
              });
            });
          });
        });
        var creados = [];
        if (capitulos.length) cadena = cadena.then(function () {
          paso = log('Capítulos…');
          var sub = Promise.resolve();
          capitulos.forEach(function (c) {
            sub = sub.then(function () {
              var r = info[c.id], el = eleccion[c.id], sd = RA.separarDia(c.title);
              var campos = { tipo: el.tipo, titulo: sd.titulo, cuerpo_html: r.H, palabras: r.palabras, minutos: RA.minutosDe(r.palabras),
                origen_moodboard: c.id, notas: notasDeMoodboard(c), origen: deMB.sinOrigen ? null : origenDe(r) };
              if (el.tipo === 'capitulo') campos.numero = parseInt(el.numero, 10);
              if (el.tipo === 'apunte' && el.sello) campos.sello_id = el.sello;
              return RA.adm.crear(campos, A().entradas).then(function (id) {
                hechos.caps++; creados.push({ id: id, tipo: el.tipo, numero: campos.numero });
                delete selCap[c.id];
                return A().recargar();
              });
            }).catch(function (e) { hechos.fallas.push('Capítulo «' + c.title + '»: ' + e.message); });
          });
          return sub.then(function () {
            return ordenarCreados(creados).catch(function (e) { hechos.fallas.push('Orden del carrusel: ' + e.message); });
          }).then(function () {
            var nc = creados.filter(function (x) { return x.tipo === 'capitulo'; }).length, na = creados.length - nc;
            paso.textContent = '✓ ' + [nc ? nc + (nc === 1 ? ' cuaderno' : ' cuadernos') : '', na ? na + (na === 1 ? ' apunte' : ' apuntes') : ''].filter(Boolean).join(' y ') + ' como borradores';
          });
        });
        cadena.then(function () {
          hechos.fallas.forEach(function (f) { log('✗ ' + f, 'im-falla'); });
          var fin = log(hechos.fallas.length ? 'Terminó con ' + hechos.fallas.length + ' problema(s).' : 'Listo. Si algo cambia en el Moodboard, aquí te aviso.', 'im-fin');
          fin.insertAdjacentHTML('beforeend', ' <a href="#/referentes">Ver referentes</a> · <a href="#/">Ver entradas</a>');
          ui().aviso('Importación terminada');
          refs.forEach(function (c) { delete sel[c.id]; });
          return Promise.all([RA.adm.referentes(), RA.adm.entradasMoodboard(), A().recargar()]).then(function (x) {
            sitio = x[0]; refSitio = {}; etqSitio = {};
            sitio.referentes.forEach(function (y) { refSitio[y.id] = y; });
            sitio.pares.forEach(function (p) { (etqSitio[p.referente_id] = etqSitio[p.referente_id] || []).push(p.etiqueta_id); });
            cards.forEach(function (c) { est[c.id] = estadoCard(c); });
            deMB = x[1]; deMBpor = {}; deMB.lista.forEach(function (e) { deMBpor[e.origen_moodboard] = e; });
            calcularCaps(); pintarRefs(); pintarCaps();
          });
        }).catch(function (e) {
          console.error(e); log('✗ ' + e.message, 'im-falla'); ui().aviso('La importación se detuvo: ' + e.message, 'error');
        }).then(function () { caja.classList.remove('im--ocupado'); contar(); });
      }

      /* Cada cuaderno nuevo va detrás del cuaderno con el número anterior; los apuntes, al final */
      function ordenarCreados(creados) {
        if (!creados.length) return Promise.resolve();
        var nuevos = creados.filter(function (x) { return x.tipo === 'capitulo'; }).sort(function (a, b) { return a.numero - b.numero; });
        var l = A().entradas.slice();
        creados.filter(function (x) { return x.tipo === 'apunte'; }).forEach(function (ap) {
          var i = l.findIndex(function (x) { return x.id === ap.id; }); if (i >= 0) l.push(l.splice(i, 1)[0]);
        });
        nuevos.forEach(function (nv) {
          var i = l.findIndex(function (x) { return x.id === nv.id; }); if (i < 0) return;
          var item = l.splice(i, 1)[0], pos = -1;
          l.forEach(function (x, k) { var v = A().vigente(x); if (v.tipo === 'capitulo' && v.numero && v.numero < nv.numero) pos = k; });
          if (pos < 0) { var sig = l.findIndex(function (x) { var v = A().vigente(x); return v.tipo === 'capitulo' && v.numero > nv.numero; }); pos = sig < 0 ? l.length - 1 : sig - 1; }
          l.splice(pos + 1, 0, item);
        });
        return RA.adm.reordenar(l.map(function (x) { return x.id; })).then(function () { return A().recargar(); });
      }

      mostrarPestana(); pintarRefs(); pintarCaps();
    }
  };

  /* ══ Página «Referentes» del administrador ═════════════════════════ */
  RA.paginas.referentes = function () {
    document.title = 'Referentes · Administración';
    var P = A().principal;
    P.innerHTML = '<div class="a-pagina"><header class="a-cabecera"><h1>Referentes</h1><div class="a-acciones">' +
      '<a class="a-boton" href="#/importar">Importar desde el Moodboard</a><a class="a-boton" href="../index.html#/referentes" target="_blank" rel="noopener">Ver en el sitio ↗</a></div>' +
      '<p class="a-cabecera__nota">Los referentes públicos aparecen en la página «Referentes» del sitio y en los capítulos que los citan. Los privados solo los ves tú.</p></header>' +
      '<div class="rf-filtros"></div><div class="rf-lista"><p class="a-cargando">Cargando…</p></div></div>';
    var estado = { q: '', tipo: '', ver: 'todos' };
    RA.adm.referentes().then(function (d) {
      var tipos = {}; d.tipos.forEach(function (t) { tipos[t.id] = t; });
      var etq = {}; d.etiquetas.forEach(function (t) { etq[t.id] = t; });
      var porRef = {}; d.pares.forEach(function (p) { (porRef[p.referente_id] = porRef[p.referente_id] || []).push(etq[p.etiqueta_id]); });
      var citas = {}; d.citas.forEach(function (c) { citas[c.referente_id] = (citas[c.referente_id] || 0) + 1; });
      var filtros = P.querySelector('.rf-filtros');
      if (!d.referentes.length) {
        P.querySelector('.rf-lista').innerHTML = '<p class="a-vacio">Todavía no hay referentes. <a href="#/importar">Impórtalos desde el Moodboard</a>.</p>';
        return;
      }
      filtros.innerHTML = '<input type="search" placeholder="Buscar…" aria-label="Buscar referentes">' +
        '<select aria-label="Tipo"><option value="">Todos los tipos</option>' + d.tipos.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nombre) + '</option>'; }).join('') + '</select>' +
        '<select aria-label="Visibilidad" data-ver><option value="todos">Públicos y privados</option><option value="publicos">Solo públicos</option><option value="privados">Solo privados</option></select>' +
        '<span class="rf-cuenta"></span>' +
        '<button type="button" class="a-boton a-boton--fino" data-todos="1">Hacer públicos los visibles</button><button type="button" class="a-boton a-boton--fino" data-todos="0">Hacer privados los visibles</button>';
      var t = null;
      filtros.querySelector('input').oninput = function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { estado.q = v.toLowerCase(); pintar(); }, 150); };
      filtros.querySelector('select').onchange = function () { estado.tipo = this.value; pintar(); };
      filtros.querySelector('[data-ver]').onchange = function () { estado.ver = this.value; pintar(); };
      filtros.querySelectorAll('[data-todos]').forEach(function (b) {
        b.onclick = function () {
          var v = b.getAttribute('data-todos') === '1', ids = visibles().map(function (r) { return r.id; });
          if (!ids.length) return;
          ui().confirmar(v ? 'Hacer públicos' : 'Hacer privados', ids.length + ' referentes pasarán a ser ' + (v ? 'públicos.' : 'privados.'), 'Aceptar').then(function (si) {
            if (!si) return;
            RA.adm.cambiarPublico(ids, v).then(function () { d.referentes.forEach(function (r) { if (ids.indexOf(r.id) >= 0) r.publico = v; }); pintar(); ui().aviso('Listo'); })
              .catch(function (e) { ui().aviso('No se pudo: ' + e.message, 'error'); });
          });
        };
      });
      function visibles() {
        return d.referentes.filter(function (r) {
          if (estado.tipo && r.tipo_id !== estado.tipo) return false;
          if (estado.ver === 'publicos' && !r.publico) return false;
          if (estado.ver === 'privados' && r.publico) return false;
          if (estado.q && (r.titulo + ' ' + r.autor + ' ' + r.fuente + ' ' + (porRef[r.id] || []).map(function (e) { return e ? e.nombre : ''; }).join(' ')).toLowerCase().indexOf(estado.q) < 0) return false;
          return true;
        });
      }
      function pintar() {
        var l = visibles(), pub = d.referentes.filter(function (r) { return r.publico; }).length;
        filtros.querySelector('.rf-cuenta').textContent = l.length + ' de ' + d.referentes.length + ' · ' + pub + ' públicos';
        P.querySelector('.rf-lista').innerHTML = l.map(function (r) {
          var tp = tipos[r.tipo_id] || {}, img = RA.urlImagen(r.imagen);
          return '<div class="rf-fila' + (r.publico ? '' : ' rf-fila--privado') + '">' +
            '<span class="rf-img"' + (img ? ' style="background-image:url(\'' + esc(img) + '\')"' : '') + '></span>' +
            '<span class="a-fila__textos"><span class="antetitulo"><i class="ed-ref__color" style="background:' + esc(tp.color || '#ccc') + '"></i> ' + esc(tp.nombre || '') +
              (citas[r.id] ? ' · citado en ' + citas[r.id] : '') + '</span>' +
            '<span class="rf-titulo">' + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.titulo || 'Sin título') + '</a>' : esc(r.titulo || 'Sin título')) + '</span>' +
            '<span class="a-fila__dato">' + esc([r.autor, r.fuente, r.anio].filter(Boolean).join(' · ')) + '</span></span>' +
            '<label class="rf-publico"><button type="button" class="interruptor" role="switch" aria-checked="' + !!r.publico + '" data-pub="' + esc(r.id) + '" aria-label="Público"></button>' + (r.publico ? 'Público' : 'Privado') + '</label>' +
            '<button type="button" class="a-mini" data-borrar="' + esc(r.id) + '" aria-label="Quitar del sitio">×</button></div>';
        }).join('') || '<p class="a-vacio">Nada coincide con la búsqueda.</p>';
      }
      P.querySelector('.rf-lista').addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        var id = b.getAttribute('data-pub') || b.getAttribute('data-borrar');
        var r = d.referentes.filter(function (x) { return x.id === id; })[0]; if (!r) return;
        if (b.hasAttribute('data-pub')) {
          var v = !r.publico;
          RA.adm.cambiarPublico([id], v).then(function () { r.publico = v; pintar(); }).catch(function (e) { ui().aviso('No se pudo: ' + e.message, 'error'); });
        } else {
          ui().confirmar('Quitar referente', '«' + esc(r.titulo) + '» se quitará del sitio (no del Moodboard). Si lo vuelves a importar, regresará.', 'Quitar', true).then(function (si) {
            if (!si) return;
            RA.adm.eliminarReferente(id).then(function () { d.referentes = d.referentes.filter(function (x) { return x.id !== id; }); pintar(); })
              .catch(function (e) { ui().aviso('No se pudo: ' + e.message, 'error'); });
          });
        }
      });
      pintar();
    }).catch(function (e) { ui().aviso('No se pudieron cargar los referentes: ' + e.message, 'error'); });
  };

  /* ══ Exportar entradas ════════════════════════════════════════════ */
  RA.exportarEntradas = function (formato) {
    return RA.adm.exportar().then(function (d) {
      var fecha = new Date().toISOString().slice(0, 10), nombre, blob;
      if (formato === 'json') {
        nombre = 'resistencias-del-aura-entradas-' + fecha + '.json';
        blob = new Blob([JSON.stringify({ exportado: new Date().toISOString(), version: 1, proyecto: d.proyecto, entradas: d.entradas, relacionadas: d.relacionadas, referentes: d.referentes }, null, 1)], { type: 'application/json' });
      } else {
        nombre = 'resistencias-del-aura-' + fecha + '.html';
        var h = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(d.proyecto ? d.proyecto.titulo : 'Entradas') + '</title>' +
          '<style>body{font:18px/1.6 Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1D1D3A}h1{font-family:sans-serif}h2{font-family:sans-serif;margin-top:3em;border-top:2px solid;padding-top:.6em}.meta{font:13px sans-serif;opacity:.7}blockquote{border-left:3px solid #FF48B0;margin-left:0;padding-left:1em}blockquote.destacada{font-size:1.3em}img{max-width:100%}figcaption{font-style:italic;font-size:.9em}</style></head><body>' +
          '<h1>' + esc(d.proyecto ? d.proyecto.titulo : '') + '</h1><p class="meta">Exportado el ' + fecha + ' · ' + d.entradas.length + ' entradas</p>' +
          d.entradas.map(function (e) {
            var v = e.trabajo ? Object.assign({}, e, e.trabajo) : e;
            return '<h2>' + esc(RA.antetitulo(v)) + ': ' + esc(v.titulo) + '</h2><p class="meta">' + (e.estado === 'publicado' ? 'Publicada' : 'Borrador') + (e.trabajo ? ' (con cambios sin publicar)' : '') + ' · ' + (v.palabras || 0) + ' palabras</p>' +
              (v.entradilla ? '<p><em>' + esc(v.entradilla) + '</em></p>' : '') + (v.cuerpo_html || '');
          }).join('') + '</body></html>';
        blob = new Blob([h], { type: 'text/html' });
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nombre;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return nombre;
    });
  };
})();
