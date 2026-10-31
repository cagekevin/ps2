/*
 * 猫猫设计工具 · PS 侧能力
 * 命名约定：mm_<域>_<动作>，与 src/core/ps/* 一一对应。
 * 返回值：'ok' / 'no-doc' / 'not-shape' / 'unknown:<kind>' / 'error:<message>'
 * 所有异常都写 %TEMP%\maomao-jsx.log，不吞错。
 */

function mm_s(id) { return stringIDToTypeID(id); }
function mm_c(id) { return charIDToTypeID(id); }

/* ---------------- 日志 ---------------- */

function mm_log(message) {
	/* 日志属「尽力而为」：写不进去也不许影响业务，吞掉是故意的（刀 4 例外） */
	try {
		var file = new File(Folder.temp.fsName + "/maomao-jsx.log");
		file.encoding = "UTF8";
		file.open("a");
		file.writeln((new Date()).toString() + " | " + message);
		file.close();
	} catch (e) { }
}

/** 统一异常边界：任何异常都转成 error:xxx 并落日志 */
function mm_safe(name, fn) {
	try {
		return fn();
	} catch (e) {
		mm_log(name + " ERROR: " + e.message + " @line " + e.line);
		return "error:" + e.message;
	}
}

/* ---------------- 图层 ---------------- */

/**
 * 图层类型判定：唯一判定处，getKind / getState 共用，不各写一套。
 *
 * **组必须先按 `typename` 判**：`LayerSet` 没有 `kind` 属性，读出来是 `undefined`，
 * `String(undefined)` = `"undefined"` 匹配不到任何分支 → 组永远落 `unknown:undefined`。
 * 真机 2026-10-30 自建文档实测：`{"undefined":1,...}` 里那个 1 就是组。
 */
function mm_layer_kindOf(layer) {
	if (layer.typename === "LayerSet") return "group";

	var kindName = String(layer.kind);
	if (kindName.indexOf("TEXT") >= 0) return "text";
	if (kindName.indexOf("SOLIDFILL") >= 0) return "shape";
	if (kindName.indexOf("SMARTOBJECT") >= 0) return "smartObject";
	if (kindName.indexOf("NORMAL") >= 0) return "normal";
	return "unknown:" + kindName;
}

/**
 * 一次调用同时拿类型和名称：'kind|name'。
 * 图层读取的唯一入口（前端 core/ps/layer.getLayerState 轮询用）。
 * 名称里可能含 '|'，解析时只切第一个。
 */
function mm_layer_getState() {
	return mm_safe("mm_layer_getState", function () {
		if (!app.documents.length) return "no-doc";
		var layer = app.activeDocument.activeLayer;
		return mm_layer_kindOf(layer) + "|" + layer.name;
	});
}

/**
 * 当前选中的图层数量：'3'。
 *
 * **逐字照抄官方明文实现** `sb_DL_HuoQuDangQianTuCengShu`
 * （`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx:370-381`，色板面板 jsx）。官方取选中数走的
 * 就是 `targetLayers`，那份 768 行的明文 jsx 里 `activeLayers` 出现 0 次 ——
 * 旧实现用 `app.activeDocument.activeLayers.length`，本机该属性不存在（返回 `undefined`），
 * 取 `.length` 必抛「undefined 不是对象」。
 *
 * 单选顶层图层时官方也没有 `targetLayers` 键，它按 `activeLayer.itemIndex` 计 1，这里同样返 1。
 *
 * 为什么不并进 `mm_layer_getState`：那个被 `layer-watcher` 每 800ms 调用一次，
 * 改它的返回协议，新旧 jsx 混用时会静默解析错；单独一个函数缺失时探测能直接发现。
 * 「按间距分布」这类需要多选的能力用它当前置。
 */
function mm_layer_getSelection() {
	return mm_safe("mm_layer_getSelection", function () {
		if (!app.documents.length) return "no-doc";

		var ref = new ActionReference();
		var args = new ActionDescriptor();
		ref.putProperty(mm_c("Prpr"), mm_s("targetLayers"));
		ref.putEnumerated(mm_c("Dcmn"), mm_c("Ordn"), mm_c("Trgt"));
		args.putReference(mm_c("null"), ref);
		var desc = executeAction(mm_c("getd"), args, DialogModes.NO);

		if (!desc.hasKey(mm_s("targetLayers"))) return "1";
		return String(desc.getList(mm_s("targetLayers")).count);
	});
}

