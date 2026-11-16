/* CSS 标签层：ZX 黄零件标签（飞行宣告 + 阶段固定标签），相机投影定位 */
(function (ZX48) {
  var container = null;
  var active = new Map();   // id -> {obj, el, until, tone}
  var pinned = new Map();   // id -> {obj, el, text}

  function init() {
    container = document.createElement("div");
    container.id = "tags";
    document.getElementById("stage").appendChild(container);
  }

  function makeEl(text, sub, tone) {
    var el = document.createElement("div");
    el.className = "tag" + (tone === "white" ? " white" : "");
    el.textContent = text;
    if (sub) {
      var s = document.createElement("span");
      s.className = "sub";
      s.textContent = sub;
      el.appendChild(s);
    }
    container.appendChild(el);
    return el;
  }

  var _v = new THREE.Vector3();

  function anchorToWorld(obj) {
    if (!obj || !obj.userData.tagAnchor) return null;
    return obj.localToWorld(_v.copy(obj.userData.tagAnchor));
  }

  function place(el, worldPos) {
    _v.copy(worldPos).project(ZX48.Scene3D.camera);
    if (_v.z > 1) { el.style.display = "none"; return; }
    var x = (_v.x * 0.5 + 0.5) * container.clientWidth;
    var y = (-_v.y * 0.5 + 0.5) * container.clientHeight;
    el.style.display = "";
    el.style.left = x + "px";
    el.style.top = (y - 14) + "px";
  }

  /* 短暂宣告标签：飞行开始时出现，2.6s 后消失 */
  function announce(id, obj, text, sub, now, holdMs, tone) {
    var a = active.get(id);
    if (!a) {
      a = { obj: obj, el: makeEl(text, sub, tone), until: now + holdMs };
      active.set(id, a);
    } else {
      a.until = now + holdMs;
      a.obj = obj;
    }
  }

  /* 阶段固定标签 */
  function setPinned(list) {
    pinned.forEach(function (p) { p.el.remove(); });
    pinned.clear();
    (list || []).forEach(function (item) {
      pinned.set(item.id, {
        obj: item.obj,
        el: makeEl(item.text, item.sub || null, item.tone || "yellow")
      });
    });
  }

  function clearAnnounce() {
    active.forEach(function (a) { a.el.remove(); });
    active.clear();
  }

  function update() {
    var now = performance.now();
    active.forEach(function (a, id) {
      if (now > a.until) { a.el.remove(); active.delete(id); return; }
      var w = anchorToWorld(a.obj);
      if (w) place(a.el, w);
    });
    pinned.forEach(function (p) {
      var w = anchorToWorld(p.obj);
      if (w) place(p.el, w);
    });
  }

  ZX48.Labels = { init: init, announce: announce, setPinned: setPinned, update: update, clearAnnounce: clearAnnounce };
})(window.ZX48 = window.ZX48 || {});
