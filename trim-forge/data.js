/* Trim Forge — armour materials, trim materials and smithing-template data.
   The artwork itself now comes from the game's own textures (textures.js), so
   this file only carries the metadata the UI needs: names, item ids, and where
   each smithing template is found. */

/* ---------------------------------------------------------------- armour --
   `tex` names the texture in TEXTURES ("armor/humanoid/<tex>"), `item` is the
   id prefix used to build /give commands (gold armour is "golden_helmet").
   `pieces` restricts a material to certain slots — turtle scute is a helmet. */

const ARMOR_MATERIALS = [
  { id: 'leather',   name: 'Leather',   tex: 'leather',   item: 'leather',   dyeable: true },
  { id: 'chainmail', name: 'Chainmail', tex: 'chainmail', item: 'chainmail' },
  { id: 'copper',    name: 'Copper',    tex: 'copper',    item: 'copper' },
  { id: 'iron',      name: 'Iron',      tex: 'iron',      item: 'iron' },
  { id: 'gold',      name: 'Gold',      tex: 'gold',      item: 'golden' },
  { id: 'diamond',   name: 'Diamond',   tex: 'diamond',   item: 'diamond' },
  { id: 'netherite', name: 'Netherite', tex: 'netherite', item: 'netherite' },
  { id: 'turtle',    name: 'Turtle',    tex: 'turtle_scute', item: 'turtle', pieces: ['helmet'] },
];

const DYE_PRESETS = [
  { name: 'Default',    hex: '#a06540' },
  { name: 'White',      hex: '#f9fffe' },
  { name: 'Light Gray', hex: '#9d9d97' },
  { name: 'Gray',       hex: '#474f52' },
  { name: 'Black',      hex: '#1d1d21' },
  { name: 'Red',        hex: '#b02e26' },
  { name: 'Orange',     hex: '#f9801d' },
  { name: 'Yellow',     hex: '#fed83d' },
  { name: 'Lime',       hex: '#80c71f' },
  { name: 'Green',      hex: '#5e7c16' },
  { name: 'Cyan',       hex: '#169c9c' },
  { name: 'Light Blue', hex: '#3ab3da' },
  { name: 'Blue',       hex: '#3c44aa' },
  { name: 'Purple',     hex: '#8932b8' },
  { name: 'Magenta',    hex: '#c74ebd' },
  { name: 'Pink',       hex: '#f38baa' },
  { name: 'Brown',      hex: '#835432' },
];

/* ------------------------------------------------------------ trim mats --
   Colours come from the game's 8-pixel palette files, not from here. */

const TRIM_MATERIALS = [
  { id: 'quartz',    name: 'Quartz' },
  { id: 'iron',      name: 'Iron' },
  { id: 'netherite', name: 'Netherite' },
  { id: 'redstone',  name: 'Redstone' },
  { id: 'copper',    name: 'Copper' },
  { id: 'gold',      name: 'Gold' },
  { id: 'emerald',   name: 'Emerald' },
  { id: 'diamond',   name: 'Diamond' },
  { id: 'lapis',     name: 'Lapis' },
  { id: 'amethyst',  name: 'Amethyst' },
  { id: 'resin',     name: 'Resin' },
];

/* A trim whose material matches its armour switches to the darker palette so
   it stays legible — these are the pairs the game ships a "_darker" file for. */
const DARKER_PAIRS = {
  copper: 'copper', iron: 'iron', gold: 'gold',
  diamond: 'diamond', netherite: 'netherite',
};

/* ------------------------------------------------------------- patterns -- */

const PATTERNS = [
  { id: 'sentry',    name: 'Sentry',    found: 'Pillager Outpost (chest)',        dupe: 'Cobblestone',        version: '1.20' },
  { id: 'vex',       name: 'Vex',       found: 'Woodland Mansion (chest)',        dupe: 'Cobblestone',        version: '1.20' },
  { id: 'wild',      name: 'Wild',      found: 'Jungle Temple (chest)',           dupe: 'Mossy Cobblestone',  version: '1.20' },
  { id: 'coast',     name: 'Coast',     found: 'Shipwreck (chest)',               dupe: 'Cobblestone',        version: '1.20' },
  { id: 'dune',      name: 'Dune',      found: 'Desert Pyramid (chest)',          dupe: 'Sandstone',          version: '1.20' },
  { id: 'eye',       name: 'Eye',       found: 'Stronghold (library chest)',      dupe: 'End Stone',          version: '1.20' },
  { id: 'host',      name: 'Host',      found: 'Trail Ruins (rare)',              dupe: 'Terracotta',         version: '1.20' },
  { id: 'raiser',    name: 'Raiser',    found: 'Trail Ruins (common)',            dupe: 'Terracotta',         version: '1.20' },
  { id: 'rib',       name: 'Rib',       found: 'Nether Fortress (chest)',         dupe: 'Netherrack',         version: '1.20' },
  { id: 'shaper',    name: 'Shaper',    found: 'Trail Ruins (common)',            dupe: 'Terracotta',         version: '1.20' },
  { id: 'silence',   name: 'Silence',   found: 'Ancient City (rare chest)',       dupe: 'Cobbled Deepslate',  version: '1.20' },
  { id: 'snout',     name: 'Snout',     found: 'Bastion Remnant (chest)',         dupe: 'Blackstone',         version: '1.20' },
  { id: 'spire',     name: 'Spire',     found: 'End City (chest)',                dupe: 'Purpur Block',       version: '1.20' },
  { id: 'tide',      name: 'Tide',      found: 'Elder Guardian (drop)',           dupe: 'Prismarine',         version: '1.20' },
  { id: 'ward',      name: 'Ward',      found: 'Ancient City (chest)',            dupe: 'Gilded Blackstone',  version: '1.20' },
  { id: 'wayfinder', name: 'Wayfinder', found: 'Trail Ruins (rare)',              dupe: 'Purpur Block',       version: '1.20' },
  { id: 'bolt',      name: 'Bolt',      found: 'Trial Chambers (vault)',          dupe: 'Copper Block',       version: '1.21' },
  { id: 'flow',      name: 'Flow',      found: 'Trial Chambers (ominous vault)',  dupe: 'Breeze Rod',         version: '1.21' },
];

const PIECES = [
  { id: 'helmet', name: 'Helmet' },
  { id: 'chestplate', name: 'Chestplate' },
  { id: 'leggings', name: 'Leggings' },
  { id: 'boots', name: 'Boots' },
];
