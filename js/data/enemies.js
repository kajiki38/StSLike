// ================================================================
// ENEMY DEFINITIONS
// Move fields:
//   name, atkDmg, atkDmgMin, atkDmgMax, defGain,
//   playerWeak, playerVulnerable, selfStrength, selfRitual,
//   addSlimed, escape, weight
// Enemy fields:
//   openingMoves[]  : turn-by-turn guaranteed moves (index 0 = turn 1)
//   pattern         : 'weighted' | 'sequence' | 'always'  (for post-opening turns)
//   loopFrom        : (sequence) loop start index
//   noRepeat        : (weighted) can't repeat last move
//   curlUpMin/Max   : if set, enemy gets まるくなる at battle start
// ================================================================
const ENEMY_DEFS = {

  cultist: {
    name:'カルティスト', sprite:'🧎', hpMin:48, hpMax:55,
    pattern:'sequence', loopFrom:1,
    moves:[
      { name:'呪文詠唱', selfRitual:3 },
      { name:'暗黒打撃', atkDmg:6 },
    ],
  },

  jaw_worm: {
    name:'デカアゴムシ', sprite:'🐛', hpMin:40, hpMax:44,
    // 初回ターン確定行動
    openingMoves:[
      { name:'噛みつく', atkDmg:11 },
    ],
    // 以降はweighted
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'噛みつく', weight:0.25, atkDmg:11 },
      { name:'叩きつけ', weight:0.30, atkDmg:7, defGain:5 },
      { name:'咆哮',     weight:0.45, defGain:6, selfStrength:3 },
    ],
  },

  louse: {
    name:'寄生虫', sprite:'🦟', hpMin:10, hpMax:15,
    curlUpMin:3, curlUpMax:7,       // 戦闘開始時にまるくなる付与
    pattern:'weighted',
    moves:[
      { name:'噛みつく', weight:0.750, atkDmgMin:5, atkDmgMax:7 },
      { name:'成長',     weight:0.125, selfStrength:3 },
      { name:'脱力',     weight:0.125, playerWeak:2 },
    ],
  },

  acid_slime_m: {
    name:'アシッドスライムM', sprite:'🟡', hpMin:28, hpMax:32,
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'腐食の突進', weight:0.40, atkDmg:10 },
      { name:'粘液吐き',   weight:0.30, atkDmg:7, addSlimed:true },
      { name:'舐める',     weight:0.30, playerWeak:1 },
    ],
  },

  spike_slime_s: {
    name:'スパイクスライムS', sprite:'🌵', hpMin:10, hpMax:14,
    pattern:'always',
    moves:[ { name:'突進', atkDmg:5 } ],
  },

  // ──── 強プール用 ────

  spike_slime_m: {
    name:'スパイクスライムM', sprite:'🌵', hpMin:28, hpMax:32,
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'炎上コイル', weight:0.30, atkDmg:8, addSlimed:2 },
      { name:'突進',       weight:0.70, playerJaku:1 },
    ],
  },

  acid_slime_s: {
    name:'アシッドスライムS', sprite:'🟡', hpMin:8, hpMax:12,
    pattern:'weighted',
    moves:[
      { name:'ぶつかる', weight:0.5, atkDmg:3 },
      { name:'舐める',   weight:0.5, playerWeak:1 },
    ],
  },

  acid_slime_l: {
    name:'アシッドスライムL', sprite:'🟡', hpMin:65, hpMax:69,
    splitOnHalfHp:'acid_slime_m',
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'腐食の突進', weight:0.40, atkDmg:16 },
      { name:'粘液吐き',   weight:0.30, atkDmg:11, addSlimed:2 },
      { name:'舐める',     weight:0.30, playerWeak:2 },
    ],
  },

  spike_slime_l: {
    name:'スパイクスライムL', sprite:'🌵', hpMin:64, hpMax:70,
    splitOnHalfHp:'spike_slime_m',
    pattern:'weighted',
    moves:[
      { name:'炎上コイル', weight:0.30, atkDmg:16, addSlimed:2 },
      { name:'突進',       weight:0.70, playerJaku:2 },
    ],
  },

  slaver: {
    name:'スレイバー', sprite:'⛓️', hpMin:46, hpMax:50,
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'強打', weight:0.60, atkDmg:12 },
      { name:'突き', weight:0.40, atkDmg:7, playerWeak:1 },
    ],
  },

  fungi_beast: {
    name:'キノコビースト', sprite:'🍄', hpMin:22, hpMax:28,
    sporeCloud:true,
    pattern:'weighted', noRepeat:true,
    moves:[
      { name:'噛みつく', weight:0.60, atkDmg:6 },
      { name:'成長',     weight:0.40, selfStrength:3 },
    ],
  },

  looter: {
    name:'略奪者', sprite:'🗡️', hpMin:44, hpMax:48,
    pattern:'custom',
    customTurn(e) {
      const t = e.turnCount;
      if (t <= 1) return { name:'強打', atkDmg:10, stealGold:15 };
      if (t === 2) {
        if (Math.random() < 0.5) { e.looterChoice='stab'; return { name:'突き', atkDmg:12, stealGold:15 }; }
        else                      { e.looterChoice='smoke'; return { name:'煙玉', defGain:6 }; }
      }
      if (t === 3 && e.looterChoice === 'stab') return { name:'煙玉', defGain:6 };
      return { name:'逃走', escape:true };
    },
  },

  slaver_red: {
    name:'スレイバー赤', sprite:'🔗', hpMin:46, hpMax:50,
    pattern:'custom',
    customTurn(e) {
      const t = e.turnCount;
      const scratchTurn = !e.entangleUsed && (t % 3 === 0);
      if (scratchTurn) return { name:'引っ掻く', atkDmg:13 };
      if (!e.entangleUsed && t > 0 && Math.random() < 0.25) {
        e.entangleUsed = true;
        return { name:'絡めとる', playerEntangle:1 };
      }
      if (!e.entangleUsed) return { name:'噛みつく', atkDmg:8, playerWeak:1 };
      if (e.lastMoveWasBite) { e.lastMoveWasBite = false; return { name:'引っ掻く', atkDmg:13 }; }
      if (Math.random() < 0.55) { e.lastMoveWasBite = true; return { name:'噛みつく', atkDmg:8, playerWeak:1 }; }
      e.lastMoveWasBite = false;
      return { name:'引っ掻く', atkDmg:13 };
    },
  },

  sneaky_gremlin: {
    name:'スニーキーグレムリン', sprite:'🐭', hpMin:10, hpMax:14,
    pattern:'always',
    moves:[ { name:'突き刺し', atkDmg:9 } ],
  },

  mad_gremlin: {
    name:'マッドグレムリン', sprite:'😡', hpMin:20, hpMax:24,
    rage:1,
    pattern:'always',
    moves:[ { name:'切りつけ', atkDmg:4 } ],
  },

  fat_gremlin: {
    name:'太っちょグレムリン', sprite:'🐷', hpMin:13, hpMax:17,
    pattern:'always',
    moves:[ { name:'ビンタ', atkDmg:4, playerWeak:1, playerVulnerable:1 } ],
  },

  gremlin_wizard: {
    name:'グレムリンウィザード', sprite:'🧙', hpMin:21, hpMax:25,
    openingMoves:[
      { name:'充電中', charge:true },
      { name:'充電中', charge:true },
    ],
    pattern:'always',
    moves:[ { name:'稲妻', atkDmg:25 } ],
  },

  shield_gremlin: {
    name:'シールドグレムリン', sprite:'🛡', hpMin:12, hpMax:15,
    pattern:'always',
    moves:[ { name:'守る', shieldAlly:7, atkDmgFallback:6 } ],
  },

  // ── エリート ──
  gremlin_boss: {
    id:'gremlin_boss',
    name:'ボスグレムリン', sprite:'👑', hpMin:82, hpMax:86,
    isElite:true,
    pattern:'custom',
    customTurn(e) {
      if (e.turnCount === 0) return { name:'激怒', selfEnrage:2 };
      if ((e.turnCount - 1) % 3 === 0) return { name:'叫び声', atkDmg:6, playerJaku:2 };
      return { name:'強打', atkDmg:14 };
    },
  },

  lagavulin: {
    id:'lagavulin',
    name:'ラガヴーリン', sprite:'😴', hpMin:109, hpMax:111,
    isElite:true,
    pattern:'custom',
    customTurn(e) {
      if (e.awakenStunPending) {
        e.awakenStunPending = false;
        e.sleeping = false;
        e.metallicize = 0;
        e.awakeActionIndex = 0;
        return { name:'スタン', stun:true };
      }
      if (e.sleeping) {
        if (e.turnCount < 3) return { name:'睡眠', sleep:true };
        e.sleeping = false;
        e.metallicize = 0;
        e.awakeActionIndex = 0;
        log('😤 ラガヴーリンが自然に目覚めた！ 金属化が解除される！', 'important');
      }
      const idx = (e.awakeActionIndex || 0) % 3;
      e.awakeActionIndex = (e.awakeActionIndex || 0) + 1;
      if (idx === 2) return { name:'魂抽出', playerStrDown:1, playerDexDown:1 };
      return { name:'攻撃', atkDmg:18 };
    },
  },

  sentry: {
    id:'sentry',
    name:'セントリー', sprite:'🗿', hpMin:38, hpMax:42,
    isElite:true,
    pattern:'custom',
    customTurn(e) {
      const startsWithDamage = e.def.sentryPosition === 1;
      const useDamage = startsWithDamage ? (e.turnCount % 2 === 0) : (e.turnCount % 2 !== 0);
      if (useDamage) return { name:'射撃', atkDmg:9 };
      return { name:'めまい付与', addDaze:2 };
    },
  },

  // ── ボス ──
  guardian: {
    id:'guardian',
    name:'ガーディアン', sprite:'🤖', hpMin:240, hpMax:250,
    isBoss:true,
    pattern:'custom',
    customTurn(e) {
      if (e.guardianMode === 'offensive') {
        // 開幕チャージ→旋風刃→チャージ→フィアースバッシュ→蒸気解放→ループ(旋風刃〜)
        const offMoves = [
          { name:'チャージ',         defGain:9 },
          { name:'旋風刃',           atkDmg:5, atkHits:4 },
          { name:'チャージ',         defGain:9 },
          { name:'フィアースバッシュ', atkDmg:36 },
          { name:'蒸気解放',         playerWeak:2, playerJaku:2 },
        ];
        const idx = e.offensiveTurn === 0 ? 0 : ((e.offensiveTurn - 1) % 4) + 1;
        e.offensiveTurn++;
        return offMoves[idx];
      } else {
        // 防御態勢: 通常攻撃→ツインスラム(→攻撃態勢へ)→繰り返し
        const defMoves = [
          { name:'通常攻撃',   atkDmg:10 },
          { name:'ツインスラム', atkDmg:8, atkHits:2, guardianModeSwitch:'offensive' },
        ];
        const idx = e.defensiveTurn % 2;
        e.defensiveTurn++;
        return defMoves[idx];
      }
    },
  },
};

