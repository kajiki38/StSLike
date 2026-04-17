// INIT
// ================================================================
function initGame() {
  player = { hp:70, maxHp:70, block:0, weak:0, vulnerable:0, jaku:0, entangled:0, rageTurn:0, gold:99,
             strength:0, dexterity:0, baseStrength:0, baseDexterity:0, powers:{},
             tempStrengthEnd:0, tempDexterityEnd:0 };
  relics = [ {...RELIC_DEFS['burning_blood']} ];
  floor  = 0;
  potions = []; maxPotionSlots = 3; potionChance = 50; pendingPotion = null;
  weakQueue = []; strongQueue = []; eliteQueue = [];
  deck = []; discard = []; hand = []; exhausted = []; enemies = []; energy = 3;
  Object.entries(STARTER_IDS).forEach(([id, n]) => {
    for (let i=0;i<n;i++) deck.push({...CARD_MAP[id]});
  });
  shuffle(deck);
  ['victory-screen','gameover-screen','reward-screen','rest-screen','relic-reward-screen','map-screen','bosswin-screen','potion-card-screen','event-screen','event-card-screen'].forEach(id =>
    document.getElementById(id).classList.remove('show'));
  shopState = null;
  treasureState = null;
  const shopEl = document.getElementById('shop-screen');
  if (shopEl) shopEl.classList.remove('show');
  const treasureEl = document.getElementById('treasure-screen');
  if (treasureEl) treasureEl.classList.remove('show');
  mapData = null;
  clearLog();
  mapData = generateMap();
  showNeow(); // ゲーム開始時にネオーイベントを自動表示
}

function buildEncounter(isElite = false) {
  if (isElite) return buildEliteEncounter();
  const useStrong = floor >= 4;
  const pool  = useStrong ? STRONG_POOL : WEAK_POOL;
  const queue = useStrong ? strongQueue  : weakQueue;
  if (queue.length === 0) {
    for (let i = 0; i < pool.length; i++) queue.push(i);
    shuffle(queue);
  }
  const idx   = queue.pop();
  const group = pool[idx];
  if (group === 'gremlin_gang') return buildGremlinGang();
  return group.map(id => ENEMY_DEFS[id]);
}

function startBattle(defs) {
  floor++;

  // battleOnlyカードを除いた全カードをdeckに集めてシャッフル（捨て札0で戦闘開始）
  const keep = c => !c.battleOnly;
  // 一時強化（武装カード）を元に戻す
  const revertTemp = c => { if (c.tempUpgraded) return {...CARD_MAP[c.id]}; return c; };
  const allCards = [
    ...deck.filter(keep).map(revertTemp),
    ...discard.filter(keep).map(revertTemp),
    ...hand.filter(keep).map(revertTemp),
    ...exhausted.filter(keep).map(revertTemp),
  ];
  deck = allCards; shuffle(deck);
  // 戦闘ごとにリセットが必要なカード状態をクリア
  deck.forEach(c => { c._rampageBonus = 0; c._costReduction = 0; });
  discard = []; hand = []; exhausted = [];
  player.powers = {};
  player.noMoreDraw = false;
  player.flameBarrier = 0;
  player.loseStrengthEOT = 0;
  selectingUpgradeTarget = false;
  combatTurn = 0; attacksPlayedThisCombat = 0;

  enemies = defs.map((def, i) => {
    const curlUp = def.curlUpMin !== undefined
      ? randInt(def.curlUpMin, def.curlUpMax) : 0;
    return {
      id:i, def,
      name:def.name, sprite:def.sprite,
      hp: randInt(def.hpMin, def.hpMax), maxHp:0,
      block:0, weak:0, vulnerable:0, jaku:0, strength:0, ritual:0,
      curlUp, curlUpTriggered:false,
      splitDone:false, stolenGold:0, fled:false,
      intent:null, turnCount:0, lastMoveIndex:-1,
    };
  });
  // 昆虫標本: エリート敵のHPを25%削減
  if (relics.some(r => r.id === 'insect_specimen')) {
    const isElite = defs.some(d => d.isElite);
    if (isElite) enemies.forEach(e => { e.hp = Math.max(1, Math.floor(e.hp * 0.75)); });
  }
  enemies.forEach(e => { e.maxHp = e.hp; });

  // エリート専用初期化
  enemies.forEach(e => {
    if (e.def.id === 'lagavulin') {
      e.sleeping = true;
      e.metallicize = 8;
      e.awakeActionIndex = 0;
      e.awakenStunPending = false;
      e.block = 8;
    }
    if (e.def.id === 'gremlin_boss') {
      e.enrage = 0;
    }
    if (e.def.id === 'guardian') {
      e.guardianMode = 'offensive';
      e.offensiveTurn = 0;
      e.defensiveTurn = 0;
      e.modeShiftDamage = 0;
      e.modeShiftThreshold = 40;
      e.sharpHide = 0;
    }
  });

  isEliteBattle = defs.some(d => d.isElite);
  isBossBattle = defs.some(d => d.isBoss);
  targeting = false; pendingCard = null; actingEnemy = false; setInputEnabled(true);
  player.block = 0; player.weak = 0; player.vulnerable = 0;
  player.jaku = 0; player.entangled = 0; player.rageTurn = 0;
  player.tempStrengthEnd = 0; player.tempDexterityEnd = 0;
  player.strength = player.baseStrength;
  player.dexterity = player.baseDexterity;
  energy = 3;

  document.getElementById('floor-num').textContent = `FLOOR ${floor}${isEliteBattle ? ' ⚡ELITE' : ''}${isBossBattle ? ' 💀BOSS' : ''}`;
  buildEnemyDOM();
  enemies.forEach(e => setEnemyIntent(e));
  drawCards(5);
  triggerRelics('combat_start');
  combatTurn = 1; triggerRelics('turn_start');

  // 戦闘開始バフ通知
  enemies.forEach(e => {
    if (e.curlUp > 0)
      log(`${e.name}はまるくなっている (初被弾時に${e.curlUp}ブロック獲得)`, 'buff');
    if (e.def.splitOnHalfHp)
      log(`${e.name}はHP半減時に分裂する`, 'buff');
    if (e.def.sporeCloud)
      log(`${e.name}は胞子の雲を持つ (撃破時: 脆弱2付与)`, 'buff');
  });
  log(`⚔️ ${enemies.map(e=>e.name).join('、')} が現れた！`, 'important');
  render();
}

