// MAP
// ================================================================
const MAP_SCHEMA = [
  { confirmed:true,  type:'event'            }, // col 0  ★
  { type:'combat'                            }, // col 1
  { type:'combat'                            }, // col 2
  { type:'combat'                            }, // col 3
  { type:'rest_elite'                        }, // col 4  △●●△
  { confirmed:true,  type:'event'            }, // col 5  ★
  { type:'combat'                            }, // col 6
  { type:'combat'                            }, // col 7
  { type:'rest_or_shop'                      }, // col 8
  { type:'combat_or_elite'                   }, // col 9
  { confirmed:true,  type:'treasure'         }, // col 10 宝
  { type:'combat'                            }, // col 11
  { type:'combat'                            }, // col 12
  { type:'rest_or_shop'                      }, // col 13
  { type:'combat_or_elite'                   }, // col 14
  { confirmed:true,  type:'rest'             }, // col 15 確定休憩
  { confirmed:true,  type:'boss'             }, // col 16 ボス
];
const MAP_ROWS = 4;
const COL_W=86, ROW_H=60, NODE_R=20, BOSS_NODE_R=30, MAP_PAD_X=36, MAP_PAD_Y=28;
function getNodeR(type) { return type === 'boss' ? BOSS_NODE_R : NODE_R; }

function resolveNodeType(colType, row) {
  if (colType==='combat')           return 'combat';
  if (colType==='rest_elite')       return (row===0||row===3)?'rest':'elite';
  if (colType==='rest_or_shop')     return Math.random()<0.5?'rest':'shop';
  if (colType==='combat_or_elite')  return Math.random()<0.65?'combat':'elite';
  return 'combat';
}

function generateMap() {
  const nodes = MAP_SCHEMA.map((schema, col) => {
    if (schema.confirmed) {
      return [{ col, row:null, type:schema.type, visited:col===0, accessible:false, connections:[] }];
    }
    if (schema.type === 'rest_or_shop') {
      // ショップ出現数を 1〜2 に固定
      const shopCount = 1 + Math.floor(Math.random() * 2);
      const rows = [0,1,2,3].sort(() => Math.random() - 0.5);
      const shopRows = new Set(rows.slice(0, shopCount));
      return Array.from({length:MAP_ROWS}, (_,row) => ({
        col, row, type: shopRows.has(row) ? 'shop' : 'rest',
        visited:false, accessible:false, connections:[]
      }));
    }
    return Array.from({length:MAP_ROWS}, (_,row) => ({
      col, row, type:resolveNodeType(schema.type, row),
      visited:false, accessible:false, connections:[]
    }));
  });

  for (let col=0; col<MAP_SCHEMA.length-1; col++) {
    const curConf = MAP_SCHEMA[col].confirmed;
    const nxtConf = MAP_SCHEMA[col+1].confirmed;
    nodes[col].forEach((node, ni) => {
      if (nxtConf) {
        node.connections.push(0);
      } else if (curConf) {
        for (let r=0; r<MAP_ROWS; r++) node.connections.push(r);
      } else {
        node.connections.push(ni);
        if (Math.random()<0.20) {
          const opts=[];
          if (ni>0) opts.push(ni-1);
          if (ni<MAP_ROWS-1) opts.push(ni+1);
          if (opts.length) {
            const ex=opts[Math.floor(Math.random()*opts.length)];
            if (!node.connections.includes(ex)) node.connections.push(ex);
          }
        }
      }
    });
  }
  // col0は訪問済み、col1全行をアクセス可能に
  nodes[1].forEach(n => n.accessible=true);
  const bossId = Math.random() < 0.5 ? 'slime_boss' : 'guardian';
  return { nodes, currentCol:0, currentNodeIdx:0, bossId };
}

