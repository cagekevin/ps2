/*
 * 猫猫设计工具 · PS 侧能力
 * 命名约定：mm_<域>_<动作>，与 src/core/ps/* 一一对应。
 * 返回值：'ok' / 'no-doc' / 'not-shape' / 'unknown:<kind>' / 'error:<message>'
 * 所有异常都写 %TEMP%\maomao-jsx.log，不吞错。
 *
 * 【新增一条 PS 能力，3 处必须同改 —— 改了这里就要回头看另外两处】
 *   ① jsx/main.jsx              写 function mm_<域>_<动作>（本文件）
 *   ② core/ps/capabilities.ts   加一行（fn / gate / channel / timeout / parse / require）
 *   ③ core/ps/init.ts           名字登记进 CORE_FUNCS（官方函数进 VENDOR_FUNCS）
 * 漏 ③ ⇒ `npm run check` 红（`init.test` 对账「表 → 清单」）；
 * ② ③ 一起漏 ⇒ 探测不到这个名字，真机报的是 `EvalScript error.` 而不是
 * `PS_UNREADY + detail: fn:xxx`，排查方向会跑偏。
 * 删能力三处一起删，逐项清单见 docs/JSX-通道与自写指南.md §6.2.1。
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

/**
 * 统一异常边界：任何异常都转成 error:xxx 并落日志。
 *
 * **返回值必须带上行号**：只回 `e.message` 时，前端拿到的是一句没有现场的宿主原话
 *（「您只能从最前面的文档复制图层。」），既不知道哪一步抛的，也无法和源码对位。
 * 格式固定 `error:<原话> @line <行号>`，由 `core/cep/bridge.callJsx` 拆成
 * reason（原话，给用户）与 detail（含行号，给排障）。改格式必须同步那处。
 */
function mm_safe(name, fn) {
	try {
		return fn();
	} catch (e) {
		mm_log(name + " ERROR: " + e.message + " @line " + e.line);
		return "error:" + e.message + " @line " + e.line;
	}
}

/* ---------------- 单位 ---------------- */

/**
 * `bounds` 的元素可能是 UnitValue 也可能是数字（PS 版本差异），统一取 px 数字。
 *
 * 真机 2026-11-02 实测 PS 26.7：`selection.bounds.toSource()` 打印 `[{}, {}, {}, {}]`，
 * 即 4 个 UnitValue；纯数字上调用 `.as()` 会抛，所以两种都得认。
 * 矢量化导出与 OCR 导出共用这一处，不要再写第二个。
 */
function mm_px(value) {
	return (typeof value === "number") ? value : value.as("px");
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
 * 另有 `mm_style_setAppColors`：设的是**应用**前景/背景色，不上任何图层，不算「第二份上色」。
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
		strokeColor.putObject(mm_c("Clr "), mm_c("RGBC"), mm_style_rgbDescriptor(xR, xG, xB));
		d3.putObject(mm_s("strokeStyleContent"), mm_s("solidColorLayer"), strokeColor);
	}

	if (tR !== -1 && typeof tR !== "undefined") {
		var fillColor = new ActionDescriptor();
		fillColor.putObject(mm_c("Clr "), mm_c("RGBC"), mm_style_rgbDescriptor(tR, tG, tB));
		d2.putObject(mm_c("FlCn"), mm_s("solidColorLayer"), fillColor);
	}

	d2.putObject(mm_s("strokeStyle"), mm_s("strokeStyle"), d3);
	d1.putObject(mm_c("T   "), mm_s("shapeStyle"), d2);
	executeAction(mm_c("setd"), d1, DialogModes.NO);
}

/**
 * RGB 子描述符：形状填充 / 线框 / 应用前景背景色三处共用这一份。
 * 键名是 `red` / `grain` / `blue`（官方 stringID，`grain` 就是绿，不是拼错）。
 */
function mm_style_rgbDescriptor(r, g, b) {
	var rgb = new ActionDescriptor();
	rgb.putDouble(mm_s("red"), r);
	rgb.putDouble(mm_s("grain"), g);
	rgb.putDouble(mm_s("blue"), b);
	return rgb;
}

/** 取参数里的一个 RGB 三元组；缺字段或不是数字返回 null（不猜默认色） */
function mm_style_rgbOf(value) {
	if (!value) return null;
	var r = Number(value.r);
	var g = Number(value.g);
	var b = Number(value.b);
	if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
	return { r: r, g: g, b: b };
}

