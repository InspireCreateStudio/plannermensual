'use strict';
// Perfil de autora en Inicio y Ajustes (igual que en el Kit, Novelia y el Centro de Control).
function urlEnlace(k, v) {
  v = String(v || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, '');
  if (k === 'instagram') return 'https://www.instagram.com/' + h;
  if (k === 'tiktok') return 'https://www.tiktok.com/@' + h;
  return 'https://' + v.replace(/^\/+/, '');
}
function enlacesPerfil(P) {
  const fijos = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['amazon', 'Amazon'], ['web', 'Web']].filter(([k]) => String((P.enlaces || {})[k] || '').trim()).map(([k, t]) => [t, urlEnlace(k, P.enlaces[k])]);
  return [...fijos, ...(P.otros || []).filter(o => o && String(o.u || '').trim()).map(o => [o.t || 'Enlace', urlEnlace('', o.u)])];
}
function tarjetaPerfil() {
  const P = D.perfil || {}; const nom = String(P.nombre || '').trim() || String((D.ajustes || {}).nombre || '').trim(); const h = new Date().getHours();
  const saludo = h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  const links = enlacesPerfil(P);
  return `<section class="tarjeta perfil-in"><div class="avatar-in">${P.foto ? `<img src="${P.foto}" alt="">` : esc((nom[0] || '✎').toUpperCase())}</div>
      <div class="perfil-txt"><div class="perfil-nom">${esc(nom || 'Tu nombre de autora')}</div>
        <div class="suave">${[P.usuario ? esc(P.usuario.startsWith('@') ? P.usuario : '@' + P.usuario) : '', esc(P.genero || '')].filter(Boolean).join(' · ') || 'Pon tu nombre, tu foto y tus enlaces en Ajustes'}</div>
        ${links.length ? `<div class="perfil-links">${links.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>` : ''}</div>
      <button class="btn" id="in-perfil">Editar perfil</button></section>`;
}
function seccionPerfil() {
  const P = D.perfil;
  const c = (k, t, v, ph = '') => `<label class="campo"><span>${t}</span><input data-pf="${k}" value="${esc(v || '')}" placeholder="${ph}"></label>`;
  return `<section class="tarjeta" id="aj-perfil"><h2>Tu perfil</h2>
    <div class="fila" style="gap:12px;align-items:center;margin-bottom:10px"><div class="avatar-in">${P.foto ? `<img src="${P.foto}" alt="">` : esc((String(P.nombre || '')[0] || '✎').toUpperCase())}</div>
      <button class="btn peq" id="pf-subir">${P.foto ? 'Cambiar foto' : 'Subir foto'}</button>${P.foto ? '<button class="btn peq" id="pf-quitar">Quitar</button>' : ''}</div>
    ${c('nombre', 'Nombre de autora', P.nombre)}<div class="rejilla r2" style="gap:10px">${c('usuario', 'Usuario', P.usuario)}${c('genero', 'Género', P.genero)}</div>
    <div class="rejilla r2" style="gap:10px">${c('enlaces.instagram', 'Instagram (usuario o enlace)', P.enlaces.instagram)}${c('enlaces.tiktok', 'TikTok (usuario o enlace)', P.enlaces.tiktok)}
      ${c('enlaces.amazon', 'Tu perfil de autora en Amazon', P.enlaces.amazon, 'https://www.amazon.es/stores/…')}${c('enlaces.web', 'Web', P.enlaces.web)}</div>
    <h4 class="sep-form">Más enlaces (newsletter, Goodreads, tu tienda…)</h4>
    ${P.otros.map((o, i) => `<div class="fila" style="gap:6px;margin-bottom:6px"><input data-pfo="${i}" data-c="t" value="${esc(o.t || '')}" placeholder="Nombre" style="flex:1"><input data-pfo="${i}" data-c="u" value="${esc(o.u || '')}" placeholder="Enlace" style="flex:2"><button class="btn peq" data-pfdel="${i}" title="Quitar enlace">✕</button></div>`).join('')}
    <button class="btn peq" id="pf-mas">+ Añadir enlace</button></section>`;
}
function enlazarPerfil(cont) {
  const P = D.perfil; const s = $('#aj-perfil', cont); if (!s) return;
  $$('[data-pf]', s).forEach(i => i.onchange = () => { const k = i.dataset.pf.split('.'); if (k.length === 2) P[k[0]][k[1]] = i.value.trim(); else P[k[0]] = i.value.trim(); cambio(false); });
  $$('[data-pfo]', s).forEach(i => i.onchange = () => { P.otros[+i.dataset.pfo][i.dataset.c] = i.value.trim(); cambio(false); });
  $$('[data-pfdel]', s).forEach(b => b.onclick = () => { P.otros.splice(+b.dataset.pfdel, 1); cambio(); });
  $('#pf-mas', s).onclick = () => { P.otros.push({ t: '', u: '' }); cambio(); setTimeout(() => { const x = $$('#aj-perfil [data-c="t"]'); if (x.length) x[x.length - 1].focus(); }, 50); };
  if ($('#pf-quitar', s)) $('#pf-quitar', s).onclick = () => { P.foto = ''; cambio(); };
  $('#pf-subir', s).onclick = () => {
    const i = el('input', { type: 'file', accept: 'image/*' });
    i.onchange = () => { const f = i.files[0]; if (!f) return; const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'), t = 240; c.width = c.height = t; const k = Math.max(t / img.width, t / img.height), w = img.width * k, h = img.height * k;
      c.getContext('2d').drawImage(img, (t - w) / 2, (t - h) / 2, w, h); P.foto = c.toDataURL('image/jpeg', .85); cambio(); aviso('Foto guardada'); }; img.src = URL.createObjectURL(f); };
    i.click();
  };
}
