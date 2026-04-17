// PLAYER ACTIONS
// ================================================================
function playCard(index) {
  if (actingEnemy) return;
  // アップグレード対象選択モード中：クリックしたカードをアップグレード
  if (selectingUpgradeTarget) {
    const card = hand[index];
    if (!card.upgraded && card.type !== 'status') {
      upgradeCardTemp(card);
      log(`武装: ${card.name}をアップグレード！`, 'buff');
      selectingUpgradeTarget = false;
      render();
    }
    return;
  }
  const card = hand[index];
  if (card.unplayable) { log(`${card.name}は使用できない！`, 'debuff'); return; }
  if (getEffectiveCost(card) > energy) { log('エネルギーが足りない！'); return; }

  if (card.type === 'attack' || card.type === 'attack-all') {
    if (player.entangled > 0) { log('拘束中のため攻撃カードが使用できない！', 'debuff'); return; }
  }
  if (card.type === 'attack') {
    const alive = enemies.filter(e => e.hp > 0);
    if (card.randomTarget) { executeCard(card, index, null); return; }
    if (alive.length === 1) { executeCard(card, index, alive[0].id); return; }
    pendingCard = {card, index}; targeting = true; render(); return;
  }
  if (card.needsTarget) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length === 1) { executeCard(card, index, alive[0].id); return; }
    pendingCard = {card, index}; targeting = true; render(); return;
  }
  executeCard(card, index, null);
}

function selectTarget(id) {
  if (!targeting || !pendingCard) return;
  targeting = false;
  const {card, index} = pendingCard; pendingCard = null;
  executeCard(card, index, id);
}

function cancelTarget() { targeting = false; pendingCard = null; selectingUpgradeTarget = false; pendingPotion = null; render(); }

function usePotion(index) {
  if (actingEnemy) return;
  if (pendingPotion) { pendingPotion = null; render(); return; } // 再クリックでキャンセル
  const potion = potions[index];
  if (!potion) return;
  if (potion.needsTarget) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length === 0) return;
    if (alive.length === 1) {
      potions.splice(index, 1);
      potion.use(alive[0].id);
      return;
    }
    pendingPotion = { potion, index };
    render();
    return;
  }
  potions.splice(index, 1);
  potion.use(null);
}

function selectPotionTarget(enemyId) {
  if (!pendingPotion) return;
  const { potion, index } = pendingPotion;
  pendingPotion = null;
  potions.splice(index, 1);
  potion.use(enemyId);
}

function showPotionCardChoice(typeFilter, title) {
  // typeFilterに合うカードをALL_CARDSからランダムに3枚選ぶ
  const isMatch = c => {
    if (c.rarity === 'starter' || c.type === 'status') return false;
    if (typeFilter === 'attack') return c.type === 'attack' || c.type === 'attack-all';
    if (typeFilter === 'skill')  return c.type === 'skill'  || c.type === 'defend';
    if (typeFilter === 'power')  return c.type === 'power';
    return true; // 'any'
  };
  const pool = ALL_CARDS.filter(isMatch);
  shuffle(pool);
  const choices = pool.slice(0, 3);
  document.getElementById('potion-card-title').textContent = title;
  const container = document.getElementById('potion-card-choices');
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.gap = '18px';
  container.style.justifyContent = 'center';
  container.style.margin = '20px 0 24px';
  choices.forEach(card => {
    const tc = getCardClass(card);
    const div = document.createElement('div');
    div.className = `reward-card ${tc}`;
    div.innerHTML = `
      ${getCostHtml(card)}
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>`;
    div.onclick = () => selectPotionCard(card);
    container.appendChild(div);
  });
  document.getElementById('potion-card-screen').classList.add('show');
}

function selectPotionCard(cardDef) {
  document.getElementById('potion-card-screen').classList.remove('show');
  const copy = { ...cardDef, cost: 0, battleOnly: true };
  hand.push(copy);
  log(`🧪 ${cardDef.name}を手札に加えた（このターンコスト0）`, 'buff');
  render();
}

function closePotionCardChoice() {
  document.getElementById('potion-card-screen').classList.remove('show');
  // ポーションは消費済み（useが呼ばれた後なので返却不要）
}

// プレイヤーのブロック獲得（脆弱で-25%）
function gainPlayerBlock(amount) {
  const withDex = amount + (player.dexterity || 0);
  const actual = player.vulnerable > 0 ? Math.floor(withDex * 0.75) : withDex;
  const gained = Math.max(0, actual);
  player.block += gained;
  if (gained > 0) {
    SFX.block();
    // ジャガーノート: ブロック獲得時ランダムな敵にダメージ
    if (player.powers && player.powers.juggernaut > 0) {
      const alive = enemies.filter(e => e.hp > 0);
      if (alive.length > 0) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        const dmg = dealDamageToEnemy(t, player.powers.juggernaut);
        log(`⚙️ ジャガーノート: ${t.name}に${dmg}ダメージ！`, 'damage');
        setTimeout(()=>{ animateHit(`enemy-sprite-${t.id}`); spawnFloatDmg(dmg,`enemy-sprite-${t.id}`,'attack'); },80);
      }
    }
  }
  return gained;
}

// まるくなるチェック (ダメージを与えた後に呼ぶ)
function checkCurlUp(target, dmg) {
  if (dmg > 0 && target.curlUp > 0 && !target.curlUpTriggered) {
    target.curlUpTriggered = true;
    target.block += target.curlUp;
    log(`${target.name}がまるくなった！ ${target.curlUp}ブロック獲得`, 'buff');
    spawnFloatDmg(target.curlUp, `enemy-sprite-${target.id}`, 'block');
  }
}

