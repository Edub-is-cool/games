import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { DiplomacySystem, DiplomacyProposal } from '../systems/DiplomacySystem';
import { DiplomaticStatus, STATUS_COLORS, STATUS_LABELS } from '../config/diplomacySettings';

const PANEL_W = 420;
const ROW_H = 90;

export class DiplomacyPanelScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private diplomacy!: DiplomacySystem;
  private container!: Phaser.GameObjects.Container;
  private isOpen = false;
  private refreshTimer = 0;

  constructor() {
    super({ key: 'DiplomacyPanelScene' });
  }

  init(data: { gameScene: GameScene; diplomacy: DiplomacySystem }) {
    this.gameScene = data.gameScene;
    this.diplomacy = data.diplomacy;
  }

  create() {
    this.container = this.add.container(0, 0).setDepth(300);
    this.container.setVisible(false);

    this.input.keyboard?.on('keydown-P', () => this.toggle());
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.rebuild();
    }
    this.container.setVisible(this.isOpen);
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  update(_time: number, delta: number) {
    if (!this.isOpen) return;

    this.refreshTimer += delta / 1000;
    if (this.refreshTimer >= 1) {
      this.refreshTimer = 0;
      this.rebuild();
    }
  }

  private rebuild() {
    this.container.removeAll(true);

    const w = this.scale.width;
    const h = this.scale.height;
    const panelX = (w - PANEL_W) / 2;
    let y = 60;

    // Backdrop
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5)
      .setInteractive();
    backdrop.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Close if clicking outside panel
      if (p.x < panelX || p.x > panelX + PANEL_W || p.y < 50) {
        this.close();
      }
    });
    this.container.add(backdrop);

    // Panel background
    const totalPlayers = [...this.gameScene.world.players.keys()].filter((p) => p !== 0).length;
    const proposals = this.diplomacy.getPendingProposalsFor(0);
    const proposalH = proposals.length > 0 ? proposals.length * 40 + 30 : 0;
    const panelH = 60 + totalPlayers * ROW_H + proposalH + 50;

    const bg = this.add.rectangle(panelX, y, PANEL_W, panelH, 0x111122, 0.95)
      .setOrigin(0, 0).setStrokeStyle(1, 0x444466);
    this.container.add(bg);

    // Title
    const title = this.add.text(panelX + PANEL_W / 2, y + 16, 'DIPLOMACY', {
      fontSize: '16px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(title);

    // Close button
    const closeBtn = this.add.text(panelX + PANEL_W - 20, y + 8, 'X', {
      fontSize: '16px', color: '#884444', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#884444'));
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    y += 40;

    // Incoming proposals
    if (proposals.length > 0) {
      const propHeader = this.add.text(panelX + 12, y, 'INCOMING PROPOSALS', {
        fontSize: '11px', color: '#ccaa44', fontFamily: 'monospace',
      });
      this.container.add(propHeader);
      y += 18;

      for (const prop of proposals) {
        this.buildProposalRow(panelX + 12, y, prop);
        y += 36;
      }
      y += 8;
    }

    // Player rows
    const playerIds = [...this.gameScene.world.players.keys()].filter((p) => p !== 0).sort();
    for (const pid of playerIds) {
      this.buildPlayerRow(panelX + 12, y, pid);
      y += ROW_H;
    }

    // Events log
    if (this.diplomacy.events.length > 0) {
      y += 5;
      const evtHeader = this.add.text(panelX + 12, y, 'RECENT EVENTS', {
        fontSize: '10px', color: '#666677', fontFamily: 'monospace',
      });
      this.container.add(evtHeader);
      y += 14;

      for (const evt of this.diplomacy.events.slice(-3)) {
        const evtText = this.add.text(panelX + 12, y, evt.message, {
          fontSize: '10px', color: evt.color, fontFamily: 'monospace',
        });
        this.container.add(evtText);
        y += 14;
      }
    }

    // Resize background
    bg.setSize(PANEL_W, y - bg.y + 15);
  }

  private buildProposalRow(x: number, y: number, proposal: DiplomacyProposal) {
    const color = this.gameScene.playerColors.get(proposal.from) ?? 0xcccccc;
    const playerName = this.getPlayerName(proposal.from);
    const typeLabels: Record<string, string> = {
      peace: 'offers Peace', alliance: 'proposes Alliance',
      tribute_offer: 'offers Tribute', tribute_request: 'requests Tribute',
    };

    const swatch = this.add.rectangle(x, y + 10, 14, 14, color).setOrigin(0, 0.5);
    const text = this.add.text(x + 20, y + 3, `${playerName} ${typeLabels[proposal.type] ?? proposal.type}`, {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
    });

    const acceptBtn = this.add.text(x + 300, y + 2, 'Accept', {
      fontSize: '11px', color: '#44cc44', fontFamily: 'monospace',
      backgroundColor: '#223322', padding: { x: 4, y: 2 },
    }).setInteractive({ useHandCursor: true });

    const rejectBtn = this.add.text(x + 355, y + 2, 'Reject', {
      fontSize: '11px', color: '#cc4444', fontFamily: 'monospace',
      backgroundColor: '#332222', padding: { x: 4, y: 2 },
    }).setInteractive({ useHandCursor: true });

    acceptBtn.on('pointerdown', () => { this.diplomacy.acceptProposal(proposal.id); this.rebuild(); });
    rejectBtn.on('pointerdown', () => { this.diplomacy.rejectProposal(proposal.id); this.rebuild(); });

    this.container.add([swatch, text, acceptBtn, rejectBtn]);
  }

  private buildPlayerRow(x: number, y: number, playerId: number) {
    const color = this.gameScene.playerColors.get(playerId) ?? 0xcccccc;
    const rel = this.diplomacy.getRelation(0, playerId);
    const status = rel.status;
    const score = rel.score;
    const playerName = this.getPlayerName(playerId);

    // Row background
    const rowBg = this.add.rectangle(x - 4, y, PANEL_W - 24, ROW_H - 6, 0x1a1a2e, 0.8)
      .setOrigin(0, 0).setStrokeStyle(1, 0x333344);
    this.container.add(rowBg);

    // Color swatch + name
    const swatch = this.add.rectangle(x + 4, y + 14, 16, 16, color)
      .setStrokeStyle(1, 0x888888);
    const name = this.add.text(x + 28, y + 8, playerName, {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add([swatch, name]);

    // Status badge
    const statusColor = STATUS_COLORS[status];
    const statusLabel = STATUS_LABELS[status];
    const statusBadge = this.add.text(x + 160, y + 8, statusLabel, {
      fontSize: '12px', color: statusColor, fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#0a0a14', padding: { x: 6, y: 2 },
    });
    this.container.add(statusBadge);

    // Treaty timer
    if ((status === DiplomaticStatus.Peace || status === DiplomaticStatus.Alliance) && rel.treatyMinDuration > 0) {
      const elapsed = (this.gameScene.game.getTime() / 1000) - rel.treatyStartTime;
      const remaining = Math.max(0, rel.treatyMinDuration - elapsed);
      if (remaining > 0) {
        const timerText = this.add.text(x + 260, y + 9, `(${Math.ceil(remaining)}s lock)`, {
          fontSize: '10px', color: '#666677', fontFamily: 'monospace',
        });
        this.container.add(timerText);
      }
    }

    // Embargo indicator
    if (rel.embargoActive) {
      const emb = this.add.text(x + 350, y + 9, 'EMBARGO', {
        fontSize: '9px', color: '#cc8833', fontFamily: 'monospace',
      });
      this.container.add(emb);
    }

    // Relation bar
    const barX = x + 4;
    const barY = y + 32;
    const barW = 200;
    const barH = 8;

    // Bar background
    this.container.add(this.add.rectangle(barX, barY, barW, barH, 0x222233).setOrigin(0, 0));
    // Bar fill
    const normalized = (score + 100) / 200; // 0 to 1
    const fillW = barW * normalized;
    const barColor = score > 30 ? 0x44cc44 : score > 0 ? 0x88cc44 : score > -30 ? 0xcccc44 : 0xcc4444;
    this.container.add(this.add.rectangle(barX, barY, fillW, barH, barColor).setOrigin(0, 0));
    // Score text
    const scoreText = this.add.text(barX + barW + 8, barY - 1, `${Math.round(score)}`, {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.container.add(scoreText);

    // Eliminated?
    const eliminated = !this.diplomacy.getSurvivingPlayers().includes(playerId);
    if (eliminated) {
      const elimText = this.add.text(x + 260, barY - 1, 'ELIMINATED', {
        fontSize: '10px', color: '#664444', fontFamily: 'monospace',
      });
      this.container.add(elimText);
      return;
    }

    // Action buttons
    const actions = this.diplomacy.getAvailableActions(0, playerId);
    const btnY = y + 50;
    let btnX = x + 4;

    const actionLabels: Record<string, { label: string; color: string }> = {
      declare_war: { label: 'Declare War', color: '#cc4444' },
      offer_peace: { label: 'Offer Peace', color: '#44aacc' },
      propose_alliance: { label: 'Alliance', color: '#44cc44' },
      break_alliance: { label: 'Break Alliance', color: '#cc8833' },
      send_tribute: { label: 'Tribute (50G)', color: '#cccc44' },
      set_embargo: { label: 'Embargo', color: '#cc8833' },
      lift_embargo: { label: 'Lift Embargo', color: '#44aacc' },
    };

    for (const action of actions) {
      const cfg = actionLabels[action];
      if (!cfg) continue;

      const btn = this.add.text(btnX, btnY, cfg.label, {
        fontSize: '10px', color: cfg.color, fontFamily: 'monospace',
        backgroundColor: '#222233', padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setAlpha(0.7));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', () => {
        this.executeAction(action, playerId);
        this.rebuild();
      });

      this.container.add(btn);
      btnX += btn.width + 6;
    }
  }

  private executeAction(action: string, targetId: number) {
    switch (action) {
      case 'declare_war':
        this.diplomacy.declareWar(0, targetId);
        break;
      case 'offer_peace':
        this.diplomacy.offerPeace(0, targetId);
        break;
      case 'propose_alliance':
        this.diplomacy.proposeAlliance(0, targetId);
        break;
      case 'break_alliance':
        this.diplomacy.breakAlliance(0, targetId);
        break;
      case 'send_tribute':
        this.diplomacy.sendTribute(0, targetId, { gold: 50 });
        break;
      case 'set_embargo':
        this.diplomacy.setEmbargo(0, targetId);
        break;
      case 'lift_embargo':
        this.diplomacy.liftEmbargo(0, targetId);
        break;
    }
  }

  private getPlayerName(playerId: number): string {
    if (playerId === 0) return this.gameScene.settings?.playerName ?? 'Player';
    return `CPU ${playerId}`;
  }
}
