/* 30 个零件建模 + 分阶段飞行装配控制器（按时间线阶段逐批落板） */
(function (ZX48) {
  var list = [];           // {id,name,sub,kind,phase,delay,group,target,yaw,start,mid,line,...}
  var flyingSet = [];      // 当前阶段正在飞行的零件
  var root = null;
  var flying = false;
  var seatedCount = 0;

  /* ---- 芯片顶面贴图（同型号共享一张） ---- */
  var tex4116, tex4532, texULA, texZ80, texROM, tex7805, tex78M12, texRF;

  function makeChipTextures() {
    var T = ZX48.Textures;
    tex4116 = T.chipTop(["4116", "16K × 1"]);
    /* TMS4532 是 64K×1 颗粒，板上当 32K×1 用（关闭高半区） */
    tex4532 = T.chipTop(["4532", "64K × 1 · 32K USED"]);
    /* Issue 3B ULA：40 脚平封 DIP，丝印 6C001E-x */
    texULA = T.chipTop(["FERRANTI", "6C001E-5"]);
    texZ80 = T.chipTop(["Z80A-CPU", "DIP-40"]);
    /* 48K ROM 为 23128 类 16K×8（28 脚），不是 8K×8 的 2364 */
    texROM = T.chipTop(["23128", "48K BASIC"]);
    tex7805 = T.chipTop(["L7805", "+5V"]);
    tex78M12 = T.chipTop(["78M12", "+12V"]);
    texRF = T.chipTop(["TV MODULATOR", "UHF OUT"], "#DDDCD6", "#2A2C2E");
  }

  /* ============ 零件建模 ============ */
  function mesh(geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    if (x !== undefined) m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  /* 直插 DIP 芯片：黑色本体 + 顶面印字 + 定位缺口 + 两排引脚 */
  function dip(len, wid, pins, tex, h) {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    h = h || 0.048;
    var topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.52 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(len, h, wid),
      [M.chipSide, M.chipSide, topMat, M.chipSide, M.chipSide, M.chipSide]);
    body.position.y = 0.012 + h / 2;
    body.castShadow = true;
    g.add(body);
    var notch = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.014, 10), M.dark, -len / 2 + 0.024, h + 0.02, 0);
    notch.rotation.x = Math.PI / 2;
    g.add(notch);
    var n = pins / 2, pitch = (len - 0.05) / n;
    for (var i = 0; i < n; i++) {
      var px = -len / 2 + 0.025 + pitch * (i + 0.5);
      for (var s = -1; s <= 1; s += 2) {
        g.add(mesh(new THREE.BoxGeometry(0.015, 0.012, wid * 0.24), M.pin, px, 0.005, s * (wid / 2 + wid * 0.1)));
      }
    }
    return g;
  }

  /* TO-220 三端稳压：直插立式 + 金属散热片 */
  function to220(big, tex) {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    var w = big ? 0.1 : 0.075, hh = big ? 0.12 : 0.095;
    var front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.042),
      [M.chipSide, M.chipSide, M.chipSide, M.chipSide, front, M.chipSide]);
    body.position.set(0, 0.055 + hh / 2, 0);
    body.castShadow = true;
    g.add(body);
    g.add(mesh(new THREE.BoxGeometry(w, 0.04, 0.014), M.alu, 0, 0.055 + hh + 0.008, -0.02));
    for (var i = -1; i <= 1; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.012, 0.055, 0.012), M.pin, i * w * 0.28, 0.028, 0));
    }
    return g;
  }

  function crystal() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    var body = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.15, 14), M.silver, 0, 0.032, 0);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.024, 0.02), M.pin, -0.055, 0.012, 0));
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.024, 0.02), M.pin, 0.055, 0.012, 0));
    return g;
  }

  /* 9V 滤波电解电容 ×2 */
  function caps() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    for (var i = 0; i < 2; i++) {
      var x = -0.062 + i * 0.124;
      g.add(mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.14, 16), M.navy, x, 0.07, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 16), M.pin, x, 0.146, 0));
      g.add(mesh(new THREE.BoxGeometry(0.014, 0.09, 0.02), M.white, x - 0.03, 0.075, 0.04));
    }
    return g;
  }

  /* −5V 整流二极管 ×2（4116 第三轨） */
  function diodes() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    for (var i = 0; i < 2; i++) {
      var x = -0.05 + i * 0.1;
      var d = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.085, 10), M.plastic, x, 0.022, 0);
      d.rotation.z = Math.PI / 2;
      g.add(d);
      var band = mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.012, 10), M.pin, x + 0.03, 0.022, 0);
      band.rotation.z = Math.PI / 2;
      g.add(band);
    }
    return g;
  }

  /* RF 调制器：银色金属盒 + 顶面标签 + 同轴尾 */
  function rfBox() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    var label = new THREE.MeshStandardMaterial({ map: texRF, roughness: 0.6 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.3),
      [M.silver, M.silver, label, M.silver, M.silver, M.silver]);
    body.position.y = 0.09;
    body.castShadow = true;
    g.add(body);
    var coax = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 10), M.silver, 0, 0.09, -0.18);
    coax.rotation.x = Math.PI / 2;
    g.add(coax);
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.02, 0.3), M.alu, -0.215, 0.02, 0));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.02, 0.3), M.alu, 0.215, 0.02, 0));
    return g;
  }

  /* 3.5mm 磁带插座：EAR / MIC 两颗独立插座，从左缘伸出 */
  function tapeJack() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.09, 0.14), M.plastic, 0.02, 0.045, 0));
    var sock = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.1, 12), M.dark, -0.06, 0.05, 0);
    sock.rotation.z = Math.PI / 2;
    g.add(sock);
    var nut = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.018, 6), M.alu, -0.098, 0.05, 0);
    nut.rotation.z = Math.PI / 2;
    g.add(nut);
    return g;
  }

  /* 膜键盘排线：真实膜是两条 8 路插头，扁平灰带从板前缘伸到台面 */
  function membrane() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    var rib = mesh(new THREE.BoxGeometry(0.14, 0.008, 0.62), M.ribbon, 0, 0.043, 0.08);
    rib.rotation.x = 0.075;
    g.add(rib);
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.034, 0.12), M.plastic, 0, 0.06, -0.22));
    return g;
  }

  /* 9V 电源线：橡套弯管 + 桶形插头（boot 阶段飞入接上） */
  function cord() {
    var M = ZX48.Scene3D.M;
    var g = new THREE.Group();
    var plug = mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.13, 14), M.plastic, 0, 0.04, 0.02);
    plug.rotation.x = Math.PI / 2 - 0.12;
    g.add(plug);
    var tip = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), M.pin, 0, 0.075, 0.09);
    tip.rotation.x = Math.PI / 2 - 0.12;
    g.add(tip);
    var pts = [
      new THREE.Vector3(0, 0.03, -0.05),
      new THREE.Vector3(-0.1, 0.022, -0.16),
      new THREE.Vector3(-0.45, 0.018, -0.3),
      new THREE.Vector3(-0.95, 0.02, -0.4),
      new THREE.Vector3(-1.5, 0.018, -0.28)
    ];
    var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 8, false), M.rubber);
    tube.castShadow = true;
    g.add(tube);
    return g;
  }

  /* ============ 零件清单（phase = 时间线阶段下标，delay = 阶段内起飞延时） ============ */
  function build() {
    var defs = [];
    var i, a;

    /* 阶段 2：8 × 4116（16K DRAM，左→右逐颗落板） */
    for (i = 0; i < 8; i++) {
      (function (n) {
        defs.push({
          id: "r16-" + n, name: "内存颗粒 4116", sub: "16K × 1 · 3 RAILS", kind: "4116",
          phase: 1, delay: 0.1 + n * 0.42,
          pos: [-1.1 + n * 0.21, 0.05], landY: 0.05, yaw: 0, anchorY: 0.1,
          build: function () { return dip(0.2, 0.075, 16, tex4116); }
        });
      })(i);
    }
    /* 阶段 3：8 × 4532（32K DRAM：64K×1 颗粒关半区使用） */
    for (a = 0; a < 8; a++) {
      (function (n) {
        defs.push({
          id: "r32-" + n, name: "内存颗粒 4532", sub: "64K × 1 · 32K USED", kind: "4532",
          phase: 2, delay: 0.1 + n * 0.42,
          pos: [-1.1 + n * 0.21, 0.33], landY: 0.05, yaw: 0, anchorY: 0.1,
          build: function () { return dip(0.2, 0.075, 16, tex4532); }
        });
      })(a);
    }
    /* 阶段 4：ULA（40 脚平封 DIP，显示文件直接读主 DRAM——板上没有独立显存 SRAM） */
    defs.push({
      id: "ula", name: "ULA 定制芯片", sub: "FERRANTI · 6C001E-5", kind: null,
      phase: 3, delay: 0.15,
      pos: [0.0, -0.5], landY: 0.05, yaw: 0, anchorY: 0.12,
      build: function () { return dip(0.42, 0.155, 40, texULA, 0.042); }
    });
    /* 阶段 5：Z80A + 23128 ROM + 晶振 */
    defs.push({
      id: "z80", name: "中央处理器 Z80A", sub: "DIP-40 · 3.5 MHZ", kind: null,
      phase: 4, delay: 0.2,
      pos: [0.32, -0.38], landY: 0.05, yaw: Math.PI / 2, anchorY: 0.12,
      build: function () { return dip(0.52, 0.15, 40, texZ80); }
    });
    defs.push({
      id: "rom", name: "系统 ROM 23128", sub: "16K × 8 · 48K BASIC", kind: "23128",
      phase: 4, delay: 1.6,
      pos: [-0.34, -0.55], landY: 0.05, yaw: 0, anchorY: 0.1,
      build: function () { return dip(0.37, 0.15, 28, texROM); }
    });
    defs.push({
      id: "xtal", name: "晶振", sub: "14 MHZ · ÷4 → 3.5 MHZ", kind: "XTAL",
      phase: 4, delay: 3.0,
      pos: [0.62, -0.55], landY: 0.05, yaw: 0.3, anchorY: 0.08,
      build: crystal
    });
    /* 阶段 6：RF 盒 / EAR+MIC 插座 / 键盘排线 / 电源区 */
    defs.push({
      id: "rf", name: "射频调制器", sub: "UHF TV OUT", kind: null,
      phase: 5, delay: 0.1,
      pos: [0.95, -0.6], landY: 0.05, yaw: 0, anchorY: 0.28,
      build: rfBox
    });
    defs.push({
      id: "ear", name: "EAR 插座", sub: "3.5MM · TAPE INPUT", kind: null,
      phase: 5, delay: 0.52,
      pos: [-1.16, 0.30], landY: 0.05, yaw: 0, anchorY: 0.12,
      build: tapeJack
    });
    defs.push({
      id: "mic", name: "MIC 插座", sub: "3.5MM · TAPE OUTPUT", kind: null,
      phase: 5, delay: 0.78,
      pos: [-1.16, 0.02], landY: 0.05, yaw: 0, anchorY: 0.12,
      build: tapeJack
    });
    defs.push({
      id: "mem0", name: "膜键盘排线 A", sub: "8-WAY KEYBOARD HEADER", kind: null,
      phase: 5, delay: 0.94,
      pos: [0.70, 1.08], landY: 0.005, yaw: 0, anchorY: 0.12,
      build: membrane
    });
    defs.push({
      id: "mem1", name: "膜键盘排线 B", sub: "8-WAY KEYBOARD HEADER", kind: null,
      phase: 5, delay: 1.16,
      pos: [0.92, 1.08], landY: 0.005, yaw: 0, anchorY: 0.12,
      build: membrane
    });
    defs.push({
      id: "reg5", name: "稳压器 7805", sub: "+5V REGULATOR", kind: null,
      phase: 5, delay: 1.36,
      pos: [-0.78, -0.66], landY: 0.05, yaw: 0, anchorY: 0.24,
      build: function () { return to220(true, tex7805); }
    });
    defs.push({
      id: "reg12", name: "稳压器 78M12", sub: "+12V FOR 4116", kind: null,
      phase: 5, delay: 1.78,
      pos: [-0.55, -0.66], landY: 0.05, yaw: 0, anchorY: 0.22,
      build: function () { return to220(false, tex78M12); }
    });
    defs.push({
      id: "caps", name: "滤波电容", sub: "2200 µF × 2", kind: null,
      phase: 5, delay: 2.2,
      pos: [-0.88, -0.36], landY: 0.05, yaw: 0, anchorY: 0.18,
      build: caps
    });
    defs.push({
      id: "diodes", name: "-5V 整流二极管", sub: "4116 THIRD RAIL", kind: null,
      phase: 5, delay: 2.62,
      pos: [-0.64, -0.38], landY: 0.05, yaw: 0, anchorY: 0.08,
      build: diodes
    });
    /* 阶段 7：电源线接上 */
    defs.push({
      id: "cord", name: "电源线", sub: "9V DC · CENTER +", kind: null,
      phase: 6, delay: 0.25,
      pos: [-1.0, -0.9], landY: 0.02, yaw: 0, anchorY: 0.14,
      build: cord
    });

    return defs;
  }

  /* ============ 飞行控制 ============ */
  function bez(p0, p1, p2, t) {
    var a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
    return new THREE.Vector3(
      a * p0.x + b * p1.x + c * p2.x,
      a * p0.y + b * p1.y + c * p2.y,
      a * p0.z + b * p1.z + c * p2.z
    );
  }

  function init() {
    makeChipTextures();
    root = new THREE.Group();
    ZX48.Scene3D.scene.add(root);
    list = build();
    list.forEach(function (p, i) {
      p.duration = 0.95;
      var g = p.build();
      g.position.set(p.pos[0], p.landY, p.pos[1]);
      g.rotation.y = p.yaw;
      g.userData.tagAnchor = new THREE.Vector3(0, p.anchorY, 0);
      root.add(g);
      p.group = g;
      p.target = g.position.clone();
      p.start = new THREE.Vector3(-4.6 - (i % 3) * 0.5, 0.55 + (i % 5) * 0.34, -0.5 + ((i * 37) % 13) / 9);
      p.mid = new THREE.Vector3(p.target.x * 0.45, 1.7 + (i % 3) * 0.32, p.target.z * 0.5 - 0.2);
      p.landed = false;
      p.tagShown = false;
      p.line = null;
      p.lineUntil = Infinity;
      g.visible = false;
    });
  }

  /* 某阶段起飞：重置该阶段零件并生成虚线轨迹 */
  function beginPhase(phaseIdx) {
    flying = true;
    flyingSet = list.filter(function (p) { return p.phase === phaseIdx; });
    flyingSet.forEach(function (p) {
      p.landed = false;
      p.tagShown = false;
      p.group.visible = false;
      p.group.position.copy(p.target);
      p.group.rotation.y = p.yaw;
      removeLine(p);
      var pts = [];
      for (var i = 0; i <= 30; i++) pts.push(bez(p.start, p.mid, p.target, i / 30));
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: 0x35c6dd, dashSize: 0.1, gapSize: 0.07, transparent: true, opacity: 0.8
      }));
      line.computeLineDistances();
      ZX48.Scene3D.scene.add(line);
      p.line = line;
      p.lineUntil = Infinity;
    });
  }

  function removeLine(p) {
    if (p.line) {
      ZX48.Scene3D.scene.remove(p.line);
      p.line.geometry.dispose();
      p.line.material.dispose();
      p.line = null;
    }
  }

  function recount() {
    seatedCount = 0;
    list.forEach(function (p) { if (p.landed) seatedCount++; });
  }

  function update(pt) {
    if (!flying) return;
    flyingSet.forEach(function (p) {
      var t = (pt - p.delay) / p.duration;
      if (t <= 0 || p.landed) {
        fadeLine(p, pt);
        return;
      }
      if (!p.tagShown) {
        p.tagShown = true;
        p.group.visible = true;
        ZX48.Labels.announce(p.id, p.group, p.name, p.sub, performance.now(), 2600);
      }
      var c = Math.min(t, 1);
      var tt = c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
      p.group.position.copy(bez(p.start, p.mid, p.target, tt));
      p.group.rotation.y = p.yaw + (1 - tt) * 1.4;
      if (t >= 1) {
        p.landed = true;
        recount();
        p.lineUntil = pt + 0.55;
      }
      fadeLine(p, pt);
    });
  }

  function fadeLine(p, pt) {
    if (!p.line) return;
    if (pt > p.lineUntil) {
      removeLine(p);
    } else if (p.landed) {
      p.line.material.opacity = Math.max(0, (p.lineUntil - pt) / 0.55) * 0.8;
    }
  }

  /* 调试/跳转用：phase <= idx 的零件直接落位 */
  function sealThrough(idx) {
    list.forEach(function (p) {
      if (p.phase <= idx && !p.landed) {
        p.landed = true;
        p.tagShown = true;
        p.group.visible = true;
        p.group.position.copy(p.target);
        p.group.rotation.y = p.yaw;
        removeLine(p);
      }
    });
    recount();
  }

  function reset() {
    flying = false;
    flyingSet = [];
    list.forEach(function (p) {
      p.landed = false;
      p.tagShown = false;
      p.group.visible = false;
      p.group.position.copy(p.target);
      p.group.rotation.y = p.yaw;
      removeLine(p);
    });
    seatedCount = 0;
  }

  function groupById(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].group;
    return null;
  }

  function landedKind(kind) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].kind === kind && list[i].landed) n++;
    }
    return n;
  }

  ZX48.Parts = {
    init: init,
    beginPhase: beginPhase,
    update: update,
    reset: reset,
    sealThrough: sealThrough,
    group: groupById,
    landedKind: landedKind,
    list: function () { return list; },
    get seatedCount() { return seatedCount; }
  };
})(window.ZX48 = window.ZX48 || {});