function dealDamageToEnemy(target, baseValue) {
  // ペン先: ダメージ2倍フラグ
  const penNibRelic = relics.find(r => r.id === 'pen_nib');
  if (penNibRelic && penNibRelic.ready) { baseValue *= 2; penNibRelic.ready = false; log('✒️ ペン先: ダメージ2倍！','buff'); }
  let raw = baseValue + (player.strength || 0);
  if (player.weak > 0)  raw = Math.floor(raw * 0.75);
  if (target.jaku > 0)  raw = Math.floor(raw * 1.5);
  let dmg = Math.max(0, raw - target.block);
  // ザ・ブーツ: 突き通すダメージが1〜4なら5に引き上げ
  if (dmg > 0 && dmg < 5 && relics.some(r => r.id === 'the_boot')) { dmg = 5; }
  target.block = Math.max(0, target.block - raw);
  target.hp -= dmg;
  if (dmg > 0) SFX.hit();
  if (target.hp <= 0) setTimeout(() => SFX.enemyDie(), 150);
  // 怒り: 攻撃ダメージを受けるたびに筋力獲得
  if (dmg > 0 && target.def.rage) {
    target.strength += target.def.rage;
    log(`${target.name}が怒り！ 筋力+${target.def.rage}`, 'buff');
  }
  // ラガヴーリン: 睡眠中にダメージを受けたらスタン予約
  if (dmg > 0 && target.sleeping && !target.awakenStunPending) {
    target.awakenStunPending = true;
    log(`${target.name}が目覚めた！ 金属化が解除される！`, 'important');
  }
  // 胞子の雲: 死亡時プレイヤーに脆弱付与
  if (target.hp <= 0 && target.def.sporeCloud && !target.sporeCloudDone) {
    target.sporeCloudDone = true;
    player.jaku += 2;
    log(`${target.name}の胞子の雲！ プレイヤーに弱体2付与`, 'debuff');
  }
  // 倒したとき盗んだゴールドを返却
  if (target.hp <= 0 && !target.fled && target.stolenGold > 0) {
    player.gold += target.stolenGold;
    log(`盗まれた ${target.stolenGold}G が返ってきた！`, 'buff');
    target.stolenGold = 0;
  }
  // 分裂判定: HP半減時に行動予定を「分裂」に上書きするだけ（実際の分裂は次のターン行動時）
  if ((target.def.splitOnHalfHp || target.def.splitTypes) && !target.splitDone && !target.pendingSplit && target.hp > 0 && target.hp <= Math.floor(target.maxHp / 2)) {
    target.pendingSplit = true;
    target.intent = buildIntent({ name:'分裂', split:true });
    log(`${target.name}のHPが半減！次の行動で分裂する`, 'important');
  }
  // ガーディアン: 攻撃態勢中のモードシフト判定（累積ダメージが閾値に達したら即座に防御態勢移行）
  if (dmg > 0 && target.def && target.def.id === 'guardian' && target.guardianMode === 'offensive' && target.hp > 0) {
    target.modeShiftDamage = (target.modeShiftDamage || 0) + dmg;
    if (target.modeShiftDamage >= target.modeShiftThreshold) {
      target.guardianMode = 'defensive';
      target.defensiveTurn = 0;
      target.modeShiftDamage = 0;
      target.block += 20;
      // sharpHideは次のターン開始時に付与（移行ターンは行動しない）
      target.intent = { name:'防御態勢移行', modeShiftTransition: true };
      log(`🤖 ガーディアンが防御態勢に移行！ ブロック+20（このターンは他に行動しない）`, 'important');
    }
  }
  return dmg;
}

// 分裂実行（processEnemyAction から呼ぶ）
function doSplit(e) {
  e.pendingSplit = false;
  e.splitDone = true;
  const splitHP = e.hp;
  const splitName = e.name;

  // 元の敵を配列から除去（hp=0で残さない）
  const idx = enemies.indexOf(e);
  if (idx !== -1) enemies.splice(idx, 1);

  // 同種×2 か 異種リスト か
  const typeIds = e.def.splitTypes
    ? e.def.splitTypes
    : [e.def.splitOnHalfHp, e.def.splitOnHalfHp];

  const nextId = () => enemies.reduce((m, x) => Math.max(m, x.id), -1) + 1;
  typeIds.forEach(typeId => {
    const def2 = ENEMY_DEFS[typeId];
    enemies.push({
      id:nextId(), def:def2,
      name:def2.name, sprite:def2.sprite,
      hp:splitHP, maxHp:splitHP,
      block:0, weak:0, vulnerable:0, jaku:0, strength:0, ritual:0,
      curlUp:0, curlUpTriggered:false,
      splitDone:false, stolenGold:0, fled:false,
      intent:null, turnCount:0, lastMoveIndex:-1,
    });
  });
  log(`${splitName}が分裂した！ (HP各${splitHP})`, 'important');
  buildEnemyDOM();
}

// ── カードヘルパー ──────────────────────────────────────────────
function getEffectiveCost(card) {
  if (card.xCost) return 0;
  if (player.powers && player.powers.corruption && (card.type === 'skill' || card.type === 'defend')) return 0;
  return Math.max(0, card.cost - (card._costReduction || 0));
}
function getDisplayCost(card) {
  if (card.xCost) return 'X';
  return getEffectiveCost(card);
}
function getRarityClass(card) {
  const r = card.rarity;
  if (r === 'uncommon') return 'cost-uncommon';
  if (r === 'rare')     return 'cost-rare';
  return 'cost-common';
}
function getCostHtml(card) {
  return `<div class="cost ${getRarityClass(card)}">${getDisplayCost(card)}</div>`;
}
function getCardClass(card) {
  if (card.type === 'power')  return 'power-card';
  if (card.type === 'skill')  return 'skill-card';
  if (card.type === 'defend') return 'defend-card';
  if (card.type === 'status') return 'status-card';
  return 'attack-card';
}
function triggerOnExhaust(card) {
  // 見張り: このカード自身が廃棄された時エネルギー獲得
  if (card && card.onExhaustGainEnergy) {
    energy += card.onExhaustGainEnergy;
    log(`👁 見張り: 廃棄 → エネルギー+${card.onExhaustGainEnergy}`, 'buff');
  }
  if (!player || !player.powers) return;
  if (player.powers.feelNoPain > 0) {
    const b = gainPlayerBlock(player.powers.feelNoPain);
    spawnFloatDmg(b, 'player-sprite', 'block');
    log(`🛡 無痛: ブロック+${b}`, 'buff');
  }
  if (player.powers.darkEmbrace > 0) {
    drawCards(player.powers.darkEmbrace);
    log(`🖤 闇の抱擁: ${player.powers.darkEmbrace}枚ドロー`, 'buff');
  }
}

