'use strict';
// =====================================================================
//  Planner — Hábitos: una casilla por día y tu racha de días seguidos.
// =====================================================================

const habitoToca = (h, f) => !h.dias || !h.dias.length || h.dias.includes(diaSemana(f));
const habitoHecho = (h, f) => (D.habitosReg[f] || []).includes(h.id);
function alternarHabito(h, f) {
  const l = D.habitosReg[f] || (D.habitosReg[f] = []);
  const i = l.indexOf(h.id); if (i >= 0) l.splice(i, 1); else l.push(h.id);
  if (!l.length) delete D.habitosReg[f];
  cambio();
}
// Días seguidos cumplidos (solo cuentan los días que toca; hoy no rompe la racha si aún no lo has hecho)
function rachaHabito(h) {
  let f = hoy(), n = 0, vueltas = 0;
  if (!habitoHecho(h, f)) f = sumarDias(f, -1);
  while (vueltas++ < 800) {
    if (h.creado && f < h.creado) break;
    if (habitoToca(h, f)) { if (habitoHecho(h, f)) n++; else break; }
    f = sumarDias(f, -1);
  }
  return n;
}
function porcentajeMes(h, ym) {
  const H = hoy(); let toca = 0, hecho = 0;
  for (let f = primeroMes(ym); mesDe(f) === ym && f <= H; f = sumarDias(f, 1)) { if (h.creado && f < h.creado) continue; if (habitoToca(h, f)) { toca++; if (habitoHecho(h, f)) hecho++; } }
  return toca ? Math.round(hecho / toca * 100) : null;
}

VISTAS.habitos = (cont) => {
  const H = hoy();
  if (!UI.haSemana) UI.haSemana = lunesDe(H);
  const L = UI.haSemana, dias = [0, 1, 2, 3, 4, 5, 6].map(i => sumarDias(L, i));
  const ym = mesDe(H);
  cont.innerHTML = `<div class="pagina habitos">${cabecera('✔️ Hábitos', 'Lo que quieres mantener: marca cada día que lo haces y mira tu racha.', '<button class="btn prim" id="ha-nuevo">+ Hábito</button>')}
    ${D.habitos.length ? `<div class="nav-cal"><button class="icono" id="ha-ant" aria-label="Semana anterior">‹</button><h2 class="titulo-cal">${fechaDM(L)} – ${fechaDM(dias[6])}</h2><button class="icono" id="ha-sig" aria-label="Semana siguiente">›</button><button class="btn peq" id="ha-hoy">Esta semana</button></div>
    <section class="tarjeta tabla-habitos"><div class="fila-hab cab"><span></span>${dias.map(f => `<span class="${f === H ? 'hoy' : ''}">${may(DIAS[diaSemana(f)]).slice(0, 1)}<small>${aFecha(f).getDate()}</small></span>`).join('')}<span>Racha</span><span>${may(MESES[aFecha(H).getMonth()])}</span></div>
      ${D.habitos.map(h => { const r = rachaHabito(h), p = porcentajeMes(h, ym); return `<div class="fila-hab" data-hab="${h.id}"><button class="nombre-hab" data-editar-hab>${esc(h.nombre)}</button>${dias.map(f => !habitoToca(h, f) ? '<span class="no-toca">·</span>' : `<span><button class="check ${habitoHecho(h, f) ? 'on' : ''}" data-dia-hab="${f}" ${f > H ? 'disabled' : ''} aria-label="${esc(h.nombre)} ${f}">${habitoHecho(h, f) ? '✓' : ''}</button></span>`).join('')}<span class="racha">${r ? `🔥 ${r}` : '—'}</span><span class="tenue">${p === null ? '—' : p + ' %'}</span></div>`; }).join('')}
    </section>` : '<section class="tarjeta"><p class="vacio">Aún no tienes hábitos. Crea uno (por ejemplo «Gimnasio», «Leer 20 min» o «Escribir») y márcalo cada día que lo hagas.</p></section>'}
  </div>`;
  $('#ha-nuevo', cont).onclick = () => editarHabito({ dias: [0, 1, 2, 3, 4, 5, 6] }, { nuevo: true });
  if (!D.habitos.length) return;
  $('#ha-ant', cont).onclick = () => { UI.haSemana = sumarDias(L, -7); guardarUI(); pintar(); };
  $('#ha-sig', cont).onclick = () => { UI.haSemana = sumarDias(L, 7); guardarUI(); pintar(); };
  $('#ha-hoy', cont).onclick = () => { UI.haSemana = lunesDe(H); guardarUI(); pintar(); };
  $$('[data-hab]', cont).forEach(fl => {
    const h = D.habitos.find(x => x.id === fl.dataset.hab);
    $('[data-editar-hab]', fl).onclick = () => editarHabito(h);
    $$('[data-dia-hab]', fl).forEach(b => b.onclick = () => alternarHabito(h, b.dataset.diaHab));
  });
};

