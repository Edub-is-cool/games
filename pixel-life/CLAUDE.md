# Pixel Life

## Overview
A god-simulator sandbox that closely follows **WorldBox**. The player shapes a pixel world, drops in creatures and watches civilizations grow, trade, fight and fall. Unlike WorldBox, **nothing is paywalled**: every power, race and feature is unlocked from the start. There are no ads, no premium tier and no in-game purchases.

## Tech Stack
- **HTML5 Canvas**: rendering (pixel-perfect, `image-rendering: pixelated`)
- **CSS3**: toolbar, panels and menus
- **Vanilla JavaScript**: simulation, input, state
- No external dependencies or frameworks (matches `ore-bit/`, `emoji-battle/` and `FARKLE/`)

## Core Features (WorldBox-style)
- **World generation**: a random tile map of deep ocean, shallow water, sand, grass, forest, hills, mountains and snow
- **Terrain painting**: brush tools to raise/lower land and paint any tile type, with adjustable brush size
- **Creatures**: spawn races (humans, elves, orcs, dwarves) and animals (sheep, wolves, etc.)
- **Civilizations**: units gather resources, build villages, form kingdoms, expand borders, make alliances and go to war
- **God powers**: lightning, fire, meteors, rain, earthquakes, bombs, plague, blessings, and more
- **Simulation controls**: pause, play and speed-up; click a unit, village or kingdom to inspect it
- **Saving**: save and load worlds to `localStorage` (key `pixellife-save-v1`)

## Build Status
- **Done (milestone 1):** world generation (Small / Medium / Large), terrain painting, raise/lower land (keeps slopes to one level, so land grows beaches → hills → peaks), forest spread, lava that flows, cools and hardens next to water, time controls with a year/month calendar, save/load
- **Done (milestone 2):** creatures and civilizations (see below), farmland tile, Inspect tool
- **Done (milestone 3):** god powers (see below), scorched-earth tile, screen shake and effects
- **Done (milestone 4):** biomes (see below), biome wildlife, brush shapes
- **Done (milestone 5):** docks and boats, sapient animals (see Creatures)
- **Done (milestone 6):** 15 more animals, mythical creatures, wizards, plague doctors, faeries, status powers (curse/shield/cure/clear), languages, religions, cultures, families, alliances, equipment, genetics with discoverable traits, achievements, forget powers, creature editor
- **Done (milestone 7):** creature control; WorldBox-research features: history log, statistics graphs, world laws, rebellions, random world events, century summaries, 50×/100× timelapse speeds, follow & favorites, family links, grey goo, Crabzilla, map export/import, map shapes (Island, Continents, Pangaea, Archipelago, Earth), Huge worlds, pick-up tool, biome-shaped cultures, hunting
- **Done (milestone 8):** the full WorldBox feature list from research, in seven new files (see below): cataclysms, explosives, god-hand and cleanup tools, automata and more clouds; walls, 16 more biomes, ores, plants and creep; 14 more animals, biome creatures, named sapient forms, monsters, towers and monster cores, infections; personality/body/elemental/chaos traits, levels, titles, combat moves, statuses, happiness, mana; life and desire powers; city buildings, styles and tiers, books, money and trade, ruins, materials; kings, armies, plots, rites, meta traits, subspecies, ages, invasions, Rat King, diplomacy powers, ~30 more world laws; map layers, lists, mind and family tree, Eye of Insight, thought bubbles, event pop-ups, bookmarks, god name, richer graphs
- **Next:** ideas: tornadoes, armies with captains, books/plots, multi-unit select

## Biomes
- `BIOMES` in `game.js`: Grassland, Savanna, Desert, Jungle, Swamp, Tundra, Corruption, Enchanted. Each has a `ground` tile and a `tree` tile (Desert has none). Biome tiles carry `biome`, `kind` ('ground' / 'tree') and `fertile` in `TILES`. Helpers: `biomeOf`, `isTree`, `isGround`, `isPlant`, `inBiome(t, key)`, `localGround(x, y)`.
- **Generation:** temperature (cold toward the top/bottom of the map and up high) plus moisture noise pick the biome for each lowland tile (`climateBiome`). Cold shallow water freezes into **Ice** (walkable, not buildable; fire and lava melt it). Every world gets a small enchanted patch. Corruption only comes from the player.
- **Biomes tab:** a brush per biome converts plants, burnt land (and sand, for Desert) while keeping trees as trees.
- **Sim:** trees seed into ground of their own biome. Corruption creeps into neighboring land (enchanted resists). Burnt land, abandoned fields and reshaped land regrow as the surrounding biome (`localGround`). Rain turns desert into savanna; Blessing purifies corruption.
- **Gameplay:** races found villages on their preferred biomes (`home` in `RACES`); desert and corrupted ground can't be farmed; any tree gives wood. Corrupted land can drive creatures mad; enchanted land heals. Fire spreads at different rates per biome (`SPREAD`); desert and swamp don't burn.
- **Wildlife:** animals with a `habitat` spawn naturally in their biome, a pair at a time, up to a few of each (`spawnWildlife`): sheep, wolves and bears (grassland), camels (desert/savanna), monkeys (jungle), crocodiles (swamp), wolves and polar bears (tundra), unicorns (enchanted), ghouls (corruption).

