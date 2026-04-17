// EVENT 0 (col 0): ネオー
// ================================================================
let neowChoices = [];

const NEOW_BOONS = [
  {
    id: 'upgrade_one',
    label: 'カードを1枚アップグレードする',
    cost: '',
    action() {
      closeEvent();
      openEventCardPicker('アップグレードするカードを選択', 'カードをアップグレードします。', '#40ffa0',
        (pileArr, idx, card) => {
          if (card.upgraded || card.type === 'status') { log('そのカードはアップグレードできない！', 'debuff'); showMapScreen(); return; }
          const origName = card.name;
          const pre = getUpgradePreview(card);
          upgradeCard(card);
          log(`✨ ネオー: ${origName} → ${pre.name} にアップグレード！`, 'buff');
          showToast({ icon: card.icon, label: 'ネオー', title: `${origName} → ${pre.name}`, sub: pre.desc, color: '#40ffa0' });
          render(); showMapScreen();
        },
        showNeow
      );
    },
  },
  {
    id: 'max_hp_11',
    label: '最大HPが11増加する',
    cost: '',
    action() {
      closeEvent();
      player.maxHp += 11; player.hp += 11;
      log('🐳 ネオー: 最大HP+11！', 'buff');
      showToast({ icon: '🐳', label: 'ネオー', title: '最大HP+11', sub: '', color: '#40ffa0' });
      render(); showMapScreen();
    },
  },
  {
    id: 'gold_150',
    label: '150ゴールドを獲得する',
    cost: '',
    action() {
      closeEvent();
      player.gold += 150;
      log('🐳 ネオー: ゴールド+150！', 'buff');
      showToast({ icon: '💰', label: 'ネオー', title: '+150G', sub: '', color: '#f5c842' });
      render(); showMapScreen();
    },
  },
  {
    id: 'lose_gold_two_packs',
    label: 'すべてのゴールドを失い、カードパックから1枚を選ぶ',
    cost: 'すべてのゴールドを失う',
    action() {
      closeEvent();
      const lost = player.gold;
      player.gold = 0;
      log(`🐳 ネオー: ゴールドをすべて失った (-${lost}G)。カードを選択してください。`, 'debuff');
      // 6枚表示して1枚選ぶ（2パック分）
      neowShowCardChoice(6, null, () => { render(); showMapScreen(); });
    },
  },
  {
    id: 'remove_two_take_dmg',
    label: 'デッキからカードを2枚削除する',
    cost: '13ダメージを受ける',
    action() {
      closeEvent();
      openEventCardPicker('削除するカードを選択（1枚目）', 'カードを2枚削除します。13ダメージを受けます。', '#e94560',
        (pileArr, idx, card) => {
          pileArr.splice(idx, 1);
          log(`🐳 ネオー: ${card.name} を削除 (1枚目)`, 'buff');
          const allCards2 = [...deck, ...discard].filter(c => !c.battleOnly && !c.eternal);
          if (allCards2.length === 0) {
            // 2枚目がない場合はダメージだけ受ける
            neowApplyDmg(13); render(); showMapScreen(); return;
          }
          openEventCardPicker('削除するカードを選択（2枚目）', 'カードを2枚削除します。', '#e94560',
            (pileArr2, idx2, card2) => {
              pileArr2.splice(idx2, 1);
              log(`🐳 ネオー: ${card2.name} を削除 (2枚目)`, 'buff');
              neowApplyDmg(13);
              render(); showMapScreen();
            },
            showNeow
          );
        },
        showNeow
      );
    },
  },
  {
    id: 'card_reward_plus_potion',
    label: 'カード報酬を1枚と、ランダムなポーションを1個獲得する',
    cost: '',
    action() {
      closeEvent();
      neowGainPotion();
      showCardReward(() => { render(); showMapScreen(); });
    },
  },
  {
    id: 'transform_one',
    label: 'カードを1枚変化させる',
    cost: '',
    action() {
      closeEvent();
      openEventCardPicker('変化させるカードを選択', 'カードをランダムな別のカードに変化させます。', '#f5a623',
        (pileArr, idx, card) => {
          const pool = REWARD_POOL.filter(c => c.id !== card.id);
          const newDef = pool[Math.floor(Math.random() * pool.length)];
          pileArr.splice(idx, 1, { ...newDef });
          log(`🐳 ネオー: ${card.name} → ${newDef.name} に変化！`, 'buff');
          showToast({ icon: newDef.icon, label: 'ネオー', title: `${card.name} → ${newDef.name}`, sub: newDef.desc, color: '#f5a623' });
          render(); showMapScreen();
        },
        showNeow
      );
    },
  },
  {
    id: 'greed_333',
    label: '強欲を受け取る。333ゴールドを獲得する',
    cost: '強欲（使用不可の呪い・永劫）をデッキに追加',
    action() {
      closeEvent();
      player.gold += 333;
      deck.push({ ...CARD_MAP['greed'] });
      log('🐳 ネオー: 強欲をデッキに追加。ゴールド+333！', 'buff');
      showToast({ icon: '💸', label: 'ネオー', title: '+333G / 強欲追加', sub: '強欲: 使用不可の呪い（永劫）', color: '#f5c842' });
      render(); showMapScreen();
    },
  },
  {
    id: 'random_relic',
    label: 'ランダムなレリックを1個獲得する',
    cost: '',
    action() {
      closeEvent();
      neowGainRelic(1);
      render(); showMapScreen();
    },
  },
  {
    id: 'remove_one',
    label: 'デッキからカードを1枚削除する',
    cost: '',
    action() {
      closeEvent();
      openEventCardPicker('削除するカードを選択', 'カードをデッキから削除します。', '#e94560',
        (pileArr, idx, card) => {
          pileArr.splice(idx, 1);
          log(`🐳 ネオー: ${card.name} を削除！`, 'buff');
          showToast({ icon: '🗑️', label: 'ネオー', title: card.name + ' を削除', sub: '', color: '#e94560' });
          render(); showMapScreen();
        },
        showNeow
      );
    },
  },
  {
    id: 'two_relics_two_cards',
    label: 'ランダムなレリックを2個入手する',
    cost: 'ストライク1枚と防御1枚をデッキに加える',
    action() {
      closeEvent();
      neowGainRelic(2);
      deck.push({ ...CARD_MAP['strike'] });
      deck.push({ ...CARD_MAP['defend'] });
      log('🐳 ネオー: レリック×2獲得。ストライクと防御をデッキに追加！', 'buff');
      render(); showMapScreen();
    },
  },
  {
    id: 'random_rare',
    label: 'ランダムなレアカードを1枚デッキに追加する',
    cost: '',
    action() {
      closeEvent();
      const rares = REWARD_POOL_BY_RARITY['rare'];
      if (rares.length > 0) {
        const card = rares[Math.floor(Math.random() * rares.length)];
        deck.push({ ...card });
        log(`🐳 ネオー: レアカード「${card.name}」をデッキに追加！`, 'buff');
        showToast({ icon: card.icon, label: 'ネオー', title: card.name, sub: card.desc, color: '#f5a623' });
      }
      render(); showMapScreen();
    },
  },
  {
    id: 'transform_strike_defend_lose_hp',
    label: 'ストライク1枚と防御1枚を変化させる',
    cost: '最大HPを10失う',
    action() {
      closeEvent();
      ['strike', 'defend'].forEach(targetId => {
        const allCards = [...deck, ...discard];
        const idx = allCards.findIndex(c => c.id === targetId);
        if (idx >= 0) {
          const card = allCards[idx];
          const pile = deck.includes(card) ? deck : discard;
          const pi = pile.indexOf(card);
          const pool = REWARD_POOL.filter(c => c.id !== targetId);
          const newDef = pool[Math.floor(Math.random() * pool.length)];
          pile.splice(pi, 1, { ...newDef });
          log(`🐳 ネオー: ${card.name} → ${newDef.name} に変化！`, 'buff');
        }
      });
      player.maxHp = Math.max(1, player.maxHp - 10);
      player.hp = Math.min(player.hp, player.maxHp);
      log('🐳 ネオー: 最大HP-10', 'debuff');
      showToast({ icon: '🐳', label: 'ネオー', title: '変化 & 最大HP-10', sub: '', color: '#f5a623' });
      render(); showMapScreen();
    },
  },
  {
    id: 'three_rare_plus_injury',
    label: '3枚のレアカードから1枚を選び、デッキに追加する',
    cost: '怪我を1枚デッキに追加する',
    action() {
      closeEvent();
      deck.push({ ...CARD_MAP['injury'] });
      log('🐳 ネオー: 怪我をデッキに追加。レアカードを選択してください。', 'debuff');
      neowShowCardChoice(3, 'rare', () => { render(); showMapScreen(); });
    },
  },
  {
    id: 'upgrade_strike_defend',
    label: 'ストライク1枚と防御1枚をアップグレードする',
    cost: '',
    action() {
      closeEvent();
      ['strike', 'defend'].forEach(targetId => {
        const allCards = [...deck, ...discard];
        const card = allCards.find(c => c.id === targetId && !c.upgraded);
        if (card) {
          const origName = card.name;
          const pre = getUpgradePreview(card);
          upgradeCard(card);
          log(`🐳 ネオー: ${origName} → ${pre.name} にアップグレード！`, 'buff');
        }
      });
      showToast({ icon: '🐳', label: 'ネオー', title: 'ストライク & 防御アップグレード', sub: '', color: '#40ffa0' });
      render(); showMapScreen();
    },
  },
  {
    id: 'potion_slot_plus_two_potions',
    label: 'ポーションスロットを1枠追加し、ランダムなポーションを2個獲得する',
    cost: '',
    action() {
      closeEvent();
      maxPotionSlots++;
      log(`🐳 ネオー: ポーションスロット+1（合計${maxPotionSlots}枠）`, 'buff');
      neowGainPotion();
      neowGainPotion();
      showToast({ icon: '🧪', label: 'ネオー', title: `スロット+1 & ポーション×2`, sub: '', color: '#9b4dca' });
      render(); showMapScreen();
    },
  },
];

