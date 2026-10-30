/*
 * 色板工具本地版 · Photoshop 侧
 * ------------------------------------------------------------
 * 与前端约定：颜色一律用字符串 'hex|c|m|y|k' 传递，
 * 不需要 JSON，也不需要任何网络/登录信息。
 *
 * 多选上色：走官方 vendor（jsx/vendor.jsx）的智能填充，js/app.js 经调度入口 ps_onJsx
 * 调 ys_useStyleColor —— 官方色板工具用的同一个函数，官方主面板也只是转发同一个调用。
 * 本文件只保留面板自己还要用的能力。
 */

function sbS(id) { return stringIDToTypeID(id); }
function sbC(id) { return charIDToTypeID(id); }

/* ---------------- 颜色编解码 ---------------- */

function sbEncode(c) {
	return c.rgb.hexValue + '|' +
		Math.round(c.cmyk.cyan) + '|' +
		Math.round(c.cmyk.magenta) + '|' +
		Math.round(c.cmyk.yellow) + '|' +
		Math.round(c.cmyk.black);
}

function sbGetForegroundColor() {
	if (!app.documents.length) return '';
	return sbEncode(app.foregroundColor);
}

/* ---------------- 取图层颜色 ---------------- */
function sbGetLayerColor() {
	if (!app.documents.length) return '';
	var lyr = app.activeDocument.activeLayer;

	try {
		if (lyr.kind == LayerKind.TEXT) return sbEncode(lyr.textItem.color);
	} catch (e) { }

	try {
		if (lyr.kind == LayerKind.SOLIDFILL) {
			var ref = new ActionReference();
			ref.putEnumerated(sbS('contentLayer'), sbS('ordinal'), sbS('targetEnum'));
			var desc = executeActionGet(ref);
			var list = desc.getList(sbS('list'));
			var col = list.getObjectValue(0).getObjectValue(sbS('color'));
			var c = new SolidColor();
			c.rgb.red = col.getDouble(sbS('red'));
			c.rgb.green = col.getDouble(sbS('grain'));
			c.rgb.blue = col.getDouble(sbS('blue'));
			return sbEncode(c);
		}
	} catch (e) { }

	return '';
}

/* ---------------- 取色（ctrl+左键改色） ---------------- */
function sbPickColor() {
	if (!app.documents.length) return '';
	if (app.showColorPicker()) return sbEncode(app.foregroundColor);
	return '';
}

/* ---------------- 形状图层 ---------------- */
function sbShapeInfo() {
	var info = { hasFill: false, hasStroke: false, fill: null, stroke: null };
	try {
		var ref = new ActionReference();
		ref.putEnumerated(sbS('contentLayer'), sbS('ordinal'), sbS('targetEnum'));
		var desc = executeActionGet(ref);

		try {
			var list = desc.getList(sbS('list'));
			var col = list.getObjectValue(0).getObjectValue(sbS('color'));
			info.fill = {
				r: col.getDouble(sbS('red')),
				g: col.getDouble(sbS('grain')),
				b: col.getDouble(sbS('blue'))
			};
			info.hasFill = true;
		} catch (e) { }

		try {
			var ssi = desc.getObjectValue(sbS('AGMStrokeStyleInfo'));
			info.hasStroke = ssi.getBoolean(sbS('strokeEnabled'));
			info.hasFill = ssi.getBoolean(sbS('fillEnabled'));
			var sc = ssi.getObjectValue(sbS('strokeStyleContent')).getObjectValue(sbS('color'));
			info.stroke = {
				r: sc.getDouble(sbS('red')),
				g: sc.getDouble(sbS('grain')),
				b: sc.getDouble(sbS('blue'))
			};
		} catch (e) { }
	} catch (e) { }
	return info;
}

function sbShapeStyle(bXian, bTian, iCuXi, xR, xG, xB, tR, tG, tB) {
	var d1 = new ActionDescriptor();
	var r1 = new ActionReference();
	var style = new ActionDescriptor();
	var inner = new ActionDescriptor();

	r1.putEnumerated(sbS('contentLayer'), sbC('Ordn'), sbC('Trgt'));
	d1.putReference(sbS('null'), r1);

	if (typeof bXian == 'boolean') inner.putBoolean(sbS('strokeEnabled'), bXian);
	if (typeof bTian == 'boolean') inner.putBoolean(sbS('fillEnabled'), bTian);
	inner.putInteger(sbS('strokeStyleVersion'), 2);

	if (iCuXi != -1 && typeof xR != 'undefined') {
		inner.putUnitDouble(sbS('strokeStyleLineWidth'), sbC('#Pxl'), iCuXi);
	}

	if (xR != -1 && typeof xR != 'undefined') {
		var sc = new ActionDescriptor();
		var scColor = new ActionDescriptor();
		scColor.putDouble(sbS('red'), xR);
		scColor.putDouble(sbS('grain'), xG);
		scColor.putDouble(sbS('blue'), xB);
		sc.putObject(sbC('Clr '), sbC('RGBC'), scColor);
		inner.putObject(sbS('strokeStyleContent'), sbS('solidColorLayer'), sc);
	}

	if (tR != -1 && typeof tR != 'undefined') {
		var fc = new ActionDescriptor();
		var fcColor = new ActionDescriptor();
		fcColor.putDouble(sbS('red'), tR);
		fcColor.putDouble(sbS('grain'), tG);
		fcColor.putDouble(sbS('blue'), tB);
		fc.putObject(sbC('Clr '), sbC('RGBC'), fcColor);
		style.putObject(sbC('FlCn'), sbS('solidColorLayer'), fc);
	}

	style.putObject(sbS('strokeStyle'), sbS('strokeStyle'), inner);
	d1.putObject(sbC('T   '), sbS('shapeStyle'), style);
	executeAction(sbC('setd'), d1, DialogModes.NO);
}

/* 去填充 / 去线框 */
function sbSetShape(mode) {
	if (!app.documents.length) return 'no-doc';
	if (app.activeDocument.activeLayer.kind != LayerKind.SOLIDFILL) return 'not-shape';

	var d = new ActionDescriptor();
	var r = new ActionReference();
	var style = new ActionDescriptor();
	var inner = new ActionDescriptor();

	r.putEnumerated(sbS('contentLayer'), sbC('Ordn'), sbC('Trgt'));
	d.putReference(sbC('null'), r);

	inner.putInteger(sbS('strokeStyleVersion'), 2);
	if (mode === 'stroke') inner.putBoolean(sbS('strokeEnabled'), false);
	else inner.putBoolean(sbS('fillEnabled'), false);

	style.putObject(sbS('strokeStyle'), sbS('strokeStyle'), inner);
	d.putObject(sbC('T   '), sbS('shapeStyle'), style);
	executeAction(sbC('setd'), d, DialogModes.NO);
	return 'ok';
}

/* 填充 / 线框颜色互换 */
function sbSwapStrokeFill() {
	if (!app.documents.length) return 'no-doc';
	if (app.activeDocument.activeLayer.kind != LayerKind.SOLIDFILL) return 'not-shape';

	var info = sbShapeInfo();
	if (!info.fill && !info.stroke) return 'no-color';

	var fill = info.fill || info.stroke;
	var stroke = info.stroke || info.fill;

	sbShapeStyle(true, true, -1, stroke.r, stroke.g, stroke.b, fill.r, fill.g, fill.b);
	return 'ok';
}