function executeCard(card, cardIndex, targetId) {
  const cost   = getEffectiveCost(card);
  const xSpent = card.xCost ? energy : 0;
  energy -= card.xCost ? energy : cost;
  hand.splice(cardIndex, 1);
  // SE
  if      (card.type === 'attack' || card.type === 'attack-all') SFX.playAttack();
  else if (card.type === 'defend') SFX.playDefend();
  else if (card.type === 'power')  SFX.playPower();
  else if (card.type === 'skill')  SFX.playSkill();

  // カードの行き先
  const shouldExhaust = card.type === 'status' || card.type === 'power' || card.exhaust
                     || (player.powers && player.powers.corruption && (card.type === 'skill' || card.type === 'defend'));
  if (shouldExhaust) {
    exhausted.push(card);
    if (card.type !== 'status') triggerOnExhaust(card);
  } else {
    discard.push(card);
  }

  if (card.type === 'status') { log(`${card.name}を破棄した`); render(); return; }

  // HP消費（攻撃前に処理）
  if (card.loseHp) {
    player.hp = Math.max(0, player.hp - card.loseHp);
    log(`HP${card.loseHp}を消費した`, 'debuff');
    spawnFloatDmg(card.loseHp, 'player-sprite', 'attack');
    onPlayerHpLoss();
    if (player.hp <= 0) { render(); setTimeout(onDefeat, 200); return; }
  }
  // 即時エネルギー取得
  if (card.gainEnergy) { energy += card.gainEnergy; log(`エネルギー+${card.gainEnergy}`); }

  // ── 攻撃 ──────────────────────────────────────────────────────
  if (card.type === 'attack') {
    // アタック使用カウント (ヌンチャク・ペン先・孫子兵法・赤べこ)
    attacksPlayedThisCombat++;
    triggerRelics('on_attack_played');
    // ヌンチャク: 10回ごとにエネルギー+1
    const nunchakuRelic = relics.find(r => r.id === 'nunchaku');
    if (nunchakuRelic) {
      nunchakuRelic.counter = (nunchakuRelic.counter || 0) + 1;
      if (nunchakuRelic.counter % 10 === 0) { energy += 1; log('🥢 ヌンチャク: エネルギー+1','buff'); }
    }
    // ペン先: 10回目のアタック後に次のアタックが2倍フラグをセット
    const penNibRelic = relics.find(r => r.id === 'pen_nib');
    if (penNibRelic) {
      penNibRelic.counter = (penNibRelic.counter || 0) + 1;
      if (penNibRelic.counter % 10 === 0) { penNibRelic.ready = true; log('✒️ ペン先: 次のアタックが2倍になる！','buff'); }
    }

    // 鬼火: 先に手札を全破棄してヒット数算出
    let hits = card.hits || 1;
    if (card.exhaustHand) {
      const toEx = [...hand]; hand.length = 0;
      toEx.forEach(c => { exhausted.push(c); triggerOnExhaust(c); });
      hits = toEx.length;
      log(`手札${toEx.length}枚を破棄した！`, 'buff');
    }
    // パーフェクトストライク: ストライク系カード枚数で加算
    let baseValue = card.value;
    if (card.perStrikeDmg) {
      const allCards = [...deck, ...discard, ...hand, ...exhausted];
      const sc = allCards.filter(c => c.name && c.name.includes('ストライク')).length;
      baseValue = card.value + card.perStrikeDmg * sc;
      log(`パーフェクトストライク: ストライク系${sc}枚 → ${baseValue}ダメージ`, 'damage');
    }
    // ヘヴィブレード: 筋力倍率を追加適用（dealDamageToEnemy が+1回分追加するので mult-1 だけ先乗せ）
    if (card.strengthMultiplier && player.strength > 0) {
      baseValue += player.strength * (card.strengthMultiplier - 1);
    }
    // ボディスラム: 現在ブロック値をダメージに（dealDamageToEnemy が+str するので先に引く）
    if (card.damageEqualsBlock) {
      baseValue = Math.max(0, player.block) - (player.strength || 0);
    }
    // ランページ: 使用ごとにダメージ増加
    if (card.rampageDmgIncrease) {
      if (card._rampageBonus == null) card._rampageBonus = 0;
      baseValue += card._rampageBonus;
      card._rampageBonus += card.rampageDmgIncrease;
    }
    // 霊魂切断: アタック以外の手札を先に廃棄
    if (card.exhaustNonAttackHand) {
      const toEx = [...hand].filter(c => c.type !== 'attack' && c.type !== 'attack-all');
      toEx.forEach(c => {
        const idx = hand.indexOf(c);
        if (idx >= 0) { hand.splice(idx, 1); exhausted.push(c); triggerOnExhaust(c); }
      });
      if (toEx.length > 0) log(`霊魂切断: ${toEx.length}枚を廃棄`, 'buff');
    }
    // 赤べこ: 戦闘中最初のアタックに+8ダメージ
    const akabekoRelic = relics.find(r => r.id === 'akabeko');
    if (akabekoRelic && !akabekoRelic.used) { akabekoRelic.used = true; baseValue += 8; log('🐄 赤べこ: ダメージ+8','buff'); }
    const target = targetId != null ? enemies.find(e => e.id === targetId) : null;
    let totalDmg = 0;
    for (let h = 0; h < hits; h++) {
      let t = target;
      if (card.randomTarget) {
        const alive = enemies.filter(e => e.hp > 0); if (!alive.length) break;
        t = alive[Math.floor(Math.random() * alive.length)];
      }
      if (!t || t.hp <= 0) break;
      const dmg = dealDamageToEnemy(t, baseValue); totalDmg += dmg; checkCurlUp(t, dmg);
      if (card.randomTarget) setTimeout(()=>{ animateHit(`enemy-sprite-${t.id}`); spawnFloatDmg(dmg,`enemy-sprite-${t.id}`,'attack'); },180);
    }
    if (!card.exhaustHand || hits > 0) {
      const hitsNote = (card.hits||1) > 1 || card.exhaustHand ? `×${hits} (計${totalDmg})` : `${totalDmg}`;
      const mods = [player.weak>0?'脱力中':'', target&&target.jaku>0?'敵弱体中':''].filter(Boolean).join('/');
      log(`${card.name}: ${target?target.name:'ランダム'}に ${hitsNote} ダメージ${mods?' ('+mods+')':''}`, 'damage');
    }
    animateLunge('player-sprite','right');
    if (!card.randomTarget && target) setTimeout(()=>{ animateHit(`enemy-sprite-${targetId}`); spawnFloatDmg(totalDmg,`enemy-sprite-${targetId}`,'attack'); },180);
    if (card.block) { const b = gainPlayerBlock(card.block); spawnFloatDmg(b,'player-sprite','block'); }
    if (card.vulnerable && target) { target.jaku += card.vulnerable; log(`${target.name}に弱体${card.vulnerable}付与`,'buff'); }
    if (card.targetWeak && target) { target.weak += card.targetWeak; log(`${target.name}に脱力${card.targetWeak}付与`,'buff'); }
    if (card.ifVulnerable && target && target.jaku > 0) { energy++; drawCards(1); log(`ドロップキック: 弱体中 → エネルギー+1・1枚ドロー`,'buff'); }
    if (card.addCopyToDiscard) { discard.push({...CARD_MAP[card.id], battleOnly:true}); log(`${card.name}のコピーが捨て札へ`); }
    if (card.addWound) { for (let w=0;w<card.addWound;w++) discard.push({...CARD_MAP['wound']}); log(`傷が捨て札に追加された`,'debuff'); }
    if (card.addDazeToDiscard) { for (let d=0;d<card.addDazeToDiscard;d++) discard.push({...CARD_MAP['daze']}); log(`めまいが捨て札に追加された`,'debuff'); }
    if (card.feedOnKill && target && target.hp <= 0) {
      player.maxHp += card.feedOnKill; player.hp = Math.min(player.hp + card.feedOnKill, player.maxHp);
      log(`🍖 捕食: 最大HP+${card.feedOnKill}！`,'buff');
    }
    if (player.rageTurn > 0) {
      const b = gainPlayerBlock(player.rageTurn); spawnFloatDmg(b,'player-sprite','block');
    }
    if (card.chooseDiscardToDraw) {
      // 自身を除いた捨て札から1枚選んで山札トップに戻す
      const pickable = discard.filter(c => c !== card);
      if (pickable.length === 0) {
        log('捨て札にカードがない', 'debuff');
      } else {
        if (enemies.every(e => e.hp <= 0)) { render(); setTimeout(onVictory, 400); return; }
        openEventCardPicker(
          '山札トップに戻すカードを選択',
          '捨て札から1枚選んで山札のトップに移動します。',
          '#aad4f5',
          (pileArr, idx, picked) => {
            pileArr.splice(idx, 1);
            deck.push(picked);
            log(`${picked.name}を山札のトップに戻した`, 'buff');
            render();
          },
          () => { render(); },
          pickable
        );
        return;
      }
    }
    // シャープハイド: アタックカード使用時に反撃ダメージ（ヒット数に関係なく1回）
    { const shEn = enemies.find(en => en.hp > 0 && (en.sharpHide || 0) > 0);
      if (shEn) {
        const shVal = shEn.sharpHide;
        const shDmg = Math.max(0, shVal - player.block);
        player.block = Math.max(0, player.block - shVal);
        player.hp -= shDmg;
        log(`🔪 シャープハイド: ${shDmg} ダメージを受けた！`, 'debuff');
        setTimeout(() => { animateHit('player-sprite'); spawnFloatDmg(shDmg, 'player-sprite', 'attack'); }, 350);
      }
    }

  // ── 全体攻撃 ───────────────────────────────────────────────────
  } else if (card.type === 'attack-all') {
    attacksPlayedThisCombat++;
    triggerRelics('on_attack_played');
    const nunchakuR = relics.find(r => r.id === 'nunchaku');
    if (nunchakuR) { nunchakuR.counter = (nunchakuR.counter||0)+1; if(nunchakuR.counter%10===0){energy+=1;log('🥢 ヌンチャク: エネルギー+1','buff');} }
    const penNibR = relics.find(r => r.id === 'pen_nib');
    if (penNibR) { penNibR.counter = (penNibR.counter||0)+1; if(penNibR.counter%10===0){penNibR.ready=true;log('✒️ ペン先: 次のアタックが2倍になる！','buff');} }
    const alive = enemies.filter(e => e.hp > 0);
    log(`${card.name}: 全体攻撃！`, 'damage');
    animateLunge('player-sprite','right');
    const times = card.xCost ? xSpent : 1;
    let totalHeal = 0;
    const akabekoAoE = relics.find(r => r.id === 'akabeko');
    const akabekoBonus = (akabekoAoE && !akabekoAoE.used) ? 8 : 0;
    if (akabekoBonus > 0) { akabekoAoE.used = true; log('🐄 赤べこ: ダメージ+8','buff'); }
    const aoEBaseValue = card.value + akabekoBonus;
    alive.forEach(e => {
      let eDmg = 0;
      for (let h = 0; h < times; h++) {
        if (e.hp <= 0) break;
        const dmg = dealDamageToEnemy(e, aoEBaseValue); eDmg += dmg; checkCurlUp(e, dmg);
      }
      setTimeout(()=>{ animateHit(`enemy-sprite-${e.id}`); spawnFloatDmg(eDmg,`enemy-sprite-${e.id}`,'attack'); },180);
      log(`　${e.name}に ${eDmg} ダメージ`,'damage');
      if (card.healOnDamage) totalHeal += eDmg;
    });
    if (card.healOnDamage && totalHeal > 0) {
      const healed = Math.min(totalHeal, player.maxHp - player.hp);
      player.hp += healed;
      if (healed > 0) { spawnFloatDmg(healed,'player-sprite','heal'); log(`死神: HP+${healed} 回復`,'buff'); }
    }
    if (card.addBurn) { for (let b=0;b<card.addBurn;b++) discard.push({...CARD_MAP['burn']}); log(`火傷が捨て札に追加された`,'debuff'); }
    if (card.allWeak)       { enemies.filter(e=>e.hp>0).forEach(e=>{ e.weak += card.allWeak;       log(`${e.name}に脱力${card.allWeak}付与`,'buff'); }); }
    if (card.allVulnerable) { enemies.filter(e=>e.hp>0).forEach(e=>{ e.jaku += card.allVulnerable; log(`${e.name}に弱体${card.allVulnerable}付与`,'buff'); }); }
    if (player.rageTurn > 0) {
      const b = gainPlayerBlock(player.rageTurn); spawnFloatDmg(b,'player-sprite','block');
    }
    // シャープハイド: アタックカード使用時に反撃ダメージ（ヒット数に関係なく1回）
    { const shEn = enemies.find(en => en.hp > 0 && (en.sharpHide || 0) > 0);
      if (shEn) {
        const shVal = shEn.sharpHide;
        const shDmg = Math.max(0, shVal - player.block);
        player.block = Math.max(0, player.block - shVal);
        player.hp -= shDmg;
        log(`🔪 シャープハイド: ${shDmg} ダメージを受けた！`, 'debuff');
        setTimeout(() => { animateHit('player-sprite'); spawnFloatDmg(shDmg, 'player-sprite', 'attack'); }, 350);
      }
    }

  // ── 防御・スキル ───────────────────────────────────────────────
  } else if (card.type === 'defend' || card.type === 'skill') {
    if (card.value) {
      const gained = gainPlayerBlock(card.value);
      log(`${card.name}: ${gained} ブロック獲得${player.vulnerable>0?' (脆弱中)':''}${player.dexterity!==0?` (敏捷性${player.dexterity>0?'+':''}${player.dexterity})`:''}`);
      spawnFloatDmg(gained,'player-sprite','block');
    }
    if (card.doubleBlock) {
      const before = player.block; player.block = before * 2;
      log(`${card.name}: ブロック ${before}→${player.block}`,'buff');
      if (player.block > before) spawnFloatDmg(player.block-before,'player-sprite','block');
    }
    if (card.doubleStrength) { player.strength *= 2; log(`${card.name}: 筋力 → ${player.strength}！`,'buff'); }
    // 弱点発見: 条件付き筋力獲得（通常のgainStrengthより先に処理）
    if (card.ifEnemyAttacking) {
      const attacking = enemies.some(e => e.hp > 0 && e.intent && e.intent.atkDmg > 0);
      if (attacking) {
        player.strength += card.gainStrength || 0;
        log(`${card.name}: 攻撃予定の敵あり → 筋力+${card.gainStrength || 0}`, 'buff');
      } else {
        log(`${card.name}: 攻撃予定の敵がいない`, 'debuff');
      }
    }
    if (card.gainStrength && !card.ifEnemyAttacking) { player.strength += card.gainStrength; log(`${card.name}: 筋力+${card.gainStrength} (合計: ${player.strength})`,'buff'); }
    if (card.loseStrengthEOT) { player.loseStrengthEOT = (player.loseStrengthEOT||0) + card.loseStrengthEOT; }
    if (card.allWeak)        { enemies.filter(e=>e.hp>0).forEach(e=>{ e.weak += card.allWeak; log(`${e.name}に脱力${card.allWeak}付与`,'buff'); }); }
    if (card.allVulnerable)  { enemies.filter(e=>e.hp>0).forEach(e=>{ e.jaku += card.allVulnerable; log(`${e.name}に弱体${card.allVulnerable}付与`,'buff'); }); }
    if (card.targetStrDown)  {
      const t = targetId != null ? enemies.find(e => e.id === targetId) : enemies.find(e=>e.hp>0);
      if (t) { t.strength = (t.strength||0) - card.targetStrDown; log(`${t.name}の筋力-${card.targetStrDown} (合計: ${t.strength})`,'buff'); }
    }
    // セカンドウィンド: アタック以外の手札を廃棄してブロック獲得
    if (card.secondWind) {
      const toEx = [...hand].filter(c => c.type !== 'attack' && c.type !== 'attack-all');
      toEx.forEach(c => {
        const idx = hand.indexOf(c);
        if (idx >= 0) { hand.splice(idx, 1); exhausted.push(c); triggerOnExhaust(c); }
      });
      const swBlock = gainPlayerBlock(toEx.length * card.secondWind);
      if (swBlock > 0) spawnFloatDmg(swBlock, 'player-sprite', 'block');
      log(`セカンドウィンド: ${toEx.length}枚廃棄 → ブロック+${swBlock}`, 'buff');
    }
    // バトルトランス: ドローしてこのターンの追加ドローを禁止
    if (card.noMoreDraw) {
      drawCards(card.draw || 0);
      player.noMoreDraw = true;
    }
    // 炎の障壁: このターン攻撃を受けると反撃ダメージ
    if (card.flameBarrier) {
      player.flameBarrier = (player.flameBarrier || 0) + card.flameBarrier;
      log(`${card.name}: このターン攻撃を受けると${player.flameBarrier}ダメージ反撃`, 'buff');
    }
    if (card.exhaustChoose) {
      if (hand.length === 0) {
        log(`${card.name}: 手札にカードがない`, 'debuff');
      } else {
        openEventCardPicker(
          '破棄するカードを選択',
          '手札から1枚選んで破棄します。',
          '#e94560',
          (pileArr, idx, picked) => {
            pileArr.splice(idx, 1);
            exhausted.push(picked);
            triggerOnExhaust(picked);
            log(`${card.name}: ${picked.name}を廃棄`, 'buff');
            if (card.draw) drawCards(card.draw);
            render();
          },
          () => { render(); },
          [...hand]
        );
        return;
      }
    }
    if (card.exhaustRandom) {
      for (let r=0;r<card.exhaustRandom;r++) {
        if (hand.length>0) {
          const idx = Math.floor(Math.random()*hand.length);
          const c = hand.splice(idx,1)[0]; exhausted.push(c); triggerOnExhaust(c);
          log(`${card.name}: ${c.name}を破棄`,'buff');
        }
      }
    }
    if (card.upgradeRandomHand) {
      const upgradable = hand.filter(c=>!c.upgraded && c.type!=='status');
      if (card.upgradeAllHand) {
        upgradable.forEach(c => { upgradeCardTemp(c); log(`${card.name}: ${c.name}をアップグレード！`,'buff'); });
      } else if (upgradable.length>0) {
        selectingUpgradeTarget = true;
        log('武装: アップグレードするカードを選んでください','buff');
      }
    }
    if (card.addWoundToHand) {
      for (let w=0;w<card.addWoundToHand;w++) hand.push({...CARD_MAP['wound']});
      log(`傷×${card.addWoundToHand}が手札に追加された`,'debuff');
    }
    if (card.rageTurn) {
      player.rageTurn = (player.rageTurn || 0) + card.rageTurn;
      log(`${card.name}: このターン攻撃時ブロック+${card.rageTurn}`,'buff');
    }
    // Enrage (スキル・防御使用時)
    enemies.forEach(e=>{ if(e.hp>0 && e.enrage>0) { e.strength+=e.enrage; log(`👑 ${e.name}の激怒！ 筋力+${e.enrage} (合計: ${e.strength})`,'buff'); } });

  // ── パワー ─────────────────────────────────────────────────────
  } else if (card.type === 'power') {
    if (card.gainStrength) { player.strength += card.gainStrength; log(`${card.name}: 筋力+${card.gainStrength} (合計: ${player.strength})`,'buff'); }
    if (card.gainWeak)     { player.weak += card.gainWeak; log(`${card.name}: 自分に脱力${card.gainWeak}付与`, 'debuff'); }
    if (card.gainJaku)     { player.jaku += card.gainJaku; log(`${card.name}: 自分に弱体${card.gainJaku}付与`, 'debuff'); }
    if (card.powerEffect) {
      if (!player.powers) player.powers = {};
      const st = card.powerStacks || 1;
      switch (card.powerEffect) {
        case 'metallicize':  player.powers.metallicize  = (player.powers.metallicize||0)+st;  log(`${card.name}: ターン終了時ブロック+${player.powers.metallicize}`,'buff'); break;
        case 'brutality':    player.powers.brutality    = (player.powers.brutality||0)+1;      log(`${card.name}: 各ターン開始時HP-1・1枚ドロー`,'buff'); break;
        case 'feelNoPain':   player.powers.feelNoPain   = (player.powers.feelNoPain||0)+st;    log(`${card.name}: 破棄時ブロック+${player.powers.feelNoPain}`,'buff'); break;
        case 'rage':         /* rageTurnスキルに移行済み */ break;
        case 'corruption':   player.powers.corruption   = true;                                 log(`${card.name}: スキルカードのコスト0化・使用時破棄`,'buff'); break;
        case 'evolve':       player.powers.evolve       = (player.powers.evolve||0)+st;         log(`${card.name}: ステータスドロー時${player.powers.evolve}枚追加ドロー`,'buff'); break;
        case 'darkEmbrace':  player.powers.darkEmbrace  = (player.powers.darkEmbrace||0)+st;   log(`${card.name}: 破棄時${player.powers.darkEmbrace}枚ドロー`,'buff'); break;
        case 'demonForm':    player.powers.demonForm    = (player.powers.demonForm||0)+st;      log(`${card.name}: 毎ターン筋力+${player.powers.demonForm}`,'buff'); break;
        case 'flameBreath':  player.powers.flameBreath  = (player.powers.flameBreath||0)+st;   log(`${card.name}: 状態異常ドロー時全体${player.powers.flameBreath}ダメージ`,'buff'); break;
        case 'combust':      player.powers.combust      = (player.powers.combust||0)+st;        log(`${card.name}: ターン終了時HP-1・全体${player.powers.combust}ダメージ`,'buff'); break;
        case 'juggernaut':   player.powers.juggernaut   = (player.powers.juggernaut||0)+st;    log(`${card.name}: ブロック獲得時ランダムな敵に${player.powers.juggernaut}ダメージ`,'buff'); break;
        case 'barricade':    player.powers.barricade    = true;                                  log(`${card.name}: ターン開始時ブロックを失わない`,'buff'); break;
        case 'berserk':      player.powers.berserk      = (player.powers.berserk||0)+1;         log(`${card.name}: ターン開始時エネルギー+1`,'buff'); break;
      }
    }
    // Enrage (パワー使用時)
    enemies.forEach(e=>{ if(e.hp>0 && e.enrage>0) { e.strength+=e.enrage; log(`👑 ${e.name}の激怒！ 筋力+${e.enrage} (合計: ${e.strength})`,'buff'); } });
  }

  if (card.draw && !card.noMoreDraw) drawCards(card.draw);
  if (enemies.every(e=>e.hp<=0)) { setTimeout(onVictory,400); return; }
  render();
}

