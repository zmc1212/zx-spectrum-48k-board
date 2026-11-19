/* 底部五仪表盘：内存地图 · Z80 寄存器 · ULA 帧计数/扫描 · 磁带波形 · 电源轨 */
(function (ZX48) {
  var ctxMem, memW, memH;
  var ctxUla, ulaW, ulaH;
  var ctxTape, tapeW, tapeH;
  var tapeScroll = 0;

  function mkCanvas(id, h) {
    var c = document.getElementById(id);
    var w = c.clientWidth || 200;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    c.style.height = h + "px";
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx: ctx, w: w, h: h };
  }

  function buildDOM() {
    var dash = document.getElementById("dash");
    dash.innerHTML =
      '<section class="panel"><header><i class="dot green"></i><b>内存地图</b><span class="meta">64K MAP · $0000-$FFFF</span></header>' +
      '<div class="body"><canvas id="c-mem"></canvas>' +
      '<div class="axis"><span>$0000</span><span>$4000</span><span>$8000</span><span>$C000</span><span>$FFFF</span></div>' +
      '<div class="legend"><span><i style="background:#3EB435"></i>ROM 16K</span>' +
      '<span><i style="background:#22B0C8"></i>显示文件 6.7K</span>' +
      '<span><i style="background:#4169D8"></i>内存区块</span>' +
      '<span id="mem-seat" class="seat">0 / 30 已落板</span></div>' +
      '</div></section>' +

      '<section class="panel"><header><i class="dot red"></i><b>寄存器</b><span class="meta">Z80A · 0.5S TICK</span></header>' +
      '<div class="body"><div class="regs">' +
      '<div class="reg"><span>PC</span><b id="rg-pc">----</b></div>' +
      '<div class="reg"><span>SP</span><b id="rg-sp">----</b></div>' +
      '<div class="reg"><span>AF</span><b id="rg-af">----</b></div>' +
      '<div class="reg"><span>BC</span><b id="rg-bc">----</b></div>' +
      '<div class="reg"><span>DE</span><b id="rg-de">----</b></div>' +
      '<div class="reg"><span>HL</span><b id="rg-hl">----</b></div>' +
      '</div><div class="panel-foot"><span class="chip" id="rg-clk">时钟 3.5 MHZ</span><span id="rg-note">停机 HALT</span></div>' +
      '</div></section>' +

      '<section class="panel"><header><i class="dot cyan"></i><b>帧计数</b><span class="meta">ULA · 50 HZ</span></header>' +
      '<div class="body"><div class="ula-row"><div class="ula-count" id="ula-frames">00000</div>' +
      '<div class="ula-right"><canvas id="c-ula"></canvas>' +
      '<div class="axis"><span>行 0</span><span>312</span></div></div></div>' +
      '</div></section>' +

      '<section class="panel"><header><i class="dot yellow"></i><b>磁带</b><span class="meta">EAR · 3.5MM</span></header>' +
      '<div class="body"><canvas id="c-tape"></canvas>' +
      '<div class="panel-foot"><span class="chip" id="tape-chip">空闲 IDLE</span><span id="tape-note">EAR → ULA · RC BIAS</span></div>' +
      '</div></section>' +

      '<section class="panel"><header><i class="dot blue"></i><b>电源轨</b><span class="meta">9V DC IN</span></header>' +
      '<div class="body"><div id="rail-rows"></div>' +
      '<div class="panel-foot"><span class="chip" id="rail-note">4116 · 三路供电</span><span class="v" id="rail-w">0.0 <small>W</small></span></div>' +
      '</div></section>';

    /* 电源轨 4 行 */
    var rows = document.getElementById("rail-rows");
    ["9V IN", "+5V", "+12V", "-5V"].forEach(function (n, i) {
      var row = document.createElement("div");
      row.className = "rail-row";
      row.innerHTML = '<span class="name">' + n + '</span><span class="bar"><i id="rb-' + i + '"></i></span><span class="val" id="rv-' + i + '">0.00 V</span>';
      rows.appendChild(row);
    });

    var mem = mkCanvas("c-mem", 54); ctxMem = mem.ctx; memW = mem.w; memH = mem.h;
    var ula = mkCanvas("c-ula", 44); ctxUla = ula.ctx; ulaW = ula.w; ulaH = ula.h;
    var tape = mkCanvas("c-tape", 54); ctxTape = tape.ctx; tapeW = tape.w; tapeH = tape.h;
  }

  /* ---- ① 内存地图 ---- */
  var SEGS = [
    { a: 0x0000, b: 0x4000, col: "#3EB435" },   // ROM 16K
    { a: 0x4000, b: 0x5B00, col: "#22B0C8" },   // 显示文件 6.7K
    { a: 0x5B00, b: 0x8000, col: "#4169D8" },   // bank 1
    { a: 0x8000, b: 0xC000, col: "#4169D8" },   // bank 2
    { a: 0xC000, b: 0x10000, col: "#4169D8" }   // bank 3
  ];

  function drawMem(st) {
    var ctx = ctxMem, W = memW, H = memH;
    ctx.fillStyle = "#141618";
    ctx.fillRect(0, 0, W, H);
    var fills = [st.mem.rom, st.mem.disp, st.mem.b1, st.mem.b2, st.mem.b3];
    var i, s;
    for (i = 0; i < SEGS.length; i++) {
      s = SEGS[i];
      var x0 = s.a / 0x10000 * W, x1 = s.b / 0x10000 * W;
      ctx.fillStyle = "rgba(232,232,232,0.07)";
      ctx.fillRect(x0 + 1, 4, x1 - x0 - 2, H - 20);
      var f = Math.max(0, Math.min(1, fills[i]));
      if (f > 0) {
        ctx.fillStyle = s.col;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x0 + 1, 4, (x1 - x0 - 2) * f, H - 20);
        ctx.globalAlpha = 1;
      }
    }
    ctx.strokeStyle = "rgba(43,45,49,0.9)";
    ctx.lineWidth = 1;
    [0x4000, 0x5B00, 0x8000, 0xC000].forEach(function (a) {
      var x = Math.round(a / 0x10000 * W);
      ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 16); ctx.stroke();
    });
    ctx.fillStyle = "rgba(232,232,232,0.6)";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ROM", 3, H - 6);
    ctx.fillText("DISP", Math.floor(0x4000 / 0x10000 * W) + 3, H - 6);
    ctx.fillText("B1", Math.floor(0x5B00 / 0x10000 * W) + 3, H - 6);
    ctx.fillText("B2", Math.floor(0x8000 / 0x10000 * W) + 3, H - 6);
    ctx.fillText("B3", Math.floor(0xC000 / 0x10000 * W) + 3, H - 6);
  }

  /* ---- ② Z80 寄存器 ---- */
  function drawRegs(st) {
    var r = st.regs;
    document.getElementById("rg-pc").textContent = r.pc;
    document.getElementById("rg-sp").textContent = r.sp;
    document.getElementById("rg-af").textContent = r.af;
    document.getElementById("rg-bc").textContent = r.bc;
    document.getElementById("rg-de").textContent = r.de;
    document.getElementById("rg-hl").textContent = r.hl;
    document.getElementById("rg-clk").className = "chip" + (st.xtalIn ? " on" : "");
    document.getElementById("rg-note").textContent =
      !st.power ? "停机 HALT" : (st.mode === "LOADING" ? "读带 READING" : "运行 RUN");
  }

  /* ---- ③ ULA 帧计数 + 50Hz 扫描条 ---- */
  function drawUla(st) {
    var ctx = ctxUla, W = ulaW, H = ulaH;
    ctx.fillStyle = "#141618";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(232,232,232,0.08)";
    ctx.lineWidth = 1;
    for (var i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, H * i / 6); ctx.lineTo(W, H * i / 6); ctx.stroke();
    }
    if (st.power) {
      var x = st.scan * W;
      var grd = ctx.createLinearGradient(x - 26, 0, x, 0);
      grd.addColorStop(0, "rgba(34,176,200,0)");
      grd.addColorStop(1, "rgba(34,176,200,0.4)");
      ctx.fillStyle = grd;
      ctx.fillRect(x - 26, 0, 26, H);
      ctx.fillStyle = "#22B0C8";
      ctx.fillRect(x - 1.5, 0, 3, H);
    }
    document.getElementById("ula-frames").textContent =
      ("0000" + Math.floor(st.frames)).slice(-5);
  }

  /* ---- ④ 磁带音频波形（boot 静止 / load pilot tone 条纹） ---- */
  var TAPE_TEXT = { idle: "空闲 IDLE", pilot: "导频 PILOT", data: "数据 DATA" };
  function drawTape(st, dt) {
    var ctx = ctxTape, W = tapeW, H = tapeH;
    ctx.fillStyle = "#141618";
    ctx.fillRect(0, 0, W, H);
    var speed = st.tape === "pilot" ? 150 : (st.tape === "data" ? 70 : 0);
    tapeScroll += dt * speed;
    var mid = H / 2, amp = H * 0.32;
    var period = st.tape === "data" ? 16 : 8;
    ctx.strokeStyle = st.tape === "idle" ? "rgba(224,180,0,0.55)" : "#E0B400";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var x = 0; x <= W; x++) {
      var y;
      if (st.tape === "idle") {
        y = mid + Math.sin(x * 0.35 + tapeScroll * 0.12) * 1.2;
      } else {
        var ph = ((x + tapeScroll) / period) % 2;
        if (ph < 0) ph += 2;
        y = ph < 1 ? mid - amp : mid + amp;
      }
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    var chip = document.getElementById("tape-chip");
    chip.textContent = TAPE_TEXT[st.tape] || st.tape.toUpperCase();
    chip.className = "chip" + (st.tape !== "idle" ? " on" : "");
  }

  /* ---- ⑤ 电源轨（9V → 5V/+12V/−5V） ---- */
  var railCfg = [
    { max: 10, col: "#B9BDC4", key: "v9" },
    { max: 5.6, col: "#3EB435", key: "v5" },
    { max: 12.6, col: "#E0B400", key: "v12" },
    { max: 5.6, col: "#22B0C8", key: "vn5" }
  ];

  function drawRails(st) {
    for (var i = 0; i < railCfg.length; i++) {
      var v = st.rails[railCfg[i].key];
      var mag = Math.abs(v);
      document.getElementById("rb-" + i).style.width = Math.min(100, mag / railCfg[i].max * 100) + "%";
      document.getElementById("rb-" + i).style.background = railCfg[i].col;
      document.getElementById("rv-" + i).textContent = (v >= 0 ? "" : "−") + mag.toFixed(2) + " V";
    }
    document.getElementById("rail-note").className = "chip" + (st.power ? " on" : "");
    document.getElementById("rail-w").innerHTML = st.watts.toFixed(1) + " <small>W</small>";
  }

  function update(st, dt) {
    drawMem(st);
    drawRegs(st);
    drawUla(st);
    drawTape(st, dt);
    drawRails(st);
    document.getElementById("mem-seat").textContent = st.seated + " / 30 已落板";
  }

  ZX48.Dashboard = { build: buildDOM, update: update };
})(window.ZX48 = window.ZX48 || {});