## Society (society.js)
- **Languages:** every kingdom gets a generated language (`makeLanguage`, built from its race's name sounds). Village, kingdom and clan names come from it (`nameIn`). Villagers show speech bubbles in their own language (`chatter`, `drawSpeech`). Old kingdoms sometimes drift into a dialect ("New …", "Low …").
- **Religions:** a village of 10+ may get a prophet and found a religion (`foundReligion`). Faith spreads from the capital and from nearby villages (`updateFaith`, `setReligion` converts the whole village). Village labels show the religion symbol.
- **Cultures:** each kingdom has a culture with 2 traits (`CULTURE_TRAITS`: warlike, farmers, scholars, builders, seafarers, smiths). Creature bonuses use the creature's own culture (`cultureMult`); village bonuses use the kingdom's (`kingdomHas`).
- **Families:** creatures carry a clan name and their parents' ids. Babies take a parent's clan (`bornInto`). Family members defend each other (`familyDefends`).
- **Per-creature identity:** `u.language`, `u.culture`, `u.religion` and `u.clan` are learned on joining a village (`learnWays`). Forgotten ones slowly come back (`relearn`). If 70% of a capital forgets its language or culture, the kingdom invents a new one; if 70% of a village forgets its faith, the village loses it (`checkHeritage`).
- **Diplomacy:** `diplomacy` (every 60 ticks) handles peace, alliances and wars. Same faith or language makes war rarer and alliances likelier; different faiths start holy wars. Allies join each other's wars (`callAllies`).

## Equipment & Genetics (gear.js)
- **Gear** (`GEAR`): weapons (club, spear, bow, battle axe, sword, magic staff), armor (leather, chainmail, plate, enchanted), tools (hoe, woodcutter's axe, pickaxe). Villages craft gear from food/wood/stone (`craftGear`), warriors first. Weapons add damage and reach (bows and staffs shoot), armor cuts damage taken (plate slows), and tools make their job faster with a 50% bigger yield. Gear is drawn on the sprite (`gearArt`). The staff and enchanted armor can only be given through the editor.
- **DNA:** six genes (strength, vitality, speed, lifespan, fertility, intellect), averaged from both parents with drift and occasional mutations (`inheritDna`). Intellect makes animals far likelier to become sapient.
- **Traits** (`TRAITS`): named mutations that multiply genes. Natural traits (Strong/Weak, Tough/Frail, Swift/Slow, Long-lived/Short-lived, Fertile/Barren, Clever/Dim) pass to children half the time and appear rarely on their own. Some races always have certain traits (`RACE_TRAITS`, e.g. orcs are Strong, dwarves Tough). Legendary traits (Titan, Immortal, Genius, Regenerating, Lightning Reflexes) come only from achievements.
- **Discovery:** a trait can only be edited in after it has been discovered, by a creature being born with it (natural) or by earning its achievement (legendary). Progress is saved across worlds in `localStorage` (`pixellife-progress-v1`). Achievements (`ACHIEVEMENTS`) are checked every 50 ticks and listed under World → Achievements.
- **Editor:** inspecting a creature (click its sprite; `hitboxes` stores where each one was drawn) opens equipment dropdowns, a DNA readout with gene bars, and trait chips (locked ones show 🔒 ???). The editor (`#infoEdit`) is rebuilt only when the selection changes, so dropdowns don't reset while you use them.

## The World (world.js)
- **History:** `chronicle(msg)` shows a toast *and* writes the event to `life.history` (saved). Wars, peace, alliances, founders, captures, falls, prophets, schisms, rebellions, awakenings and events all go through it. World → 📜 History lists it.
- **Statistics:** `recordStats` samples people, animals, kingdoms, villages and each kingdom's population once a year into `life.stats` (saved, thinned past 400 samples). World → 📈 Statistics draws population and top-kingdom line charts (`drawStatsCharts`).
- **World laws** (`LAWS`, `state.laws`; carried across new worlds and saved): aging, rebellions, alliances, animal awakening, mutant births, wildlife spawns, corruption spreading, world events, war frequency and birth rate. World → ⚖ World Laws has checkboxes and selects.
- **Rebellions:** in kingdoms with 4+ villages, a village far from the capital, of another faith, or in a kingdom at war may break away (`rebel`), taking nearby villages with it, and starts a war of independence.
- **World events** (`WORLD_EVENTS`, every 4 years with a 60% chance): golden age (double births, bigger harvests for 10 years), religious schism, migrant wave, famine, plague outbreak, comet. Famines and outbreaks only hit established kingdoms and villages.
- **Century summary** every 100 years goes into the history.
- **Favorites & following:** the creature editor has 👁 Follow (camera lock; panning stops it), ☆ Favorite and 🎮 Control buttons. World → ⭐ Favorites lists favorites; names in the side panel (parents, children, favorites) are clickable (`data-unit`).
- **Map sharing:** World → 📤 Share Map shows a `PL1:<W>x<H>:<base64>` code (run-length-encoded terrain, `exportMap`) and loads pasted codes (`importMap`). Terrain only.
- The laws and share panels are built into `#infoEdit` by `refreshWorldPanel` (called from `refreshEditor`).

## Disasters & tools (disasters.js)
Loaded after powers.js; registers its own `POWERS` and `POWER_GROUPS` entries at the bottom. Moving things and placed objects live in `disasters` (not saved).
- **Cataclysms:** tornado (wanders, throws creatures with `throwUnit`, tears trees and buildings), volcano (raises a cone, erupts for 5 years), black hole (pulls, swallows, sinks the land), UFO (abducts people, zaps buildings, drops aliens), heat ray (heats tiles until they melt), Infinity Coin (kills half of all life).
- **Explosives:** grenade, napalm (a carpet of fire bombs), antimatter (deletes land), Tsar Bomba, crab bomb; placed objects (`OBJECT_TYPES`): TNT (set off by fire or fuses), timed TNT, water bomb (goes off in water and scoops a pond), landmine (stepped on), fireworks (festive), bowling ball (rolls and flattens). `boom()` blasts and chains to nearby explosives. Fuses are painted lines (`disasters.fuse`) that burn along and light explosives.
- **Hands of God:** force (radial push), flick (throw one creature far), finger (smear tiles along your drag), vortex (swirl tiles), heat/cold brushes (`WARMER`/`COLDER` tile tables; cold freezes creatures).
- **Cleanup:** sponge, sickle, bucket, pickaxe, spade, axe, demolish, life eraser (`CLEANUP`).
- **Automata:** Langton ants (blue/green/black/red), sand spider, worm, pink/green Game of Life cells (`disasters.cells`), printers that draw a heart, skull, spiral, star, labyrinth or crater (`PRINTS`).
- **More clouds:** thunder, hell, lava, ash, magic, snow (added to `CLOUDS`; `cloudTick` hands them to `extraCloudTick`).

## More terrain (terrain2.js)
Loaded right after game.js. `addTile(key, props)` appends tiles (ids stay stable) with optional `group` (Terrain tab heading), `wall`/`ore`/`plant`/`creep` flags, `burn` (fire spread) and `dots` (speckles drawn by `tileColor`).
- **Walls** (`WALLS`): stone, wood, iron (spiked), evil, ancient, green (regrows), light. They block movement; each has hp (`hitWall`). Warriors marching on a city hack through walls in the way.
- **16 more biomes** (`MORE_BIOMES`): birch, maple, mushroom, candy, garlic, lemon, crystal, rocklands, permafrost, flower meadow, clover, celestial, infernal, singularity swamp, paradox, arcane desert. Each has a biome brush; `biomeEffect` gives them effects (garlic hurts undead, celestial blesses, clover heals, infernal scorches, singularity teleports, paradox makes creatures younger, permafrost freezes).
- **Ores** (stone, iron, silver, gold, mythril, adamantine) generated in veins on hills (`decorateWorld`). Miners prefer them; they give stone plus a metal (`v.metals`) used by the smithy.
- **Plants:** fruit bushes (picked for food), flowers, mushrooms; they spread on fertile ground (`terrainExtraTick`). Fertilizer power grows trees and plants.
- **Creep:** tumor, biomass, pumpkin and cybercore ground, grown by monster cores; it fades when its core is gone (unless Forever Creep).

## More creatures (creatures2.js)
Loaded after disasters.js (it registers powers).
- **Animals:** armadillo, raccoon, alpaca, capybara, goat, ostrich, scorpion (venomous), piranha (`aquatic`: water only), seal (`swims`), beetle, bee (pollinates), butterfly, grasshopper (eats crops), fly.
- **Biome creatures:** flower bud, crystal sword, Bitba, Garl, Smore, acid blob; their sapient forms are Lulliars, Crystal Golems, Lemon Men, Garlic Men, Candy Men and Acid Gentlemen. `SAPIENT_FORMS` names every animal's people (Meowmorphs, Barkfolk, Mootaurs, Navy Seals...).
- **Monsters and magic folk** with `special` behaviors (`SPECIALS`): cold ones, demons, Angles, aliens, snowmen, fire elementals, fire skulls, rude skulls (bounce), ghosts, Greg, necromancers (raise the fallen), druids (grow and heal), bandits (throw TNT), Robot Santa (drops bombs), God Finger (casts random powers), and core minions.
- **Structures** (`life.structures`, saved): tumor/biomass/pumpkin/cyber cores spread creep and spawn minions; ice, flame and Angle towers change the land and spawn their creatures. Villagers attack hostile ones (`HOSTILE_STRUCTURES`); fire, lava and water wear them down.
- **Infections:** zombie, mush spores, tumor; spread by contact and turn the dead into monsters (`DEATH_HOOKS` in creatures.js run on every death).

## Traits, statuses & life powers (traits2.js)
- **New traits** (`NEW_TRAITS`, grouped by `cat` in the editor): Mind (ambitious, honest, pacifist, bloodlust, psychopath, thief, wise, strong-minded, evil, magic-gifted...), Body (giant/tiny change sprite size, fat, agile, hard/soft skin, eagle-eyed...), Elemental (fire/acid blood, fire/frost/acid proof, venomous, thorns, auras, bubble defense...), Chaos (death bomb, death nuke, energized, mega heartbeat, whirlwind, mark of death, pyromaniac, bomberman), Titles earned by deeds (veteran, kingslayer, dragonslayer, mageslayer). `RACE_TRAITS` extended; egg-laying kinds hatch (`EGG_LAYERS`).
- **Levels:** XP from kills (`onKill`), +5% stats per level (`extraStatMult`). **Combat moves:** dodge, block, deflect and dash cost stamina (`defend`, `tryDash`); thorns, venom and whirlwind in `afterHit`. **Mana and spells** for casters (`trySpell`: fireball, lightning, blink home, summon skeletons).
- **Statuses** (`statusTick`, every creature every tick): poison, burning, sleep (with dreams), eggs, stun, frozen, love (lovers are happier and have kids), crying, tantrums, festive, coffee, power-up, pregnant, desires. Icons drawn by `drawStatusIcons`. **Happiness** (`u.happy`) drifts to 60; family deaths, hunger, conquest and ages move it.
- **Life powers:** coffee, power-up, sleep, dispel, Blood Rain, Divine Light, clone rain, Smooth Jazz, Gamma/Omega/Delta trait rains, loot rain. **Desires:** Golden Egg, Ethereal Harp, Alien Mold, Evil Computer plus desire brushes (creatures travel there and are changed), Golden Brain (draws zombies), Corrupted Brain (spreads madness), living plants and houses.

## Cities (cities.js)
- **Special buildings** (`CITY_BUILDINGS`): bonfire, well (happiness, puts out fires), windmill (+25% harvest), watchtower (shoots arrows), barracks (trains warriors), temple (spreads the faith), market (gold, trade), library (writes books), statue. Built by `cityTick` when the village is big and rich enough; each gets a road to the hall (`ROAD` tile, +25% speed).
- **Styles and tiers:** houses look different per race (`HOUSE_STYLES`) and move from straw huts (tier 1) to race colors (2) to stone (3) as the village grows.
- **Books:** libraries write books (`life.books`) in the author's language that teach an idea (a mind trait) to readers. **Money:** villages earn gold from people and markets, pay a little tax into the kingdom treasury; trade ships (`life.traders`) sail between docked market towns. **Ruins** stay where buildings fell for 10 years (sponge clears them).
- **Materials:** copper → bronze → iron → silver → mythril → adamantine (`MATERIALS`, ×1–×2 damage/defense); the smithy uses mined metals (`onCrafted`). Fine weapons get names and count kills. Editor has material dropdowns.
- **City walls:** big stone-rich cities at war ring themselves with walls and gates (`buildWalls`); their own people pass through (`ownWall`), enemies must break them.

## Politics (politics.js)
- **Kings:** each kingdom crowns its most renowned adult (`kingOf`, crown drawn above them); kings flee before the capital falls (`kingFlees`); their traits tilt war and alliance odds (`kingMood`). **Renown** grows with size and conquest. Xenophobic cultures raze foreign cities instead of capturing them.
- **Armies** (law): at war, warriors gather at the capital under a captain, then march together (`armyTick`, `armyOrders`); a dashed line shows the march.
- **Plots** (law): kings with renown and gold scheme alliances, wars, peace or rebellions abroad (`PLOTS`). **Magic rites** (law): religions with temples cast madness, vines, rebellion, quakes, hellfire or ascension.
- **Meta traits** (`META_TRAITS`) on languages (doomed glyphs, beautiful script...), religions (zealous, pacifist, blood cult, healing, crusader), clans (warrior, long-lived...), kingdoms (expansionist, isolationist, mercantile, militarist) and more culture traits (xenophobic, xenophile, join-or-die).
- **Subspecies** (`life.subspecies`): rare births start a named subspecies with a color tint and an adaptation trait (`maybeSubspecies`). **World ages** (every 50 years: Hope, Sun, Dark, Tears, Moon, Chaos, Wonders, Ice, Ash, Despair) tint the screen and change weather and moods. **Invasions** (law) every few years (`INVASIONS`). **Rat King:** 20 rats packed together start a plague.
- **Diplomacy powers:** Spite, Friendship, Inspiration, Whisper of War, Discord, Unity (click a kingdom).
- **More world laws** (`MORE_LAWS`, grouped in the World Laws panel): 100 people, expansion, stealing borders, terramorphing, angry villagers, armies, plots, rites, handsome migrants, babies, hunger, peaceful monsters, evolution, Gene Spaghetti, Mutant Box, Glitched Noosphere, clouds of life, natural disasters, invasions, Gaia's Covenant, forever creep, eternal lava, forever cold, high flora, erosion, minerals, biome overgrowth, entanglewood, root pranks, nectar nap, exploding mushrooms.

## Interface (ui2.js)
- **Layers tab:** color borders by kingdoms, cities, alliance blocs, religions, cultures or languages (`overlayGroup`, used by `rebuildOverlay`), or mark creatures by clan or subspecies; toggle war lines and Eye of Insight (rings creatures carrying undiscovered traits).
- **World → 📋 Lists:** sortable lists of kingdoms, cities, wars, alliances, armies, plots, religions, cultures, languages, clans, subspecies and books; names jump the camera there. Renamed things keep `pastNames`.
- **Unit inspector:** mind summary and a family tree (grandparents to grandchildren); arrows to home, lover, parents, children and target. **Thought bubbles** show what villagers are thinking. **Event pop-ups** for big events.
- **Camera:** Ctrl+1–9 saves a bookmark, 1–9 jumps back; saves keep the camera and bookmarks. Speeds ½× to 100×. **God name** (World tab) shows in the title and in books and faiths. Statistics add a wealth/renown chart and hover tooltips with changes.

## God Powers (powers.js)
- **Click powers** (fixed radius, hold to repeat where noted): Lightning (hold), Meteor (hold; crater + lava), Bomb (hold), Nuke (once per click; huge crater, ash, mushroom cloud), Earthquake (once per click; cracks land, collapses houses)
- **Brush powers** (use the brush size, hold to keep applying): Fire, Rain (puts out fire, cools lava, regrows ash), Plague, Blessing (full heal, +50% health and damage, cures, lifts curses), Madness (attack anyone for 2 years; blessed units are immune), Curse (−40% health and damage, removes blessing), Shield (immune to all damage, drowning and lava for 2 years; a bubble is drawn around them), Cure (removes plague and madness, full heal, plague survivors become immune), Clear Effects (removes every status, good or bad). Stat changes go through `statMult(u)`; status markers: red mad, green sick, purple cursed, gold blessed
- **Fire** spreads by chance each tick (`SPREAD`: forest > farm > grass), burns houses and halls, hurts units standing in it, and leaves Scorched Earth that regrows to grass. Rates are tuned so grass fires fizzle and forest fires stay regional. Lava sets nearby plants alight.
- **Monolith** (Ancient group): places an ancient stone (`placeMonolith`, stored in `life.monoliths` and saved). Every `MONOLITH_PULSE` ticks it pulses a ring out to `MONOLITH_RANGE` tiles. Each adult animal in range may awaken as a sapient race (`MONOLITH_CHANCE`, scaled by intellect, and it needs company of its kind). Blasts, lava and water destroy it.
- **Geysers** (Nature group): ⛲ Geyser and 🧪 Acid Geyser place a vent (`placeGeyser`, stored in `life.geysers` and saved). Every few months each one erupts for several ticks (`geyserTick`), spraying droplets (`jet` effect) out to `GEYSER_RANGE` tiles. Water rains on the tiles it hits (`rainOn`: puts out fire, cools lava, regrows ash, greens desert). Acid burns plants to ash, melts ice, and hurts creatures and buildings in range (`acidOn`). Blasts, lava and water destroy them.
- **Weather clouds** (Weather group, hold to drop more): Rain, Storm, Acid, Rage and Life clouds (`placeCloud`, `CLOUDS`, `powers.clouds`). Each drifts with a slowly turning wind (`powers.wind`) for 2–3 years, then fades; `cloudTick` runs every sim tick and `drawClouds` draws the puffs above a ground shadow. Rain uses `rainOn`; Storm adds random lightning; Acid uses `acidOn` and hurts creatures and buildings below; Rage drives unblessed creatures mad; Life now and then drops a random being (`randomBeing`: any race except dragons and sapient animals). Clouds aren't saved.
- **Grey Goo** (Destruction): eats land, trees and buildings in a spreading wave (`startGoo`, `gooTick`; `powers.goo` holds each tile's remaining generations, `powers.gooFront` the growing edge). It burns out after ~45 generations and the goo crumbles into scorched earth. Creatures on goo are consumed.
- **Mind powers:** Forget Language, Forget Culture, Forget Religion, Forget Family, and Total Amnesia (all four plus grudges).
- **Plague** spreads by contact (within 2.5 tiles) among people or among animals, drains health, and survivors become immune.
- Effects (`powers.effects`) and screen shake run in real time, even when paused. Sim effects (fire) run on sim ticks. Fires aren't saved.

## Creatures (creatures.js)
- **Animals:** grazers (sheep, cows, camels, rabbits, chickens, buffalo, rhinos, penguins, frogs, crabs, turtles, monkeys, rats) breed and flee predators; hunters (wolves, bears, polar bears, foxes, cats, dogs, hyenas, snakes, crocodiles) chase their `prey` and starve if they can't eat. Each species is capped by world size (one per `cap * ANIMAL_SPREAD` tiles), and all animals together by `MAX_ANIMALS` (650), so people always have room for children.
- **Mythical:** unicorns and faeries (fly; spread enchanted land) live in enchanted biomes. Ghouls and zombies (whose victims rise as zombies) haunt corruption. Skeletons are raised by evil wizards. Dragons nest in the mountains (at most one at a time), fly, and breathe fire. `monster`/`undead` creatures never starve and always hunt.
- **Crabzilla** (spawn only): a giant crab that wades through water (`swims`) and fires eye lasers (`fireLaser`). Best played with 🎮 Control.
- **Hunting:** villages on poor land (desert, tundra, corruption, rock) send workers to hunt grazing animals for meat; elsewhere they hunt now and then when food is short (`isGame`, task `hunt`).
- **Cultures** take a trait from the land the kingdom was founded on (`BIOME_CULTURE`, seafarers on coasts).
- **Magic folk** (spawn only): Good Wizards smite evil, heal, cure, shield people and purify corruption. Evil Wizards throw fireballs, curse people, corrupt land and raise skeletons. Plague Doctors walk to the sick and cure them (`updateWizard`).
- **Civilized races:** humans, elves, orcs, dwarves. Homeless adults found a village on their home terrain, which starts a new kingdom (or extends theirs if they're settlers).
- **Villages:** a hall plus 2×2 houses. Workers farm (grass → farmland), chop forest, mine hills/mountains, and carry the goods back to the hall. Food feeds people (1 a year each) and allows births; wood/stone build houses, which raise the population cap and grow the territory.
- **Expansion:** big villages send 3 settlers 18–34 tiles away to found a new village in the same kingdom.
- **War:** neighboring kingdoms randomly declare war (orcs most often, elves least; different races more often) and make peace after a few years. Villages raise warriors in wartime. Warriors march on the nearest enemy village, fight defenders and attack the hall; a destroyed hall means the village is captured. A kingdom with no villages falls.
- **Boats:** villages with 8+ people and 10 wood build a **dock** on their shore (`findDockSpot`). Every adult of a kingdom with a dock (`life.sailing`, rebuilt each tick in `rebuildGrid`) can sail: `moveToward` lets them onto water, where they ride a boat (`u.boat`, drawn with a sail in the kingdom color) and move faster. Settlers of seafaring kingdoms look up to 68 tiles away, so they colonize other islands, and warriors sail to enemy villages. Animals can't cross water. Anyone standing on land that turns into water (without a boat) drowns. Units die in lava. Painting over a hall destroys its village.
- **Easter egg: Super Fox** (`superfox` in `RACES`, `hidden: true`, `hero: true`): renaming a fox `EWAHLSTER` (any case) with the ✏️ turns it into a Super Fox (`becomeSuperFox` in `gear.js`), but only the first time ever (once unlocked, renaming does nothing special), and unlocks the race in the Creatures tab (saved in `progress.unlocked`). Super Foxes are born sapient: a civilized race (title 'Den', its own names and language) with intellect far above anything else (`SUPERFOX_INTELLECT` = 10 plus Genius and Clever, about 25 vs a normal max of 2.5, so they work almost instantly). On spawn (`RACES.superfox.onSpawn`) each one is blessed, plague-immune, and wears the full Foxyite set (drawn into its own art at double detail: gold crown, purple cape, Fang Blade in its jaws, Foxyite band; `drawsGear: true` skips the generic `gearArt` column) (Fang Blade, Armor, Multitool; `secret: true` gear that only Super Foxes can pick in the editor). 5000 base health, 120 damage, normal aggression (they start wars like anyone), capped at 30 alive at once (`maxPop`, checked by `atRaceCap` in `spawnUnit`, so spawning, births and the EWAHLSTER rename all stop at 30), and they attack monsters, undead and evil wizards within 16 tiles. Hidden races never spawn wild, from Life Clouds, or awaken.
- **Sapient animals:** each adult animal has a tiny chance per tick (`MUTATION_CHANCE`, about one awakening per century in a normal world) to wake up along with up to 4 nearby adults of its kind. They become a new civilized race (`makeSapientRace`, key `<animal>_folk`, e.g. "Sapient Sheep") with the animal's sprite plus a cloak in the kingdom color, and they found their own kingdom (Herd or Pack). These races are created at runtime, saved by name in `life.sapient`, and cleared on a new world. They also show up in the Creatures tab for spawning. A **Monolith** (Powers tab) makes this happen much faster nearby.
- Tuning numbers live at the top of `creatures.js` (`RACES`) and in `updateVillage` / `doJob`.

## Fine pixels
- **Sprites:** creature art is written as small ASCII grids (`art` in `RACES`) and drawn with `makeSprite`. `refineSprite(src, passes = 2)` runs Scale2x twice (4 fine pixels per art pixel, smoothing staircase edges) and adds a top highlight, an underside shadow and a soft outline. Refined sprites carry `res = 4` (times a race's `detail`, via `detailed()`), and every draw divides its size by `spr.res` so things stay the same size on screen. Creatures, boats, buildings (`buildingSprite`, both versions), monoliths, geysers and monster structures are all refined. Button icons (`raceIcon`) are not.
- **Animal art:** the 37 real animals are hand-drawn at double detail in `ANIMAL_ART` at the bottom of `creatures2.js` (which sets their `colors`, `art`, `facesLeft` and `detail: 2`, overriding the stat-only definitions). Never use the letters c l m n a b x o H for animal colors: the gear palette (`gearPalette`) overwrites them. Sapient forms copy the art and put the cloak on the body rows just above the legs.
- **Ground:** the world canvas holds `SUB` (4) × `SUB` fine pixels per tile. `tileColor` still gives each tile's color (into `base`); `smoothTile` runs Scale2x on the tile map (into `half`), and `drawFineTile` runs it again and adds a fine grain, round tree canopies and water ripples. Dirty tracking works in `CHUNK` × `CHUNK` tile blocks (`markDirty` pads two tiles because the smoothing looks two tiles out).
- **Borders:** `rebuildOverlay` smooths the owner map the same way, so kingdom borders are drawn at `SUB` × with a line two fine pixels wide.

## Controls
- **Left click / drag:** use the selected tool (Terrain tab paints tiles, Shape tab raises/lowers)
- **Move the camera:** the game starts on the **Move Camera** tool, so left-drag pans. With any tool: right/middle drag or **Shift + drag** pans, two-finger trackpad scrolling pans, **WASD / arrows** pan.
- **Zoom:** mouse wheel, trackpad pinch, **+ / -**, or the **+ − ⌂** buttons on the left (⌂ shows the whole world).
- **Toolbar:** a solid wooden bar (`--wood`, darker than the panels' old light brown but lighter than the buttons) with a polished silver edge (a gradient `border-box` background) across the whole bottom of the screen, always 172px tall (the top bar, zoom buttons, info panel, toasts and event pop-ups use the same colors; the info panel sits on top of the toolbar). Tabs on top, then a row of group tabs (Destruction, Nature, ...) and only that group's buttons, in `.panel-row`, which scrolls left to right (the mouse wheel scrolls it too). Tool buttons are square dark-brown tiles with a gold outline (`addPanelButton`): a picture on top (the swatch, the creature icon, or the label's leading emoji split off by `LABEL_PIC`) and the name in small print below, in one row that scrolls sideways. **▾** folds the toolbar down to its tabs; clicking the open tab again does the same.
- The info panel doesn't refresh while a press is in progress inside it (`infoPressed`), so clicks on ✏️ and name links aren't lost to a re-render.
- The game loop is guarded (`frame` → `frameBody`): an error shows one warning toast instead of freezing the game.
- **Mouse wheel**, **+ / -**: zoom. Touch: two-finger pinch to pan and zoom
- **[ / ]** or the slider: brush size (1–40). **B** or the shape buttons: brush shape (circle, square, diamond, spray). Brush powers use the shape too. **Space**: pause / resume
- **Creatures tab:** click (or hold) to spawn a creature.
- **Inspecting:** with nothing selected (the Move Camera tool), tap a creature or village without dragging to open its details (`pointer.tap` in `endPointer`). There is no Inspect button. The creature/village info takes the toolbar's place at the bottom, at the same 172px height and scrolling (`#info.dock`, toolbar gets `.covered`, set in `updateHud`); tapping another creature or village switches to it, tapping empty ground does nothing, and only its ✕ closes it and brings the toolbar back. World panels (History, Statistics, Laws, Lists...) still open on the right.
- **Unselect:** whenever a tool is selected, a button sits on the left just above the toolbar (`#deselect`, placed in `finishPanel`); the tool name sits on top with a big red ✕ under it. It, or **Esc**, goes back to Move Camera.
- **Renaming:** in the Inspect panel, the ✏️ next to a name renames it: a creature, village, kingdom, language, culture, religion, family clan, or a whole species (`pen`, `RENAMABLE`, `renameRace`). Names are typed into an in-game box (`askName(old, done, title, max)`, `#nameBox`), not the browser's `prompt()`, which some browsers block; the god name uses it too. `onRenamed(thing, old)` runs after a rename (ui2.js records past names there). Species names are saved in `raceNames` and reset on a new world.
- **Powers tab:** click to use; the outline shows the area it hits
- **Pick Up (Creatures tab):** press on a creature to grab it (and up to 11 nearby), drag, release to drop. Walkers dropped in water drown (`held`, `moveHeld`).
- **World tab:** pick a map shape (Island, Continents, Pangaea, Archipelago, Earth from the `EARTH` sketch; `shapeHeight`), then a size (Small to Huge 720×480). Every world is **30%–80% land**: each shape picks a random target in its own range (`LAND_RANGE`: Island 30–55%, Continents 35–65%, Pangaea 45–80%, Archipelago 30–50%; Earth keeps its outline). `seaLevelShift` finds the coastline height for that target and `remapHeight` stretches heights around it, so land keeps a normal mix of beaches, plains, hills and peaks.
- **Speed:** up to 100×; the main loop runs as many ticks as fit in ~40 ms per frame so the page stays responsive.
- **Control (Creatures tab):** click any creature to take control of it. WASD / arrows steer it (the camera follows); clicking a creature attacks it (dragons breathe fire, wizards cast); clicking the ground walks there; **Esc** or "Let go" releases it. Its own AI is paused while you control it (`control`, `controlStep` in `creatures.js`). Picking a creature uses its drawn sprite (`unitAt`).

## Project Structure
```
pixel-life/
├── CLAUDE.md
├── index.html     (canvas, top bar, toolbar, info panel)
├── style.css      (UI styling)
├── game.js        (tiles, biomes, world gen, terrain rendering, editing, brushes, terrain sim, save/load, UI, input, main loop)
├── terrain2.js    (walls, more biomes, ores, plants, creep)
├── creatures.js   (animals, people, villages, kingdoms, war, sprites, inspect)
├── society.js     (languages, religions, cultures, families, alliances, diplomacy)
├── gear.js        (equipment, DNA, traits, achievements, creature editor)
├── world.js       (history, statistics, world laws, rebellions, world events, favorites, map sharing)
├── powers.js      (god powers, fire, visual effects, screen shake)
├── disasters.js   (cataclysms, explosives, god hands, cleanup, automata, more clouds)
├── creatures2.js  (more animals, biome creatures, monsters, structures, infections)
├── traits2.js     (more traits, levels, combat moves, statuses, happiness, mana, life and desire powers)
├── cities.js      (city buildings, styles and tiers, books, money, trade, ruins, materials, walls)
├── politics.js    (kings, armies, plots, rites, meta traits, subspecies, ages, invasions, more laws)
├── ui2.js         (map layers, lists, mind and family tree, thought bubbles, pop-ups, bookmarks)
└── main.js        (startup, runs last)
```
Plain `<script>` tags (no modules) share top-level names, so load order matters: `game.js` → `terrain2.js` → `creatures.js` → `society.js` → `gear.js` → `world.js` → `powers.js` → `disasters.js` → `creatures2.js` → `traits2.js` → `cities.js` → `politics.js` → `ui2.js` → `main.js`. Later files extend earlier ones by adding to shared tables (`TILES`, `RACES`, `TRAITS`, `POWERS`, `POWER_GROUPS`, `LAWS`) and by wrapping functions (`const _f = f; f = function (...) { ... }`), so hooks in the older files stay small. Saves are `v: 2` (terrain + `life`); `v: 1` saves still load with no creatures.
The world is one tile per pixel on an offscreen canvas, scaled up by the camera. Only changed tiles are recolored (`markDirty` / `flushDirty`). If `game.js` grows large, split by concern: `world.js`, `ui.js`.

## No Pay-to-Play Rules
- All powers, races and tools are available immediately
- No locked content, timers, ads or purchase prompts
- Anything WorldBox gates behind premium is included for free

## Conventions
- ES6+ (const/let, classes, modules optional via `<script type="module">`)
- Single shared `state` object for game state
- Fixed timestep simulation (`requestAnimationFrame` + accumulator), so speed controls change ticks per frame
- World stored as typed arrays (e.g. `Uint8Array` for tile types) for performance
- Pan and zoom camera over the world; UI is drawn in screen space
- No build step: open `index.html` directly in a browser

## Landing Page Integration
After the first playable build, add a card to the root `index.html` linking to `pixel-life/index.html`, following the pattern used by the other games.