function startNextBattle() {
  document.getElementById('victory-screen').classList.remove('show');
  startBattle(nextEncounterDefs);
}

// ================================================================
// DOM
// ================================================================
function buildEnemyDOM() {
  const area = document.getElementById('enemies-area');
  area.innerHTML = '';
  enemies.forEach(e => {
    const slot = document.createElement('div');
    slot.className = 'enemy-slot entering' + (e.def.isBoss ? ' enemy-slot-boss' : '');
    slot.id = `enemy-slot-${e.id}`;
    slot.innerHTML = `
      <div class="enemy-mini-stats">
        <div class="enemy-mini-name">${e.name}</div>
        <div class="hp-row">
          <div class="hp-text" id="enemy-hp-text-${e.id}">${e.hp}/${e.maxHp}</div>
          <div class="hp-bar-wrap"><div class="hp-fill enemy" id="enemy-hp-bar-${e.id}" style="width:100%"></div></div>
        </div>
        <div class="status-row" id="enemy-status-${e.id}"></div>
        <div class="intent-box" id="enemy-intent-${e.id}"></div>
      </div>
      <div class="sprite" id="enemy-sprite-${e.id}">${e.sprite}</div>
      <div class="shadow"></div>`;
    slot.addEventListener('click', () => {
      if (pendingPotion && e.hp > 0) { selectPotionTarget(e.id); return; }
      if (targeting && e.hp > 0) selectTarget(e.id);
    });
    area.appendChild(slot);
    setTimeout(() => slot.classList.remove('entering'), 400);
  });
}

// ================================================================
// ENEMY INTENT
// ================================================================
function buildIntent(moveDef) {
  return {
    name:             moveDef.name,
    atkDmg:           moveDef.atkDmgMin !== undefined
                        ? randInt(moveDef.atkDmgMin, moveDef.atkDmgMax)
                        : (moveDef.atkDmg || 0),
    defGain:          moveDef.defGain          || 0,
    playerWeak:       moveDef.playerWeak       || 0,
    playerVulnerable: moveDef.playerVulnerable || 0,
    playerJaku:       moveDef.playerJaku       || 0,
    playerEntangle:   moveDef.playerEntangle   || 0,
    selfStrength:     moveDef.selfStrength     || 0,
    selfRitual:       moveDef.selfRitual       || 0,
    addSlimed:        moveDef.addSlimed        || 0,
    stealGold:        moveDef.stealGold        || 0,
    shieldAlly:       moveDef.shieldAlly       || 0,
    atkDmgFallback:   moveDef.atkDmgFallback   || 0,
    charge:           moveDef.charge           || false,
    escape:           moveDef.escape           || false,
    split:            moveDef.split            || false,
    sleep:            moveDef.sleep            || false,
    stun:             moveDef.stun             || false,
    addDaze:          moveDef.addDaze          || 0,
    playerStrDown:      moveDef.playerStrDown      || 0,
    playerDexDown:      moveDef.playerDexDown      || 0,
    selfEnrage:         moveDef.selfEnrage         || 0,
    atkHits:            moveDef.atkHits            || 1,
    guardianModeSwitch: moveDef.guardianModeSwitch || null,
  };
}