// ================================================================
// END TURN
// ================================================================
function endTurn() {
  if (actingEnemy) return;
  SFX.endTurn();
  targeting = false; pendingCard = null; selectingUpgradeTarget = false;
  actingEnemy = true; setInputEnabled(false);

  // エセリアル破棄
  [...hand].filter(c => c.ethereal).forEach(c => {
    hand.splice(hand.indexOf(c),1); exhausted.push(c);
    triggerOnExhaust(c);
    log(`${c.name}が破棄された`,'buff');
  });

  // 火傷ダメージ（ターン終了時、手札の火傷カード）
  const burns = hand.filter(c => c.burnDmg);
  if (burns.length > 0) {
    const totalBurn = burns.reduce((s,c) => s + c.burnDmg, 0);
    player.hp = Math.max(0, player.hp - totalBurn);
    log(`🔥 火傷×${burns.length}: ${totalBurn}ダメージ！`,'debuff');
    spawnFloatDmg(totalBurn,'player-sprite','attack');
  }

  // プレイヤーの金属化パワー（ターン終了時ブロック）
  if (player.powers && player.powers.metallicize > 0) {
    const b = gainPlayerBlock(player.powers.metallicize);
    log(`🪨 金属化: ブロック+${b}`,'buff');
    spawnFloatDmg(b,'player-sprite','block');
  }

  // 燃焼: ターン終了時HP-1 + 全敵にダメージ
  if (player.powers && player.powers.combust > 0) {
    player.hp = Math.max(0, player.hp - 1);
    log(`💥 燃焼: HP-1`, 'debuff');
    spawnFloatDmg(1, 'player-sprite', 'attack');
    enemies.filter(e => e.hp > 0).forEach(e => {
      const dmg = dealDamageToEnemy(e, player.powers.combust);
      log(`  ${e.name}に${dmg}ダメージ`, 'damage');
      setTimeout(()=>{ animateHit(`enemy-sprite-${e.id}`); spawnFloatDmg(dmg,`enemy-sprite-${e.id}`,'attack'); },80);
    });
  }

  // フレックス: ターン終了時に一時筋力を失う
  if (player.loseStrengthEOT > 0) {
    player.strength -= player.loseStrengthEOT;
    log(`フレックス効果終了: 筋力-${player.loseStrengthEOT}`, 'debuff');
    player.loseStrengthEOT = 0;
  }

  // プレイヤーのデバフをターン終了時にカウントダウン
  if (player.weak>0)       { player.weak--;       if(player.weak===0)       log('脱力が解除された','buff'); }
  if (player.vulnerable>0) { player.vulnerable--; if(player.vulnerable===0) log('脆弱が解除された','buff'); }
  if (player.jaku>0)       { player.jaku--;       if(player.jaku===0)       log('弱体が解除された','buff'); }
  if (player.entangled>0)  { player.entangled--;  if(player.entangled===0)  log('拘束が解除された','buff'); }
  player.rageTurn = 0;
  // ステロイド・スピードポーションの一時バフ消滅
  if (player.tempStrengthEnd > 0) {
    player.strength -= player.tempStrengthEnd;
    log(`💉 ステロイドポーション: 筋力-${player.tempStrengthEnd}（効果終了）`, 'debuff');
    player.tempStrengthEnd = 0;
  }
  if (player.tempDexterityEnd > 0) {
    player.dexterity -= player.tempDexterityEnd;
    log(`🏎️ スピードポーション: 敏捷性-${player.tempDexterityEnd}（効果終了）`, 'debuff');
    player.tempDexterityEnd = 0;
  }

  const alive = enemies.filter(e => e.hp > 0);
  alive.forEach(e => { e.block = 0; }); // 敵ブロックリセット

  let delay = 0;
  alive.forEach(e => {
    setTimeout(()=>{ processEnemyAction(e); render(); }, delay);
    delay += 500;
  });

  setTimeout(()=>{
    if (enemies.every(e => e.hp <= 0)) { onVictory(); return; }
    if (player.hp <= 0) { onDefeat(); return; }

    // 敵のデバフカウントダウン（敵ターン終了時）
    enemies.forEach(e => {
      if (e.hp>0 && e.weak>0)       { e.weak--;       if(e.weak===0)       log(`${e.name}の脱力が解除された`); }
      if (e.hp>0 && e.vulnerable>0) { e.vulnerable--; if(e.vulnerable===0) log(`${e.name}の脆弱が解除された`); }
      if (e.hp>0 && e.jaku>0)       { e.jaku--;       if(e.jaku===0)       log(`${e.name}の弱体が解除された`); }
    });

    // 儀式 → 筋力変換（2ターン目以降のターン終了時）
    enemies.forEach(e => {
      if (e.hp>0 && e.ritual>0 && e.turnCount>1) {
        e.strength += e.ritual;
        log(`${e.name}の儀式で筋力+${e.ritual} (合計: ${e.strength})`,'buff');
      }
    });

    // 金属化: 敵ターン終了時にブロック付与
    enemies.forEach(e => {
      if (e.hp > 0 && e.metallicize > 0) {
        e.block += e.metallicize;
        log(`🛡 ${e.name}の金属化: ${e.metallicize}ブロック獲得`,'buff');
      }
    });

    triggerRelics('turn_end');
    discard.push(...hand); hand=[];
    // バリケード: ターン開始時ブロックを失わない
    if (!(player.powers && player.powers.barricade)) player.block = 0;
    energy=3;
    player.noMoreDraw = false;
    player.flameBarrier = 0;
    enemies.forEach(e=>{ if(e.hp>0) setEnemyIntent(e); });
    drawCards(5);
    if (enemies.every(e => e.hp <= 0)) { onVictory(); return; }

    // ターン開始時パワー（悪魔化・残虐・狂戦士）
    if (player.powers) {
      if (player.powers.demonForm > 0) {
        player.strength += player.powers.demonForm;
        log(`😈 悪魔化: 筋力+${player.powers.demonForm} (合計: ${player.strength})`,'buff');
      }
      if (player.powers.brutality > 0) {
        player.hp = Math.max(0, player.hp - player.powers.brutality);
        log(`😈 残虐: HP-${player.powers.brutality}`,'debuff');
        spawnFloatDmg(player.powers.brutality,'player-sprite','attack');
        drawCards(player.powers.brutality);
      }
      if (player.powers.berserk > 0) {
        energy += 1;
        log(`🪓 狂戦士: エネルギー+1`, 'buff');
      }
    }

    combatTurn++; triggerRelics('turn_start');
    // ガーディアン: 防御態勢中は毎ターン開始時（プレイヤー行動前）にシャープハイド4付与
    enemies.forEach(e => {
      if (e.hp > 0 && e.def.id === 'guardian' && e.guardianMode === 'defensive') {
        e.sharpHide = 4;
        log(`🔪 ガーディアンがシャープハイド4を付与！ アタックカード使用時に4ダメージ反撃`, 'buff');
      }
    });
    actingEnemy=false; setInputEnabled(true);
    log('─── 新しいターン ───','important');
    render();
  }, delay+100);
}

