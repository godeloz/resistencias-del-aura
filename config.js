/* ════════════════════════════════════════════════════════════════════
   Resistencias del aura · configuración pública del sitio

   Aquí van SOLO dos datos de Supabase (Project Settings → API / API Keys):
     · la URL del proyecto
     · la llave PÚBLICA: «anon public» (empieza por eyJ…)
       o «publishable» (empieza por sb_publishable_…)

   ⚠ NUNCA pegues aquí la llave «service_role» ni una llave secreta
     (sb_secret_…). Este archivo se publica en internet.
   ════════════════════════════════════════════════════════════════════ */

window.RA_CONFIG = {
  supabaseUrl: 'https://cmhwyeyzahoyfolmmmni.supabase.co',
  supabaseKey: 'sb_publishable_O-1DltoG8JrQ5lClZnlVqw_z_q9F1q_',
  bucket: 'imagenes'
};

/* Guardia: si por error se pega una llave secreta, el sitio se niega a usarla. */
(function () {
  var k = String(window.RA_CONFIG.supabaseKey || '');
  var secreta = k.indexOf('sb_secret_') === 0;
  if (!secreta && k.indexOf('eyJ') === 0) {
    try {
      var p = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      secreta = p.role === 'service_role';
    } catch (e) { /* llave mal copiada: lo detecta la conexión */ }
  }
  window.RA_CONFIG.llaveSecretaDetectada = secreta;
  window.RA_CONFIG.configurado = !secreta &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(window.RA_CONFIG.supabaseUrl) &&
    (k.indexOf('eyJ') === 0 || k.indexOf('sb_publishable_') === 0);
  if (secreta) {
    window.RA_CONFIG.supabaseKey = '';
    console.error('config.js tiene una llave SECRETA. Bórrala ya y usa la llave pública (anon o publishable).');
  }
})();