function setEnemyIntent(e) {
  if (e.pendingSplit) return; // 分裂待ち中は行動予定を上書きしない
  const def = e.def;
  let moveDef;

  // openingMoves があり、まだそのターン数内なら固定行動
  if (def.openingMoves && e.turnCount < def.openingMoves.length) {
    moveDef = def.openingMoves[e.turnCount];

  } else if (def.pattern === 'sequence') {
    // openingMovesを除いたターン番号でsequenceを回す
    const offset = def.openingMoves ? def.openingMoves.length : 0;
    const seqIdx = e.turnCount - offset;
    // loopFromを考慮したインデックス計算
    let idx;
    if (seqIdx < def.moves.length) {
      idx = seqIdx;
    } else {
      const loopLen = def.moves.length - (def.loopFrom ?? 0);
      idx = (def.loopFrom ?? 0) + ((seqIdx - def.loopFrom) % loopLen);
    }
    moveDef = def.moves[idx];

  } else if (def.pattern === 'weighted') {
    const pool = def.moves
      .map((m, i) => ({m, i}))
      .filter(({i}) => !def.noRepeat || i !== e.lastMoveIndex);
    const total = pool.reduce((s, {m}) => s + m.weight, 0);
    let r = Math.random() * total;
    let chosen = pool[pool.length - 1];
    for (const item of pool) { r -= item.m.weight; if (r <= 0) { chosen = item; break; } }
    moveDef = chosen.m;
    e.lastMoveIndex = chosen.i;

  } else if (def.pattern === 'custom') {
    moveDef = def.customTurn(e);

  } else { // always
    moveDef = def.moves[0];
  }

  e.turnCount++;
  e.intent = buildIntent(moveDef);
}

function formatIntent(e) {
  const it = e.intent; if (!it) return '';
  // 敵の脱力・プレイヤーの脆弱を反映した実ダメージ計算
  function calcIntentDmg(base) {
    let d = base + (e.strength || 0);
    if (e.weak > 0) d = Math.floor(d * 0.75);
    if (player && player.jaku > 0) d = Math.floor(d * 1.5);
    return d;
  }
  const effects = [];
  if (it.split)  effects.push(`💥分裂`);
  if (it.charge) effects.push(`⚡充電中`);
  if (it.atkDmg > 0) {
    const dmg = calcIntentDmg(it.atkDmg);
    const mods = [e.weak > 0 ? '脱力中' : '', player?.jaku > 0 ? '弱体中' : ''].filter(Boolean);
    const hitsStr = (it.atkHits || 1) > 1 ? `×${it.atkHits}` : '';
    effects.push(`⚔️<b>${dmg}${hitsStr}</b>${mods.length ? `<span style="font-size:9px;color:#f98;"> (${mods.join('/')})</span>` : ''}`);
  }
  if (it.atkDmgMin > 0) {
    const lo = calcIntentDmg(it.atkDmgMin), hi = calcIntentDmg(it.atkDmgMax);
    effects.push(`⚔️<b>${lo}〜${hi}</b>`);
  }
  if (it.stealGold > 0)        effects.push(`💰盗む`);
  if (it.defGain > 0)          effects.push(`🛡<b>${it.defGain}</b>`);
  if (it.shieldAlly > 0)       effects.push(`🛡味方+<b>${it.shieldAlly}</b>`);
  if (it.playerWeak > 0)       effects.push(`💜脱力`);
  if (it.playerVulnerable > 0) effects.push(`🔴脆弱`);
  if (it.playerJaku > 0)       effects.push(`💔弱体`);
  if (it.playerEntangle > 0)   effects.push(`🔗拘束`);
  if (it.selfStrength > 0)     effects.push(`💪+<b>${it.selfStrength}</b>`);
  if (it.selfRitual > 0)       effects.push(`🌀+<b>${it.selfRitual}</b>`);
  if (it.addSlimed > 0)        effects.push(`🟢粘液${it.addSlimed > 1 ? '×'+it.addSlimed : ''}`);
  if (it.addDaze > 0)          effects.push(`💤めまい×${it.addDaze}`);
  if (it.escape)                effects.push(`🏃逃走`);
  if (it.sleep)                 effects.push(`😴睡眠`);
  if (it.stun)                  effects.push(`💫スタン`);
  if (it.selfEnrage > 0)       effects.push(`🔥激怒${it.selfEnrage}`);
  if (it.playerStrDown > 0)    effects.push(`💔筋力-${it.playerStrDown}`);
  if (it.playerDexDown > 0)    effects.push(`💔敏捷-${it.playerDexDown}`);
  // ガーディアン攻撃態勢: モードシフトまでの残りダメージを表示
  if (e.def && e.def.id === 'guardian' && e.guardianMode === 'offensive') {
    const remaining = Math.max(0, (e.modeShiftThreshold || 40) - (e.modeShiftDamage || 0));
    effects.push(`🔄残り<b>${remaining}</b>`);
  }
  const efStr = effects.length ? effects.join(' ') : '—';
  return `<div class="intent-name">${it.name}</div><div class="intent-effects">${efStr}</div>`;
}