function processEnemyAction(e) {
  // 分裂待ち → このターンで実行
  if (e.pendingSplit) {
    doSplit(e);
    return;
  }

  // ラガヴーリン: 睡眠中被弾 → インテント問わずスタン行動に差し替え
  if (e.awakenStunPending) {
    e.awakenStunPending = false;
    e.sleeping = false;
    e.metallicize = 0;
    e.awakeActionIndex = 0;
    log(`😤 ${e.name}が目覚めた！ スタン発動！ 金属化が解除された！`, 'important');
    return;
  }

  const it = e.intent;

  // ガーディアン: 移行ターンは20ブロックのみ、他の行動はしない
  if (it && it.modeShiftTransition) {
    return;
  }

  if (it.sleep) {
    log(`${e.name}は眠っている...`);
    return;
  }
  if (it.stun) {
    log(`${e.name}はスタン中で動けない！`, 'buff');
    e.sleeping = false;
    e.metallicize = 0;
    return;
  }
  if (it.selfEnrage > 0) {
    e.enrage = it.selfEnrage;
    log(`👑 ${e.name}の激怒 ${it.selfEnrage}！ スキルカード使用で筋力+${it.selfEnrage}`, 'buff');
    return;
  }

  if (it.charge) {
    log(`${e.name}は充電中...`);
    return;
  }

  if (it.escape) {
    e.hp = 0; e.fled = true;
    log(`${e.name}が逃げ出した！`,'important');
    if (e.stolenGold > 0) log(`${e.name}は ${e.stolenGold}G を持ち逃げした！`,'debuff');
    return;
  }

  // シールドグレムリン: 味方にブロック
  if (it.shieldAlly > 0) {
    const others = enemies.filter(a => a.id !== e.id && a.hp > 0);
    if (others.length > 0) {
      const ally = others[Math.floor(Math.random() * others.length)];
      ally.block += it.shieldAlly;
      log(`${e.name}が${ally.name}に${it.shieldAlly}ブロックを付与！`,'buff');
      return;
    }
    // 味方なし → フォールバック攻撃
    if (it.atkDmgFallback > 0) {
      const base = it.atkDmgFallback + (e.strength || 0);
      const afterVuln = player.jaku > 0 ? Math.floor(base * 1.5) : base;
      const dmg = Math.max(0, afterVuln - player.block);
      player.block = Math.max(0, player.block - afterVuln);
      player.hp -= dmg;
      log(`${e.name}の「${it.name}（味方なし）」: ${dmg} ダメージ`,'damage');
      animateLunge(`enemy-sprite-${e.id}`,'left');
      setTimeout(()=>{ animateHit('player-sprite'); spawnFloatDmg(dmg,'player-sprite','attack'); },180);
      if (dmg > 0) applyPlayerDamagedEffects(dmg, e);
      else if (player.flameBarrier > 0 && e.hp > 0) {
        const fbDmg = dealDamageToEnemy(e, player.flameBarrier);
        log(`🔥 炎の障壁: ${e.name}に${fbDmg}ダメージ反撃！`, 'buff');
        setTimeout(()=>{ animateHit(`enemy-sprite-${e.id}`); spawnFloatDmg(fbDmg,`enemy-sprite-${e.id}`,'attack'); },300);
      }
    }
    return;
  }

  if (it.atkDmg > 0) {
    const hits = it.atkHits || 1;
    let totalDmg = 0;
    for (let h = 0; h < hits; h++) {
      const base      = it.atkDmg + (e.strength || 0);
      const afterVuln = player.jaku > 0 ? Math.floor(base * 1.5) : base;
      const dmg       = Math.max(0, afterVuln - player.block);
      player.block    = Math.max(0, player.block - afterVuln);
      player.hp      -= dmg;
      totalDmg += dmg;
    }
    const note     = player.jaku > 0 ? ' (弱体中)' : '';
    const hitsNote = hits > 1 ? `×${hits} (計${totalDmg})` : `${totalDmg}`;
    log(`${e.name}の「${it.name}」: ${hitsNote} ダメージ${note}`,'damage');
    animateLunge(`enemy-sprite-${e.id}`,'left');
    setTimeout(()=>{ animateHit('player-sprite'); spawnFloatDmg(totalDmg,'player-sprite','attack'); },180);
    if (totalDmg > 0) applyPlayerDamagedEffects(totalDmg, e);
    else if (player.flameBarrier > 0 && e.hp > 0) {
      const fbDmg = dealDamageToEnemy(e, player.flameBarrier);
      log(`🔥 炎の障壁: ${e.name}に${fbDmg}ダメージ反撃！`, 'buff');
      setTimeout(()=>{ animateHit(`enemy-sprite-${e.id}`); spawnFloatDmg(fbDmg,`enemy-sprite-${e.id}`,'attack'); },300);
    }
    // ゴールドを盗む
    if (it.stealGold > 0 && totalDmg > 0) {
      const steal = Math.min(player.gold, it.stealGold);
      if (steal > 0) {
        player.gold -= steal;
        e.stolenGold += steal;
        log(`${e.name}が ${steal}G を盗んだ！ (残り: ${player.gold}G)`,'debuff');
      }
    }
  }
  if (it.defGain > 0) {
    e.block += it.defGain;
    log(`${e.name}が ${it.defGain} ブロック獲得`);
  }
  if (it.selfStrength > 0) {
    e.strength += it.selfStrength;
    log(`${e.name}が筋力を ${it.selfStrength} 得た (合計: ${e.strength})`,'buff');
  }
  if (it.selfRitual > 0) {
    e.ritual += it.selfRitual;
    log(`${e.name}が儀式を行った (毎ターン筋力+${e.ritual})`,'buff');
  }
  if (it.playerWeak > 0) {
    player.weak += it.playerWeak;
    log(`プレイヤーに脱力 ${it.playerWeak}ターン付与 (残り${player.weak})`,'debuff');
  }
  if (it.playerVulnerable > 0) {
    player.vulnerable += it.playerVulnerable;
    log(`プレイヤーに脆弱 ${it.playerVulnerable}ターン付与 (残り${player.vulnerable})`,'debuff');
  }
  if (it.playerJaku > 0) {
    player.jaku += it.playerJaku;
    log(`プレイヤーに弱体 ${it.playerJaku}ターン付与 (残り${player.jaku})`,'debuff');
  }
  if (it.playerEntangle > 0) {
    player.entangled += it.playerEntangle;
    log(`プレイヤーが拘束された！次のターン攻撃不可`,'debuff');
  }
  const slimedCount = typeof it.addSlimed === 'number' ? it.addSlimed : (it.addSlimed ? 1 : 0);
  if (slimedCount > 0) {
    for (let i = 0; i < slimedCount; i++) discard.push({...CARD_MAP['slimed']});
    log(`粘液${slimedCount > 1 ? '×'+slimedCount : ''}がデッキに加わった！`,'debuff');
  }
  if (it.addDaze > 0) {
    for (let i = 0; i < it.addDaze; i++) discard.push({...CARD_MAP['daze']});
    log(`💤 めまい×${it.addDaze} が捨て札に加わった！`,'debuff');
  }
  if (it.playerStrDown > 0) {
    player.strength -= it.playerStrDown;
    log(`${e.name}の魂抽出！ プレイヤーの筋力-${it.playerStrDown} (残り${player.strength})`,'debuff');
  }
  if (it.playerDexDown > 0) {
    player.dexterity -= it.playerDexDown;
    log(`${e.name}の魂抽出！ プレイヤーの敏捷性-${it.playerDexDown} (残り${player.dexterity})`,'debuff');
  }
  // ガーディアン: ツインスラム後に攻撃態勢へ移行
  if (it.guardianModeSwitch === 'offensive') {
    e.guardianMode = 'offensive';
    e.offensiveTurn = 1; // 旋風刃から開始（開幕チャージはスキップ）
    e.modeShiftDamage = 0;
    e.modeShiftThreshold += 10;
    e.sharpHide = 0;
    log(`🤖 ガーディアンが攻撃態勢に戻った！ (次のモードシフト閾値: ${e.modeShiftThreshold})`, 'important');
  }
}