/**
 * 设一个**应用级**颜色（`FrgC` 前景 / `BckC` 背景）。
 *
 * 为什么用描述符而不是 `app.foregroundColor = col`：后者在选中文字/形状图层时会把颜色
 * 一并写到图层上（vendor 的 `App_setForegrounddColor` 为了绕开它，每次建一个临时图层再删，
 * `jsx/vendor.jsx:6103`）——那会多出历史步。应用级属性直接走 `setd`，不经过图层。
 */
function mm_style_setAppColor(property, rgb) {
	var d = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putProperty(mm_c("Clr "), mm_c(property));
	d.putReference(mm_s("null"), ref);
	d.putObject(mm_c("T   "), mm_c("RGBC"), mm_style_rgbDescriptor(rgb.r, rgb.g, rgb.b));
	executeAction(mm_c("setd"), d, DialogModes.NO);
}

/**
 * 设应用前景色 + 背景色（随机配色按钮用），**不碰任何图层**。
 * 参数是 JSON 文本：`{"foreground":{"r":0-255,"g":…,"b":…},"background":{…}}`。
 * 返回 'ok' | 'error:…'；没有文档也能设，所以不判 `no-doc`。
 */
function mm_style_setAppColors(param) {
	return mm_safe("mm_style_setAppColors", function () {
		var pair = JSON.parse(param);
		var fg = mm_style_rgbOf(pair && pair.foreground);
		var bg = mm_style_rgbOf(pair && pair.background);
		if (!fg || !bg) return "error:参数缺少 foreground/background";

		mm_style_setAppColor("FrgC", fg);
		mm_style_setAppColor("BckC", bg);
		return "ok";
	});
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
 *   1. `mm_text_selectedIndexes` 的 `getIndex` 与 `mm_text_walkIndexOrder` 是否同序
 *      （同序才取得到选中层；不同序时越界会直接报 `error:`，不再返回空表装作没选中）
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
 * 深度优先摊平，**按 PS 图层序号的顺序**：从下往上，组内先子层、后组自己。
 *
 * 选中集合给的是 `getIndex("Lyr ")`（PS 自己的编号），数的就是这个顺序。
 * 拿它去索引「面板顺序」（从上往下、组在子层之前）的数组必然错位：
 * 选中的是文字层，取到的却是别的层，过滤掉非文字层之后就是一张空表。
 */
function mm_text_walkIndexOrder(parent, out) {
	var layers = parent.layers;
	for (var i = layers.length - 1; i >= 0; i--) {
		var layer = layers[i];
		if (layer.typename === "LayerSet") {
			mm_text_walkIndexOrder(layer, out);
			out.push(layer);
		} else {
			out.push(layer);
		}
	}
}

/**
 * PS 里当前选中的图层序号。
 *
 * 只用 `getIndex`（§10.2 实测可用）；`getIdentifier` 在本机取不到 id，不要换。
 * 这些序号要用 `mm_text_walkIndexOrder` 的数组去索引，不是 `mm_text_walkLayers` 的。
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

			/* 序号按 PS 的编号顺序取层，再记成 id 集合；输出仍走 `all`（面板顺序） */
			var psOrder = [];
			mm_text_walkIndexOrder(app.activeDocument, psOrder);
			picked = {};
			for (var k = 0; k < indexes.length; k++) {
				var target = psOrder[indexes[k]];
				/* 越界 = 两套编号又错开了：报出来，不假装「没选中文字层」 */
				if (!target) return "error:选中序号 " + indexes[k] + " 超出图层数 " + psOrder.length;
				picked[String(target.id)] = true;
			}
		}

		var layers = [];
		for (var i = 0; i < all.length; i++) {
			var layer = all[i];
			if (picked && !picked[String(layer.id)]) continue;
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
			/* PS 的换行是 `\r`：前端传过来的是 `\n`，不转就是「一行方块 / 不换行」 */
			target.textItem.contents = String(patches[p].text).replace(/\n/g, "\r");
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
 * 建一个文字层并填内容 / 字体：**全仓唯一建文字层的地方**（新建与 OCR 共用）。
 *
 * 只做两个调用方完全一样的那几行：`artLayers.add` → `kind = TEXT` →（可选）`textItem.kind`
 * → `contents` → `font`（设不上置 `report.fontMissing`）。
 * **位置 / 字号 / 颜色 / 对齐 / 命名一概不管**：新建按 pt 纵向堆叠、OCR 按画布 px 绝对定位，
 * 那是两套排版语义，硬合成一个函数就得带 `mode` 或一堆可选参数。
 *
 * `kind` 传 `null` = 不指定（保持 PS 默认），OCR 那一支就这么用。
 */
function mm_text_newLayer(parent, kind, content, font, report) {
	var layer = parent.artLayers.add();
	layer.kind = LayerKind.TEXT;

	var item = layer.textItem;
	if (kind) item.kind = kind;
	/* 同上：新建 / OCR 的段落也可能带 `\n`，PS 只认 `\r` */
	item.contents = String(content).replace(/\n/g, "\r");

	if (font) {
		try {
			item.font = font;
		} catch (e) {
			report.fontMissing = true;
		}
	}
	return layer;
}

/**
 * 纵向堆叠那一支（批量文字新建），在 suspendHistory 里跑。
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
		var layer = mm_text_newLayer(doc, TextType.POINTTEXT, cfg.lines[i], cfg.font && cfg.font.hjm, report);
		var item = layer.textItem;
		item.size = UnitValue(cfg.sizes[i], "pt");
		item.justification = mm_text_justification(cfg.align);

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

/**
 * 画布绝对坐标那一支（OCR），在 suspendHistory 里跑。
 *
 * 位置 / 字号 / 组结构全由前端（`domain/ocr`）算好；这里只建组、建层、设颜色与 px 单位，
 * 结束把单位恢复。建层本身走 `mm_text_newLayer`，与新建同一处。
 */
function mm_text_doCreateAbsolute() {
	var cfg = $.global.__mm_textCreate;
	var doc = app.activeDocument;
	var report = { ok: 0, fontMissing: false };

	var originalRuler = app.preferences.rulerUnits;
	var originalType = app.preferences.typeUnits;
	app.preferences.rulerUnits = Units.PIXELS;
	app.preferences.typeUnits = TypeUnits.PIXELS;

	try {
		var master = doc.layerSets.add();
		master.name = cfg.master;

		var black = new SolidColor();
		black.rgb.red = 0;
		black.rgb.green = 0;
		black.rgb.blue = 0;

		for (var g = 0; g < cfg.groups.length; g++) {
			var group = cfg.groups[g];
			var set = master.layerSets.add();
			set.name = group.name;

			for (var i = 0; i < group.layers.length; i++) {
				var spec = group.layers[i];
				/* 传的是**字体名**（`{ hjm }` 里的字符串），不是 `cfg.font` 对象本身 ——
				   传对象时 `item.font = {…}` 必抛，报告里就成了「字体没设上」 */
				var layer = mm_text_newLayer(set, null, spec.content, cfg.font && cfg.font.hjm, report);
				layer.name = spec.name;

				var item = layer.textItem;
				item.color = black;
				item.size = new UnitValue(spec.size, "px");
				item.position = [spec.left, spec.top];
				report.ok += 1;
			}
		}
	} finally {
		app.preferences.rulerUnits = originalRuler;
		app.preferences.typeUnits = originalType;
	}

	$.global.__mm_textCreateReport = report;
}

/**
 * 建文字层的**唯一入口**（批量文字新建 / OCR 共用）。
 *
 * 两种入参形状，判别位 `mode`（缺省 = 纵向堆叠）：
 *   `{ lines, sizes, font: { hjm }, align }`
 *   `{ mode: "absolute", master, font, groups: [{ name, layers: [{ name, content, left, top, size }] }] }`
 * → `{ ok, fontMissing }`，整次一条历史（撤销一步全撤）。
 */
function mm_text_createAll(configJson) {
	return mm_safe("mm_text_createAll", function () {
		if (!app.documents.length) return "no-doc";

		var cfg = JSON.parse(configJson);
		if (!cfg) return { ok: 0, fontMissing: false };

		var absolute = cfg.mode === "absolute";
		if (absolute ? !(cfg.groups && cfg.groups.length) : !(cfg.lines && cfg.lines.length)) {
			return { ok: 0, fontMissing: false };
		}

		$.global.__mm_textCreate = cfg;
		$.global.__mm_textCreateReport = null;
		app.activeDocument.suspendHistory(
			absolute ? "OCR 文字识别" : "批量文字：新建",
			absolute ? "mm_text_doCreateAbsolute()" : "mm_text_doCreate()"
		);

		var report = $.global.__mm_textCreateReport || { ok: 0, fontMissing: false };
		$.global.__mm_textCreate = null;
		$.global.__mm_textCreateReport = null;
		return report;
	});
}

/* ---------------- OCR：导出画布 / 按坐标建层 ---------------- */

/**
 * 选区外接矩形（px，已 clamp 到画布）；无选区 / 零尺寸返回 null。
 *
 * **无选区时 `selection.bounds` 抛异常**（不是返回整画布），所以「有没有选区」只有这一处判据。
 * clamp 是必须的：选区可以拉到画布外，`crop` 吃画布外矩形会直接抛错。
 * 零尺寸（< 1px）按无选区处理 —— PS 里画不出零宽选区，这个分支只兜异常输入，
 * 报成用户可见失败反而误导。
 */
function mm_ocr_selectionRect(doc) {
	var bounds;
	try {
		bounds = doc.selection.bounds;
	} catch (e) {
		return null;
	}
	if (!bounds || bounds.length !== 4) return null;

	var left = Math.max(0, mm_px(bounds[0]));
	var top = Math.max(0, mm_px(bounds[1]));
	var right = Math.min(doc.width.as("px"), mm_px(bounds[2]));
	var bottom = Math.min(doc.height.as("px"), mm_px(bounds[3]));

	if (right - left < 1 || bottom - top < 1) {
		mm_log("mm_ocr_exportImage: selection too small, fallback to whole canvas");
		return null;
	}
	return [left, top, right, bottom];
}

/**
 * 导出当前画布为 JPG（**合并可见图层**）；有像素选区时只导出选区。
 *
 * → `{ path, offset }`，`offset` 是裁切矩形左上角（px，文档坐标），无选区时为 0。
 * 识别回来的坐标是**图内坐标**，建层时加回 `offset` 才是文档坐标
 *（加法只在 `domain/ocr.toLayer` 做一次，这里只产出偏移）。
 *
 * `duplicate(name, true)` 的第二参数是 mergeLayersOnly：只留合成图，隐藏层不参与。
 * 这与用户眼睛看到的画面一致，也是原 jsx 的做法。
 *
 * 裁切在**副本**上做（`dup.crop`）：原文档的图层与选区一律不动。
 *
 * 与原 jsx 的两处差异：① 失败也把副本关掉（原实现 saveAs 抛错时副本会留在 PS 里，
 * 文档列表里多一个 temp_export）；② 单位切 px —— `selection.bounds` 与 `crop` 都按
 * 当前标尺单位解释，不切就可能把 300 当成 300cm 传进 crop
 *（与 `mm_text_doCreateAbsolute` 同一套「存 → 设 → finally 还原」）。
 */
function mm_ocr_exportImage(quality) {
	return mm_safe("mm_ocr_exportImage", function () {
		if (!app.documents.length) return "no-doc";

		var doc = app.activeDocument;
		var originalRuler = app.preferences.rulerUnits;
		app.preferences.rulerUnits = Units.PIXELS;

		var dup = null;
		try {
			/* 选区先读：副本带自己的选区状态，读了也不会更准，早读少一个中间态 */
			var area = mm_ocr_selectionRect(doc);

			var dir = new Folder(Folder.temp.fsName + "/ps_ocr_engine");
			if (!dir.exists) dir.create();

			var path = dir.fsName + "/temp_poster.jpg";
			if (File(path).exists) File(path).remove();

			dup = doc.duplicate("temp_export", true);
			app.activeDocument = dup;
			if (area) dup.crop(area);

			var options = new JPEGSaveOptions();
			options.quality = quality || 8;
			dup.saveAs(new File(path), options, true, Extension.LOWERCASE);

			return {
				path: path,
				offset: area ? { left: area[0], top: area[1] } : { left: 0, top: 0 }
			};
		} finally {
			if (dup) dup.close(SaveOptions.DONOTSAVECHANGES);
			app.activeDocument = doc;
			app.preferences.rulerUnits = originalRuler;
		}
	});
}

/* 建层不在这里：OCR 走 `mm_text_createAll` 的 `mode: "absolute"` 那一支，
   与「批量文字」共用 `mm_text_newLayer`。别再往本段加第二个建层函数。 */

/* ---------------- 矢量化：导出选中层 / 用路径点建形状 ---------------- */

/**
 * 导出**选中的那个图层**为白底 PNG（选中必须恰好 1 个）。
 *
 * → `{ path, exportWidth, exportHeight, bounds }`；`no-doc` / `need-one` / `skipped` / `error:…`
 *
 * **只导出图层本身，不导出整份画布**：3000×3000 的画布里放一个 300px 图标时，
 * 99% 的像素是白底，vtracer 要在上面做聚类，又慢又没必要；而且路径点全是画布坐标，
 * 后面没法按图层尺寸归一化。
 *
 * **长边小于 `targetEdge` 时先放大再存**（上限 `maxUpscale` 倍）：
 * vtracer 的曲线拟合按输入像素采样，300px 的圆角只有三十几个采样点，拟合出来会发方。
 * 只放大不缩小 —— 大图本来就能转好，缩小只会丢细节。
 *
 * 为什么铺白底：vtracer 把透明区当黑色，透明底会转出一整块黑（实测过）。
 */
function mm_vec_exportLayer(targetEdge, maxUpscale) {
	return mm_safe("mm_vec_exportLayer", function () {
		if (!app.documents.length) return "no-doc";
		if (mm_text_selectedIndexes().length !== 1) return "need-one";

		var doc = app.activeDocument;
		var target = doc.activeLayer;

		/*
		 * 单位必须切 px：下面用数字建文档 / 平移 / 缩放，而 `bounds` 与 `doc.width`
		 * 都是跟随标尺单位的 UnitValue —— 不切就可能把 300 当成厘米建出 300cm 的文档。
		 */
		var originalRuler = app.preferences.rulerUnits;
		var originalDialogs = app.displayDialogs;
		app.preferences.rulerUnits = Units.PIXELS;
		app.displayDialogs = DialogModes.NO;

		var temp = null;
		try {
			var box;
			try {
				box = target.bounds;
			} catch (boundsError) {
				/* 空图层 / 全透明：PS 连 bounds 都给不出，没有可转的内容。
				   原因仍要落一行日志 —— 这条路径只回「跳过」，不落日志就查不到是哪一层。 */
				mm_log("mm_vec_exportLayer bounds failed: " + boundsError.message);
				return "skipped";
			}

			var left = mm_px(box[0]);
			var top = mm_px(box[1]);
			var w = mm_px(box[2]) - left;
			var h = mm_px(box[3]) - top;
			if (!(w >= 1) || !(h >= 1)) return "skipped";

			var scale = targetEdge / Math.max(w, h);
			if (scale < 1) scale = 1;
			if (scale > maxUpscale) scale = maxUpscale;
			var ew = Math.max(1, Math.round(w * scale));
			var eh = Math.max(1, Math.round(h * scale));

			var dir = new Folder(Folder.temp.fsName + "/ps_vec_engine");
			if (!dir.exists) dir.create();
			var path = dir.fsName + "/temp_layer.png";
			if (File(path).exists) File(path).remove();

			temp = app.documents.add(w, h, doc.resolution, "vec_tmp", NewDocumentMode.RGB, DocumentFill.WHITE);

			/*
			 * **源文档必须先成为当前文档**：PS 跨文档 `duplicate` 只允许从「最前面的文档」复制，
			 * 否则抛「您只能从最前面的文档复制图层。」（真机 2026-11-02）。
			 * 新建 `temp` 后当前文档已经是 temp，`target` 却属于 doc —— 所以先把 doc 置前，
			 * 复制完再切回 temp 做平移 / 缩放 / flatten / save。顺序不能省。
			 */
			app.activeDocument = doc;
			var copy = target.duplicate(temp, ElementPlacement.PLACEATBEGINNING);
			app.activeDocument = temp;

			/* 平移到原点：临时文档只有图层那么大，不平移就会被裁掉一部分 */
			copy.translate(-left, -top);

			/* 尺寸不变时不重采样：多一次插值就是多一次模糊 */
			if (ew !== Math.round(w) || eh !== Math.round(h)) {
				temp.resizeImage(ew, eh, doc.resolution, ResampleMethod.BICUBIC);
			}

			temp.flatten();
			temp.saveAs(new File(path), new PNGSaveOptions(), true, Extension.LOWERCASE);

			return {
				path: path,
				exportWidth: temp.width.as("px"),
				exportHeight: temp.height.as("px"),
				bounds: { left: left, top: top, width: w, height: h }
			};
		} finally {
			if (temp) temp.close(SaveOptions.DONOTSAVECHANGES);
			app.activeDocument = doc;
			app.preferences.rulerUnits = originalRuler;
			app.displayDialogs = originalDialogs;
		}
	});
}

/**
 * 路径名：默认就用图层名，重名时递增成 `图层名_01` / `_02` …
 *
 * 不递增的话 PS 会自己改叫「礼盒 副本」「礼盒 副本 2」，用户认不出哪个是这次转的。
 */
function mm_vec_uniquePathName(base) {
	var doc = app.activeDocument;
	var used = {};
	for (var i = 0; i < doc.pathItems.length; i++) used[doc.pathItems[i].name] = true;

	if (!used[base]) return base;
	for (var n = 1; n < 100; n++) {
		var candidate = base + "_" + (n < 10 ? "0" + n : String(n));
		if (!used[candidate]) return candidate;
	}
	return base;
}

/** 建形状主体：在 suspendHistory 里跑，结果挂 `$.global.__mm_vecReport` */
function mm_vec_doReplace() {
	var payload = $.global.__mm_vecPayload;
	var doc = app.activeDocument;
	var target = doc.activeLayer;
	/* 名字在删除前读：形状层沿用原层名，用户才认得出哪一层被替换了 */
	var name = target.name;
	var pathItem;
	var report = { ok: 0 };

	/*
	 * ExtendScript 的路径只有**一种**建法：先把所有 `SubPathInfo` 攒成一个数组，
	 * 再一次性 `doc.pathItems.add(name, 数组)`。
	 * `pathItem.subPathItems` 是**只读集合**，没有 `.add()`（`pathPoints` 同理）——
	 * 原写法 `pathItem.subPathItems.add()` 必然抛「不是函数」（真机 2026-11-02，@line 646）。
	 * 数据链因此是：payload.subpaths → SubPathInfo[] → `pathItems.add`，中间不能追加。
	 */
	var subPaths = [];
	for (var s = 0; s < payload.subpaths.length; s++) {
		var spec = payload.subpaths[s];
		if (!spec || !spec.points || spec.points.length < 2) continue;

		var points = [];
		for (var p = 0; p < spec.points.length; p++) {
			var src = spec.points[p];
			var point = new PathPointInfo();
			point.anchor = [src.anchor[0], src.anchor[1]];
			point.leftDirection = [src.left[0], src.left[1]];
			point.rightDirection = [src.right[0], src.right[1]];
			/*
			 * 平滑点叫 **`SMOOTHPOINT`**，不是 `SMOOTH`：PS 26.7 上 `PointKind.SMOOTH`
			 * 一读就抛「无效枚举值」（真机 2026-11-02，@line 659）。
			 * 已用 COM 探针实测：`PointKind.SMOOTHPOINT` / `PointKind.CORNERPOINT` 有效，
			 * `ShapeOperation.SHAPEADD` 有效。
			 */
			point.kind = src.smooth ? PointKind.SMOOTHPOINT : PointKind.CORNERPOINT;
			points.push(point);
		}

		var sub = new SubPathInfo();
		sub.closed = spec.closed === true;
		/*
		 * `operation` **必须写**：ExtendScript 的 `SubPathInfo` 没有「默认 SHAPEADD」这回事，
		 * 不写就是未初始化，`pathItems.add` 当场抛「属性未初始化」（真机 2026-11-02，@line 683）。
		 * 与 `PointKind` 不同，`ShapeOperation` 这个枚举在本宿主上是有效的。
		 */
		sub.operation = ShapeOperation.SHAPEADD;
		sub.entireSubPath = points;
		subPaths.push(sub);
		report.ok += 1;
	}

	/* 一个子路径都没建成就不建层、不删原层：让调用方按 `ok: 0` 报「没有可转的形状」 */
	if (!subPaths.length) {
		mm_log("mm_vec_replaceWithPath got subs=" + payload.subpaths.length + " built=0");
		$.global.__mm_vecReport = report;
		return;
	}

	/*
	 * 路径名沿用图层名；重名时按 `图层名_01`、`_02` 递增（PS 自己会改叫「副本」，更难认）。
	 * **名字只在 `add` 时给一次**：`add` 之后再 `pathItem.name = …` 会抛
	 * 「命令"重命名"的参数当前是无效的」（真机 2026-11-02，@line 714）—— 建路径时名字已经生效。
	 */
	var pathName = mm_vec_uniquePathName(name);
	pathItem = doc.pathItems.add(pathName, subPaths);

	/*
	 * 落一条现场到 jsx 日志：前端算出的点数与 PS 实际建成的点数必须一致，
	 * 不一致就说明「传过去少了」或「PS 只建了一部分」—— 这两种的修法完全不同，
	 * 没有这行就只能靠猜（真机 2026-11-02：前端解析出 1167 点，PS 里只有 86 点）。
	 */
	mm_log(
		"mm_vec_replaceWithPath got subs=" + payload.subpaths.length +
		" built=" + subPaths.length +
		" added=" + pathItem.subPathItems.length +
		" points=" + pathItem.subPathItems[0].pathPoints.length
	);

	/* 先建新层再填充：`fillPath` 填的是当前层，直接填在原层上再删就一起没了 */
	var shapeLayer = doc.artLayers.add();
	shapeLayer.name = name;
	doc.activeLayer = shapeLayer;

	/*
	 * `fillPath` **只能无参调用**：PS 26.7 上传任何参数（颜色 / 混合模式 / 不透明度）
	 * 都会抛「用户取消了操作」，无参版本用当前前景色正常填充 —— COM 探针实测过四种形态
	 * （真机 2026-11-02，@line 713）。所以先把前景色设成目标色，填完再还原。
	 */
	var previousForeground = app.foregroundColor;
	var color = new SolidColor();
	color.rgb.red = payload.color.r;
	color.rgb.green = payload.color.g;
	color.rgb.blue = payload.color.b;
	app.foregroundColor = color;
	pathItem.fillPath();
	app.foregroundColor = previousForeground;

	target.remove();
	$.global.__mm_vecReport = report;
}

/**
 * 用前端解析好的路径点建形状层并删掉原图层：
 * `{ name, color: { r, g, b }, subpaths: [{ closed, points: [{ anchor, left, right, smooth }] }] }`
 * → `{ ok: N }`（N = 建成的子路径数）。
 *
 * 本函数**不算任何坐标**：SVG 的 `d` 解析在 `domain/vectorize`，这里只赋值。
 * 单位临时切 px（路径点用的是画布像素），结束恢复。
 */
function mm_vec_replaceWithPath(payloadJson) {
	return mm_safe("mm_vec_replaceWithPath", function () {
		if (!app.documents.length) return "no-doc";

		var payload = JSON.parse(payloadJson);
		if (!payload || !payload.subpaths || !payload.subpaths.length) return { ok: 0 };

		var originalRuler = app.preferences.rulerUnits;
		var originalType = app.preferences.typeUnits;
		/*
		 * 关掉模态框：建路径 / 填充这些调用在部分 PS 版本上会弹「存储路径」「是否替换」之类的窗口，
		 * 一次矢量化能被追问好几次（真机 2026-11-02）。脚本化操作不该打断用户，结束后原样恢复。
		 */
		var originalDialogs = app.displayDialogs;
		app.preferences.rulerUnits = Units.PIXELS;
		app.preferences.typeUnits = TypeUnits.PIXELS;
		app.displayDialogs = DialogModes.NO;

		$.global.__mm_vecPayload = payload;
		$.global.__mm_vecReport = null;
		try {
			app.activeDocument.suspendHistory("转为矢量形状", "mm_vec_doReplace()");
		} finally {
			app.preferences.rulerUnits = originalRuler;
			app.preferences.typeUnits = originalType;
			app.displayDialogs = originalDialogs;
			$.global.__mm_vecPayload = null;
		}

		var report = $.global.__mm_vecReport || { ok: 0 };
		$.global.__mm_vecReport = null;
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
