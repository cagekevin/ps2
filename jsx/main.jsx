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