function setInputEnabled(on) { document.getElementById('end-turn-btn').disabled=!on; }

// ================================================================
// RELICS TRIGGER
// ================================================================
function triggerRelics(event, extraArg) {
  const ctx = { player, enemies, floor };
  relics.forEach(r => {
    if (r.triggers && r.triggers[event]) r.triggers[event](ctx, r, extraArg);
  });
}

function triggerRelicAcquire(relic) {
  SFX.relic();
  if (relic.triggers && relic.triggers.on_acquire) {
    const ctx = { player, enemies, floor };
    relic.triggers.on_acquire(ctx, relic);
  }
}

// 血には血を: HP喪失時にコスト軽減
function onPlayerHpLoss() {
  const allC = [...deck, ...discard, ...hand, ...exhausted];
  allC.forEach(c => {
    if (c.hpLossCostReduction) {
      c._costReduction = Math.min(c.cost, (c._costReduction || 0) + 1);
    }
  });
}

// プレイヤーがHPダメージを受けたときに呼ぶ (dmg>0 の場合のみ)
function applyPlayerDamagedEffects(dmg, attacker) {
  SFX.playerHurt();
  triggerRelics('on_player_damaged', dmg);
  // 炎の障壁: 攻撃してきた敵に反撃ダメージ
  if (player.flameBarrier > 0 && attacker && attacker.hp > 0) {
    const fbDmg = dealDamageToEnemy(attacker, player.flameBarrier);
    log(`🔥 炎の障壁: ${attacker.name}に${fbDmg}ダメージ反撃！`, 'buff');
    setTimeout(()=>{ animateHit(`enemy-sprite-${attacker.id}`); spawnFloatDmg(fbDmg,`enemy-sprite-${attacker.id}`,'attack'); },300);
  }
  // 血には血を: HPを失うたびコスト軽減
  onPlayerHpLoss();
  // 青銅のウロコ: 攻撃してきた敵に3反撃
  if (relics.some(r => r.id === 'bronze_scales') && attacker && attacker.hp > 0) {
    const raw = 3;
    const thornDmg = Math.max(0, raw - attacker.block);
    attacker.block = Math.max(0, attacker.block - raw);
    attacker.hp -= thornDmg;
    if (thornDmg > 0) {
      log(`🐉 青銅のウロコ: ${attacker.name}に${thornDmg}反撃ダメージ`,'buff');
      setTimeout(()=>{ spawnFloatDmg(thornDmg,`enemy-sprite-${attacker.id}`,'attack'); },300);
    }
  }
}

// ================================================================