function showNeow() {
  const shuffled = [...NEOW_BOONS];
  shuffle(shuffled);
  neowChoices = shuffled.slice(0, 3);
  document.getElementById('event-title').textContent = '🐳 ネオーの恩恵';
  document.getElementById('event-desc').innerHTML =
    '大きなクジラのような謎の生物・ネオーが語りかけてくる。<br>「私が君を 呼び戻した...」';
  document.getElementById('event-choices').innerHTML = neowChoices.map((b, i) => `
    <button class="event-choice-btn" onclick="pickNeow(${i})">
      ${b.label}
      ${b.cost ? `<div class="choice-cost">${b.cost}</div>` : ''}
    </button>`).join('');
  renderPlayerStatusBar(document.getElementById('event-player-status'));
  document.getElementById('event-screen').classList.add('show');
}

function pickNeow(idx) {
  const boon = neowChoices[idx];
  if (boon) { SFX.neow(); boon.action(); }
}

// ネオー専用ヘルパー
function neowApplyDmg(amount) {
  const dmg = Math.max(0, amount - player.block);
  player.block = Math.max(0, player.block - amount);
  player.hp = Math.max(1, player.hp - dmg); // HPは最低1残す
  if (dmg > 0) log(`💀 ネオー: ${dmg}ダメージを受けた！`, 'debuff');
}

