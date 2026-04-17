// ================================================================
// STATE
// ================================================================
let player, enemies, hand, deck, discard, exhausted, energy, floor;
let relics = [];
let nextEncounterDefs = null;
let weakQueue = [], strongQueue = [], eliteQueue = [];
let isEliteBattle = false;
let isBossBattle = false;
let pendingCard = null, targeting = false, actingEnemy = false, selectingUpgradeTarget = false;
let combatTurn = 0, attacksPlayedThisCombat = 0;
let potions = [];          // 所持ポーション
let maxPotionSlots = 3;    // ポーションスロット最大数
let potionChance = 50;     // 次の戦闘でのポーション入手確率(%)
let pendingPotion = null;  // 使用待ちポーション {potion, slotIndex}
let shopState = null;      // ショップ状態
let treasureState = null;  // 宝箱状態
let mapData = null;        // マップデータ

const POTION_DEFS = {
  fire_potion: { id:'fire_potion', name:'火炎ポーション', icon:'🔥', color:'#e94560',
    desc:'選択した敵に20ダメージ。', needsTarget:true,
    use(targetId) {
      const t = enemies.find(e => e.id === targetId && e.hp > 0);
      if (!t) return;
      const dmg = dealDamageToEnemy(t, 20);
      animateHit(`enemy-sprite-${t.id}`);
      spawnFloatDmg(dmg, `enemy-sprite-${t.id}`, 'attack');
      log(`🔥 火炎ポーション: ${t.name}に${dmg}ダメージ！`, 'damage');
      checkCurlUp(t, dmg);
      if (enemies.every(e => e.hp <= 0)) setTimeout(onVictory, 400);
      else render();
    },
  },

  blood_potion: { id:'blood_potion', name:'ブラッドポーション', icon:'🩸', color:'#e94560',
    desc:'最大HPの20%を回復する。',
    use() {
      const heal = Math.max(1, Math.floor(player.maxHp * 0.2));
      player.hp = Math.min(player.maxHp, player.hp + heal);
      log(`🩸 ブラッドポーション: HP+${heal}`, 'buff');
      spawnFloatDmg(heal, 'player-sprite', 'heal');
      render();
    },
  },

  block_potion: { id:'block_potion', name:'ブロックポーション', icon:'🛡️', color:'#4a9dca',
    desc:'ブロック+12。',
    use() {
      const b = gainPlayerBlock(12);
      log(`🛡 ブロックポーション: ブロック+${b}`, 'buff');
      spawnFloatDmg(b, 'player-sprite', 'block');
      render();
    },
  },

  agility_potion: { id:'agility_potion', name:'機敏ポーション', icon:'🏃', color:'#20ca70',
    desc:'この戦闘中、敏捷性+2。',
    use() {
      player.dexterity += 2;
      log(`🏃 機敏ポーション: 敏捷性+2`, 'buff');
      render();
    },
  },

  energy_potion: { id:'energy_potion', name:'エナジーポーション', icon:'⚡', color:'#f5a623',
    desc:'このターン、エナジー+2。',
    use() {
      energy += 2;
      log(`⚡ エナジーポーション: エナジー+2`, 'buff');
      render();
    },
  },

  explosive_potion: { id:'explosive_potion', name:'爆発ポーション', icon:'💣', color:'#ff8040',
    desc:'敵全体に10ダメージ。',
    use() {
      const alive = enemies.filter(e => e.hp > 0);
      log(`💣 爆発ポーション: 全体に10ダメージ！`, 'damage');
      alive.forEach(e => {
        const dmg = dealDamageToEnemy(e, 10);
        animateHit(`enemy-sprite-${e.id}`);
        spawnFloatDmg(dmg, `enemy-sprite-${e.id}`, 'attack');
        checkCurlUp(e, dmg);
      });
      if (enemies.every(e => e.hp <= 0)) setTimeout(onVictory, 400);
      else render();
    },
  },

  strength_potion: { id:'strength_potion', name:'筋力ポーション', icon:'💪', color:'#c87020',
    desc:'この戦闘中、筋力+2。',
    use() {
      player.strength += 2;
      log(`💪 筋力ポーション: 筋力+2`, 'buff');
      render();
    },
  },

  swift_potion: { id:'swift_potion', name:'加速ポーション', icon:'💨', color:'#80c0ff',
    desc:'カードを3枚引く。',
    use() {
      drawCards(3);
      log(`💨 加速ポーション: 3枚ドロー`, 'buff');
      render();
    },
  },

  weak_potion: { id:'weak_potion', name:'脱力ポーション', icon:'💜', color:'#9b4dca',
    desc:'対象に脱力3ターン付与。', needsTarget:true,
    use(targetId) {
      const t = enemies.find(e => e.id === targetId && e.hp > 0);
      if (!t) return;
      t.weak += 3;
      log(`💜 脱力ポーション: ${t.name}に脱力3付与`, 'buff');
      render();
    },
  },

  fear_potion: { id:'fear_potion', name:'恐怖ポーション', icon:'😨', color:'#ca6020',
    desc:'対象に弱体3ターン付与。', needsTarget:true,
    use(targetId) {
      const t = enemies.find(e => e.id === targetId && e.hp > 0);
      if (!t) return;
      t.jaku += 3;
      log(`😨 恐怖ポーション: ${t.name}に弱体3付与`, 'buff');
      render();
    },
  },

  attack_potion: { id:'attack_potion', name:'アタックポーション', icon:'⚔️', color:'#e94560',
    desc:'ランダムなアタック3枚から1枚選び手札に加える。このターン、コスト0。',
    use() { showPotionCardChoice('attack', 'アタックポーション ⚔️'); },
  },

  skill_potion: { id:'skill_potion', name:'スキルポーション', icon:'🛠️', color:'#3080c7',
    desc:'ランダムなスキル3枚から1枚選び手札に加える。このターン、コスト0。',
    use() { showPotionCardChoice('skill', 'スキルポーション 🛠️'); },
  },

  power_potion: { id:'power_potion', name:'パワーポーション', icon:'✨', color:'#f0c060',
    desc:'ランダムなパワー3枚から1枚選び手札に加える。このターン、コスト0。',
    use() { showPotionCardChoice('power', 'パワーポーション ✨'); },
  },

  colorless_potion: { id:'colorless_potion', name:'無色のポーション', icon:'🫧', color:'#aaaaaa',
    desc:'ランダムなカード3枚から1枚選び手札に加える。このターン、コスト0。',
    use() { showPotionCardChoice('any', '無色のポーション 🫧'); },
  },

  steroid_potion: { id:'steroid_potion', name:'ステロイドポーション', icon:'💉', color:'#f5a623',
    desc:'筋力+5。ターン終了時、筋力-5。',
    use() {
      player.strength += 5;
      player.tempStrengthEnd = (player.tempStrengthEnd || 0) + 5;
      log(`💉 ステロイドポーション: 筋力+5（ターン終了時-5）`, 'buff');
      render();
    },
  },

  speed_potion: { id:'speed_potion', name:'スピードポーション', icon:'🏎️', color:'#20ca70',
    desc:'敏捷性+5。ターン終了時、敏捷性-5。',
    use() {
      player.dexterity += 5;
      player.tempDexterityEnd = (player.tempDexterityEnd || 0) + 5;
      log(`🏎️ スピードポーション: 敏捷性+5（ターン終了時-5）`, 'buff');
      render();
    },
  },

  smithy_potion: { id:'smithy_potion', name:'鍛冶場の祝福', icon:'🔨', color:'#f5c842',
    desc:'手札のカードを全てアップグレードする（戦闘終了まで）。',
    use() {
      const upgraded = hand.filter(c => !c.upgraded && c.type !== 'status');
      upgraded.forEach(c => upgradeCardTemp(c));
      log(`🔨 鍛冶場の祝福: 手札${upgraded.length}枚をアップグレード！`, 'buff');
      render();
    },
  },
};

// ================================================================
