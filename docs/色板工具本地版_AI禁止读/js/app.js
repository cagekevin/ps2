/*
 * 色板工具本地版 · 界面与动作
 * ------------------------------------------------------------
 * 只做三件事：渲染、收集用户操作、调用内核。
 * 不直接读写文件，不直接调 evalScript。
 */
(function (global) {
  'use strict';

  var S = global.Seban;
  var store = S.store;
  var color = S.color;
  var ps = S.ps;
  var log = S.log;

  var el = {};

  /* 自动填充的循环抑制：上一次自动上色用的 hex（见 boot 里 watchForeground 的注释） */
  var lastAppliedHex = null;

  /* ---------------- 视图 ---------------- */
  function createSwatch(item, editable, index) {
    var node = document.createElement('input');
    node.type = 'button';
    node.className = 'AnNiuYanSe';
    node.style.background = color.css(item.color);
    node.dataset.index = index;
    node.dataset.hex = item.color.hex;
    node.draggable = !!editable;
    node.title = editable
      ? '#' + item.color.hex + '\n左键：填充　shift+左键：线框\nctrl+左键：取色替换　右键：删除'
      : '#' + item.color.hex + '\n左键：填充　shift+左键：线框';
    return node;
  }

  function renderList(container, list, editable) {
    container.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      container.appendChild(createSwatch(list[i], editable, i));
    }
  }

  function render(state) {
    renderList(el.palette, state.palette, true);
    renderList(el.recent, state.recent, false);
  }

  function flash(node) {
    if (!node) return;
    node.classList.add('AnNiuYanSeGL');
    setTimeout(function () { node.classList.remove('AnNiuYanSeGL'); }, 300);
    setTimeout(function () { node.classList.add('AnNiuYanSeGL'); }, 600);
    setTimeout(function () { node.classList.remove('AnNiuYanSeGL'); }, 900);
  }

  /* ---------------- 动作 ---------------- */

  /* 上色：交给官方 vendor 的智能填充（ys_useStyleColor）——
     它一次处理所有选中图层。官方色板工具的多图层上色就是它做的，
     官方主面板只是转发事件；我们没有主面板，就自己转发同一跳。 */
  function applyColor(item, wire, silent) {
    var flat = item.color;
    var payload = wire
      ? flat
      : {
        hex: flat.hex,
        c: flat.c | 0,
        m: flat.m | 0,
        y: flat.y | 0,
        k: flat.k | 0,
        isFill: true
      };
    var fn = wire ? 'ys_setBorderColor' : 'ys_useStyleColor';
    var label = wire ? '智能填充线框颜色' : '智能填充颜色';

    if (!ps.vendorReady) {
      log('VENDOR-UNAVAILABLE: 官方上色能力未就绪');
      if (!silent) alert('官方上色能力未就绪（vendor 未加载），无法上色。\n请完全退出 Photoshop 后重新打开面板。');
      return;
    }

    ps.dispatch(fn, [payload], label, function (res) {
      var s = String(res);
      /* 官方约定：-1 = 宿主拒绝（多为没选中图层），其余视为成功 */
      if (s === '-1' || s.indexOf('EvalScript error.') >= 0 || s.indexOf('error') === 0) {
        log('DISPATCH-REJECTED ' + fn + ' => ' + s);
        /* 自动填充是「顺手」触发的：没选中图层太常见，弹窗会烦到不能用，只记日志 */
        if (!silent) alert('上色未执行（官方返回 ' + s + '）。\n常见原因：没有选中任何图层。');
      }
    });
  }

  function addToPalette(c) {
    if (!c) return;
    var palette = store.get('palette');
    for (var i = 0; i < palette.length; i++) {
      if (palette[i].color.hex === c.hex) {
        flash(el.palette.children[i]);
        return;
      }
    }
    store.set({ palette: palette.concat([{ name: '未命名', color: c }]) });
  }

  function removeAt(index) {
    var palette = store.get('palette').slice();
    if (index < 0 || index >= palette.length) return;
    palette.splice(index, 1);
    store.set({ palette: palette });
  }

  function moveItem(from, to) {
    var palette = store.get('palette').slice();
    if (from === to || from < 0 || to < 0 || from >= palette.length || to >= palette.length) return;
    var moved = palette.splice(from, 1)[0];
    palette.splice(to, 0, moved);
    store.set({ palette: palette });
  }

  function pushRecent(c) {
    if (!c) return;
    var limit = store.get('limit');
    if (limit <= 0) return;
    var list = store.get('recent').filter(function (it) {
      return it.color.hex !== c.hex;
    });
    list.push({ name: '未命名', color: c });
    while (list.length > limit) list.shift();
    store.set({ recent: list });
  }

  function replaceColorAt(index) {
    ps.call('sbPickColor', '', function (res) {
      var c = color.decode(res);
      if (!c) return;
      var palette = store.get('palette').slice();
      if (!palette[index]) return;
      palette[index] = { name: palette[index].name || '未命名', color: c };
      store.set({ palette: palette });
    });
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindList(container, editable) {
    container.addEventListener('click', function (e) {
      var node = e.target.closest('.AnNiuYanSe');
      if (!node) return;
      var index = parseInt(node.dataset.index, 10);
      var list = editable ? store.get('palette') : store.get('recent');
      var item = list[index];
      if (!item) return;

      if (editable && (e.ctrlKey || e.metaKey)) {
        replaceColorAt(index);
        return;
      }
      applyColor(item, e.shiftKey);
    });

    if (!editable) return;

    container.addEventListener('contextmenu', function (e) {
      var node = e.target.closest('.AnNiuYanSe');
      if (!node) return;
      e.preventDefault();
      removeAt(parseInt(node.dataset.index, 10));
    });

    var dragFrom = -1;
    container.addEventListener('dragstart', function (e) {
      var node = e.target.closest('.AnNiuYanSe');
      if (!node) return;
      dragFrom = parseInt(node.dataset.index, 10);
      node.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) { }
    });
    container.addEventListener('dragend', function (e) {
      var node = e.target.closest('.AnNiuYanSe');
      if (node) node.classList.remove('dragging');
    });
    container.addEventListener('dragover', function (e) {
      if (dragFrom < 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    container.addEventListener('drop', function (e) {
      if (dragFrom < 0) return;
      e.preventDefault();
      var node = e.target.closest('.AnNiuYanSe');
      if (!node) { dragFrom = -1; return; }
      moveItem(dragFrom, parseInt(node.dataset.index, 10));
      dragFrom = -1;
    });
  }

  /* 开关的视觉只有一个来源：store 的值 → class。别处不许直接改 class */
  function syncAutoFill() {
    if (el.autoFill) el.autoFill.classList.toggle('is-on', !!store.get('autoFill'));
  }

  function bindToolbar() {
    el.addFg.addEventListener('click', function () {
      ps.call('sbGetForegroundColor', '', function (res) {
        addToPalette(color.decode(res));
      });
    });

    el.addLayer.addEventListener('click', function () {
      ps.call('sbGetLayerColor', '', function (res) {
        var c = color.decode(res);
        if (!c) { flash(null); return; }
        addToPalette(c);
      });
    });

    el.shape.addEventListener('click', function (e) {
      ps.call('sbSetShape', "'" + (e.shiftKey ? 'stroke' : 'fill') + "'");
    });

    el.swap.addEventListener('click', function () {
      ps.call('sbSwapStrokeFill', '');
    });

    /* 自动填充开关：点一下切换，点亮 = 开。状态进 store（落盘），视觉由 syncAutoFill 统一刷 */
    el.autoFill.addEventListener('click', function () {
      var next = !store.get('autoFill');
      store.set({ autoFill: next });
      syncAutoFill();
      log('AUTOFILL ' + (next ? 'on' : 'off'));
    });

    el.limit.addEventListener('click', function () {
      var input = prompt('最近使用颜色数量（' + S.limit.min + ' - ' + S.limit.max + '）',
        String(store.get('limit')));
      if (input === null) return;
      var n = parseInt(input, 10);
      if (isNaN(n) || n < S.limit.min || n > S.limit.max) {
        alert('请输入 ' + S.limit.min + ' 到 ' + S.limit.max + ' 之间的数字');
        return;
      }
      var recent = store.get('recent');
      if (recent.length > n) recent = recent.slice(recent.length - n);
      store.set({ limit: n, recent: recent });
    });
  }

  /* 图标悬停换图，与原版一致 */
  function bindIconHover() {
    var icons = document.querySelectorAll('.main img');
    Array.prototype.forEach.call(icons, function (img) {
      var normal = img.getAttribute('src');
      var hover = normal.replace(/\.png$/, 'a.png');
      img.addEventListener('mouseenter', function () { img.src = hover; });
      img.addEventListener('mouseleave', function () { img.src = normal; });
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    el.palette = document.getElementById('div_ZiDingYi');
    el.recent = document.getElementById('div_ZuiJin');
    el.addFg = document.getElementById('btnAddFg');
    el.addLayer = document.getElementById('btnAddLayer');
    el.shape = document.getElementById('btnShape');
    el.swap = document.getElementById('btnSwap');
    el.autoFill = document.getElementById('btnAutoFill');
    el.limit = document.getElementById('btnLimit');

    store.init();
    store.subscribe(render);
    render(store.state);

    bindList(el.palette, true);
    bindList(el.recent, false);
    bindToolbar();

    ps.watchForeground(function () {
      ps.call('sbGetForegroundColor', '', function (res) {
        var c = color.decode(res);
        if (!c) return;
        pushRecent(c);
        if (!store.get('autoFill')) return;
        /* 上色本身可能改前景色 → 再触发一次 setd → 死循环。
           记住刚用过的 hex，同色再回来就是自己造成的，跳过一次 */
        if (lastAppliedHex === c.hex) { lastAppliedHex = null; return; }
        lastAppliedHex = c.hex;
        applyColor({ color: c }, false, true);
      });
    });

    bindIconHover();
    syncAutoFill();
    log('BOOT ' + location.href);
  }

  ps.load(boot);
})(window);
