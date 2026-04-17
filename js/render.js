// RENDER
// ================================================================
function render() {
  document.getElementById('player-hp-text').textContent=`${Math.max(0,player.hp)}/${player.maxHp}`;
  document.getElementById('player-hp-bar').style.width=(Math.max(0,player.hp)/player.maxHp*100)+'%';

  const setBadge = (id,label,val,cls,showIfNonzero=false) => {
    const el=document.getElementById(id);
    el.innerHTML=label+val+badgeTip(cls);
    const show = showIfNonzero ? val !== 0 : val > 0;
    el.className=`badge ${cls}`+(show?'':' hidden');
  };
  const goldEl = document.getElementById('player-gold-badge');
  goldEl.textContent = `💰 ${player.gold}G`;
  goldEl.className = 'badge gold';
  setBadge('player-block-badge',    '🛡 ',    player.block,      'block');
  setBadge('player-weak-badge',     '💜脱力 ', player.weak,       'weak');
  setBadge('player-vuln-badge',     '🔴脆弱 ', player.vulnerable, 'vulnerable');
  setBadge('player-jaku-badge',     '💔弱体 ', player.jaku,       'jaku');
  setBadge('player-entangled-badge','🔗拘束 ', player.entangled,  'entangled');
  setBadge('player-strength-badge', '💪 ',    player.strength,   'pstrength',  true);
  setBadge('player-dexterity-badge','🏃 ',    player.dexterity,  'dexterity',  true);
  // アクティブパワーの表示
  const pRow = document.getElementById('player-powers-row');
  if (pRow && player.powers) {
    const p = player.powers;
    const pp = [];
    if (p.metallicize > 0) pp.push(`<span class="badge power-badge">🪨 金属化 ${p.metallicize}</span>`);
    if (p.brutality    > 0) pp.push(`<span class="badge power-badge">😈 残虐</span>`);
    if (p.feelNoPain   > 0) pp.push(`<span class="badge power-badge">🛡 無痛 ${p.feelNoPain}</span>`);
    if (player.rageTurn > 0) pp.push(`<span class="badge power-badge">🔥 激怒 ${player.rageTurn}</span>`);
    if (p.corruption)       pp.push(`<span class="badge power-badge">☠️ 堕落</span>`);
    if (p.evolve       > 0) pp.push(`<span class="badge power-badge">🧬 進化 ${p.evolve}</span>`);
    if (p.darkEmbrace  > 0) pp.push(`<span class="badge power-badge">🖤 抱擁 ${p.darkEmbrace}</span>`);
    if (p.demonForm    > 0) pp.push(`<span class="badge power-badge">👿 悪魔 ${p.demonForm}</span>`);
    if (player.flameBarrier > 0) pp.push(`<span class="badge power-badge">🔥 炎の障壁 ${player.flameBarrier}</span>`);
    pRow.innerHTML = pp.join('');
  }

  (enemies||[]).forEach(e => {
    const slot=document.getElementById(`enemy-slot-${e.id}`); if(!slot) return;
    if(e.hp<=0) { slot.classList.add('dead'); return; }
    document.getElementById(`enemy-hp-text-${e.id}`).textContent=`${e.hp}/${e.maxHp}`;
    document.getElementById(`enemy-hp-bar-${e.id}`).style.width=(e.hp/e.maxHp*100)+'%';
    document.getElementById(`enemy-status-${e.id}`).innerHTML=[
      e.block>0      ? `<span class="badge block">🛡 ${e.block}${badgeTip('block')}</span>` : '',
      e.weak>0       ? `<span class="badge weak">💜脱力 ${e.weak}${badgeTip('weak')}</span>` : '',
      e.vulnerable>0 ? `<span class="badge vulnerable">🔴脆弱 ${e.vulnerable}${badgeTip('vulnerable')}</span>` : '',
      e.jaku>0       ? `<span class="badge jaku">💔弱体 ${e.jaku}${badgeTip('jaku')}</span>` : '',
      e.strength>0   ? `<span class="badge strength">💪 ${e.strength}${badgeTip('strength')}</span>` :
      e.strength<0   ? `<span class="badge strength" style="border-color:#888;color:#aaa">💪 ${e.strength}${badgeTip('strength')}</span>` : '',
      e.ritual>0     ? `<span class="badge ritual">🌀 ${e.ritual}${badgeTip('ritual')}</span>` : '',
      e.curlUp>0 && !e.curlUpTriggered ? `<span class="badge curledup">🌀 まるくなる${e.curlUp}${badgeTip('curledup')}</span>` : '',
      e.sharpHide>0  ? `<span class="badge sharphide">🔪シャープハイド${e.sharpHide}</span>` : '',
      (e.def.splitTypes||e.def.splitOnHalfHp)&&!e.splitDone ? `<span class="badge split-ability">💥分裂</span>` : '',
    ].join('');
    document.getElementById(`enemy-intent-${e.id}`).innerHTML=formatIntent(e);
    slot.className='enemy-slot'+(e.def.isBoss?' enemy-slot-boss':'')+((targeting||pendingPotion)?' targetable':'');
    slot.onmouseenter = null;
    slot.onmouseleave = null;
  });

  const hintEl = document.getElementById('targeting-hint');
  const cancelBtn = document.getElementById('cancel-target-btn');
  if (selectingUpgradeTarget) {
    hintEl.textContent = 'アップグレードするカードを選んでください';
    hintEl.className = 'upgrade-mode';
    hintEl.style.display = 'block';
    cancelBtn.style.display = 'block';
  } else if (pendingPotion) {
    hintEl.textContent = `${pendingPotion.potion.icon} ${pendingPotion.potion.name} — 対象を選んでください`;
    hintEl.className = '';
    hintEl.style.display = 'block';
    cancelBtn.style.display = 'block';
  } else {
    hintEl.textContent = '対象を選んでください';
    hintEl.className = '';
    hintEl.style.display = targeting ? 'block' : 'none';
    cancelBtn.style.display = targeting ? 'block' : 'none';
  }

  document.getElementById('energy-display').textContent = `${energy}/3`;

  const handEl=document.getElementById('hand');
  handEl.innerHTML='';
  hand.forEach((card,i)=>{
    const tc = getCardClass(card);
    const div=document.createElement('div');
    let extraClass = '';
    if (pendingCard?.index === i) extraClass = ' needs-target';
    else if (selectingUpgradeTarget) {
      extraClass = (!card.upgraded && card.type !== 'status') ? ' upgrade-selectable' : ' upgrade-not-selectable';
    }
    div.className=`card ${tc}${extraClass}`;
    const rl = card.rarity ? RARITY_LABEL[card.rarity] : '';
    // 常時反映: 筋力・脱力を考慮した基本ダメージ説明文
    const hoverTgt = getCardHoverTarget(card);
    const baseDesc  = getCardHoverDesc(card, null);
    const hoverDesc = getCardHoverDesc(card, hoverTgt);
    div.innerHTML=`
      ${getCostHtml(card)}
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${baseDesc}</div>
      ${card.ethereal?'<div class="card-tag">エセリアル</div>':''}`;
    div.onclick=()=>playCard(i);
    // カードホバーで脆弱考慮値に説明文を更新（変化数値を黄色強調）
    if (baseDesc !== hoverDesc) {
      div.addEventListener('mouseenter', () => {
        const d = div.querySelector('.card-desc'); if (d) d.innerHTML = getCardHoverDescHL(card, hoverTgt);
      });
      div.addEventListener('mouseleave', () => {
        const d = div.querySelector('.card-desc'); if (d) d.textContent = baseDesc;
      });
    }
    handEl.appendChild(div);
  });

  // ターゲット選択中: 敵ホバーでペンディングカードの説明文をその敵への計算値に更新
  if (targeting && pendingCard && pendingCard.card.type === 'attack') {
    const pendingDiv = handEl.children[pendingCard.index];
    enemies.filter(e => e.hp > 0).forEach(e => {
      const slot = document.getElementById(`enemy-slot-${e.id}`);
      if (!slot) return;
      const enemyDesc = getCardHoverDesc(pendingCard.card, e);
      const fallbackDesc = getCardHoverDesc(pendingCard.card, null);
      slot.onmouseenter = () => {
        if (pendingDiv) { const d = pendingDiv.querySelector('.card-desc'); if (d) d.innerHTML = getCardHoverDescHL(pendingCard.card, e); }
      };
      slot.onmouseleave = () => {
        if (pendingDiv) { const d = pendingDiv.querySelector('.card-desc'); if (d) d.textContent = fallbackDesc; }
      };
    });
  }

  document.getElementById('deck-count').textContent    = deck.length;
  document.getElementById('discard-count').textContent = discard.length;
  document.getElementById('exhausted-count').textContent = exhausted.length;

  // ポーションスロット描画
  const potionRow = document.getElementById('potion-row');
  potionRow.innerHTML = '';
  for (let i = 0; i < maxPotionSlots; i++) {
    const p = potions[i];
    const div = document.createElement('div');
    if (p) {
      div.className = 'potion-slot filled' + (pendingPotion?.index === i ? ' targeting-potion' : '');
      div.style.borderColor = p.color || '#aaa';
      div.style.boxShadow = `0 0 6px ${p.color || '#aaa'}66`;
      div.innerHTML = `${p.icon}<div class="potion-tooltip"><div class="potion-tooltip-name">${p.name}</div><div class="potion-tooltip-desc">${p.desc}</div></div>`;
      div.onclick = () => usePotion(i);
    } else {
      div.className = 'potion-slot';
    }
    potionRow.appendChild(div);
  }

  const relicRow = document.getElementById('relic-row');
  relicRow.innerHTML = relics.map(r => {
    // カウント表示が必要なレリックを判定
    let counterBadge = '';
    if (r.id === 'nunchaku' && r.counter != null)
      counterBadge = `<div class="relic-counter">${r.counter % 10}/10</div>`;
    else if (r.id === 'pen_nib' && r.counter != null)
      counterBadge = r.ready
        ? `<div class="relic-counter" style="color:#ff8;border-color:#ff8">2×!</div>`
        : `<div class="relic-counter">${r.counter % 10}/10</div>`;
    else if (r.id === 'happy_flower' && r.counter != null)
      counterBadge = `<div class="relic-counter">${r.counter % 3}/3</div>`;
    else if (r.id === 'art_of_war')
      counterBadge = r.pendingEnergy
        ? `<div class="relic-counter" style="color:#aff;border-color:#aff">+E</div>`
        : '';
    return `<div class="relic-icon">${r.icon}${counterBadge}
      <div class="relic-tooltip">
        <div class="relic-tooltip-name">${r.name}</div>
        <div class="relic-tooltip-desc">${r.desc}</div>
      </div>
    </div>`;
  }).join('');
}