// ================================================================
// ENCOUNTER GROUPS  (弱プール / 強プール)
// ================================================================
const WEAK_POOL = [
  ['cultist'],
  ['jaw_worm'],
  ['louse', 'louse'],
  ['acid_slime_m', 'spike_slime_s'],
];

const STRONG_POOL = [
  ['acid_slime_l'],
  ['spike_slime_l'],
  ['slaver'],
  ['louse', 'louse', 'louse'],
  ['fungi_beast', 'fungi_beast'],
  ['looter'],
  ['slaver_red'],
  'gremlin_gang',
  ['spike_slime_s', 'spike_slime_s', 'spike_slime_s', 'acid_slime_s', 'acid_slime_s'],
];

const ELITE_POOL = ['gremlin_boss', 'lagavulin', 'sentry_trio'];

function buildEliteEncounter() {
  if (eliteQueue.length === 0) {
    eliteQueue = [0, 1, 2]; shuffle(eliteQueue);
  }
  const key = ELITE_POOL[eliteQueue.pop()];
  if (key === 'sentry_trio') {
    return [0, 1, 2].map(pos => ({ ...ENEMY_DEFS.sentry, sentryPosition: pos }));
  }
  return [ENEMY_DEFS[key]];
}

function buildGremlinGang() {
  const pool = [
    { id:'sneaky_gremlin', max:2 },
    { id:'mad_gremlin',    max:2 },
    { id:'fat_gremlin',    max:2 },
    { id:'gremlin_wizard', max:1 },
    { id:'shield_gremlin', max:1 },
  ];
  const counts = {};
  const result = [];
  while (result.length < 4) {
    const avail = pool.filter(p => (counts[p.id] || 0) < p.max);
    const pick  = avail[Math.floor(Math.random() * avail.length)];
    counts[pick.id] = (counts[pick.id] || 0) + 1;
    result.push(ENEMY_DEFS[pick.id]);
  }
  return result;
}

