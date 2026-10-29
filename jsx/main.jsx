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

/** 图层类型判定：唯一判定处，getKind / getState 共用，不各写一套 */
function mm_layer_kindOf(layer) {
	var kindName = String(layer.kind);
	if (kindName.indexOf("TEXT") >= 0) return "text";
	if (kindName.indexOf("SOLIDFILL") >= 0) return "shape";
	if (kindName.indexOf("SMARTOBJECT") >= 0) return "smartObject";
	if (kindName.indexOf("GROUP") >= 0) return "group";
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
 * 为什么不并进 `mm_layer_getState`：那个被 `layer-watcher` 每 800ms 调用一次，
 * 改它的返回协议，新旧 jsx 混用时会静默解析错；单独一个函数缺失时探测能直接发现。
 * 「按间距分布」这类需要多选的能力用它当前置。
 */
function mm_layer_getSelection() {
	return mm_safe("mm_layer_getSelection", function () {
		if (!app.documents.length) return "no-doc";
		return String(app.activeDocument.activeLayers.length);
	});
}

/* ---------------- 样式：应用颜色 ---------------- */

/**
 * 移植自色板面板的明文实现（fz.FengZi3Hao/jsx/main.jsx:6-84，819 行那份）。
 *
 * 为什么不用 vendor 的 ys_useStyleColor：
 * 它在「自动填充」开关关闭时只改前景色、不碰图层，表现为「返回 1 但图层没变」。
 * 色板面板这套按图层类型分四路，是长期验证过的行为。
 *
 * 参数：JSON 字符串，形如 {"name":"...","color":{"hex","c","m","y","k"},"isFill":true}
 */

function mm_style_readFile(path) {
	var file = new File(path);
	if (!file.exists) return "";
	file.open("r");
	var text = file.read();
	file.close();
	return text;
}

/** 当前选中的图层数量；取不到按 1 处理 */
function mm_style_countTargets() {
	try {
		var ref = new ActionReference();
		var args = new ActionDescriptor();
		ref.putProperty(mm_c("Prpr"), mm_s("targetLayers"));
		ref.putEnumerated(mm_c("Dcmn"), mm_c("Ordn"), mm_c("Trgt"));
		args.putReference(mm_c("null"), ref);
		var result = executeAction(mm_c("getd"), args, DialogModes.NO);
		return result.getList(mm_s("targetLayers")).count;
	} catch (e) {
		return 1;
	}
}

function mm_style_lockTransparency() {
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putEnumerated(mm_c("Lyr "), mm_c("Ordn"), mm_c("Trgt"));
	desc.putReference(mm_c("null"), ref);
	var inner = new ActionDescriptor();
	inner.putBoolean(mm_s("protectTransparency"), true);
	desc.putObject(mm_s("layerLocking"), mm_s("layerLocking"), inner);
	executeAction(mm_s("applyLocking"), desc, DialogModes.NO);
}

function mm_style_unlockTransparency() {
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putEnumerated(mm_c("Lyr "), mm_c("Ordn"), mm_c("Trgt"));
	desc.putReference(mm_c("null"), ref);
	var inner = new ActionDescriptor();
	inner.putBoolean(mm_s("protectNone"), true);
	desc.putObject(mm_s("layerLocking"), mm_s("layerLocking"), inner);
	executeAction(mm_s("applyLocking"), desc, DialogModes.NO);
}

/** 填充前景色 */
function mm_style_fillForeground() {
	var desc = new ActionDescriptor();
	desc.putEnumerated(mm_c("Usng"), mm_c("FlCn"), mm_c("FrgC"));
	desc.putUnitDouble(mm_c("Opct"), mm_c("#Prc"), 100);
	desc.putEnumerated(mm_c("Md  "), mm_c("BlnM"), mm_c("Nrml"));
	desc.putBoolean(mm_c("PrsT"), true);
	executeAction(mm_c("Fl  "), desc, DialogModes.NO);
}

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

/** 图层样式颜色叠加（智能对象用） */
function mm_style_overlayColor(r, g, b) {
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putProperty(mm_c("Prpr"), mm_c("Lefx"));
	ref.putEnumerated(mm_c("Lyr "), mm_c("Ordn"), mm_c("Trgt"));
	desc.putReference(mm_c("null"), ref);

	var scale = new ActionDescriptor();
	scale.putUnitDouble(mm_c("Scl "), mm_c("#Prc"), 100);

	var solid = new ActionDescriptor();
	solid.putBoolean(mm_c("enab"), true);
	solid.putBoolean(mm_s("present"), true);
	solid.putBoolean(mm_s("showInDialog"), true);
	solid.putEnumerated(mm_c("Md  "), mm_c("BlnM"), mm_c("Nrml"));

	var rgb = new ActionDescriptor();
	rgb.putDouble(mm_c("Rd  "), r);
	rgb.putDouble(mm_c("Grn "), g);
	rgb.putDouble(mm_c("Bl  "), b);
	solid.putObject(mm_c("Clr "), mm_c("RGBC"), rgb);
	solid.putUnitDouble(mm_c("Opct"), mm_c("#Prc"), 100);

	scale.putObject(mm_c("SoFi"), mm_c("SoFi"), solid);
	desc.putObject(mm_c("T   "), mm_c("Lefx"), scale);
	executeAction(mm_c("setd"), desc, DialogModes.NO);
}

/**
 * 应用颜色：按图层类型分四路。
 * 返回 'ok' / 'no-doc' / 'skipped'（配置显式关闭）/ 'error:xxx'
 */
function mm_style_applyColor(param) {
	return mm_safe("mm_style_applyColor", function () {
		if (!app.documents.length) return "no-doc";

		var item = JSON.parse(param);
		var src = item && item.color ? item.color : item;
		if (!src) return "error:参数缺少 color";

		var color = new SolidColor();
		if (app.activeDocument.mode === DocumentMode.CMYK) {
			color.cmyk.cyan = Number(src.c) || 0;
			color.cmyk.magenta = Number(src.m) || 0;
			color.cmyk.yellow = Number(src.y) || 0;
			color.cmyk.black = Number(src.k) || 0;
		} else {
			color.rgb.hexValue = String(src.hex || "000000");
		}

		/* 同色规避：前景色没变化时「填充前景色」可能不触发 */
		if (color.rgb.hexValue === app.foregroundColor.rgb.hexValue) {
			var temp = new SolidColor();
			temp.rgb.hexValue = "f0ebe2";
			app.foregroundColor = temp;
		}
		app.foregroundColor = color;

		/* 配置闸门：只有显式 false 才跳过，配置缺失按开启处理 */
		var raw = mm_style_readFile(Folder.userData + "/SheJiZhuLi/sj_interfaceSet.ini");
		var cfg = {};
		try { cfg = JSON.parse(raw); } catch (e) { cfg = {}; }
		if (cfg.img_cya4 === false) return "skipped";

		/* 原版只在单选时处理，多选直接放过 */
		if (mm_style_countTargets() !== 1) return "ok";

		var layer = app.activeDocument.activeLayer;
		var kind = layer.kind;

		if (kind === LayerKind.NORMAL) {
			mm_style_lockTransparency();
			try {
				mm_style_fillForeground();
			} finally {
				mm_style_unlockTransparency();
			}
		} else if (kind === LayerKind.SOLIDFILL) {
			var hasFill = true;
			var hasStroke = false;
			/* 探测描边信息：老版本 PS / 非标准形状读不到 AGMStrokeStyleInfo，
			   读不到时按「有填充无描边」的默认走，不能因此中断整个上色 */
			try {
				var ref = new ActionReference();
				ref.putEnumerated(mm_s("contentLayer"), mm_s("ordinal"), mm_s("targetEnum"));
				var info = executeActionGet(ref).getObjectValue(mm_s("AGMStrokeStyleInfo"));
				hasStroke = info.getBoolean(mm_s("strokeEnabled"));
				hasFill = info.getBoolean(mm_s("fillEnabled"));
			} catch (e) { }

			if (hasFill || !hasStroke) {
				mm_style_setShapeColor(undefined, true, -1, -1, -1, -1,
					Math.round(color.rgb.red), Math.round(color.rgb.green), Math.round(color.rgb.blue));
			} else {
				mm_style_setShapeColor(true, undefined, -1,
					Math.round(color.rgb.red), Math.round(color.rgb.green), Math.round(color.rgb.blue), -1, -1, -1);
			}
		} else if (kind === LayerKind.SMARTOBJECT) {
			mm_style_overlayColor(
				app.foregroundColor.rgb.red,
				app.foregroundColor.rgb.green,
				app.foregroundColor.rgb.blue
			);
		} else if (kind === LayerKind.TEXT) {
			/* 文字图层改色：锁定/关联文字（如缺失字体）会抛，抛了就保持原色，
			   不能因为改色失败把前面的前景色设置回滚 */
			try { layer.textItem.color = color; } catch (e) { }
		}

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