function log(msg,cls=''){
  const el=document.getElementById('log');
  const p=document.createElement('p');
  p.textContent=msg; if(cls) p.className=cls;
  el.appendChild(p); el.scrollTop=el.scrollHeight;
}
function clearLog(){ document.getElementById('log').innerHTML=''; }

function showPileViewer(which) {
  const titles = { deck:'山札', discard:'捨て札', exhausted:'破棄済み' };
  const piles  = { deck, discard, exhausted };
  const pile   = piles[which] || [];
  const title  = titles[which];

  // ソート: 名前順
  const sorted = [...pile].sort((a,b) => a.name.localeCompare(b.name));

  const overlay = document.getElementById('pile-viewer-overlay');
  document.getElementById('pile-viewer-title').textContent = `${title} (${pile.length}枚)`;

  const container = document.getElementById('pile-viewer-cards');
  container.innerHTML = '';
  if (sorted.length === 0) {
    container.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">カードなし</div>';
  } else {
    sorted.forEach(card => {
      const tc = getCardClass(card);
      const div = document.createElement('div');
      div.className = `pile-card ${tc}`;
      div.innerHTML = `
        ${getCostHtml(card)}
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>`;
      container.appendChild(div);
    });
  }
  overlay.classList.add('open');
}

function closePileViewer() {
  document.getElementById('pile-viewer-overlay').classList.remove('open');
}