/* ---------------- 样式：形状填充 / 线框色 ---------------- */

/*
 * 应用颜色**不在这里**：走 vendor 的 `ys_useStyleColor`（见 `core/ps/style.ts` 的
 * `applyStyleColor`），一次处理所有选中图层，单选多选同一个调用。
 *
 * 别在本文件再写一份上色：色板面板那份 jsx 只处理单选（`iTuCengGeShu == 1` 才上色），
 * 抄过来多选就静默不上色，而且前端拿不到「没生效」的信号。
 *
 * 本段只留「形状填充 / 线框色」：它们只作用于活动层的形状，与选中数量无关。
 */

/**
 * 形状图层填充/描边色。
 * bXian = 线框开关，bTian = 填充开关，iCuXi = 粗细，
 * xR/xG/xB = 线框色，tR/tG/tB = 填充色；-1 表示该项不改。
 */
function mm_style_setShapeColor(bXian, bTian, iCuXi, xR, xG, xB, tR, tG, tB) {
	var d1 = new ActionDescriptor();
	var r1 = new ActionReference();
	var d2 = new ActionDescriptor();
	var d3 = new ActionDescriptor();

	r1.putEnumerated(mm_s("contentLayer"), mm_c("Ordn"), mm_c("Trgt"));
	d1.putReference(mm_s("null"), r1);

	if (typeof bXian === "boolean") d3.putBoolean(mm_s("strokeEnabled"), bXian);
	if (typeof bTian === "boolean") d3.putBoolean(mm_s("fillEnabled"), bTian);

	d3.putInteger(mm_s("strokeStyleVersion"), 2);

	if (iCuXi !== -1 && typeof xR !== "undefined") {
		d3.putUnitDouble(mm_s("strokeStyleLineWidth"), mm_c("#Pxl"), iCuXi);
	}

	if (xR !== -1 && typeof xR !== "undefined") {
		var strokeColor = new ActionDescriptor();
		var strokeRgb = new ActionDescriptor();
		strokeRgb.putDouble(mm_s("red"), xR);
		strokeRgb.putDouble(mm_s("grain"), xG);
		strokeRgb.putDouble(mm_s("blue"), xB);
		strokeColor.putObject(mm_c("Clr "), mm_c("RGBC"), strokeRgb);
		d3.putObject(mm_s("strokeStyleContent"), mm_s("solidColorLayer"), strokeColor);
	}

	if (tR !== -1 && typeof tR !== "undefined") {
		var fillColor = new ActionDescriptor();
		var fillRgb = new ActionDescriptor();
		fillRgb.putDouble(mm_s("red"), tR);
		fillRgb.putDouble(mm_s("grain"), tG);
		fillRgb.putDouble(mm_s("blue"), tB);
		fillColor.putObject(mm_c("Clr "), mm_c("RGBC"), fillRgb);
		d2.putObject(mm_c("FlCn"), mm_s("solidColorLayer"), fillColor);
	}

	d2.putObject(mm_s("strokeStyle"), mm_s("strokeStyle"), d3);
	d1.putObject(mm_c("T   "), mm_s("shapeStyle"), d2);
	executeAction(mm_c("setd"), d1, DialogModes.NO);
}


/**
 * 解析颜色参数（项里的 color 字段，或直接的色值对象）。
 * 返回 SolidColor；参数不对返回 null。
 */
function mm_style_parseColor(param) {
	var item = JSON.parse(param);
	var src = item && item.color ? item.color : item;
	if (!src) return null;

	var color = new SolidColor();
	if (app.activeDocument.mode === DocumentMode.CMYK) {
		color.cmyk.cyan = Number(src.c) || 0;
		color.cmyk.magenta = Number(src.m) || 0;
		color.cmyk.yellow = Number(src.y) || 0;
		color.cmyk.black = Number(src.k) || 0;
	} else {
		color.rgb.hexValue = String(src.hex || "000000");
	}
	return color;
}