function editarHabito(h, { nuevo = false } = {}) {
  const dias = h.dias && h.dias.length ? h.dias : [0, 1, 2, 3, 4, 5, 6];
  modal(`<h3>${nuevo ? 'Nuevo hábito' : 'Hábito'}</h3>
    <label class="campo"><span>Qué quieres hacer</span><input id="hb-n" value="${esc(h.nombre || '')}" placeholder="p. ej. 🏋️ Gimnasio" autofocus></label>
    <div class="campo"><span>Qué días</span><div class="dias-hab">${DIAS.map((d, i) => `<label><input type="checkbox" data-d="${i}"${dias.includes(i) ? ' checked' : ''}> ${may(d).slice(0, 3)}</label>`).join('')}</div></div>
    <div class="pie">${nuevo ? '' : '<button class="btn peligro-suave" id="hb-borrar">Borrar</button>'}<span class="hueco"></span>${nuevo ? '' : '<button class="btn" id="hb-sub">↑</button><button class="btn" id="hb-baj">↓</button>'}<button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="hb-ok">Guardar</button></div>`, {
    clase: 'ficha',
    alAbrir: (m, cerrar) => {
      const ok = () => {
        const n = $('#hb-n', m).value.trim(); if (!n) { aviso('Ponle un nombre'); return; }
        const ds = $$('[data-d]:checked', m).map(c => +c.dataset.d);
        if (nuevo) D.habitos.push({ id: uid(), nombre: n, dias: ds, creado: hoy() }); else Object.assign(h, { nombre: n, dias: ds });
        cambio(); cerrar();
      };
      $('#hb-ok', m).onclick = ok;
      $('#hb-n', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
      if (!nuevo) {
        $('#hb-borrar', m).onclick = () => { cerrar(); borrarConDeshacer('habitos', h.id, `«${h.nombre}» borrado`); };
        const mover = (d) => { const i = D.habitos.indexOf(h), j = i + d; if (j < 0 || j >= D.habitos.length) return; [D.habitos[i], D.habitos[j]] = [D.habitos[j], D.habitos[i]]; cambio(); };
        $('#hb-sub', m).onclick = () => mover(-1); $('#hb-baj', m).onclick = () => mover(1);
      }
    }
  });
}
// Tarjeta para Inicio: los de hoy, para marcarlos de un toque
function tarjetaHabitosHoy() {
  const H = hoy(), hs = D.habitos.filter(h => habitoToca(h, H));
  if (!hs.length) return '';
  return `<section class="tarjeta"><div class="t-cab"><h2>✔️ Hábitos de hoy · ${hs.filter(h => habitoHecho(h, H)).length}/${hs.length}</h2><a href="#habitos" class="enlace">Ver</a></div>
    <div class="chips-hab">${hs.map(h => { const r = rachaHabito(h); return `<button data-hab-hoy="${h.id}" class="${habitoHecho(h, H) ? 'on' : ''}">${habitoHecho(h, H) ? '✓ ' : ''}${esc(h.nombre)}${r > 1 ? ` <i>🔥${r}</i>` : ''}</button>`; }).join('')}</div></section>`;
}
function enlazarHabitosHoy(cont) {
  $$('[data-hab-hoy]', cont).forEach(b => b.onclick = () => alternarHabito(D.habitos.find(h => h.id === b.dataset.habHoy), hoy()));
}