const NODE_ICON  = { combat:'⚔', elite:'⚡', rest:'🏕', shop:'🏪', event:'★', treasure:'📦', boss:'💀' };
const NODE_BG    = { combat:'#0e1f2e', elite:'#1a0e2e', rest:'#0e1f0e', shop:'#1f1f0e', event:'#14143a', treasure:'#1f1000', boss:'#1f0808' };
const NODE_BORDER= { combat:'#3a7fb0', elite:'#7a3ab0', rest:'#2ab050', shop:'#b09020', event:'#c8a020', treasure:'#c07010', boss:'#c03030' };
const NODE_DESC  = {
  combat:   { name:'通常戦闘', desc:'敵と戦闘する。\n勝利するとカード報酬を1枚獲得できる。' },
  elite:    { name:'エリート', desc:'強力な敵との戦闘。\n撃破するとレリックを獲得できる。' },
  rest:     { name:'休憩エリア', desc:'最大HPの30%を回復するか、\nデッキのカード1枚をアップグレードできる。' },
  shop:     { name:'商人の店', desc:'ゴールドでカード・レリック・ポーションを購入できる。カードの削除も可能。' },
  event:    { name:'イベント', desc:'謎の出来事が起こる。\n良いことも悪いこともある。' },
  treasure: { name:'宝箱', desc:'レリックとゴールドを\n無条件で入手できる。' },
  boss:             { name:'ボス',           desc:'強大なボスとの最終決戦。\n撃破するとクリア！' },
  boss_guardian:    { name:'ガーディアン',   desc:'ガーディアンとの最終決戦。\n撃破するとクリア！' },
  boss_slime_boss:  { name:'スライムボス',   desc:'巨大スライムとの最終決戦。\nHPが半減すると2体に分裂する。\n撃破するとクリア！' },
};

function getNodeX(col)  { return MAP_PAD_X + col*COL_W; }
function getNodeY(row)  { return row===null ? MAP_PAD_Y+(MAP_ROWS-1)*ROW_H/2 : MAP_PAD_Y+row*ROW_H; }

function showMapScreen(combatPeek = false) {
  if (!mapData) return;
  renderPlayerStatusBar(document.getElementById('map-player-status'));
  const screen = document.getElementById('map-screen');
  screen.classList.toggle('combat-view', combatPeek);
  document.getElementById('map-combat-notice').style.display = combatPeek ? 'block' : 'none';
  renderMapDisplay(combatPeek);
  screen.classList.add('show');
  setTimeout(()=>{
    const sc = document.getElementById('map-scroll-container');
    sc.scrollLeft = Math.max(0, getNodeX(mapData.currentCol) - sc.clientWidth/2);
  }, 60);
}

function openMapPeek() {
  showMapScreen(true);
}

function closeMapPeek() {
  document.getElementById('map-screen').classList.remove('show');
}