// 手札のアタックカードのダメージプレビュー計算
// targetEnemy: 指定した敵の脆弱を適用。null の場合は脆弱を適用しない（基本表示）
function calcCardDmgPreview(card, targetEnemy = null) {
  if (card.type !== 'attack' && card.type !== 'attack-all') return null;
  if (!player || !enemies) return null;

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return null;

  let baseValue = card.value || 0;
  if (card.xCost) {
    return { text: `${baseValue + (player.strength||0)}×E` };
  }
  if (card.perStrikeDmg) {
    const sc = [...deck,...discard,...hand,...exhausted].filter(c => c.name && c.name.includes('ストライク')).length;
    baseValue = card.value + card.perStrikeDmg * sc;
  }
  if (card.exhaustHand) {
    const hits = hand.filter(c => c !== card).length;
    let raw = baseValue + (player.strength || 0);
    if (player.weak > 0) raw = Math.floor(raw * 0.75);
    return { text: `${raw}×${hits}`, total: raw * hits };
  }
  // ボディスラム: ブロック値がダメージ（strength相殺）
  if (card.damageEqualsBlock) {
    const blockVal = player ? (player.block || 0) : 0;
    return { text: `${blockVal}` };
  }
  // ランページ: 蓄積ボーナスを反映
  if (card.rampageDmgIncrease) baseValue += (card._rampageBonus || 0);
  const akabeko = relics.find(r => r.id === 'akabeko');
  if (akabeko && !akabeko.used) baseValue += 8;
  // ペン先: 次のアタックが2倍
  const penNib = relics.find(r => r.id === 'pen_nib');
  if (penNib && penNib.ready) baseValue *= 2;

  // ヘヴィブレード: 筋力倍率を反映（raw計算でstrength*mult になるよう調整）
  if (card.strengthMultiplier && player && player.strength > 0) {
    baseValue += (player.strength || 0) * ((card.strengthMultiplier || 1) - 1);
  }

  let raw = baseValue + (player.strength || 0);
  if (player.weak > 0) raw = Math.floor(raw * 0.75);

  const vuln = targetEnemy ? targetEnemy.jaku > 0 : false;
  if (vuln) raw = Math.floor(raw * 1.5);

  const hits = card.hits || 1;
  if (hits > 1) return { text: `${raw}×${hits}`, total: raw * hits, vuln };
  return { text: `${raw}`, vuln };
}

// カードホバー時に脆弱を考慮すべき代表敵を返す
// 単体 or 全員脆弱 → その敵を返す。それ以外 → null
function getCardHoverTarget(card) {
  if (card.type !== 'attack' && card.type !== 'attack-all') return null;
  const alive = enemies ? enemies.filter(e => e.hp > 0) : [];
  if (alive.length === 1) return alive[0];
  if (alive.length > 1 && alive.every(e => e.jaku > 0)) return alive[0];
  return null;
}

