import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { DiplomacyPanelScene } from './DiplomacyPanelScene';
import { UNITS } from '../config/units';
import { BUILDINGS } from '../config/buildings';
import { AGES, ALL_UNITS, ALL_BUILDINGS, getUnitsForAge, getBuildingsForAge } from '../config/ages';
import { DEFENSES, getDefensesForAge } from '../config/defenses';
import type { EntityData } from '../systems/GameWorld';
import type { DiplomacySystem } from '../systems/DiplomacySystem';

interface ActionDef {
  label: string;
  hotkey: string;
  action: () => void;
  enabled: () => boolean;
  tooltip: string;
}

const PANEL_W = 280;
const PANEL_PAD = 10;
const BTN_H = 28;
const BTN_GAP = 4;

export class HUDScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private resourceText!: Phaser.GameObjects.Text;
  private selectionText!: Phaser.GameObjects.Text;

  // Action panel
  private panelBg!: Phaser.GameObjects.Rectangle;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelButtons: Phaser.GameObjects.Container[] = [];
  private currentActions: ActionDef[] = [];
  private tooltipText!: Phaser.GameObjects.Text;

  // Track what's selected to avoid rebuilding every frame
  private lastSelectionKey = '';

  // Diplomacy
  private diplomacy!: DiplomacySystem;
  private diploBtn!: Phaser.GameObjects.Text;
  private diploNotif!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: { gameScene: GameScene; diplomacy: DiplomacySystem }) {
    this.gameScene = data.gameScene;
    this.diplomacy = data.diplomacy;
  }

  create() {
    // Resource bar at top
    this.resourceText = this.add.text(10, 10, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
    }).setDepth(200);

    // Diplomacy button — top right
    this.diploBtn = this.add.text(this.scale.width - 130, 10, 'Diplomacy [P]', {
      fontSize: '13px', color: '#ccaa44', fontFamily: 'monospace',
      backgroundColor: '#111122cc', padding: { x: 8, y: 4 },
    }).setDepth(200).setInteractive({ useHandCursor: true });

    this.diploBtn.on('pointerover', () => this.diploBtn.setColor('#ffcc44'));
    this.diploBtn.on('pointerout', () => this.diploBtn.setColor('#ccaa44'));
    this.diploBtn.on('pointerdown', () => {
      const panel = this.scene.get('DiplomacyPanelScene') as DiplomacyPanelScene;
      if (panel) panel.toggle();
    });

    // Proposal notification badge
    this.diploNotif = this.add.text(this.scale.width - 140, 10, '', {
      fontSize: '12px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
    }).setDepth(201);

    this.input.keyboard?.on('keydown-P', () => {
      const panel = this.scene.get('DiplomacyPanelScene') as DiplomacyPanelScene;
      if (panel) panel.toggle();
    });

    // Selection info — bottom left
    this.selectionText = this.add.text(10, this.scale.height - 120, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
    }).setDepth(200);

    // Action panel — bottom right, positioned higher to fit more actions
    const panelX = this.scale.width - PANEL_W - 10;
    const panelY = 40;

    this.panelBg = this.add.rectangle(panelX, panelY, PANEL_W, 280, 0x111111, 0.9)
      .setOrigin(0, 0)
      .setDepth(199)
      .setStrokeStyle(1, 0x444444)
      .setVisible(false);

    this.panelTitle = this.add.text(panelX + PANEL_PAD, panelY + 8, 'Actions', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(200).setVisible(false);

    // Tooltip at bottom
    this.tooltipText = this.add.text(panelX, this.scale.height - 14, '', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 2 },
    }).setDepth(200).setOrigin(0, 1);

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      for (const action of this.currentActions) {
        if (action.hotkey === key && action.enabled()) {
          action.action();
          break;
        }
      }
    });

    // Reposition on resize
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.repositionPanel(size.width, size.height);
    });
  }

  private repositionPanel(w: number, h: number) {
    const panelX = w - PANEL_W - 10;
    const panelY = h - 300;
    this.panelBg.setPosition(panelX, panelY);
    this.panelTitle.setPosition(panelX + PANEL_PAD, panelY + 8);
    this.selectionText.setPosition(10, h - 120);
    this.tooltipText.setPosition(panelX, h - 14);
    this.rebuildButtons(); // reposition buttons
  }

  private getSelectionKey(): string {
    const ids = [...this.gameScene.selection.selected].sort();
    return ids.join(',');
  }

  private rebuildActions() {
    const gs = this.gameScene;
    const selectedIds = [...gs.selection.selected];
    this.currentActions = [];

    if (selectedIds.length === 0) return;

    const first = gs.world.entities.get(selectedIds[0]);
    if (!first || first.owner !== 0) return;

    if (first.type === 'building') {
      this.buildBuildingActions(first);
    } else if (first.type === 'unit') {
      this.buildUnitActions(first, selectedIds);
    }
  }

  private buildBuildingActions(building: EntityData) {
    const gs = this.gameScene;
    const config = ALL_BUILDINGS[building.key] ?? BUILDINGS[building.key];
    if (!config) return;

    const player = gs.world.players.get(0);
    const playerAge = player?.age ?? 1;

    // Age advance button (Town Center only)
    if (building.key === 'townCenter' && player && player.age < AGES.length && player.ageProgress < 0) {
      const nextAge = AGES[player.age]; // 0-indexed = next age
      const cost = nextAge.cost;
      const costStr = [
        cost.food ? `${cost.food}F` : '',
        cost.wood ? `${cost.wood}W` : '',
        cost.gold ? `${cost.gold}G` : '',
        cost.stone ? `${cost.stone}S` : '',
      ].filter(Boolean).join(' ');

      this.currentActions.push({
        label: `Advance: ${nextAge.name} [T]`,
        hotkey: 'T',
        tooltip: `${costStr} | ${nextAge.advanceTime}s | Need 2 buildings`,
        enabled: () => gs.economy.canAfford(0, nextAge.cost) && gs.economy.canAdvanceAge(0),
        action: () => gs.economy.startAgeAdvance(0),
      });
    }

    // Train actions - filter by player's age
    const availableUnits = getUnitsForAge(playerAge);

    const hotkeyMap: Record<string, string> = {
      villager: 'V', settler: 'P', militia: 'M', archer: 'R', knight: 'K',
      spearman: 'N', chariot: 'C', swordsman: 'W',
      musketeer: 'U', rifleman: 'D', lancer: 'L',
    };

    for (const unitKey of config.produces) {
      if (!availableUnits.includes(unitKey)) continue;
      const unitCfg = ALL_UNITS[unitKey] ?? UNITS[unitKey];
      if (!unitCfg) continue;
      const hk = hotkeyMap[unitKey] ?? '';
      const cost = unitCfg.cost;
      const costStr = [
        cost.food ? `${cost.food}F` : '',
        cost.wood ? `${cost.wood}W` : '',
        cost.gold ? `${cost.gold}G` : '',
        cost.stone ? `${cost.stone}S` : '',
      ].filter(Boolean).join(' ');

      this.currentActions.push({
        label: `Train ${unitCfg.name} [${hk}]`,
        hotkey: hk,
        tooltip: `${costStr} | ${unitCfg.trainTime}s | HP:${unitCfg.hp} ATK:${unitCfg.attack}`,
        enabled: () => gs.economy.canAfford(0, unitCfg.cost),
        action: () => this.trainUnit(unitKey),
      });
    }
  }

  private buildUnitActions(unit: EntityData, selectedIds: number[]) {
    const gs = this.gameScene;
    const isVillager = unit.key === 'villager';
    const isSettler = unit.key === 'settler';

    // Settler: Found City action
    if (isSettler) {
      this.currentActions.push({
        label: 'Found City [F]',
        hotkey: 'F',
        tooltip: 'Build a new Town Center and convert to villagers',
        enabled: () => true,
        action: () => {
          for (const id of selectedIds) {
            const e = gs.world.entities.get(id);
            if (!e || e.key !== 'settler' || e.owner !== 0) continue;

            const tcConfig = ALL_BUILDINGS['townCenter'] ?? BUILDINGS['townCenter'];
            if (!tcConfig) continue;

            // Place town center at settler's location
            const bEntity = gs.world.spawnEntity('building', 'townCenter', 0, e.x, e.y - 30, tcConfig.hp);
            bEntity.trainQueue = [];
            bEntity.buildProgress = 0.5; // starts half-built
            bEntity.hp = Math.floor(tcConfig.hp * 0.5);
            bEntity.maxHp = tcConfig.hp;

            // Convert settler into 2 villagers
            e.state = 'dead';
            const vilConfig = ALL_UNITS['villager'] ?? UNITS['villager'];
            if (vilConfig) {
              for (let i = 0; i < 2; i++) {
                const vil = gs.world.spawnEntity('unit', 'villager', 0, e.x + (i * 20 - 10), e.y + 30, vilConfig.hp);
                vil.carryAmount = 0;
                // Send villager to finish building
                vil.commandQueue = [{ type: 'build', targetId: bEntity.id }];
                vil.state = 'building';
                vil.target = bEntity.id;
              }
            }
            break;
          }
        },
      });
    }

    // All units: stop
    this.currentActions.push({
      label: 'Stop [S]',
      hotkey: 'S',
      tooltip: 'Cancel current action',
      enabled: () => true,
      action: () => {
        gs.commands.issueCommand(selectedIds, { type: 'move', x: unit.x, y: unit.y });
      },
    });

    // Attack nearest enemy
    this.currentActions.push({
      label: 'Attack Nearest [A]',
      hotkey: 'A',
      tooltip: 'Attack the nearest enemy unit or building',
      enabled: () => true,
      action: () => {
        for (const id of selectedIds) {
          const entity = gs.world.entities.get(id);
          if (!entity || entity.state === 'dead') continue;
          const target = this.findNearestEnemy(entity);
          if (target) {
            gs.commands.issueCommand([id], { type: 'attack', targetId: target.id });
          }
        }
      },
    });

    if (isVillager) {
      // Auto-gather buttons — send villagers to nearest resource of type and keep them collecting
      const gatherResources: { key: string; label: string; hotkey: string; color: string }[] = [
        { key: 'food', label: 'Gather Food', hotkey: 'G', color: '#ff6644' },
        { key: 'wood', label: 'Gather Wood', hotkey: 'W', color: '#44aa44' },
        { key: 'gold', label: 'Gather Gold', hotkey: 'O', color: '#ffcc00' },
        { key: 'stone', label: 'Gather Stone', hotkey: 'N', color: '#999999' },
      ];

      for (const res of gatherResources) {
        this.currentActions.push({
          label: `${res.label} [${res.hotkey}]`,
          hotkey: res.hotkey,
          tooltip: `Send to nearest ${res.key} and auto-continue`,
          enabled: () => true,
          action: () => {
            const villagerIds = selectedIds.filter((id) => {
              const e = gs.world.entities.get(id);
              return e && e.key === 'villager' && e.owner === 0;
            });
            for (const vid of villagerIds) {
              const vil = gs.world.entities.get(vid);
              if (!vil) continue;
              const target = this.findNearestResourceOfType(vil, res.key);
              if (target) {
                gs.commands.issueCommand([vid], { type: 'gather', targetId: target.id });
                // Tag this villager to auto-continue gathering this resource type
                vil.gatherType = res.key;
              }
            }
          },
        });
      }

      // Build actions — filtered by age
      const player = gs.world.players.get(0);
      const playerAge = player?.age ?? 1;
      const availableBuildings = getBuildingsForAge(playerAge);

      const buildHotkeys: Record<string, string> = {
        house: 'Q', barracks: 'B', archeryRange: 'E',
        stable: 'G', watchtower: 'O', market: 'J',
        castle: 'C', siege_workshop: 'I', blacksmith: 'X',
        fort: 'F', gunsmith: 'N', university: 'U',
        factory: 'Y', bunker: 'Z', command_center: 'H',
      };

      for (const [bKey, bCfg] of Object.entries(ALL_BUILDINGS)) {
        if (bKey === 'townCenter') continue;
        if (!availableBuildings.includes(bKey)) continue;
        const hk = buildHotkeys[bKey] ?? '';
        const cost = bCfg.cost;
        const costStr = [
          cost.food ? `${cost.food}F` : '',
          cost.wood ? `${cost.wood}W` : '',
          cost.gold ? `${cost.gold}G` : '',
          cost.stone ? `${cost.stone}S` : '',
        ].filter(Boolean).join(' ');

        this.currentActions.push({
          label: `Build ${bCfg.name} [${hk}]`,
          hotkey: hk,
          tooltip: `${costStr} | ${bCfg.buildTime}s | HP:${bCfg.hp}`,
          enabled: () => gs.economy.canAfford(0, bCfg.cost),
          action: () => this.startBuildPlacement(bKey),
        });
      }

      // Defense buildings
      const availableDefenses = getDefensesForAge(playerAge);
      for (const dKey of availableDefenses) {
        const dCfg = DEFENSES[dKey];
        if (!dCfg) continue;
        const cost = dCfg.cost;
        const costStr = [
          cost.food ? `${cost.food}F` : '',
          cost.wood ? `${cost.wood}W` : '',
          cost.gold ? `${cost.gold}G` : '',
          cost.stone ? `${cost.stone}S` : '',
        ].filter(Boolean).join(' ');

        this.currentActions.push({
          label: `Build ${dCfg.name}`,
          hotkey: '',
          tooltip: `${costStr} | ${dCfg.buildTime}s | HP:${dCfg.hp}${dCfg.attackDamage ? ` | ATK:${dCfg.attackDamage}` : ''}`,
          enabled: () => gs.economy.canAfford(0, dCfg.cost),
          action: () => this.startBuildPlacement(dKey),
        });
      }
    }
  }

  private findNearestEnemy(entity: EntityData): EntityData | null {
    let closest: EntityData | null = null;
    let closestDist = Infinity;

    for (const e of this.gameScene.world.entities.values()) {
      if (e.owner === entity.owner || e.owner === -1 || e.state === 'dead') continue;
      // Only target players at war (or neutral — attacking will auto-declare)
      if (this.diplomacy && this.diplomacy.areAllied(entity.owner, e.owner)) continue;
      const dx = e.x - entity.x;
      const dy = e.y - entity.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }

    return closest;
  }

  private findNearestResourceOfType(entity: EntityData, resType: string): EntityData | null {
    let closest: EntityData | null = null;
    let closestDist = Infinity;

    for (const e of this.gameScene.world.entities.values()) {
      if (e.type !== 'resource' || e.state === 'dead' || e.key !== resType) continue;
      const dx = e.x - entity.x;
      const dy = e.y - entity.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }

    return closest;
  }

  private trainUnit(unitKey: string) {
    const gs = this.gameScene;
    const selected = [...gs.selection.selected];
    const unitConfig = ALL_UNITS[unitKey] ?? UNITS[unitKey];
    if (!unitConfig) return;

    for (const id of selected) {
      const entity = gs.world.entities.get(id);
      if (!entity || entity.type !== 'building' || entity.owner !== 0) continue;

      const buildingConfig = ALL_BUILDINGS[entity.key] ?? BUILDINGS[entity.key];
      if (!buildingConfig || !buildingConfig.produces.includes(unitKey)) continue;

      if (!gs.economy.canAfford(0, unitConfig.cost)) return;

      gs.economy.spend(0, unitConfig.cost);
      if (!entity.trainQueue) entity.trainQueue = [];
      entity.trainQueue.push({
        unitKey,
        progress: 0,
        trainTime: unitConfig.trainTime,
      });
      break;
    }
  }

  private startBuildPlacement(buildingKey: string) {
    const gs = this.gameScene;
    const config = ALL_BUILDINGS[buildingKey] ?? BUILDINGS[buildingKey] ?? DEFENSES[buildingKey];
    if (!config) return;
    if (!gs.economy.canAfford(0, config.cost)) return;

    // Spend resources and place building at a spot near the selected villager
    const selected = [...gs.selection.selected];
    for (const id of selected) {
      const entity = gs.world.entities.get(id);
      if (!entity || entity.key !== 'villager' || entity.owner !== 0) continue;

      gs.economy.spend(0, config.cost);
      const bEntity = gs.world.spawnEntity('building', buildingKey, 0, entity.x + 40, entity.y, config.hp);
      bEntity.trainQueue = [];
      bEntity.buildProgress = 0;
      bEntity.hp = 1;
      bEntity.maxHp = config.hp;

      // Send villager to build it
      entity.commandQueue = [{ type: 'build', targetId: bEntity.id }];
      entity.state = 'building';
      entity.target = bEntity.id;
      break;
    }
  }

  private rebuildButtons() {
    // Destroy old buttons
    for (const container of this.panelButtons) {
      container.destroy();
    }
    this.panelButtons = [];

    const panelX = this.panelBg.x;
    const panelY = this.panelBg.y;

    let yOffset = 30;
    for (let i = 0; i < this.currentActions.length; i++) {
      const action = this.currentActions[i];
      const btnY = panelY + yOffset;
      const btnX = panelX + PANEL_PAD;
      const rowH = action.tooltip ? BTN_H + 14 : BTN_H;
      yOffset += rowH + BTN_GAP;

      const container = this.add.container(btnX, btnY).setDepth(200);

      const btnW = PANEL_W - PANEL_PAD * 2;

      const bg = this.add.rectangle(0, 0, btnW, rowH, 0x333333, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(8, 4, action.label, {
        fontSize: '13px',
        color: '#88cc44',
        fontFamily: 'monospace',
      });

      const costText = this.add.text(8, 20, action.tooltip, {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      });

      container.add([bg, label, costText]);
      container.setData('index', i);

      bg.on('pointerover', () => {
        bg.setFillStyle(0x444444);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x333333);
      });
      bg.on('pointerdown', () => {
        if (action.enabled()) {
          action.action();
        }
      });

      this.panelButtons.push(container);
    }

    // Resize panel bg to fit
    const totalH = yOffset + PANEL_PAD;
    this.panelBg.setSize(PANEL_W, Math.max(totalH, 50));
  }

  update() {
    const gs = this.gameScene;
    if (!gs.world) return;

    // Resources + Age
    const player = gs.world.players.get(0);
    if (player) {
      const r = player.resources;
      const ageName = AGES[player.age - 1]?.name ?? 'Dawn Age';
      let ageStr = `Age: ${ageName}`;
      if (player.ageProgress >= 0 && player.age < AGES.length) {
        const nextAge = AGES[player.age];
        const pct = Math.floor((player.ageProgress / nextAge.advanceTime) * 100);
        ageStr += ` -> ${nextAge.name} ${pct}%`;
      }
      this.resourceText.setText(
        `Food: ${Math.floor(r.food)}  Wood: ${Math.floor(r.wood)}  Gold: ${Math.floor(r.gold)}  Stone: ${Math.floor(r.stone)}  |  Pop: ${player.popUsed}/${player.popCap}  |  ${ageStr}`
      );
    }

    // Selection info
    const selectedIds = [...gs.selection.selected];
    if (selectedIds.length > 0) {
      const first = gs.world.entities.get(selectedIds[0]);
      if (first) {
        let info = `${first.key} (HP: ${Math.floor(first.hp)}/${first.maxHp})`;
        if (selectedIds.length > 1) {
          info += ` +${selectedIds.length - 1} more`;
        }
        if (first.trainQueue && first.trainQueue.length > 0) {
          const order = first.trainQueue[0];
          const pct = Math.floor((order.progress / order.trainTime) * 100);
          info += `\nTraining: ${order.unitKey} ${pct}%`;
          if (first.trainQueue.length > 1) {
            info += ` (+${first.trainQueue.length - 1} queued)`;
          }
        }
        if (first.buildProgress !== undefined && first.buildProgress < 1) {
          info += `\nBuilding: ${Math.floor(first.buildProgress * 100)}%`;
        }
        this.selectionText.setText(info);
      }
    } else {
      this.selectionText.setText('');
    }

    // Rebuild action panel if selection changed
    const selKey = this.getSelectionKey();
    if (selKey !== this.lastSelectionKey) {
      this.lastSelectionKey = selKey;
      this.rebuildActions();
      this.rebuildButtons();
    }

    // Show/hide panel
    const hasActions = this.currentActions.length > 0;
    this.panelBg.setVisible(hasActions);
    this.panelTitle.setVisible(hasActions);

    // Update button enabled/disabled state
    for (let i = 0; i < this.panelButtons.length; i++) {
      const action = this.currentActions[i];
      const container = this.panelButtons[i];
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      const label = container.getAt(1) as Phaser.GameObjects.Text;
      const cost = container.getAt(2) as Phaser.GameObjects.Text;

      if (action.enabled()) {
        label.setColor('#88cc44');
        cost.setColor('#aaaaaa');
        bg.setStrokeStyle(1, 0x555555);
      } else {
        label.setColor('#555555');
        cost.setColor('#444444');
        bg.setStrokeStyle(1, 0x333333);
      }
    }

    // Diplomacy notification badge
    if (this.diplomacy) {
      const proposals = this.diplomacy.getPendingProposalsFor(0);
      if (proposals.length > 0) {
        this.diploNotif.setText(`(${proposals.length})`);
        this.diploNotif.setVisible(true);
      } else {
        this.diploNotif.setVisible(false);
      }
    }
  }
}
