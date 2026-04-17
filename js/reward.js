// VICTORY / REWARD / DEFEAT
// ================================================================
let rewardCallback = null;

// レアリティ重み付き抽選 (common:60%, uncommon:35%, rare:3%)
function rollRewardRarity() {
  const r = Math.random() * 100;
  if (r < 3) return "rare";
  if (r < 38) return "uncommon";
  return "common";
}
function pickRewardCard(exclude) {
  const rarity = rollRewardRarity();
  const pool = REWARD_POOL_BY_RARITY[rarity].filter((c) => !exclude.has(c.id));
  if (pool.length === 0) {
    // フォールバック: 別レアリティから
    const fallback = REWARD_POOL.filter((c) => !exclude.has(c.id));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function showCardReward(callback) {
  rewardCallback = callback || null;
  const options = [];
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const card = pickRewardCard(seen);
    if (card) {
      options.push(card);
      seen.add(card.id);
    }
  }
  const container = document.getElementById("reward-cards");
  container.innerHTML = "";
  options.forEach((card) => {
    const tc = getCardClass(card);
    const div = document.createElement("div");
    div.className = `reward-card ${tc}`;
    div.innerHTML = `
      ${getCostHtml(card)}
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>
      ${card.ethereal ? '<div class="card-tag">エセリアル</div>' : ""}`;
    div.onclick = () => selectRewardCard(card);
    container.appendChild(div);
  });
  document.getElementById("reward-screen").classList.add("show");
}

function onVictory() {
  SFX.victory();
  // エセリアルなど破棄カードを捨て札に戻す（battleOnlyは除く）
  discard.push(...exhausted.filter((c) => !c.battleOnly));
  exhausted = exhausted.filter((c) => c.battleOnly);
  triggerRelics("combat_end");
  player.gold += 15;
  log("💰 戦闘勝利: ゴールド+15", "buff");
  // ポーション抽選
  if (Math.random() * 100 < potionChance && potions.length < maxPotionSlots) {
    const pool = Object.values(POTION_DEFS);
    const p = pool[Math.floor(Math.random() * pool.length)];
    potions.push({ ...p });
    log(`🧪 ポーション「${p.name}」を入手した！`, "buff");
    showToast({
      icon: p.icon,
      label: "ポーション入手",
      title: p.name,
      sub: p.desc,
      color: p.color || "#9b4dca",
    });
    potionChance = Math.max(0, potionChance - 10);
  } else {
    potionChance = Math.min(100, potionChance + 10);
  }
  render();
  if (isBossBattle) {
    onBossVictory();
    return;
  }
  if (isEliteBattle) {
    onEliteVictory();
    return;
  }
  showCardReward(null);
}

function onEliteVictory() {
  const ownedIds = new Set(relics.map((r) => r.id));
  const available = Object.values(RELIC_DEFS).filter(
    (r) => !ownedIds.has(r.id),
  );
  if (available.length > 0) {
    shuffle(available);
    const r = available[0];
    relics.push({ ...r });
    log(`✨ レリック「${r.name}」を獲得した！`, "important");
    showToast({
      icon: r.icon,
      label: "レリック入手",
      title: r.name,
      sub: r.desc,
      color: "#f5a623",
    });
    triggerRelicAcquire(relics[relics.length - 1]);
    render();
    document.getElementById("relic-obtained-icon").textContent = r.icon;
    document.getElementById("relic-obtained-name").textContent = r.name;
    document.getElementById("relic-obtained-desc").textContent = r.desc;
  } else {
    log("新しいレリックはなかった…", "buff");
    render();
  }
  document.getElementById("relic-reward-screen").classList.add("show");
}

function onBossVictory() {
  log("🏆 ガーディアンを撃破！ クリア！", "important");
  const allCards = [...deck, ...discard, ...hand, ...exhausted].filter(
    (c) => !c.battleOnly,
  );
  document.getElementById("bosswin-summary").innerHTML =
    `残りHP: <b>${player.hp} / ${player.maxHp}</b><br>` +
    `ゴールド: <b>${player.gold}G</b><br>` +
    `デッキ枚数: <b>${allCards.length}枚</b><br>` +
    `レリック: <b>${relics.map((r) => r.icon).join(" ") || "なし"}</b>`;
  document.getElementById("bosswin-screen").classList.add("show");
}

function continueAfterElite() {
  document.getElementById("relic-reward-screen").classList.remove("show");
  showCardReward(afterEliteReward); // レリック後にカード報酬
}
function afterEliteReward() {
  showMapScreen();
}

function selectRewardCard(card) {
  deck.push({ ...card });
  shuffle(deck);
  log(`✨ ${card.name} をデッキに追加した！`, "important");
  showToast({
    icon: card.icon,
    label: "カード追加",
    title: card.name,
    sub: card.desc,
    color: "#4a9dca",
  });
  document.getElementById("reward-screen").classList.remove("show");
  if (rewardCallback) {
    const cb = rewardCallback;
    rewardCallback = null;
    cb();
  } else afterReward();
}
function skipReward() {
  log("カード報酬をスキップした");
  document.getElementById("reward-screen").classList.remove("show");
  if (rewardCallback) {
    const cb = rewardCallback;
    rewardCallback = null;
    cb();
  } else afterReward();
}
function afterReward() {
  showMapScreen();
}

function showVictoryScreen() {
  document.getElementById("victory-floor-text").textContent =
    `FLOOR ${floor} クリア`;
  const isNextElite = nextEncounterDefs.some((d) => d.isElite);
  document.getElementById("next-enemies-preview").innerHTML = nextEncounterDefs
    .map(
      (d) => `
      <div class="nei-card${isNextElite ? " elite-card" : ""}">
        <div class="nei-sprite">${d.sprite}</div>
        <div class="nei-name">${isNextElite ? "⚡ " : ""}${d.name}</div>
        <div class="nei-hp">HP ${d.hpMin}–${d.hpMax}</div>
      </div>`,
    )
    .join("");
  document.getElementById("victory-screen").classList.add("show");
}

function showRestArea() {
  document.getElementById("rest-floor-text").textContent =
    `FLOOR ${floor} クリア`;
  document.getElementById("rest-choices-area").style.display = "flex";
  document.getElementById("smith-area").style.display = "none";
  renderPlayerStatusBar(document.getElementById("rest-player-status"));
  document.getElementById("rest-screen").classList.add("show");
}

function chooseRest() {
  let heal = Math.floor(player.maxHp * 0.3);
  // 王者の枕: 追加15HP回復
  const pillow = relics.find((r) => r.id === "regal_pillow");
  if (pillow) {
    heal += 15;
    log("🛏️ 王者の枕: 追加HP+15", "buff");
  }
  const actual = Math.min(heal, player.maxHp - player.hp);
  player.hp += actual;
  log(`🏕️ 休憩: HP +${actual} 回復 (${player.hp}/${player.maxHp})`, "buff");
  // 古代のティーセット: 次の戦闘でエネルギー+2
  const teaSet = relics.find((r) => r.id === "tea_set");
  if (teaSet) {
    teaSet.pending = true;
    log("🍵 古代のティーセット: 次の戦闘でエネルギー+2", "buff");
  }
  document.getElementById("rest-screen").classList.remove("show");
  render();
  showMapScreen();
}

function chooseSmith() {
  const upgradable = [...deck, ...discard, ...hand].filter(
    (c) => !c.upgraded && !c.battleOnly,
  );
  if (upgradable.length === 0) {
    log("アップグレード可能なカードがない！", "debuff");
    document.getElementById("rest-screen").classList.remove("show");
    showVictoryScreen();
    return;
  }
  document.getElementById("rest-choices-area").style.display = "none";
  const smithCardsEl = document.getElementById("smith-cards");
  smithCardsEl.innerHTML = "";
  upgradable.forEach((card) => {
    const tc = getCardClass(card);
    const pre = getUpgradePreview(card);
    const div = document.createElement("div");
    div.className = `smith-card ${tc}`;
    div.innerHTML = `
      ${getCostHtml(card)}
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>`;
    div.onclick = () => selectUpgrade(card);
    div.addEventListener("mouseenter", () => {
      document.getElementById("spp-before-name").textContent = card.name;
      document.getElementById("spp-before-desc").textContent = card.desc;
      document.getElementById("spp-after-name").textContent = pre.name;
      document.getElementById("spp-after-desc").textContent = pre.desc;
      document.querySelector(
        "#smith-preview-panel .spp-placeholder",
      ).style.display = "none";
      document.getElementById("smith-preview-content").style.display = "flex";
    });
    div.addEventListener("mouseleave", () => {
      document.getElementById("smith-preview-content").style.display = "none";
      document.querySelector(
        "#smith-preview-panel .spp-placeholder",
      ).style.display = "";
    });
    smithCardsEl.appendChild(div);
  });
  document.getElementById("smith-area").style.display = "block";
}

function cancelSmith() {
  document.getElementById("smith-preview-content").style.display = "none";
  document.querySelector(
    "#smith-preview-panel .spp-placeholder",
  ).style.display = "";
  document.getElementById("smith-area").style.display = "none";
  document.getElementById("rest-choices-area").style.display = "flex";
}

function selectUpgrade(card) {
  const origName = card.name;
  const pre = getUpgradePreview(card);
  upgradeCard(card);
  log(`⚒️ ${origName} をアップグレードした！`, "buff");
  showToast({
    icon: card.icon,
    label: "アップグレード",
    title: `${origName} → ${pre.name}`,
    sub: pre.desc,
    color: "#40ffa0",
  });
  document.getElementById("rest-screen").classList.remove("show");
  showMapScreen();
}

function getUpgradePreview(card) {
  switch (card.id) {
    // スターター
    case "strike":
      return { name: "ストライク+", desc: "9ダメージ" };
    case "defend":
      return { name: "防御+", desc: "8ブロック" };
    case "bash":
      return { name: "強打+", desc: "10ダメージ\n弱体3ターン" };
    // コモン 攻撃
    case "anger":
      return { name: "怒り+", desc: "8ダメージ\n捨て札にコピーを追加" };
    case "clothesline":
      return { name: "ラリアット+", desc: "14ダメージ\n脱力2ターン" };
    case "headbutt":
      return {
        name: "ヘッドバット+",
        desc: "12ダメージ\n捨て札から1枚選んで\n山札トップに戻す",
      };
    case "perfected_strike":
      return {
        name: "パーフェクトストライク+",
        desc: "6+ストライク系×3\nダメージ",
      };
    case "wild_strike":
      return {
        name: "ワイルドストライク+",
        desc: "17ダメージ\n傷を捨て札に追加",
      };
    case "sboomerang":
      return { name: "ソードブーメラン+", desc: "ランダムな敵に\n3ダメージ×4" };
    case "pommel":
      return { name: "ポンメルストライク+", desc: "10ダメージ\n2枚ドロー" };
    case "iwave":
      return { name: "アイアンウェーブ+", desc: "7ダメージ\n7ブロック" };
    case "twin":
      return { name: "ツインストライク+", desc: "7ダメージ×2" };
    case "sweep":
      return { name: "なぎ払い+", desc: "全体に11ダメージ" };
    case "carnage":
      return { name: "大虐殺+", desc: "28ダメージ" };
    // コモン スキル
    case "shrug_off":
      return { name: "受け流し+", desc: "11ブロック\n1枚ドロー" };
    case "armaments":
      return { name: "武装+", desc: "5ブロック\n手札全てをアップグレード" };
    case "true_grit":
      return { name: "不屈の闘志+", desc: "9ブロック\n手札1枚を選んで破棄" };
    case "bloodletting":
      return { name: "瀉血+", desc: "HP2消費\nエネルギー+2" };
    // コモン パワー
    case "inflame":
      return { name: "発火+", desc: "筋力+3" };
    case "metallicize":
      return { name: "金属化+", desc: "ターン終了時\nブロック+4" };
    // アンコモン 攻撃
    case "uppercut":
      return { name: "アッパーカット+", desc: "15ダメージ\n脱力2\n弱体2" };
    case "dropkick":
      return {
        name: "ドロップキック+",
        desc: "8ダメージ\n(敵が弱体なら\n+1エネ+1ドロー)",
      };
    case "pummel":
      return { name: "連打+", desc: "2ダメージ×5\n破棄" };
    case "hemokinesis":
      return { name: "ヘモキネシス+", desc: "HP2消費\n20ダメージ" };
    case "whirlwind":
      return { name: "旋風刃+", desc: "全体に8ダメージ×\nエネルギー消費量" };
    // アンコモン スキル
    case "seeing_red":
      return { name: "激昂+", desc: "エネルギー+2\n破棄 (コスト0)" };
    case "entrench":
      return { name: "塹壕+", desc: "現在のブロックを\n2倍 (コスト1)" };
    case "shockwave":
      return { name: "衝撃波+", desc: "全敵に脱力5+弱体5\n破棄" };
    case "disarm":
      return { name: "武装解除+", desc: "敵の筋力-4\n破棄" };
    case "power_through":
      return { name: "やせ我慢+", desc: "傷×2を手札に追加\nブロック+20" };
    case "ghostly_armor":
      return { name: "ゴーストアーマー+", desc: "13ブロック" };
    // アンコモン パワー
    case "brutality":
      return { name: "残虐+", desc: "各ターン開始時\nHP1消費・2枚ドロー" };
    case "feel_no_pain":
      return { name: "無痛+", desc: "カード破棄時\nブロック+5" };
    case "rage":
      return { name: "激怒+", desc: "このターン攻撃カード\n使用時ブロック+5" };
    case "evolve":
      return { name: "進化+", desc: "状態異常カード\nドロー時2枚追加ドロー" };
    case "dark_embrace":
      return { name: "闇の抱擁+", desc: "カード破棄時\n2枚ドロー" };
    // レア 攻撃
    case "fiend_fire":
      return { name: "鬼火+", desc: "手札を全破棄\n1枚につき10ダメージ" };
    case "immolate":
      return { name: "焼身+", desc: "全体28ダメージ\n火傷を捨て札に追加" };
    case "reaper":
      return { name: "死神+", desc: "全体5ダメージ\n与えたHP分を回復" };
    case "feed":
      return { name: "捕食+", desc: "12ダメージ\n倒すと最大HP+4\n破棄" };
    // レア スキル
    case "impervious":
      return { name: "不動+", desc: "30ブロック\n破棄 (コスト1)" };
    case "limit_break":
      return { name: "リミットブレイク+", desc: "筋力を2倍にする\n(破棄なし)" };
    case "offering":
      return { name: "供物+", desc: "HP6消費\nエネルギー+3・3枚ドロー\n破棄" };
    // レア パワー
    case "demon_form":
      return { name: "悪魔化+", desc: "各ターン開始時\n筋力+3" };
    case "corruption":
      return {
        name: "堕落+",
        desc: "スキルのコストは0\nスキル使用時破棄 (コスト2)",
      };
    default:
      return { name: card.name + "+", desc: card.desc };
  }
}

// 武装カードによる一時強化（戦闘終了後に元に戻る）
function upgradeCardTemp(card) {
  if (card.upgraded) return;
  upgradeCard(card);
  card.tempUpgraded = true;
}

function upgradeCard(card) {
  if (card.upgraded) return;
  card.upgraded = true;
  SFX.upgrade();
  switch (card.id) {
    // スターター
    case "strike":
      card.name = "ストライク+";
      card.value = 9;
      card.desc = "9ダメージ";
      break;
    case "defend":
      card.name = "防御+";
      card.value = 8;
      card.desc = "8ブロック";
      break;
    case "bash":
      card.name = "強打+";
      card.value = 10;
      card.vulnerable = 3;
      card.desc = "10ダメージ\n弱体3ターン";
      break;
    // コモン 攻撃
    case "anger":
      card.name = "怒り+";
      card.value = 8;
      card.desc = "8ダメージ\n捨て札にコピーを追加";
      break;
    case "clothesline":
      card.name = "ラリアット+";
      card.value = 14;
      card.desc = "14ダメージ\n脱力2ターン";
      break;
    case "headbutt":
      card.name = "ヘッドバット+";
      card.value = 12;
      card.desc = "12ダメージ\n捨て札から1枚選んで\n山札トップに戻す";
      break;
    case "perfected_strike":
      card.name = "パーフェクトストライク+";
      card.perStrikeDmg = 3;
      card.desc = "6+ストライク系×3\nダメージ";
      break;
    case "wild_strike":
      card.name = "ワイルドストライク+";
      card.value = 17;
      card.desc = "17ダメージ\n傷を捨て札に追加";
      break;
    case "sboomerang":
      card.name = "ソードブーメラン+";
      card.hits = 4;
      card.desc = "ランダムな敵に\n3ダメージ×4";
      break;
    case "pommel":
      card.name = "ポンメルストライク+";
      card.value = 10;
      card.draw = 2;
      card.desc = "10ダメージ\n2枚ドロー";
      break;
    case "iwave":
      card.name = "アイアンウェーブ+";
      card.value = 7;
      card.block = 7;
      card.desc = "7ダメージ\n7ブロック";
      break;
    case "twin":
      card.name = "ツインストライク+";
      card.value = 7;
      card.desc = "7ダメージ×2";
      break;
    case "sweep":
      card.name = "なぎ払い+";
      card.value = 11;
      card.desc = "全体に11ダメージ";
      break;
    case "carnage":
      card.name = "大虐殺+";
      card.value = 28;
      card.desc = "28ダメージ";
      break;
    // コモン スキル
    case "shrug_off":
      card.name = "受け流し+";
      card.value = 11;
      card.desc = "11ブロック\n1枚ドロー";
      break;
    case "armaments":
      card.name = "武装+";
      card.upgradeAllHand = true;
      card.desc = "5ブロック\n手札全てをアップグレード";
      break;
    case "true_grit":
      card.name = "不屈の闘志+";
      card.value = 9;
      card.exhaustChoose = true;
      card.desc = "9ブロック\n手札1枚を選んで破棄";
      break;
    case "bloodletting":
      card.name = "瀉血+";
      card.loseHp = 2;
      card.desc = "HP2消費\nエネルギー+2";
      break;
    // コモン パワー
    case "inflame":
      card.name = "発火+";
      card.gainStrength = 3;
      card.desc = "筋力+3";
      break;
    case "metallicize":
      card.name = "金属化+";
      card.powerStacks = 4;
      card.desc = "ターン終了時\nブロック+4";
      break;
    // アンコモン 攻撃
    case "uppercut":
      card.name = "アッパーカット+";
      card.value = 15;
      card.vulnerable = 2;
      card.targetWeak = 2;
      card.desc = "15ダメージ\n脱力2\n弱体2";
      break;
    case "dropkick":
      card.name = "ドロップキック+";
      card.value = 8;
      card.desc = "8ダメージ\n(敵が弱体なら\n+1エネ+1ドロー)";
      break;
    case "pummel":
      card.name = "連打+";
      card.hits = 5;
      card.desc = "2ダメージ×5\n破棄";
      break;
    case "hemokinesis":
      card.name = "ヘモキネシス+";
      card.value = 20;
      card.desc = "HP2消費\n20ダメージ";
      break;
    case "whirlwind":
      card.name = "旋風刃+";
      card.value = 8;
      card.desc = "全体に8ダメージ×\nエネルギー消費量";
      break;
    // アンコモン スキル
    case "seeing_red":
      card.name = "激昂+";
      card.cost = 0;
      card.desc = "エネルギー+2\n破棄";
      break;
    case "entrench":
      card.name = "塹壕+";
      card.cost = 1;
      card.desc = "現在のブロックを\n2倍 (コスト1)";
      break;
    case "shockwave":
      card.name = "衝撃波+";
      card.allWeak = 5;
      card.allVulnerable = 5;
      card.desc = "全敵に脱力5+弱体5\n破棄";
      break;
    case "disarm":
      card.name = "武装解除+";
      card.targetStrDown = 4;
      card.desc = "敵の筋力-4\n破棄";
      break;
    case "power_through":
      card.name = "やせ我慢+";
      card.value = 20;
      card.desc = "傷×2を手札に追加\nブロック+20";
      break;
    case "ghostly_armor":
      card.name = "ゴーストアーマー+";
      card.value = 13;
      card.desc = "13ブロック";
      break;
    // アンコモン パワー
    case "brutality":
      card.name =
        "残虐+"; /* draw 2 handled via brutality += 1 again? no, just change desc */
      card.desc = "各ターン開始時\nHP1消費・2枚ドロー";
      break;
    case "feel_no_pain":
      card.name = "無痛+";
      card.powerStacks = 5;
      card.desc = "カード破棄時\nブロック+5";
      break;
    case "rage":
      card.name = "激怒+";
      card.rageTurn = 5;
      card.desc = "このターン攻撃カード\n使用時ブロック+5";
      break;
    case "corruption":
      card.name = "堕落+";
      card.cost = 2;
      card.desc = "スキルのコストは0\nスキル使用時破棄 (コスト2)";
      break;
    case "evolve":
      card.name = "進化+";
      card.powerStacks = 2;
      card.desc = "状態異常を引いた時\n2枚追加ドロー";
      break;
    case "dark_embrace":
      card.name = "闇の抱擁+";
      card.powerStacks = 2;
      card.desc = "カード破棄時\n2枚ドロー";
      break;
    // レア 攻撃
    case "fiend_fire":
      card.name = "鬼火+";
      card.value = 10;
      card.desc = "手札を全破棄\n1枚につき10ダメージ";
      break;
    case "immolate":
      card.name = "焼身+";
      card.value = 28;
      card.desc = "全体28ダメージ\n火傷を捨て札に追加";
      break;
    case "reaper":
      card.name = "死神+";
      card.value = 5;
      card.desc = "全体5ダメージ\n与えたHP分を回復";
      break;
    case "feed":
      card.name = "捕食+";
      card.value = 12;
      card.feedOnKill = 4;
      card.desc = "12ダメージ\n倒すと最大HP+4\n破棄";
      break;
    // レア スキル
    case "impervious":
      card.name = "不動+";
      card.cost = 1;
      card.desc = "30ブロック\n破棄 (コスト1)";
      break;
    case "limit_break":
      card.name = "リミットブレイク+";
      card.exhaust = false;
      card.desc = "筋力を2倍にする\n(破棄なし)";
      break;
    case "offering":
      card.name = "供物+";
      card.gainEnergy = 3;
      card.desc = "HP6消費\nエネルギー+3・3枚ドロー\n破棄";
      break;
    // レア パワー
    case "demon_form":
      card.name = "悪魔化+";
      card.powerStacks = 3;
      card.desc = "各ターン開始時\n筋力+3";
      break;
    default:
      card.name += "+";
      break;
  }
}
function onDefeat() {
  SFX.gameOver();
  document.getElementById("gameover-summary").textContent =
    `FLOOR ${floor} で力尽きた`;
  document.getElementById("gameover-screen").classList.add("show");
}

// ================================================================
// ANIMATIONS
// ================================================================
function animateLunge(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("lunge-right", "lunge-left", "hit");
  void el.offsetWidth;
  el.classList.add(dir === "right" ? "lunge-right" : "lunge-left");
  setTimeout(() => el.classList.remove("lunge-right", "lunge-left"), 400);
}
function animateHit(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hit");
  void el.offsetWidth;
  el.classList.add("hit");
  setTimeout(() => el.classList.remove("hit"), 400);
}
function spawnFloatDmg(value, spriteId, type) {
  const bf = document.getElementById("battlefield"),
    sp = document.getElementById(spriteId);
  if (!sp || !bf) return;
  const bfR = bf.getBoundingClientRect(),
    spR = sp.getBoundingClientRect();
  const div = document.createElement("div");
  div.className = `float-dmg ${type}`;
  div.textContent =
    type === "block"
      ? `🛡 ${value}`
      : type === "heal"
        ? `+${value}`
        : `-${value}`;
  div.style.left = spR.left - bfR.left + spR.width / 2 - 16 + "px";
  div.style.top = spR.top - bfR.top - 20 + "px";
  bf.appendChild(div);
  setTimeout(() => div.remove(), 1000);
}

// ================================================================