// ホバー時のカード説明文を計算済みダメージ数値に差し替えて返す
function getCardHoverDesc(card, targetEnemy = null) {
  const preview = calcCardDmgPreview(card, targetEnemy);
  if (!preview) return card.desc;
  if (card.xCost) return card.desc; // エネルギー依存のため表示変更不可

  let desc = card.desc;
  // perStrikeDmg カード: "6+ストライク系×2\nダメージ" → "14\nダメージ"
  if (card.perStrikeDmg) {
    desc = desc.replace(/\d+\+ストライク系×\d+\n/, preview.text + '\n');
    return desc;
  }
  // exhaustHand カード: preview.text は "7×3" の形式 → 1枚あたり値を取得
  // multi-hit カード: preview.text は "5×2" の形式 → 1撃あたり値を取得
  // 通常カード: preview.text はダメージ数値
  const perHit = preview.text.split('×')[0];
  desc = desc.replace(String(card.value) + 'ダメージ', perHit + 'ダメージ');
  return desc;
}

// 説明文をHTML化（&/</>エスケープ + \n→<br>）
function descToHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ホバー時の説明文HTML（変化したダメージ数値を黄色でハイライト）
function getCardHoverDescHL(card, targetEnemy = null) {
  const preview = calcCardDmgPreview(card, targetEnemy);
  if (!preview) return descToHtml(card.desc);
  if (card.xCost) return descToHtml(card.desc);

  const basePreview = calcCardDmgPreview(card, null);
  const HL = s => `<span class="desc-hl">${s}</span>`;

  if (card.perStrikeDmg) {
    const hoverVal = preview.text;
    const baseVal  = basePreview ? basePreview.text : String(card.value);
    const replaced = card.desc.replace(/\d+\+ストライク系×\d+\n/, hoverVal + '\n');
    let html = descToHtml(replaced);
    if (hoverVal !== baseVal) html = html.replace(hoverVal, HL(hoverVal));
    return html;
  }

  const perHit = preview.text.split('×')[0];
  const basePerHit = basePreview ? basePreview.text.split('×')[0] : String(card.value);
  const replaced = card.desc.replace(String(card.value) + 'ダメージ', perHit + 'ダメージ');
  let html = descToHtml(replaced);
  if (perHit !== basePerHit) html = html.replace(perHit + 'ダメージ', HL(perHit) + 'ダメージ');
  return html;
}

// ================================================================
// TOAST NOTIFICATIONS
// ================================================================
// showToast(opts)
//   opts.icon       : 絵文字
//   opts.label      : 小見出し（緑・青など色付き）
//   opts.title      : メインテキスト
//   opts.sub        : サブテキスト（省略可）
//   opts.arrow      : 変化前テキスト（「A → B」用、省略可）
//   opts.after      : 変化後テキスト（省略可）
//   opts.color      : ボーダー色
//   opts.duration   : 表示時間ms（デフォルト2600）
function showToast({ icon='📌', label='', title='', sub='', arrow='', after='', color='#555', duration=2600 } = {}) {
  const container = document.getElementById('toast-container');
  const div = document.createElement('div');
  div.className = 'toast';
  div.style.borderColor = color;
  div.style.boxShadow = `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${color}44`;
  div.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      ${label ? `<div class="toast-label" style="color:${color}">${label}</div>` : ''}
      <div class="toast-title">${title}</div>
      ${arrow ? `<div class="toast-arrow">▼ ${arrow}</div><div class="toast-card-after">${after}</div>` : ''}
      ${sub ? `<div class="toast-sub">${sub}</div>` : ''}
    </div>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), duration + 400);
}

// ================================================================
// HELPERS
// ================================================================
function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
}
function drawCards(n) {
  if (player && player.noMoreDraw) return; // バトルトランス: このターン追加ドロー不可
  for (let i=0;i<n;i++) {
    if (deck.length===0) { deck=discard; discard=[]; shuffle(deck); log('捨て札をシャッフルして山札に戻した'); }
    if (deck.length>0) {
      const drawn = deck.pop();
      hand.push(drawn);
      if (drawn.type === 'status') {
        if (player.powers && player.powers.evolve > 0) {
          log(`🧬 進化: ${drawn.name}をドロー → ${player.powers.evolve}枚追加ドロー`, 'buff');
          drawCards(player.powers.evolve);
        }
        // 炎の吐息: 状態異常・呪いをドローしたとき全敵にダメージ
        if (player.powers && player.powers.flameBreath > 0) {
          enemies.filter(e => e.hp > 0).forEach(e => {
            const dmg = dealDamageToEnemy(e, player.powers.flameBreath);
            log(`🐉 炎の吐息: ${e.name}に${dmg}ダメージ！`, 'damage');
            setTimeout(()=>{ animateHit(`enemy-sprite-${e.id}`); spawnFloatDmg(dmg,`enemy-sprite-${e.id}`,'attack'); },80);
          });
        }
      }
    }
  }
}
function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }

// ================================================================
