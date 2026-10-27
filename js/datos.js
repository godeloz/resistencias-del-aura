/* Resistencias del aura · capa de datos de la lectura
   Dos fuentes con la misma forma de respuesta:
     · demo: window.RA_DEMO (datos-demo/demo.js, solo local)
     · supabase: la base de datos real (solo lo publicado, por RLS) */
(function () {
  'use strict';
  var RA = window.RA;
  var C = window.RA_CONFIG || {};
  var CAMPOS_LISTA = 'id,tipo,numero,slug,titulo,entradilla,palabras,minutos,portada_imagen,portada_color,portada_patron,modo_lectura,orden,publicado_en';

  var modo = window.RA_DEMO ? 'demo' : (C.configurado && window.supabase ? 'supabase' : 'sin-config');
  var sb = null;
  if (modo === 'supabase') {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  RA.sb = sb;

  RA.urlImagen = function (ruta) {
    if (!ruta) return null;
    if (/^(https?:|data:|\.{0,2}\/)/.test(ruta)) return ruta;
    if (sb) return sb.storage.from(C.bucket || 'imagenes').getPublicUrl(ruta).data.publicUrl;
    return ruta;
  };

  /* En modo demo, la URL puede cambiar la apariencia para probar:
     ?paleta=pastel&fondo=noche&deco=formas&carrusel=recto&titulos=fraunces&texto=literata&patron=puntos&modo=paginas */
  function aparienciaDePrueba(a) {
    var q = new URLSearchParams(location.search), r = Object.assign({}, a);
    var mapa = { paleta: 'paleta', fondo: 'fondo_sitio', deco: 'decoracion_inicio', carrusel: 'carrusel',
      titulos: 'fuente_titulos', texto: 'fuente_texto', patron: 'patron_defecto', modo: 'modo_lectura_defecto' };
    Object.keys(mapa).forEach(function (k) { if (q.get(k)) r[mapa[k]] = q.get(k); });
    return r;
  }

  function sinCuerpo(e) {
    var r = {};
    CAMPOS_LISTA.split(',').forEach(function (k) { r[k] = e[k]; });
    return r;
  }

  var cacheEntradas = {};

  /* Reacciones en modo demo: semillas de demo.js + las del lector en su navegador */
  function demoReacciones(entradaId) {
    var D = window.RA_DEMO, por = {}, orden = [];
    function sumar(r, mia) {
      var k = r.bloque + ':' + r.inicio + ':' + r.fin + ':' + r.emoji;
      if (!por[k]) { por[k] = { bloque: r.bloque, inicio: r.inicio, fin: r.fin, cita: r.cita, emoji: r.emoji, total: 0, mia: false }; orden.push(por[k]); }
      por[k].total += r.total || 1;
      if (mia) por[k].mia = true;
    }
    var slug = (D.entradas.filter(function (e) { return e.id === entradaId; })[0] || {}).slug;
    (D.reacciones || []).filter(function (r) { return r.slug === slug; }).forEach(function (r) { sumar(r, false); });
    RA.guardado.leer('demo-reacciones', []).filter(function (r) { return r.entrada_id === entradaId; }).forEach(function (r) { sumar(r, true); });
    return orden;
  }

  RA.datos = {
    modo: modo,

    cargarSitio: function () {
      if (modo === 'demo') {
        var D = window.RA_DEMO;
        return Promise.resolve({
          proyecto: D.proyecto,
          apariencia: RA.normalizarApariencia(aparienciaDePrueba(D.apariencia)),
          entradas: D.entradas.filter(function (e) { return e.estado === 'publicado'; })
            .sort(function (a, b) { return a.orden - b.orden; }).map(sinCuerpo)
        });
      }
      if (modo !== 'supabase') return Promise.reject(new Error('sin-config'));
      return Promise.all([
        sb.from('proyecto').select('titulo,introduccion,autor').eq('id', 1).maybeSingle(),
        sb.from('apariencia').select('*').eq('id', 1).maybeSingle(),
        sb.from('entradas').select(CAMPOS_LISTA).eq('estado', 'publicado').order('orden', { ascending: true })
      ]).then(function (r) {
        r.forEach(function (x) { if (x.error) throw x.error; });
        return {
          proyecto: r[0].data || { titulo: 'Resistencias del aura', introduccion: '', autor: '' },
          apariencia: RA.normalizarApariencia(r[1].data),
          entradas: r[2].data || []
        };
      });
    },

    /* Entrada completa: cuerpo, ids de relacionadas y número de referentes */
    cargarEntrada: function (slug) {
      if (cacheEntradas[slug]) return Promise.resolve(cacheEntradas[slug]);
      if (modo === 'demo') {
        var e = window.RA_DEMO.entradas.filter(function (x) { return x.slug === slug; })[0] || null;
        return Promise.resolve(e);
      }
      if (modo !== 'supabase') return Promise.reject(new Error('sin-config'));
      return sb.from('entradas').select('*').eq('slug', slug).maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return null;
        var e = r.data;
        return Promise.all([
          sb.from('entradas_relacionadas').select('relacionada_id,orden').eq('entrada_id', e.id).order('orden'),
          sb.from('entradas_referentes').select('referente_id', { count: 'exact', head: true }).eq('entrada_id', e.id)
        ]).then(function (x) {
          e.relacionadas = (x[0].data || []).map(function (f) { return f.relacionada_id; });
          e.n_referentes = x[1].count || 0;
          cacheEntradas[slug] = e;
          return e;
        });
      });
    },

    /* Universo de referentes públicos con sus tipos, etiquetas y en qué entradas se citan */
    cargarReferentes: function () {
      if (modo === 'demo') {
        var R = window.RA_DEMO.universo || { referentes: [], tipos: [], etiquetas: [], pares: [], citas: [] };
        return Promise.resolve(R);
      }
      if (modo !== 'supabase') return Promise.reject(new Error('sin-config'));
      return Promise.all([
        sb.from('referentes').select('id,tipo_id,titulo,cuerpo,url,autor,fuente,anio,imagen,imagen_w,imagen_h,creado_en').eq('publico', true).order('creado_en', { ascending: false }).limit(5000),
        sb.from('tipos').select('*').order('orden'),
        sb.from('etiquetas').select('*'),
        sb.from('referentes_etiquetas').select('*').limit(20000),
        sb.from('entradas_referentes').select('entrada_id,referente_id').limit(20000)
      ]).then(function (r) {
        r.forEach(function (x) { if (x.error) throw x.error; });
        return { referentes: r[0].data, tipos: r[1].data, etiquetas: r[2].data, pares: r[3].data, citas: r[4].data };
      });
    },

    /* Vista previa para el autor: la entrada con su copia de trabajo encima (solo con sesión de admin) */
    cargarVista: function (id) {
      if (modo === 'demo') {
        return Promise.resolve(window.RA_DEMO.entradas.filter(function (x) { return x.id === id; })[0] || null);
      }
      if (modo !== 'supabase') return Promise.reject(new Error('sin-config'));
      return sb.from('entradas').select('*,entradas_privado(trabajo)').eq('id', id).maybeSingle().then(function (r) {
        if (r.error || !r.data) return null;
        var e = r.data, p = e.entradas_privado;
        if (Array.isArray(p)) p = p[0];
        delete e.entradas_privado;
        if (p && p.trabajo) { Object.assign(e, p.trabajo); e.con_trabajo = true; }
        return Promise.all([
          sb.from('entradas_relacionadas').select('relacionada_id,orden').eq('entrada_id', e.id).order('orden'),
          sb.from('entradas_referentes').select('referente_id', { count: 'exact', head: true }).eq('entrada_id', e.id)
        ]).then(function (x) {
          e.relacionadas = (x[0].data || []).map(function (f) { return f.relacionada_id; });
          e.n_referentes = x[1].count || 0;
          return e;
        });
      });
    },

    /* Totales de reacciones por pasaje: [{bloque, inicio, fin, cita, emoji, total, mia}] */
    reacciones: function (entradaId, visitante) {
      if (modo === 'demo') return Promise.resolve(demoReacciones(entradaId));
      return sb.rpc('reacciones_de', { p_entrada: entradaId, p_visitante: visitante }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    },

    /* Pone o quita una reacción; devuelve los totales actualizados */
    reaccionar: function (entradaId, ancla, emoji, visitante) {
      if (modo === 'demo') {
        var mias = RA.guardado.leer('demo-reacciones', []);
        var i = -1;
        mias.forEach(function (r, k) {
          if (r.entrada_id === entradaId && r.bloque === ancla.bloque && r.inicio === ancla.inicio && r.fin === ancla.fin && r.emoji === emoji) i = k;
        });
        if (i >= 0) mias.splice(i, 1);
        else mias.push({ entrada_id: entradaId, bloque: ancla.bloque, inicio: ancla.inicio, fin: ancla.fin, cita: ancla.cita, emoji: emoji });
        RA.guardado.escribir('demo-reacciones', mias);
        return Promise.resolve(demoReacciones(entradaId));
      }
      return sb.rpc('reaccionar', {
        p_entrada: entradaId, p_bloque: ancla.bloque, p_inicio: ancla.inicio, p_fin: ancla.fin,
        p_cita: ancla.cita, p_emoji: emoji, p_visitante: visitante
      }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
  };
})();