function neowGainPotion() {
  if (potions.length >= maxPotionSlots) return;
  const pool = Object.values(POTION_DEFS);
  const p = pool[Math.floor(Math.random() * pool.length)];
  potions.push({ ...p });
  log(`🧪 ネオー: ポーション「${p.name}」を獲得！`, 'buff');
  showToast({ icon: p.icon, label: 'ネオー', title: p.name, sub: p.desc, color: p.color || '#9b4dca' });
}

function neowGainRelic(count) {
  const ownedIds = new Set(relics.map(r => r.id));
  const available = Object.values(RELIC_DEFS).filter(r => !ownedIds.has(r.id));
  shuffle(available);
  available.slice(0, count).forEach(r => {
    const newRelic = { ...r };
    relics.push(newRelic);
    triggerRelicAcquire(newRelic);
    log(`✨ ネオー: レリック「${r.name}」を獲得！`, 'important');
    showToast({ icon: r.icon, label: 'ネオー', title: r.name, sub: r.desc, color: '#f5a623' });
  });
}

// n枚のカードを表示して1枚選ぶ（rarity: 'rare'|null=通常抽選）
function neowShowCardChoice(n, rarity, callback) {
  const options = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    let card;
    if (rarity === 'rare') {
      const pool = REWARD_POOL_BY_RARITY['rare'].filter(c => !seen.has(c.id));
      card = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    } else {
      card = pickRewardCard(seen);
    }
    if (card) { options.push(card); seen.add(card.id); }
  }
  rewardCallback = callback || null;
  const container = document.getElementById('reward-cards');
  container.innerHTML = '';
  options.forEach(card => {
    const tc = getCardClass(card);
    const div = document.createElement('div');
    div.className = `reward-card ${tc}`;
    div.innerHTML = `
      ${getCostHtml(card)}
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>`;
    div.onclick = () => selectRewardCard(card);
    container.appendChild(div);
  });
  document.getElementById('reward-screen').classList.add('show');
}

