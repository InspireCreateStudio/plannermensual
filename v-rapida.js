// Lista rápida: cosas sueltas sin fecha ni categoría, para tachar
function listaRapidaHTML({ compacta = false } = {}) {
  const pend = D.rapida.filter(r => !r.hecho), hechas = D.rapida.filter(r => r.hecho);
  const fila = (r) => `<li class="${r.hecho ? 'hecho' : ''}" data-rid="${esc(r.id)}"><button class="check" data-rcheck aria-label="${r.hecho ? 'Desmarcar' : 'Marcar hecha'}">${r.hecho ? '✓' : ''}</button><span class="rt" data-redit>${esc(r.t)}</span><button class="icono" data-rquitar title="Borrar">✕</button></li>`;
  return `<div class="rapida">
    <input class="rapida-nueva" placeholder="Escribe algo y pulsa Enter…" aria-label="Añadir a la lista rápida">
    <ul>${pend.map(fila).join('')}</ul>
    ${!pend.length ? `<p class="vacio">${hechas.length ? '🎉 Todo tachado' : 'Apunta aquí lo que no necesita fecha'}</p>` : ''}
    ${hechas.length && !compacta ? `<div class="rapida-hechas"><div class="t-cab"><span class="tenue">Hechas (${hechas.length})</span><button class="btn peq" data-rlimpiar>Quitar hechas</button></div><ul>${hechas.map(fila).join('')}</ul></div>` : ''}
    ${hechas.length && compacta ? `<p class="tenue peq">${plural(hechas.length, 'hecha', 'hechas')} · <button class="enlace" data-rlimpiar>quitar</button></p>` : ''}
  </div>`;
}
const rapidaVisible = () => $$('.rapida-nueva').find(n => n.offsetParent);
function enlazarListaRapida(cont) {
  const caja = $('.rapida', cont); if (!caja) return;
  const inp = $('.rapida-nueva', caja);
  inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = inp.value.trim(); if (!t) return;
    D.rapida.push({ id: uid(), t, hecho: false, creada: hoy() }); cambio();
    requestAnimationFrame(() => { const n = rapidaVisible(); if (n) n.focus(); });
  });
  caja.addEventListener('click', (e) => {
    if (e.target.closest('[data-rlimpiar]')) {
      const quitadas = D.rapida.filter(r => r.hecho);
      D.rapida = D.rapida.filter(r => !r.hecho); cambio();
      aviso(`${plural(quitadas.length, 'quitada', 'quitadas')}`, { t: 'Deshacer', fn: () => { D.rapida.push(...quitadas); cambio(); } });
      return;
    }
    const li = e.target.closest('[data-rid]'); if (!li) return;
    const r = D.rapida.find(x => x.id === li.dataset.rid); if (!r) return;
    if (e.target.closest('[data-rcheck]')) { r.hecho = !r.hecho; cambio(); return; }
    if (e.target.closest('[data-rquitar]')) { borrarConDeshacer('rapida', r.id, 'Borrado: ' + r.t); return; }
    if (e.target.closest('[data-redit]')) pedirTexto('Editar', r.t).then(t => { if (t && t.trim()) { r.t = t.trim(); cambio(); } });
  });
}
