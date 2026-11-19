/* 入口：初始化各模块、主循环、交互（拖拽/点击零件/空格暂停/R 重播/数字键 1-8 跳阶段） */
(function (ZX48) {
  var lastT = performance.now();
  var raycaster = null, mouse = new THREE.Vector2();
  var downX = 0, downY = 0;
  var PHASE_KEYS = ["pcb", "ram16", "ram32", "ula", "cpu", "conn", "boot", "load"];

  function boot() {
    ZX48.SceneInit();
    var S3 = ZX48.Scene3D;

    ZX48.orbitCtl = new ZX48.Orbit(S3.camera, S3.renderer.domElement);
    ZX48.Labels.init();
    ZX48.Parts.init();
    ZX48.Dashboard.build();
    ZX48.Timeline.init();
    ZX48.Timeline.start();

    raycaster = new THREE.Raycaster();
    bindInteractions(S3);

    window.addEventListener("resize", function () {
      var stage = document.getElementById("stage");
      S3.camera.aspect = stage.clientWidth / stage.clientHeight;
      S3.camera.updateProjectionMatrix();
      S3.renderer.setSize(stage.clientWidth, stage.clientHeight);
    });

    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
        var p = ZX48.Timeline.togglePause();
        document.getElementById("phase-text").style.opacity = p ? "0.5" : "1";
      } else if (e.code === "KeyR") {
        ZX48.Timeline.restart();
        document.getElementById("phase-text").style.opacity = "1";
      } else if (e.code === "KeyD") {
        document.body.classList.toggle("no-dash");
      } else if (/^Digit[1-8]$/.test(e.code)) {
        ZX48.Timeline.seek(PHASE_KEYS[Number(e.code.slice(5)) - 1]);
        document.getElementById("phase-text").style.opacity = "1";
      }
    });

    loop();
  }

  /* 可拾取对象：已出现零件 + 场景固定件（主板/金手指/屏幕） */
  function pickables() {
    var arr = [];
    ZX48.Parts.list().forEach(function (p) { if (p.group.visible) arr.push(p.group); });
    ZX48.Scene3D.clickables.forEach(function (c) { arr.push(c.group); });
    return arr;
  }

  function metaFor(group) {
    var i;
    var parts = ZX48.Parts.list();
    for (i = 0; i < parts.length; i++) {
      if (parts[i].group === group) return { name: parts[i].name, sub: parts[i].sub };
    }
    var cs = ZX48.Scene3D.clickables;
    for (i = 0; i < cs.length; i++) {
      if (cs[i].group === group) return { name: cs[i].name, sub: cs[i].sub };
    }
    return null;
  }

  function bindInteractions(S3) {
    var dom = S3.renderer.domElement;
    dom.style.touchAction = "none";
    dom.addEventListener("pointerdown", function (e) { downX = e.clientX; downY = e.clientY; });
    dom.addEventListener("pointerup", function (e) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;  // 拖拽不算点击
      var rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, S3.camera);
      var hits = raycaster.intersectObjects(pickables(), true);
      if (hits.length) {
        var g = hits[0].object;
        while (g && !g.userData.tagAnchor) g = g.parent;
        if (g) {
          var meta = metaFor(g);
          if (meta) ZX48.Labels.announce("click", g, meta.name, meta.sub, performance.now(), 2200);
        }
      }
    });
    dom.addEventListener("pointermove", function (e) {
      var rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, S3.camera);
      dom.style.cursor = raycaster.intersectObjects(pickables(), true).length ? "pointer" : "";
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min((now - lastT) / 1000, 0.12);
    lastT = now;

    ZX48.Timeline.update(dt);          // 内部判断暂停
    ZX48.orbitCtl.update(dt);
    ZX48.SceneUpdate(dt);
    ZX48.Labels.update();
    ZX48.Scene3D.renderer.render(ZX48.Scene3D.scene, ZX48.Scene3D.camera);
    if (!window.ZX48_BOOTED) window.ZX48_BOOTED = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.ZX48 = window.ZX48 || {});
