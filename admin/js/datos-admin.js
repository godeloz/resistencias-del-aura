/* Resistencias del aura · datos del administrador (Supabase, con la sesión del autor).
   Nunca usa la llave service_role: la seguridad la ponen las políticas RLS y es_admin(). */
(function () {
  'use strict';
  var RA = window.RA, C = window.RA_CONFIG || {};
  var sb = null;
  if (C.configurado && window.supabase) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  RA.sb = sb;
  var BUCKET = C.bucket || 'imagenes';
  var LISTA = 'id,tipo,numero,slug,titulo,entradilla,palabras,minutos,portada_imagen,portada_color,portada_patron,modo_lectura,orden,estado,publicado_en,creado_en,actualizado_en';
  /* Campos que el editor cambia (y que se copian al publicar) */
  var EDITABLES = ['tipo', 'numero', 'titulo', 'entradilla', 'cuerpo_html', 'palabras', 'minutos',
    'portada_imagen', 'portada_color', 'portada_patron', 'modo_lectura'];

  function ok(r) { if (r.error) throw r.error; return r.data; }
  function privado(e) {
    var p = e.entradas_privado;
    if (Array.isArray(p)) p = p[0];
    delete e.entradas_privado;
    e.trabajo = p ? p.trabajo : null;
    e.notas = p && p.notas ? p.notas : [];
    return e;
  }

  RA.urlImagen = function (ruta) {
    if (!ruta) return null;
    if (/^(https?:|data:|\.{0,2}\/)/.test(ruta)) return ruta;
    return sb ? sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl : ruta;
  };

  RA.slugificar = function (t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'entrada';
  };

  RA.adm = {
    EDITABLES: EDITABLES,
    disponible: !!sb,

    sesion: function () { return sb.auth.getSession().then(function (r) { return r.data.session; }); },
    esAdmin: function () { return sb.rpc('es_admin').then(ok); },
    entrar: function (correo, clave) {
      return sb.auth.signInWithPassword({ email: correo, password: clave }).then(function (r) {
        if (r.error) throw r.error;
        return sb.rpc('es_admin').then(ok).then(function (si) {
          if (!si) return sb.auth.signOut().then(function () { var e = new Error('no-admin'); e.code = 'no-admin'; throw e; });
          return r.data.user;
        });
      });
    },
    salir: function () { return sb.auth.signOut(); },
    alCambiarSesion: function (fn) { sb.auth.onAuthStateChange(function (ev, s) { fn(ev, s); }); },

    apariencia: function () { return sb.from('apariencia').select('*').eq('id', 1).maybeSingle().then(ok); },
    proyecto: function () { return sb.from('proyecto').select('*').eq('id', 1).maybeSingle().then(ok); },

    /* Todas las entradas, en el orden del carrusel, con su copia de trabajo (sin el cuerpo) */
    entradas: function () {
      return sb.from('entradas').select(LISTA + ',entradas_privado(trabajo)').order('orden', { ascending: true })
        .then(ok).then(function (l) {
          l = l.map(privado);
          // Apuntes A1, A2…: igual que en el sitio, se cuentan solo los publicados, en el orden del carrusel
          var n = 0;
          l.forEach(function (e) {
            var v = e.trabajo ? Object.assign({}, e, e.trabajo) : e;
            if (v.tipo === 'apunte' && e.estado === 'publicado') e.n_apunte = ++n; else delete e.n_apunte;
          });
          return l;
        });
    },

    entrada: function (id) {
      return Promise.all([
        sb.from('entradas').select('*,entradas_privado(trabajo,notas)').eq('id', id).maybeSingle().then(ok),
        sb.from('entradas_relacionadas').select('relacionada_id,orden').eq('entrada_id', id).order('orden').then(ok),
        sb.from('entradas_referentes').select('referente_id,orden').eq('entrada_id', id).order('orden').then(ok)
      ]).then(function (r) {
        if (!r[0]) return null;
        var e = privado(r[0]);
        e.relacionadas = r[1].map(function (x) { return x.relacionada_id; });
        e.referentes = r[2].map(function (x) { return x.referente_id; });
        return e;
      });
    },

    crear: function (datos, existentes) {
      var maxOrden = (existentes || []).reduce(function (m, e) { return Math.max(m, e.orden || 0); }, 0);
      var fila = Object.assign({ tipo: 'capitulo', titulo: '', entradilla: '', cuerpo_html: '', modo_lectura: 'lector' }, datos);
      if (fila.tipo === 'capitulo' && !fila.numero) {
        fila.numero = (existentes || []).filter(function (e) { return e.tipo === 'capitulo'; })
          .reduce(function (m, e) { return Math.max(m, e.numero || 0); }, 0) + 1;
      }
      if (fila.tipo === 'apunte') fila.numero = null;
      fila.slug = RA.adm.slugLibre(fila, existentes);
      fila.orden = maxOrden + 1;
      fila.estado = 'borrador';
      var notas = fila.notas || []; delete fila.notas;
      return sb.from('entradas').insert(fila).select('id').single().then(ok).then(function (r) {
        return sb.from('entradas_privado').upsert({ entrada_id: r.id, notas: notas }).then(ok).then(function () { return r.id; });
      });
    },

    /* Slug sugerido: «dia-N» para capítulos, el título para apuntes; sin repetir */
    slugLibre: function (e, existentes) {
      var base = e.tipo === 'capitulo' && e.numero ? 'dia-' + e.numero : 'apunte-' + RA.slugificar(e.titulo || 'sin-titulo');
      var usados = {}; (existentes || []).forEach(function (x) { if (x.id !== e.id) usados[x.slug] = true; });
      var s = base, n = 2;
      while (usados[s]) s = base + '-' + (n++);
      return s;
    },

    /* Borrador nunca publicado: se guarda directo en la entrada */
    guardarEntrada: function (id, campos) {
      return sb.from('entradas').update(campos).eq('id', id).select('actualizado_en').single().then(ok);
    },
    /* Entrada ya publicada: los cambios van a la copia de trabajo, que no se ve en internet */
    guardarTrabajo: function (id, trabajo) {
      return sb.from('entradas_privado').upsert({ entrada_id: id, trabajo: trabajo }).select('actualizado_en').single().then(ok);
    },
    guardarNotas: function (id, notas) {
      return sb.from('entradas_privado').upsert({ entrada_id: id, notas: notas }).then(ok);
    },
    publicar: function (id, campos, yaPublicada) {
      var c = Object.assign({}, campos, { estado: 'publicado' });
      if (!yaPublicada) c.publicado_en = new Date().toISOString();
      return sb.from('entradas').update(c).eq('id', id).then(ok).then(function () {
        return sb.from('entradas_privado').upsert({ entrada_id: id, trabajo: null }).then(ok);
      });
    },
    descartarTrabajo: function (id) {
      return sb.from('entradas_privado').upsert({ entrada_id: id, trabajo: null }).then(ok);
    },
    despublicar: function (id, campos) {
      return sb.from('entradas').update(Object.assign({}, campos || {}, { estado: 'borrador' })).eq('id', id).then(ok).then(function () {
        return sb.from('entradas_privado').upsert({ entrada_id: id, trabajo: null }).then(ok);
      });
    },
    eliminar: function (id) {
      return sb.storage.from(BUCKET).list('entradas/' + id, { limit: 1000 }).then(function (r) {
        var rutas = (r.data || []).map(function (f) { return 'entradas/' + id + '/' + f.name; });
        return rutas.length ? sb.storage.from(BUCKET).remove(rutas) : null;
      }).catch(function () { /* si no se pueden borrar las imágenes, se borra igual la entrada */ })
        .then(function () { return sb.from('entradas').delete().eq('id', id).then(ok); });
    },

    reordenar: function (ids) { return sb.rpc('reordenar_entradas', { p_ids: ids }).then(ok); },
    guardarRelacionadas: function (id, ids) { return sb.rpc('guardar_relacionadas', { p_entrada: id, p_ids: ids }).then(ok); },
    guardarReferentes: function (id, ids) { return sb.rpc('guardar_referentes_de_entrada', { p_entrada: id, p_ids: ids }).then(ok); },

    tipos: function () { return sb.from('tipos').select('*').order('orden').then(ok); },

    /* Sellos (categorías de los apuntes, SQL 06). null = la tabla aún no existe */
    sellos: function () {
      return sb.from('sellos').select('*').order('orden').then(function (r) {
        if (r.error) return null;
        RA.ponerSellos(r.data || []);
        return r.data || [];
      });
    },
    guardarSello: function (fila) { return sb.from('sellos').upsert(fila).select('*').single().then(ok); },
    borrarSello: function (id) { return sb.from('sellos').delete().eq('id', id).then(ok); },
    buscarReferentes: function (q, ids) {
      var c = sb.from('referentes').select('id,titulo,tipo_id,fuente,autor').order('titulo').limit(30);
      if (ids) c = c.in('id', ids.length ? ids : ['-']);
      else if (q) c = c.ilike('titulo', '%' + q.replace(/[%_]/g, '') + '%');
      return c.then(ok);
    },

    /* Reacciones: totales por entrada y detalle de una entrada */
    conteoReacciones: function () {
      return sb.from('reacciones').select('entrada_id').limit(20000).then(function (r) {
        if (r.error) return {};   // si aún no se instaló 03-reacciones.sql
        var c = {}; r.data.forEach(function (x) { c[x.entrada_id] = (c[x.entrada_id] || 0) + 1; });
        return c;
      });
    },
    reaccionesDe: function (id) {
      return sb.from('reacciones').select('bloque,inicio,fin,cita,emoji').eq('entrada_id', id).limit(5000).then(function (r) {
        if (r.error) return [];
        var por = {}, lista = [];
        r.data.forEach(function (x) {
          var k = x.bloque + ':' + x.inicio + ':' + x.fin;
          if (!por[k]) { por[k] = { bloque: x.bloque, inicio: x.inicio, fin: x.fin, cita: x.cita, total: 0, r: {} }; lista.push(por[k]); }
          por[k].total++; por[k].r[x.emoji] = (por[k].r[x.emoji] || 0) + 1;
        });
        return lista.sort(function (a, b) { return b.total - a.total; });
      });
    },
    borrarReaccionesDePasaje: function (id, p) {
      return sb.from('reacciones').delete().eq('entrada_id', id).eq('bloque', p.bloque).eq('inicio', p.inicio).eq('fin', p.fin).then(ok);
    },

    /* Sube una imagen (reducida a 2000 px si es más grande). Devuelve {ruta, url} */
    subirImagen: function (archivo, carpeta) {
      return reducir(archivo).then(function (blob) {
        var ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        var nombre = RA.slugificar(String(archivo.name || 'imagen').replace(/\.[^.]+$/, '')).slice(0, 40);
        var ruta = carpeta.replace(/\/+$/, '') + '/' + Date.now().toString(36) + '-' + nombre + '.' + ext;
        return sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(function (r) {
          if (r.error) throw r.error;
          return { ruta: ruta, url: sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl };
        });
      });
    },
    borrarImagen: function (ruta) { return sb.storage.from(BUCKET).remove([ruta]); },

    /* ── Importación desde el Moodboard y referentes ── */
    listarCarpeta: function (carpeta) {
      return sb.storage.from(BUCKET).list(carpeta, { limit: 1000 }).then(function (r) {
        if (r.error) throw r.error;
        return (r.data || []).map(function (f) { return f.name; });
      });
    },
    subirArchivo: function (ruta, archivo, reemplazar) {
      var tipo = archivo.type || (/\.avif$/i.test(ruta) ? 'image/avif' : /\.webp$/i.test(ruta) ? 'image/webp' : /\.png$/i.test(ruta) ? 'image/png' : /\.gif$/i.test(ruta) ? 'image/gif' : 'image/jpeg');
      return sb.storage.from(BUCKET).upload(ruta, archivo, { contentType: tipo, cacheControl: '31536000', upsert: !!reemplazar }).then(function (r) {
        if (r.error && !/exists|Duplicate/i.test(r.error.message || '')) throw r.error;
        return ruta;
      });
    },
    guardarTipos: function (filas) { return filas.length ? sb.from('tipos').upsert(filas).then(ok) : Promise.resolve(); },
    guardarEtiquetas: function (filas) { return filas.length ? sb.from('etiquetas').upsert(filas).then(ok) : Promise.resolve(); },
    idsReferentes: function () { return sb.from('referentes').select('id').limit(10000).then(ok).then(function (l) { return l.map(function (x) { return x.id; }); }); },
    guardarFilasReferentes: function (filas) {
      var cadena = Promise.resolve();
      for (var i = 0; i < filas.length; i += 100) (function (lote) {
        cadena = cadena.then(function () { return sb.from('referentes').upsert(lote).then(ok); });
      })(filas.slice(i, i + 100));
      return cadena;
    },
    reemplazarEtiquetasDe: function (ids, pares) {
      if (!ids.length) return Promise.resolve();
      return sb.from('referentes_etiquetas').delete().in('referente_id', ids).then(ok).then(function () {
        return pares.length ? sb.from('referentes_etiquetas').insert(pares).then(ok) : null;
      });
    },
    entradasPorOrigen: function () {
      return sb.from('entradas').select('id,origen_moodboard,estado,titulo').not('origen_moodboard', 'is', null).then(ok);
    },
    notasDe: function (id) { return sb.from('entradas_privado').select('notas').eq('entrada_id', id).maybeSingle().then(ok).then(function (r) { return (r && r.notas) || []; }); },
    referentes: function () {
      return Promise.all([
        sb.from('referentes').select('*').order('creado_en', { ascending: false }).limit(5000).then(ok),
        sb.from('tipos').select('*').order('orden').then(ok),
        sb.from('etiquetas').select('*').order('nombre').then(ok),
        sb.from('referentes_etiquetas').select('*').limit(20000).then(ok),
        sb.from('entradas_referentes').select('entrada_id,referente_id').limit(20000).then(ok)
      ]).then(function (r) { return { referentes: r[0], tipos: r[1], etiquetas: r[2], pares: r[3], citas: r[4] }; });
    },
    cambiarPublico: function (ids, publico) { return sb.from('referentes').update({ publico: publico }).in('id', ids).then(ok); },
    eliminarReferente: function (id) { return sb.from('referentes').delete().eq('id', id).then(ok); },

    /* Todo lo necesario para exportar las entradas */
    exportar: function () {
      return Promise.all([
        sb.from('entradas').select('*,entradas_privado(trabajo,notas)').order('orden').then(ok),
        sb.from('entradas_relacionadas').select('*').then(ok),
        sb.from('entradas_referentes').select('*').then(ok),
        sb.from('proyecto').select('*').eq('id', 1).maybeSingle().then(ok)
      ]).then(function (r) {
        return { proyecto: r[3], entradas: r[0].map(privado), relacionadas: r[1], referentes: r[2] };
      });
    },
    guardarApariencia: function (campos) { return sb.from('apariencia').update(campos).eq('id', 1).select('*').single().then(ok); },
    guardarProyecto: function (campos) { return sb.from('proyecto').update(campos).eq('id', 1).select('*').single().then(ok); }
  };

  /* Reduce fotos grandes antes de subirlas (las GIF y las pequeñas van tal cual) */
  function reducir(archivo) {
    var MAX = 2000;
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || !window.createImageBitmap) return Promise.resolve(archivo);
    return createImageBitmap(archivo).then(function (bmp) {
      var k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      if (k === 1 && archivo.size < 1.5e6) return archivo;
      var cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      var tipo = archivo.type === 'image/png' ? 'image/png' : 'image/jpeg';
      return new Promise(function (res) { cv.toBlob(function (b) { res(b || archivo); }, tipo, 0.86); });
    }).catch(function () { return archivo; });
  }
})();
