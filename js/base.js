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

  /* Etiquetas de una entrada */
  RA.numeroCorto = function (e) {
    return e.tipo === 'apunte' ? 'A' : (e.numero < 10 ? '0' + e.numero : String(e.numero));
  };
  RA.antetitulo = function (e) {
    return e.tipo === 'apunte' ? 'Apunte' : 'Día ' + e.numero;
  };
  RA.minutos = function (e) { return (e.minutos || 1) + ' min'; };

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
