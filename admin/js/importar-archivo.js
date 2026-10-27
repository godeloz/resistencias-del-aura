/* Resistencias del aura · importar .docx, .md y .txt en el editor de entradas.
   COPIADO del importador de la app Moodboard (Moodboard.app/…/web/js/importer.js, 26 oct 2026)
   y adaptado. No se enlaza ni se comparte con el Moodboard: si allá cambia, aquí no.
   Cambios respecto al original:
     · sin dependencias del Moodboard (MB.util, MB.store, ventanas);
     · los resaltados de color se descartan;
     · los comentarios de Word no se marcan en el texto: se devuelven como notas privadas
       {texto, cita, respuestas}, que el editor guarda aparte y nunca se publican.
   El .docx se descomprime con DecompressionStream y se lee con DOMParser. */
(function (RA) {
  'use strict';
  const U = {
    escapeHtml: function (s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
    norm: function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); },
    uid: function (prefix) { return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    truncate: function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; },
    countWords: function (text) { const m = String(text || '').trim().match(/[^\s\u00a0]+/g); return m ? m.length : 0; }
  };

  const OK_EXT = /\.(docx|md|markdown|txt)$/i;
  const HL = { amarillo: '#FFE58A', verde: '#A9ECDF', rosa: '#FFC9E3' };
  const FN = '\u0001'; /* marca de nota al pie dentro del HTML mientras se arma */
  const BR = '\u0002'; /* salto de línea pendiente en Markdown y texto */
  const ST = '\u0003'; /* fragmentos guardados aparte en Markdown */

  const I = (RA.importador = {});
  I.autor = '';   /* los comentarios de otra persona llevan su nombre delante */

  I.accepts = function (name) { return OK_EXT.test(String(name || '')); };
  I.filterFiles = function (list) { return Array.prototype.filter.call(list || [], function (f) { return f && I.accepts(f.name); }); };

  /* ================= utilidades ================= */
  const esc = U.escapeHtml;
  function textOf(html) { return String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
  function isEmpty(html) { return !textOf(html).replace(/[\s ]/g, '') && String(html).indexOf(FN) < 0; }
  function baseName(name) { return String(name || 'Documento').replace(/\.[^.]+$/, '').trim() || 'Documento'; }
  function stats() { return { images: 0, tables: 0, links: 0, footnotes: 0, comments: 0, tracked: false, legacy: false }; }

  function decode(buf) {
    const u8 = new Uint8Array(buf);
    if (u8[0] === 0xFF && u8[1] === 0xFE) return { text: new TextDecoder('utf-16le').decode(u8.subarray(2)), legacy: false };
    if (u8[0] === 0xFE && u8[1] === 0xFF) return { text: new TextDecoder('utf-16be').decode(u8.subarray(2)), legacy: false };
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(u8).replace(/^﻿/, ''), legacy: false }; }
    catch (e) { return { text: new TextDecoder('windows-1252').decode(u8), legacy: true }; }
  }

  /* Un párrafo con saltos de línea manuales: ¿es prosa cortada a lo ancho (se une) o verso (se respeta)? */
  function hardWrapped(lines) {
    if (lines.length < 2) return false;
    const body = lines.slice(0, -1).map(function (l) { return l.trim().length; });
    const min = Math.min.apply(null, body); const max = Math.max.apply(null, body);
    return min >= 55 && max <= 110 && max - min <= 30;
  }

  /* El color de resaltado más cercano entre los tres de la app. */
  function hlFromName(name) {
    const n = String(name || '').toLowerCase();
    if (!n || n === 'none' || n === 'black' || n === 'white') return '';
    if (/green|cyan|blue|teal/.test(n)) return HL.verde;
    if (/magenta|red|pink|violet/.test(n)) return HL.rosa;
    return HL.amarillo;
  }
  function hlFromHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '';
    const v = parseInt(m[1], 16); const r = (v >> 16) / 255; const g = ((v >> 8) & 255) / 255; const b = (v & 255) / 255;
    const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
    if (mx - mn < 0.12) return ''; /* blanco, negro, grises: no es un resaltado */
    let hue = 0; const d = mx - mn;
    if (mx === r) hue = 60 * (((g - b) / d) % 6); else if (mx === g) hue = 60 * ((b - r) / d + 2); else hue = 60 * ((r - g) / d + 4);
    if (hue < 0) hue += 360;
    if (hue >= 35 && hue < 75) return HL.amarillo;
    if (hue >= 75 && hue < 260) return HL.verde;
    return HL.rosa;
  }

  /* ================= bloques → HTML ================= */
  /* Un bloque: {t:'p'|'h'|'quote'|'li'|'hr', html, level, align, ordered, depth} */
  function renderBlocks(blocks) {
    let out = ''; const stack = [];
    const closeTo = function (d) { while (stack.length > d) out += '</li></' + stack.pop() + '>'; };
    blocks.forEach(function (b) {
      const st = b.align ? ' style="text-align: ' + b.align + '"' : '';
      if (b.t === 'li') {
        const d = Math.min(b.depth || 0, 5) + 1; const tag = b.ordered ? 'ol' : 'ul';
        if (stack.length > d) closeTo(d);
        if (stack.length === d) { if (stack[d - 1] !== tag) closeTo(d - 1); else out += '</li>'; }
        while (stack.length < d) {
          const last = stack.length === d - 1; const tg = last ? tag : 'ul';
          out += '<' + tg + '>' + (last ? '' : '<li>'); stack.push(tg);
        }
        out += '<li>' + (b.html || '<br>');
        return;
      }
      closeTo(0);
      if (b.t === 'h') out += '<h' + b.level + st + '>' + b.html + '</h' + b.level + '>';
      else if (b.t === 'quote') out += '<blockquote' + st + '>' + b.html + '</blockquote>';
      else if (b.t === 'hr') out += '<hr>';
      else out += '<p' + st + '>' + (isEmpty(b.html) && b.html.indexOf('<br') < 0 ? '<br>' : b.html) + '</p>';
    });
    closeTo(0);
    return out;
  }

  /* Párrafos vacíos: fuera los de las puntas, nunca dos seguidos, y si el documento los usa
     como espaciado entre todos los párrafos, fuera todos. */
  function tidy(blocks) {
    const empty = function (b) { return b.t === 'p' && isEmpty(b.html); };
    const full = blocks.filter(function (b) { return b.t === 'p' && !empty(b); }).length;
    const nEmpty = blocks.filter(empty).length;
    const dropAll = nEmpty >= Math.max(2, full * 0.3);
    const out = [];
    blocks.forEach(function (b) {
      if (empty(b)) { if (dropAll || !out.length || empty(out[out.length - 1])) return; }
      out.push(b);
    });
    while (out.length && empty(out[out.length - 1])) out.pop();
    return out;
  }

  /* ================= .docx ================= */
  async function inflate(data) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([data]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  /* Lee las partes de texto (.xml y .rels) de un zip. */
  async function unzip(buf) {
    const u8 = new Uint8Array(buf); const dv = new DataView(buf);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; } }
    if (e < 0) throw new Error('No es un archivo de Word válido.');
    const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const out = {}; const dec = new TextDecoder('utf-8');
    for (let k = 0; k < count; k++) {
      if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true); const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true); const xlen = dv.getUint16(p + 30, true); const clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (!/\.(xml|rels)$/i.test(name)) continue;
      const ln = dv.getUint16(off + 26, true); const lx = dv.getUint16(off + 28, true);
      const start = off + 30 + ln + lx; const data = u8.subarray(start, start + csize);
      let bytes = null;
      if (method === 0) bytes = data; else if (method === 8) bytes = await inflate(data); else continue;
      out[name.replace(/^\/+/, '')] = dec.decode(bytes);
    }
    return out;
  }

  function xml(str) { return str ? new DOMParser().parseFromString(str, 'application/xml') : null; }
  function kids(el, name) { const out = []; if (!el) return out; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (!name || c.localName === name) out.push(c); return out; }
  function kid(el, name) { if (!el) return null; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === name) return c; return null; }
  function all(el, name) { return el ? Array.prototype.slice.call(el.getElementsByTagNameNS('*', name)) : []; }
  function av(el, name) { if (!el || !el.attributes) return null; for (let i = 0; i < el.attributes.length; i++) if (el.attributes[i].localName === name) return el.attributes[i].value; return null; }
  function onOff(el) { if (!el) return undefined; const v = av(el, 'val'); return !(v === '0' || v === 'false' || v === 'off' || v === 'none'); }

  function relsOf(parts, path) {
    const dir = path.indexOf('/') >= 0 ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    const file = path.slice(dir.length);
    const doc = xml(parts[dir + '_rels/' + file + '.rels']); const out = {};
    all(doc, 'Relationship').forEach(function (r) {
      const type = String(av(r, 'Type') || '').split('/').pop(); let target = av(r, 'Target') || '';
      if (av(r, 'TargetMode') === 'External') return;
      target = target.charAt(0) === '/' ? target.slice(1) : dir + target;
      const parts2 = []; target.split('/').forEach(function (s) { if (s === '..') parts2.pop(); else if (s && s !== '.') parts2.push(s); });
      out[type] = parts2.join('/');
    });
    return out;
  }

  async function parseDocx(buf, name) {
    const parts = await unzip(buf);
    const root = relsOf(parts, '');
    const docPath = root.officeDocument || 'word/document.xml';
    if (!parts[docPath]) throw new Error('No se encontró el texto dentro del archivo.');
    const rels = relsOf(parts, docPath);
    const doc = xml(parts[docPath]);
    const S = stats();
    const authorName = U.norm(I.autor || '');

    /* ---- estilos ---- */
    const styles = {}; let defaultPara = '';
    all(xml(parts[rels.styles || 'word/styles.xml']), 'style').forEach(function (s) {
      const id = av(s, 'styleId'); if (!id) return;
      styles[id] = { id: id, type: av(s, 'type'), name: String(av(kid(s, 'name'), 'val') || '').toLowerCase(), basedOn: av(kid(s, 'basedOn'), 'val'), pPr: kid(s, 'pPr'), rPr: kid(s, 'rPr') };
      if (av(s, 'type') === 'paragraph' && (av(s, 'default') === '1' || av(s, 'default') === 'true')) defaultPara = id;
    });
    const chain = function (id) { const out = []; let s = styles[id]; let n = 0; while (s && n++ < 12) { out.push(s); s = styles[s.basedOn]; } return out; };
    const pInfoCache = {};
    function paraStyle(id) {
      if (pInfoCache[id]) return pInfoCache[id];
      const c = chain(id); const info = { level: 0, isTitle: false, quote: false, jc: '', numPr: null, listKind: '' };
      for (const s of c) {
        if (!info.level) {
          let m = /^heading ([1-9])$/.exec(s.name);
          if (m) info.level = +m[1];
          else if (s.name === 'title') { info.level = 1; info.isTitle = true; }
          else if (s.name === 'subtitle') info.level = 2;
          else { const o = av(kid(s.pPr, 'outlineLvl'), 'val'); if (o !== null && +o < 9) info.level = +o + 1; }
        }
        if (!info.quote && (/^(quote|intense quote|block text)$/.test(s.name) || /cita|quote/i.test(s.name + ' ' + s.id))) info.quote = true;
        if (!info.jc) info.jc = av(kid(s.pPr, 'jc'), 'val') || '';
        if (!info.numPr && kid(s.pPr, 'numPr')) info.numPr = kid(s.pPr, 'numPr');
        if (!info.listKind) { if (/^list bullet/.test(s.name)) info.listKind = 'ul'; else if (/^list number/.test(s.name)) info.listKind = 'ol'; }
      }
      pInfoCache[id] = info; return info;
    }

    /* ---- numeración (viñetas o números) ---- */
    const numDoc = xml(parts[rels.numbering || 'word/numbering.xml']);
    const abstracts = {}; const nums = {};
    all(numDoc, 'abstractNum').forEach(function (a) {
      const lv = {}; kids(a, 'lvl').forEach(function (l) { lv[av(l, 'ilvl')] = av(kid(l, 'numFmt'), 'val') || 'bullet'; });
      abstracts[av(a, 'abstractNumId')] = lv;
    });
    all(numDoc, 'num').forEach(function (n) { nums[av(n, 'numId')] = abstracts[av(kid(n, 'abstractNumId'), 'val')] || {}; });
    function listOf(numPr) {
      if (!numPr) return null;
      const id = av(kid(numPr, 'numId'), 'val'); if (!id || id === '0') return null;
      const lvl = +(av(kid(numPr, 'ilvl'), 'val') || 0);
      const fmt = (nums[id] || {})[String(lvl)] || 'bullet';
      if (fmt === 'none') return null;
      return { ordered: fmt !== 'bullet', depth: lvl };
    }

    /* ---- comentarios ---- */
    const comments = {}; const notes = [];
    const exByPara = {};
    all(xml(parts[rels.commentsExtended || 'word/commentsExtended.xml']), 'commentEx').forEach(function (x) { exByPara[av(x, 'paraId')] = { parent: av(x, 'paraIdParent'), done: av(x, 'done') === '1' }; });
    const byPara = {};
    all(xml(parts[rels.comments || 'word/comments.xml']), 'comment').forEach(function (c) {
      const ps = all(c, 'p'); const last = ps[ps.length - 1];
      const text = ps.map(function (p) { return all(p, 't').map(function (t) { return t.textContent; }).join(''); }).join('\n').trim();
      const author = (av(c, 'author') || '').trim();
      const item = { wid: av(c, 'id'), author: author, text: author && U.norm(author) !== authorName ? author + ': ' + text : text, at: Date.parse(av(c, 'date') || '') || Date.now(), paraId: last ? av(last, 'paraId') : null };
      comments[item.wid] = item; if (item.paraId) byPara[item.paraId] = item;
    });
    Object.keys(comments).forEach(function (wid) {
      const c = comments[wid]; const ex = c.paraId ? exByPara[c.paraId] : null;
      let parent = ex && ex.parent ? byPara[ex.parent] : null; let n = 0;
      while (parent && n++ < 20) { const px = parent.paraId ? exByPara[parent.paraId] : null; if (px && px.parent && byPara[px.parent]) parent = byPara[px.parent]; else break; }
      if (parent && parent !== c) { c.replyOf = parent; return; }
      c.note = { id: U.uid('n-'), kind: 'comentario', quote: '', text: c.text, resolved: !!(ex && ex.done), replies: [], createdAt: c.at, updatedAt: c.at };
      notes.push(c.note);
    });
    Object.keys(comments).forEach(function (wid) {
      const c = comments[wid]; if (!c.replyOf || !c.replyOf.note) return;
      c.replyOf.note.replies.push({ id: U.uid('r-'), text: c.text, createdAt: c.at });
    });
    notes.forEach(function (n) { n.replies.sort(function (a, b) { return a.createdAt - b.createdAt; }); });
    S.comments = notes.length;

    /* ---- texto ---- */
    const charCache = {};
    function charStyleFmt(id) {
      if (charCache[id]) return charCache[id];
      const f = {}; chain(id).reverse().forEach(function (s) { applyRPr(f, s.rPr, false); });
      charCache[id] = f; return f;
    }
    function applyRPr(f, rPr, direct) {
      if (!rPr) return;
      const b = onOff(kid(rPr, 'b')); if (b !== undefined) f.b = b;
      const i = onOff(kid(rPr, 'i')); if (i !== undefined) f.i = i;
      const u = kid(rPr, 'u'); if (u) f.u = av(u, 'val') !== 'none' && onOff(u) !== false;
      const s1 = onOff(kid(rPr, 'strike')); const s2 = onOff(kid(rPr, 'dstrike')); if (s1 !== undefined || s2 !== undefined) f.s = !!(s1 || s2);
      const va = av(kid(rPr, 'vertAlign'), 'val'); if (va) f.va = va === 'superscript' ? 'sup' : va === 'subscript' ? 'sub' : '';
      const hl = kid(rPr, 'highlight'); if (hl) f.hl = hlFromName(av(hl, 'val'));
      else if (direct) { const shd = kid(rPr, 'shd'); const fill = shd && av(shd, 'fill'); if (fill && fill !== 'auto') f.hl = hlFromHex(fill); }
      const vanish = onOff(kid(rPr, 'vanish')); if (vanish !== undefined) f.hidden = vanish;
    }
    function runFmt(rPr) {
      const f = {};
      const rs = av(kid(rPr, 'rStyle'), 'val'); if (rs) Object.assign(f, charStyleFmt(rs));
      applyRPr(f, rPr, true);
      return f;
    }
    const fmtKey = function (f) { return (f.b ? 'b' : '') + (f.i ? 'i' : '') + (f.u ? 'u' : '') + (f.s ? 's' : '') + (f.va || '') + '|' + (f.hl || ''); };
    function wrapFmt(f, html) {
      /* los resaltados de color no se importan */
      if (f.va) html = '<' + f.va + '>' + html + '</' + f.va + '>';
      if (f.s) html = '<s>' + html + '</s>';
      if (f.u) html = '<u>' + html + '</u>';
      if (f.i) html = '<i>' + html + '</i>';
      if (f.b) html = '<b>' + html + '</b>';
      return html;
    }

    const fnHtml = {}; /* clave → HTML de la nota */
    const fnParts = { f: xml(parts[rels.footnotes || 'word/footnotes.xml']), e: xml(parts[rels.endnotes || 'word/endnotes.xml']) };
    const fnIndex = { f: {}, e: {} };
    ['f', 'e'].forEach(function (k) { all(fnParts[k], k === 'f' ? 'footnote' : 'endnote').forEach(function (n) { fnIndex[k][av(n, 'id')] = n; }); });

    /* Contexto mientras se recorre: comentarios abiertos y campos (para saltar índices). */
    function Ctx(withComments) { this.active = []; this.fields = []; this.withComments = withComments; }
    Ctx.prototype.skipping = function () { return this.fields.some(function (f) { return f.toc; }); };

    function inlineOf(p, ctx) {
      const segs = [];
      const push = function (html, f) {
        if (f && f.hidden) return;
        if (ctx.skipping()) return;
        const ids = ctx.withComments ? ctx.active.slice() : [];
        const key = (f ? fmtKey(f) : '|') + '#' + ids.join(',');
        const last = segs[segs.length - 1];
        if (last && last.key === key) last.html += html; else segs.push({ key: key, html: html, f: f || {}, ids: ids });
        ids.forEach(function (id) { comments[id].used = true; });
      };
      const run = function (r) {
        const f = runFmt(kid(r, 'rPr'));
        kids(r).forEach(function (c) {
          const n = c.localName;
          if (n === 't') push(esc(c.textContent), f);
          else if (n === 'tab' || n === 'ptab') push(' ', f);
          else if (n === 'br' || n === 'cr') { const ty = av(c, 'type'); if (ty !== 'page' && ty !== 'column') push('<br>', {}); }
          else if (n === 'noBreakHyphen') push('-', f);
          else if (n === 'footnoteReference' || n === 'endnoteReference') {
            const k = n === 'footnoteReference' ? 'f' : 'e'; const id = av(c, 'id'); const note = fnIndex[k][id];
            if (!note || !ctx.withComments) return;
            const key = k + id;
            if (fnHtml[key] === undefined) {
              const sub = new Ctx(false);
              fnHtml[key] = all(note, 'p').map(function (pp) { return inlineOf(pp, sub); }).filter(function (x) { return !isEmpty(x); }).join(' ').trim();
              S.footnotes++;
            }
            push(FN + key + FN, {});
          }
          else if (n === 'drawing' || n === 'pict' || n === 'object') S.images++;
          else if (n === 'AlternateContent') { if (all(c, 'drawing').length || all(c, 'pict').length) S.images++; }
          else if (n === 'fldChar') {
            const ty = av(c, 'fldCharType');
            if (ty === 'begin') ctx.fields.push({ instr: '', toc: false });
            else if (ty === 'separate') { const top = ctx.fields[ctx.fields.length - 1]; if (top) top.toc = /^\s*TOC\b/.test(top.instr); }
            else if (ty === 'end') ctx.fields.pop();
          }
          else if (n === 'instrText') { const top = ctx.fields[ctx.fields.length - 1]; if (top) top.instr += c.textContent; }
        });
      };
      const walk = function (node) {
        kids(node).forEach(function (c) {
          const n = c.localName;
          if (n === 'r') run(c);
          else if (n === 'hyperlink') { S.links++; walk(c); }
          else if (n === 'ins' || n === 'moveTo') { S.tracked = true; walk(c); }
          else if (n === 'smartTag' || n === 'customXml' || n === 'fldSimple' || n === 'dir' || n === 'bdo') walk(c);
          else if (n === 'sdt') walk(kid(c, 'sdtContent'));
          else if (n === 'del' || n === 'moveFrom') S.tracked = true;
          else if (n === 'commentRangeStart') { const id = av(c, 'id'); if (comments[id] && comments[id].note && ctx.active.indexOf(id) < 0) ctx.active.push(id); }
          else if (n === 'commentRangeEnd') { const id = av(c, 'id'); ctx.active = ctx.active.filter(function (x) { return x !== id; }); }
          else if (n === 'AlternateContent') walk(kid(c, 'Choice') || kid(c, 'Fallback'));
          else if (n === 'oMath' || n === 'oMathPara') push(esc(c.textContent), {});
        });
      };
      walk(p);
      return segs.map(function (s) {
        const html = wrapFmt(s.f, s.html);
        s.ids.forEach(function (id) { const n = comments[id].note; if (n) n.quote += ' ' + textOf(s.html); });
        return html;
      }).join('');
    }

    const blocks = [];
    const ctx = new Ctx(true);
    function paragraph(p) {
      const pPr = kid(p, 'pPr');
      const info = paraStyle(av(kid(pPr, 'pStyle'), 'val') || defaultPara);
      const imgs = S.images;
      const html = inlineOf(p, ctx).replace(/^(\s|&nbsp;)+|(\s|&nbsp;)+$/g, '');
      let level = info.level;
      const ol = av(kid(pPr, 'outlineLvl'), 'val'); if (ol !== null && +ol < 9) level = +ol + 1;
      const jcRaw = av(kid(pPr, 'jc'), 'val') || info.jc;
      const align = jcRaw === 'center' ? 'center' : (jcRaw === 'right' || jcRaw === 'end') ? 'right' : '';
      const list = listOf(kid(pPr, 'numPr') || info.numPr) || (info.listKind ? { ordered: info.listKind === 'ol', depth: 0 } : null);
      if (S.images > imgs && isEmpty(html)) return null; /* el párrafo solo tenía una imagen */
      if (level && !isEmpty(html)) return { t: 'h', level: Math.min(level, 3), html: html, align: align, isTitle: info.isTitle && level === 1 };
      if (list && !isEmpty(html)) return { t: 'li', ordered: list.ordered, depth: list.depth, html: html };
      if (info.quote && !isEmpty(html)) return { t: 'quote', html: html, align: align };
      return { t: 'p', html: html, align: align };
    }
    function isToc(sdt) { const g = all(kid(sdt, 'sdtPr'), 'docPartGallery')[0]; return !!g && /table of contents/i.test(av(g, 'val') || ''); }
    function table(tbl) {
      S.tables++;
      kids(tbl, 'tr').forEach(function (tr) {
        const cells = kids(tr, 'tc');
        if (cells.length === 1) { body(cells[0]); return; }
        const parts2 = cells.map(function (tc) { return all(tc, 'p').map(function (p) { return inlineOf(p, ctx); }).filter(function (x) { return !isEmpty(x); }).join(' '); }).filter(function (x) { return !isEmpty(x); });
        if (parts2.length) blocks.push({ t: 'p', html: parts2.join(' · ') });
      });
    }
    function body(el) {
      kids(el).forEach(function (c) {
        const n = c.localName;
        if (n === 'p') { const b = paragraph(c); if (b) blocks.push(b); }
        else if (n === 'tbl') table(c);
        else if (n === 'sdt') { if (!isToc(c)) body(kid(c, 'sdtContent')); }
        else if (n === 'customXml') body(c);
        else if (n === 'AlternateContent') body(kid(c, 'Choice') || kid(c, 'Fallback'));
      });
    }
    body(kid(doc.documentElement, 'body'));
    S.comments = notes.length;
    return { name: name, kind: 'docx', title: '', blocks: tidy(blocks), fnHtml: fnHtml, notes: notes, stats: S };
  }

  /* ================= .md ================= */
  function parseMd(src, name, legacy) {
    const S = stats(); S.legacy = !!legacy;
    let text = String(src).replace(/\r\n?/g, '\n');
    let title = '';
    const fm = /^---\n([\s\S]*?)\n(?:---|\.\.\.)\s*(\n|$)/.exec(text);
    if (fm) { const t = /^title:\s*(.*)$/m.exec(fm[1]); if (t) title = t[1].trim().replace(/^["']|["']$/g, ''); text = text.slice(fm[0].length); }
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    const raw = text.split('\n');
    /* notas al pie [^id]: texto, y definiciones de enlaces [x]: url */
    const fdefs = {}; const lines = [];
    for (let i = 0; i < raw.length; i++) {
      const m = /^\[\^([^\]]+)\]:\s?(.*)$/.exec(raw[i]);
      if (m) { let c = m[2]; while (i + 1 < raw.length && /^( {2,}|\t)\S/.test(raw[i + 1])) c += ' ' + raw[++i].trim(); fdefs[m[1]] = c; continue; }
      if (/^ {0,3}\[[^\]^][^\]]*\]:\s+\S+/.test(raw[i])) continue;
      lines.push(raw[i]);
    }
    const fnHtml = {};
    const inline = function (s) { return mdInline(s, fdefs, fnHtml, S); };
    const joinLines = function (ls) {
      const wrap = hardWrapped(ls);
      return ls.map(function (l, i) {
        if (i === ls.length - 1) return l.replace(/\s+$/, '').replace(/\\$/, '');
        const hard = /( {2,}|\\)$/.test(l);
        return l.replace(/( {2,}|\\)$/, '').replace(/\s+$/, '') + (wrap && !hard ? ' ' : BR);
      }).join('');
    };
    const blocks = []; let para = []; let listStack = []; let lastLi = null;
    const flush = function () { if (para.length) { const html = inline(joinLines(para)); if (!isEmpty(html)) blocks.push({ t: 'p', html: html }); } para = []; };
    const isTableSep = function (l) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.indexOf('-') >= 0 && (l.indexOf('|') >= 0); };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { flush(); lastLi = null; continue; }
      let m;
      if ((m = /^ {0,3}(`{3,}|~{3,})/.exec(line))) {
        flush(); const fence = m[1]; const code = [];
        while (i + 1 < lines.length && lines[i + 1].trim().indexOf(fence) !== 0) code.push(lines[++i]);
        i++; blocks.push({ t: 'p', html: code.map(esc).join('<br>') }); listStack = []; continue;
      }
      if ((m = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) { flush(); listStack = []; lastLi = null; blocks.push({ t: 'h', level: Math.min(m[1].length, 3), html: inline(m[2]) }); continue; }
      if (para.length && !lastLi && /^ {0,3}=+\s*$/.test(line)) { blocks.push({ t: 'h', level: 1, html: inline(joinLines(para)) }); para = []; continue; }
      if (para.length && !lastLi && /^ {0,3}-+\s*$/.test(line)) { blocks.push({ t: 'h', level: 2, html: inline(joinLines(para)) }); para = []; continue; }
      if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) { flush(); listStack = []; lastLi = null; blocks.push({ t: 'hr' }); continue; }
      if (/^ {0,3}>/.test(line)) {
        flush(); listStack = []; lastLi = null;
        const q = [line];
        while (i + 1 < lines.length && /^ {0,3}>/.test(lines[i + 1])) q.push(lines[++i]);
        const inner = q.map(function (l) { let s = l; while (/^ {0,3}> ?/.test(s)) s = s.replace(/^ {0,3}> ?/, ''); return s; });
        let chunk = [];
        const out = function () { if (chunk.length) { const body = chunk.map(function (l) { return l.replace(/^(\s*)([-*+]|\d{1,9}[.)])\s+/, '$1$2 '); }); blocks.push({ t: 'quote', html: inline(joinLines(body)) }); } chunk = []; };
        inner.forEach(function (l) { if (!l.trim()) out(); else chunk.push(l); });
        out(); continue;
      }
      if ((m = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line))) {
        flush();
        const indent = m[1].replace(/\t/g, '    ').length;
        while (listStack.length && indent < listStack[listStack.length - 1]) listStack.pop();
        if (!listStack.length || indent > listStack[listStack.length - 1]) listStack.push(indent);
        let content = m[3].replace(/^\[ \]\s+/, '☐ ').replace(/^\[[xX]\]\s+/, '☑ ');
        lastLi = { t: 'li', ordered: /\d/.test(m[2]), depth: listStack.length - 1, lines: [content] };
        blocks.push(lastLi); continue;
      }
      if (lastLi && /^\s{2,}\S/.test(line)) { lastLi.lines.push(line.trim()); continue; }
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flush(); listStack = []; lastLi = null; S.tables++;
        const row = function (l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }).filter(Boolean); };
        blocks.push({ t: 'p', html: row(line).map(inline).join(' · ') }); i++;
        while (i + 1 < lines.length && lines[i + 1].indexOf('|') >= 0 && lines[i + 1].trim()) blocks.push({ t: 'p', html: row(lines[++i]).map(inline).join(' · ') });
        continue;
      }
      if (lastLi) { lastLi.lines.push(line.trim()); continue; }
      listStack = [];
      para.push(line);
    }
    flush();
    blocks.forEach(function (b) { if (b.t === 'li') { b.html = inline(joinLines(b.lines)); delete b.lines; } });
    return { name: name, kind: 'md', title: title, blocks: tidy(blocks), fnHtml: fnHtml, notes: [], stats: S };
  }

  function mdInline(s, fdefs, fnHtml, S) {
    const stash = [];
    const keep = function (html) { stash.push(html); return ST + (stash.length - 1) + ST; };
    s = esc(s);
    s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, function (m, t, c) { return keep(c.trim()); });
    s = s.replace(/\\([\\`*_{}\[\]()#+\-.!~=|^])/g, function (m, c) { return keep(c); });
    s = s.replace(/!\[\[[^\]]*\]\]/g, function () { S.images++; return ''; });
    s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, function () { S.images++; return ''; });
    s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function (m, a, b) { return b || a; });
    s = s.replace(/\[\^([^\]]+)\]/g, function (m, id) {
      if (fdefs[id] === undefined) return m;
      const key = 'm' + id;
      if (fnHtml[key] === undefined) { fnHtml[key] = mdInline(fdefs[id], {}, {}, S).replace(new RegExp(BR, 'g'), ' '); S.footnotes++; }
      return keep(FN + key + FN);
    });
    s = s.replace(/\[([^\]]+)\]\((?:[^()\s]|\([^)]*\))*(?:\s+&quot;[^&]*&quot;)?\)/g, function (m, t) { S.links++; return t; });
    s = s.replace(/\[([^\]]+)\]\[[^\]]*\]/g, function (m, t) { S.links++; return t; });
    s = s.replace(/&lt;((?:https?|mailto):[^\s&]+)&gt;/g, function (m, u) { S.links++; return keep(u); });
    s = s.replace(/&lt;(\/?)(u|sup|sub|s|b|i|em|strong|br|mark)\s*\/?&gt;/gi, function (m, close, tag) {
      tag = tag.toLowerCase();
      if (tag === 'br') return '<br>';
      if (tag === 'mark') return close ? '</span>' : '<span style="background-color: ' + HL.amarillo + '">';
      return '<' + close + tag + '>';
    });
    s = s.replace(/(\*\*\*|___)(?=\S)([\s\S]*?\S)\1/g, '<b><i>$2</i></b>');
    s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<b>$2</b>');
    s = s.replace(/\*(?=[^\s*])([^*]*?[^\s*])\*/g, '<i>$1</i>');
    s = s.replace(/\*(?=[^\s*])([^*])\*/g, '<i>$1</i>');
    s = s.replace(/(^|[^\w])_(?=[^\s_])([^_]*?[^\s_]|[^\s_])_(?!\w)/g, '$1<i>$2</i>');
    s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>');
    s = s.replace(/==(?=\S)([\s\S]*?\S)==/g, '<span style="background-color: ' + HL.amarillo + '">$1</span>');
    s = s.replace(/\^([^\s^]+)\^/g, '<sup>$1</sup>');
    s = s.replace(/(^|[^~])~([^\s~]+)~(?!~)/g, '$1<sub>$2</sub>');
    s = s.replace(new RegExp(ST + '(\\d+)' + ST, 'g'), function (m, i) { return stash[+i]; });
    s = s.replace(new RegExp(ST + '(\\d+)' + ST, 'g'), function (m, i) { return stash[+i]; });
    return s.replace(new RegExp(BR, 'g'), '<br>');
  }

  /* ================= .txt ================= */
  function parseTxt(src, name, legacy) {
    const S = stats(); S.legacy = !!legacy;
    const text = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
    const blocks = text.split(/\n[ \t]*\n/).map(function (chunk) {
      const ls = chunk.split('\n').filter(function (l, i, a) { return !(i === 0 && !l.trim()) && !(i === a.length - 1 && !l.trim()); });
      if (!ls.length) return null;
      const wrap = hardWrapped(ls);
      return { t: 'p', html: ls.map(function (l) { return esc(l.replace(/\s+$/, '')); }).join(wrap ? ' ' : '<br>') };
    }).filter(Boolean);
    return { name: name, kind: 'txt', title: '', blocks: tidy(blocks), fnHtml: {}, notes: [], stats: S };
  }

  /* ================= leer un archivo ================= */
  I.parseFile = async function (file) {
    const name = file.name || 'documento';
    const buf = await file.arrayBuffer();
    if (/\.docx$/i.test(name)) return parseDocx(buf, name);
    const d = decode(buf);
    if (/\.(md|markdown)$/i.test(name)) return parseMd(d.text, name, d.legacy);
    return parseTxt(d.text, name, d.legacy);
  };

  /* Cuántos títulos 1 tiene: si son dos o más, se puede dividir en capítulos. */
  const isH1 = function (b) { return b.t === 'h' && b.level === 1 && !b.isTitle; };
  I.headingCount = function (doc) { return doc.blocks.filter(isH1).length; };

  /* Parte un documento en piezas {title, blocks}. */
  I.pieces = function (doc, split) {
    const base = doc.title || baseName(doc.name);
    if (!split) {
      const blocks = doc.blocks.slice(); let title = doc.title || '';
      if (!title && blocks.length && blocks[0].t === 'h' && blocks[0].level === 1) title = textOf(blocks.shift().html).trim();
      return [{ title: title || base, blocks: tidy(blocks) }];
    }
    const out = []; let cur = { title: base, blocks: [], preface: true };
    doc.blocks.forEach(function (b) {
      if (isH1(b)) { out.push(cur); cur = { title: textOf(b.html).trim() || base, blocks: [] }; return; }
      if (cur.preface && b.isTitle && !cur.blocks.length) { cur.title = textOf(b.html).trim() || base; return; }
      cur.blocks.push(b);
    });
    out.push(cur);
    return out.filter(function (p) { p.blocks = tidy(p.blocks); return !p.preface || p.blocks.length; });
  };

  /* Arma el HTML final de una pieza: notas al pie numeradas y los comentarios de Word como notas privadas. */
  I.finish = function (doc, piece) {
    let html = renderBlocks(piece.blocks);
    const order = []; const num = {};
    html = html.replace(new RegExp(FN + '([^' + FN + ']+)' + FN, 'g'), function (m, key) {
      if (doc.fnHtml[key] === undefined) return '';
      if (!num[key]) { order.push(key); num[key] = order.length; }
      return '<sup>' + num[key] + '</sup>';
    });
    if (order.length) html += '<h3>Notas</h3><ol>' + order.map(function (k) { return '<li>' + (doc.fnHtml[k] || '<br>') + '</li>'; }).join('') + '</ol>';
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const plano = (tmp.textContent || '').replace(/\s+/g, ' ');
    /* Notas privadas: los comentarios cuyo pasaje quedó en esta pieza */
    const notas = doc.notes.map(function (n) {
      return { id: n.id, texto: n.text, cita: String(n.quote || '').replace(/\s+/g, ' ').trim(), resuelta: !!n.resolved,
        respuestas: n.replies.map(function (r) { return r.text; }), creada: new Date(n.createdAt || Date.now()).toISOString(), origen: doc.name };
    }).filter(function (n) { return !n.cita || plano.indexOf(n.cita.slice(0, 40)) >= 0; });
    return { title: U.truncate(piece.title, 200), html: html || '<p><br></p>', notes: notas, words: U.countWords(tmp.innerText || tmp.textContent || '') };
  };
})(window.RA);
