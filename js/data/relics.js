// ================================================================
// STATUS TOOLTIP DEFINITIONS
// ================================================================
const STATUS_TIPS = {
  block:      { name:'🛡 ブロック',   desc:'次のターン開始まで、その値の分だけ\n受けるダメージを防ぐ。' },
  weak:       { name:'💜 脱力',       desc:'与えるダメージが 25% 減少する。\n複数ターン継続し、毎ターン1減る。' },
  vulnerable: { name:'🔴 脆弱',       desc:'獲得するブロックが 25% 減少する。\n複数ターン継続し、毎ターン1減る。' },
  jaku:       { name:'💔 弱体',       desc:'被ダメージが 50% 増加する。\n複数ターン継続し、毎ターン1減る。' },
  entangled:  { name:'🔗 拘束',       desc:'次のターン、攻撃カードを\n使用できない。' },
  strength:   { name:'💪 筋力',       desc:'攻撃ダメージにその値が加算される。\n永続効果。' },
  ritual:     { name:'🌀 儀式',       desc:'ターン終了時にその値分の筋力を獲得する。\n永続効果。' },
  curledup:   { name:'🌀 まるくなる', desc:'初めてダメージを受けたとき、\nその値のブロックを獲得する。' },
  pstrength:  { name:'💪 筋力',       desc:'攻撃ダメージにその値が加算される。' },
  dexterity:  { name:'🏃 敏捷性',     desc:'ブロック獲得量にその値が加算される。' },
};

function badgeTip(cls) {
  const t = STATUS_TIPS[cls];
  if (!t) return '';
  return `<span class="badge-tip"><span class="badge-tip-name">${t.name}</span><br><span class="badge-tip-desc">${t.desc.replace(/\n/g,'<br>')}</span></span>`;
}

