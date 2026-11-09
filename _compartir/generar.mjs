// ════════════════════════════════════════════════════════════════════
// Resistencias del aura · PDF y vistas previas para redes (A-22)
//
// Lo corre la GitHub Action «Publicar el sitio» (.github/workflows/publicar.yml).
// Esta carpeta (_compartir) no se publica: la Action la deja fuera y Jekyll ignora lo que empieza por «_»
// sobre una copia del sitio (_sitio). Dos pasos:
//
//   node generar.mjs revisar _sitio   ¿cambió algo desde el último despliegue?
//                                      (sin dependencias: solo consulta Supabase)
//   node generar.mjs generar _sitio   abre cada entrada publicada en la versión para
//                                      imprimir (#/imprimir/<slug>) con Chromium y escribe:
//        pdf/<slug>.pdf               el PDF en A5
//        e/<slug>/index.html          la página para compartir (título, entradilla e
//                                     imagen para WhatsApp y redes; lleva a la lectura)
//        e/<slug>/tarjeta.png         la imagen para redes (1200 × 630)
//        compartir/manifiesto.json    qué hay y de qué versión (lo lee el sitio)
//
// Solo lee lo publicado, con la llave pública de config.js. No escribe en Supabase.
// Variables opcionales: BASE_SITIO (si no, sale del CNAME), EVENTO (el de GitHub),
// REST_URL (pruebas locales) y PRUEBA_RUTAS (módulo de pruebas que simula la red).
// ════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const VERSION = 1;   // súbelo si cambia lo que genera este archivo: obliga a rehacer todo
const [, , MODO = 'generar', DIR = '_sitio'] = process.argv;
const SITIO = path.resolve(DIR);
const EVENTO = process.env.EVENTO || 'manual';
const FIRMA_TMP = path.join(process.env.RUNNER_TEMP || '/tmp', 'ra-firma.json');
const ZONA = 'America/Bogota';

function salida(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  console.log(`→ ${k}=${v}`);
}
function aviso(m) { console.log(process.env.GITHUB_ACTIONS ? `::warning::${m}` : `⚠ ${m}`); }

