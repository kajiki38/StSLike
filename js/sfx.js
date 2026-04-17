// ================================================================
// SOUND SYSTEM
// ================================================================
const SFX = (() => {
  let _ctx = null;
  let _muted = false;

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.25, freqEnd = null, delay = 0) {
    if (_muted) return;
    try {
      const ac = ctx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      if (freqEnd != null) osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + delay + dur);
      gain.gain.setValueAtTime(0.001, ac.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + dur + 0.05);
    } catch(e) {}
  }

  function noise(dur, vol = 0.15, delay = 0) {
    if (_muted) return;
    try {
      const ac = ctx();
      const len = Math.ceil(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gain = ac.createGain();
      src.connect(gain); gain.connect(ac.destination);
      gain.gain.setValueAtTime(vol, ac.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
      src.start(ac.currentTime + delay);
      src.stop(ac.currentTime + delay + dur + 0.05);
    } catch(e) {}
  }

  return {
    toggle() {
      _muted = !_muted;
      document.getElementById('mute-btn').textContent = _muted ? '🔇' : '🔊';
    },

    // カードプレイ
    playAttack()  { tone(160, 0.06, 'sawtooth', 0.3); noise(0.08, 0.18, 0.03); tone(100, 0.12, 'square', 0.2, 60, 0.05); },
    playDefend()  { tone(500, 0.05, 'sine', 0.2); tone(640, 0.12, 'sine', 0.18, null, 0.04); },
    playSkill()   { tone(380, 0.08, 'triangle', 0.2); tone(480, 0.08, 'triangle', 0.12, null, 0.07); },
    playPower()   { tone(330, 0.1, 'sine', 0.2); tone(415, 0.1, 'sine', 0.18, null, 0.08); tone(523, 0.15, 'sine', 0.2, null, 0.16); },

    // 戦闘
    hit()         { noise(0.05, 0.25); tone(180, 0.1, 'sawtooth', 0.2, 80); },
    playerHurt()  { tone(110, 0.05, 'square', 0.35); tone(80, 0.2, 'square', 0.25, 50, 0.04); noise(0.08, 0.2, 0.02); },
    block()       { tone(600, 0.04, 'sine', 0.2); tone(800, 0.1, 'sine', 0.15, null, 0.03); },
    enemyDie()    { tone(250, 0.05, 'sawtooth', 0.3); tone(180, 0.15, 'sawtooth', 0.25, 60, 0.04); noise(0.12, 0.2, 0.05); },

    // UI
    endTurn()     { tone(450, 0.06, 'triangle', 0.15); tone(360, 0.08, 'triangle', 0.1, null, 0.05); },
    draw()        { tone(900, 0.04, 'sine', 0.08); },
    upgrade()     { [440,554,659,880].forEach((f,i) => tone(f, 0.1, 'sine', 0.2, null, i*0.07)); },
    relic()       { [523,659,784,1047].forEach((f,i) => tone(f, 0.12, 'sine', 0.22, null, i*0.08)); },
    gold()        { tone(1000, 0.05, 'sine', 0.18); tone(1260, 0.08, 'sine', 0.15, null, 0.04); },
    victory()     { [523,659,784,659,784,1047,1319].forEach((f,i) => tone(f, 0.15, 'sine', 0.22, null, i*0.11)); },
    gameOver()    { [350,300,250,180,130].forEach((f,i) => tone(f, 0.22, 'square', 0.2, null, i*0.18)); },
    neow()        { [392,494,587,740,988].forEach((f,i) => tone(f, 0.12, 'sine', 0.2, null, i*0.09)); },
  };
})();

function toggleMute() { SFX.toggle(); }

