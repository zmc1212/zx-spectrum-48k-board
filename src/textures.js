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

  /* ZX Spectrum 主板贴图：深绿基板 + 走线 + 焊盘 + 白色位号丝印 + 底部金手指
     板 2.4 × 1.6 单位 → 画布 960 × 640（1 单位 = 400 px） */
  function pcb() {
    return makeTex(960, 640, function (ctx, w, h) {
      var PX = 400;
      function bx(x) { return (x + 1.2) * PX; }
      function bz(z) { return (z + 0.8) * PX; }

      ctx.fillStyle = "#1F4A2E";
      ctx.fillRect(0, 0, w, h);
      var vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.72);
      vg.addColorStop(0, "rgba(255,255,255,0.05)");
      vg.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      /* 走线（正交折线，种子随机） */
      var seed = 11;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      ctx.strokeStyle = "rgba(178,220,182,0.14)";
      ctx.lineWidth = 2;
      for (var i = 0; i < 46; i++) {
        ctx.beginPath();
        var x = rnd() * w, y = rnd() * h;
        ctx.moveTo(x, y);
        for (var s = 0; s < 4; s++) {
          if (rnd() > 0.5) x += (rnd() - 0.5) * 260; else y += (rnd() - 0.5) * 200;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* 过孔 */
      ctx.fillStyle = "rgba(226,232,226,0.2)";
      for (var v = 0; v < 130; v++) {
        ctx.beginPath();
        ctx.arc(rnd() * w, rnd() * h, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 芯片焊盘轮廓 + 白色位号 */
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
      for (a = 0; a < 8; a++) footprint(-1.1 + a * 0.21, 0.05, 0.2, 0.075, 16, "4116");
      for (a = 0; a < 8; a++) footprint(-1.1 + a * 0.21, 0.33, 0.2, 0.075, 16, "4532");
      footprint(0.02, -0.5, 0.37, 0.155, 28, "ULA 5C126");
      footprint(-0.34, -0.55, 0.31, 0.15, 24, "2364 ROM");
      footprint(0.32, -0.38, 0.15, 0.52, 40, "Z80A", true);
      footprint(-0.02, 0.62, 0.31, 0.15, 24, "6116");
      footprint(0.36, 0.62, 0.31, 0.15, 24, "6116");
      footprint(-1.02, -0.18, 0.1, 0.08, 8, "LM311");
      footprint(0.62, -0.55, 0.16, 0.06, 2, "3.5469");
      footprint(-0.78, -0.66, 0.1, 0.05, 6, "7805");
      footprint(-0.55, -0.66, 0.075, 0.04, 6, "78M12");
      footprint(-0.88, -0.36, 0.14, 0.1, 0, "C5 C6");
      footprint(-0.64, -0.38, 0.12, 0.06, 0, "D5 D7");

      /* RF 调制器与电源区虚线轮廓 */
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = "rgba(240,244,240,0.55)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(bx(0.73), bz(-0.77), 0.46 * PX, 0.34 * PX);
      ctx.strokeRect(bx(-1.14), bz(-0.74), 0.62 * PX, 0.44 * PX);
      ctx.setLineDash([]);
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(240,244,240,0.6)";
      ctx.textAlign = "left";
      ctx.fillText("MODULATOR", bx(0.74), bz(-0.68));
      ctx.fillText("PSU", bx(-1.1), bz(-0.65));

      /* 大丝印字样（右下空白区） */
      ctx.fillStyle = "rgba(240,244,240,0.9)";
      ctx.font = "bold 44px monospace";
      ctx.fillText("ZX SPECTRUM", bx(0.56), bz(0.2));
      ctx.font = "bold 30px monospace";
      ctx.fillText("48K", bx(0.56), bz(0.31));
      ctx.font = "13px monospace";
      ctx.fillText("© 1982 SINCLAIR RESEARCH LTD", bx(0.56), bz(0.44));
      ctx.font = "12px monospace";
      ctx.fillText("ISSUE 3B · MADE IN UK", bx(-1.1), bz(0.2));
      ctx.fillText("EAR / MIC", bx(-1.13), bz(0.3));

      /* 底部边缘连接器金手指区（顶面触点） */
      ctx.fillStyle = "#C9A24B";
      for (var f = 0; f < 44; f++) {
        var fx = 62 + f * 19;
        ctx.fillRect(fx, h - 34, 11, 26);
      }
      ctx.fillStyle = "rgba(70,45,8,0.45)";
      for (var g2 = 0; g2 < 44; g2++) {
        ctx.fillRect(62 + g2 * 19 + 11, h - 34, 8, 26);
      }
      ctx.fillStyle = "rgba(240,244,240,0.7)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EDGE CONNECTOR · 23 × 2", bx(0), h - 40);
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

  /* 边缘连接器 3D 条：金色触点 + 间隙 */
  function fingers() {
    return makeTex(512, 32, function (ctx, w, h) {
      ctx.fillStyle = "#C9A24B";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(60,40,10,0.55)";
      for (var x = 6; x < w; x += 11) ctx.fillRect(x, 0, 2.5, h);
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
