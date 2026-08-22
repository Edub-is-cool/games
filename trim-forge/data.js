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
  { id: null,          name: 'Default',    hex: '#a06540' },
  { id: 'white',       name: 'White',      hex: '#f9fffe' },
  { id: 'light_gray',  name: 'Light Gray', hex: '#9d9d97' },
  { id: 'gray',        name: 'Gray',       hex: '#474f52' },
  { id: 'black',       name: 'Black',      hex: '#1d1d21' },
  { id: 'red',         name: 'Red',        hex: '#b02e26' },
  { id: 'orange',      name: 'Orange',     hex: '#f9801d' },
  { id: 'yellow',      name: 'Yellow',     hex: '#fed83d' },
  { id: 'lime',        name: 'Lime',       hex: '#80c71f' },
  { id: 'green',       name: 'Green',      hex: '#5e7c16' },
  { id: 'cyan',        name: 'Cyan',       hex: '#169c9c' },
  { id: 'light_blue',  name: 'Light Blue', hex: '#3ab3da' },
  { id: 'blue',        name: 'Blue',       hex: '#3c44aa' },
  { id: 'purple',      name: 'Purple',     hex: '#8932b8' },
  { id: 'magenta',     name: 'Magenta',    hex: '#c74ebd' },
  { id: 'pink',        name: 'Pink',       hex: '#f38baa' },
  { id: 'brown',       name: 'Brown',      hex: '#835432' },
];

/* The 16 real dyes, for banners and shields. */
const DYES = DYE_PRESETS.filter(d => d.id);

/* Shield banner patterns. `id` is the texture name; `item` is the id /give
   wants, which differs for a few of them. */
const SHIELD_PATTERNS = [
  { id: 'base', name: 'Field', item: 'base' },
  { id: 'border', name: 'Border', item: 'border' },
  { id: 'bricks', name: 'Bricks', item: 'bricks' },
  { id: 'circle', name: 'Circle', item: 'circle' },
  { id: 'creeper', name: 'Creeper', item: 'creeper' },
  { id: 'cross', name: 'Saltire', item: 'cross' },
  { id: 'curly_border', name: 'Curly Border', item: 'curly_border' },
  { id: 'diagonal_left', name: 'Diagonal L', item: 'diagonal_left' },
  { id: 'diagonal_right', name: 'Diagonal R', item: 'diagonal_right' },
  { id: 'diagonal_up_left', name: 'Diagonal UL', item: 'diagonal_up_left' },
  { id: 'diagonal_up_right', name: 'Diagonal UR', item: 'diagonal_up_right' },
  { id: 'flow', name: 'Flow', item: 'flow' },
  { id: 'flower', name: 'Flower', item: 'flower' },
  { id: 'globe', name: 'Globe', item: 'globe' },
  { id: 'gradient', name: 'Gradient', item: 'gradient' },
  { id: 'gradient_up', name: 'Gradient Up', item: 'gradient_up' },
  { id: 'guster', name: 'Guster', item: 'guster' },
  { id: 'half_horizontal', name: 'Half Horiz', item: 'half_horizontal' },
  { id: 'half_horizontal_bottom', name: 'Half Horiz B', item: 'half_horizontal_bottom' },
  { id: 'half_vertical', name: 'Half Vert', item: 'half_vertical' },
  { id: 'half_vertical_right', name: 'Half Vert R', item: 'half_vertical_right' },
  { id: 'mojang', name: 'Thing', item: 'mojang' },
  { id: 'piglin', name: 'Snout', item: 'piglin' },
  { id: 'rhombus', name: 'Lozenge', item: 'rhombus' },
  { id: 'skull', name: 'Skull', item: 'skull' },
  { id: 'small_stripes', name: 'Paly', item: 'small_stripes' },
  { id: 'square_bottom_left', name: 'Base DL', item: 'square_bottom_left' },
  { id: 'square_bottom_right', name: 'Base DR', item: 'square_bottom_right' },
  { id: 'square_top_left', name: 'Chief SL', item: 'square_top_left' },
  { id: 'square_top_right', name: 'Chief SR', item: 'square_top_right' },
  { id: 'straight_cross', name: 'Cross', item: 'straight_cross' },
  { id: 'stripe_bottom', name: 'Base', item: 'stripe_bottom' },
  { id: 'stripe_center', name: 'Pale', item: 'stripe_center' },
  { id: 'stripe_downleft', name: 'Bend S', item: 'stripe_downleft' },
  { id: 'stripe_downright', name: 'Bend', item: 'stripe_downright' },
  { id: 'stripe_left', name: 'Pale Dexter', item: 'stripe_left' },
  { id: 'stripe_middle', name: 'Fess', item: 'stripe_middle' },
  { id: 'stripe_right', name: 'Pale Sinister', item: 'stripe_right' },
  { id: 'stripe_top', name: 'Chief', item: 'stripe_top' },
  { id: 'triangle_bottom', name: 'Chevron', item: 'triangle_bottom' },
  { id: 'triangle_top', name: 'Inv Chevron', item: 'triangle_top' },
  { id: 'triangles_bottom', name: 'Base Indented', item: 'triangles_bottom' },
  { id: 'triangles_top', name: 'Chief Indented', item: 'triangles_top' },
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

/* Held items. `tex` is the sprite in TEXTURES, `item` the id for /give. */
const HELD_ITEMS = [
  { id: 'none', name: 'Empty', tex: null, item: null },
  { id: 'wooden_sword', name: 'Wood Sword', tex: 'wooden_sword', item: 'wooden_sword' },
  { id: 'stone_sword', name: 'Stone Sword', tex: 'stone_sword', item: 'stone_sword' },
  { id: 'iron_sword', name: 'Iron Sword', tex: 'iron_sword', item: 'iron_sword' },
  { id: 'golden_sword', name: 'Gold Sword', tex: 'golden_sword', item: 'golden_sword' },
  { id: 'diamond_sword', name: 'Diamond Sword', tex: 'diamond_sword', item: 'diamond_sword' },
  { id: 'netherite_sword', name: 'Netherite Sword', tex: 'netherite_sword', item: 'netherite_sword' },
  { id: 'diamond_axe', name: 'Diamond Axe', tex: 'diamond_axe', item: 'diamond_axe' },
  { id: 'netherite_axe', name: 'Netherite Axe', tex: 'netherite_axe', item: 'netherite_axe' },
  { id: 'diamond_pickaxe', name: 'Diamond Pick', tex: 'diamond_pickaxe', item: 'diamond_pickaxe' },
  { id: 'netherite_pickaxe', name: 'Netherite Pick', tex: 'netherite_pickaxe', item: 'netherite_pickaxe' },
  { id: 'trident', name: 'Trident', tex: 'trident', item: 'trident' },
  { id: 'mace', name: 'Mace', tex: 'mace', item: 'mace' },
  { id: 'bow', name: 'Bow', tex: 'bow', item: 'bow' },
  { id: 'crossbow', name: 'Crossbow', tex: 'crossbow_standby', item: 'crossbow' },
];

const PIECES = [
  { id: 'helmet', name: 'Helmet' },
  { id: 'chestplate', name: 'Chestplate' },
  { id: 'leggings', name: 'Leggings' },
  { id: 'boots', name: 'Boots' },
];