/**
 * 智能填充形状（ctrl + 点色块）：只改填充色，不动描边。
 * 移植自色板面板 DL_SheZhiXingZhuang 的填充分支。
 */
function mm_style_applyShapeFill(param) {
	return mm_safe("mm_style_applyShapeFill", function () {
		if (!app.documents.length) return "no-doc";

		var layer = app.activeDocument.activeLayer;
		if (layer.kind !== LayerKind.SOLIDFILL) return "not-shape";

		var color = mm_style_parseColor(param);
		if (!color) return "error:参数缺少 color";

		mm_style_setShapeColor(undefined, true, -1, -1, -1, -1,
			Math.round(color.rgb.red), Math.round(color.rgb.green), Math.round(color.rgb.blue));
		return "ok";
	});
}

/**
 * 设线框色（shift + 点色块）：只改描边色，不动填充。
 */
function mm_style_applyBorderColor(param) {
	return mm_safe("mm_style_applyBorderColor", function () {
		if (!app.documents.length) return "no-doc";

		var layer = app.activeDocument.activeLayer;
		if (layer.kind !== LayerKind.SOLIDFILL) return "not-shape";

		var color = mm_style_parseColor(param);
		if (!color) return "error:参数缺少 color";

		mm_style_setShapeColor(true, undefined, -1,
			Math.round(color.rgb.red), Math.round(color.rgb.green), Math.round(color.rgb.blue), -1, -1, -1);
		return "ok";
	});
}

/**
 * 取当前前景色，转成库项格式。
 * 移植自色板面板 sb_GetColorObject / sb_ZhuanHuanYanSeDuiXiang（main.jsx:110-113 / 298-309）。
 * 返回 JSON：{ name: "未命名", color: { hex, c, m, y, k } }
 */
function mm_style_getForegroundColor() {
	return mm_safe("mm_style_getForegroundColor", function () {
		var c = app.foregroundColor;
		return JSON.stringify({
			name: "未命名",
			color: {
				hex: c.rgb.hexValue,
				c: Math.round(c.cmyk.cyan),
				m: Math.round(c.cmyk.magenta),
				y: Math.round(c.cmyk.yellow),
				k: Math.round(c.cmyk.black)
			}
		});
	});
}

/* ---------------- 批量文字：新建 / 改字 ---------------- */

/*
 * 两个入口各自一次 evalScript，循环全在 jsx 内（`CONVENTIONS` §8：批量不许前端循环调用）。
 * 撤销组用 `suspendHistory`，参数走 `$.global` —— 第二个参数只能是脚本字符串。
 *
 * 两个「一条历史」的写函数把补丁/配置放全局，再由 `mm_text_doWrite` / `mm_text_doCreate`
 * 在历史组里执行；执行完把报告写回全局，外层函数取出来 return。
 *
 * 【待核实】写这段的机器上没装 PS，整段运行时行为一次都没跑过。四条按 `docs/plan/04`
 * §6.2 的真机清单验：
 *   1. `mm_text_selectedIndexes` 的 `getIndex` 与 `mm_text_walkLayers` 的摊平下标是否同序
 *      （不同序的表现：选 2 层却读出别的层 —— 越界时这里返回空表，宁可空也不猜）
 *   2. `suspendHistory` 的字符串参数能不能访问 `$.global` 上的补丁与报告
 *      （不行的表现：报告永远是 null → 返回 `{ ok: 0 }`，但图层其实已经改了）
 *   3. 第一层不设 `position` 时到底落在哪、相对堆叠的 1.6 倍行距够不够
 *   4. `item.font` 设不上时是抛异常还是静默（现在只 catch 并置 `fontMissing`）
 */

/** 深度优先摊平：组自己先入列，再进子层（顺序 = 图层面板从上到下） */
function mm_text_walkLayers(parent, out) {
	var layers = parent.layers;
	for (var i = 0; i < layers.length; i++) {
		var layer = layers[i];
		out.push(layer);
		if (layer.typename === "LayerSet") mm_text_walkLayers(layer, out);
	}
}

