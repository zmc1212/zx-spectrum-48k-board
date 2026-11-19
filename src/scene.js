/* 场景：渲染器 / 灯光 / 图纸台面 / ZX Spectrum Issue 3B 主板 / 标志性小屏幕 */
(function (ZX48) {
  var M = {};              // 共享材质（先建，零件都依赖）
  var boardGroup = null;
  var boardFly = null;
  var edgeStrip = null;
  var screenGroup = null;
  var screenMat = null;
  var screenLight = null;
  var scrCtx = null, scrTex = null;
  var screenMode = "off";
  var screenAcc = 1, screenTime = 0;

  function mesh(geo, mat, x, y, z, cast, receive) {
    var m = new THREE.Mesh(geo, mat);
    if (x !== undefined) m.position.set(x, y, z);
    m.castShadow = cast !== false;
    m.receiveShadow = receive !== false;
    return m;
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function init() {
    var stage = document.getElementById("stage");
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    // 软件渲染下降像素比 + 精简阴影，保证可交互帧率
    var softGL = false;
    try {
      var gl = renderer.getContext();
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      softGL = /swiftshader|software|basic render/i.test(String(gpu));
    } catch (e) { /* 保留默认 */ }
    renderer.setPixelRatio(softGL ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = softGL ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.physicallyCorrectLights = true;
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = ZX48.Textures.sky();

    var camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 80);
    camera.position.set(3.4, 3.0, 4.8);

    var hemi = new THREE.HemisphereLight(0xd8dde2, 0x2e3134, 0.85);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 7, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(softGL ? 1024 : 2048, softGL ? 1024 : 2048);
    sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 22;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    /* ---- 图纸台面 ---- */
    var groundTex = ZX48.Textures.ground();
    var desk = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
    );
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    scene.add(desk);

    /* ---- 共享材质（必须先于零件创建） ---- */
    M.plastic = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.85 });
    M.dark = new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.8 });
    M.chipSide = new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 0.5, metalness: 0.15 });
    M.pin = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.8 });
    M.silver = new THREE.MeshStandardMaterial({ color: 0xc9cdd4, metalness: 0.75, roughness: 0.3 });
    M.alu = new THREE.MeshStandardMaterial({ color: 0xd4d6da, metalness: 0.55, roughness: 0.42 });
    M.gold = new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 0.85, roughness: 0.32 });
    M.bezel = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.4 });
    M.navy = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.5 });
    M.ribbon = new THREE.MeshStandardMaterial({ color: 0xa3a6aa, roughness: 0.8 });
    M.rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    M.white = new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.5 });

    /* ---- 主板（飞行由 Timeline 触发） ---- */
    boardGroup = buildBoard();
    scene.add(boardGroup);

    /* ---- 标志性小屏幕（256×192，立于板后上方朝向相机） ---- */
    buildScreen(scene);

    ZX48.Scene3D = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      board: boardGroup,
      edgeStrip: edgeStrip,
      screenGroup: screenGroup,
      mesh: mesh,
      M: M,
      clickables: [
        { group: boardGroup, name: "主板 PCB", sub: "ISSUE 3B · 24 × 16 CM · SINGLE-SIDED" },
        { group: edgeStrip, name: "边缘连接器", sub: "2 × 28 WAY · GOLD FINGERS" },
        { group: screenGroup, name: "小屏幕", sub: "256 × 192 · ULA OUTPUT" }
      ],
      flyBoardIn: flyBoardIn,
      sealBoard: sealBoard,
      resetBoard: resetBoard,
      setScreen: setScreen,
      setLoadTape: setLoadTape
    };
  }

  /* 主板：PCB 盒 + 丝印贴图 + 底部金手指 + 电源插座 + RF 同轴出口 */
  function buildBoard() {
    var g = new THREE.Group();
    var sideMat = new THREE.MeshStandardMaterial({ color: 0x7fa887, roughness: 0.7 });
    var topMat = new THREE.MeshStandardMaterial({ map: ZX48.Textures.pcb(), roughness: 0.62, metalness: 0.04 });
    var pcb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.6),
      [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    pcb.position.y = 0.025;
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    g.add(pcb);

    // 底部边缘连接器：金色触点排（前后面为触点贴图）
    var fingerMat = new THREE.MeshStandardMaterial({ map: ZX48.Textures.fingers(), metalness: 0.85, roughness: 0.28 });
    edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.08, 0.026),
      [M.gold, M.gold, M.gold, M.gold, fingerMat, fingerMat]);
    edgeStrip.position.set(0, 0.03, 0.8);
    edgeStrip.castShadow = true;
    edgeStrip.userData.tagAnchor = new THREE.Vector3(0, 0.12, 0);
    g.add(edgeStrip);

    // 9V DC 电源插座（左上角，圆柱朝后）
    var jack = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 18), M.plastic, -1.0, 0.055, -0.76);
    jack.rotation.x = Math.PI / 2;
    g.add(jack);
    var jackHole = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.104, 12), M.dark, -1.0, 0.055, -0.76);
    jackHole.rotation.x = Math.PI / 2;
    g.add(jackHole);

    // RF 调制器同轴出口（顶缘，与 RF 盒对齐）
    var coax = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 12), M.silver, 0.95, 0.05, -0.82);
    coax.rotation.x = Math.PI / 2;
    g.add(coax);

    g.userData.tagAnchor = new THREE.Vector3(0, 0.45, 0);
    return g;
  }

  /* 小屏幕：黑色边框 + Canvas 动态贴图 + ZX 彩虹贴条 + 屏幕点光 */
  function buildScreen(scene) {
    screenGroup = new THREE.Group();
    screenGroup.position.set(-0.62, 0, -1.42);
    screenGroup.rotation.y = 0.14;

    var stand = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.26), M.plastic, 0, 0.025, 0);
    var neck = mesh(new THREE.BoxGeometry(0.14, 0.3, 0.12), M.plastic, 0, 0.18, -0.02);
    var head = new THREE.Group();
    head.position.set(0, 0.62, 0);
    head.rotation.x = -0.12;

    var bezel = mesh(new THREE.BoxGeometry(1.0, 0.8, 0.09), M.bezel, 0, 0, 0);
    head.add(bezel);

    var cv = document.createElement("canvas");
    cv.width = 320; cv.height = 240;
    scrCtx = cv.getContext("2d");
    scrTex = new THREE.CanvasTexture(cv);
    scrTex.anisotropy = 8;
    scrTex.encoding = THREE.sRGBEncoding;
    screenMat = new THREE.MeshStandardMaterial({
      map: scrTex, emissiveMap: scrTex, emissive: 0xffffff,
      emissiveIntensity: 0.02, roughness: 0.32, metalness: 0.06
    });
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.66), screenMat);
    scr.position.set(0, 0.01, 0.046);
    head.add(scr);

    // 边框下沿彩虹贴条
    var rb = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.024),
      new THREE.MeshStandardMaterial({ map: ZX48.Textures.rainbow(), roughness: 0.5 }));
    rb.position.set(0, -0.345, 0.047);
    head.add(rb);

    screenLight = new THREE.PointLight(0xbfe8ff, 0, 2.2);
    screenLight.position.set(0, 0.05, 0.4);
    head.add(screenLight);

    screenGroup.add(stand);
    screenGroup.add(neck);
    screenGroup.add(head);
    screenGroup.userData.tagAnchor = new THREE.Vector3(0, 1.1, 0.1);
    scene.add(screenGroup);
    drawScreenFrame("off", 0);
  }

  /* LOAD 边框状态：pilot tone（红/青横条纹）或 data（蓝/黄），由 Timeline 随磁带状态切换 */
  var loadTape = "pilot";
  function setLoadTape(tape) {
    loadTape = tape === "data" ? "data" : "pilot";
  }

  /* 真实 LOAD 边框：整行扫描线一色，上下 1/3 水平条纹
     pilot tone = 红/青交替，数据段 = 蓝/黄交替（每行约 3px，偶有相位翻转） */
  function loadStripes(ctx, y0, y1, t) {
    var a = loadTape === "data" ? "#0000D7" : "#D70000";
    var b = loadTape === "data" ? "#D7D700" : "#00D7D7";
    var band = 3;
    var flip = Math.floor(t * 1.5) % 2;
    var i = 0;
    for (var y = y0; y < y1; y += band, i++) {
      ctx.fillStyle = ((i + flip) % 2 === 0) ? a : b;
      ctx.fillRect(0, y, 320, Math.min(band, y1 - y));
    }
  }

  /* 屏幕内容：off / boot（© 1982 + 闪烁光标）/ load（水平条纹 + LOAD） */
  function drawScreenFrame(mode, t) {
    var ctx = scrCtx;
    if (!ctx) return;
    if (mode === "off") {
      ctx.fillStyle = "#0A0B0D";
      ctx.fillRect(0, 0, 320, 240);
      var g = ctx.createLinearGradient(0, 0, 224, 240);
      g.addColorStop(0, "rgba(140,150,160,0.08)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 320, 240);
    } else if (mode === "boot") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = "#DCDCDC";
      ctx.font = "13px monospace";
      ctx.textAlign = "left";
      ctx.fillText("© 1982 Sinclair Research Ltd", 12, 204);
      if ((t % 1.0) < 0.62) {
        ctx.fillStyle = "#E8E8E8";
        ctx.fillRect(12, 214, 11, 14);
      }
    } else {   // load：上下 1/3 水平条纹（pilot 红/青、data 蓝/黄），中间黑底 LOAD
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 320, 240);
      loadStripes(ctx, 0, 80, t);
      loadStripes(ctx, 160, 240, t * 1.35 + 0.5);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 80, 320, 80);
      ctx.fillStyle = "#E8E8E8";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "left";
      ctx.fillText("LOAD ", 12, 128);
      if ((t % 0.9) < 0.5) ctx.fillRect(84, 110, 13, 16);
    }
    scrTex.needsUpdate = true;
  }

  /* Timeline 控制：off / boot / load */
  function setScreen(mode) {
    screenMode = mode;
    screenAcc = 1;   // 下一帧立即重绘
    screenMat.emissiveIntensity = mode === "off" ? 0.02 : 0.9;
    screenLight.intensity = mode === "off" ? 0 : 0.5;
    if (mode === "off") drawScreenFrame("off", 0);   // 立即擦暗，避免残留上一画面
  }

  /* 主板飞入：从画面上方斜落入平放 */
  function flyBoardIn() {
    boardGroup.visible = true;
    boardGroup.position.set(0.5, 3.2, -0.2);
    boardGroup.rotation.set(0.55, 0.3, -0.2);
    boardFly = { t: 0 };
  }

  function sealBoard() {
    boardFly = null;
    boardGroup.visible = true;
    boardGroup.position.set(0, 0, 0);
    boardGroup.rotation.set(0, 0, 0);
  }

  function resetBoard() {
    boardFly = null;
    boardGroup.visible = true;
    boardGroup.position.set(0.5, 3.2, -0.2);
    boardGroup.rotation.set(0.55, 0.3, -0.2);
  }

  function update(dt) {
    var frozen = ZX48.Timeline && ZX48.Timeline.paused;
    if (frozen) return;
    /* 主板落板动画 */
    if (boardFly) {
      boardFly.t += dt;
      var k = Math.min(1, boardFly.t / 1.7);
      var e = ease(k);
      boardGroup.position.set(0.5 * (1 - e), 3.2 * (1 - e), -0.2 * (1 - e));
      boardGroup.rotation.set(0.55 * (1 - e), 0.3 * (1 - e), -0.2 * (1 - e));
      if (k >= 1) boardFly = null;
    }
    /* 屏幕贴图约 10fps 重绘（光标闪烁 / 条纹滚动） */
    if (screenMode !== "off") {
      screenAcc += dt;
      if (screenAcc >= 0.1) {
        screenTime += screenAcc;
        screenAcc = 0;
        drawScreenFrame(screenMode, screenTime);
      }
    }
  }

  ZX48.SceneInit = init;
  ZX48.SceneUpdate = update;
})(window.ZX48 = window.ZX48 || {});