function renderMapDisplay(combatPeek = false) {
  const {nodes} = mapData;
  const TW = MAP_PAD_X*2+(MAP_SCHEMA.length-1)*COL_W+NODE_R*2+4;
  const TH = MAP_PAD_Y*2+(MAP_ROWS-1)*ROW_H+NODE_R*2+4;

  const disp = document.getElementById('map-display');
  disp.style.width=TW+'px'; disp.style.height=TH+'px';

  const svg = document.getElementById('map-svg');
  svg.setAttribute('width', TW); svg.setAttribute('height', TH);
  let lines='';
  nodes.forEach((colNodes,col) => {
    colNodes.forEach(node => {
      const x1=getNodeX(col), y1=getNodeY(node.row);
      node.connections.forEach(ti => {
        const tn=nodes[col+1]?.[ti]; if(!tn) return;
        const x2=getNodeX(col+1), y2=getNodeY(tn.row);
        const active=node.visited;
        lines+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
          stroke="${active?'#f5c84299':'#3a3a5a'}" stroke-width="${active?2.5:1.5}"
          stroke-dasharray="${active?'':'6,4'}"/>`;
      });
    });
  });
  svg.innerHTML=lines;

  const nc = document.getElementById('map-nodes');
  nc.innerHTML='';
  nodes.forEach((colNodes,col)=>{
    colNodes.forEach((node,ni)=>{
      const x=getNodeX(col), y=getNodeY(node.row);
      const r=getNodeR(node.type);
      const isCur = col===mapData.currentCol && ni===mapData.currentNodeIdx;
      const d=document.createElement('div');
      d.className='map-node';
      if (node.type==='boss') d.classList.add('map-node-boss');
      d.style.cssText=`left:${x-r}px;top:${y-r}px;width:${r*2}px;height:${r*2}px;`+
        `background:${NODE_BG[node.type]||'#111'};border:2px solid ${NODE_BORDER[node.type]||'#444'};`;
      if (isCur) {
        d.classList.add('map-node-current');
        d.style.border=`3px solid ${NODE_BORDER[node.type]||'#f5c842'}`;
        d.style.boxShadow=`0 0 14px ${NODE_BORDER[node.type]||'#f5c842'}`;
      } else if (node.visited) {
        d.classList.add('map-node-visited');
      } else if (node.accessible) {
        d.classList.add('map-node-accessible');
        d.style.boxShadow=`0 0 8px ${NODE_BORDER[node.type]||'#44f'}`;
        if (!combatPeek) d.addEventListener('click', ()=>clickMapNode(col,ni));
      } else {
        d.classList.add('map-node-hidden');
      }
      const isBoss = node.type === 'boss';
      d.textContent = isBoss ? ENEMY_DEFS[mapData.bossId].sprite : (NODE_ICON[node.type]||'?');
      const tooltipKey = isBoss ? 'boss_' + mapData.bossId : node.type;
      const info = NODE_DESC[tooltipKey] || NODE_DESC[node.type];
      if (info) {
        d.addEventListener('mouseenter', e => showMapTooltip(e, tooltipKey));
        d.addEventListener('mouseleave', hideMapTooltip);
        d.addEventListener('mousemove',  e => moveMapTooltip(e));
      }
      nc.appendChild(d);
    });
  });
}

function clickMapNode(col, ni) {
  const node = mapData.nodes[col][ni];
  if (!node || !node.accessible) return;

  // 同じ列の他の選択肢をすべて閉じる
  mapData.nodes[col].forEach(n => { n.accessible = false; });
  node.visited=true;
  mapData.currentCol=col; mapData.currentNodeIdx=ni;

  // 次の列のアクセス可能ノードを開く
  node.connections.forEach(ti => {
    const tn=mapData.nodes[col+1]?.[ti];
    if (tn) tn.accessible=true;
  });

  document.getElementById('map-screen').classList.remove('show');

  // floor設定（startBattleでfloor++されるので combat は col を渡す）
  switch(node.type) {
    case 'combat':
      floor=col; startBattle(buildEncounter(false)); break;
    case 'elite':
      floor=col; startBattle(buildEncounter(true));  break;
    case 'rest':
      floor=col+1; showRestArea(); break;
    case 'shop':
      floor=col+1; showShop(); break;
    case 'treasure':
      floor=col+1; showTreasureRoom(); break;
    case 'event':
      floor=col+1; handleMapEvent(); break;
    case 'boss':
      floor=col; handleBoss(); break;
  }
}

function handleMapEvent() {
  const col = mapData.currentCol;
  if (col === 0) { showNeow(); return; }
  if (col === 5) { showEvent2(); return; }
  log('★ 不思議な場所を通り過ぎた…', 'buff');
  render(); showMapScreen();
}

function showMapTooltip(e, type) {
  const info = NODE_DESC[type];
  if (!info) return;
  // boss_* キーはスプライトを ENEMY_DEFS から取得、それ以外は NODE_ICON
  const icon = type.startsWith('boss_')
    ? ENEMY_DEFS[type.slice(5)].sprite
    : (NODE_ICON[type] || '');
  const tip = document.getElementById('map-floating-tooltip');
  document.getElementById('map-floating-tooltip-name').innerHTML =
    `${icon} ${info.name}`;
  document.getElementById('map-floating-tooltip-desc').innerHTML =
    info.desc.replace(/\n/g, '<br>');
  tip.classList.add('visible');
  moveMapTooltip(e);
}

function moveMapTooltip(e) {
  const tip = document.getElementById('map-floating-tooltip');
  if (!tip.classList.contains('visible')) return;
  const margin = 12;
  let x = e.clientX + margin;
  let y = e.clientY - tip.offsetHeight - margin;
  if (y < 8) y = e.clientY + margin;
  if (x + tip.offsetWidth > window.innerWidth - 8)
    x = e.clientX - tip.offsetWidth - margin;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function hideMapTooltip() {
  document.getElementById('map-floating-tooltip').classList.remove('visible');
}

// ================================================================
