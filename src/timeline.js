/* 时间线：裸板 → 16K RAM → 32K RAM → ULA → CPU → 外设 → 上电 → LOAD（46s 循环） */
(function (ZX48) {
  var phases = [
    { id: "pcb", name: "裸板 · ISSUE 3B", dur: 4, dot: "red",
      cam: { theta: -0.55, phi: 1.02, r: 5.4, target: [0, 0.18, 0] }, drift: 0.04 },
    { id: "ram16", name: "16K 内存 · 8 × 4116", dur: 6, dot: "yellow",
      cam: { theta: -0.52, phi: 0.92, r: 2.35, target: [-0.55, 0.06, 0.08] }, drift: 0.02 },
    { id: "ram32", name: "32K 内存 · 8 × 4532", dur: 6, dot: "yellow",
      cam: { theta: -0.34, phi: 0.92, r: 2.35, target: [0.62, 0.06, 0.08] }, drift: 0.02 },
    { id: "ula", name: "定制芯片 · FERRANTI ULA", dur: 6, dot: "green",
      cam: { theta: -0.6, phi: 0.95, r: 2.6, target: [0.05, 0.1, -0.25] }, drift: 0.018 },
    { id: "cpu", name: "核心芯片 · Z80A + 16K ROM", dur: 5, dot: "cyan",
      cam: { theta: -0.78, phi: 0.92, r: 2.5, target: [0.28, 0.08, -0.35] }, drift: 0.015 },
    { id: "conn", name: "外设接入 · RF · 磁带 · 键盘 · 电源", dur: 6, dot: "cyan",
      cam: { theta: -0.5, phi: 0.98, r: 4.0, target: [0.1, 0.15, -0.05] }, drift: 0.022 },
    { id: "boot", name: "上电 · © 1982", dur: 6, dot: "red",
      cam: { theta: -0.62, phi: 1.0, r: 3.4, target: [-0.5, 0.4, -0.85] }, drift: 0.015 },
    { id: "load", name: "磁带加载 · LOAD 导频音", dur: 7, dot: "green",
      cam: { theta: -0.5, phi: 0.98, r: 2.75, target: [-0.52, 0.42, -0.8] }, drift: 0.012 }
  ];

  /* 每阶段固定标签（at = 进入阶段后延时出现秒数）——text 中文主位、sub 英文副位全大写 */
  var PINNED = {
    pcb: { at: 1.9, items: function () {
      return [{ id: "p-edge", obj: ZX48.Scene3D.edgeStrip, text: "边缘连接器", sub: "2 × 28 · GOLD FINGERS" }];
    } },
    ram16: { at: 0.5, items: function () {
      return [{ id: "p-r16", obj: ZX48.Parts.group("r16-0"), text: "内存颗粒 4116", sub: "16K × 1 DRAM · +5V / +12V / −5V" }];
    } },
    ram32: { at: 0.5, items: function () {
      return [{ id: "p-r32", obj: ZX48.Parts.group("r32-0"), text: "内存颗粒 4532", sub: "64K × 1 DIE · 32K USED · $8000-$FFFF" }];
    } },
    ula: { at: 0.5, items: function () {
      return [
        { id: "p-ula", obj: ZX48.Parts.group("ula"), text: "ULA 定制芯片", sub: "FERRANTI 6C001E-5 · VIDEO READS MAIN DRAM", tone: "white" }
      ];
    } },
    cpu: { at: 0.5, items: function () {
      return [
        { id: "p-z80", obj: ZX48.Parts.group("z80"), text: "中央处理器 Z80A", sub: "3.5 MHZ" },
        { id: "p-rom", obj: ZX48.Parts.group("rom"), text: "系统 ROM 16K", sub: "48K BASIC", tone: "white" }
      ];
    } },
    conn: { at: 0.4, items: function () {
      return [
        { id: "p-rf", obj: ZX48.Parts.group("rf"), text: "射频调制器", sub: "RF MODULATOR · UHF" },
        { id: "p-ear", obj: ZX48.Parts.group("ear"), text: "EAR 磁带输入", sub: "TAPE IN" },
        { id: "p-mic", obj: ZX48.Parts.group("mic"), text: "MIC 磁带输出", sub: "TAPE OUT", tone: "white" },
        { id: "p-mem", obj: ZX48.Parts.group("mem0"), text: "膜键盘排线", sub: "MEMBRANE · 2 × 8-WAY" },
        { id: "p-psu", obj: ZX48.Parts.group("reg5"), text: "稳压器 7805", sub: "+5V", tone: "white" }
      ];
    } },
    boot: { at: 2.1, items: function () {
      return [{ id: "p-scr", obj: ZX48.Scene3D.screenGroup, text: "© 1982 SINCLAIR RESEARCH", sub: "256 × 192 · 50 HZ" }];
    } },
    load: { at: 0.4, items: function () {
      return [{ id: "p-scr", obj: ZX48.Scene3D.screenGroup, text: "LOAD 条纹屏", sub: "PILOT TONE · RED / CYAN STRIPES · 50 HZ", tone: "white" }];
    } }
  };

  var idx = -1, pt = 0, paused = false;
  var st = {};
  var screenCur = "off";
  var pinsAt = -1, pinsItems = null, pinsShown = false;
  var dom = {};

  function resetState() {
    st = {
      time: 0, power: false, powerT: 0, powerOnAt: -1,
      mode: "BUILD",
      n16: 0, n32: 0, romIn: false, xtalIn: false, ramK: 0,
      mem: { rom: 0, disp: 0, b1: 0, b2: 0, b3: 0 },
      rails: { v9: 0, v5: 0, v12: 0, vn5: 0 }, watts: 0,
      frames: 0, scan: 0,
      regs: { pc: "----", sp: "----", af: "----", bc: "----", de: "----", hl: "----" },
      regT: 0, regSeed: 7, loadBytes: 0,
      tape: "idle", seated: 0
    };
  }

  /* 状态卡模式显示：内部状态值保持英文不变，显示为主位中文 + 副位代号 */
  var MODE_TEXT = { BUILD: "装配 BUILD", BOOT: "开机 BOOT", LOADING: "加载 LOADING" };

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    dom = {
      mode: $("st-mode"), clock: $("st-clock"), ram: $("st-ram"),
      parts: $("st-parts"), pill: $("phase-text"), dot: $("phase-dot")
    };
  }

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function hex4(v) {
    v = Math.max(0, Math.min(0xFFFF, Math.floor(v)));
    var s = Math.floor(v).toString(16).toUpperCase();
    while (s.length < 4) s = "0" + s;
    return s;
  }

  function rnd16() {
    st.regSeed = (st.regSeed * 16807) % 2147483647;
    return st.regSeed / 2147483647;
  }

  /* Z80 寄存器：每 0.5s 微跳（boot 后 RUN，load 时 PC 停在 LOAD 例程） */
  function genRegs() {
    var r = st.regs;
    if (st.mode === "LOADING") {
      st.loadBytes = Math.min(6912, st.loadBytes + 430 + rnd16() * 120);
      r.pc = "0556";
      r.sp = "FF58";
      r.bc = hex4(6912 - st.loadBytes);
      r.de = hex4(0x4000 + st.loadBytes);
      r.af = hex4(rnd16() * 0x10000);
      r.hl = hex4(0x5C00 + rnd16() * 0x200);
    } else {
      r.pc = hex4(0x12A0 + rnd16() * 0x260);
      r.sp = hex4(0xFF58 - rnd16() * 0x40);
      r.bc = hex4(rnd16() * 0x10000);
      r.de = hex4(rnd16() * 0x10000);
      r.af = hex4(rnd16() * 0x10000);
      r.hl = hex4(0x5C00 + rnd16() * 0x300);
    }
  }

  /* 屏幕模式统一入口：off（未上电）/ boot / load */
  function applyScreen() {
    var want = "off";
    if (idx === 6 && pt > 1.8) want = "boot";
    if (idx === 7) want = "load";
    if (screenCur !== want) {
      screenCur = want;
      ZX48.Scene3D.setScreen(want);
    }
  }

  function enterPhase(i) {
    idx = i; pt = 0;
    var ph = phases[i];
    st.mode = i <= 5 ? "BUILD" : (i === 6 ? "BOOT" : "LOADING");
    if (i === 0) ZX48.Scene3D.flyBoardIn();
    ZX48.Parts.beginPhase(i);
    var pin = PINNED[ph.id];
    pinsAt = pin ? pin.at : -1;
    pinsItems = pin ? pin.items : null;
    pinsShown = false;
    ZX48.Labels.setPinned([]);   // 清掉上一阶段固定标签，按 pinsAt 延时再挂
    applyScreen();
  }

  function restartCycle() {
    ZX48.Parts.reset();
    ZX48.Labels.clearAnnounce();
    ZX48.Labels.setPinned([]);
    resetState();
    screenCur = "pending";
    enterPhase(0);
  }

  function update(dt) {
    if (paused) return;
    dt = Math.min(dt, 0.05);
    st.time += dt;
    pt += dt;

    var ph = phases[idx];
    if (pt >= ph.dur) {
      if (idx >= phases.length - 1) restartCycle();
      else enterPhase(idx + 1);
      ph = phases[idx];
    }

    /* ---- 相机运镜 ---- */
    ZX48.orbitCtl.autoDrift = ph.drift;
    ZX48.orbitCtl.flyTo(ph.cam);

    /* ---- 零件落板与显存填充 ---- */
    ZX48.Parts.update(pt);
    st.seated = ZX48.Parts.seatedCount;
    st.n16 = ZX48.Parts.landedKind("4116");
    st.n32 = ZX48.Parts.landedKind("4532");
    st.romIn = ZX48.Parts.landedKind("23128") > 0;
    st.xtalIn = ZX48.Parts.landedKind("XTAL") > 0;
    st.ramK = st.n16 * 2 + st.n32 * 4;
    st.mem.disp = st.mem.b1 = st.n16 / 8;
    st.mem.b2 = Math.min(1, st.n32 / 4);
    st.mem.b3 = Math.max(0, (st.n32 - 4) / 4);
    st.mem.rom = st.romIn ? 1 : 0;

    /* ---- 固定标签延时出现 ---- */
    if (!pinsShown && pinsAt >= 0 && pt >= pinsAt) {
      pinsShown = true;
      ZX48.Labels.setPinned(pinsItems());
    }

    /* ---- boot：电源线落位 → 上电 → 屏幕亮起 ---- */
    if (idx === 6 && !st.power && pt > 1.55) {
      st.power = true;
      st.powerOnAt = st.time;
    }
    applyScreen();

    /* ---- 磁带状态：load 阶段 pilot tone + 周期性数据突发（同步 LOAD 边框条纹颜色） ---- */
    st.tape = idx === 7 ? ((st.time % 5) < 1.4 ? "data" : "pilot") : "idle";
    ZX48.Scene3D.setLoadTape(st.tape);

    /* ---- 电源轨斜坡 ---- */
    if (st.power) {
      st.powerT = Math.min(1, st.powerT + dt / 1.4);
      var e = smooth(st.powerT);
      var fl = Math.sin(st.time * 7.3) * 0.03 + Math.sin(st.time * 13.7) * 0.02;
      st.rails.v9 = 9.05 * e + fl * 2;
      st.rails.v5 = 5.0 * smooth(st.powerT * 1.3 - 0.05);
      st.rails.v12 = 11.96 * smooth(st.powerT * 1.45 - 0.1);
      st.rails.vn5 = -4.96 * smooth(st.powerT * 1.6 - 0.16);
      st.watts = 3.4 * e + fl * 0.4;
      st.frames = Math.max(0, Math.floor((st.time - st.powerOnAt) * 50));
    } else {
      st.watts = 0;
      st.frames = 0;
    }
    st.scan = ((st.time * 50) % 312) / 312;

    /* ---- Z80 寄存器每 0.5s 微跳 ---- */
    st.regT += dt;
    if (st.power && st.regT >= 0.5) {
      st.regT = 0;
      genRegs();
    }

    /* ---- 状态卡 / 阶段胶囊 ---- */
    dom.mode.textContent = MODE_TEXT[st.mode] || st.mode;
    dom.mode.className = "mode" + (st.mode === "LOADING" ? " loading" : (st.mode === "BOOT" ? " boot" : ""));
    dom.clock.textContent = st.xtalIn ? "3.5 MHZ" : "—";
    dom.ram.textContent = st.ramK + "K";
    dom.parts.textContent = st.seated + " / 30";
    dom.pill.textContent = ph.name;
    dom.dot.className = ph.dot;

    /* ---- 仪表盘 ---- */
    ZX48.Dashboard.update(st, dt);
  }

  ZX48.Timeline = {
    init: function () {
      resetState();
      cacheDom();
    },
    start: function () {
      enterPhase(0);
    },
    restart: restartCycle,
    /* 跳转到指定阶段（键盘 1-8 / 后台标签页验收） */
    seek: function (id) {
      var i = -1;
      for (var k = 0; k < phases.length; k++) if (phases[k].id === id) i = k;
      if (i < 0) return;
      ZX48.Parts.reset();
      ZX48.Labels.clearAnnounce();
      resetState();
      if (i > 0) ZX48.Scene3D.sealBoard(); else ZX48.Scene3D.resetBoard();
      ZX48.Parts.sealThrough(i - 1);
      if (i > 6) {   // load：电源已接通、寄存器就绪
        st.power = true;
        st.powerT = 1;
        st.powerOnAt = 0;
        genRegs();
      }
      enterPhase(i);
    },
    update: update,
    togglePause: function () { paused = !paused; return paused; },
    get paused() { return paused; },
    get phaseId() { return phases[idx] ? phases[idx].id : ""; }
  };
})(window.ZX48 = window.ZX48 || {});