/* ── Configuración: la de config.js (la misma del sitio) ── */
const cfg = fs.readFileSync(path.join(SITIO, 'config.js'), 'utf8');
const SB_URL = (cfg.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
const SB_KEY = (cfg.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
if (!SB_URL || !SB_KEY || /^sb_secret_/.test(SB_KEY)) { console.error('config.js sin la URL o la llave pública de Supabase'); process.exit(1); }
const REST = (process.env.REST_URL || SB_URL.replace(/\/$/, '') + '/rest/v1').replace(/\/$/, '') + '/';
function baseSitio() {
  if (process.env.BASE_SITIO) return process.env.BASE_SITIO.replace(/\/?$/, '/');
  const cn = path.join(SITIO, 'CNAME');
  if (fs.existsSync(cn) && fs.readFileSync(cn, 'utf8').trim()) return 'https://' + fs.readFileSync(cn, 'utf8').trim().replace(/\/.*$/, '') + '/';
  const [dueno, repo] = String(process.env.GITHUB_REPOSITORY || '/').split('/');
  return `https://${dueno}.github.io/${repo}/`;
}
const BASE = baseSitio();

async function rest(consulta) {
  const h = { apikey: SB_KEY, Accept: 'application/json' };
  if (/^eyJ/.test(SB_KEY)) h.Authorization = 'Bearer ' + SB_KEY;   // llave «anon» antigua
  const r = await fetch(REST + consulta, { headers: h });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status} a ${consulta.split('?')[0]}: ${await r.text()}`);
  return r.json();
}
async function datos() {
  const [entradas, proyecto, apariencia] = await Promise.all([
    rest('entradas?select=id,slug,tipo,numero,titulo,entradilla,orden,minutos,actualizado_en,publicado_en&estado=eq.publicado&order=orden.asc'),
    rest('proyecto?select=*&id=eq.1'),
    rest('apariencia?select=*&id=eq.1')
  ]);
  let n = 0;
  for (const e of entradas) if (e.tipo === 'apunte') e.n_apunte = ++n;
  return { entradas, proyecto: proyecto[0] || {}, apariencia: apariencia[0] || {} };
}

/* La firma cambia si cambia cualquier cosa que se ve en un PDF o en una tarjeta:
   las entradas (y su orden: el colofón dice cuál sigue), el proyecto, la apariencia y el código. */
function firmaDe(d) {
  const codigo = ['js/imprimir.js', 'js/compartir.js', 'js/portadas.js', 'js/tema.js', 'js/base.js', 'js/lectura.js', 'css/imprimir.css', 'css/lectura.css']
    .map(f => { try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(SITIO, f))).digest('hex'); } catch { return f; } });
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify({ v: VERSION, base: BASE, e: d.entradas.map(e => [e.slug, e.actualizado_en, e.orden, e.titulo]), p: d.proyecto, a: d.apariencia, codigo }));
  return h.digest('hex').slice(0, 24);
}

async function revisar() {
  const d = await datos(), firma = firmaDe(d);
  fs.writeFileSync(FIRMA_TMP, JSON.stringify({ firma }));
  console.log(`${d.entradas.length} entradas publicadas · firma ${firma} · ${BASE}`);
  if (EVENTO !== 'schedule') return salida('cambio', 'si');   // subir cambios o pedirlo a mano: siempre se rehace
  let anterior = null;
  try {
    const r = await fetch(BASE + 'compartir/manifiesto.json?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
    if (r.ok) anterior = await r.json();
  } catch { /* el sitio aún no tiene manifiesto */ }
  salida('cambio', anterior && anterior.firma === firma ? 'no' : 'si');
}

/* ── Utilidades para los archivos ── */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
function slugTexto(s, max) {
  let r = sinTildes(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (max && r.length > max) r = r.slice(0, max).replace(/-[^-]*$/, '');
  return r;
}
const antetitulo = e => e.tipo === 'apunte' ? 'Apunte' + (e.n_apunte ? ' A' + e.n_apunte : '') : (e.numero ? 'Día ' + e.numero : 'Capítulo');
function nombreArchivo(e, proyecto) {   // igual que RA.compartir.nombreArchivo
  const num = e.tipo === 'apunte' ? 'Apunte-A' + (e.n_apunte || '') : (e.numero ? 'Dia-' + (e.numero < 10 ? '0' : '') + e.numero : 'Capitulo');
  return [slugTexto(proyecto.titulo || 'Resistencias del aura'), num, slugTexto(e.titulo, 48).toLowerCase()].filter(Boolean).join('_') + '.pdf';
}
const seguro = slug => /^[a-z0-9][a-z0-9-]{0,120}$/i.test(slug);

function paginaRedes(e, proyecto, apariencia, version) {
  const obra = proyecto.titulo || 'Resistencias del aura', autor = proyecto.autor || '';
  const titulo = antetitulo(e) + ' · ' + e.titulo;
  const desc = (e.entradilla || '').trim() || `${e.tipo === 'apunte' ? 'Un apunte' : 'Un cuaderno'} de ${obra}${autor ? ', de ' + autor : ''}.`;
  const url = BASE + 'e/' + e.slug + '/', img = url + 'tarjeta.png?v=' + version;
  const lectura = '../../#/leer/' + encodeURIComponent(e.slug);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · ${esc(obra)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(obra)}">
<meta property="og:locale" content="es_CO">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(titulo + ' · ' + obra)}">
${e.publicado_en ? `<meta property="article:published_time" content="${esc(e.publicado_en)}">\n` : ''}${autor ? `<meta property="article:author" content="${esc(autor)}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" href="../../favicon.png" type="image/png">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F4EC;color:#1D1D3A;font:17px/1.5 Georgia,serif;text-align:center;padding:24px}a{color:inherit}</style>
<script>location.replace(${JSON.stringify(lectura)});</script>
</head>
<body>
<p><a href="${esc(lectura)}">Leer «${esc(e.titulo)}» en ${esc(obra)}</a></p>
</body>
</html>
`;
}

/* ── Servidor local del sitio copiado ── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
function servir() {
  return new Promise(listo => {
    const srv = http.createServer((q, r) => {
      let f = path.join(SITIO, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(SITIO)) { r.writeHead(403); return r.end(); }
      if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
      fs.readFile(f, (err, d) => {
        if (err) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d);
      });
    }).listen(0, '127.0.0.1', () => listo(srv));
  });
}

async function generar() {
  const t0 = Date.now();
  const { chromium } = await import('playwright');
  const { PDFDocument } = await import('pdf-lib');
  const d = await datos();
  let firma = null;
  try { firma = JSON.parse(fs.readFileSync(FIRMA_TMP, 'utf8')).firma; } catch { firma = firmaDe(d); }
  const proyecto = d.proyecto;
  for (const sub of ['pdf', 'e', 'compartir']) fs.rmSync(path.join(SITIO, sub), { recursive: true, force: true });
  fs.mkdirSync(path.join(SITIO, 'pdf'), { recursive: true });
  fs.mkdirSync(path.join(SITIO, 'compartir'), { recursive: true });

  const srv = await servir();
  const local = `http://127.0.0.1:${srv.address().port}/index.html`;
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1000, height: 1400 }, locale: 'es-CO', timezoneId: ZONA });
  if (process.env.PRUEBA_RUTAS) await (await import(path.resolve(process.env.PRUEBA_RUTAS))).rutas(contexto);
  const manifiesto = { version: VERSION, firma, generado: new Date().toISOString(), base: BASE, entradas: {} };
  let fallas = 0;

  async function abrir(ruta, vp) {
    const p = await contexto.newPage();
    if (vp) await p.setViewportSize(vp);
    const errores = [];
    p.on('pageerror', e => errores.push(e.message));
    await p.goto(local + ruta, { waitUntil: 'load' });
    await p.waitForSelector('html[data-impreso="listo"]', { timeout: 90000 });
    if (errores.length) aviso(`${ruta}: ${errores.join(' | ')}`);
    return p;
  }

  for (const e of d.entradas) {
    if (!seguro(e.slug)) { aviso(`slug raro, se salta: ${e.slug}`); continue; }
    const q = '?base=' + encodeURIComponent(BASE) + '&enlace=bonito';
    const registro = { version: e.actualizado_en };
    try {
      // Imagen para redes y página para compartir
      const pt = await abrir('#/imprimir/' + encodeURIComponent(e.slug) + q + '&tarjeta=1', { width: 1200, height: 630 });
      const png = await pt.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 }, type: 'png' });
      await pt.close();
      const dir = path.join(SITIO, 'e', e.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'tarjeta.png'), png);
      const version = crypto.createHash('sha256').update(png).digest('hex').slice(0, 10);
      fs.writeFileSync(path.join(dir, 'index.html'), paginaRedes(e, proyecto, d.apariencia, version));
      registro.pagina = true;
    } catch (err) { fallas++; aviso(`tarjeta de ${e.slug}: ${err.message}`); }
    try {
      const pp = await abrir('#/imprimir/' + encodeURIComponent(e.slug) + q);
      const titulo = await pp.title();
      const crudo = await pp.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
      await pp.close();
      const doc = await PDFDocument.load(crudo, { updateMetadata: false });
      doc.setTitle(titulo, { showInWindowTitleBar: true });
      if (proyecto.autor) doc.setAuthor(proyecto.autor);
      doc.setSubject(antetitulo(e) + ' · ' + e.titulo + (e.entradilla ? ' — ' + e.entradilla : ''));
      doc.setKeywords([proyecto.titulo || 'Resistencias del aura', antetitulo(e)]);
      doc.setLanguage('es-CO');
      doc.setCreator((proyecto.titulo || 'Resistencias del aura') + ' · ' + BASE);
      doc.setProducer('Chromium + pdf-lib');
      if (e.publicado_en) doc.setCreationDate(new Date(e.publicado_en));
      doc.setModificationDate(new Date(e.actualizado_en || Date.now()));
      const bytes = await doc.save();
      fs.writeFileSync(path.join(SITIO, 'pdf', e.slug + '.pdf'), bytes);
      Object.assign(registro, { pdf: 'pdf/' + e.slug + '.pdf', archivo: nombreArchivo(e, proyecto), paginas: doc.getPageCount(), kb: Math.round(bytes.length / 1024) });
    } catch (err) { fallas++; aviso(`PDF de ${e.slug}: ${err.message}`); }
    manifiesto.entradas[e.slug] = registro;
    console.log(`✓ ${antetitulo(e)} · ${e.titulo}${registro.paginas ? ' · ' + registro.paginas + ' págs. · ' + registro.kb + ' KB' : ''}${registro.pagina ? ' · tarjeta' : ''}`);
  }
  await navegador.close();
  srv.close();
  if (fallas) manifiesto.firma = null;   // con fallas, la próxima vuelta lo vuelve a intentar
  fs.writeFileSync(path.join(SITIO, 'compartir', 'manifiesto.json'), JSON.stringify(manifiesto, null, 1));
  console.log(`Listo en ${Math.round((Date.now() - t0) / 1000)} s · ${d.entradas.length} entradas · ${fallas} fallas`);
}

(MODO === 'revisar' ? revisar() : generar()).catch(err => { console.error(err); process.exit(1); });
