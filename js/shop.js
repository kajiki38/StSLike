// TREASURE ROOM
// ================================================================
function showTreasureRoom() {
  const ownedIds = new Set(relics.map(r => r.id));
  const available = Object.values(RELIC_DEFS).filter(r => !ownedIds.has(r.id));
  shuffle(available);
  const relic = available[0] || null;
  const gold = Math.floor(Math.random() * 76);

  treasureState = { relic, gold };

  document.getElementById('treasure-floor-text').textContent = `FLOOR ${floor} クリア`;
  const ri = document.getElementById('treasure-relic-icon');
  const rn = document.getElementById('treasure-relic-name');
  const rd = document.getElementById('treasure-relic-desc');
  if (relic) { ri.textContent = relic.icon; rn.textContent = relic.name; rd.textContent = relic.desc; }
  else { ri.textContent = '❓'; rn.textContent = 'レリックなし'; rd.textContent = ''; }
  document.getElementById('treasure-gold-amount').textContent = gold;

  document.getElementById('treasure-screen').classList.add('show');
}

function claimTreasure() {
  if (!treasureState) return;
  const { relic, gold } = treasureState;
  treasureState = null;

  if (gold > 0) {
    player.gold += gold;
    log(`💰 宝箱: ゴールド+${gold}`, 'buff');
    showToast({ icon:'💰', label:'ゴールド入手', title:`+${gold}G`, color:'#f5c842' });
  }
  if (relic) {
    const newRelic = { ...RELIC_DEFS[relic.id] };
    relics.push(newRelic);
    if (newRelic.triggers && newRelic.triggers.on_acquire) {
      newRelic.triggers.on_acquire({ player, enemies: [], relics });
    }
    log(`🏺 宝箱: ${relic.name} を獲得！`, 'buff');
    showToast({ icon:relic.icon, label:'レリック入手', title:relic.name, sub:relic.desc, color:'#d4a017' });
  }

  document.getElementById('treasure-screen').classList.remove('show');
  render();
  showMapScreen();
}

// ================================================================
// SHOP
// ================================================================
function showShop() {
  renderPlayerStatusBar(document.getElementById("shop-player-status"));
  const ownedIds = new Set(relics.map(r => r.id));
  const availableRelics = Object.values(RELIC_DEFS).filter(r => !ownedIds.has(r.id));
  shuffle(availableRelics);

  // 7 random cards
  const excludeIds = new Set();
  const cardPrices = { common:75, uncommon:100, rare:150 };
  const shopCards = [];
  for (let i = 0; i < 7; i++) {
    const c = pickRewardCard(excludeIds);
    if (c) {
      const basePrice = cardPrices[c.rarity] || 75;
      const sale = Math.random() < 0.15;
      const price = sale ? Math.round(basePrice * 0.3) : basePrice;
      shopCards.push({...c, sold:false, price, sale, basePrice});
      excludeIds.add(c.id);
    }
  }

  // 3 relics
  const shopRelics = availableRelics.slice(0,3).map(r => ({...r, sold:false, price:150}));

  // 3 potions
  const potionIds = Object.keys(POTION_DEFS);
  const shuffledPotionIds = [...potionIds]; shuffle(shuffledPotionIds);
  const shopPotions = shuffledPotionIds.slice(0,3).map(id => ({...POTION_DEFS[id], sold:false, price:50}));

  shopState = { cards:shopCards, relics:shopRelics, potions:shopPotions, removeCost:75 };
  renderShop();
  document.getElementById('shop-screen').classList.add('show');
}

function renderShop() {
  document.getElementById('shop-gold').textContent = player.gold;
  document.getElementById('shop-remove-cost').textContent = shopState.removeCost;

  // Cards
  document.getElementById('shop-cards-area').innerHTML = shopState.cards.map((c,i) => {
    const tc = getCardClass(c);
    let priceHtml;
    if (c.sold) {
      priceHtml = `<div class="shop-price sold-label">売り切れ</div>`;
    } else if (c.sale) {
      priceHtml = `<div class="shop-price shop-price-sale">
        <span class="shop-sale-tag">🏷 SALE 70%OFF</span>
        <span class="shop-original-price">${c.basePrice}💰</span>
        <span class="shop-sale-price">${c.price}💰</span>
      </div>`;
    } else {
      priceHtml = `<div class="shop-price">${c.price}💰</div>`;
    }
    return `<div class="shop-card-wrap${c.sold?' sold':''}${c.sale&&!c.sold?' on-sale':''}" onclick="buyShopCard(${i})">
      <div class="pile-card ${tc}">
        ${getCostHtml(c)}
        <div class="card-icon">${c.icon}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-desc">${c.desc}</div>
      </div>
      ${priceHtml}
    </div>`;
  }).join('');

  // Relics
  document.getElementById('shop-relics-area').innerHTML = shopState.relics.map((r,i) => {
    const priceHtml = r.sold
      ? `<div class="shop-price sold-label">売り切れ</div>`
      : `<div class="shop-price">${r.price}💰</div>`;
    return `<div class="shop-relic-item${r.sold?' sold':''}" onclick="buyShopRelic(${i})">
      <div class="shop-relic-icon">${r.icon}</div>
      <div class="shop-relic-name">${r.name}</div>
      <div class="shop-relic-desc">${r.desc}</div>
      ${priceHtml}
    </div>`;
  }).join('');

  // Potions
  document.getElementById('shop-potions-area').innerHTML = shopState.potions.map((p,i) => {
    const priceHtml = p.sold
      ? `<div class="shop-price sold-label">売り切れ</div>`
      : `<div class="shop-price">${p.price}💰</div>`;
    return `<div class="shop-potion-item${p.sold?' sold':''}" onclick="buyShopPotion(${i})">
      <div class="shop-potion-icon">${p.icon}</div>
      <div class="shop-potion-name">${p.name}</div>
      <div class="shop-potion-desc">${p.desc}</div>
      ${priceHtml}
    </div>`;
  }).join('');
}

