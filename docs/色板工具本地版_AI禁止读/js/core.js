/*
 * 色板工具本地版 · 内核
 * ------------------------------------------------------------
 * 只做四件事：状态、持久化、PS 通道、颜色编解码。
 * 不含任何 UI 逻辑，不读 DOM。
 *
 * 数据流：actions -> store.set() -> 自动落盘 -> 通知订阅者重绘
 */
(function (global) {
  'use strict';

  /* ---------------- 常量 ---------------- */
  var USER_DIR = '/FengZiSeBan';
  var FILES = {
    palette: 'userColor.ini',
    recent: 'vecently.ini',
    limit: 'zuiJinShuLiang.txt',
    /* 自动填充开关：'1' = 开，'0' 或缺失 = 关（默认关，官方 2019 删过这个行为） */
    autoFill: 'ziDongTianChong.txt'
  };
  var LIMIT_MIN = 0;
  var LIMIT_MAX = 15;
  var LIMIT_DEF = 10;

  var cs = new CSInterface();
  var userRoot = cs.getSystemPath(SystemPath.USER_DATA);
  var extRoot = cs.getSystemPath(SystemPath.EXTENSION);
  var dataDir = userRoot + USER_DIR;

  /* ---------------- 日志 ---------------- */
  function log(msg) {
    try {
      var req = (global.cep_node && global.cep_node.require) || global.require;
      if (!req) return;
      var fs = req('fs');
      var os = req('os');
      var path = req('path');
      fs.appendFileSync(path.join(os.tmpdir(), 'seban-debug.log'),
        new Date().toISOString() + ' | ' + msg + '\n');
    } catch (e) { /* 日志失败不影响功能 */ }
  }

  /* ---------------- 存储 ---------------- */
  var storage = {
    ensure: function () {
      try { global.cep.fs.makedir(dataDir); } catch (e) { }
    },
    readText: function (name) {
      try {
        var r = global.cep.fs.readFile(dataDir + '/' + name);
        return (r && r.err === 0) ? r.data : null;
      } catch (e) {
        log('READ-ERR ' + name + ' ' + e.message);
        return null;
      }
    },
    writeText: function (name, text) {
      try {
        storage.ensure();
        global.cep.fs.writeFile(dataDir + '/' + name, text);
        return true;
      } catch (e) {
        log('WRITE-ERR ' + name + ' ' + e.message);
        return false;
      }
    },
    readJson: function (name, fallback) {
      var text = storage.readText(name);
      if (!text) return fallback;
      try {
        var value = JSON.parse(text);
        return Array.isArray(value) ? value : fallback;
      } catch (e) {
        log('JSON-ERR ' + name + ' ' + e.message);
        return fallback;
      }
    },
    writeJson: function (name, value) {
      return storage.writeText(name, JSON.stringify(value));
    }
  };

  /* ---------------- 颜色 ---------------- */
  /* PS 侧约定：'hex|c|m|y|k'，可选第 6 段 mode */
  var color = {
    decode: function (raw) {
      if (!raw || typeof raw !== 'string') return null;
      var p = raw.split('|');
      if (p.length < 5 || !/^[0-9a-fA-F]{6}$/.test(p[0])) return null;
      return {
        hex: p[0].toUpperCase(),
        c: parseInt(p[1], 10) || 0,
        m: parseInt(p[2], 10) || 0,
        y: parseInt(p[3], 10) || 0,
        k: parseInt(p[4], 10) || 0
      };
    },
    encode: function (c, mode) {
      return [
        c.hex,
        c.c | 0, c.m | 0, c.y | 0, c.k | 0,
        mode || 'fill'
      ].join('|');
    },
    css: function (c) {
      return '#' + c.hex;
    }
  };

  /* ---------------- PS 通道 ---------------- */

  /* 官方 vendor jsxbin 要的环境变量。字段名不能改——jsx 按这些 key 取值，
     少一个就报「undefined 不是对象」。与仓库 core/ps/env.ts 的 PS_ENV 同一份。 */
  var PS_ENV = {
    VUE_APP_BASE_SERVER: 'https://zhuli.gaoding.com',
    VUE_APP_WEBSITE_HOST: 'https://www.pszhuli.com',
    VUE_APP_ENVNAME: '',
    VUE_APP_CURRENTMODE: 'prod',
    VUE_APP_BASE_SYNC_SERVER: 'https://syncserver.pszhuli.com',
    VUE_APP_UMS: 'https://ums.gaoding.com',
    VUE_APP_BASE_CEP: 'https://cepapp.pszhuli.com',
    VUE_APP_USER_DIR: '/SheJiZhuLi',
    VUE_APP_OPTIMAL_DIR: '/Optimal',
    NODE_ENV: 'production',
    VUE_APP_CEP_VERSION: '3.6.2',
    VUE_APP_CEP_NAME: 'design',
    VUE_APP_CEP_PUB_TIME: '2022-06-28',
    VUE_APP_CEP_PUB_TIMESTAMP: '1656410553279',
    BASE_URL: ''
  };

  var ps = {
    ready: false,
    /* 官方 vendor 是否可用：它的「智能填充」才是多图层上色的真正实现 */
    vendorReady: false,

    load: function (done) {
      cs.evalScript('$.evalFile("' + extRoot + '/jsx/main.jsx")', function (res) {
        ps.ready = (res !== 'EvalScript error.');
        log('JSX-LOAD => ' + res);
        ps.loadVendor(function () {
          if (done) done(ps.ready);
        });
      });
    },

    /* 官方 vendor（加密 jsxbin）：多图层上色靠它的智能填充。
       顺序照仓库 core/ps/init.ts：先 evalFile，再注入环境变量，最后探调度宿主。 */
    loadVendor: function (done) {
      cs.evalScript('$.evalFile("' + extRoot + '/jsx/vendor.jsx")', function (vres) {
        log('VENDOR-LOAD => ' + vres);
        if (vres === 'EvalScript error.') {
          ps.vendorReady = false;
          if (done) done(false);
          return;
        }
        cs.evalScript("Sys_setSystemEnvInfo('" + JSON.stringify(PS_ENV) + "')", function (eres) {
          log('VENDOR-ENV => ' + eres);
          cs.evalScript('typeof ps_onJsx', function (t) {
            ps.vendorReady = (String(t).indexOf('function') >= 0);
            log('VENDOR-DISPATCH => ' + t);
            if (done) done(ps.vendorReady);
          });
        });
      });
    },

    /* 调度通道：官方 jsx 的统一入口 ps_onJsx({f,arr,n})。
       直接调 ys_* 会报「缺少必需值」，必须经它转发。 */
    dispatch: function (fn, args, label, done) {
      var payload = { f: fn, arr: args };
      if (label) payload.n = label;
      var json = JSON.stringify(payload).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var src = "ps_onJsx('" + json + "')";
      cs.evalScript(src, function (res) {
        log('DISPATCH ' + fn + ' => ' + res);
        if (done) done(res);
      });
    },

    call: function (fn, args, done) {
      var src = fn + '(' + (args || '') + ')';
      try {
        cs.evalScript(src, function (res) {
          log('CALL ' + src.slice(0, 90) + ' => ' + res);
          if (done) done(res);
        });
      } catch (e) {
        log('CALL-ERR ' + fn + ' ' + e.message);
        if (done) done(null);
      }
    },
    on: function (type, handler) {
      cs.addEventListener(type, handler);
    },
    /* 原 `emit(type, data)` 已删：唯一调用方是「发送到设计助理」（`sendColor` 事件），
       那个按钮本轮换成了自动填充开关，事件没有接收方了。要发事件时再加，别留着当死代码。 */
    /* 监听 PS 前景色变化 */
    watchForeground: function (handler) {
      var reg = new CSEvent('com.adobe.PhotoshopRegisterEvent', 'APPLICATION');
      reg.extensionId = cs.getExtensionID();
      reg.data = '1936028772';
      cs.dispatchEvent(reg);
      ps.on('com.adobe.PhotoshopJSONCallback' + cs.getExtensionID(), function (e) {
        if (String(e.data).indexOf('foregroundColor') === 65) handler();
      });
    }
  };

  /* ---------------- 状态 ---------------- */
  var PERSIST = {
    palette: FILES.palette,
    recent: FILES.recent,
    limit: FILES.limit,
    autoFill: FILES.autoFill
  };

  var listeners = [];

  var store = {
    state: { palette: [], recent: [], limit: LIMIT_DEF, autoFill: false },

    init: function () {
      var saved = parseInt(storage.readText(FILES.limit), 10);
      store.state.limit = (saved >= LIMIT_MIN && saved <= LIMIT_MAX) ? saved : LIMIT_DEF;
      store.state.palette = storage.readJson(FILES.palette, []);
      store.state.recent = storage.readJson(FILES.recent, []);
      store.state.autoFill = storage.readText(FILES.autoFill) === '1';
      return store.state;
    },

    get: function (key) {
      return store.state[key];
    },

    /* 唯一写入口：改内存 + 落盘 + 通知 */
    set: function (patch) {
      Object.keys(patch).forEach(function (key) {
        store.state[key] = patch[key];
        if (!PERSIST[key]) return;
        if (key === 'limit') storage.writeText(PERSIST[key], String(patch[key]));
        /* 开关存 '1' / '0'：`writeJson(true)` 写出的是 'true'，与 init 的判据对不上 */
        else if (key === 'autoFill') storage.writeText(PERSIST[key], patch[key] ? '1' : '0');
        else storage.writeJson(PERSIST[key], patch[key]);
      });
      listeners.forEach(function (fn) { fn(store.state); });
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) { return f !== fn; });
      };
    }
  };

  /* ---------------- 导出 ---------------- */
  global.Seban = {
    cs: cs,
    log: log,
    storage: storage,
    color: color,
    ps: ps,
    store: store,
    files: FILES,
    limit: { min: LIMIT_MIN, max: LIMIT_MAX, def: LIMIT_DEF }
  };
})(window);