// ================================================================
// RELICS
// ================================================================
const RELIC_DEFS = {
  // ── スターターレリック ──────────────────────────────────────────
  burning_blood: {
    id:'burning_blood', name:'バーニングブラッド', icon:'🔥',
    desc:'戦闘終了時にHP6回復。',
    triggers: {
      combat_end(ctx) {
        const heal = Math.min(6, ctx.player.maxHp - ctx.player.hp);
        if (heal > 0) { ctx.player.hp += heal; log(`🔥 バーニングブラッド: HP+${heal}回復`,'buff'); spawnFloatDmg(heal,'player-sprite','block'); }
      },
    },
  },

  // ── コモンレリック ─────────────────────────────────────────────
  smooth_stone: {
    id:'smooth_stone', name:'すべすべ石', icon:'🪨',
    desc:'戦闘開始時に敏捷性+1（ブロック量増加）。',
    triggers: { combat_start(ctx) { ctx.player.dexterity += 1; } },
  },

  vajra: {
    id:'vajra', name:'バジュラ', icon:'🔱',
    desc:'戦闘開始時に筋力+1（攻撃ダメージ増加）。',
    triggers: { combat_start(ctx) { ctx.player.strength += 1; } },
  },

  orichalcum: {
    id:'orichalcum', name:'オリハルコン', icon:'🟠',
    desc:'ブロック0でターン終了すると6ブロック獲得。',
    triggers: {
      turn_end(ctx) {
        if (ctx.player.block === 0) { ctx.player.block += 6; log('🟠 オリハルコン: 6ブロック獲得','buff'); }
      },
    },
  },

  backpack: {
    id:'backpack', name:'バックパック', icon:'🎒',
    desc:'戦闘開始時にカード2枚追加でドロー。',
    triggers: { combat_start() { drawCards(2); } },
  },

  lantern: {
    id:'lantern', name:'ランタン', icon:'🏮',
    desc:'戦闘開始時にエネルギー+1。',
    triggers: { combat_start() { energy += 1; } },
  },

  strawberry: {
    id:'strawberry', name:'イチゴ', icon:'🍓',
    desc:'獲得時に最大HP+7。',
    triggers: {
      on_acquire(ctx) {
        ctx.player.maxHp += 7; ctx.player.hp += 7;
        log('🍓 イチゴ: 最大HP+7','buff');
      },
    },
  },

  the_boot: {
    id:'the_boot', name:'ザ・ブーツ', icon:'👢',
    desc:'アタックが通す4以下のダメージを5に増加する。',
    // dealDamageToEnemy 内でチェック
  },

  nunchaku: {
    id:'nunchaku', name:'ヌンチャク', icon:'🥢',
    desc:'アタック10回使用するたびにエネルギー+1。',
  },

  happy_flower: {
    id:'happy_flower', name:'ハッピーフラワー', icon:'🌻',
    desc:'3ターンごとにエネルギー+1。',
    triggers: {
      turn_start(ctx, r) {
        r.counter = (r.counter || 0) + 1;
        if (r.counter % 3 === 0) { energy += 1; log('🌻 ハッピーフラワー: エネルギー+1','buff'); }
      },
    },
  },

  marbles: {
    id:'marbles', name:'ビー玉袋', icon:'🔮',
    desc:'戦闘開始時、全ての敵に弱体1を付与。',
    triggers: {
      combat_start(ctx) {
        ctx.enemies.forEach(e => { e.jaku = (e.jaku||0) + 1; });
        log('🔮 ビー玉袋: 全敵に弱体1付与','buff');
      },
    },
  },

  pen_nib: {
    id:'pen_nib', name:'ペン先', icon:'✒️',
    desc:'アタック10回使用するたびに、次のアタックのダメージが2倍になる。',
  },

  red_skull: {
    id:'red_skull', name:'レッドスカル', icon:'💀🔴',
    desc:'HPが最大HPの50%以下になると筋力+3（戦闘中のみ）。',
    triggers: {
      combat_start(ctx, r) { r.active = false; },
      on_player_damaged(ctx, r) {
        if (!r.active && ctx.player.hp <= Math.floor(ctx.player.maxHp * 0.5)) {
          r.active = true; ctx.player.strength += 3;
          log('💀 レッドスカル: HP50%以下！ 筋力+3','buff');
        }
      },
    },
  },

  tea_set: {
    id:'tea_set', name:'古代のティーセット', icon:'🍵',
    desc:'休憩した次の戦闘開始時にエネルギー+2。',
    triggers: {
      combat_start(ctx, r) {
        if (r.pending) { energy += 2; r.pending = false; log('🍵 古代のティーセット: エネルギー+2','buff'); }
      },
    },
  },

  art_of_war: {
    id:'art_of_war', name:'孫子兵法', icon:'📜',
    desc:'このターンにアタックを使わなかった場合、次のターン開始時にエネルギー+1。',
    triggers: {
      combat_start(ctx, r) { r.attackedThisTurn = false; r.pendingEnergy = false; },
      turn_start(ctx, r) {
        if (r.pendingEnergy) { energy += 1; log('📜 孫子兵法: エネルギー+1','buff'); }
        r.pendingEnergy = false; r.attackedThisTurn = false;
      },
      turn_end(ctx, r) {
        if (!r.attackedThisTurn) r.pendingEnergy = true;
      },
      on_attack_played(ctx, r) { r.attackedThisTurn = true; },
    },
  },

  war_paint: {
    id:'war_paint', name:'戦化粧', icon:'🎨',
    desc:'獲得時にランダムなスキルカード2枚をアップグレード。',
    triggers: {
      on_acquire() {
        const upgradable = [...deck, ...discard, ...hand].filter(c => c.type==='skill' && !c.upgraded && !c.battleOnly);
        shuffle(upgradable);
        upgradable.slice(0,2).forEach(c => {
          const origName = c.name;
          const pre = getUpgradePreview(c);
          upgradeCard(c);
          log(`🎨 戦化粧: ${origName} → ${pre.name} にアップグレード！`,'buff');
          showToast({ icon:c.icon, label:'戦化粧', title:`${origName} → ${pre.name}`, sub:pre.desc, color:'#f0c060' });
        });
      },
    },
  },

  insect_specimen: {
    id:'insect_specimen', name:'昆虫標本', icon:'🦗',
    desc:'エリートの敵のHPが25%低下する。',
    // startBattle 内でエリートHP調整
  },

  regal_pillow: {
    id:'regal_pillow', name:'王者の枕', icon:'🛏️',
    desc:'休憩時に追加で15HP回復する。',
    // chooseRest 内でボーナス適用
  },

  centennial_puzzle: {
    id:'centennial_puzzle', name:'百年パズル', icon:'🧩',
    desc:'戦闘中初めてHPを失ったとき、カードを3枚引く。',
    triggers: {
      combat_start(ctx, r) { r.triggered = false; },
      on_player_damaged(ctx, r, dmg) {
        if (!r.triggered && dmg > 0) { r.triggered = true; drawCards(3); log('🧩 百年パズル: 3枚ドロー！','buff'); }
      },
    },
  },

  whetstone: {
    id:'whetstone', name:'砥石', icon:'🪨',
    desc:'獲得時にランダムなアタックカード2枚をアップグレード。',
    triggers: {
      on_acquire() {
        const upgradable = [...deck, ...discard, ...hand].filter(c => (c.type==='attack'||c.type==='attack-all') && !c.upgraded && !c.battleOnly);
        shuffle(upgradable);
        upgradable.slice(0,2).forEach(c => {
          const origName = c.name;
          const pre = getUpgradePreview(c);
          upgradeCard(c);
          log(`🪨 砥石: ${origName} → ${pre.name} にアップグレード！`,'buff');
          showToast({ icon:c.icon, label:'砥石', title:`${origName} → ${pre.name}`, sub:pre.desc, color:'#aaaaaa' });
        });
      },
    },
  },

  blood_vial: {
    id:'blood_vial', name:'血のガラス瓶', icon:'🧪',
    desc:'戦闘開始時にHP2回復。',
    triggers: {
      combat_start(ctx) {
        const h = Math.min(2, ctx.player.maxHp - ctx.player.hp);
        if (h > 0) { ctx.player.hp += h; log(`🧪 血のガラス瓶: HP+${h}回復`,'buff'); spawnFloatDmg(h,'player-sprite','block'); }
      },
    },
  },

  akabeko: {
    id:'akabeko', name:'赤べこ', icon:'🐄',
    desc:'戦闘中の最初のアタックに追加で8ダメージ。',
    triggers: {
      combat_start(ctx, r) { r.used = false; },
    },
  },

  anchor: {
    id:'anchor', name:'錨', icon:'⚓',
    desc:'戦闘開始時に10ブロック獲得。',
    triggers: {
      combat_start(ctx) { ctx.player.block += 10; log('⚓ 錨: 10ブロック獲得','buff'); },
    },
  },

  bronze_scales: {
    id:'bronze_scales', name:'青銅のウロコ', icon:'🐉',
    desc:'ダメージを受けるたびに攻撃した敵に3の反撃ダメージ。',
    // processEnemyAction 内でチェック
  },
};

