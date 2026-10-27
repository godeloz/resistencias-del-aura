/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · importar desde el Moodboard y administrar referentes
   · Solo LEE moodboard.json y las imágenes que el autor elige en su navegador.
     El Moodboard no cambia.
   · Conserva los id de las cards: se puede reimportar sin duplicar.
   · Nunca importa la nota personal de las cards («note») ni los pasajes.
   · Los capítulos llegan como borradores, sin resaltados ni marcas de
     comentario; los comentarios pasan a notas privadas.
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

  /* ══ Página «Importar» ═════════════════════════════════════════════ */
  RA.paginas.importar = function () {
    document.title = 'Importar · Administración';
    var P = A().principal;
    P.innerHTML = '<div class="a-pagina"><header class="a-cabecera"><h1>Importar desde el Moodboard</h1>' +
      '<p class="a-cabecera__nota">Trae las cards de un proyecto como referentes (con sus tipos, etiquetas e imágenes) y sus capítulos como borradores. ' +
      'Solo se leen los archivos: el Moodboard no cambia. La nota personal de las cards y los pasajes nunca se importan.</p></header>' +
      '<div class="im-elegir">' +
        '<button type="button" class="a-boton a-boton--primario" data-elegir="carpeta">Elegir la carpeta «datos» del Moodboard</button>' +
        '<button type="button" class="a-boton" data-elegir="archivos">o elegir moodboard.json y las imágenes sueltas</button>' +
        '<p class="ed-nota">La carpeta está en «Moodboard de investigacion/datos». Ahí están moodboard.json y la carpeta «imagenes».</p>' +
      '</div><div class="im-vista"></div></div>';
    P.querySelectorAll('[data-elegir]').forEach(function (b) {
      b.onclick = function () {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.hidden = true; inp.multiple = true;
        if (b.getAttribute('data-elegir') === 'carpeta') { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
        else inp.accept = '.json,image/*';
        document.body.appendChild(inp);
        inp.onchange = function () { var fs = [].slice.call(inp.files || []); inp.remove(); if (fs.length) leer(fs); };
        inp.click();
      };
    });

    function leer(archivos) {
      var json = archivos.filter(function (f) {
        var ruta = f.webkitRelativePath || f.name;
        return /(^|\/)moodboard\.json$/i.test(ruta) && !/respaldos\//i.test(ruta);
      }).sort(function (a, b) { return (a.webkitRelativePath || a.name).length - (b.webkitRelativePath || b.name).length; })[0];
      if (!json) { ui().aviso('No encontré moodboard.json entre los archivos elegidos', 'error'); return; }
      var imagenes = {};
      archivos.forEach(function (f) {
        var ruta = f.webkitRelativePath || f.name;
        if (/respaldos\//i.test(ruta)) return;
        if (/\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)) imagenes[f.name] = f;
      });
      json.text().then(function (t) {
        var datos = JSON.parse(t);
        if (!datos || !Array.isArray(datos.cards) || !Array.isArray(datos.projects)) throw new Error('El archivo no parece un moodboard.json');
        return Promise.all([RA.adm.idsReferentes(), RA.adm.entradasPorOrigen(), A().recargar()]).then(function (r) {
          vista(datos, imagenes, r[0], r[1]);
        });
      }).catch(function (e) { console.error(e); ui().aviso('No se pudo leer moodboard.json: ' + e.message, 'error'); });
    }

    function vista(D, imagenes, existentes, porOrigen) {
      var caja = P.querySelector('.im-vista');
      var proyectos = D.projects.filter(function (p) { return !p.sample; });
      var pid = (proyectos.filter(function (p) { return /aura/i.test(p.name); })[0] || proyectos[0] || {}).id;
      var yaRef = {}; existentes.forEach(function (id) { yaRef[id] = true; });
      var yaCap = {}; porOrigen.forEach(function (e) { yaCap[e.origen_moodboard] = e; });
      var tipos = {}; D.types.forEach(function (t) { tipos[t.id] = t; });
      var etiquetas = {}; D.tags.forEach(function (t) { etiquetas[t.id] = t; });
      var miniaturas = [];

      function pintar() {
        miniaturas.forEach(function (u) { URL.revokeObjectURL(u); }); miniaturas = [];
        var cards = D.cards.filter(function (c) { return !c.sample && (c.projectIds || []).indexOf(pid) >= 0; });
        var caps = (D.chapters || []).filter(function (c) { return !c.sample && c.projectId === pid; }).sort(function (a, b) { return a.order - b.order; });
        var conImagen = cards.filter(function (c) { return c.image && c.image.file; });
        var encontradas = conImagen.filter(function (c) { return imagenes[c.image.file]; }).length;
        var usadosT = {}, usadasE = {};
        cards.forEach(function (c) { usadosT[c.typeId] = 1; (c.tagIds || []).forEach(function (t) { usadasE[t] = 1; }); });
        caja.innerHTML =
          '<section class="im-bloque"><label class="a-campo">Proyecto del Moodboard<select class="im-proyecto">' + proyectos.map(function (p) {
            return '<option value="' + esc(p.id) + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '</select></label>' +
          '<p class="im-resumen"><b>' + cards.length + '</b> cards · <b>' + Object.keys(usadosT).length + '</b> tipos · <b>' + Object.keys(usadasE).length + '</b> etiquetas · <b>' + caps.length + '</b> capítulos' +
          ' · imágenes: <b>' + encontradas + '</b> de ' + conImagen.length + ' encontradas' +
          (encontradas < conImagen.length ? ' <span class="im-aviso">(para traerlas todas, elige la carpeta «datos» completa)</span>' : '') + '</p></section>' +
          '<section class="im-bloque"><div class="im-titulo"><h2>Referentes <span class="ed-cuenta">' + cards.length + '</span></h2>' +
            '<span class="im-marcar"><button type="button" class="a-boton a-boton--fino" data-todos="ref:1">Todos</button><button type="button" class="a-boton a-boton--fino" data-todos="ref:0">Ninguno</button></span></div>' +
            '<label class="im-opcion"><input type="checkbox" class="im-publicos" checked> Los referentes nuevos quedan públicos (luego puedes ocultar cualquiera en «Referentes»)</label>' +
            '<label class="im-opcion"><input type="checkbox" class="im-resubir"> Volver a subir imágenes que ya estén en el sitio</label>' +
            '<div class="im-rejilla">' + cards.map(function (c) {
              var t = tipos[c.typeId] || {}, f = c.image && c.image.file && imagenes[c.image.file], u = f ? URL.createObjectURL(f) : (c.image && c.image.url) || '';
              if (f) miniaturas.push(u);
              return '<label class="im-card"><input type="checkbox" data-ref="' + esc(c.id) + '" checked>' +
                '<span class="im-card__img"' + (u ? ' style="background-image:url(\'' + esc(u) + '\')"' : '') + '></span>' +
                '<span class="im-card__tipo"><i style="background:' + esc(t.color || '#ccc') + '"></i>' + esc(t.name || c.typeId) + (yaRef[c.id] ? ' · <b>se actualiza</b>' : '') + '</span>' +
                '<span class="im-card__titulo">' + esc(c.title || 'Sin título') + '</span>' +
                '<span class="im-card__etq">' + (c.tagIds || []).map(function (id) { return etiquetas[id] ? esc(etiquetas[id].name) : ''; }).filter(Boolean).join(' · ') + '</span></label>';
            }).join('') + '</div></section>' +
          '<section class="im-bloque"><div class="im-titulo"><h2>Capítulos <span class="ed-cuenta">' + caps.length + '</span></h2>' +
            '<span class="im-marcar"><button type="button" class="a-boton a-boton--fino" data-todos="cap:1">Todos</button><button type="button" class="a-boton a-boton--fino" data-todos="cap:0">Ninguno</button></span></div>' +
            '<p class="ed-nota">Llegan como borradores. Se quitan los resaltados y las marcas de comentario; los comentarios pasan a tus notas privadas. Un capítulo que ya publicaste no se toca.</p>' +
            '<div class="im-caps">' + caps.map(function (c) {
              var limpio = RA.limpiarCapituloMoodboard(c.html), pal = RA.contarPalabras(limpio), ya = yaCap[c.id];
              var publicado = ya && ya.estado === 'publicado';
              var estado = !ya ? 'nuevo' : publicado ? 'ya publicado · no se toca' : 'ya importado · se actualiza el borrador';
              var marcado = !publicado && pal > 0;
              return '<label class="im-cap' + (publicado ? ' im-cap--fijo' : '') + '"><input type="checkbox" data-cap="' + esc(c.id) + '"' + (marcado ? ' checked' : '') + (publicado ? ' disabled' : '') + '>' +
                '<span class="im-cap__titulo">' + esc(c.title || 'Sin título') + '</span>' +
                '<span class="a-fila__dato">' + RA.ui.numero(pal) + ' palabras' + ((c.notes || []).length ? ' · ' + c.notes.length + ' comentarios' : '') + (pal ? '' : ' · vacío') + '</span>' +
                '<span class="a-chip a-chip--' + (ya ? (publicado ? 'publicado' : 'cambios') : 'borrador') + '">' + estado + '</span></label>';
            }).join('') + '</div></section>' +
          '<div class="im-pie"><button type="button" class="a-boton a-boton--primario im-ir">Importar</button><div class="im-registro" aria-live="polite"></div></div>';
        caja.querySelector('.im-proyecto').onchange = function () { pid = this.value; pintar(); };
        caja.querySelectorAll('[data-todos]').forEach(function (b) {
          b.onclick = function () {
            var v = b.getAttribute('data-todos').split(':');
            caja.querySelectorAll(v[0] === 'ref' ? '[data-ref]' : '[data-cap]:not(:disabled)').forEach(function (x) { x.checked = v[1] === '1'; });
            contar();
          };
        });
        caja.addEventListener('change', contar);
        contar();
        caja.querySelector('.im-ir').onclick = function () { importar(cards, caps); };
      }
      function contar() {
        var nr = caja.querySelectorAll('[data-ref]:checked').length, nc = caja.querySelectorAll('[data-cap]:checked').length;
        var b = caja.querySelector('.im-ir');
        if (b) { b.textContent = 'Importar ' + nr + (nr === 1 ? ' referente' : ' referentes') + ' y ' + nc + (nc === 1 ? ' capítulo' : ' capítulos'); b.disabled = !(nr + nc); }
      }

      function importar(cards, caps) {
        var selRef = {}, selCap = {};
        caja.querySelectorAll('[data-ref]:checked').forEach(function (x) { selRef[x.getAttribute('data-ref')] = 1; });
        caja.querySelectorAll('[data-cap]:checked').forEach(function (x) { selCap[x.getAttribute('data-cap')] = 1; });
        var refs = cards.filter(function (c) { return selRef[c.id]; });
        var capitulos = caps.filter(function (c) { return selCap[c.id]; });
        var publicos = caja.querySelector('.im-publicos').checked, resubir = caja.querySelector('.im-resubir').checked;
        var boton = caja.querySelector('.im-ir'), reg = caja.querySelector('.im-registro');
        boton.disabled = true;
        caja.querySelectorAll('input, select, [data-todos]').forEach(function (x) { x.disabled = true; });
        function log(t, clase) { var p = document.createElement('p'); if (clase) p.className = clase; p.textContent = t; reg.appendChild(p); return p; }
        var hechos = { tipos: 0, etiquetas: 0, imagenes: 0, refs: 0, nuevos: 0, caps: 0, capsNuevos: 0, fallas: [] };

        var usadosT = {}, usadasE = {};
        refs.forEach(function (c) { usadosT[c.typeId] = 1; (c.tagIds || []).forEach(function (t) { usadasE[t] = 1; }); });
        var filasT = D.types.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return usadosT[x.t.id]; })
          .map(function (x) { return { id: x.t.id, nombre: x.t.name, color: x.t.color || '#999999', kind: x.t.kind || 'note', orden: x.i }; });
        var filasE = D.tags.filter(function (t) { return usadasE[t.id]; }).map(function (t) { return { id: t.id, nombre: t.name, color: t.color || '#999999' }; });

        var paso = log('Tipos y etiquetas…');
        RA.adm.guardarTipos(filasT).then(function () { return RA.adm.guardarEtiquetas(filasE); }).then(function () {
          hechos.tipos = filasT.length; hechos.etiquetas = filasE.length;
          paso.textContent = '✓ ' + filasT.length + ' tipos y ' + filasE.length + ' etiquetas';
          paso = log('Imágenes…');
          return RA.adm.listarCarpeta('referentes').catch(function () { return []; });
        }).then(function (enSitio) {
          var hay = {}; enSitio.forEach(function (n) { hay[n] = 1; });
          var pendientes = refs.filter(function (c) { return c.image && c.image.file && imagenes[c.image.file] && (resubir || !hay[c.image.file]); });
          var cadena = Promise.resolve(), k = 0;
          pendientes.forEach(function (c) {
            cadena = cadena.then(function () {
              return RA.adm.subirArchivo('referentes/' + c.image.file, imagenes[c.image.file], true).then(function () { hechos.imagenes++; })
                .catch(function (e) { hechos.fallas.push('Imagen ' + c.image.file + ': ' + e.message); })
                .then(function () { k++; paso.textContent = 'Imágenes… ' + k + ' de ' + pendientes.length; });
            });
          });
          return cadena.then(function () {
            paso.textContent = '✓ ' + hechos.imagenes + (hechos.imagenes === 1 ? ' imagen subida' : ' imágenes subidas') + (pendientes.length ? '' : ' (ya estaban en el sitio)');
            var filas = refs.map(function (c) {
              var img = null;
              if (c.image && c.image.file && (imagenes[c.image.file] || hay[c.image.file])) img = 'referentes/' + c.image.file;
              else if (c.image && c.image.url) img = c.image.url;
              var f = { id: c.id, tipo_id: tipos[c.typeId] ? c.typeId : null, titulo: c.title || '', cuerpo: c.body || '', url: c.url || '',
                autor: c.author || '', fuente: c.source || '', anio: String(c.year || ''), imagen: img,
                imagen_w: (c.image && c.image.w) || null, imagen_h: (c.image && c.image.h) || null,
                creado_en: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
                actualizado_en: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString() };
              // «note» (nota personal) nunca se copia
              if (!yaRef[c.id]) { f.publico = publicos; hechos.nuevos++; }
              return f;
            });
            paso = log('Referentes…');
            var nuevos = filas.filter(function (f) { return 'publico' in f; }), viejos = filas.filter(function (f) { return !('publico' in f); });
            return RA.adm.guardarFilasReferentes(nuevos).then(function () { return RA.adm.guardarFilasReferentes(viejos); }).then(function () {
              var pares = [];
              refs.forEach(function (c) { (c.tagIds || []).forEach(function (t) { if (etiquetas[t]) pares.push({ referente_id: c.id, etiqueta_id: t }); }); });
              return RA.adm.reemplazarEtiquetasDe(refs.map(function (c) { return c.id; }), pares);
            }).then(function () {
              hechos.refs = filas.length;
              refs.forEach(function (c) { yaRef[c.id] = true; });
              paso.textContent = '✓ ' + filas.length + ' referentes (' + hechos.nuevos + ' nuevos)';
            });
          });
        }).then(function () {
          if (!capitulos.length) return;
          paso = log('Capítulos…');
          var cadena = Promise.resolve();
          capitulos.forEach(function (c) {
            cadena = cadena.then(function () {
              var cuerpo = RA.limpiarCapituloMoodboard(c.html), pal = RA.contarPalabras(cuerpo), sd = RA.separarDia(c.title);
              var notas = (c.notes || []).map(function (n) {
                return { id: n.id, texto: n.text || '', cita: /^\[?\d+\]?$/.test(String(n.quote || '').trim()) ? '' : String(n.quote || '').trim(),
                  resuelta: !!n.resolved, respuestas: (n.replies || []).map(function (x) { return x.text; }),
                  creada: new Date(n.createdAt || Date.now()).toISOString(), origen: 'moodboard' };
              }).filter(function (n) { return n.texto; });
              var campos = { tipo: 'capitulo', numero: sd.numero, titulo: sd.titulo, cuerpo_html: cuerpo, palabras: pal, minutos: RA.minutosDe(pal) };
              var ya = yaCap[c.id];
              if (ya && ya.estado === 'publicado') return null;
              if (ya) {
                return RA.adm.guardarEntrada(ya.id, campos).then(function () { return RA.adm.notasDe(ya.id); }).then(function (previas) {
                  var propias = previas.filter(function (n) { return n.origen !== 'moodboard'; });
                  return RA.adm.guardarNotas(ya.id, propias.concat(notas));
                }).then(function () { hechos.caps++; });
              }
              if (!campos.numero) delete campos.numero;
              return RA.adm.crear(Object.assign(campos, { origen_moodboard: c.id, notas: notas }), A().entradas).then(function (id) {
                hechos.caps++; hechos.capsNuevos++;
                yaCap[c.id] = { id: id, estado: 'borrador', origen_moodboard: c.id };
                return A().recargar();
              });
            }).catch(function (e) { hechos.fallas.push('Capítulo «' + c.title + '»: ' + e.message); });
          });
          return cadena.then(function () { paso.textContent = '✓ ' + hechos.caps + ' capítulos (' + hechos.capsNuevos + ' nuevos, como borradores)'; });
        }).then(function () {
          hechos.fallas.forEach(function (f) { log('✗ ' + f, 'im-falla'); });
          var fin = log(hechos.fallas.length ? 'Terminó con ' + hechos.fallas.length + ' problema(s).' : 'Listo. Puedes volver a importar cuando quieras: lo que ya existe se actualiza.', 'im-fin');
          fin.insertAdjacentHTML('beforeend', ' <a href="#/referentes">Ver referentes</a> · <a href="#/">Ver entradas</a>');
          ui().aviso('Importación terminada');
        }).catch(function (e) {
          console.error(e); log('✗ ' + e.message, 'im-falla'); ui().aviso('La importación se detuvo: ' + e.message, 'error');
        });
      }
      pintar();
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
