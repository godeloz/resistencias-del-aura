/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · administración
   Rutas:  #/              entradas
           #/entrada/<id>  editor
           #/orden         orden de cuadernos
           #/referentes    (fase 4)   #/importar (fase 4)   #/apariencia (fase 5)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RA = window.RA, esc = RA.esc;
  var A = RA.admin = { tema: null, apariencia: null, proyecto: null, entradas: [], limpiar: null };

  /* ── Utilidades de interfaz ───────────────────────────────────────── */
  var ui = RA.ui = {};
  ui.aviso = function (texto, tipo) {
    var a = document.createElement('div');
    a.className = 'a-aviso' + (tipo ? ' a-aviso--' + tipo : '');
    a.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    a.textContent = texto;
    document.body.appendChild(a);
    setTimeout(function () { a.classList.add('saliendo'); }, tipo === 'error' ? 5200 : 2600);
    setTimeout(function () { a.remove(); }, tipo === 'error' ? 5600 : 3000);
  };
  /* Ventana propia (no usa alert/confirm del navegador).
     opciones: {titulo, texto | cuerpo (nodo), botones: [{texto, valor, tipo:'primario'|'peligro'|''}], clase} → Promise(valor) */
  ui.ventana = function (o) {
    return new Promise(function (resolver) {
      var antes = document.activeElement;
      var velo = document.createElement('div'); velo.className = 'a-velo';
      var v = document.createElement('div'); v.className = 'a-ventana' + (o.clase ? ' ' + o.clase : ''); v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
      v.innerHTML = '<h2 class="a-ventana__titulo">' + esc(o.titulo || '') + '</h2>' + (o.texto ? '<p class="a-ventana__texto">' + o.texto + '</p>' : '') +
        '<div class="a-ventana__cuerpo"></div><div class="a-ventana__botones"></div>';
      if (o.cuerpo) v.querySelector('.a-ventana__cuerpo').appendChild(o.cuerpo);
      var bs = v.querySelector('.a-ventana__botones');
      (o.botones || [{ texto: 'Aceptar', valor: true, tipo: 'primario' }]).forEach(function (b) {
        var el = document.createElement('button'); el.type = 'button';
        el.className = 'a-boton' + (b.tipo ? ' a-boton--' + b.tipo : '');
        el.textContent = b.texto;
        el.onclick = function () { cerrar(typeof b.valor === 'function' ? b.valor() : b.valor); };
        bs.appendChild(el);
      });
      function cerrar(val) {
        if (val === undefined && o.validar) return;
        document.removeEventListener('keydown', tecla);
        velo.remove(); v.remove();
        if (antes && antes.focus) antes.focus();
        resolver(val);
      }
      function tecla(ev) { if (ev.key === 'Escape') cerrar(null); }
      velo.onclick = function () { cerrar(null); };
      document.addEventListener('keydown', tecla);
      document.body.appendChild(velo); document.body.appendChild(v);
      var foco = v.querySelector('input, textarea, select') || v.querySelector('.a-boton--primario') || v.querySelector('button');
      if (foco) foco.focus();
    });
  };
  ui.confirmar = function (titulo, texto, si, peligro) {
    return ui.ventana({ titulo: titulo, texto: texto, botones: [
      { texto: 'Cancelar', valor: false }, { texto: si || 'Aceptar', valor: true, tipo: peligro ? 'peligro' : 'primario' }] });
  };
  ui.fecha = function (iso) {
    if (!iso) return '';
    var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'hace un momento';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  };
  ui.numero = function (n) { return (n || 0).toLocaleString('es-CO'); };

  /* Estado legible de una entrada */
  A.estado = function (e) {
    if (e.estado === 'publicado' && e.trabajo) return { clase: 'cambios', texto: 'Cambios sin publicar' };
    if (e.estado === 'publicado') return { clase: 'publicado', texto: 'Publicada' };
    return { clase: 'borrador', texto: 'Borrador' };
  };
  /* Valores vigentes en el editor: la copia de trabajo si existe */
  A.vigente = function (e) { return e.trabajo ? Object.assign({}, e, e.trabajo) : e; };

  /* ── Arranque y sesión ────────────────────────────────────────────── */
  function iniciar() {
    A.app = document.getElementById('admin');
    if (!RA.adm.disponible) {
      A.app.innerHTML = '<main class="a-entrar"><div class="a-entrar__caja"><h1>Sin configurar</h1><p>Falta la URL de Supabase y la llave pública en <code>config.js</code>.</p></div></main>';
      return;
    }
    RA.adm.sesion().then(function (s) {
      if (!s) return pintarEntrar();
      return RA.adm.esAdmin().then(function (si) {
        if (!si) return RA.adm.salir().then(function () { pintarEntrar('Este usuario no tiene permisos de administración.'); });
        return arrancar();
      });
    }).catch(function (e) { console.error(e); pintarEntrar('No se pudo conectar. Revisa tu conexión.'); });
  }

  A.aplicarTemaAdmin = function (ap) { aplicarTemaAdmin(ap); };
  function aplicarTemaAdmin(ap) {
    A.apariencia = RA.normalizarApariencia(ap);
    A.tema = RA.calcularTema(A.apariencia);
    RA.aplicarTema(A.tema);
    var fondo = RA.TOKENS.fondosAdmin[A.apariencia.fondo_admin] || '#EFEBE1';
    var oscuro = !RA.esClaro(fondo), r = document.documentElement.style;
    r.setProperty('--a-fondo', fondo);
    r.setProperty('--a-texto', oscuro ? '#F3F0E8' : A.tema.pal.tinta);
    r.setProperty('--a-panel', oscuro ? '#2E2E52' : '#FFFFFF');
    r.setProperty('--a-suave', oscuro ? 'rgba(243,240,232,.6)' : 'rgba(29,29,58,.6)');
    r.setProperty('--a-linea', oscuro ? 'rgba(243,240,232,.2)' : 'rgba(29,29,58,.16)');
    document.documentElement.classList.toggle('admin-oscuro', oscuro);
  }

  function pintarEntrar(error) {
    document.title = 'Acceso del autor · Resistencias del aura';
    aplicarTemaAdmin(RA.guardado.leer('apariencia', null));
    A.app.innerHTML = '<main class="a-entrar"><form class="a-entrar__caja" novalidate>' +
      '<div class="a-entrar__logo" aria-hidden="true"><span></span><span></span></div>' +
      '<h1>Acceso del autor</h1>' +
      '<label>Correo<input type="email" name="correo" autocomplete="username" required></label>' +
      '<label>Contraseña<input type="password" name="clave" autocomplete="current-password" required></label>' +
      '<p class="a-entrar__error" role="alert">' + esc(error || '') + '</p>' +
      '<button class="a-boton a-boton--primario" type="submit">Entrar</button>' +
      '<a class="a-entrar__volver" href="../index.html">← Volver al sitio</a></form></main>';
    var f = A.app.querySelector('form');
    f.correo.focus();
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var b = f.querySelector('button'), err = f.querySelector('.a-entrar__error');
      if (!f.correo.value.trim() || !f.clave.value) { err.textContent = 'Escribe tu correo y tu contraseña.'; return; }
      b.disabled = true; b.textContent = 'Entrando…'; err.textContent = '';
      RA.adm.entrar(f.correo.value.trim(), f.clave.value).then(arrancar).catch(function (e) {
        b.disabled = false; b.textContent = 'Entrar';
        err.textContent = e.code === 'no-admin' ? 'Este usuario no tiene permisos de administración.'
          : /invalid/i.test(e.message || '') ? 'Correo o contraseña incorrectos.' : 'No se pudo entrar: ' + (e.message || 'error de conexión');
      });
    };
  }

  function arrancar() {
    return Promise.all([RA.adm.apariencia(), RA.adm.proyecto()]).then(function (r) {
      aplicarTemaAdmin(r[0]);
      if (r[0]) RA.guardado.escribir('apariencia', r[0]);
      A.proyecto = r[1] || { titulo: 'Resistencias del aura', autor: '' };
      if (RA.importador) RA.importador.autor = A.proyecto.autor || '';
      pintarMarco();
      if (RA.mb && RA.mb.alArrancar) RA.mb.alArrancar();   // avisos de cambios del Moodboard (si el navegador recuerda la carpeta)
      window.addEventListener('hashchange', enrutar);
      if (!A.escuchaSesion) {
        A.escuchaSesion = true;
        RA.adm.alCambiarSesion(function (ev) {
          if (ev !== 'SIGNED_OUT') return;
          window.removeEventListener('hashchange', enrutar);
          if (A.limpiar) { try { A.limpiar(); } catch (x) { /* nada */ } A.limpiar = null; }
          history.replaceState(null, '', location.pathname);
          pintarEntrar(A.saliendo ? '' : 'Tu sesión se cerró. Vuelve a entrar.');
          A.saliendo = false;
        });
      }
      enrutar();
    });
  }

  /* ── Marco con barra lateral ──────────────────────────────────────── */
  var SECCIONES = [['', 'Entradas'], ['orden', 'Orden de cuadernos'], ['referentes', 'Referentes'], ['importar', 'Importar'], ['apariencia', 'Apariencia']];
  function pintarMarco() {
    A.app.innerHTML = '<div class="a-marco">' +
      '<aside class="a-lateral"><a class="a-lateral__marca" href="#/">R · A <span>administración</span></a>' +
      '<nav aria-label="Secciones">' + SECCIONES.map(function (s) { return '<a href="#/' + s[0] + '" data-s="' + s[0] + '">' + s[1] + '</a>'; }).join('') + '</nav>' +
      '<span class="a-lateral__hueco"></span>' +
      '<a href="../index.html" target="_blank" rel="noopener">Ver el sitio ↗</a>' +
      '<button type="button" class="a-lateral__salir">Salir</button></aside>' +
      '<div class="a-principal" id="a-principal"></div></div>';
    A.principal = A.app.querySelector('#a-principal');
    A.app.querySelector('.a-lateral__salir').onclick = function () {
      var salir = function () { A.saliendo = true; window.removeEventListener('hashchange', enrutar); RA.adm.salir(); };
      if (A.antesDeSalir) A.antesDeSalir().then(salir); else salir();
    };
  }
  function marcarSeccion(s) {
    A.app.querySelectorAll('.a-lateral nav a').forEach(function (a) { a.classList.toggle('activa', a.getAttribute('data-s') === s); });
  }

  function enrutar() {
    if (A.limpiar) { A.limpiar(); A.limpiar = null; }
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, '')), p = h.split('/');
    window.scrollTo(0, 0);
    if (p[0] === 'entrada' && p[1]) { marcarSeccion(''); return RA.editor.abrir(p[1]); }
    if (h === 'orden') { marcarSeccion('orden'); return pintarOrden(); }
    if (h === 'referentes') { marcarSeccion('referentes'); return RA.paginas.referentes(); }
    if (h === 'importar') { marcarSeccion('importar'); return RA.paginas.importar(); }
    if (h === 'apariencia') { marcarSeccion('apariencia'); return A.recargar().then(function () { RA.paginas.apariencia(); }); }
    marcarSeccion('');
    pintarEntradas();
  }

  function pintarPendiente(t, html) {
    document.title = t + ' · Administración';
    A.principal.innerHTML = '<div class="a-pagina"><header class="a-cabecera"><h1>' + esc(t) + '</h1></header><p class="a-pendiente">' + html + '</p></div>';
  }

  /* ── Entradas ─────────────────────────────────────────────────────── */
  A.recargar = function () { return RA.adm.entradas().then(function (l) { A.entradas = l; return l; }); };

  function pintarEntradas() {
    document.title = 'Entradas · Administración';
    A.principal.innerHTML = '<div class="a-pagina"><header class="a-cabecera"><h1>Entradas</h1><div class="a-acciones">' +
      '<button type="button" class="a-boton" data-nueva="apunte">+ Apunte</button>' +
      '<button type="button" class="a-boton" data-importar>Importar archivo</button>' +
      '<button type="button" class="a-boton" data-exportar aria-haspopup="menu">Exportar</button>' +
      '<button type="button" class="a-boton a-boton--primario" data-nueva="capitulo">+ Capítulo</button></div></header>' +
      '<div class="a-lista" aria-busy="true"><p class="a-cargando">Cargando…</p></div></div>';
    A.principal.querySelectorAll('[data-nueva]').forEach(function (b) {
      b.onclick = function () { nueva(b.getAttribute('data-nueva')); };
    });
    A.principal.querySelector('[data-importar]').onclick = importarArchivos;
    A.principal.querySelector('[data-exportar]').onclick = function () {
      ui.ventana({ titulo: 'Exportar entradas', texto: 'Descarga todas las entradas (borradores incluidos, con sus notas privadas y sus cambios sin publicar).',
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Documento HTML (para leer o abrir en Word)', valor: 'html' }, { texto: 'Copia completa (.json)', valor: 'json', tipo: 'primario' }] })
        .then(function (f) { if (f) RA.exportarEntradas(f).then(function (n) { ui.aviso('Descargado: ' + n); }).catch(function (e) { ui.aviso('No se pudo exportar: ' + e.message, 'error'); }); });
    };
    Promise.all([A.recargar(), RA.adm.conteoReacciones()]).then(function (r) {
      var lista = r[0], reac = r[1], caja = A.principal.querySelector('.a-lista');
      if (!caja) return;
      caja.removeAttribute('aria-busy');
      if (!lista.length) {
        caja.innerHTML = '<p class="a-vacio">Todavía no hay entradas. Crea el primer capítulo o importa un archivo.</p>';
        return;
      }
      caja.innerHTML = lista.map(function (e) {
        var v = A.vigente(e), est = A.estado(e), n = reac[e.id] || 0;
        return '<a class="a-fila" href="#/entrada/' + e.id + '">' + RA.htmlMini(v, A.tema) +
          '<span class="a-fila__textos"><span class="antetitulo">' + esc(RA.antetitulo(v)) + '</span>' +
          '<span class="a-fila__titulo">' + (esc(v.titulo) || '<em>Sin título</em>') + '</span></span>' +
          '<span class="a-chip a-chip--' + est.clase + '">' + est.texto + '</span>' +
          '<span class="a-fila__dato">' + ui.numero(v.palabras) + ' palabras · ' + (v.minutos || 1) + ' min</span>' +
          '<span class="a-fila__dato a-fila__reac" title="Reacciones de lectores">' + (n ? RA.iconoReaccion('corazon', 16) + ' ' + n : '') + '</span>' +
          '<span class="a-fila__dato">' + ui.fecha(e.actualizado_en) + '</span></a>';
      }).join('');
    }).catch(function (e) { console.error(e); ui.aviso('No se pudieron cargar las entradas: ' + e.message, 'error'); });
  }

  function nueva(tipo) {
    var datos = { tipo: tipo, titulo: '' };
    (A.entradas.length ? Promise.resolve(A.entradas) : A.recargar()).then(function (l) {
      return RA.adm.crear(datos, l);
    }).then(function (id) { location.hash = '#/entrada/' + id; })
      .catch(function (e) { ui.aviso('No se pudo crear: ' + e.message, 'error'); });
  }

  /* Importar uno o varios archivos como entradas nuevas (borradores) */
  function importarArchivos() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.docx,.md,.markdown,.txt'; inp.hidden = true;
    document.body.appendChild(inp);
    inp.onchange = function () {
      var archivos = [].slice.call(inp.files || []); inp.remove();
      if (archivos.length) A.crearDesdeArchivos(archivos);
    };
    inp.click();
  }
  A.crearDesdeArchivos = function (archivos) {
    var I = RA.importador, malos = archivos.filter(function (f) { return !I.accepts(f.name); });
    if (malos.length) ui.aviso(/\.doc$/i.test(malos[0].name) ? 'Los .doc antiguos no se pueden leer: guárdalo como .docx' : 'Solo se pueden importar .docx, .md y .txt', 'error');
    archivos = archivos.filter(function (f) { return I.accepts(f.name); });
    if (!archivos.length) return Promise.resolve();
    return Promise.all(archivos.map(function (f) { return I.parseFile(f).catch(function (e) { console.error(e); return null; }); })).then(function (docs) {
      docs = docs.filter(Boolean);
      var cadena = Promise.resolve([]);
      docs.forEach(function (d) {
        cadena = cadena.then(function (piezas) {
          var n = I.headingCount(d);
          var elegir = n >= 2 ? ui.ventana({
            titulo: 'Importar «' + d.name + '»',
            texto: 'Este archivo tiene ' + n + ' títulos 1. ¿Cómo lo quieres traer?',
            botones: [{ texto: 'Todo en una entrada', valor: false }, { texto: 'Una entrada por cada título 1', valor: true, tipo: 'primario' }]
          }) : Promise.resolve(false);
          return elegir.then(function (dividir) {
            if (dividir === null) return piezas;
            return piezas.concat(I.pieces(d, dividir).map(function (p) { return I.finish(d, p); }));
          });
        });
      });
      return cadena;
    }).then(function (piezas) {
      if (!piezas.length) return;
      var hechas = 0;
      var cadena = A.recargar();
      piezas.forEach(function (p) {
        cadena = cadena.then(function (lista) {
          var cuerpo = RA.limpiarEditor(p.html);
          var pal = RA.contarPalabras(cuerpo);
          var sd = RA.separarDia(p.title);
          return RA.adm.crear({ tipo: 'capitulo', numero: sd.numero, titulo: sd.titulo, cuerpo_html: cuerpo, palabras: pal, minutos: RA.minutosDe(pal), notas: p.notes }, lista)
            .then(function () { hechas++; return A.recargar(); });
        });
      });
      return cadena.then(function () {
        ui.aviso(hechas === 1 ? 'Se creó 1 borrador' : 'Se crearon ' + hechas + ' borradores');
        if (!location.hash || location.hash === '#/') pintarEntradas(); else location.hash = '#/';
      });
    }).catch(function (e) { console.error(e); ui.aviso('No se pudo importar: ' + e.message, 'error'); });
  };

  /* ── Orden de cuadernos ───────────────────────────────────────────── */
  function pintarOrden() {
    document.title = 'Orden de cuadernos · Administración';
    A.principal.innerHTML = '<div class="a-pagina"><header class="a-cabecera"><h1>Orden de cuadernos</h1>' +
      '<p class="a-cabecera__nota">Arrastra para cambiar el orden del carrusel y de la barra de tintas. Se guarda solo.</p></header>' +
      '<ol class="a-orden" aria-busy="true"></ol></div>';
    A.recargar().then(function (lista) {
      var ol = A.principal.querySelector('.a-orden');
      if (!ol) return;
      ol.removeAttribute('aria-busy');
      if (!lista.length) { ol.outerHTML = '<p class="a-vacio">Todavía no hay entradas.</p>'; return; }
      function pintar() {
        ol.innerHTML = A.entradas.map(function (e, i) {
          var v = A.vigente(e), est = A.estado(e);
          return '<li class="a-orden__fila" draggable="true" data-id="' + e.id + '">' +
            '<span class="a-orden__asa" aria-hidden="true">⋮⋮</span><span class="a-orden__n">' + (i + 1) + '</span>' + RA.htmlMini(v, A.tema) +
            '<span class="a-fila__textos"><span class="antetitulo">' + esc(RA.antetitulo(v)) + '</span><span class="a-fila__titulo">' + (esc(v.titulo) || '<em>Sin título</em>') + '</span></span>' +
            '<span class="a-chip a-chip--' + est.clase + '">' + est.texto + '</span>' +
            '<span class="a-orden__botones"><button type="button" class="a-mini" data-mover="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" class="a-mini" data-mover="1" aria-label="Bajar"' + (i === A.entradas.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
        }).join('');
      }
      function guardar() {
        var ids = A.entradas.map(function (e) { return e.id; });
        A.entradas.forEach(function (e, i) { e.orden = i + 1; });
        pintar();
        RA.adm.reordenar(ids).then(function () { ui.aviso('Orden guardado'); })
          .catch(function (e) { ui.aviso('No se pudo guardar el orden: ' + e.message, 'error'); });
      }
      function mover(id, a) {
        var i = A.entradas.findIndex(function (e) { return e.id === id; });
        if (i < 0 || a < 0 || a >= A.entradas.length || a === i) return;
        var e = A.entradas.splice(i, 1)[0];
        A.entradas.splice(a, 0, e);
        guardar();
        var b = ol.querySelector('[data-id="' + id + '"] [data-mover="' + (a < i ? -1 : 1) + '"]');
        if (b && !b.disabled) b.focus();
      }
      pintar();
      ol.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-mover]'); if (!b) return;
        var id = b.closest('li').getAttribute('data-id');
        var i = A.entradas.findIndex(function (e) { return e.id === id; });
        mover(id, i + (+b.getAttribute('data-mover')));
      });
      var arrastrado = null;
      ol.addEventListener('dragstart', function (ev) {
        var li = ev.target.closest('li'); if (!li) return;
        arrastrado = li.getAttribute('data-id'); li.classList.add('arrastrando');
        ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', arrastrado);
      });
      ol.addEventListener('dragend', function () { arrastrado = null; ol.querySelectorAll('.arrastrando,.sobre').forEach(function (x) { x.classList.remove('arrastrando', 'sobre'); }); });
      ol.addEventListener('dragover', function (ev) {
        if (!arrastrado) return; ev.preventDefault();
        ol.querySelectorAll('.sobre').forEach(function (x) { x.classList.remove('sobre'); });
        var li = ev.target.closest('li'); if (li) li.classList.add('sobre');
      });
      ol.addEventListener('drop', function (ev) {
        ev.preventDefault();
        var li = ev.target.closest('li'); if (!li || !arrastrado) return;
        var a = A.entradas.findIndex(function (e) { return e.id === li.getAttribute('data-id'); });
        mover(arrastrado, a);
      });
    }).catch(function (e) { ui.aviso('No se pudo cargar: ' + e.message, 'error'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