/**
 * PS 里当前选中的图层序号。
 *
 * 只用 `getIndex`（§10.2 实测可用）；`getIdentifier` 在本机取不到 id，不要换。
 * 返回的序号与 `mm_text_walkLayers` 的摊平下标是否一致 **UNVERIFIED**，
 * 所以调用方对越界一律当「没读到」处理，绝不猜。
 */
function mm_text_selectedIndexes() {
	var ref = new ActionReference();
	ref.putProperty(mm_c("Prpr"), mm_s("targetLayers"));
	ref.putEnumerated(mm_c("Dcmn"), mm_c("Ordn"), mm_c("Trgt"));
	var args = new ActionDescriptor();
	args.putReference(mm_c("null"), ref);
	var desc = executeAction(mm_c("getd"), args, DialogModes.NO);
	if (!desc.hasKey(mm_s("targetLayers"))) return [];

	var list = desc.getList(mm_s("targetLayers"));
	var out = [];
	for (var i = 0; i < list.count; i++) {
		out.push(list.getReference(i).getIndex(mm_c("Lyr ")));
	}
	return out;
}

/**
 * 读文字层：`scope` 为 `"selection"` 时只取选中集合里的文字层，其它层静默过滤。
 * → `{ layers: [{ id, name, text, locked }] }`；没文档返回 `no-doc`，空表返回空数组。
 */
function mm_text_readAll(scope) {
	return mm_safe("mm_text_readAll", function () {
		if (!app.documents.length) return "no-doc";

		var all = [];
		mm_text_walkLayers(app.activeDocument, all);

		var picked = null;
		if (scope === "selection") {
			var indexes = mm_text_selectedIndexes();
			if (!indexes.length) return { layers: [] };
			for (var k = 0; k < indexes.length; k++) {
				if (indexes[k] < 0 || indexes[k] >= all.length) return { layers: [] };
			}
			picked = indexes;
		}

		var layers = [];
		for (var i = 0; i < all.length; i++) {
			if (picked && !mm_text_hasIndex(picked, i)) continue;
			var layer = all[i];
			if (mm_layer_kindOf(layer) !== "text") continue;
			layers.push({
				id: String(layer.id),
				name: layer.name,
				text: layer.textItem.contents,
				locked: layer.allLocked === true
			});
		}
		return { layers: layers };
	});
}

function mm_text_hasIndex(list, value) {
	for (var i = 0; i < list.length; i++) {
		if (list[i] === value) return true;
	}
	return false;
}

/** 历史组里真正写字的那一步（只碰 `contents`，样式一个都不动） */
function mm_text_doWrite() {
	var patches = $.global.__mm_textPatches || [];
	var all = [];
	mm_text_walkLayers(app.activeDocument, all);

	var failed = [];
	for (var p = 0; p < patches.length; p++) {
		var target = null;
		for (var i = 0; i < all.length; i++) {
			if (String(all[i].id) === String(patches[p].id)) {
				target = all[i];
				break;
			}
		}
		if (!target || mm_layer_kindOf(target) !== "text" || target.allLocked === true) {
			failed.push({ id: patches[p].id, reason: "missing-or-locked" });
			continue;
		}
		try {
			target.textItem.contents = patches[p].text;
		} catch (e) {
			failed.push({ id: patches[p].id, reason: e.message });
		}
	}
	$.global.__mm_textReport = { ok: patches.length - failed.length, failed: failed };
}

/** 批量写回：`[{ id, text }]` → `{ ok, failed: [{ id, reason }] }`，一条历史 */
function mm_text_writeAll(patchesJson) {
	return mm_safe("mm_text_writeAll", function () {
		if (!app.documents.length) return "no-doc";

		var patches = JSON.parse(patchesJson);
		if (!patches || !patches.length) return { ok: 0, failed: [] };

		$.global.__mm_textPatches = patches;
		$.global.__mm_textReport = null;
		app.activeDocument.suspendHistory("批量文字", "mm_text_doWrite()");

		var report = $.global.__mm_textReport || { ok: 0, failed: [] };
		$.global.__mm_textPatches = null;
		$.global.__mm_textReport = null;
		return report;
	});
}

