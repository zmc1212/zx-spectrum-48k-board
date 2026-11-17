/* 程序化 Canvas 贴图：图纸台面 / ZX PCB 丝印 / 芯片顶印字 / 金手指 / 彩虹条 / 背景 */
(function (ZX48) {
  function makeTex(w, h, draw, opts) {
    opts = opts || {};
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.encoding = THREE.sRGBEncoding;
    if (opts.repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    return tex;
  }

  /* 深灰图纸台面：细网格 + 主网格 + 微噪点 */
  function ground() {
    return makeTex(512, 512, function (ctx, w, h) {
      ctx.fillStyle = "#2B2D31";
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 700; i++) {
        ctx.fillStyle = "rgba(255,255,255," + (Math.random() * 0.014).toFixed(3) + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
      }
      ctx.strokeStyle = "rgba(232,232,232,0.05)";
      ctx.lineWidth = 1;
      for (var x = 32; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 32; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(232,232,232,0.1)";
      for (var x2 = 128; x2 < w; x2 += 128) { ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, h); ctx.stroke(); }
      for (var y2 = 128; y2 < h; y2 += 128) { ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(w, y2); ctx.stroke(); }
    }, { repeat: [7, 7] });
  }

  /* 场景背景：深灰渐变（图纸灯光感） */
  function sky() {
    return makeTex(512, 512, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#3A3D42");
      g.addColorStop(0.55, "#2C2E32");
      g.addColorStop(1, "#202226");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      var r = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.42, w * 0.62);
      r.addColorStop(0, "rgba(255,255,255,0.05)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, w, h);
    });
  }

  /* ZX Spectrum 主板贴图：浅薄荷绿基板（Issue 3B）+ 铜走线总线 + 焊盘 + 白色位号丝印 + 底部金手指
     板 2.4 × 1.6 单位 → 画布 960 × 640（1 单位 = 400 px） */
  function pcb() {
    return makeTex(960, 640, function (ctx, w, h) {
      var PX = 400;
      function bx(x) { return (x + 1.2) * PX; }
      function bz(z) { return (z + 0.8) * PX; }

      /* Issue 3B 浅薄荷绿阻焊层 */
      ctx.fillStyle = "#A6C6A8";
      ctx.fillRect(0, 0, w, h);
      var vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.72);
      vg.addColorStop(0, "rgba(255,255,255,0.06)");
      vg.addColorStop(1, "rgba(26,46,32,0.3)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      /* ---- 铜走线：确定性布线发生器 ----
         以 ULA / CPU / ROM / 两排 DRAM / 金手指为锚点，按总线束走正交 + 45° 段，
         弯点处放铜环过孔（铜环 + 深色钻孔）。种子固定，输出可复现。 */
      var seed = 11;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var CU = "rgba(212,158,102,0.8)";      // 铜色（亮于新阻焊层）
      ctx.strokeStyle = CU;
      ctx.lineWidth = 2;
      function via(x, y) {
        ctx.fillStyle = "rgba(212,158,102,0.9)";
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(52,74,58,0.95)";   // 钻孔（深于基板）
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      /* 折线：内部正交拐点自动切 45° 倒角 */
      function route(pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length - 1; i++) {
          var a = pts[i - 1], b = pts[i], c = pts[i + 1];
          var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          var l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
          var cc = Math.min(9, l1 / 2, l2 / 2);
          ctx.lineTo(b[0] - (b[0] - a[0]) / l1 * cc, b[1] - (b[1] - a[1]) / l1 * cc);
          ctx.lineTo(b[0] + (c[0] - b[0]) / l2 * cc, b[1] + (c[1] - b[1]) / l2 * cc);
          if (rnd() > 0.55) via(b[0], b[1]);
        }
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        ctx.stroke();
      }
      function line(x0, y0, x1, y1) { route([[x0, y0], [x1, y1]]); }

      var RAMX = [];
      for (var a = 0; a < 8; a++) RAMX.push(bx(-1.1 + a * 0.21));   // 40 … 628

      /* ULA 底排焊盘 → 上排 4116 顶排焊盘（总线扇出，通道 y 285…313 依次错开） */
      for (a = 0; a < 8; a++) {
        var x0 = 401 + a * 18, yc = 285 + a * 4;
        route([[x0, 154], [x0, yc], [RAMX[a], yc], [RAMX[a], 322]]);
      }
      /* 两排 RAM 之间的直通总线（每颗 3 根） */
      for (a = 0; a < 8; a++) {
        for (var b = 0; b < 3; b++) {
          var sx = RAMX[a] - 18 + b * 18;
          line(sx, 358, sx, 434);
          if (rnd() > 0.6) via(sx, 396);
        }
      }
      /* 下排 4532 底排焊盘 → 底部金手指（数据总线下行） */
      for (a = 0; a < 8; a++) line(RAMX[a] + 12, 470, RAMX[a] + 12, 596);
      /* ULA 底排右端 → CPU 左排焊盘（45° 短斜线束） */
      for (a = 0; a < 4; a++) line(535.3 + a * 7.9, 154, 575, 171 + a * 7.9);
      /* ROM 顶排焊盘 → ULA 顶排焊盘（经上方走廊，走廊逐根上移） */
      for (a = 0; a < 4; a++) {
        var rx = 340 + a * 16, yh = 58 - a * 5, tx = 401 + a * 16;
        route([[rx, 67], [rx, yh], [tx, yh], [tx, 86]]);
      }
      /* 晶振 ↔ CPU 右排 */
      route([[728, 85], [728, 64], [641, 64], [641, 69]]);
      route([[728, 115], [728, 255], [641, 255]]);
      /* CPU 右侧空区 → 金手指的补充走线 */
      for (a = 0; a < 5; a++) {
        var lx = 660 + a * 46;
        route([[lx, 285], [lx, 530], [lx + 14, 548], [lx + 14, 596]]);
      }
      /* 左下空区竖线 → 金手指 */
      for (a = 0; a < 4; a++) line(96 + a * 44, 500, 96 + a * 44, 596);
      /* 下部走廊零散过孔（种子随机，可复现） */
      for (a = 0; a < 14; a++) via(60 + rnd() * 840, 490 + rnd() * 100);

      /* 芯片焊盘轮廓 + 白色位号（参考位号风格：IC1 ULA / IC2 CPU / IC3 ROM /
         IC6-13 4116 / IC15-22 4532，与 Issue 3B 维修手册位号一致） */
      function footprint(cx, cz, len, wid, pins, label, vert) {
        var x = bx(cx), y = bz(cz);
        var L = len * PX, W = wid * PX;
        ctx.strokeStyle = "rgba(240,244,240,0.7)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x - L / 2 - 5, y - W / 2 - 5, L + 10, W + 10);
        ctx.fillStyle = "#D9C47E";
        var n = pins / 2;
        for (var p = 0; p < n; p++) {
          if (vert) {
            var py = y - W / 2 + 5 + (W - 10) * ((p + 0.5) / n);
            ctx.beginPath(); ctx.arc(x - L / 2 - 3, py, 2.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + L / 2 + 3, py, 2.8, 0, Math.PI * 2); ctx.fill();
          } else {
            var px = x - L / 2 + 5 + (L - 10) * ((p + 0.5) / n);
            ctx.beginPath(); ctx.arc(px, y - W / 2 - 3, 2.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px, y + W / 2 + 3, 2.8, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (label) {
          ctx.fillStyle = "rgba(240,244,240,0.85)";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(label, x, y - W / 2 - 12);
        }
      }
      var a;
      for (a = 0; a < 8; a++) footprint(-1.1 + a * 0.21, 0.05, 0.2, 0.075, 16, "IC" + (6 + a));
      for (a = 0; a < 8; a++) footprint(-1.1 + a * 0.21, 0.33, 0.2, 0.075, 16, "IC" + (15 + a));
      footprint(0.0, -0.5, 0.42, 0.155, 40, "IC1");
      footprint(-0.34, -0.55, 0.37, 0.15, 28, "IC3");
      footprint(0.32, -0.38, 0.15, 0.52, 40, "IC2", true);
      footprint(0.62, -0.55, 0.16, 0.06, 2, "X1");
      footprint(-0.78, -0.66, 0.1, 0.05, 6, "7805");
      footprint(-0.55, -0.66, 0.075, 0.04, 6, "78M12");
      footprint(-0.88, -0.36, 0.14, 0.1, 0, "C5 C6");
      footprint(-0.64, -0.38, 0.12, 0.06, 0, "D5 D7");

      /* 小字丝印（位号/功能风格；无品牌大字——ZX SPECTRUM 印在机壳上，不印板上） */
      ctx.fillStyle = "rgba(240,244,240,0.75)";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText("ISSUE 3B", bx(-1.1), bz(0.2));
      ctx.fillText("EAR", bx(-1.02), bz(0.36));
      ctx.fillText("MIC", bx(-1.02), bz(0.08));

      /* 底部边缘连接器金手指区（顶面触点，2 × 28 = 56 指） */
      ctx.fillStyle = "#C9A24B";
      for (var f = 0; f < 56; f++) {
        var fx = 60 + f * 15;
        ctx.fillRect(fx, h - 34, 9, 26);
      }
      ctx.fillStyle = "rgba(70,45,8,0.45)";
      for (var g2 = 0; g2 < 56; g2++) {
        ctx.fillRect(60 + g2 * 15 + 9, h - 34, 6, 26);
      }
      ctx.fillStyle = "rgba(240,244,240,0.7)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EDGE CONNECTOR · 2 × 28", bx(0), h - 40);
    });
  }

  /* 芯片顶面印字（黑底白字 / 可换底色） */
  function chipTop(lines, bg, ink) {
    return makeTex(256, 96, function (ctx, w, h) {
      ctx.fillStyle = bg || "#1A1C20";
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 18; i++) {
        ctx.fillStyle = (bg ? "rgba(0,0,0," : "rgba(255,255,255,") + (Math.random() * 0.04).toFixed(3) + ")";
        ctx.fillRect(0, Math.random() * h, w, 1);
      }
      ctx.fillStyle = ink || "rgba(238,240,236,0.92)";
      ctx.textAlign = "center";
      var n = 0;
      for (var k = 0; k < lines.length; k++) if (lines[k]) n++;
      var drawn = 0;
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j]) continue;
        if (drawn === 0) {
          ctx.font = "bold 30px monospace";
          ctx.fillText(lines[j], w / 2, h / 2 + 2 - (n - 1) * 12);
        } else {
          ctx.font = "15px monospace";
          ctx.fillText(lines[j], w / 2, h / 2 + 4 + (drawn) * 22 - (n - 1) * 12);
        }
        drawn++;
      }
    });
  }

  /* 边缘连接器 3D 条：金色触点 + 间隙（恰好 2 × 28 = 56 指，与丝印/标签一致） */
  function fingers() {
    return makeTex(512, 32, function (ctx, w, h) {
      ctx.fillStyle = "#C9A24B";
      ctx.fillRect(0, 0, w, h);
      var n = 56, pitch = w / n;
      ctx.fillStyle = "rgba(60,40,10,0.55)";
      for (var i = 0; i < n; i++) ctx.fillRect((i + 1) * pitch - 2.6, 0, 2.6, h);
      ctx.fillStyle = "rgba(255,235,190,0.3)";
      ctx.fillRect(0, 0, w, 3);
    });
  }

  /* ZX 彩虹四色条（Sinclair logo 红/黄/绿/青） */
  function rainbow() {
    return makeTex(128, 16, function (ctx, w, h) {
      var cols = ["#C7161D", "#E0B400", "#3EB435", "#22B0C8"];
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = cols[i];
        ctx.fillRect(i * w / 4, 0, w / 4, h);
      }
    });
  }

  ZX48.Textures = {
    makeTex: makeTex,
    ground: ground,
    sky: sky,
    pcb: pcb,
    chipTop: chipTop,
    fingers: fingers,
    rainbow: rainbow
  };
})(window.ZX48 = window.ZX48 || {});