// ================================================================
// EVENT 2 (col 5): 選択肢イベント
// ================================================================
let eventCardCallback = null;
let eventCardCancelCallback = null;

function showEvent2() {
  document.getElementById('event-title').textContent = '★ 謎の鍛冶師';
  document.getElementById('event-desc').textContent =
    '旅の途中、腕利きの鍛冶師と出会った。彼女はあなたのカードを見て、何かを申し出てきた。';
  const canUpgrade = player.gold >= 20;
  const choices = [
    { label:'カードを1枚アップグレード',  cost:'-20G',       enabled: canUpgrade,
      note: canUpgrade ? '' : '（ゴールドが足りない）',
      onclick: 'event2ChooseUpgrade()' },
    { label:'カードを1枚変化させる',      cost:'8ダメージ受ける', enabled: true,
      onclick: 'event2ChooseTransform()' },
    { label:'カードを1枚削除する',        cost:'最大HP-5',    enabled: true,
      onclick: 'event2ChooseRemove()' },
  ];
  document.getElementById('event-choices').innerHTML = choices.map(c => `
    <button class="event-choice-btn" ${c.enabled ? '' : 'disabled style="opacity:0.45;cursor:default;"'}
      onclick="${c.enabled ? c.onclick : ''}">
      ${c.label}
      <div class="choice-cost">${c.cost}${c.note ? ' ' + c.note : ''}</div>
    </button>`).join('');
  renderPlayerStatusBar(document.getElementById('event-player-status'));
  document.getElementById('event-screen').classList.add('show');
}

function closeEvent() {
  document.getElementById('event-screen').classList.remove('show');
}