function buyShopCard(i) {
  const c = shopState.cards[i];
  if (c.sold) return;
  if (player.gold < c.price) { log('ゴールドが足りない！','debuff'); return; }
  player.gold -= c.price;
  c.sold = true;
  const bought = Object.assign({}, c);
  delete bought.sold; delete bought.price;
  deck.push(bought);
  log(`🏪 ${c.name} を購入した！ (-${c.price}💰)`,'buff');
  showToast({ icon:c.icon, label:'カード購入', title:c.name, sub:c.desc, color:'#4a9dca' });
  renderShop();
  render();
}

function buyShopRelic(i) {
  const r = shopState.relics[i];
  if (r.sold) return;
  if (player.gold < r.price) { log('ゴールドが足りない！','debuff'); return; }
  player.gold -= r.price;
  r.sold = true;
  const newRelic = {...RELIC_DEFS[r.id]};
  relics.push(newRelic);
  if (newRelic.triggers && newRelic.triggers.on_acquire) {
    newRelic.triggers.on_acquire({player, enemies:[], relics});
  }
  log(`🏪 ${r.name} を購入した！ (-${r.price}💰)`,'buff');
  showToast({ icon:r.icon, label:'レリック購入', title:r.name, sub:r.desc, color:'#f5a623' });
  renderShop();
  render();
}

function buyShopPotion(i) {
  const p = shopState.potions[i];
  if (p.sold) return;
  if (potions.length >= 3) { log('ポーションをこれ以上持てない！(最大3個)','debuff'); return; }
  if (player.gold < p.price) { log('ゴールドが足りない！','debuff'); return; }
  player.gold -= p.price;
  p.sold = true;
  const pd = POTION_DEFS[p.id];
  potions.push({...pd});
  log(`🏪 ${p.name} を購入した！ (-${p.price}💰)`,'buff');
  showToast({ icon:p.icon, label:'ポーション購入', title:p.name, sub:p.desc, color:pd.color||'#9b4dca' });
  renderShop();
  render();
}

function startCardRemoval() {
  if (player.gold < shopState.removeCost) { log('ゴールドが足りない！','debuff'); return; }
  const allCards = [...deck, ...discard];
  if (allCards.length === 0) { log('削除できるカードがない！','debuff'); return; }
  document.getElementById('shop-remove-btn').disabled = true;

  const sorted = [...allCards].sort((a,b) => a.name.localeCompare(b.name));
  document.getElementById('shop-remove-picker-cards').innerHTML = sorted.map(c => {
    const tc = getCardClass(c);
    const inDeck = deck.indexOf(c);
    const inDiscard = discard.indexOf(c);
    const src = inDeck >= 0 ? `deck,${inDeck}` : `discard,${inDiscard}`;
    return `<div class="shop-remove-card" onclick="confirmCardRemoval('${src}')">
      <div class="pile-card ${tc}">
        ${getCostHtml(c)}
        <div class="card-icon">${c.icon}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-desc">${c.desc}</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('shop-remove-picker').style.display = 'block';
}

function cancelCardRemoval() {
  document.getElementById('shop-remove-picker').style.display = 'none';
  document.getElementById('shop-remove-btn').disabled = false;
}

function confirmCardRemoval(srcStr) {
  const [pile, idx] = srcStr.split(',');
  const i = parseInt(idx);
  const pileArr = pile === 'deck' ? deck : discard;
  const card = pileArr[i];
  if (!card) return;
  const cost = shopState.removeCost;
  player.gold -= cost;
  shopState.removeCost += 25;
  pileArr.splice(i, 1);
  log(`🗑️ ${card.name} をデッキから削除した！ (-${cost}💰)`,'buff');
  showToast({ icon:'🗑️', label:'カード削除', title:card.name, sub:`-${cost}G`, color:'#e94560' });
  document.getElementById('shop-remove-picker').style.display = 'none';
  document.getElementById('shop-remove-btn').disabled = false;
  renderShop();
  render();
}

function leaveShop() {
  document.getElementById('shop-screen').classList.remove('show');
  shopState = null;
  showMapScreen();
}

document.addEventListener('DOMContentLoaded', () => {
  initGame();

  const sc = document.getElementById('map-scroll-container');
  let isDragging = false, startX = 0, scrollStart = 0;

  sc.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX;
    scrollStart = sc.scrollLeft;
    sc.style.cursor = 'grabbing';
    sc.style.userSelect = 'none';
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    sc.style.cursor = 'grab';
    sc.style.userSelect = '';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    sc.scrollLeft = scrollStart - (e.pageX - startX);
  });
  sc.addEventListener('wheel', e => {
    e.preventDefault();
    sc.scrollLeft += e.deltaY + e.deltaX;
  }, { passive: false });

  sc.style.cursor = 'grab';
});
