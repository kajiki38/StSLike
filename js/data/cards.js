// ================================================================
// CARDS
// ================================================================
const ALL_CARDS = [
  // ── スターター ─────────────────────────────────────────────────
  { id:'strike',           name:'ストライク',        icon:'⚔️',  cost:1, desc:'6ダメージ',                              type:'attack',    value:6,               rarity:'starter' },
  { id:'defend',           name:'防御',              icon:'🛡️',  cost:1, desc:'5ブロック',                              type:'defend',    value:5,               rarity:'starter' },
  { id:'bash',             name:'強打',          icon:'💥',  cost:2, desc:'8ダメージ\n弱体2ターン',                  type:'attack',    value:8, vulnerable:2,  rarity:'starter' },
  // ── コモン 攻撃 ────────────────────────────────────────────────
  { id:'anger',            name:'怒り',              icon:'😡',  cost:0, desc:'6ダメージ\n捨て札にコピーを追加',          type:'attack',    value:6, addCopyToDiscard:true,     rarity:'common' },
  { id:'clothesline',      name:'ラリアット',      icon:'🪝',  cost:2, desc:'12ダメージ\n脱力2ターン',                  type:'attack',    value:12, targetWeak:2,              rarity:'common' },
  { id:'headbutt',         name:'ヘッドバット',            icon:'🪖',  cost:1, desc:'9ダメージ\n捨て札から1枚選んで\n山札トップに戻す', type:'attack', value:9, chooseDiscardToDraw:true, rarity:'common' },
  { id:'perfected_strike', name:'パーフェクトストライク',  icon:'⚔️',  cost:2, desc:'6+ストライク系×2\nダメージ',              type:'attack',    value:6, perStrikeDmg:2,            rarity:'common' },
  { id:'wild_strike',      name:'ワイルドストライク', icon:'🌀', cost:1, desc:'12ダメージ\n傷を捨て札に追加',            type:'attack',    value:12, addWound:1,                rarity:'common' },
  { id:'sboomerang',       name:'ソードブーメラン',  icon:'🪃',  cost:1, desc:'ランダムな敵に\n3ダメージ×3',              type:'attack',    value:3, hits:3, randomTarget:true, rarity:'common' },
  { id:'pommel',           name:'ポンメルストライク', icon:'🗡️', cost:1, desc:'9ダメージ\n1枚ドロー',                    type:'attack',    value:9, draw:1,                    rarity:'common' },
  { id:'iwave',            name:'アイアンウェーブ',  icon:'🌊',  cost:1, desc:'5ダメージ\n5ブロック',                    type:'attack',    value:5, block:5,                   rarity:'common' },
  { id:'twin',             name:'ツインストライク',  icon:'✌️',  cost:1, desc:'5ダメージ×2',                            type:'attack',    value:5, hits:2,                    rarity:'common' },
  { id:'sweep',            name:'なぎ払い',          icon:'💫',  cost:1, desc:'全体に8ダメージ',                        type:'attack-all', value:8,                          rarity:'common' },
  // ── コモン スキル ──────────────────────────────────────────────
  { id:'shrug_off',        name:'受け流し',          icon:'😤',  cost:1, desc:'8ブロック\n1枚ドロー',                    type:'skill',     value:8, draw:1,                    rarity:'common' },
  { id:'armaments',        name:'武装',              icon:'⚙️',  cost:1, desc:'5ブロック\n手札1枚をアップグレード',      type:'skill',     value:5, upgradeRandomHand:true,    rarity:'common' },
  { id:'true_grit',        name:'不屈の闘志',          icon:'💪',  cost:1, desc:'7ブロック\n手札1枚を破棄',                type:'skill',     value:7, exhaustRandom:1,           rarity:'common' },
  { id:'bloodletting',     name:'瀉血',              icon:'💉',  cost:0, desc:'HP3消費\nエネルギー+2',                   type:'skill',     loseHp:3, gainEnergy:2,            rarity:'common' },
  // ── コモン パワー ──────────────────────────────────────────────
  { id:'inflame',          name:'発火',        icon:'🔥',  cost:1, desc:'筋力+2',                                  type:'power',     gainStrength:2,                    rarity:'common' },
  { id:'metallicize',      name:'金属化',            icon:'🪨',  cost:1, desc:'ターン終了時\nブロック+3',                type:'power',     powerEffect:'metallicize', powerStacks:3, rarity:'common' },
  // ── アンコモン 攻撃 ────────────────────────────────────────────
  { id:'carnage',          name:'大虐殺',            icon:'🩸',  cost:2, desc:'20ダメージ',                  type:'attack',    value:20, ethereal:true,             rarity:'uncommon' },
  { id:'uppercut',         name:'アッパーカット',    icon:'👊',  cost:2, desc:'13ダメージ\n脱力1\n弱体1',                type:'attack',    value:13, targetWeak:1, vulnerable:1, rarity:'uncommon' },
  { id:'dropkick',         name:'ドロップキック',    icon:'🦵',  cost:1, desc:'5ダメージ\n(敵が弱体なら\n+1エネ+1ドロー)', type:'attack', value:5, ifVulnerable:true,         rarity:'uncommon' },
  { id:'pummel',           name:'連打',              icon:'✊',  cost:1, desc:'2ダメージ×4\n破棄',                       type:'attack',    value:2, hits:4, exhaust:true,        rarity:'uncommon' },
  { id:'hemokinesis',      name:'ヘモキネシス',          icon:'🩸',  cost:1, desc:'HP2消費\n15ダメージ',                     type:'attack',    value:15, loseHp:2,                  rarity:'uncommon' },
  { id:'whirlwind',        name:'旋風刃',            icon:'🌪️',  cost:0, desc:'全体に5ダメージ×\nエネルギー消費量',      type:'attack-all', value:5, xCost:true,               rarity:'uncommon' },
  // ── アンコモン スキル ──────────────────────────────────────────
  { id:'seeing_red',       name:'激昂',        icon:'🔴',  cost:1, desc:'エネルギー+2\n破棄',                      type:'skill',     gainEnergy:2, exhaust:true,          rarity:'uncommon' },
  { id:'entrench',         name:'塹壕',              icon:'🏰',  cost:2, desc:'現在のブロックを\n2倍にする',              type:'skill',     doubleBlock:true,                  rarity:'uncommon' },
  { id:'shockwave',        name:'衝撃波',            icon:'💢',  cost:2, desc:'全敵に脱力3+弱体3\n破棄',                 type:'skill',     allWeak:3, allVulnerable:3, exhaust:true, rarity:'uncommon' },
  { id:'disarm',           name:'武装解除',          icon:'🗡️',  cost:1, desc:'敵の筋力-2\n破棄',                        type:'skill',     targetStrDown:2, exhaust:true, needsTarget:true, rarity:'uncommon' },
  { id:'power_through',    name:'やせ我慢',            icon:'💥',  cost:1, desc:'傷×2を手札に追加\nブロック+15',          type:'skill',     value:15, addWoundToHand:2,          rarity:'uncommon' },
  { id:'ghostly_armor',    name:'ゴーストアーマー',            icon:'👻',  cost:1, desc:'10ブロック',                  type:'skill',     value:10, ethereal:true,             rarity:'uncommon' },
  { id:'rage',             name:'激怒',              icon:'🔥',  cost:0, desc:'このターン攻撃カード\n使用時ブロック+3',   type:'skill',     rageTurn:3,                            rarity:'uncommon' },
  // ── アンコモン パワー ──────────────────────────────────────────
  { id:'brutality',        name:'残虐',              icon:'😈',  cost:0, desc:'各ターン開始時\nHP1消費・1枚ドロー',      type:'power',     powerEffect:'brutality',           rarity:'uncommon' },
  { id:'feel_no_pain',     name:'無痛',              icon:'🛡️',  cost:1, desc:'カード破棄時\nブロック+3',                type:'power',     powerEffect:'feelNoPain', powerStacks:3, rarity:'uncommon' },
  { id:'evolve',           name:'進化',              icon:'🧬',  cost:1, desc:'ステータスカード\nドロー時1枚追加ドロー', type:'power',     powerEffect:'evolve', powerStacks:1,     rarity:'uncommon' },
  { id:'dark_embrace',     name:'闇の抱擁',          icon:'🖤',  cost:2, desc:'カード破棄時\n1枚ドロー',                 type:'power',     powerEffect:'darkEmbrace', powerStacks:1, rarity:'uncommon' },
  // ── レア 攻撃 ─────────────────────────────────────────────────
  { id:'fiend_fire',       name:'鬼火',            icon:'👹',  cost:2, desc:'手札を全破棄\n1枚につき7ダメージ',        type:'attack',    value:7, exhaustHand:true, exhaust:true, rarity:'rare' },
  { id:'immolate',         name:'焼身',              icon:'🌋',  cost:2, desc:'全体21ダメージ\n火傷を捨て札に追加',      type:'attack-all', value:21, addBurn:1,               rarity:'rare' },
  { id:'reaper',           name:'死神',              icon:'💀',  cost:2, desc:'全体4ダメージ\n与えたHP分を回復',          type:'attack-all', value:4, healOnDamage:true,        rarity:'rare' },
  { id:'feed',             name:'捕食',              icon:'🍖',  cost:1, desc:'10ダメージ\n倒すと最大HP+3\n破棄',        type:'attack',    value:10, feedOnKill:3, exhaust:true,  rarity:'rare' },
  // ── レア スキル ───────────────────────────────────────────────
  { id:'impervious',       name:'不動',          icon:'🏛️',  cost:2, desc:'30ブロック\n破棄',                        type:'skill',     value:30, exhaust:true,              rarity:'rare' },
  { id:'limit_break',      name:'リミットブレイク',          icon:'⚡',  cost:1, desc:'筋力を2倍にする\n破棄',                   type:'skill',     doubleStrength:true, exhaust:true,   rarity:'rare' },
  { id:'offering',         name:'供物',            icon:'🕯️',  cost:0, desc:'HP6消費\nエネルギー+2・3枚ドロー\n破棄',  type:'skill',     loseHp:6, gainEnergy:2, draw:3, exhaust:true, rarity:'rare' },
  // ── レア パワー ───────────────────────────────────────────────
  { id:'demon_form',       name:'悪魔化',            icon:'😈',  cost:3, desc:'各ターン開始時\n筋力+2',                  type:'power',     powerEffect:'demonForm', powerStacks:2, rarity:'rare' },
  { id:'corruption',       name:'堕落',              icon:'☠️',  cost:3, desc:'スキルのコストは0\nスキル使用時破棄',               type:'power',     powerEffect:'corruption',          rarity:'rare' },
  // ── ステータスカード ──────────────────────────────────────────
  { id:'wound',  name:'傷',    icon:'🩹', cost:0, desc:'使用不可',                  type:'status', battleOnly:true, unplayable:true },
  { id:'burn',   name:'火傷',  icon:'🔥', cost:0, desc:'使用不可\nターン終了時2ダメージ',        type:'status', battleOnly:true, unplayable:true, burnDmg:2 },
  { id:'slimed', name:'粘液',  icon:'🟢', cost:1, desc:'破棄',                                  type:'status', battleOnly:true },
  { id:'daze',   name:'めまい', icon:'💤', cost:0, desc:'使用不可\nターン終了時破棄',            type:'status', battleOnly:true, unplayable:true, ethereal:true },
  // ── 呪いカード ──────────────────────────────────────────────────
  { id:'injury', name:'怪我',  icon:'🩸', cost:0, desc:'使用不可',            type:'status', curse:true, unplayable:true },
  { id:'greed',  name:'強欲',  icon:'💸', cost:0, desc:'使用不可（永劫・削除不可）', type:'status', curse:true, eternal:true, unplayable:true },
];
const CARD_MAP    = Object.fromEntries(ALL_CARDS.map(c => [c.id, c]));
const REWARD_POOL = ALL_CARDS.filter(c => !['strike','defend','bash','slimed','daze','wound','burn','injury','greed'].includes(c.id));
const REWARD_POOL_BY_RARITY = {
  common:   REWARD_POOL.filter(c => c.rarity === 'common'),
  uncommon: REWARD_POOL.filter(c => c.rarity === 'uncommon'),
  rare:     REWARD_POOL.filter(c => c.rarity === 'rare'),
};
const RARITY_LABEL = { starter:'スターター', common:'コモン', uncommon:'アンコモン', rare:'レア' };
const STARTER_IDS = { strike:5, defend:4, bash:1 };