// カード選択ピッカーを開く（cards省略時は全デッキカードを表示）
function openEventCardPicker(title, sub, hoverColor, onSelect, onCancel, cards) {
  const allCards = cards || [...deck, ...discard].filter(c => !c.battleOnly && !c.eternal);
  if (allCards.length === 0) {
    log('カードがない！', 'debuff'); return;
  }
  const sorted = [...allCards].sort((a,b) => a.name.localeCompare(b.name));
  eventCardCallback = onSelect;
  eventCardCancelCallback = onCancel || null;

  document.getElementById('event-card-title').textContent = title;
  document.getElementById('event-card-sub').textContent = sub;

  // ホバー色をCSS変数で切り替え
  const style = document.getElementById('event-card-hover-style') ||
    (() => { const s = document.createElement('style'); s.id='event-card-hover-style'; document.head.appendChild(s); return s; })();
  style.textContent = `.event-card-item:hover .pile-card { border-color:${hoverColor}!important; box-shadow:0 0 8px ${hoverColor}99!important; }`;

  document.getElementById('event-card-list').innerHTML = sorted.map((c,i) => {
    const tc = getCardClass(c);
    const srcPile = deck.includes(c) ? 'deck' : hand.includes(c) ? 'hand' : 'discard';
    const srcIdx  = (srcPile === 'deck' ? deck : srcPile === 'hand' ? hand : discard).indexOf(c);
    return `<div class="event-card-item" onclick="selectEventCard('${srcPile}',${srcIdx})">
      <div class="pile-card ${tc}">
        ${getCostHtml(c)}
        <div class="card-icon">${c.icon}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-desc">${c.desc}</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('event-card-screen').classList.add('show');
}

function closeEventCardPicker() {
  document.getElementById('event-card-screen').classList.remove('show');
  eventCardCallback = null;
  const cb = eventCardCancelCallback;
  eventCardCancelCallback = null;
  if (cb) cb();
}

function selectEventCard(pile, idx) {
  const pileArr = pile === 'deck' ? deck : pile === 'hand' ? hand : discard;
  const card = pileArr[idx];
  if (!card) return;
  const onSelect = eventCardCallback;
  // 先にクリアしておくことで、onSelect内で次のピッカーを開いた場合に
  // 新しく設定されたコールバックを誤って上書きしない。
  eventCardCallback = null;
  eventCardCancelCallback = null;
  document.getElementById('event-card-screen').classList.remove('show');
  if (onSelect) onSelect(pileArr, idx, card);
}

// ── 選択肢1: アップグレード -20G ──
function event2ChooseUpgrade() {
  closeEvent();
  openEventCardPicker('アップグレードするカードを選択', 'このカードをアップグレードします。コスト: -20G', '#40ffa0',
    (pileArr, idx, card) => {
      if (card.upgraded) { log(`${card.name}はすでにアップグレード済み！`, 'debuff'); showMapScreen(); return; }
      const origName = card.name;
      const pre = getUpgradePreview(card);
      player.gold -= 20;
      upgradeCard(card);
      log(`★ ${origName}をアップグレードした！ (-20G)`, 'buff');
      showToast({ icon:card.icon, label:'アップグレード', title:`${origName} → ${pre.name}`, sub:pre.desc, color:'#40ffa0' });
      render(); showMapScreen();
    },
    showEvent2  // キャンセルで3択に戻る
  );
}

// ── 選択肢2: 変化 8ダメージ ──
function event2ChooseTransform() {
  closeEvent();
  openEventCardPicker('変化させるカードを選択', 'このカードを別のランダムなカードに変化させます。8ダメージを受けます。', '#f5a623',
    (pileArr, idx, card) => {
      const pool = REWARD_POOL.filter(c => c.id !== card.id);
      const newDef = pool[Math.floor(Math.random() * pool.length)];
      pileArr.splice(idx, 1, { ...newDef });
      const dmg = Math.max(0, 8 - player.block);
      player.block = Math.max(0, player.block - 8);
      player.hp -= dmg;
      log(`★ ${card.name}が${newDef.name}に変化した！ (${dmg}ダメージ受けた)`, 'buff');
      showToast({ icon:newDef.icon, label:'カード変化', title:`${card.name} → ${newDef.name}`, sub:newDef.desc, color:'#f5a623' });
      render(); showMapScreen();
    },
    showEvent2  // キャンセルで3択に戻る
  );
}

// ── 選択肢3: 削除 最大HP-5 ──
function event2ChooseRemove() {
  closeEvent();
  openEventCardPicker('削除するカードを選択', 'このカードをデッキから削除します。最大HP-5。', '#e94560',
    (pileArr, idx, card) => {
      pileArr.splice(idx, 1);
      player.maxHp = Math.max(1, player.maxHp - 5);
      player.hp = Math.min(player.hp, player.maxHp);
      log(`★ ${card.name}をデッキから削除した！ (最大HP-5 → ${player.maxHp})`, 'buff');
      showToast({ icon:'🗑️', label:'カード削除', title:card.name, sub:'最大HP-5', color:'#e94560' });
      render(); showMapScreen();
    },
    showEvent2  // キャンセルで3択に戻る
  );
}
function handleBoss() {
  startBattle([ENEMY_DEFS[mapData.bossId]]);
}

// ================================================================