/**
 * 历史组里真正建层的那一步。
 *
 * 落点：**第一层不设坐标**，用 PS 新建文字层的默认位置（用户实测：拖入图片就落在视图正中，
 * 新建文字同理）；后面的层相对第一层按字号往下排。这样不用去猜「视图中心」怎么算。
 * 字号序列由前端算好传进来（`domain/text-batch.createSizes`），jsx 不再算第二份公式。
 */
function mm_text_doCreate() {
	var cfg = $.global.__mm_textCreate;
	var doc = app.activeDocument;
	var report = { ok: 0, fontMissing: false };
	var startX = 0;
	var lastY = 0;

	for (var i = 0; i < cfg.lines.length; i++) {
		var layer = doc.artLayers.add();
		layer.kind = LayerKind.TEXT;
		var item = layer.textItem;
		item.kind = TextType.POINTTEXT;
		item.contents = cfg.lines[i];
		item.size = UnitValue(cfg.sizes[i], "pt");
		item.justification = mm_text_justification(cfg.align);

		if (cfg.font && cfg.font.hjm) {
			try {
				item.font = cfg.font.hjm;
			} catch (e) {
				report.fontMissing = true;
			}
		}

		if (i === 0) {
			startX = item.position[0];
			lastY = item.position[1];
		} else {
			/* 上一行字号 × 1.6（1.2 行高 + 0.4 间隔）就是下一行的基线 */
			lastY = lastY + cfg.sizes[i - 1] * 1.6;
			item.position = [startX, lastY];
		}
		report.ok += 1;
	}
	$.global.__mm_textCreateReport = report;
}

function mm_text_justification(align) {
	if (align === 1) return Justification.CENTER;
	if (align === 2) return Justification.RIGHT;
	return Justification.LEFT;
}

/** 新建 N 层：`{ lines, sizes, font: { hjm }, align }` → `{ ok, fontMissing }`，一条历史 */
function mm_text_createAll(configJson) {
	return mm_safe("mm_text_createAll", function () {
		if (!app.documents.length) return "no-doc";

		var cfg = JSON.parse(configJson);
		if (!cfg || !cfg.lines || !cfg.lines.length) return { ok: 0, fontMissing: false };

		$.global.__mm_textCreate = cfg;
		$.global.__mm_textCreateReport = null;
		app.activeDocument.suspendHistory("批量文字：新建", "mm_text_doCreate()");

		var report = $.global.__mm_textCreateReport || { ok: 0, fontMissing: false };
		$.global.__mm_textCreate = null;
		$.global.__mm_textCreateReport = null;
		return report;
	});
}

/* ---------------- 诊断 ---------------- */

/**
 * 探明官方 jsx 的依赖情况。
 * 返回 JSON：哪些函数存在、官方配置在不在、cyAutoFillColor 的实际值。
 * 只读，不改任何文件。
 */
function mm_diag_vendor() {
	return mm_safe("mm_diag_vendor", function () {
		var userData = Folder.userData.fsName;
		var setPath = userData + "/SheJiZhuLi/sj_set.json";
		var ifacePath = userData + "/SheJiZhuLi/sj_interfaceSet.ini";

		var out = {
			dispatch: typeof ps_onJsx,
			useStyleColor: typeof ys_useStyleColor,
			useGradient: typeof ys_useGradient,
			btnUseStyle: typeof ps_ysBtnUseStyle,
			setForegroundColor: typeof ys_setForegroundColor,
			useShapeFill: typeof ys_useShapeFill,
			/* 动作页（05）用：jsxbin 里静态搜不到，只能运行期探 */
			callAction: typeof dz_callAction,
			getActionList: typeof dz_getActionList,
			configSet: new File(setPath).exists,
			configInterface: new File(ifacePath).exists,
			autoFillColor: null
		};

		try {
			var f = new File(setPath);
			if (f.exists) {
				f.encoding = "UTF8";
				f.open("r");
				var txt = f.read();
				f.close();
				var obj = JSON.parse(txt);
				out.autoFillColor = obj.cyAutoFillColor;
			}
		} catch (e) {
			out.autoFillColor = "read-error:" + e.message;
		}

		return JSON.stringify(out);
	});
}