// マップ画面用: deck/discard/hand/exhausted をすべてまとめて表示
function renderPlayerStatusBar(el) {
  if (!el) return;
  const allCards = [...deck, ...discard, ...hand, ...exhausted].filter(c => !c.battleOnly);
  const hpPct = Math.max(0, player.hp) / player.maxHp * 100;

  // ポーションスロット
  let potionHtml = '';
  for (let i = 0; i < maxPotionSlots; i++) {
    const p = potions[i];
    if (p) {
      potionHtml += `<div class="psb-potion filled" style="border-color:${p.color||'#aaa'}" title="">${p.icon}<div class="potion-tooltip"><b style="font-size:12px;color:#eee">${p.name}</b><br><span style="font-size:10px;color:#aaa">${p.desc}</span></div></div>`;
    } else {
      potionHtml += `<div class="psb-potion"></div>`;
    }
  }

  // レリック
  const relicHtml = relics.map(r => {
    let counter = '';
    if (r.id === 'nunchaku' && r.counter != null)
      counter = `<div class="relic-counter">${r.counter % 10}/10</div>`;
    else if (r.id === 'pen_nib' && r.counter != null)
      counter = r.ready ? `<div class="relic-counter" style="color:#ff8;border-color:#ff8">2×!</div>` : `<div class="relic-counter">${r.counter % 10}/10</div>`;
    else if (r.id === 'happy_flower' && r.counter != null)
      counter = `<div class="relic-counter">${r.counter % 3}/3</div>`;
    else if (r.id === 'art_of_war')
      counter = r.pendingEnergy ? `<div class="relic-counter" style="color:#aff;border-color:#aff">+E</div>` : '';
    return `<div class="psb-relic">${r.icon}${counter}<div class="relic-tooltip"><div class="relic-tooltip-name">${r.name}</div><div class="relic-tooltip-desc">${r.desc}</div></div></div>`;
  }).join('');

  el.innerHTML = `
    <div class="psb-section">
      <span class="psb-hp">❤️ ${Math.max(0,player.hp)}/${player.maxHp}</span>
      <div class="hp-bar-wrap" style="width:55px"><div class="hp-fill player" style="width:${hpPct}%"></div></div>
    </div>
    <span class="psb-sep">｜</span>
    <div class="psb-section psb-gold">💰 ${player.gold}G</div>
    <span class="psb-sep">｜</span>
    <div class="psb-section psb-deck">🃏 ${allCards.length}枚 <button class="pile-btn" onclick="showFullDeckViewer()" style="margin-left:4px">中身を見る</button></div>
    <span class="psb-sep">｜</span>
    <div class="psb-section" style="gap:4px">${potionHtml}</div>
    <span class="psb-sep">｜</span>
    <div class="psb-section" style="gap:4px;flex-wrap:wrap">${relicHtml || '<span style="color:#555;font-size:11px">レリックなし</span>'}</div>
  `;
}

function showFullDeckViewer() {
  const all = [...deck, ...discard, ...hand, ...exhausted].filter(c => !c.battleOnly);
  const sorted = [...all].sort((a,b) => a.name.localeCompare(b.name));
  const overlay = document.getElementById('pile-viewer-overlay');
  document.getElementById('pile-viewer-title').textContent = `デッキ全体 (${all.length}枚)`;
  const container = document.getElementById('pile-viewer-cards');
  container.innerHTML = '';
  if (sorted.length === 0) {
    container.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">カードなし</div>';
  } else {
    sorted.forEach(card => {
      const tc = getCardClass(card);
      const div = document.createElement('div');
      div.className = `pile-card ${tc}`;
      div.innerHTML = `
        ${getCostHtml(card)}
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>`;
      container.appendChild(div);
    });
  }
  overlay.classList.add('open');
}

// ================================================================
