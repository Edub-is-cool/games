'use strict';

// Royal families. When a ruler dies the crown passes down the family: eldest
// child first, then the ruler's partner, then a brother or sister. With no
// heir at all, a big kingdom may tear itself apart in a succession war.
// Rulers of friendly kingdoms sometimes marry, which makes their kingdoms allies.

// the heir to a ruler: eldest living child in the kingdom, else their partner, else a sibling
function heirOf(k, rulerId, rulerParents = []) {
  const ours = o => !o.dead && RACES[o.race].civ && kingdomOf(o) === k.id && o.id !== rulerId;
  const byAge = list => list.sort((a, b) => b.age - a.age)[0];
  return byAge(life.units.filter(o => ours(o) && o.parents && o.parents.includes(rulerId)))
    || life.units.find(o => ours(o) && o.love === rulerId)
    || byAge(life.units.filter(o => ours(o) && o.parents && o.parents.some(p => rulerParents.includes(p))))
    || null;
}

const _kingOfRoyal = kingOf;
kingOf = function (k) {
  const cur = k.king && life.byId.get(k.king);
  if (cur && !cur.dead && kingdomOf(cur) === k.id) return cur;
  // the old ruler is gone: look down the family line first
  if (k.king && k.crowned) {
    const oldId = k.king, heir = heirOf(k, oldId, k.rulerParents || []);
    k.king = 0;
    if (heir) {
      crown(k, heir);
      if (villagesOf(k.id).length >= 2) {
        const rel = heir.parents && heir.parents.includes(oldId) ? 'child' : heir.love === oldId ? 'partner' : 'sibling';
        chronicle(`👑 ${heir.name}, ${rel} of the late ruler, inherits the throne of the ${k.name}`);
      }
      return heir;
    }
    // no heir: a far city may claim the crown for itself
    const cities = villagesOf(k.id);
    if (cities.length >= 3 && laws.rebellions && rand() < 0.5) {
      const cap = life.villages.get(k.capital);
      const claimant = cities.filter(v => v.id !== k.capital).sort((a, b) => (cap ? dist(b.x, b.y, cap.x, cap.y) - dist(a.x, a.y, cap.x, cap.y) : 0))[0];
      if (claimant) {
        chronicle(`⚔ With no heir to the throne of the ${k.name}, ${claimant.name} claims the crown: a succession war!`);
        rebel(claimant, k);
      }
    }
    if (!life.kingdoms.has(k.id)) return null;
  }
  const king = _kingOfRoyal(k);
  if (king) k.rulerParents = king.parents || [];
  return king;
};

function crown(k, u) {
  k.king = u.id;
  k.crowned = true;
  k.rulerParents = u.parents || [];
  u.king = k.id;
  u.role = 'worker';
}

// ---------- Royal marriages ----------
function royalMarriages() {
  const ks = [...life.kingdoms.values()];
  if (ks.length < 2) return;
  const a = pick(ks), b = pick(ks);
  if (a === b || a.wars[b.id] || alliesOf(a)[b.id]) return;
  const ra = kingOf(a), rb = ra && kingOf(b);
  if (!ra || !rb || ra.love || rb.love || !isAdult(ra) || !isAdult(rb)) return;
  if (rand() > 0.35) return;
  ra.love = rb.id;
  rb.love = ra.id;
  alliesOf(a)[b.id] = true;
  alliesOf(b)[a.id] = true;
  ra.happy = Math.min(100, (ra.happy ?? 60) + 20);
  rb.happy = Math.min(100, (rb.happy ?? 60) + 20);
  chronicle(`💍 ${ra.name} of the ${a.name} married ${rb.name} of the ${b.name}; the two kingdoms are now allies`);
}

const _politicsTickRoyal = politicsTick;
politicsTick = function () {
  _politicsTickRoyal();
  if (state.tick % (2 * YEAR) === 0) royalMarriages();
};

// the heir shows in a ruler's info
const _unitExtraRowsRoyal = unitExtraRows;
unitExtraRows = function (u) {
  const rows = _unitExtraRowsRoyal(u);
  const k = u.king && life.kingdoms.get(u.king);
  if (k && k.king === u.id) {
    const heir = heirOf(k, u.id, u.parents || []);
    rows.splice(1, 0, ['Heir', heir ? unitLink(heir.id) : 'None (a succession war may follow)']);
    if (u.love) rows.splice(2, 0, ['Married to', unitLink(u.love)]);
  }
  return rows;
};
