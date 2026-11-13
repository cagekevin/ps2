/*
 * 官方「稿定设计助理」PS 侧脚本（第三方代码，仅本地自用，不得分发）。
 *
 * 是什么：官方 jsxbin（@JSXBIN@ES@2.0@…，338,105 字节）的解码源码，由打过补丁的
 * jsxbin_to_jsx.exe 一次解出，没有手工改动。补了什么、怎么重新解码见同目录 vendor.README.md。
 *
 * 唯一入口：core/ps/init.ts 的 loadJsx('jsx/vendor.jsx')，即 $.evalFile 顶层执行 ——
 * 函数声明落在全局作用域。包进 IIFE 会随函数返回销毁，所有 ys_* / zt_* 都变 undefined。
 *
 * 禁止：重排 / 美化 / 改函数名 / 删「看起来没用到」的函数。需要哪些函数由 core/ps/init.ts
 * 的 VENDOR_FUNCS 决定，不在这里删。
 */

var g_zdy_cy, g_zdy_cy2, g_jj_BILI2, g_jj_BILI3, g_jj_BILI4, g_jj_BILI5, g_loadAcionPreset, option, plugPlugLibPath;
function mb_isNullLayer(layer) {
var rect, cx, cy;
if (typeof layer == "undefined") {
layer = Layer_active()
}
if ((layer.typename == "LayerSet") && (layer.layers.length > 0)) {
return false;
}
try {
var rect = Layer_getBounds();
var cx = rect.cx;
var cy = rect.cy;
if ((cx == 0) && (cy == 0)) {
return true;
} else {
return false;
}
} catch (error) {

}
return true;
}
function mb_isNullGroup(layer) {
var re, i;
if (layer.layers.length > 15) {
return true;
}
var re = false;
for (var i = 0;i < layer.layers.length; i += 1) {
if (layer.layers[i].typename != "LayerSet") {
return true;
} else {
re = mb_isNullGroup(layer.layers[i]);
if (re) {
return true;
}
}
}
return re;
}
function ps_mbAddPsdSplit(psdPath) {
var arr, results, i, layer, name, result;
var arr = Layer_getSelectedLayerId();
arr = cmm_filterSubLayer(arr);
var results = [];
for (var i = 0;i < arr.length; i += 1) {
Layer_onIdSelectLayer(arr[i]);
Doc_copyLayerToNewDoc();
var layer = Layer_active();
var name = layer.name;
var result = ps_saveToMyPsd(psdPath, name);
results.push(result);
}
return ps_returnOk(results);
}
function ps_saveToMyPsd(psdPath, name) {
return ps_saveToMyPsdSplit(psdPath, name);
}
function ps_saveToMyPsdSplit(psdPath, name) {
var lsrect, rect, adjustY, cx, cy, xuhao, arrLock, i, opacity, lock, kind, time, fileId, filePath, psdPaht, pngPath, docSize, width, height, preview, col, btn, zuiXiao, iBili, iKuan, newSize, scale, addWidth, info, ff;
try {
app.activeDocument.backgroundLayer;
Layer_backroundToNormal();
} catch (error) {

}
if (Layer_isBoard()) {
var lsrect = Layer_getItemIndexLayerPosition(Layer_active().itemIndex);
Layer_unGroup();
Doc_cutCanvas(lsrect.cx, lsrect.cy);
Layer_group(boardname);
Selection_all();
Layer_align(1);
Layer_align(3);
Selection_clear();
}
Layer_selectAllLayer();
Layer_unLocking();
Layer_group("设计助理");
var rect = Layer_getBounds();
var adjustY = parseInt(rect.y);
var cx = rect.cx;
var cy = rect.cy;
Layer_selectAllLayer();
var xuhao = Layer_getSelectedLayerItemIndex();
var arrLock = [];
for (var i = 0;i < xuhao.length; i += 1) {
var opacity = Action_onItemIndexGetDescriptor(xuhao[i]);
try {
var lock = opacity.getBoolean(s2t("group"));
var kind = opacity.getInteger(s2t("layerKind"));
if ((!lock && (kind != 7)) && (kind != 2)) {
arrLock.push(opacity.getInteger(s2t("layerID")))
}
} catch (error) {

}
}
if (arrLock.length > 0) {
Layer_onIdMultipleSelectLayer(arrLock, true);
Doc_copyLayerToNewDoc();
Layer_group("设计助理");
rect = Layer_getBounds();
adjustY = rect.y - adjustY;
cx = rect.cx;
cy = rect.cy;
Doc_close();
Doc_cutCanvas(cx, cy);
Layer_selectAllLayer();
try {
Selection_all();
Layer_align(1);
Layer_align(3);
} catch (error) {

}
Doc_deleteRawData();
} else {
Doc_cutCanvas(300, 80);
}
var time = mb_getNowTime();
var fileId = mb_getFileId();
var filePath = ((psdPath + "/") + fileId) + ".info";
Fs_createFolder(filePath);
name = name || "";
try {
if (name == "") {
name = mb_getTimeName()
} else {
Layer_unGroup()
}
} catch (error) {

}
Layer_foldAllLayer();
name = mb_deleteSpechars(name);
var psdPaht = ((filePath + "/") + name) + ".psd";
var pngPath = ((filePath + "/") + name) + ".png";
Doc_saveAsPsd(psdPaht);
var docSize = Doc_getSize();
var width = docSize.cx;
var height = docSize.cy;
if (arrLock.length == 0) {
var preview = "空组或者调整图层";
if (name != "") {
preview = name
}
Layer_createText(30, preview, 1);
var col = new SolidColor();
col.rgb.hex = "ffffff";
Layer_setTextColor(col);
Selection_all();
Layer_align(1);
Layer_align(3);
var btn = {
isLine: false,
type: 2,
padding: "10,10"
};
zt_createButton(btn);
}
var zuiXiao = 70;
if ((cx < zuiXiao) && (cy < zuiXiao)) {
var iBili = cx / 70;
if (cx > cy) {
Doc_adjustImageCx(zuiXiao)
} else {
Doc_adjustImageCy(zuiXiao);
iBili = cy / 70;
}
Doc_cutCanvas(240, cy / iBili);
}
var iKuan = 700;
if (cx > iKuan) {
Doc_adjustImageCx(iKuan);
}
Doc_setRGBMode();
var newSize = Doc_getSize();
var scale = newSize.cy / newSize.cx;
if (scale > 1.8) {
var addWidth = newSize.cy / 1.8;
Doc_cutCanvas(addWidth, newSize.cy);
}
Doc_saveAsPng(pngPath);
Doc_close();
var info = {};
info.name = name;
info.ext = "psd";
info.width = width;
info.height = height;
var ff = new File(psdPaht);
info.size = (ff.length / 1024).toFixed(2);
info.star = 0;
info.id = fileId;
info.find = new Array();
info.time = time;
info.tags = new Array();
info.folder = new Array();
info.note = "";
info.adjustY = adjustY;
return ps_returnOk(info);
}
function ps_mbAddPsd(psdPath) {
var arr, name, layer;
try {
var arr = Layer_getSelectedLayerItemIndex();
var name = "";
if (arr.length == 1) {
var layer = Layer_active();
name = layer.name;
if (Layer_isBackground()) {
return ps_returnErr("背景图层不能添加到模板哦！");
}
if (mb_isNullLayer()) {
return ps_returnErr("空白图层不能添加到模板哦");
}
if ((layer.typename == "LayerSet") && !mb_isNullGroup(layer)) {
return ps_returnErr("不能选择空组添加到模板哦！");
}
}
Doc_copyLayerToNewDoc();
return ps_saveToMyPsdSplit(psdPath, name);
} catch (error) {
return ps_returnErr(error.message);
}
}
function mb_deleteSpechars(str) {
var pattern, rs, MAX_LENGTH;
var pattern = new RegExp("[^A-Za-z0-9一-龥]", "g");
var rs = str.replace(pattern, "");
var MAX_LENGTH = 38;
if (rs.length > MAX_LENGTH) {
rs = rs.substr(0, MAX_LENGTH)
}
return rs;
}
function mb_getItemIndexLayerOptions(aXuHao, func) {
var pianYi, i, r, d, options;
var pianYi = Layer_getBackgroundIndexOffset();
for (var i = 0;i < aXuHao.length; i += 1) {
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIndex(charIDToTypeID("Lyr "), aXuHao[i] + pianYi);
d.putReference(charIDToTypeID("null"), r);
var options = executeAction(charIDToTypeID("getd"), d, DialogModes.NO);
func(options);
}
}
function mb_getNowTime() {
var myDate, str;
var myDate = new Date();
var str = "";
str += myDate.getFullYear();
str += ps_toTwo(myDate.getMonth() + 1);
str += ps_toTwo(myDate.getDate());
str += ps_toTwo(myDate.getHours());
str += ps_toTwo(myDate.getMinutes());
str += ps_toTwo(myDate.getSeconds());
return str;
}
function mb_getTimeName() {
var myDate, str;
var myDate = new Date();
var str = "";
str += (myDate.getFullYear() + "-");
str += (ps_toTwo(myDate.getMonth() + 1) + "-");
str += ps_toTwo(myDate.getDate());
return str;
}
function mb_openTemplatePsd(path) {
app.load(new File(path));
}
function mb_copyTemplatePsd(path, name) {
var actDoc;
app.load(new File(path));
var actDoc = app.activeDocument;
app.activeDocument.duplicate(name, false);
actDoc.close();
}
function mb_openTemplateFolder(str) {
var obj, path;
var obj = ps_toObject(str);
var path = File_getFileDirectory(obj.path);
Fs_openFolder(path);
}
function mb_amendPreview(path, name, ext) {
var psd, docSize, cx, cy, zuiXiao, iBili, iKuan, newSize, scale, addWidth;
var psd = new File((((path + "/") + name) + ".") + ext);
app.load(psd);
var docSize = Doc_getSize();
var cx = docSize.cx;
var cy = docSize.cy;
var zuiXiao = 70;
if ((cx < zuiXiao) && (cy < zuiXiao)) {
var iBili = cx / 70;
if (cx > cy) {
Doc_adjustImageCx(zuiXiao)
} else {
Doc_adjustImageCy(zuiXiao);
iBili = cy / 70;
}
Doc_cutCanvas(240, cy / iBili);
}
var iKuan = 700;
if (cx > iKuan) {
Doc_adjustImageCx(iKuan);
}
Doc_setRGBMode();
var newSize = Doc_getSize();
var scale = newSize.cy / newSize.cx;
if (scale > 1.8) {
var addWidth = newSize.cy / 1.8;
Doc_cutCanvas(addWidth, newSize.cy);
}
Doc_saveAsPng(((path + "/") + name) + ".png");
Doc_close();
}
function mb_moveFile(str) {
var obj, i, oldPath, newPath;
var obj = ps_toObject(str);
for (var i = 0;i < obj.arr.length; i += 1) {
var oldPath = ((obj.path + "/PSD/") + obj.arr[i]) + ".info/";
var newPath = ((obj.path + "/Recycle/") + obj.arr[i]) + ".info/";
Fs_copyFolder(oldPath, newPath);
Fs_deleteFolder(oldPath);
}
}
function mb_restoreUnfiledPsd(str) {
var obj, i, oldPath, newPath;
var obj = ps_toObject(str);
for (var i = 0;i < obj.arr.length; i += 1) {
var oldPath = ((obj.path + "/Recycle/") + obj.arr[i]) + ".info/";
var newPath = ((obj.path + "/PSD/") + obj.arr[i]) + ".info/";
Fs_copyFolder(oldPath, newPath);
Fs_deleteFolder(oldPath);
}
}
function mb_deletePsd(str) {
var obj, i, fol;
var obj = ps_toObject(str);
for (var i = 0;i < obj.arr.length; i += 1) {
var fol = ((obj.path + "/") + obj.arr[i]) + ".info/";
Fs_deleteFolder(fol);
}
return 1;
}
function ps_mbClearRecyclePsd(path) {
Fs_deleteFolder(path + "/");
Fs_createFolder(path);
}
function mb_isGroupLayerNumberMax(layers, max) {
var num, loop, res;
if ((layers.typename != "LayerSet") && (layers.typename != "Layers")) {
return true;
}
var num = 0;
var loop = function (lsLayers) {
var i, item, lsRes;
num += lsLayers.length;
if (num > max) {
return false;
}
for (var i = 0;i < lsLayers.length; i += 1) {
var item = lsLayers[i];
if (item.typename == "LayerSet") {
var lsRes = loop(item.layers);
if (lsRes == false) {
return lsRes;
}
}
}
return true;
};
var res = loop(layers);
return res;
}
function mb_useTemplate(obj) {
var deviationY, psdPath, ext, psdFile, isBoard, y, isSelection, lsSelect, lsId, i, docName, art, docHeight;
obj = decodeURIComponent(obj);
obj = ps_toObject(obj);
var deviationY = 0;
try {
deviationY = Unit_toPx(obj.useTmeplatePadding);
} catch (error) {
deviationY = 0;
}
if (app.activeDocument.name == "sjzl_tmep_newDoc") {
app.documents.add(UnitValue(obj.width + " px"), UnitValue(obj.height + " px"), 72, obj.name);
}
var psdPath = (((((obj.path + "/") + obj.id) + ".info/") + obj.name) + ".") + obj.ext;
var ext = obj.ext.toLowerCase();
if (((ext == "jpg") || (ext == "png")) || (ext == "jpeg")) {
mb_useJpgPngTemplate(obj, psdPath, deviationY);
return;
}
var psdFile = new File(psdPath);
if (psdFile.exists == false) {
return _A("打开错误,找不到PSD!");
}
var isBoard = false;
var y = 0;
var isSelection = false;
try {
var lsSelect = Selection_getBounds();
y = lsSelect.y;
isSelection = true;
} catch (error) {

}
if ((app.activeDocument.activeLayer.itemIndex != 1) && (isSelection == false)) {
isBoard = Layer_isBoard();
y = Layer_getBounds().bottom;
if (Layer_active().grouped) {
var lsId = Layer_active().id;
for (var i = 0;i < 100; i += 1) {
Layer_selectNext();
if (!Layer_active().grouped) {
y = Layer_getBounds().bottom;
break ;
}
}
Layer_onIdSelectLayer(lsId);
}
}
var docName = app.activeDocument.name;
if (isSelection == false) {
Selection_all()
}
if ((obj.status == 0) || (obj.status == 2)) {
mb_importPSDTemplateToDoc(psdFile, docName, obj.name);
} else {
Layer_importRelinkFile(psdPath);
}
if (isSelection) {
Layer_align(0);
Layer_align(6);
return true;
}
Layer_align(1);
var art = Doc_getArtboardsIndex();
if (art.length > 0) {
Layer_align(6);
}
if (isBoard == true) {
Selection_clear();
return;
}
var docHeight = Doc_getHeight();
if (y >= docHeight) {
y = docHeight - obj.height;
}
if (typeof obj.adjustY == "undefined") {
obj.adjustY = 0
}
Select_createLine(y + deviationY);
Layer_align(6);
Selection_clear();
}
function mb_templateCenterUseTemplate(obj) {
var widthHeight, deviationY, psdPath, ext, psdFile, isBoard, y, isSelection, lsSelect, lsId, i, docName, art, docHeight;
obj = decodeURIComponent(obj);
obj = ps_toObject(obj);
var widthHeight = mb_getDocWidthAndHiehgt(obj.path);
obj.width = widthHeight.width;
obj.height = widthHeight.height;
var deviationY = 0;
try {
deviationY = Unit_toPx(obj.useTmeplatePadding);
} catch (error) {
deviationY = 0;
}
if (app.activeDocument.name == "sjzl_tmep_newDoc") {
app.documents.add(UnitValue(obj.width + " px"), UnitValue(obj.height + " px"), 72, obj.name);
}
var psdPath = obj.path;
var ext = obj.ext.toLowerCase();
if (((ext == "jpg") || (ext == "png")) || (ext == "jpeg")) {
mb_useJpgPngTemplate(obj, psdPath, deviationY);
return;
}
var psdFile = new File(psdPath);
if (psdFile.exists == false) {
return _A("打开错误,找不到PSD!");
}
var isBoard = false;
var y = 0;
var isSelection = false;
try {
var lsSelect = Selection_getBounds();
y = lsSelect.y;
isSelection = true;
} catch (error) {

}
if ((app.activeDocument.activeLayer.itemIndex != 1) && (isSelection == false)) {
isBoard = Layer_isBoard();
y = Layer_getBounds().bottom;
if (Layer_active().grouped) {
var lsId = Layer_active().id;
for (var i = 0;i < 100; i += 1) {
Layer_selectNext();
if (!Layer_active().grouped) {
y = Layer_getBounds().bottom;
break ;
}
}
Layer_onIdSelectLayer(lsId);
}
}
var docName = app.activeDocument.name;
if (isSelection == false) {
Selection_all()
}
if ((obj.status == 0) || (obj.status == 2)) {
mb_importPSDTemplateToDoc(psdFile, docName, obj.name);
} else {
Layer_importRelinkFile(psdPath);
}
if (isSelection) {
Layer_align(0);
Layer_align(6);
return true;
}
Layer_align(1);
var art = Doc_getArtboardsIndex();
if (art.length > 0) {
Layer_align(6);
}
if (isBoard == true) {
Selection_clear();
return;
}
var docHeight = Doc_getHeight();
if (y >= docHeight) {
y = docHeight - obj.height;
}
if (typeof obj.adjustY == "undefined") {
obj.adjustY = 0
}
Select_createLine(y + deviationY);
Layer_align(6);
Selection_clear();
}
function isExtPsdMaterial(ext) {
if ((((ext == "jpg") || (ext == "png")) || (ext == "jpeg")) || (ext == "svg")) {
return false;
}
return true;
}
function mb_materialCenterUseTemplate(obj) {
var widthHeight, isNewDoc, filePath, origin_selectedLayerIndexList, origin_isBoard, origin_boardLayerId, y, isSelection, psdFile, isPsdFile, lsSelect, lsId, i, docName, artList, materialLayerId, artIndex, containerLayerIndex, artRect;
obj = decodeURIComponent(obj);
obj = ps_toObject(obj);
var widthHeight = mb_getDocWidthAndHiehgt(obj.path);
obj.width = widthHeight.width;
obj.height = widthHeight.height;
var isNewDoc = false;
if (app.activeDocument.name == "sjzl_tmep_newDoc") {
app.documents.add(UnitValue(obj.width + " px"), UnitValue(obj.height + " px"), 72, obj.name);
isNewDoc = true;
}
var filePath = obj.path;
var origin_selectedLayerIndexList = Layer_getSelectedLayerItemIndex();
var origin_isBoard = (origin_selectedLayerIndexList.length > 0) && Layer_isBoard();
var origin_boardLayerId = origin_isBoard ? Layer_active().id : null;
var y = 0;
var isSelection = false;
var psdFile = null;
var isPsdFile = isExtPsdMaterial(obj.ext.toLowerCase());
if (isPsdFile) {
psdFile = new File(filePath);
if (psdFile.exists == false) {
return _A("打开错误,找不到PSD!");
}
}
try {
var lsSelect = Selection_getBounds();
y = lsSelect.y;
isSelection = true;
} catch (error) {

}
if ((app.activeDocument.activeLayer.itemIndex != 1) && (isSelection == false)) {
y = Layer_getBounds().bottom;
if (Layer_active().grouped) {
var lsId = Layer_active().id;
for (var i = 0;i < 100; i += 1) {
Layer_selectNext();
if (!Layer_active().grouped) {
y = Layer_getBounds().bottom;
break ;
}
}
Layer_onIdSelectLayer(lsId);
}
}
var docName = app.activeDocument.name;
if ((isNewDoc == false) && (isSelection == false)) {
Selection_all();
}
if (obj.status === 1) {
Layer_importRelinkFile(filePath);
} else {
if (isPsdFile) {
mb_importPSDTemplateToDoc(psdFile, docName, obj.name);
} else {
Layer_importPlacedLayer(filePath);
if (obj.name) {
Layer_setName(obj.name.replace(/\.(png|jpg|svg|jpng)$/i, ""));
}
}
}
if (isNewDoc) {
return;
}
if (isSelection) {
if (isPsdFile) {
Layer_align(1);
Layer_align(7);
}
return;
}
var artList = Doc_getArtboardsIndex();
var materialLayerId = Layer_active().id;
if (artList.length > 0) {
if (origin_selectedLayerIndexList.length == 0) {
var artIndex = artList[artList.length - 1];
Layer_onIndexSelectLayer(artIndex);
Layer_onIdSelectLayer(materialLayerId);
Layer_align(1);
Layer_align(7);
Selection_clear();
return;
}
if (origin_isBoard && (origin_boardLayerId !== null)) {
Layer_onIdSelectLayer(origin_boardLayerId);
Layer_onIdSelectLayer(materialLayerId);
Layer_align(1);
Layer_align(7);
Selection_clear();
return;
}
var containerLayerIndex = origin_selectedLayerIndexList[0];
Layer_onIndexSelectLayer(containerLayerIndex);
var artRect = Layer_getBounds();
Selection_creteRect(artRect);
Layer_onIdSelectLayer(materialLayerId);
Layer_align(1);
Layer_align(7);
Selection_clear();
return;
} else {
if (origin_selectedLayerIndexList.length == 0) {
Layer_align(1);
Layer_align(7);
Selection_clear();
return;
}
var containerLayerIndex = origin_selectedLayerIndexList[0];
Layer_onIndexSelectLayer(containerLayerIndex);
var artRect = Layer_getBounds();
Selection_creteRect(artRect);
Layer_onIdSelectLayer(materialLayerId);
Layer_align(1);
Layer_align(7);
Selection_clear();
return;
}
}
function mb_importPSDTemplateToDoc(psdFile, docName, groupNameForImportPSD) {
var isBg, layers, arrId, i, art, lsrect;
app.load(psdFile);
var isBg = Doc_isBackgroundLayer();
var layers = app.activeDocument.layers;
var arrId = [];
for (var i = 0;i < layers.length; i += 1) {
if ((isBg == true) && (layers[i].itemIndex == 1)) {

} else {
arrId.push(layers[i].itemIndex);
}
}
Layer_onIndexMultipleSelectLayer(arrId, true);
groupNameForImportPSD = (groupNameForImportPSD && groupNameForImportPSD.replace(/\.(psd|psb)$/i, "")) || "稿定设计助理";
var art = Doc_getArtboardsIndex();
if (!art.length) {
Layer_group(groupNameForImportPSD);
} else {
var lsrect = Layer_getItemIndexLayerPosition(Layer_active().itemIndex);
Layer_unGroup();
Doc_cutCanvas(lsrect.cx, lsrect.cy);
Layer_group(groupNameForImportPSD);
}
Layer_copyCurrentLayerToDoc(docName);
Doc_close();
}
function mb_useJpgPngTemplate(obj, path, deviationY) {
var oldLayer, oldRect, docHeight;
var oldLayer = Layer_active();
var oldRect = Layer_getBounds();
if ((obj.status == 0) || (obj.status == 2)) {
Layer_importPlacedLayer(path);
} else {
Layer_importRelinkFile(path);
}
if (obj.status == 2) {
cy_embedImageIntoCurrentLayer();
oldLayer.remove();
} else {
var docHeight = Doc_getHeight();
if (oldRect.bottom >= docHeight) {
oldRect.bottom = oldRect.bottom - obj.height;
if (oldRect.bottom < 0) {
oldRect.bottom = 0
}
}
Layer_moveLayerPosition(-1, oldRect.bottom + deviationY);
}
}
function mb_moveLayerUp(params) {
var desc811, ref373, ref374;
var desc811 = new ActionDescriptor();
var ref373 = new ActionReference();
ref373.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc811.putReference(c2t("null"), ref373);
var ref374 = new ActionReference();
ref374.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Frnt"));
desc811.putReference(c2t("T   "), ref374);
executeAction(c2t("move"), desc811, DialogModes.NO);
}
function mb_exportComputers(str) {
var obj;
var obj = ps_toObject(str);
Fs_createFolder(obj.mulu);
ps_mbExportComputers2(obj);
Fs_openFolder(obj.mulu);
return 1;
}
function ps_mbExportComputers2(obj) {
var folPath, allName, i, filePath, str, name, newName, png, psd;
var folPath = (obj.mulu + "/") + obj.name;
Fs_createFolder(folPath);
var allName = [];
for (var i = 0;i < obj.fileId.length; i += 1) {
var filePath = ((obj.psdPath + "/") + obj.fileId[i]) + ".info/";
var str = File_read(filePath + "info.json");
var name = JSON.parse(str).name;
var newName = mb_renameProcess(allName, name);
allName.push(newName);
var png = name + ".png";
var psd = name + ".psd";
File_copy(filePath + png, ((folPath + "/") + newName) + ".png");
File_copy(filePath + psd, ((folPath + "/") + newName) + ".psd");
}
for (var i = 0;i < obj.children.length; i += 1) {
obj.children[i].mulu = folPath;
obj.children[i].psdPath = obj.psdPath;
ps_mbExportComputers2(obj.children[i]);
}
}
function mb_renameProcess(arr, name) {
var oldName, i, b, j;
var oldName = name;
for (var i = 0;i < 10000; i += 1) {
var b = false;
for (var j = 0;j < arr.length; j += 1) {
if (arr[j] == name) {
b = true;
break ;
}
}
if (!b) {
return name;
}
name = (oldName + "-") + i;
}
return "名字重叠出错";
}
function mb_exportTemplatePack(str) {
var obj, newPsd, i, old, newPath, dir;
var obj = JSON.parse(str);
Fs_createFolder(obj.path);
var newPsd = obj.path + "/PSD";
Fs_createFolder(newPath);
for (var i = 0;i < obj.fileId.length; i += 1) {
var old = ((obj.psdPath + "/") + obj.fileId[i]) + ".info/";
var newPath = ((newPsd + "/") + obj.fileId[i]) + ".info/";
Fs_copyFolder(old, newPath);
}
var dir = File_getFileDirectory(obj.path);
Fs_openFolder(dir);
return 1;
}
function mb_importPack(params) {
var str, ext, file, folStr, fol, allId, i, str2, fileId, lsObj, objInfo;
var str = Fs_selectFolder();
if (str == -1) {
return -1;
}
str = mb_checkPackPath(str);
var ext = str.substr(str.length - 9);
if (ext != ".pszlpack") {
return -2;
}
var file = str + "/folder.json";
var folStr = str + "/PSD";
if (File_isFile(file) == false) {
return -3;
}
var fol = new Folder(folStr);
if (fol.exists == false) {
return -4;
}
var allId = [];
af = fol.getFiles(function (stuff) {
return stuff instanceof Folder;
});
for (var i = 0;i < af.length; i += 1) {
var str2 = decodeURI(af[i]) + "/";
var fileId = mb_getFileId();
var lsObj = {
newId: fileId,
oldPaht: str2
};
allId.push(lsObj);
}
var objInfo = {
arr: allId,
path: str
};
return JSON.stringify(objInfo);
}
function mb_checkPackPath(path) {
var fol, afile, afol, newPath, ext, nFol;
var fol = new Folder(path);
var afile = fol.getFiles(function (stuff) {
return stuff instanceof File;
});
var afol = fol.getFiles(function (stuff) {
return stuff instanceof Folder;
});
if ((afile.length == 0) && (afol.length == 1)) {
var newPath = decodeURI(afol[0]);
var ext = newPath.substr(newPath.length - 9);
if (ext == ".pszlpack") {
var nFol = new Folder(newPath);
return nFol.fsName;
}
}
return path;
}
function mb_getFileId(params) {
return "FI" + ps_getGuid();
}
function mb_importFolder(params) {
var path, ext;
var path = Fs_selectFolder();
if (path == -1) {
return -1;
}
var ext = path.substr(path.length - 9);
if (ext == ".pszlpack") {
return -2;
}
return path;
}
function mb_importFolder2(str) {
var path, obj;
var path = JSON.parse(str).path;
var obj = mb_getFolderList(path);
return JSON.stringify(obj);
}
function mb_getFolderList(path) {
var obj, arrNum, res;
var obj = {};
var arrNum = [0];
mb_getFolderListToObject(path, obj, arrNum);
var res = {
obj: obj,
length: arrNum[0]
};
return JSON.stringify(res);
}
function mb_getFolderListToObject(path, obj, arrNum) {
var lsArr, fol, af, i, str;
obj.file = [];
obj.children = [];
var lsArr = path.split("/");
obj.name = lsArr[lsArr.length - 1];
var fol = new Folder(path);
if (fol.exists == false) {
return -1;
}
var af = fol.getFiles(function (stuff) {
return stuff instanceof File;
});
for (var i = 0;i < af.length; i += 1) {
var str = decodeURI(af[i]);
if (mb_isPsdOrImage(str)) {
arrNum[0]++;
obj.file.push(File_getfsName(str));
}
}
af = fol.getFiles(function (stuff) {
return stuff instanceof Folder;
});
for (var i = 0;i < af.length; i += 1) {
var str = decodeURI(af[i]);
obj.children.push({});
mb_getFolderListToObject(str, obj.children[i], arrNum);
}
}
function mb_isPsdOrImage(strFile) {
var ext, lsPsd, f;
var ext = File_getFileExt(strFile);
ext = ext.toUpperCase();
if (((ext == "PNG") || (ext == "JPG")) || (ext == "JPEG")) {
var lsPsd = strFile.substr(0, strFile.length - 3) + "psd";
var f = new File(lsPsd);
if (!f.exists) {
return true;
}
} else {
if (((ext == "PSD") || (ext == "PSB")) || (ext == "TIF")) {
return true;
}
}
return false;
}
function mb_getDocWidthAndHiehgt(path) {
var width, height, obj;
mb_openTemplatePsd(path);
var width = Doc_getWidth();
var height = Doc_getHeight();
Doc_close();
var obj = {
width: width,
height: height
};
return obj;
}
function mb_getAppVersion() {
return ps_returnOk(app.version);
}
function ps_mbImportPsd(path, psdPath, fast) {
var id, layers, name, art, time, fileId, filePath, psdPaht, rect, cx, cy, width, height, zuiXiao, iBili, iKuan, pngPaht, info, ff;
try {
app.load(new File(path));
if (app.activeDocument.mode == DocumentMode.INDEXEDCOLOR) {
Doc_setRGBMode()
}
Doc_deleteRawData();
try {
Layer_backroundToNormal();
} catch (error) {

}
var id = app.activeDocument.id;
var layers = app.activeDocument.layers;
var name = Doc_getName();
name = ps_deleteSpechars(name);
var art = Doc_getArtboardsIndex();
if (art.length > 0) {

} else {
if (layers.length == 1) {
Layer_active().name = name;
} else {
Layer_selectAllLayer();
Layer_group(name);
}
}
Layer_foldAllLayer();
var time = mb_getNowTime();
var fileId = mb_getFileId();
var filePath = ((psdPath + "/") + fileId) + ".info";
Fs_createFolder(filePath);
var psdPaht = ((filePath + "/") + name) + ".psd";
Doc_saveAsPsd(psdPaht);
var rect = Layer_getBounds();
var cx = rect.cx;
var cy = rect.cy;
var width = Doc_getWidth();
var height = Doc_getHeight();
var zuiXiao = 70;
if ((cx < zuiXiao) && (cy < zuiXiao)) {
var iBili = cx / 70;
if (cx > cy) {
Doc_adjustImageCx(zuiXiao)
} else {
Doc_adjustImageCy(zuiXiao);
iBili = cy / 70;
}
Doc_cutCanvas(240, parseInt(cy / iBili));
}
var iKuan = 700;
if (cx > iKuan) {
Doc_adjustImageCx(iKuan);
}
Doc_setRGBMode();
var pngPaht = ((filePath + "/") + name) + ".png";
Doc_saveAsPng(pngPaht);
if ((app.activeDocument.id == id) && (app.documents.length != 1)) {
Doc_close()
}
var info = {};
info.name = name;
info.ext = "psd";
info.width = width;
info.height = height;
var ff = new File(psdPaht);
info.size = ff.length;
info.star = 0;
info.id = fileId;
info.find = new Array();
info.time = time;
info.tags = new Array();
info.folder = new Array();
info.note = "";
info.adjustY = 0;
return ps_returnOk(info);
} catch (error) {
_A(error);
return ps_returnErr((path + " ") + error);
}
}
function zdy_checkStatus(params) {
if (Selection_isTrue() || (app.activeDocument.activeLayer.kind == LayerKind.SOLIDFILL)) {
return true;
} else {
if (app.activeDocument.activeLayer.name == "自动生成板块") {
return true;
}
}
return false;
}
function zdy_generate(obj) {
var lsUnit, iWenZi1, iWenZi2, arrHeight, numHeight, allArr, i, item, ls, lsRect, x, y, cx, cy, bXingZhuang, select, rect, sWenDangMing, iWenZiGao1, iWenZiGao2, text1id, text2id, iHangShu, iHangGao;
if (typeof obj != "object") {
obj = JSON.parse(obj)
}
try {
var lsUnit = Unit_setPx();
var iWenZi1 = parseInt(obj.textSize1);
var iWenZi2 = parseInt(obj.textSize2);
obj.rowSpacing = Unit_toPx(obj.rowSpacing);
obj.columnSpacing = Unit_toPx(obj.columnSpacing);
var arrHeight = [];
var numHeight = 0;
var allArr = [];
for (var i = 0;i < obj.line.length; i += 1) {
var item = obj.line[i];
var ls = zdy_paresLineValue(item.text);
if ((ls > 0) || (ls.length > 0)) {
allArr.push(ls)
}
if (obj.line[i].height != "") {
arrHeight.push(Unit_toPx(obj.line[i].height));
numHeight++;
} else {
arrHeight.push(0);
}
}
if (allArr.length == 0) {
_A("要输入生成的行数才行哦");
ps_funcStatus(-1);
return;
}
var lsRect = null;
if (app.activeDocument.activeLayer.name == "自动生成板块") {
lsRect = Layer_getBounds();
app.activeDocument.activeLayer.remove();
}
var bXingZhuang = false;
if (Selection_isTrue()) {
var select = Selection_getBounds();
x = select.x;
y = select.y;
cx = select.cx;
cy = select.cy;
if (x < 0) {
x = 0
}
Selection_clear();
} else {
if (app.activeDocument.activeLayer.kind == LayerKind.SOLIDFILL) {
var rect = Layer_getBounds();
x = rect.x;
y = rect.y;
cx = rect.cx;
cy = rect.cy;
bXingZhuang = true;
} else if (lsRect != null) {
x = lsRect.x;
y = lsRect.y;
cx = lsRect.cx;
cy = lsRect.cy;
} else {
_A("请画出选区或者选择矩形图层再生成框架");
ps_funcStatus(-1);
return;
}
}
var sWenDangMing = app.activeDocument.name;
app.documents.add(UnitValue("800 px"), UnitValue("800 px"), 72, "shzjtemp_custom");
try {
if (app.activeDocument.activeLayer.name == "背景") {
Layer_createText(22, "设计助理", 1);
}
var iWenZiGao1 = 0;
var iWenZiGao2 = 0;
var text1id = -1;
var text2id = -1;
if (iWenZi1 != 0) {
Layer_createText(iWenZi1, "设计助理", 1);
iWenZiGao1 = Layer_getBounds().cy;
text1id = Layer_active().id;
}
if (iWenZi2 != 0) {
Layer_createText(iWenZi2, "提高效率神器", 1);
iWenZiGao2 = Layer_getBounds().cy;
text2id = Layer_active().id;
}
var iHangShu = allArr.length;
var iHangGao = ((cy - ((iHangShu - 1) * obj.rowSpacing)) - zdy_getArraySum(arrHeight)) / (iHangShu - numHeight);
if (iHangGao <= 0) {
iHangGao = cy / iHangShu;
}
for (var i = 0;i < arrHeight.length; i += 1) {
if (arrHeight[i] == 0) {
arrHeight[i] = iHangGao
}
}
for (var i = 0;i < allArr.length; i += 1) {
var item = allArr[i];
zdy_createRow(i, iHangShu, item, x, y, cx, cy, obj.rowSpacing, obj.columnSpacing, iWenZiGao1, iWenZiGao2, iWenZi1, iWenZi2, obj.shapeIndex, obj.textLocation, arrHeight[i], text1id, text2id);
}
if (iHangShu != 1) {
zdy_addSelectNextN(iHangShu);
Layer_group("自动生成板块");
} else {
app.activeDocument.activeLayer.name = "自动生成板块";
}
Layer_copyCurrentLayerToDoc(sWenDangMing);
} catch (error) {
_A("发生未知错误：" + error);
}
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
if (bXingZhuang == false) {
Selection_creteRect(new Rect(x, y, cx, cy));
}
Unit_setPx(lsUnit);
} catch (error) {
Unit_setPx(lsUnit);
}
}
function zdy_checkMergeRectangles(params) {
var arr, i, item, type;
var arr = Layer_getSelectedLayerId();
if (arr.length <= 1) {
return ps_returnErr("请选择2个以上图层!");
}
for (var i = 0;i < arr.length; i += 1) {
var item = arr[i];
var type = Layer_getTypeNumber(item);
if (type != 4) {
return ps_returnErr("请选择形状图层!");
}
}
return ps_returnOk("");
}
function zdy_mergeRectangles(params) {
var info, color, rect, old;
var info = Shape_getShapeInfo();
var color = new Color();
if (info.fillColor != null) {
color = info.fillColor
} else {
if (info.strokeColor != null) {
color = info.strokeColor
}
}
Layer_group("sjzl_temp");
var rect = Layer_getBounds();
var old = Layer_active();
Shape_createRect(rect, true, null, color.rgb, null, null);
old.remove();
}
function zdy_addSelectNextN(n) {
var i;
for (var i = 0;i < n - 1; i += 1) {
Layer_addSelectNext();
Layer_foldAllLayer();
}
}
function zdy_paresLineValue(iHang) {
var aHang1, ls, ls2, iZhanBi, i, c;
if (iHang == 0) {
return [];
}
var aHang1 = new Array();
if (iHang.indexOf(":") != -1) {
aHang1 = iHang.split(":")
} else if (iHang.indexOf("=") != -1) {
var ls = iHang.split("=");
var iZhanBi = 1;
if (ls[1].indexOf(">") != -1) {
ls2 = ls[1].split(">");
} else if (ls[1].indexOf("%") != -1) {
ls2 = ls[1].split("%");
iZhanBi = (100 - ls2[1]) / (ls[0] - 1);
} else {
_A("格式错误，请重新输入");
return -1;
}
if (parseInt(ls2[0]) > parseInt(ls[0])) {
_A((("单个占比的数字不能大于总的个数" + ls2[0]) + ":") + ls[0]);
return -1;
}
for (var i = 0;i < ls[0]; i += 1) {
if (i == (ls2[0] - 1)) {
aHang1.push(ls2[1])
} else {
aHang1.push(iZhanBi)
}
}
} else {
var c = 100 / iHang;
for (var i = 0;i < iHang; i += 1) {
aHang1.push(c);
}
}
return aHang1;
}
var g_zdy_cy = 0;
var g_zdy_cy2 = 0;
function zdy_createRow(n, iHangShu, aHang1, x, y, cx, cy, iHangJu, iLieJu, iWenZiGao1, iWenZiGao2, iWenZi1, iWenZi2, iXingZhuangId, iWenZiWeiZhi, rowHeight, text1Id, text2Id) {
var iHangGao, aDuiQi, iHangKuan, iZhanBi, iZongShu, rY, i, rX, rCx, iWenZiShu, iWenZiGaoDu, rCy, createRect, wX, wY, iKongWei, iPianYi, iXWZ;
if (n == 0) {
g_zdy_cy = g_zdy_cy2 = 0
}
if (aHang1.length == 0) {
return;
}
g_zdy_cy2 += g_zdy_cy;
var iHangGao = (cy - ((iHangShu - 1) * iHangJu)) / iHangShu;
if ((rowHeight != "undefined") && (rowHeight != "")) {
iHangGao = rowHeight
}
var aDuiQi = new Array(-1, 0, 1, 2, 0, 1, 2, 0, 1, 2);
var iHangKuan = cx - ((aHang1.length - 1) * iLieJu);
var iZhanBi = 0;
var iZongShu = zdy_getArraySum(aHang1);
var rY = y + g_zdy_cy2;
for (var i = 0;i < aHang1.length; i += 1) {
if (i != 0) {
iZhanBi += parseFloat(aHang1[i - 1])
}
var rX = x + (i * iLieJu);
rX += ((iZhanBi / iZongShu) * iHangKuan);
var rCx = (aHang1[i] / iZongShu) * iHangKuan;
var iWenZiShu = 0;
if (iWenZi1 > 0) {
iWenZiShu++
}
if (iWenZi2 > 0) {
iWenZiShu++
}
var iWenZiGaoDu = iWenZiGao1 + iWenZiGao2;
if (iWenZiShu == 1) {
iWenZiGaoDu += 12
}
if (iWenZiShu == 2) {
iWenZiGaoDu += (12 + (iWenZiGao2 / 3))
}
var rCy = iHangGao;
g_zdy_cy = Math.round(rCy) + parseFloat(iHangJu);
if (iWenZiWeiZhi < 4) {
rCy -= iWenZiGaoDu;
}
if (iXingZhuangId != 0) {
rCy = rCx;
if (iWenZiWeiZhi < 4) {
g_zdy_cy = (Math.round(rCy) + parseFloat(iHangJu)) + iWenZiGaoDu
} else {
g_zdy_cy = Math.round(rCy) + parseFloat(iHangJu)
}
}
var createRect = new Rect(Math.round(rX), Math.round(rY), Math.round(rCx), Math.round(rCy));
if (iXingZhuangId == 1) {
Shape_createCircular(createRect, true, new RGB(55, 172, 148));
} else {
if ((i % 2) == 0) {
Shape_createRect(createRect, true, false, new RGB(55, 172, 148));
} else {
Shape_createRect(createRect, true, false, new RGB(41, 121, 151));
}
}
if (iWenZiShu > 0) {
var wX = rX;
var wY = rY + rCy;
var iKongWei = 12;
if (iWenZiWeiZhi < 4) {
wY += 12;
iKongWei = 0;
} else if (iWenZiWeiZhi < 7) {
wY -= iWenZiGaoDu;
} else {
wY -= (rCy / 2);
wY -= (iWenZiGaoDu / 2);
}
var iPianYi = 0;
if (iWenZi1 > 0) {
Layer_onIdSelectLayer(text1Id);
Layer_copyCurrentLayer();
Layer_moveToTextPanelTop();
var iXWZ = Layer_getBounds().cx;
if (aDuiQi[iWenZiWeiZhi] == 0) {
iPianYi = iKongWei
}
if (aDuiQi[iWenZiWeiZhi] == 1) {
iPianYi = (rCx / 2) - (iXWZ / 2)
}
if (aDuiQi[iWenZiWeiZhi] == 2) {
iPianYi = (rCx - iXWZ) - iKongWei
}
Layer_moveLayerPosition(wX + iPianYi, wY);
}
if (iWenZi2 > 0) {
Layer_onIdSelectLayer(text2Id);
Layer_copyCurrentLayer();
Layer_moveToTextPanelTop();
wY += (iWenZiGao1 + (((iWenZiShu - 1) * iWenZiGao2) / 3));
var iXWZ = Layer_getBounds().cx;
if (aDuiQi[iWenZiWeiZhi] == 0) {
iPianYi = iKongWei
}
if (aDuiQi[iWenZiWeiZhi] == 1) {
iPianYi = (rCx / 2) - (iXWZ / 2)
}
if (aDuiQi[iWenZiWeiZhi] == 2) {
iPianYi = (rCx - iXWZ) - iKongWei
}
Layer_moveLayerPosition(wX + iPianYi, wY);
}
zdy_addSelectNextN(iWenZiShu + 1);
Layer_group(i + 1);
}
}
if (aHang1.length != 1) {
zdy_addSelectNextN(aHang1.length);
Layer_group(("第" + (n + 1)) + "行");
} else {
app.activeDocument.activeLayer.name = ("第" + (n + 1)) + "行";
}
}
function zdy_getArraySum(a) {
var he, i;
var he = 0;
for (var i = 0;i < a.length; i += 1) {
he += parseFloat(a[i]);
}
return he;
}
function cy_zoom(scale) {
var desc43, ref9, desc44;
var desc43 = new ActionDescriptor();
var ref9 = new ActionReference();
ref9.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc43.putReference(c2t("null"), ref9);
desc43.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc44 = new ActionDescriptor();
desc44.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0);
desc44.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
desc43.putObject(c2t("Ofst"), c2t("Ofst"), desc44);
desc43.putUnitDouble(c2t("Wdth"), c2t("#Prc"), scale);
desc43.putUnitDouble(c2t("Hght"), c2t("#Prc"), scale);
desc43.putBoolean(c2t("Lnkd"), true);
desc43.putEnumerated(c2t("Intr"), c2t("Intp"), c2t("Bcbc"));
executeAction(c2t("Trnf"), desc43, DialogModes.NO);
}
function cy_transformPosition(weizhi) {
var cx, cy, desc4298, ref1044, desc4299;
var cx = 100;
var cy = 100;
maodian = "Qcsa";
switch(weizhi) {
case "左右":
cx = -100;
break ;
case "上下":
cy = -100;
break ;
case "左":
cx = -100;
maodian = "Qcs7";
break ;
case "右":
cx = -100;
maodian = "Qcs5";
break ;
case "下":
cy = -100;
maodian = "Qcs6";
break ;
case "上":
cy = -100;
maodian = "Qcs4";
break ;
default:
_A("传入参数有误");
break ;
}
var desc4298 = new ActionDescriptor();
var ref1044 = new ActionReference();
ref1044.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc4298.putReference(c2t("null"), ref1044);
desc4298.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t(maodian));
var desc4299 = new ActionDescriptor();
desc4299.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0);
desc4299.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
desc4298.putObject(c2t("Ofst"), c2t("Ofst"), desc4299);
desc4298.putUnitDouble(c2t("Wdth"), c2t("#Prc"), cx);
desc4298.putUnitDouble(c2t("Hght"), c2t("#Prc"), cy);
desc4298.putBoolean(c2t("Lnkd"), true);
desc4298.putEnumerated(c2t("Intr"), c2t("Intp"), c2t("Bcbc"));
executeAction(c2t("Trnf"), desc4298, DialogModes.NO);
}
function cy_insertionImage(obj) {
var strWenDangLuJing, strName, desc888, geShi, strLuLuJing, f, i2, f2;
if (Layer_getSelectLayerNumber() > 1) {
_A("请选择单个图层");
return;
}
if (app.activeDocument.activeLayer.typename == "LayerSet") {
_A("不可以选择图层组哦");
return;
}
if (Layer_isNormal()) {
Layer_toPlacedLayer();
}
var obj = ps_toObject(obj);
if (obj.path != "") {
Layer_placedLayerRelinkToFile(obj.path);
} else {
if (obj.bLink2 == 2) {
if (Doc_isSave() == -1) {
return;
}
var strWenDangLuJing = app.activeDocument.path + "/链接素材";
Fs_createFolder(strWenDangLuJing);
var strName = app.activeDocument.activeLayer.name;
if (strName.indexOf("/") != -1) {
strName = strName.split("/").join("");
}
strName = ps_deleteSpechars(strName);
var desc888 = new ActionDescriptor();
executeAction(stringIDToTypeID("placedLayerEditContents"), desc888, DialogModes.NO);
var geShi = ".psd";
var strLuLuJing = ((strWenDangLuJing + "/") + strName) + geShi;
var f = new File(strLuLuJing);
if (f.exists == true) {
for (var i2 = 2;i2 < 2000; i2 += 1) {
strLuLuJing = (((strWenDangLuJing + "/") + strName) + i2) + geShi;
var f2 = new File(strLuLuJing);
if (f2.exists == false) {
break ;
}
}
}
Doc_deleteRawData();
try {
Doc_saveAsPsd(strLuLuJing);
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
} catch (e) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
_A("请先在psd所在目录新建一个“链接素材”文件夹后使用本功能");
return;
}
Layer_placedLayerRelinkToFile(strLuLuJing);
}
}
cy_embedImageIntoCurrentLayer();
app.runMenuItem(charIDToTypeID("FrTr"));
if (obj.bDelete) {
Layer_selectNext();
app.activeDocument.activeLayer.remove();
Layer_selectPrev();
}
}
function cy_embedImageIntoCurrentLayer(path, linkToObject) {
var obj, obj2, bili, newObj, iPianYi, iPianYi2, lsX, lsY;
if (typeof path != "undefined") {
linkToObject === true ? Doc_importLinkImage(path) : Doc_importImage(path);
}
Layer_selectNext();
var obj = Layer_getBounds();
Layer_selectPrev();
var obj2 = Layer_getBounds();
var bili = 100;
if (((obj.cx / obj2.cx) * obj2.cy) > obj.cy) {
bili = (obj.cx / obj2.cx) * 100;
} else {
bili = (obj.cy / obj2.cy) * 100;
}
app.activeDocument.activeLayer.resize(bili + 0.5, bili + 0.5, AnchorPosition.TOPLEFT);
var newObj = Layer_getBounds();
var iPianYi = (newObj.cx - obj.cx) / 2;
var iPianYi2 = (newObj.cy - obj.cy) / 2;
var lsX = obj.x - iPianYi;
var lsY = (obj.y - 1) - iPianYi2;
lsX == -1 ? (lsX = 0) : lsX;
lsY == -1 ? (lsY = 0) : lsY;
Layer_moveLayerPosition(lsX, lsY);
if (app.activeDocument.activeLayer.grouped == false) {
Layer_embedClipMask();
}
}
function cy_embedMultipleImage() {
var wenDang, wenDangId, aXuHao, iTuCengShu, aTuPian, aMuBiao, bYouZu, i, layObj, aLinShi, j, iChang, iXuHao, linShiId;
if (Doc_isSave() == -1) {
ps_funcStatus(-1);
return -1;
}
var wenDang = app.activeDocument.name;
var wenDangId = app.activeDocument.id;
if (app.activeDocument.activeLayer.typename == "LayerSet") {
_A("请正确选择要处理的图片及组，没检测到您有选择图片");
ps_funcStatus(-1);
return -1;
}
Doc_copyLayerToNewDoc();
Layer_selectAllLayer();
var aXuHao = Layer_getSelectedLayerItemIndex();
var iTuCengShu = aXuHao.length;
app.activeDocument.artLayers.add();
app.activeDocument.activeLayer.remove();
var aTuPian = [];
var aMuBiao = [];
var bYouZu = 0;
for (var i = 0;i < iTuCengShu; i += 1) {
if (app.activeDocument.activeLayer.typename == "LayerSet") {
bYouZu = 1;
break ;
} else {
aTuPian.push(app.activeDocument.activeLayer.id);
Layer_selectNext();
}
}
if (bYouZu == 0) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
_A("请将图片放置在要处理组上方，并且要处理的框一定要在组内！");
ps_funcStatus(-1);
return -1;
}
for (var i = 0;i < iTuCengShu; i += 1) {
if ((app.activeDocument.activeLayer.kind == LayerKind.SOLIDFILL) && (app.activeDocument.activeLayer.name.indexOf("排除") == -1)) {
Layer_selectPrev();
if ((app.activeDocument.activeLayer.typename == "LayerSet") || (app.activeDocument.activeLayer.grouped == false)) {
Layer_selectNext();
var layObj = Layer_getBounds();
layObj.id = app.activeDocument.activeLayer.id;
aMuBiao.push(layObj);
} else {
Layer_selectNext();
}
}
Layer_onIndexSelectLayer(aXuHao[i]);
}
var aLinShi = new Object();
for (var i = 0;i < aMuBiao.length - 1; i += 1) {
for (var j = i + 1; j < aMuBiao.length; j++) {
if (aMuBiao[i].y < aMuBiao[j].y) {

} else if (aMuBiao[i].y == aMuBiao[j].y) {
if (aMuBiao[i].x > aMuBiao[j].x) {
aLinShi = ps_copyObject(aMuBiao[i]);
aMuBiao[i] = ps_copyObject(aMuBiao[j]);
aMuBiao[j] = ps_copyObject(aLinShi);
}
} else {
aLinShi = ps_copyObject(aMuBiao[i]);
aMuBiao[i] = ps_copyObject(aMuBiao[j]);
aMuBiao[j] = ps_copyObject(aLinShi);
}
}
}
var iChang = aTuPian.length;
if (aMuBiao.length > aTuPian.length) {
iChang = aTuPian.length
} else {
iChang = aMuBiao.length
}
if (iChang < 1) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
_A("请正确选择要处理的图片及组");
ps_funcStatus(-1);
return -1;
}
for (var i = 0;i < iChang; i += 1) {
Layer_onIdSelectLayer(aMuBiao[i].id);
var iXuHao = app.activeDocument.activeLayer.itemIndex;
Layer_onIdSelectLayer(aTuPian[(iChang - i) - 1]);
Layer_changeLayerPanelItemIndex(iXuHao);
cy_embedImageIntoCurrentLayer();
}
Layer_foldAllLayer();
Layer_selectAllLayer();
var linShiId = app.activeDocument.id;
Doc_switchDoc(wenDangId, -1);
Layer_deleteCurrentLayer();
Doc_switchDoc(linShiId);
Layer_copyCurrentLayerToDoc(wenDang);
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
if (app.activeDocument.name != wenDang) {
Doc_switchDoc(wenDangId, -1)
}
}
function cy_getImagePath(lj) {
var path;
var path = File.openDialog("选择文件", ["*.jpg", "*.tif", "*.png", "*.jpeg", "*.webp"], true);
if (path === null) {
return -1;
}
path = decodeURI(path);
return path;
}
function cy_importMultipleImage(obj) {
var strLj, ilen, allId, arr, i, layerObj, lsObj, iHandleNum, i2;
if (Doc_isSave() == -1) {
ps_funcStatus(-1);
return -1;
}
obj = ps_toObject(obj);
var strLj = obj.path.split(",");
var ilen = strLj.length;
var allId = [];
if (Layer_getNumberOfCurrentLayer() == 1) {
if (app.activeDocument.activeLayer.kind == LayerKind.SOLIDFILL) {
cy_embedImageIntoCurrentLayer(strLj[0], obj.toLinkObject);
app.runMenuItem(charIDToTypeID("FrTr"));
return 1;
} else {
var allId = [];
cy_getGroupAllSolidLayerId(allId, Layer_active());
}
} else {
var arr = Layer_getSelectedLayerItemIndex();
for (var i = 0;i < arr.length; i += 1) {
var layerObj = Layer_getItemIndexActionObject(arr[i]);
if (layerObj.getInteger(s2t("layerKind")) == 4) {
var lsObj = Layer_getItemIndexLayerPosition("", layerObj);
lsObj.id = layerObj.getInteger(s2t("layerID"));
allId.push(lsObj);
}
}
}
if (allId.length == 0) {
_A("请选择组或者形状图层！", "图层选择错误");
ps_funcStatus(-1);
return -1;
}
allId = allId.sort(function (a, b) {
if ((a.x == b.x) && (a.y == b.y)) {
return 0;
}
if (a.y < b.y) {
return -1;
} else if (a.y == b.y) {
if (a.x < b.x) {
return -1;
} else {
return 1;
}
} else {
return 1;
}
});
var iHandleNum = 0;
var i2 = 0;
for (var i = 0;i < allId.length; i += 1) {
if (i2 >= ilen) {
break ;
}
Layer_onIdSelectLayer(allId[i].id);
Layer_selectPrev();
if (!Layer_active().grouped) {
Layer_selectNext();
cy_embedImageIntoCurrentLayer(strLj[i2], obj.toLinkObject);
i2++;
}
iHandleNum++;
}
return iHandleNum;
}
function cy_getGroupAllSolidLayerId(arr, layer) {
var i, ls, lsObj;
if (layer.typename != "LayerSet") {
return;
}
for (var i = 0;i < layer.layers.length; i += 1) {
var ls = layer.layers[i];
if (ls.typename == "LayerSet") {
cy_getGroupAllSolidLayerId(arr, ls);
} else {
if ((ls.kind == LayerKind.SOLIDFILL) && (ls.name.indexOf("排除") == -1)) {
var lsObj = Layer_getBounds(ls);
lsObj.id = ls.id;
arr.push(lsObj);
}
}
}
}
function cy_customBuildTransform(shuLiang, jiaoDu, x, y, maoDian, biLi, touMingDu) {
var wenDang, aMaoDian, i, iBiLi, iCiGen, iShengYu, rect, unit, j, n, linshi, lsTouMing;
if (app.activeDocument.activeLayer.name == "自动复制") {
app.activeDocument.activeLayer.remove();
}
var wenDang = app.activeDocument.name;
Doc_copyLayerToNewDoc();
if (app.activeDocument.layers.length != 1) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
_A("当前选择了2个以上图层，请打组或者选择单个图层");
return -1;
}
var aMaoDian = new Array("Qcsa", "Qcs0", "Qcs7", "Qcs3", "Qcs6", "Qcs2", "Qcs5", "Qcs1", "Qcs4");
var i = 0;
var iBiLi = biLi / 100;
var iCiGen = parseInt(Math.log(shuLiang) / Math.log(2));
var iShengYu = shuLiang - Math.pow(2, iCiGen);
for (var i = 0;i < iCiGen; i += 1) {
Layer_copyCurrentLayer();
Layer_selectAllLayer();
}
app.activeDocument.artLayers.add();
app.activeDocument.activeLayer.remove();
var rect = Layer_getBounds();
if (x.indexOf("+") != -1) {
var unit = x.substr(x.length - 2);
x = x.substr(1);
x = Unit_toPx(parseInt(x) + unit) + rect.cx;
} else {
x = Unit_toPx(x);
}
if (y.indexOf("+") != -1) {
var unit = y.substr(y.length - 2);
y = y.substr(1);
y = Unit_toPx(parseInt(y) + unit) + rect.cy;
} else {
y = Unit_toPx(y);
}
if (iShengYu != 0) {
for (var i = 1;i < iShengYu; i += 1) {
Layer_addSelectNext();
}
Layer_copyCurrentLayer();
}
app.activeDocument.artLayers.add();
app.activeDocument.activeLayer.remove();
for (var j = 0;j < shuLiang; j += 1) {
var n = shuLiang - j;
var linshi = Math.pow(iBiLi, n);
try {
cy_transformLayer(jiaoDu * n, x * n, y * n, aMaoDian[maoDian], linshi * 100);
} catch (e) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
_A("选择的图层不可变换，请检查图层是否锁定，或是纯色调整图层！");
return false;
}
if (touMingDu != 0) {
var lsTouMing = 100 - (touMingDu * (shuLiang - j));
if (lsTouMing < 0) {
lsTouMing = 1
}
Layer_setOpacity(lsTouMing);
}
Layer_foldAllLayer();
Layer_selectNext();
}
Layer_selectAllLayer();
Layer_group("自动复制");
Layer_foldAllLayer();
Layer_copyCurrentLayerToDoc(wenDang);
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
return 1;
}
function cy_transformLayer(jiaodu, x, y, maodian, bili) {
var desc9529, ref3241, desc9530;
var desc9529 = new ActionDescriptor();
var ref3241 = new ActionReference();
ref3241.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc9529.putReference(c2t("null"), ref3241);
desc9529.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t(maodian));
var desc9530 = new ActionDescriptor();
desc9530.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), x);
desc9530.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), y);
desc9529.putObject(c2t("Ofst"), c2t("Ofst"), desc9530);
desc9529.putUnitDouble(c2t("Wdth"), c2t("#Prc"), bili);
desc9529.putUnitDouble(c2t("Hght"), c2t("#Prc"), bili);
desc9529.putUnitDouble(c2t("Angl"), c2t("#Ang"), jiaodu);
desc9529.putEnumerated(c2t("Intr"), c2t("Intp"), c2t("Bcbc"));
executeAction(c2t("Trnf"), desc9529, DialogModes.NO);
}
function cy_sheShapeWireframeColor(params) {
if (app.activeDocument.activeLayer.kind == LayerKind.SOLIDFILL) {
Shape_setBorderColor(true, app.backgroundColor);
}
}
function cy_correctRectangleBlur() {
var b, aXuHao, i, kind, rect, x1, y1, x2, y2;
var b = true;
var aXuHao = Layer_getSelectedLayerItemIndex();
for (var i = 0;i < aXuHao.length; i += 1) {
Layer_onIndexSelectLayer(aXuHao[i]);
var kind = app.activeDocument.activeLayer.kind;
if ((kind == LayerKind.SOLIDFILL) || (LayerKind.GRADIENTFILL == kind)) {
var rect = Layer_getBounds();
var x1 = Math.round(rect.x);
var y1 = Math.round(rect.y);
var x2 = Math.round(rect.right);
var y2 = Math.round(rect.bottom);
cy_setShapeAttribute(x1, y1, x2, y2);
b = false;
}
}
Layer_onIndexMultipleSelectLayer(aXuHao, false);
if (b) {
_A("仅支持修正形状图层！");
ps_funcStatus(-1);
}
}
function cy_setShapeAttribute(x1, y1, x2, y2) {
var desc1566, desc1567;
var desc1566 = new ActionDescriptor();
desc1566.putInteger(s2t("keyOriginType"), 2);
var desc1567 = new ActionDescriptor();
desc1567.putInteger(s2t("unitValueQuadVersion"), 1);
desc1567.putUnitDouble(c2t("Top "), c2t("#Pxl"), y1);
desc1567.putUnitDouble(c2t("Left"), c2t("#Pxl"), x1);
desc1567.putUnitDouble(c2t("Btom"), c2t("#Pxl"), y2);
desc1567.putUnitDouble(c2t("Rght"), c2t("#Pxl"), x2);
desc1566.putObject(s2t("keyOriginShapeBBox"), s2t("unitRect"), desc1567);
desc1566.putBoolean(s2t("keyActionPreserveLocation"), false);
executeAction(s2t("changePathDetails"), desc1566, DialogModes.NO);
}
function cy_swapWireframeFill() {
var arr, i, obj;
var arr = Layer_getSelectedLayerItemIndex();
for (var i = 0;i < arr.length; i += 1) {
Layer_onIndexSelectLayer(arr[i]);
if (Layer_isSolidFill()) {
var obj = Shape_getShapeInfo();
Shape_set(obj.stroke, colorToPsColor(obj.strokeColor), obj.fill, colorToPsColor(obj.fillColor));
}
}
Layer_onIndexMultipleSelectLayer(arr, true);
}
function cy_optimizeDoc(obj) {
var docId, arr, loop, i;
obj = ps_toObject(obj);
Doc_deleteRawData();
try {
if (obj.cyOptimizeDeleteAllEmpty === true) {
Layer_deleteEmptyLayer()
}
} catch (error) {

}
var docId = app.activeDocument.id;
if (obj.cyOptimizeAll === true) {
var arr = [];
var loop = function (layers) {
var i, options, lx, isAi, type, ls, ext;
for (var i = 0;i < layers.length; i += 1) {
if (layers[i].typename == "LayerSet") {
loop(layers[i].layers);
} else {
try {
var options = Action_onItemIndexGetDescriptor(layers[i].itemIndex);
var lx = options.getInteger(s2t("layerKind"));
if (lx == 5) {
var isAi = false;
try {
var type = options.getObjectValue(s2t("smartObject")).getString(s2t("fileReference"));
var ls = type.split(".");
var ext = ls[ls.length - 1];
if ((ext == "ai") || (ext == "svg")) {
isAi = true;
}
} catch (error) {

}
if (isAi == false) {
arr.push(options.getInteger(s2t("layerID")));
}
}
} catch (error) {

}
}
}
};
loop(app.activeDocument.layers);
for (var i = 0;i < arr.length; i += 1) {
Layer_onIdSelectLayer(arr[i]);
Layer_editSmartObject();
if (docId != app.activeDocument.id) {
Doc_deleteRawData();
app.activeDocument.save();
Doc_close();
}
}
return;
}
try {
if (obj.cyOptimizeDeleteAllHide === true) {
Layer_deleteHideLayer()
}
} catch (error) {

}
}
function cy_deleteHideLayer(params) {
var arr, loop, i, item;
var arr = [];
var loop = function (layers) {
var i;
for (var i = 0;i < layers.length; i += 1) {
if (layers[i].typename != "LayerSet") {
if ((layers[i].visible == false) && (layers[i].allLocked != true)) {
arr.push(layers[i]);
}
} else {
loop(layers[i].layers);
}
}
};
loop(app.activeDocument.layers);
for (var i = 0;i < arr.length; i += 1) {
var item = arr[i];
item.remove();
}
}
function cy_batchOptimizeDoc(obj, path) {
if (File_isFile(path) == false) {
return ps_returnErr();
}
Doc_load(path);
cy_optimizeDoc(obj);
Doc_save();
Doc_close();
return ps_returnOk();
}
function cy_ExportImage(obj) {
var newPath;
obj = ps_toObject(obj);
if (obj.name == "") {
obj.name = Doc_getName()
}
if (obj.path == "") {
if (obj.pathType == 1) {
obj.path = Folder.desktop;
} else {
try {
obj.path = app.activeDocument.path;
} catch (e) {
_A("请先保存PSD再导出，或者把 “文件所在目录” 切换成 “桌面” 再导出即可");
return -1;
}
}
}
obj.ext = obj.ext.toLowerCase();
var newPath = cy_makeFilePath(obj.path, obj.name, obj.ext, obj.isNumber);
if (obj.saveType == 2) {
if (obj.ext == "psd") {
Doc_saveAs(newPath);
} else {
obj.ext == "png" ? Doc_saveAsPng(newPath) : Doc_saveAsJpg(newPath, parseInt((obj.quality / 100) * 12));
}
} else {
obj.ext == "png" ? Doc_exportForWebPng(obj.png8, newPath, true) : Doc_exportForWebJpg(obj.quality, newPath, true);
}
obj.compress.isNumber = obj.isNumber;
cy_ompressionSize(newPath, obj.compress);
if (obj.autoOpenFolder === true) {
cy_openDirectory(obj.path);
}
}
function cy_makeFilePath(path, name, ext, isNumber) {
var f1, i, f, newPath;
name = ps_deleteSpechars(name);
var f1 = new File((((path + "/") + name) + ".") + ext);
if ((isNumber != true) || (f1.exists == false)) {
return f1.fullName;
}
for (var i = 1;i < 2000; i += 1) {
var f = new File((((((path + "/") + name) + "_") + i) + ".") + ext);
if (f.exists == false) {
var newPath = f.fullName;
f.close();
return newPath;
}
f.close();
}
}
function cy_checkWebImagsFilePath(path, name, ext, isNumber) {
var f1, i, f, newFile;
if (isNumber != true) {
return "";
}
var f1 = new File((((path + "/images/") + name) + "_01.") + ext);
if (f1.exists == false) {
return "";
}
for (var i = 1;i < 2000; i += 1) {
var f = new File((((((path + "/images/") + name) + "_") + i) + "_01.") + ext);
if (f.exists == false) {
f.close();
var newFile = new File((((((path + "/") + name) + "_") + i) + ".") + ext);
return newFile.fullName;
}
f.close();
}
}
function cy_ompressionSize(path, option) {
var file, name, ext, width, height, newName, newPath;
if ((typeof option == "undefined") || (((option.width == "") && (option.height == "")) && (option.watermark == ""))) {
return;
}
var file = new File(path);
if (file.exists) {
app.load(file);
var name = File_getFileName(path);
var ext = File_getFileExt(path);
if (option.width != "") {
var width = Unit_toPx(option.width);
Doc_adjustImageCx(width);
name += ("(" + parseInt(option.width));
} else {
if (option.height != "") {
var height = Unit_toPx(option.height);
Doc_adjustImageCy(height);
name += ("(" + parseInt(option.height));
}
}
if (option.watermark != "") {
cy_createWatermark(option.watermark);
name += "+水印";
}
var newName = (name + ").") + ext;
var newPath = (File_getFileDirectory(path) + "/") + newName;
if (option.isNumber === true) {
newPath = cy_getNumberPath(newPath);
}
Doc_saveAs(newPath);
Doc_close();
if (option.exportOriginalGraph == false) {
file.remove();
}
}
}
function cy_getNumberPath(path) {
var dir, name, ext, i, newPath;
if (!File_isFile(path)) {
return path;
}
var dir = File_getFileDirectory(path);
var name = File_getFileName(path);
var ext = File_getFileExt(path);
for (var i = 1;i < 4000; i += 1) {
var newPath = (((((dir + "/") + name) + "_") + i) + ".") + ext;
if (File_isFile(newPath) === false) {
return newPath;
}
}
return path;
}
function cy_createWatermark(path) {
var file, docSize, logoWidth, rect, percentage, arrId, i, intervalNum, iLen;
var file = new File(path);
if (!file.exists) {
return false;
}
Doc_importImage(path);
var docSize = Doc_getSize();
var logoWidth = (docSize.cx - 20) / 10;
var rect = Layer_getBounds();
var percentage = (logoWidth / rect.cx) * 100;
cy_zoom(percentage);
Layer_moveLayerPosition(10, 10);
var arrId = [Layer_active().id];
for (var i = 0;i < 5; i += 1) {
Layer_copyCurrentLayer();
arrId.push(Layer_active().id);
}
rect = Layer_getBounds();
Layer_moveLayerPosition((docSize.cx - rect.cx) - 10, -1);
Layer_onIdMultipleSelectLayer(arrId);
Layer_align(4);
Layer_merge();
Layer_setOpacity(15);
var arrId = [Layer_active().id];
var intervalNum = 8;
var iLen = docSize.cy / (rect.cy * intervalNum);
if (iLen < 2) {
iLen = 3;
intervalNum = 3;
}
for (var i = 1;i < iLen; i += 1) {
Layer_copy();
Layer_moveLayerPosition(-1, (i * rect.cy) * intervalNum);
arrId.push(Layer_active().id);
}
Layer_onIdMultipleSelectLayer(arrId);
Layer_merge();
Selection_all();
Layer_align(3);
Selection_clear();
}
function cy_openDirectory(str) {
var lj, f;
try {
var lj = app.activeDocument.path;
} catch (e) {
_A("请先保存文件后使用");
return;
}
if (typeof str != "undefined") {
lj = str
}
var f = new Folder(lj);
f.execute();
}
function cy_BatchExportLayer(obj) {
var open, arrStatus, layers, i;
if (typeof obj != "object") {
obj = JSON.parse(obj)
}
var open = obj.autoOpenFolder;
obj.autoOpenFolder = false;
var arrStatus = [];
var layers = app.activeDocument.layers;
for (var i = 0;i < layers.length; i += 1) {
arrStatus.push(layers[i].visible);
if ((layers[i].name != "背景") && (layers[i].name.indexOf("排除") == -1)) {
layers[i].visible = false;
}
}
for (var i = 0;i < layers.length; i += 1) {
if ((layers[i].name != "背景") && (layers[i].name.indexOf("排除") == -1)) {
layers[i].visible = true;
obj.name = layers[i].name;
cy_ExportImage(obj);
layers[i].visible = false;
}
}
for (var i = 0;i < layers.length; i += 1) {
layers[i].visible = arrStatus[i];
}
if (open == true) {
cy_openDirectory(obj.path)
}
return 1;
}
function cy_BatchExportSecondLayer(obj) {
var open, dir, arrStatus, layers, i, path, status, j, item;
obj = ps_toObject(obj);
var open = obj.autoOpenFolder;
obj.autoOpenFolder = false;
if (obj.path == "") {
if (obj.pathType == 1) {
obj.path = Folder.desktop;
} else {
try {
obj.path = app.activeDocument.path;
} catch (e) {
_A("请先保存PSD再导出，或者把 “文件所在目录” 切换成 “桌面” 再导出即可");
return -1;
}
}
}
var dir = obj.path;
var arrStatus = [];
var layers = app.activeDocument.layers;
for (var i = 0;i < layers.length; i += 1) {
arrStatus.push(layers[i].visible);
if (cy_checkExcludeLayer(layers[i].name)) {
layers[i].visible = false;
}
}
for (var i = 0;i < layers.length; i += 1) {
if (cy_checkExcludeLayer(layers[i].name)) {
layers[i].visible = true;
if (layers[i].typename == "LayerSet") {
var path = (dir + "/") + layers[i].name;
Fs_createFolder(path);
var status = [];
for (var j = 0;j < layers[i].layers.length; j += 1) {
var item = layers[i].layers[j];
status.push(item.visible);
if (cy_checkExcludeLayer(layers[i].name)) {
item.visible = false;
}
}
for (var j = 0;j < layers[i].layers.length; j += 1) {
var item = layers[i].layers[j];
if (cy_checkExcludeLayer(item.name)) {
item.visible = true;
obj.name = item.name;
obj.path = path;
cy_ExportImage(obj);
item.visible = false;
}
}
for (var j = 0;j < layers[i].layers.length; j += 1) {
layers[i].layers[j].visible = status[j];
}
}
layers[i].visible = false;
}
}
for (var i = 0;i < layers.length; i += 1) {
layers[i].visible = arrStatus[i];
}
if (open == true) {
cy_openDirectory(dir)
}
return 1;
}
function cy_checkExcludeLayer(name) {
return (name != "背景") && (name.indexOf("排除") == -1);
}
function cy_getPsdForFolder(params) {
var strPath, arrFile;
var strPath = Folder.selectDialog();
if (strPath == null) {
return -1;
}
var arrFile = [];
cy_getFilesForFolder(arrFile, strPath, ["psd"]);
return JSON.stringify(arrFile);
}
function cy_getFilesForFolder(arr, path, aFormat) {
var fol, af, i, ls, format, j;
var fol = new Folder(path);
if (fol.exists == false) {
return -1;
}
var af = fol.getFiles(function (stuff) {
return stuff instanceof File;
});
for (var i = 0;i < af.length; i += 1) {
af[i] = decodeURI(af[i]);
var ls = af[i].split(".");
var format = ls[ls.length - 1].toLowerCase();
for (var j = 0;j < aFormat.length; j += 1) {
if (format == aFormat[j]) {
arr.push(af[i])
}
}
}
af = fol.getFiles(function (stuff) {
return stuff instanceof Folder;
});
for (var i = 0;i < af.length; i += 1) {
cy_getFilesForFolder(arr, af[i], aFormat);
}
}
function cy_BacthExportPsdToImage(path, obj) {
var name;
try {
var obj = JSON.parse(obj);
app.load(new File(path));
var name = app.activeDocument.name;
if (name.substr(name.length - 4) == ".psd") {
name = name.substr(0, name.length - 4);
}
obj.name = name;
cy_ExportImage(obj);
if (app.documents.length > 1) {
Doc_close()
}
return true;
} catch (error) {
return false;
}
}
function cy_createSafeAreaGuide(daxiao) {
var art, item, i, rect, x1, x2, iWidth;
daxiao = Unit_toPx(daxiao);
var art = Doc_getArtboardsIndex();
if (art.length > 0) {
var item = app.activeDocument.activeLayer.itemIndex;
for (var i = 0;i < art.length; i += 1) {
if (item <= art[i]) {
item = art[i];
break ;
}
}
var rect = Layer_getItemIndexLayerPosition(item);
var x1 = rect.x + parseInt((rect.cx / 2) - (daxiao / 2));
var x2 = x1 + parseInt(daxiao);
} else {
var iWidth = Doc_getSize().cx;
if ((daxiao > iWidth) || (daxiao == 2)) {
_A("输入的超出文档宽度，请重新输入");
return;
}
var x1 = parseInt((iWidth / 2) - (daxiao / 2));
var x2 = x1 + parseInt(daxiao);
}
Guid_addX(x1);
Guid_addX(x2);
}
function cy_guideFunction(n) {
var desc6923, ref3084;
if (n == 1) {
if (app.activeDocument.guides.length == 0) {
return;
}
app.runMenuItem(charIDToTypeID("ClrG"));
} else {
var desc6923 = new ActionDescriptor();
var ref3084 = new ActionReference();
ref3084.putClass(s2t("slice"));
desc6923.putReference(c2t("null"), ref3084);
desc6923.putClass(c2t("Usng"), c2t("Gd  "));
executeAction(c2t("Mk  "), desc6923, DialogModes.NO);
}
}
function cy_smartReferenceLine(type) {
if (type == "singleRow") {
Guid_addY(parseInt(Selection_getBounds().y));
} else {
Guid_addX(parseInt(Selection_getBounds().x));
}
Selection_clear();
}
function cy_distributedByPitch(n, num, mode) {
var arrBiLi, ls, base, i, aXuHao, arrId, arr, layerObj, bounds, obj, lsLay, p1, lsNum;
var arrBiLi = [];
if (num.indexOf("=") != -1) {
num = num.replace(/：/g, ":");
var ls = num.split("=");
arrBiLi = ls[1].split(":");
num = Unit_toPx(cy_checkUnit(ls[0]));
} else if (num.indexOf(",") != -1) {
arrBiLi = num.split(",");
var base = arrBiLi[0];
num = Unit_toPx(cy_checkUnit(arrBiLi[0]));
arrBiLi[0] = 1;
for (var i = 1;i < arrBiLi.length; i += 1) {
arrBiLi[i] = arrBiLi[i] / base;
}
} else {
num = Unit_toPx(num);
}
var aXuHao = Layer_getSelectedLayerItemIndex();
var arrId = Layer_getSelectedLayerId();
arrId = cmm_filterSubLayer(arrId);
if (aXuHao.length != arrId.length) {
aXuHao = Layer_idToItemIndex(arrId);
}
var arr = [];
if (mode == 2) {
for (var i = 0;i < aXuHao.length; i += 1) {
var layerObj = Layer_getItemIndexActionObject(aXuHao[i]);
var bounds = layerObj.getObjectValue(s2t("bounds"));
var obj = {
index: layerObj.getInteger(s2t("itemIndex"))
};
if (layerObj.getInteger(s2t("layerKind")) == 7) {
Layer_onIndexSelectLayer(aXuHao[i]);
var lsLay = Layer_getBounds();
n == 1 ? (obj.xy = lsLay.y) : (obj.xy = lsLay.x);
} else {
n == 1 ? (obj.xy = bounds.getUnitDoubleValue(s2t("top"))) : (obj.xy = bounds.getUnitDoubleValue(s2t("left")));
}
arr.push(obj);
}
arr = arr.sort(function (a, b) {
return a.xy - b.xy;
});
aXuHao = [];
for (var i = 0;i < arr.length; i += 1) {
aXuHao.push(arr[i].index);
}
}
Layer_onIndexSelectLayer(aXuHao[0]);
var p1 = Layer_getBounds();
for (var i = 1;i < aXuHao.length; i += 1) {
Layer_onIndexSelectLayer(aXuHao[i]);
var lsNum = num;
if (i < (arrBiLi.length + 1)) {
lsNum = num * arrBiLi[i - 1]
}
if (n == 1) {
Layer_moveLayerPosition(-1, (p1.y + p1.cy) + lsNum)
} else {
Layer_moveLayerPosition((p1.x + p1.cx) + lsNum, -1)
}
p1 = Layer_getBounds();
}
Layer_onIndexMultipleSelectLayer(aXuHao, true);
}
function cy_checkUnit(str) {
var iLen, unit, arr, index, i;
str = str.replace(/\s+/g, "");
if (str == "") {
return "";
}
var iLen = str.length;
var unit = str.substr(iLen - 2);
str = str.replace(/[a-zA-Z]/g, "");
str = str.replace(/[\u4e00-\u9fa5]/g, "");
if (str.length == 0) {
return "";
}
var arr = ["px", "in", "cm", "mm", "pt", "pc"];
var index = 0;
for (var i = 0;i < arr.length; i += 1) {
if (arr[i] === unit) {
index = i
}
}
if (index == -1) {
index = 0
}
str += arr[index];
return str;
}
function cy_LayerReplace() {
var xuHao, arr, arr2, arrId, i, layer, addArr;
var xuHao = Layer_getSelectedLayerId();
if (xuHao.length < 2) {
_A("请选择2个以上的图层组");
return -1;
}
if (xuHao.length > 100) {
_A("禁止选择超过100个图层进行替换");
return -1;
}
xuHao = cmm_filterSubLayer(xuHao);
try {
var arr = [];
var arr2 = [];
var arrId = [];
for (var i = 0;i < xuHao.length; i += 1) {
Layer_onIdSelectLayer(xuHao[i]);
var layer = app.activeDocument.activeLayer;
arr.push(Layer_getBounds());
arr[i].id = layer.id;
if (layer.typename != "LayerSet") {
arr2.push(layer.id);
} else {
arrId.push(layer.id);
}
}
var addArr = [];
if (arrId.length > 1) {
arr.sort(function (a, b) {
if (a.y < b.y) {
return a.x - b.x;
} else if (a.y == b.y) {
return a.x - b.x;
} else {
return a.y - b.y;
}
});
for (var i = 1;i < arr.length; i += 1) {
Layer_onIdSelectLayer(arr[i].id);
Layer_deleteCurrentLayer();
}
Layer_onIdSelectLayer(arr[0].id);
addArr.push(arr[0].id);
for (var i = 1;i < arr.length; i += 1) {
Layer_copyCurrentLayer();
addArr.push(app.activeDocument.activeLayer.id);
Layer_moveLayerPosition(arr[i].x, arr[i].y);
}
} else {
Layer_onIdMultipleSelectLayer(arr2, true);
Layer_deleteCurrentLayer();
Layer_onIdSelectLayer(arrId[0]);
addArr.push(arrId[0]);
for (var i = 0;i < arr.length; i += 1) {
if (arr[i].id != arrId[0]) {
Layer_copyCurrentLayer();
addArr.push(app.activeDocument.activeLayer.id);
Layer_moveLayerPosition(arr[i].x, arr[i].y);
}
}
}
Layer_onIdMultipleSelectLayer(addArr);
} catch (error) {
_A("图层选择错误, 请不要选择组内的图层. 退一步可还原图层！");
}
return 1;
}
function cy_locationTrade(params) {
var arr, obj0, id0, mask0, obj1, id1, mask1, lsLayer;
var arr = Layer_getSelectedLayerItemIndex();
arr = arr.sort();
if (arr.length != 2) {
_A("必须选择2个图层才能进行调换哦");
return -1;
}
try {
Layer_onIndexSelectLayer(arr[0]);
var obj0 = Layer_getBounds();
var id0 = Layer_active().id;
var mask0 = Layer_active().grouped;
Layer_onIndexSelectLayer(arr[1]);
var obj1 = Layer_getBounds();
var id1 = Layer_active().id;
var mask1 = Layer_active().grouped;
Layer_onIdSelectLayer(id1);
Layer_moveLayerPosition(obj0.x, obj0.y);
Layer_onIdSelectLayer(id0);
Layer_moveLayerPosition(obj1.x, obj1.y);
Layer_copyCurrentLayer();
Layer_active().name = "设计助理临时复制";
var lsLayer = Layer_active();
Layer_onIdSelectLayer(id0);
Layer_changeLayerPanelItemIndex(arr[1]);
Layer_onIdSelectLayer(id1);
Layer_changeLayerPanelItemIndex(arr[0]);
lsLayer.remove();
Layer_onIdSelectLayer(id0);
if (Layer_active().grouped != mask0) {
Layer_active().grouped = mask0
}
Layer_onIdSelectLayer(id1);
if (Layer_active().grouped != mask1) {
Layer_active().grouped = mask1
}
Layer_onIdMultipleSelectLayer([id0, id1]);
} catch (error) {
_A("未知错误, 可能选择的图层组内包含有调整图层！");
}
}
function cy_exchangeLayerColor(params) {
var arr, arrCol, arrType, i, des, type;
var arr = Layer_getSelectedLayerItemIndex();
if (arr.length != 2) {
return _A("请选择2个图层");
}
var arrCol = [];
var arrType = [];
for (var i = 0;i < arr.length; i += 1) {
var des = Action_onItemIndexGetDescriptor(arr[i]);
var type = des.getInteger(s2t("layerKind"));
if (((type != 4) && (type != 3)) && (type != 11)) {
return _A("仅支持文字、形状、填充图层哦");
}
Layer_onIndexSelectLayer(arr[i]);
arrType.push(type);
arrCol.push(Layer_getLayerColor());
}
try {
cy_setLayerColor(arrType[1], arrCol[0]);
Layer_onIndexSelectLayer(arr[0]);
cy_setLayerColor(arrType[0], arrCol[1]);
Layer_onIndexMultipleSelectLayer(arr, true);
} catch (error) {
Layer_onIndexMultipleSelectLayer(arr, true);
_A("读取图层颜色失败，可能因为渐变造成");
}
}
function cy_setLayerColor(type, myCol) {
var col, info;
var col = colorToPsColor(myCol);
if (type == 3) {
Layer_setTextColor(col);
} else if (type == 4) {
var info = Shape_getShapeInfo();
if (info.fill) {
Shape_setFillColor(true, col);
} else {
if (info.stroke) {
Shape_setBorderColor(true, col);
}
}
} else {
Layer_setSolidLayerColor(col);
}
}
function cy_smartFillColor(params) {
if (Layer_isSelectLayer() == false) {
return;
}
Layer_setSelectLayerColor(app.foregroundColor, false);
}
function cy_smartFillLineColor(params) {
var aXuHao, strokeArr, i, options, lx;
if (Layer_isSelectLayer() == false) {
return;
}
var aXuHao = Layer_getSelectedLayerItemIndex();
var strokeArr = [];
for (var i = 0;i < aXuHao.length; i += 1) {
var options = Action_onItemIndexGetDescriptor(aXuHao[i]);
var lx = options.getInteger(s2t("layerKind"));
if (lx == 4) {
strokeArr.push(aXuHao[i]);
}
}
if (strokeArr.length > 0) {
Layer_onIndexMultipleSelectLayer(strokeArr, true);
Shape_setBorderColor(true, app.backgroundColor);
}
Layer_onIndexMultipleSelectLayer(aXuHao, false);
}
function cy_linkSmartObjectToSmartObject() {
var aXuHao, iTuCengShu, i, visbile;
var aXuHao = Layer_getSelectedLayerItemIndex();
var iTuCengShu = aXuHao.length;
for (var i = 0;i < iTuCengShu; i += 1) {
if (iTuCengShu != 1) {
Layer_onIndexSelectLayer(aXuHao[i])
}
var visbile = Layer_active().visible;
if (app.activeDocument.activeLayer.kind == LayerKind.SMARTOBJECT) {
try {
executeAction(s2t("placedLayerConvertToEmbedded"), undefined, DialogModes.NO);
} catch (e) {

}
}
app.activeDocument.activeLayer.visible = visbile;
}
}
function cy_smartToLinkSmartObject() {
var strWenDangLuJing, id, aXuHao, iTuCengShu, bTiShi, arrPosition, arrInfo, i, type, isAi, visible, options, lsType, ls, ext, objOldPosition, strName, desc888, act, geShi, strLuLuJing, f, i2, f2, desc753, objNewPosition, bili;
if (Doc_isSave() == -1) {
return;
}
var strWenDangLuJing = app.activeDocument.path + "/链接素材";
Fs_createFolder(strWenDangLuJing);
var id = app.activeDocument.id;
var aXuHao = Layer_getSelectedLayerItemIndex();
var iTuCengShu = aXuHao.length;
if (iTuCengShu > 5) {
_A("即将转换多个链接智能对象，需耐心等待一会");
}
var bTiShi = false;
var arrPosition = [];
var arrInfo = [];
for (var i = 0;i < iTuCengShu; i += 1) {
var type = 1;
var isAi = false;
var visible = true;
try {
var options = Action_onItemIndexGetDescriptor(aXuHao[i]);
type = options.getInteger(s2t("layerKind"));
visible = options.getBoolean(s2t("visible"));
if (type == 5) {
var lsType = options.getObjectValue(s2t("smartObject")).getString(s2t("fileReference"));
var ls = lsType.split(".");
var ext = ls[ls.length - 1];
if ((ext == "ai") || (ext == "svg")) {
isAi = true;
}
}
} catch (error) {

}
arrInfo.push({
type: type,
isAi: isAi,
visible: visible
});
Layer_onIndexSelectLayer(aXuHao[i]);
var objOldPosition = Layer_getBounds();
arrPosition.push(objOldPosition);
}
for (var i = 0;i < iTuCengShu; i += 1) {
Layer_onIndexSelectLayer(aXuHao[i]);
if ((arrInfo[i].type == 5) && (arrInfo[i].isAi == false)) {
var strName = app.activeDocument.activeLayer.name;
if (strName.indexOf("/") != -1) {
strName = strName.split("/").join("");
}
var desc888 = new ActionDescriptor();
var act = executeAction(stringIDToTypeID("placedLayerEditContents"), desc888, DialogModes.NO);
if (id == app.activeDocument.id) {
bTiShi = true;
} else if (decodeURI(app.activeDocument.path) == decodeURI(strWenDangLuJing)) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
} else {
Doc_deleteRawData();
var geShi = ".psd";
if (app.activeDocument.artLayers.length == 1) {
if (app.activeDocument.activeLayer.name == "背景") {
geShi = ".jpg";
} else {
geShi = ".png";
}
}
var strLuLuJing = ((strWenDangLuJing + "/") + strName) + geShi;
var f = new File(strLuLuJing);
if (f.exists == true) {
for (var i2 = 2; i < 2000; i2++) {
strLuLuJing = (((strWenDangLuJing + "/") + strName) + i2) + geShi;
var f2 = new File(strLuLuJing);
if (f2.exists == false) {
break ;
}
}
}
try {
Doc_saveAs(strLuLuJing);
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
var desc753 = new ActionDescriptor();
desc753.putPath(charIDToTypeID("null"), new File(strLuLuJing));
executeAction(stringIDToTypeID("placedLayerRelinkToFile"), desc753, DialogModes.NO);
} catch (e) {
_A("请先在psd所在目录新建一个“链接素材”文件夹后使用本功能");
}
}
var objNewPosition = Layer_getBounds();
if (arrPosition[i].x != objNewPosition.x) {
var bili = (arrPosition[i].cx / objNewPosition.cx) * 100;
app.activeDocument.activeLayer.resize(bili, bili, AnchorPosition.TOPLEFT);
Layer_moveLayerPosition(arrPosition[i].x, arrPosition[i].y);
}
}
if (arrInfo[i].visible == false) {
Layer_active().visible = arrInfo[i].visible
}
}
Layer_onIndexMultipleSelectLayer(aXuHao, false);
if (bTiShi) {
_A("存在智能对象图层是AI文件，请手动处理");
}
}
function zt_setFontName(hjm, mz, zz) {
var font;
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind == LayerKind.TEXT) {
Layer_setFontName(hjm, mz, zz);
var font = app.fonts.getByName(app.activeDocument.activeLayer.textItem.font);
if (font.family.indexOf("Adobe") > -1) {
return ps_returnErr("", 1);
}
} else {
return ps_returnErr("选中的第一个图层必须为文本图层");
}
return ps_returnOk();
}
function zt_getCurrentFontInfo(params) {
var ZiTi, fontInfo, obj;
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
var ZiTi = app.activeDocument.activeLayer.textItem;
var fontInfo = app.fonts.getByName(ZiTi.font);
var obj = {
family: fontInfo.family,
name: fontInfo.name,
scriptName: fontInfo.postScriptName
};
return ps_returnOk(obj);
}
function zt_getFontSimpleInfo(params) {
var obj, ZiTi, font, option, parag;
if (Layer_getSelectedLayerItemIndex().length > 1) {
return ps_returnErr("多个图层不处理");
}
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
var obj = {};
var ZiTi = app.activeDocument.activeLayer.textItem;
try {
var font = ZiTi.font;
obj.weight = app.fonts.getByName(font).style;
} catch (e) {
obj.weight = "读取失败";
}
try {
obj.size = ys_takeTwo(ZiTi.size * g_HuoQuTuCengBianHuanBiLi());
} catch (error) {
obj.size = 12;
}
try {
obj.fauxBold = ZiTi.fauxBold;
} catch (e) {
obj.fauxBold = false;
}
try {
obj.fauxItalic = ZiTi.fauxItalic;
} catch (e) {
obj.fauxItalic = false;
}
try {
obj.useAutoLeading = ZiTi.useAutoLeading;
} catch (e) {
obj.useAutoLeading = false;
}
try {
if (ZiTi.useAutoLeading == true) {
obj.leading = 0;
} else {
obj.leading = ys_takeTwo(ZiTi.leading * g_HuoQuTuCengBianHuanBiLi());
}
} catch (e) {
obj.leading = 0;
}
try {
obj.tracking = ZiTi.tracking;
} catch (e) {
obj.tracking = 0;
}
try {
if (ZiTi.autoKerning == AutoKernType.METRICS) {
obj.autoKerning = "metricsKern"
}
if (ZiTi.autoKerning == AutoKernType.OPTICAL) {
obj.autoKerning = "opticalKern"
}
if (ZiTi.autoKerning == AutoKernType.MANUAL) {
obj.autoKerning = "manual"
}
} catch (e) {
obj.autoKerning = "manual";
}
try {
if (ZiTi.capitalization == TextCase.ALLCAPS) {
obj.capitalization = "allCaps"
}
if (ZiTi.capitalization == TextCase.SMALLCAPS) {
obj.capitalization = "smallCaps"
}
if (ZiTi.capitalization == TextCase.NORMAL) {
obj.capitalization = "Nrml"
}
} catch (e) {
obj.capitalization = "Nrml";
}
try {
obj.color = psColorToMyColor(app.activeDocument.activeLayer.textItem.color);
} catch (error) {
obj.color = {
rgb: {
r: 0,
g: 0,
b: 0
}
};
}
try {
obj.family = app.fonts.getByName(font).family;
} catch (e) {
obj.family = "读取失败";
}
try {
var option = Action_onItemIndexGetDescriptor(Layer_active().itemIndex);
var parag = option.getObjectValue(s2t("textKey")).getList(s2t("paragraphStyleRange")).getObjectValue(0).getObjectValue(s2t("paragraphStyle"));
obj.justification = t2s(parag.getEnumerationValue(s2t("align")));
} catch (error) {
obj.justification = "left";
}
return ps_returnOk(obj);
}
function zt_setFontSize(n) {
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
Layer_setFontSize(n);
return ps_returnOk();
}
function zt_setFontLineSpacing(n) {
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
n = (app.activeDocument.activeLayer.textItem.size * n) * Layer_getTransformationRatio();
Layer_setFontLineSpacing(n);
return ps_returnOk();
}
function zt_setFontWordSpacing(n) {
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
Layer_setFontWordSpacing(n);
return ps_returnOk();
}
function zt_setFontWeight(hjm, mz, zz) {
Layer_setFontName(hjm, mz, zz);
}
function zt_setFontVision(text) {
var res, d1, r1, d2;
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return -1;
}
var res = 0;
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
r1.putProperty(c2t("Prpr"), c2t("TxtS"));
r1.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
d1.putReference(c2t("null"), r1);
var d2 = new ActionDescriptor();
d2.putInteger(s2t("textOverrideFeatureName"), 808465209);
d2.putInteger(s2t("typeStyleOperationType"), 3);
d2.putEnumerated(c2t("AtKr"), c2t("AtKr"), s2t(text));
d1.putObject(c2t("T   "), c2t("TxtS"), d2);
executeAction(c2t("setd"), d1, DialogModes.NO);
return res;
}
function zt_setFontAddBold(status) {
Layer_setFontAddBold(status);
}
function zt_setFauxItali(status) {
Layer_setFontSlanted(status);
}
function zt_setFontAllCaps(status) {
Layer_setFontAllCaps(status);
}
function zt_setFontColor() {
var yanse;
var yanse = app.showColorPicker();
if (yanse == true) {
Layer_setTextColor(app.foregroundColor);
return ps_returnOk(psColorToMyColor(app.foregroundColor));
}
return ps_returnErr();
}
function zt_setFontAlign(n) {
if (app.activeDocument.activeLayer.textItem.kind == TextType.PARAGRAPHTEXT) {
Layer_setPointText();
}
zt_setTextAlignment(n);
}
function zt_setFontJustified(n) {
var desc3717, ref837, fangShi, desc3704, ref832, desc3705, desc1549, ref300, desc1550;
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return _A("请选择字体图层");
}
if (app.activeDocument.activeLayer.textItem.kind == TextType.POINTTEXT) {
var desc3717 = new ActionDescriptor();
var ref837 = new ActionReference();
ref837.putProperty(c2t("Prpr"), c2t("TEXT"));
ref837.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc3717.putReference(c2t("null"), ref837);
desc3717.putEnumerated(c2t("T   "), c2t("TEXT"), s2t("box"));
executeAction(c2t("setd"), desc3717, DialogModes.NO);
}
var fangShi = new Array("justifyLeft", "justifyCenter", "justifyRight");
var desc3704 = new ActionDescriptor();
var ref832 = new ActionReference();
ref832.putProperty(c2t("Prpr"), s2t("paragraphStyle"));
ref832.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc3704.putReference(c2t("null"), ref832);
var desc3705 = new ActionDescriptor();
desc3705.putInteger(s2t("textOverrideFeatureName"), 808464433);
desc3705.putEnumerated(c2t("Algn"), c2t("Alg "), s2t(fangShi[n]));
desc3704.putObject(c2t("T   "), s2t("paragraphStyle"), desc3705);
executeAction(c2t("setd"), desc3704, DialogModes.NO);
var desc1549 = new ActionDescriptor();
var ref300 = new ActionReference();
ref300.putProperty(c2t("Prpr"), s2t("paragraphStyle"));
ref300.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc1549.putReference(c2t("null"), ref300);
var desc1550 = new ActionDescriptor();
desc1550.putInteger(s2t("textOverrideFeatureName"), 808464695);
desc1550.putEnumerated(s2t("kinsokuSetName"), s2t("kinsokuSetName"), s2t("Soft"));
desc1549.putObject(c2t("T   "), s2t("paragraphStyle"), desc1550);
executeAction(c2t("setd"), desc1549, DialogModes.NO);
}
function zt_setTextAlignment(n, downShift) {
var isMulti, x, cx;
try {
var isMulti = Layer_isMultiLayer();
if (Selection_isTrue() || isMulti) {
Layer_align(n);
}
var x = Layer_getBounds().x;
Layer_setFontAlignment(n);
if ((isMulti == false) && (downShift == true)) {
if (app.activeDocument.activeLayer.textItem.kind == TextType.PARAGRAPHTEXT) {
Layer_setPointText();
}
}
if (Selection_isTrue() || isMulti) {
Layer_align(n);
}
var cx = x - Layer_getBounds().x;
Layer_offsetPosition(cx, 0);
} catch (error) {

}
}
function zt_setHorizontalCenters(params) {
if (Layer_getNumberOfCurrentLayer() < 3) {
return ps_returnErr("请选择3个以上图层后使用");
}
Layer_align(4);
return ps_returnOk();
}
function zt_verticalCenter(params) {
if (Layer_isSelectLayer() == false) {
return ps_returnErr("请选择图层");
}
if (Layer_getNumberOfCurrentLayer() < 3) {
return ps_returnErr("请选择3个以上图层后使用");
}
Layer_align(5);
return ps_returnOk();
}
function zt_setUpDownAlign(n) {
if ((Layer_getNumberOfCurrentLayer() < 2) && (Selection_isTrue() == false)) {
return ps_returnErr("请选择2个以上图层后使用");
}
Layer_align(n + 6);
return ps_returnOk();
}
function zt_setBackrgoudAlign(n) {
var gruou;
var gruou = ((n == 3) || (n == 4)) && (Layer_getNumberOfCurrentLayer() > 1);
if (gruou) {
Layer_group("临时");
}
Selection_all();
if ((n == 1) || (n == 3)) {
Layer_align(1);
} else {
Layer_align(3);
}
if (gruou) {
Layer_unGroup()
}
Selection_clear();
}
function zt_createButton(str) {
var obj, king, ziDongAnNiu, rect, x, y, cx, cy, zengJiaCx, zengJiaCy, padd, ls, base, lsPadd, n, iZuoX, iZuoY, iYouX, iYouY, col, anNiu2;
var obj = ps_toObject(str);
if (Layer_isMultiLayer()) {
_A("请选择单个图层");
return -1;
}
var king = app.activeDocument.activeLayer.kind;
if ((((king == LayerKind.TEXT) || (king == LayerKind.NORMAL)) || (king == LayerKind.SOLIDFILL)) || (king == LayerKind.SMARTOBJECT)) {

} else {
_A("仅支持文本、形状、智能对象和普通图层。");
return -1;
}
try {
if (app.activeDocument.activeLayer.textItem.justification != Justification.CENTER) {
zt_setTextAlignment(2);
}
} catch (e) {

}
var ziDongAnNiu = "";
if (app.activeDocument.activeLayer.name == "自动按钮") {
ziDongAnNiu = app.activeDocument.activeLayer;
Layer_selectPrev();
}
var rect = Layer_getBounds();
var x = rect.x;
var y = rect.y;
var cx = rect.cx;
var cy = rect.cy;
var zengJiaCx = 22;
var zengJiaCy = 11;
if (obj.padding.indexOf(",") != "-1") {
var padd = obj.padding.split(",");
zengJiaCx = padd[0];
zengJiaCy = padd[1];
} else if (obj.padding.indexOf("=") != "-1") {
var ls = obj.padding.split("=");
var base = ls[0];
var lsPadd = ls[1].split(":");
zengJiaCx = parseInt(base) * lsPadd[0];
zengJiaCy = parseInt(base) * lsPadd[1];
} else if (obj.padding.indexOf("自动生成") != "-1") {
var n = parseInt(obj.padding[obj.padding.length - 1]);
if ((n < 1) || (n > 8)) {
n = 1
}
if (n == 1) {
zengJiaCx = 12;
zengJiaCy = 7;
}
if (n == 2) {
zengJiaCx = cy / 2;
zengJiaCy = cy / 4;
}
if (n == 3) {
zengJiaCx = cy;
zengJiaCy = cy / 4;
}
if (n == 4) {
zengJiaCx = cy;
zengJiaCy = cy / 2;
}
if (n == 5) {
zengJiaCx = cy * 1.6;
zengJiaCy = cy / 2;
}
if (n == 6) {
zengJiaCx = cy * 3.6;
zengJiaCy = cy / 1.5;
}
if (n == 7) {
zengJiaCx = cy * 2.2;
zengJiaCy = cy * 1.1;
}
if (n == 8) {
zengJiaCx = cy * 4;
zengJiaCy = cy * 1.1;
}
} else {
zengJiaCx = obj.padding;
zengJiaCy = obj.padding;
}
var iZuoX = parseInt(x - zengJiaCx);
var iZuoY = parseInt(y - zengJiaCy);
var iYouX = parseInt(cx + (zengJiaCx * 2));
var iYouY = parseInt(cy + (zengJiaCy * 2));
iYouY += ((parseInt(iZuoY - y) * 2) + parseInt(iYouY - cy));
iYouX += ((parseInt(iZuoX - x) * 2) + parseInt(iYouX - cx));
var col = new RGB(231, 37, 60);
var rect = new Rect(iZuoX, iZuoY, iYouX, iYouY);
Shape_createRect(rect, !obj.isLine, obj.isLine, col, col);
if (obj.type == 1) {
Shape_setFillet(true, cy + zengJiaCx);
}
app.activeDocument.activeLayer.name = "自动按钮";
Layer_moveToNext();
if (ziDongAnNiu != "") {
ziDongAnNiu.remove()
}
Layer_selectNext();
var anNiu2 = "";
if (app.activeDocument.activeLayer.name == "自动按钮") {
anNiu2 = app.activeDocument.activeLayer;
}
Layer_selectPrev();
if (anNiu2 != "") {
anNiu2.remove()
}
}
function zt_switchFontDirection() {
var fangXiang, d1, r1, idVrtc;
var fangXiang = "Vrtc";
if (app.activeDocument.activeLayer.textItem.direction == Direction.VERTICAL) {
fangXiang = "Hrzn"
}
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
r1.putProperty(c2t("Prpr"), c2t("Ornt"));
r1.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
d1.putReference(c2t("null"), r1);
var idVrtc = c2t(fangXiang);
d1.putEnumerated(c2t("T   "), c2t("Ornt"), idVrtc);
executeAction(c2t("setd"), d1, DialogModes.NO);
}
function zt_textBranchMerge(n) {
var text, str, aStr, fontSize, rect, x, y, cy, i, actRect, j, aXuHao, arr, obj, text2, id;
n = n.toString();
if (!Layer_isText()) {
return ps_returnErr("请选择文字图层");
}
try {
var text = app.activeDocument.activeLayer;
var str = text.textItem.contents;
} catch (error) {
return ps_returnErr("读取文字内容失败，请查看当前字体是否 Adobe 黑体 std,是的话请换个字体后重试！");
return -1;
}
switch(n) {
case "1":
case "2":
if (Layer_isMultiLayer()) {
return ps_returnErr("请选择单个文字图层");
}
var aStr = str.split("\r");
var fontSize = parseInt(app.activeDocument.activeLayer.textItem.size);
var rect = Layer_getBounds();
var x = rect.x;
var y = rect.y;
var cy = rect.cy / aStr.length;
if (n == "1") {
for (var i = 0;i < aStr.length; i += 1) {
if (aStr[i] != "") {
Layer_copyCurrentLayer();
if (app.activeDocument.activeLayer.textItem.kind == TextType.PARAGRAPHTEXT) {
Layer_setPointText();
}
app.activeDocument.activeLayer.textItem.contents = aStr[i];
var actRect = Layer_getBounds();
Layer_moveLayerPosition(-1, actRect.y + (actRect.cy * 1.68));
}
}
} else {
for (var i = 0;i < aStr.length; i += 1) {
for (var j = 0;j < aStr[i].length; j += 1) {
if (aStr[i][j] != "") {
Layer_copyCurrentLayer();
if (app.activeDocument.activeLayer.textItem.kind == TextType.PARAGRAPHTEXT) {
Layer_setPointText();
}
app.activeDocument.activeLayer.textItem.contents = aStr[i][j];
Layer_moveLayerPosition(x + (fontSize * j), y + ((cy * i) * 1.2));
}
}
}
}
text.visible = false;
break ;
case "3":
case "4":
if (!Layer_isMultiLayer()) {
return ps_returnErr("请选择多个图层");
}
var aXuHao = Layer_getSelectedLayerItemIndex();
var arr = [];
for (var i = 0;i < aXuHao.length; i += 1) {
var obj = Layer_getItemIndexActionObject(aXuHao[i]);
var text2 = obj.getObjectValue(s2t("textKey")).getString(s2t("textKey"));
arr.push(text2);
}
Layer_onIndexSelectLayer(aXuHao[aXuHao.length - 1]);
Layer_copyCurrentLayer();
if (n == "3") {
app.activeDocument.activeLayer.textItem.contents = arr.join("");
} else {
app.activeDocument.activeLayer.textItem.contents = arr.join("\r");
app.activeDocument.activeLayer.name = arr.join("");
}
var id = Layer_active().id;
Layer_onIndexMultipleSelectLayer(aXuHao, true);
Layer_deleteCurrentLayer();
Layer_onIdSelectLayer(id);
break ;
}
return ps_returnOk();
}
function zt_changeTextBranchMerge(n) {
var str;
n = n.toString();
if (!Layer_isText()) {
return ps_returnErr("请选择文字图层");
}
try {
var str = app.activeDocument.activeLayer.textItem.contents;
} catch (error) {
return ps_returnErr("读取文字内容失败，请查看当前字体是否 Adobe 黑体 std,是的话请换个字体后重试！");
}
switch(n) {
case "1":
case "2":
if (Layer_isMultiLayer()) {
return ps_returnErr("请选择单个文字图层");
}
break ;
case "3":
case "4":
if (!Layer_isMultiLayer()) {
return ps_returnErr("请选择多个图层");
}
break ;
}
return ps_returnOk();
}
var g_jj_BILI2 = new Array([0.5], [1], [1.5], [2], [2.5], [3], [3.5], [4], [4.5], [5], [5.5], [6], [6.5], [7], [7.5], [8]);
var g_jj_BILI3 = new Array([0.8, 1.5], [0.8, 4.8], [1.5, 0.8], [2.5, 1], [0.8, 0.8], [1.5, 1.5], [1.5, 3], [3, 1.5], [1, 2.5], [1, 6], [4, 1], [6, 1], [2, 2], [4, 4], [3, 6], [6, 3]);
var g_jj_BILI4 = new Array([1, 2.5, 0.8], [1.5, 3, 1], [1, 2.5, 2.5], [2, 0.8, 2], [2, 1, 4], [2, 1, 5], [2, 2, 0.8], [1, 1, 1], [1, 4, 1], [1.5, 6, 1], [1, 2.5, 5], [4, 0.8, 4], [3, 1.2, 6], [4, 1.2, 8], [4, 4, 1.2], [2.5, 2.5, 2.5]);
var g_jj_BILI5 = new Array([0.8, 2, 0.8, 3], [2, 0.8, 3, 0.8], [0.8, 3, 3, 0.8], [0.8, 1, 4, 0.8], [0.8, 4, 0.8, 1], [3, 0.8, 2, 4], [0.5, 1, 1, 2], [3, 2, 1, 1], [1, 4, 1, 5], [4, 1, 5, 1], [1.2, 5, 5, 1.2], [1, 1.5, 6, 1.5], [1, 6, 1, 1.5], [4, 1, 2.5, 6], [1, 2, 2, 4], [5, 3, 1.5, 1.5]);
function zt_znpb_getCurrentLayer(params) {
var aXuHao, newArr;
var aXuHao = Layer_getSelectedLayerItemIndex();
var newArr = cmm_filterSubLayer(aXuHao);
Layer_onIndexMultipleSelectLayer(aXuHao, true);
return newArr.length;
}
function zt_smartTypesetting(str) {
var obj, aXuHao, iDa, arr, i, layerObj, bounds, lsObj;
var obj = ps_toObject(str);
var aXuHao = Layer_getSelectedLayerItemIndex();
var iDa = [5, 3, 3, 3];
if ((2 > aXuHao.length) || (aXuHao.length > iDa[obj.sence - 1])) {
_A(("请选择2-" + iDa[obj.sence - 1]) + "个图层再操作");
ps_funcStatus(-1);
return;
}
var arr = [];
for (var i = 0;i < aXuHao.length; i += 1) {
var layerObj = Layer_getItemIndexActionObject(aXuHao[i]);
var bounds = layerObj.getObjectValue(s2t("bounds"));
var lsObj = {
index: layerObj.getInteger(s2t("itemIndex"))
};
if (layerObj.getInteger(s2t("layerKind")) != 3) {
return _A("请选择文本图层");
}
lsObj.y = bounds.getUnitDoubleValue(s2t("top"));
arr.push(lsObj);
}
arr = arr.sort(function (a, b) {
return a.y - b.y;
});
aXuHao = [];
for (var i = 0;i < arr.length; i += 1) {
aXuHao.push(arr[i].index);
}
if (obj.sence == 1) {
zt_znpb_haiBao(aXuHao, obj.type, obj.fontSize)
} else if (obj.sence == 2) {
zt_znpb_fenLei(aXuHao, obj.type, obj.fontSize)
} else {
if (obj.sence == 3) {
zt_znpb_biaoTi(aXuHao, obj.type, obj.fontSize)
}
}
if (obj.sence == 4) {
zt_znpb_ZhengWen(aXuHao, obj.type, obj.fontSize)
}
zt_setTextAlignment(obj.align);
ls_znpb_DanDuTiaoZhengJianJu(obj.scale, obj.spacing);
}
function zt_znpb_haiBao(aXuHao, b, zt) {
var aDuiBi2, aDuiBi3, aDuiBi4, aDuiBi5;
if (aXuHao.length == 2) {
var aDuiBi2 = new Array();
aDuiBi2 = [[0, 2], [0, 3], [0, 1], [0, 0]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi2[b - 1]);
}
if (aXuHao.length == 3) {
var aDuiBi3 = new Array();
aDuiBi3 = [[0, 2, 3], [0, 3, 2], [0, 1, 3], [0, 0, 3]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi3[b - 1]);
}
if (aXuHao.length == 4) {
var aDuiBi4 = new Array();
aDuiBi4 = [[0, 2, 2, 3], [0, 3, 2, 3], [0, 1, 2, 3], [0, 0, 2, 3]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi4[b - 1]);
}
if (aXuHao.length == 5) {
var aDuiBi5 = new Array();
aDuiBi5 = [[0, 2, 1, 3, 4], [0, 3, 2, 5, 4], [0, 1, 1, 3, 5], [0, 0, 2, 3, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi5[b - 1]);
}
}
function zt_znpb_fenLei(aXuHao, b, zt) {
var aDuiBi2, aDuiBi3, aDuiBi4, aDuiBi5;
if (aXuHao.length == 2) {
var aDuiBi2 = new Array();
aDuiBi2 = [[2, 4], [2, 5], [2, 3], [2, 2]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi2[b - 1]);
}
if (aXuHao.length == 3) {
var aDuiBi3 = new Array();
aDuiBi3 = [[2, 3, 5], [2, 5, 3], [2, 3, 4], [2, 2, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi3[b - 1]);
}
if (aXuHao.length == 4) {
var aDuiBi4 = new Array();
aDuiBi4 = [[2, 3, 4, 4], [2, 4, 5, 4], [3, 4, 5, 4], [3, 3, 4, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi4[b - 1]);
}
if (aXuHao.length == 5) {
var aDuiBi5 = new Array();
aDuiBi5 = [[0, 2, 1, 4, 5], [0, 3, 2, 5, 4], [0, 1, 1, 3, 5], [0, 0, 2, 3, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi5[b - 1]);
}
}
function zt_znpb_biaoTi(aXuHao, b, zt) {
var aDuiBi2, aDuiBi3, aDuiBi4, aDuiBi5;
if (aXuHao.length == 2) {
var aDuiBi2 = new Array();
aDuiBi2 = [[1, 3], [1, 4], [1, 2], [1, 1]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi2[b - 1]);
}
if (aXuHao.length == 3) {
var aDuiBi3 = new Array();
aDuiBi3 = [[1, 3, 4], [1, 5, 4], [1, 2, 4], [1, 1, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi3[b - 1]);
}
if (aXuHao.length == 4) {
var aDuiBi4 = new Array();
aDuiBi4 = [[2, 3, 4, 4], [2, 4, 5, 4], [3, 4, 5, 4], [3, 3, 4, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi4[b - 1]);
}
if (aXuHao.length == 5) {
var aDuiBi5 = new Array();
aDuiBi5 = [[0, 2, 1, 4, 5], [0, 3, 2, 5, 4], [0, 1, 1, 3, 5], [0, 0, 2, 3, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi5[b - 1]);
}
}
function zt_znpb_ZhengWen(aXuHao, b, zt) {
var aDuiBi2, aDuiBi3, aDuiBi4, aDuiBi5;
if (aXuHao.length == 2) {
var aDuiBi2 = new Array();
aDuiBi2 = [[3, 4], [3, 5], [4, 4], [3, 3]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi2[b - 1]);
}
if (aXuHao.length == 3) {
var aDuiBi3 = new Array();
aDuiBi3 = [[3, 4, 5], [3, 5, 4], [3, 4, 4], [3, 3, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi3[b - 1]);
}
if (aXuHao.length == 4) {
var aDuiBi4 = new Array();
aDuiBi4 = [[2, 3, 4, 4], [2, 4, 5, 4], [3, 4, 5, 4], [3, 3, 4, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi4[b - 1]);
}
if (aXuHao.length == 5) {
var aDuiBi5 = new Array();
aDuiBi5 = [[0, 2, 1, 4, 5], [0, 3, 2, 5, 4], [0, 1, 1, 3, 5], [0, 0, 2, 3, 4]];
zt_smartTypeSetFont(aXuHao, zt, aDuiBi5[b - 1]);
}
}
function zt_smartTypeSetFont(aXuHao, zt, duiBi) {
var i, daXiao, hangJu, ziJianJu, a, name;
for (var i = 0;i < aXuHao.length; i += 1) {
Layer_onIndexSelectLayer(aXuHao[i]);
var daXiao = zt[duiBi[i]];
var hangJu = zt_onFontSizeGetLineSpacing(daXiao);
var ziJianJu = zt_onFontSizeGetWordSpacing(daXiao);
var a = app.activeDocument.activeLayer.textItem.font;
var name = app.fonts.getByName(a).family;
if (name.indexOf("思源黑体") != -1) {
zt_setSourceHanSerif(zt_onFontSizeGetWeight(daXiao));
}
Layer_setFontSize(daXiao);
Layer_setFontLineSpacing(hangJu);
Layer_setFontWordSpacing(ziJianJu);
}
Layer_onIndexMultipleSelectLayer(aXuHao);
}
function zt_onFontSizeGetLineSpacing(daXiao) {
var n;
var n = 1.3;
if (daXiao < 10) {
n = 1.6;
} else if (daXiao < 20) {
n = 1.5;
} else if (daXiao < 30) {
n = 1.3;
} else if (daXiao < 60) {
n = 1.2;
} else if (daXiao < 90) {
n = 1.15;
} else if (daXiao < 120) {
n = 1;
} else {
n = 1.15;
}
return daXiao * n;
}
function zt_onFontSizeGetWordSpacing(daXiao) {
var n;
var n = 0;
if (daXiao < 10) {
n = 200;
} else if (daXiao < 20) {
n = 50;
} else if (daXiao < 30) {
n = 25;
} else if (daXiao < 40) {
n = 25;
} else if (daXiao < 60) {
n = 0;
} else if (daXiao < 150) {
n = -25;
} else {
n = -50;
}
return n;
}
function zt_onFontSizeGetWeight(daXiao) {
var n;
var n = 1;
if (daXiao < 10) {
n = 1;
} else if (daXiao < 20) {
n = 2;
} else if (daXiao < 40) {
n = 3;
} else if (daXiao < 60) {
n = 4;
} else if (daXiao < 100) {
n = 5;
} else if (daXiao < 150) {
n = 6;
} else {
n = 6;
}
return n;
}
function zt_setSourceHanSerif(n) {
var cuXi, name, desc9139, ref2799, desc9140;
var cuXi = new Array("Regular", "ExtraLight", "Light", "Normal", "Regular", "Medium", "Bold", "Heavy");
var name = "SourceHanSansCN-" + cuXi[n];
try {
var desc9139 = new ActionDescriptor();
var ref2799 = new ActionReference();
ref2799.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2799.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc9139.putReference(c2t("null"), ref2799);
var desc9140 = new ActionDescriptor();
desc9140.putInteger(s2t("textOverrideFeatureName"), 808465457);
desc9140.putInteger(s2t("typeStyleOperationType"), 3);
desc9140.putString(s2t("fontPostScriptName"), name);
desc9140.putString(c2t("FntN"), "SourceHanSansCN");
desc9140.putString(c2t("FntS"), cuXi[n]);
desc9140.putInteger(c2t("Scrp"), 25);
desc9140.putInteger(c2t("FntT"), 2);
desc9140.putBoolean(s2t("fontAvailable"), true);
desc9139.putObject(c2t("T   "), c2t("TxtS"), desc9140);
executeAction(c2t("setd"), desc9139, DialogModes.NO);
} catch (e) {
_A("设置失败，请安装思源黑体后即可正常使用。在公众号发送“思源黑体”可以获得下载地址");
return;
}
}
function ls_znpb_DanDuTiaoZhengJianJu(arrScale, spacing) {
var arrBiLi, aXuHao, arr, i, layerObj, bounds, obj, lsLay, iDa, num, p1, lsNum;
var arrBiLi = arrScale;
if (typeof arrScale == "string") {
arrBiLi = arrScale.split(":");
}
var aXuHao = Layer_getSelectedLayerItemIndex();
aXuHao = cmm_filterSubLayer(aXuHao);
var arr = [];
for (var i = 0;i < aXuHao.length; i += 1) {
var layerObj = Layer_getItemIndexActionObject(aXuHao[i]);
var bounds = layerObj.getObjectValue(s2t("bounds"));
var obj = {
index: layerObj.getInteger(s2t("itemIndex"))
};
if (layerObj.getInteger(s2t("layerKind")) == 7) {
Layer_onIndexSelectLayer(aXuHao[i]);
var lsLay = Layer_getBounds();
obj.xy = lsLay.y;
obj.cy = lsLay.cy;
} else {
obj.xy = bounds.getUnitDoubleValue(s2t("top"));
obj.cy = bounds.getUnitDoubleValue(s2t("height"));
}
arr.push(obj);
}
arr = arr.sort(function (a, b) {
return a.xy - b.xy;
});
aXuHao = [];
for (var i = 0;i < arr.length; i += 1) {
aXuHao.push(arr[i].index);
}
arr = arr.sort(function (a, b) {
return b.cy - a.cy;
});
var iDa = arr[0].cy;
var num = 12;
if ((typeof spacing != "undefined") && (spacing != "")) {
num = parseInt(spacing);
} else {
if (iDa > 79) {
num = 22
} else if ((iDa > 39) && (iDa < 80)) {
num = 18
} else {
if ((iDa > 29) && (iDa < 40)) {
num = 14
}
}
}
Layer_onIndexSelectLayer(aXuHao[0]);
var p1 = Layer_getBounds();
for (var i = 1;i < aXuHao.length; i += 1) {
Layer_onIndexSelectLayer(aXuHao[i]);
var lsNum = num;
if (i < (arrBiLi.length + 1)) {
lsNum = num * arrBiLi[i - 1]
}
Layer_moveLayerPosition(-1, (p1.y + p1.cy) + lsNum);
p1 = Layer_getBounds();
}
Layer_onIndexMultipleSelectLayer(aXuHao, true);
}
function zt_getCurrentText(params) {
var arr, texts, i, opt, lx, cont, obj;
var arr = Layer_getSelectedLayerId();
var texts = [];
for (var i = 0;i < arr.length; i += 1) {
var opt = Layer_getIdActionObject(arr[i]);
var lx = opt.getInteger(s2t("layerKind"));
if (lx == 3) {
var cont = opt.getObjectValue(s2t("textKey")).getString(s2t("textKey"));
var obj = {
id: arr[i],
text: compileStr(cont)
};
texts.push(obj);
}
}
if (texts.length == 0) {
return ps_returnErr("请选择文字图层");
}
return ps_returnOk(texts);
}
function zt_setTranslateText(arr, isDelete) {
var selects, i, item, bottom;
arr = ps_toObject(arr);
var selects = Layer_getSelectedLayerId();
for (var i = 0;i < arr.length; i += 1) {
var item = arr[i];
Layer_onIdSelectLayer(item.id);
if (isDelete == false) {
Layer_copyCurrentLayer();
}
app.activeDocument.activeLayer.textItem.contents = uncompileStr(item.dst);
if (isDelete == false) {
var bottom = Layer_getBounds().bottom;
Layer_moveLayerPosition(-1, bottom + 10);
}
}
if (selects.length > 1) {
Layer_onIdMultipleSelectLayer(selects, true);
}
}
function zt_alignHorizontal(params) {
zt_setTextAlignment(1);
zt_setUpDownAlign(1);
}
function ztgl_initSystemList() {
var dir, path, obj, indexes, fonts, i, family, weight, name, postScriptName, index, lsObj, font;
var dir = Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi");
Fs_createFolder(dir);
var path = dir + "/SysFont2.json";
app.refreshFonts();
var obj = {
length: app.fonts.length,
arr: []
};
var indexes = {};
var fonts = [];
for (var i = 0;i < app.fonts.length; i += 1) {
var family = app.fonts[i].family;
var weight = app.fonts[i].style;
var name = app.fonts[i].name;
var postScriptName = app.fonts[i].postScriptName;
if (indexes[family] === undefined) {
obj.arr.push({
name: family,
zz: [weight],
mz: [name],
hjm: [postScriptName],
show: false
});
fonts.push({
family: family,
weights: [weight],
names: [name],
postScriptNames: [postScriptName]
});
indexes[family] = obj.arr.length - 1;
} else {
var index = indexes[family];
var lsObj = obj.arr[index];
lsObj.zz.push(weight);
lsObj.mz.push(name);
lsObj.hjm.push(postScriptName);
var font = fonts[index];
font.weights.push(weight);
font.names.push(name);
font.postScriptNames.push(postScriptName);
}
}
File_write(JSON.stringify(obj), path);
return JSON.stringify(fonts);
}
function ztgl_setFont(hjm, mz, zz) {
var d1, r1, d2, i, ii;
if (app.name == "Adobe Photoshop") {
try {
Layer_getSelectLayerNumber();
} catch (error) {
return ps_returnErr("请选择文字图层");
}
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
r1.putProperty(c2t("Prpr"), c2t("TxtS"));
r1.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
d1.putReference(c2t("null"), r1);
var d2 = new ActionDescriptor();
d2.putString(s2t("fontPostScriptName"), hjm);
d2.putString(c2t("FntN"), mz);
d2.putString(c2t("FntS"), zz);
d1.putObject(c2t("T   "), c2t("TxtS"), d2);
executeAction(c2t("setd"), d1, DialogModes.NO);
return JSON.stringify({
code: "OK"
});
} else if (app.name == "Adobe Illustrator") {
for (var i = 0;i < app.selection.length; i += 1) {
if (app.selection[i].constructor.name == "TextFrame") {
app.selection[i].textRange.characterAttributes.textFont = app.textFonts.getByName(hjm);
}
}
} else {
for (var i = 0;i < app.selection.length; i += 1) {
if (app.selection[i].constructor.name == "TextFrame") {
for (var ii = 0;ii < app.selection[i].paragraphs.length; ii += 1) {
app.selection[i].paragraphs[ii].appliedFont = app.fonts.item(mz);
app.selection[i].paragraphs[ii].fontStyle = zz;
}
} else {
if (app.selection[i].constructor.name == "Text") {
app.selection[i].appliedFont = app.fonts.item(mz);
app.selection[i].fontStyle = zz;
}
}
}
}
}
function ztgl_get_font_info() {
var ref, res, style, color;
try {
app.currentTool = "typeCreateOrEditTool";
var ref = new ActionReference();
ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("tool"));
ref.putEnumerated(charIDToTypeID("capp"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));
var res = executeActionGet(ref);
var style = res.getObjectValue(stringIDToTypeID("currentToolOptions")).getObjectValue(stringIDToTypeID("textToolCharacterOptions")).getObjectValue(stringIDToTypeID("textStyle"));
var color = style.getObjectValue(stringIDToTypeID("color"));
return {
fontPostScriptName: style.getString(stringIDToTypeID("fontPostScriptName")),
fontName: style.getString(stringIDToTypeID("fontName")),
fontStyleName: style.getString(stringIDToTypeID("fontStyleName")),
fontSize: style.getUnitDoubleValue(stringIDToTypeID("size")),
color: {
red: color.getUnitDoubleValue(charIDToTypeID("Rd  ")),
green: color.getUnitDoubleValue(charIDToTypeID("Grn ")),
blue: color.getUnitDoubleValue(charIDToTypeID("Bl  "))
}
};
} catch (e) {
if ($.os.toLowerCase().indexOf("mac") !== -1) {
return {
fontPostScriptName: "PingFangSC-Regular",
fontName: "PingFang SC",
fontStyleName: "Regular",
fontSize: 16,
color: {
red: 0,
green: 0,
blue: 0
}
};
}
return {
fontPostScriptName: "MicrosoftYaHei",
fontName: "Microsoft YaHei",
fontStyleName: "Regular",
fontSize: 16,
color: {
red: 0,
green: 0,
blue: 0
}
};
}
}
function ztgl_set_font_style(postScriptName, fontName, fontStyle, fontSize, start, end) {
var idsetd, action, idnull, reference, idTxLr, idOrdn, idTrgt, idT, textAction, idTxtt, actionList, textRange, idFrom, idTxtS, formatting, info, idfontPostScriptName, idFntN, idFntS, idSz, idPnt, idClr, colorDesc, idRd, idGrn, idBl, idRGBC;
try {
if (app.documents.length && (app.activeDocument.activeLayer.kind === LayerKind.TEXT)) {
var idsetd = app.charIDToTypeID("setd");
var action = new ActionDescriptor();
var idnull = app.charIDToTypeID("null");
var reference = new ActionReference();
var idTxLr = app.charIDToTypeID("TxLr");
var idOrdn = app.charIDToTypeID("Ordn");
var idTrgt = app.charIDToTypeID("Trgt");
reference.putEnumerated(idTxLr, idOrdn, idTrgt);
action.putReference(idnull, reference);
var idT = app.charIDToTypeID("T   ");
var textAction = new ActionDescriptor();
var idTxtt = app.charIDToTypeID("Txtt");
var actionList = new ActionList();
var textRange = new ActionDescriptor();
var idFrom = app.charIDToTypeID("From");
textRange.putInteger(idFrom, start || 0);
textRange.putInteger(idT, end || app.activeDocument.activeLayer.textItem.contents.length);
var idTxtS = app.charIDToTypeID("TxtS");
var formatting = new ActionDescriptor();
var info = ztgl_get_font_info();
var idfontPostScriptName = stringIDToTypeID("fontPostScriptName");
formatting.putString(idfontPostScriptName, postScriptName || info.fontPostScriptName);
var idFntN = app.charIDToTypeID("FntN");
formatting.putString(idFntN, fontName || info.fontName);
var idFntS = app.charIDToTypeID("FntS");
formatting.putString(idFntS, fontStyle || info.fontStyleName);
var idSz = app.charIDToTypeID("Sz  ");
var idPnt = app.charIDToTypeID("#Pnt");
formatting.putUnitDouble(idSz, idPnt, fontSize || info.fontSize);
var idClr = charIDToTypeID("Clr ");
var colorDesc = new ActionDescriptor();
var idRd = charIDToTypeID("Rd  ");
colorDesc.putDouble(idRd, info.color.red);
var idGrn = charIDToTypeID("Grn ");
colorDesc.putDouble(idGrn, info.color.green);
var idBl = charIDToTypeID("Bl  ");
colorDesc.putDouble(idBl, info.color.blue);
var idRGBC = charIDToTypeID("RGBC");
formatting.putObject(idClr, idRGBC, colorDesc);
textRange.putObject(idTxtS, idTxtS, formatting);
actionList.putObject(idTxtt, textRange);
textAction.putList(idTxtt, actionList);
action.putObject(idT, idTxLr, textAction);
app.executeAction(idsetd, action, DialogModes.NO);
}
return JSON.stringify({
code: "OK"
});
} catch (err) {
return JSON.stringify({
code: "FAILED",
message: err.message
});
}
}
function ztgl_read_text() {
var activeLayer;
try {
if (app.documents.length) {
var activeLayer = app.activeDocument.activeLayer;
if (activeLayer.kind === LayerKind.TEXT) {
return JSON.stringify({
text: activeLayer.textItem.contents
});
}
}
return JSON.stringify({
text: ""
});
} catch (e) {
return JSON.stringify({
text: ""
});
}
}
function ztgl_create_text_layer(textContent) {
var idmake, desc, idnull, ref, idtextLayer, idusing, descPaint, idtextKey, position, descClick, idhorizontal, idpercentUnit, idvertical, idpaint, actList, descStyle, idfrom, idto, fontInfo, descText, idfontPostScriptName, idfontName, idfontStyleName, idsize, idpointsUnit, idtextStyle, idtextStyleRange, idlayerID;
try {
var idmake = stringIDToTypeID("make");
var desc = new ActionDescriptor();
var idnull = stringIDToTypeID("null");
var ref = new ActionReference();
var idtextLayer = stringIDToTypeID("textLayer");
ref.putClass(idtextLayer);
desc.putReference(idnull, ref);
var idusing = stringIDToTypeID("using");
var descPaint = new ActionDescriptor();
var idtextKey = stringIDToTypeID("textKey");
descPaint.putString(idtextKey, textContent);
var position = stringIDToTypeID("textClickPoint");
var descClick = new ActionDescriptor();
var idhorizontal = stringIDToTypeID("horizontal");
var idpercentUnit = stringIDToTypeID("percentUnit");
descClick.putUnitDouble(idhorizontal, idpercentUnit, 10);
var idvertical = stringIDToTypeID("vertical");
var idpercentUnit = stringIDToTypeID("percentUnit");
descClick.putUnitDouble(idvertical, idpercentUnit, 20);
var idpaint = stringIDToTypeID("paint");
descPaint.putObject(position, idpaint, descClick);
var actList = new ActionList();
var descStyle = new ActionDescriptor();
var idfrom = stringIDToTypeID("from");
descStyle.putInteger(idfrom, 0);
var idto = stringIDToTypeID("to");
descStyle.putInteger(idto, 100);
var fontInfo = ztgl_get_font_info();
var descText = new ActionDescriptor();
var idfontPostScriptName = stringIDToTypeID("fontPostScriptName");
descText.putString(idfontPostScriptName, fontInfo.fontPostScriptName);
var idfontName = stringIDToTypeID("fontName");
descText.putString(idfontName, fontInfo.fontName);
var idfontStyleName = stringIDToTypeID("fontStyleName");
descText.putString(idfontStyleName, fontInfo.fontStyleName);
var idsize = stringIDToTypeID("size");
var idpointsUnit = stringIDToTypeID("pointsUnit");
descText.putUnitDouble(idsize, idpointsUnit, fontInfo.fontSize);
var idtextStyle = stringIDToTypeID("textStyle");
descStyle.putObject(idtextStyle, idtextStyle, descText);
var idtextStyleRange = stringIDToTypeID("textStyleRange");
actList.putObject(idtextStyleRange, descStyle);
descPaint.putList(idtextStyleRange, actList);
var idtextLayer = stringIDToTypeID("textLayer");
desc.putObject(idusing, idtextLayer, descPaint);
var idlayerID = stringIDToTypeID("layerID");
desc.putInteger(idlayerID, 44);
executeAction(idmake, desc, DialogModes.NO);
return JSON.stringify({
code: "OK"
});
} catch (err) {
return JSON.stringify({
code: "FAILED",
message: err.message
});
}
}
function ztgl_replace_font_content(textContent) {
var idset, desc4774, idnull, ref96, idtextLayer, idordinal, idtargetEnum, idto, desc4775, idtextKey;
try {
var idset = stringIDToTypeID("set");
var desc4774 = new ActionDescriptor();
var idnull = stringIDToTypeID("null");
var ref96 = new ActionReference();
var idtextLayer = stringIDToTypeID("textLayer");
var idordinal = stringIDToTypeID("ordinal");
var idtargetEnum = stringIDToTypeID("targetEnum");
ref96.putEnumerated(idtextLayer, idordinal, idtargetEnum);
desc4774.putReference(idnull, ref96);
var idto = stringIDToTypeID("to");
var desc4775 = new ActionDescriptor();
var idtextKey = stringIDToTypeID("textKey");
desc4775.putString(idtextKey, textContent);
var idtextLayer = stringIDToTypeID("textLayer");
desc4774.putObject(idto, idtextLayer, desc4775);
executeAction(idset, desc4774, DialogModes.NO);
return JSON.stringify({
code: "OK"
});
} catch (err) {
return JSON.stringify({
code: "FAILED",
message: err.message
});
}
}
function ztgl_create_or_replace(textContent) {
var activeLayer;
try {
Layer_getSelectLayerNumber();
if (app.documents.length) {
var activeLayer = app.activeDocument.activeLayer;
if (activeLayer.kind === LayerKind.TEXT) {
return ztgl_replace_font_content(textContent);
}
return ztgl_create_text_layer(textContent);
}
} catch (err) {
if (app.documents.length) {
return ztgl_create_text_layer(textContent);
} else {
return JSON.stringify({
code: "FAILED",
message: err.message
});
}
}
}
function ys_colorToPsColor(col) {
var c;
var c = new SolidColor();
if (app.activeDocument.mode == DocumentMode.CMYK) {
c.cmyk.cyan = col.c;
c.cmyk.magenta = col.m;
c.cmyk.yellow = col.y;
c.cmyk.black = col.k;
} else {
c.rgb.hexValue = col.hex;
}
return c;
}
function ys_psColorToObject(c) {
var obj, col;
var obj = {};
obj.hex = c.rgb.hexValue;
obj.c = Math.round(c.cmyk.cyan);
obj.m = Math.round(c.cmyk.magenta);
obj.y = Math.round(c.cmyk.yellow);
obj.k = Math.round(c.cmyk.black);
var col = {
name: "未命名",
color: obj
};
return JSON.stringify(col);
}
function ys_getForegroundColor(params) {
return ys_psColorToObject(app.foregroundColor);
}
function ys_useShapeFill(col) {
col = ps_toObject(col);
var col = ys_colorToPsColor(col);
if (Layer_isSolidFill() == false) {
return _A("请选择形状图层");
}
Shape_setFillColor(true, col);
App_setForegrounddColor(col);
}
function ys_setBorderColor(yanSe) {
var col;
yanSe = ps_toObject(yanSe);
var col = ys_colorToPsColor(yanSe);
if (Layer_isSolidFill() == false) {
return _A("请选择形状图层");
}
Shape_setBorderColor(true, col);
}
function ys_setForegroundColor(yanSe) {
var col;
yanSe = ps_toObject(yanSe);
var col = ys_colorToPsColor(yanSe);
App_setForegrounddColor(col);
}
function cy_changeStyleColor(yanSe) {
var col, yanse;
yanSe = ps_toObject(yanSe);
var col = ys_colorToPsColor(yanSe);
App_setForegrounddColor(col);
var yanse = app.showColorPicker();
if (yanse == true) {
return ys_psColorToObject(app.foregroundColor);
}
return -1;
}
function ys_useStyleColor(yanSe) {
var col, iTuCengGeShu, kind;
try {
yanSe = JSON.parse(yanSe);
} catch (error) {

}
var col = ys_colorToPsColor(yanSe);
var iTuCengGeShu = Layer_getNumberOfCurrentLayer();
if ((iTuCengGeShu == 1) && (yanSe.isFill == true)) {
var kind = app.activeDocument.activeLayer.kind;
if (Layer_isBackground()) {
app.foregroundColor = col;
Layer_setBackgroudLayerColor();
return;
} else if (kind == LayerKind.NORMAL) {
app.foregroundColor = col;
Layer_lockTransparency();
Layer_altDelete();
Layer_unlockTransparency();
return;
} else {
if ((kind == LayerKind.SMARTOBJECT) || Layer_isGroup()) {
Layer_overlayColor(col);
App_setForegrounddColor(col);
return;
}
}
}
Layer_setSelectLayerColor(col, true);
}
function exportCurrentLayerToImage(params) {
var id, rect, desc888, name;
var id = app.activeDocument.id;
if (Layer_isNormal()) {
Layer_copyToDocument();
var rect = Layer_getBounds();
Doc_cutCanvas(parseInt(rect.cx), parseInt(rect.cy));
try {
Selection_all();
Layer_align(1);
Layer_align(3);
} catch (error) {

}
} else if (Layer_isSmartObject()) {
var desc888 = new ActionDescriptor();
executeAction(stringIDToTypeID("placedLayerEditContents"), desc888, DialogModes.NO);
} else {
return false;
}
var name = "sjzl_tempExportImg";
Doc_saveAsJpg(((Folder.userData + "/") + name) + ".jpg");
if (id != app.activeDocument.id) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES)
}
return File_getfsName(((Folder.userData + "/") + name) + ".jpg");
}
function ys_getGradientInfo(params) {
var obj, path, name;
if (Layer_isSolidFill() || Layer_isGradientFill()) {
var obj = Shape_getShapeGradient();
if (obj.fillGradient) {
if ((obj.fill.type == 1097754476) || (obj.fill.type == 1148022372)) {
app.documents.add(UnitValue("100 px"), UnitValue("60 px"), 72, "sjzltemp");
Shape_createRect(new Rect(0, 0, 100, 60));
Shape_setFillGradient(obj.fill);
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/Gradient/";
Fs_createFolder(path);
var name = ys_getTimeName() + ".png";
Doc_saveAs(path + name);
Doc_close();
obj.fill.fileName = name;
}
return ps_returnOk(obj.fill);
}
if (obj.strokeGradient) {
return ps_returnOk(obj.stroke);
}
return ps_returnErr("该形状图层没有渐变信息");
} else {
return ps_returnErr("仅支持添加形状图层的渐变色");
}
}
function ys_useGradient(objStr) {
var obj, aXuHao, strokeArr, fillArr, colorFill, fillAndStrokeArr, i, options, lx, lsObj;
var obj = ps_toObject(objStr);
var aXuHao = Layer_getSelectedLayerItemIndex();
var strokeArr = [];
var fillArr = [];
var colorFill = [];
var fillAndStrokeArr = [];
for (var i = 0;i < aXuHao.length; i += 1) {
var options = Action_onItemIndexGetDescriptor(aXuHao[i]);
var lx = options.getInteger(s2t("layerKind"));
if (lx == 4) {
var lsObj = Shape_getShapeInfo(options);
if (lsObj.fill && lsObj.stroke) {
fillAndStrokeArr.push(lsObj)
} else if (lsObj.fill) {
fillArr.push(aXuHao[i])
} else if (lsObj.stroke) {
strokeArr.push(aXuHao[i])
} else {
fillArr.push(aXuHao[i])
}
} else {
colorFill.push(aXuHao[i]);
}
}
if (fillArr.length > 0) {
Layer_onIndexMultipleSelectLayer(fillArr, true);
Shape_setFillGradient(obj);
}
if (strokeArr.length > 0) {
Layer_onIndexMultipleSelectLayer(strokeArr, true);
Shape_setStrokeGradient(obj);
}
for (var i = 0;i < fillAndStrokeArr.length; i += 1) {
Layer_onIndexSelectLayer(fillAndStrokeArr[i]);
Shape_setFillGradient(obj);
}
for (var i = 0;i < colorFill.length; i += 1) {
Layer_onIndexSelectLayer(colorFill[i]);
ys_setGradient(obj);
}
Layer_onIndexMultipleSelectLayer(aXuHao, false);
}
function ys_setGradient(obj) {
var list, i, item, newObj;
var list = [];
for (var i = 0;i < obj.gradient.colors.length; i += 1) {
var item = obj.gradient.colors[i];
var newObj = {
color: ys_graditenItemColorToMyColor(item.color),
position: item.location
};
list.push(newObj);
}
Style_setGradient(list, obj.type, obj.angle, 100, obj.align, obj.reverse);
}
function ys_graditenItemColorToMyColor(color) {
var col;
var col = new SolidColor();
if (Doc_isCMYK()) {
col.cmyk.cyan = color.cyan;
col.cmyk.magenta = color.magenta;
col.cmyk.yellow = color.yellow;
col.cmyk.black = color.black;
} else {
col.rgb.red = color.red;
col.rgb.green = color.grain;
col.rgb.blue = color.blue;
}
return psColorToMyColor(col);
}
function ys_getTimeName(params) {
var t, myDate, str;
var t = "";
var myDate = new Date();
var str = t;
str += (myDate.getFullYear() + "");
str += (ys_2WeiShu(myDate.getMonth() + 1) + "");
str += (ys_2WeiShu(myDate.getDate()) + "");
str += (ys_2WeiShu(myDate.getHours()) + "");
str += (ys_2WeiShu(myDate.getMinutes()) + "");
str += ys_2WeiShu(myDate.getSeconds());
return str;
}
function ys_2WeiShu(s) {
return s < 10 ? "0" + s : s;
}
function ys_getFontInfo() {
var aXuHao, res, i, obj, ZiTi, font, option, parag, DifferenceMax, itemA, itemB, val;
var aXuHao = Layer_getSelectedLayerItemIndex();
if (aXuHao.length > 6) {
return ps_returnErr("只能记录6个以内的文字图层哦");
}
var res = {
name: "",
fonts: []
};
try {
for (var i = 0;i < aXuHao.length; i += 1) {
var obj = ys_getFontObject();
Layer_onIndexSelectLayer(aXuHao[i]);
if (app.activeDocument.activeLayer.kind != LayerKind.TEXT) {
return ps_returnErr("请选择文本图层!");
}
var ZiTi = app.activeDocument.activeLayer.textItem;
try {
var font = ZiTi.font;
} catch (error) {
return ps_returnErr("读取字体样式失败，请重新设置字体后重试");
}
obj.scriptFamily = ZiTi.font;
try {
obj.weight = app.fonts.getByName(font).style;
} catch (e) {

}
try {
obj.fontName = ys_readFontName(app.fonts.getByName(font).name, obj.weight);
} catch (e) {
obj.fontName = font;
}
obj.size = ys_takeTwo(ZiTi.size * g_HuoQuTuCengBianHuanBiLi());
try {
obj.horizontalScale = ZiTi.horizontalScale;
} catch (e) {

}
try {
obj.verticalScale = ZiTi.verticalScale;
} catch (e) {

}
try {
obj.fauxBold = ZiTi.fauxBold;
} catch (e) {

}
try {
obj.fauxItalic = ZiTi.fauxItalic;
} catch (e) {

}
try {
obj.useAutoLeading = ZiTi.useAutoLeading;
} catch (e) {

}
try {
if (ZiTi.useAutoLeading == true) {
obj.leading = 0;
} else {
obj.leading = ys_takeTwo(ZiTi.leading * g_HuoQuTuCengBianHuanBiLi());
}
} catch (e) {

}
try {
obj.tracking = ZiTi.tracking;
} catch (e) {

}
try {
obj.baselineShift = ys_removePtUnit(ZiTi.baselineShift);
} catch (e) {

}
try {
if (ZiTi.autoKerning == AutoKernType.METRICS) {
obj.autoKerning = "metricsKern"
}
if (ZiTi.autoKerning == AutoKernType.OPTICAL) {
obj.autoKerning = "opticalKern"
}
if (ZiTi.autoKerning == AutoKernType.MANUAL) {
obj.autoKerning = "manual"
}
} catch (e) {

}
try {
if (ZiTi.capitalization == TextCase.ALLCAPS) {
obj.capitalization = "allCaps"
}
if (ZiTi.capitalization == TextCase.SMALLCAPS) {
obj.capitalization = "smallCaps"
}
if (ZiTi.capitalization == TextCase.NORMAL) {
obj.capitalization = "Nrml"
}
} catch (e) {

}
try {
if (ZiTi.strikeThru == StrikeThruType.STRIKEHEIGHT) {
obj.strikeThru = "xHeightStrikethroughOn"
}
if (ZiTi.strikeThru == StrikeThruType.STRIKEOFF) {
obj.strikeThru = "strikethroughOff"
}
} catch (e) {

}
try {
if (ZiTi.underline == UnderlineType.UNDERLINEOFF) {
obj.underline = "underlineOff"
} else {
obj.underline = "underlineOnLeftInVertical"
}
} catch (e) {

}
try {
obj.ligatures = ZiTi.ligatures;
} catch (e) {

}
try {
obj.alternateLigatures = ZiTi.alternateLigatures;
} catch (e) {

}
try {
obj.direction = ZiTi.direction == Direction.VERTICAL ? "vertical" : "horizontal";
} catch (e) {

}
obj.context = false;
try {
obj.language = "englishLanguage";
} catch (e) {

}
try {
obj.color = psColorToMyColor(app.activeDocument.activeLayer.textItem.color);
} catch (error) {

}
try {
obj.family = app.fonts.getByName(font).family;
} catch (e) {

}
obj.rect = Layer_getBounds();
obj.opacity = Layer_active().opacity;
try {
ZiTi.kind == TextType.POINTTEXT ? (obj.kind = "pointText") : (obj.kind = "paragraphText");
} catch (error) {
return ps_returnErr("读取字体样式失败，请重新设置字体后重试");
}
var option = Action_onItemIndexGetDescriptor(aXuHao[i]);
var parag = option.getObjectValue(s2t("textKey")).getList(s2t("paragraphStyleRange")).getObjectValue(0).getObjectValue(s2t("paragraphStyle"));
try {
obj.justification = t2s(parag.getEnumerationValue(s2t("align")));
} catch (error) {

}
try {
obj.leftIndent = ys_takeTwo(parag.getUnitDoubleValue(s2t("impliedStartIndent")));
} catch (error) {

}
try {
obj.rightIndent = ys_takeTwo(parag.getUnitDoubleValue(s2t("impliedEndIndent")));
} catch (error) {

}
try {
obj.spaceBefore = ys_takeTwo(parag.getUnitDoubleValue(s2t("impliedSpaceBefore")));
} catch (error) {

}
try {
obj.spaceAfter = ys_takeTwo(parag.getUnitDoubleValue(s2t("impliedSpaceAfter")));
} catch (error) {

}
try {
obj.firstLineIndent = ys_takeTwo(parag.getUnitDoubleValue(s2t("impliedFirstLineIndent")));
} catch (error) {

}
try {
obj.kinsokuSetName = t2s(parag.getEnumerationValue(s2t("kinsokuSetName")));
} catch (error) {

}
try {
obj.mojiKumiName = t2s(parag.getEnumerationValue(s2t("mojiKumiName")));
} catch (error) {

}
obj.layerName = Layer_active().name;
res.fonts.push(obj);
}
} catch (error) {
_A(error);
}
if (res.fonts.length > 1) {
res.fonts = res.fonts.sort(function (a, b) {
if ((a.rect.x == b.rect.x) && (a.rect.y == b.rect.y)) {
return 0;
}
if (a.rect.y < b.rect.y) {
return -1;
} else if (a.rect.y == b.rect.y) {
if (a.rect.x < b.rect.x) {
return -1;
} else {
return 1;
}
} else {
return 1;
}
});
var DifferenceMax = 10;
for (var i = 1;i < res.fonts.length; i += 1) {
var itemA = res.fonts[i - 1].rect;
var itemB = res.fonts[i].rect;
if ((((((((itemA.y >= itemB.y) && (itemA.y <= itemB.bottom)) || (itemA.bottom >= itemB.y)) && (itemA.bottom <= itemB.bottom)) || (itemB.y >= itemA.y)) && (itemB.y <= itemA.bottom)) || (itemB.bottom >= itemA.y)) && (itemB.bottom <= itemA.bottom)) {
res.fonts[i].relativePosition = "左右";
res.fonts[i].move = itemB.x - itemA.right;
var val = itemA.y - itemB.y;
res.fonts[i].moveTop = val;
} else {
res.fonts[i].relativePosition = "上下";
res.fonts[i].move = itemB.y - itemA.bottom;
var val = itemA.x - itemB.x;
res.fonts[i].moveLeft = val;
}
}
}
Layer_onIndexMultipleSelectLayer(aXuHao, true);
return ps_returnOk(res);
}
function ys_removePtUnit(n) {
n = n.toString();
n = n.substring(0, n.length - 3);
n = parseInt(n);
return n;
}
function g_HuoQuTuCengBianHuanBiLi() {
var ref, desc, transform, iYY;
var ref = new ActionReference();
ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID("textKey"));
if (desc.hasKey(stringIDToTypeID("transform"))) {
var transform = desc.getObjectValue(stringIDToTypeID("transform"));
var iYY = transform.getUnitDoubleValue(stringIDToTypeID("yy"));
return iYY;
}
return 1;
}
function ys_takeTwo(shu) {
var jieGuo;
var jieGuo = Math.round(parseFloat(shu) * 100) / 100;
return jieGuo;
}
function ys_readFontName(mingZi, cuXi) {
var iXiaBiao, xinMingZi, i;
var iXiaBiao = mingZi.indexOf(cuXi);
if (iXiaBiao == -1) {
return mingZi;
}
var xinMingZi = "";
for (var i = 0;i < iXiaBiao; i += 1) {
if (i == (iXiaBiao - 1)) {
if (mingZi[i] == " ") {
break ;
}
}
xinMingZi += mingZi[i];
}
return xinMingZi;
}
function ys_getFontObject(params) {
var obj;
var obj = {
scriptFamily: "ShiShangZhongHei",
weight: "Regular",
fontName: "",
size: 24,
horizontalScale: 100,
verticalScale: 100,
fauxBold: false,
fauxItalic: false,
useAutoLeading: false,
leading: 0,
tracking: 0,
baselineShift: 0,
autoKerning: "metricsKern",
capitalization: "Nrml",
strikeThru: "strikethroughOff",
underline: "underlineOff",
ligatures: false,
alternateLigatures: false,
context: false,
direction: "vertical",
language: "englishLanguage",
color: new Color(),
family: "Microsoft YaHei",
opacity: 100,
rect: {},
kind: "pointText",
justification: "left",
leftIndent: 0,
rightIndent: 0,
spaceBefore: 0,
spaceAfter: 0,
firstLineIndent: 0,
kinsokuSetName: "None",
mojiKumiName: "textOverrideFeatureName",
relativePosition: "左右",
move: 0
};
return obj;
}
function ys_rgbToMyColor(r, g, b) {
var col;
var col = new SolidColor();
col.rgb.red = r;
col.rgb.green = g;
col.rgb.blue = b;
return JSON.stringify(psColorToMyColor(col));
}
function ys_checkUseFont(obj) {
var arr;
obj = uncompileStr(obj);
obj = ps_toObject(obj);
var arr = Layer_getSelectedLayerItemIndex();
if (Layer_isText() == false) {
return ps_returnErr("请选择文字图层!");
}
if (obj.fonts.length == 1) {

} else {
if (obj.fonts.length != arr.length) {
return ps_returnErr("选择的图层数不一致，请重新选择!");
}
}
return ps_returnOk();
}
function ys_useFont(obj) {
var arr, arrRect, i, opt, lsObj, rect, prev, prevIndex, item;
obj = uncompileStr(obj);
obj = ps_toObject(obj);
if (Layer_isText() == false) {
return _A("请选择文字图层");
}
var arr = Layer_getSelectedLayerItemIndex();
if (obj.fonts.length == 1) {
Font_set(obj.fonts[0]);
Font_setDirection(obj.fonts[0].direction);
Font_setParagraphStyle(obj.fonts[0]);
if (obj.fonts[0].opacity != null) {
Layer_active().opacity = obj.fonts[0].opacity
}
} else if (obj.fonts.length != arr.length) {
return _A("选择的图层数不一致，请重新选择");
} else {
var arrRect = [];
for (var i = 0;i < arr.length; i += 1) {
var opt = Action_onItemIndexGetDescriptor(arr[i]);
var lsObj = opt.getObjectValue(s2t("bounds"));
var rect = {
x: lsObj.getUnitDoubleValue(s2t("left")),
y: lsObj.getUnitDoubleValue(s2t("top")),
index: arr[i]
};
arrRect.push(rect);
}
arrRect = arrRect.sort(function (a, b) {
if ((a.x == b.x) && (a.y == b.y)) {
return 0;
}
if (a.y < b.y) {
return -1;
} else if (a.y == b.y) {
if (a.x < b.x) {
return -1;
} else {
return 1;
}
} else {
return 1;
}
});
var prev = {};
var prevIndex = 0;
for (var i = 0;i < obj.fonts.length; i += 1) {
Layer_onIndexSelectLayer(arrRect[i].index);
var item = obj.fonts[i];
Font_set(item);
Font_setDirection(item.direction);
Font_setParagraphStyle(item);
if (item.opacity != null) {
Layer_active().opacity = item.opacity
}
if (i != 0) {
if (item.relativePosition == "上下") {
if (item.justification != obj.fonts[prevIndex].justification) {
Layer_moveLayerPosition(prev.x + item.moveLeft, prev.bottom + item.move);
} else {
Layer_moveLayerPosition(-1, parseInt(prev.bottom) + parseInt(item.move));
Layer_onIndexMultipleSelectLayer([arrRect[prevIndex].index, arrRect[i].index], true);
if (item.justification.indexOf("left") != -1) {
zt_setTextAlignment(0)
} else if (item.justification.indexOf("right") != -1) {
zt_setTextAlignment(2)
} else {
zt_setTextAlignment(1)
}
}
prevIndex = i;
Layer_onIndexSelectLayer(arrRect[i].index);
} else {
Layer_moveLayerPosition(prev.right + item.move, prev.y - item.moveTop)
}
}
prev = Layer_getBounds();
}
for (var i = 0;i < obj.fonts.length; i += 1) {
Layer_onIndexSelectLayer(arrRect[i].index);
var item = obj.fonts[i];
if ((i != 0) && (item.relativePosition == "左右")) {
Layer_moveLayerPosition(prev.right + item.move, prev.y - item.moveTop);
}
prev = Layer_getBounds();
}
Layer_onIndexMultipleSelectLayer(arr, true);
}
}
function ys_AddStyle(lsStr) {
var obj, groupId, arr, b, r1, opt, path, lsObj, post, min, pngSize, styleFile, f, i;
var obj = ps_toObject(lsStr);
var groupId = obj.groupId;
var arr = Layer_getSelectedLayerItemIndex();
if (arr.length > 1) {
return ps_returnErr("请选择单个文件");
}
var b = false;
try {
var r1 = new ActionReference();
var opt = new ActionDescriptor();
r1.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
opt = executeActionGet(r1);
b = opt.getBoolean(s2t("layerFXVisible"));
} catch (error) {
b = false;
}
if (!b) {
return ps_returnErr("当前图层没有图层样式");
}
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/kuStyle";
Fs_createFolder(path);
var lsObj = {
name: "未命名",
id: ps_getGuid()
};
Layer_copyLayerStyle();
Doc_copyLayerToNewDoc();
Layer_unLocking();
Layer_clearLayerStyle();
var post = Layer_getBounds();
var min = post.cx;
if (post.cy < post.cx) {
min = post.cy
}
Doc_cutCanvas(min, min);
Shape_createRect(new Rect(0, 0, min, min), true, false, new RGB(89, 89, 89));
Layer_pasteLayerStyle();
Layer_group("SS");
Layer_merge();
Layer_selectNext();
Layer_active().remove();
var pngSize = 40;
Doc_adjustImageCx(pngSize);
Doc_cutCanvas(pngSize * 2, pngSize * 2);
Doc_setRGBMode();
Doc_saveAs(((path + "/") + lsObj.id) + ".png");
Doc_close();
var styleFile = ((path + "/") + groupId) + ".psd";
var f = new File(styleFile);
if (f.exists) {
app.load(f);
} else {
app.documents.add(UnitValue("1 px"), UnitValue("1 px"), 72, "style");
}
app.activeDocument.artLayers.add();
lsObj.layerId = Layer_active().id;
Layer_pasteLayerStyle();
Layer_hideLayer();
for (var i = 0;i < obj.delArr.length; i += 1) {
try {
Layer_onIdSelectLayer(obj.delArr[i]);
if (Layer_active().id == obj.delArr[i]) {
Layer_active().remove()
}
} catch (error) {

}
}
if (f.exists) {
app.activeDocument.save();
} else {
Doc_saveAs(styleFile);
}
Doc_close();
return ps_returnOk(lsObj);
}
function ps_ysBtnUseStyle(obj) {
var path, file, f;
obj = ps_toObject(obj);
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/kuStyle";
var file = ((path + "/") + obj.groupId) + ".psd";
var f = new File(file);
if (!f.exists) {
return _A("设置失败，配置文件丢失");
}
app.load(f);
Layer_onIdSelectLayer(obj.layerId);
Layer_copyLayerStyle();
Doc_close();
try {
Layer_clearLayerStyle();
} catch (error) {

}
Layer_pasteLayerStyle();
return 1;
}
function ps_ysDeleteStyle(str) {
var obj, path, file, i;
var obj = JSON.parse(str);
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/kuStyle";
var file = new File(((path + "/") + obj.groupId) + ".psd");
if (!obj.deleteGroup) {

} else {
file.remove();
}
for (var i = 0;i < obj.arr.length; i += 1) {
File_delete(((path + "/") + obj.arr[i].id) + ".png");
}
}
function ps_ysCopyGroup(str) {
var obj, path, old, new1, i, o, n;
var obj = JSON.parse(str);
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/kuStyle";
var old = ((path + "/") + obj.oldGroupId) + ".psd";
var new1 = ((path + "/") + obj.newGroupId) + ".psd";
File_copy(old, new1);
for (var i = 0;i < obj.oldId.length; i += 1) {
var o = ((path + "/") + obj.oldId[i]) + ".png";
var n = ((path + "/") + obj.newId[i]) + ".png";
File_copy(o, n);
}
return 1;
}
function dz_callAction(data) {
var idPly, desc8, idnull, ref6, idActn, idASet;
data = ps_toObject(data);
dz_isLoadAcionPreset();
var idPly = charIDToTypeID("Ply ");
var desc8 = new ActionDescriptor();
var idnull = charIDToTypeID("null");
var ref6 = new ActionReference();
var idActn = charIDToTypeID("Actn");
ref6.putName(idActn, data.name);
var idASet = charIDToTypeID("ASet");
ref6.putName(idASet, data.group);
desc8.putReference(idnull, ref6);
executeAction(idPly, desc8, DialogModes.NO);
}
var g_loadAcionPreset = false;
function dz_isLoadAcionPreset(params) {
var arr, bLoad, i, path;
if (!g_loadAcionPreset) {
g_loadAcionPreset = true;
var arr = JSON.parse(dz_getActionList());
var bLoad = false;
for (var i = 0;i < arr.length; i += 1) {
if (arr[i].name === "设计助理预设动作库_V2") {
bLoad = true
}
}
if (!bLoad) {
var path = Folder.userData + "/fz.FengZi1Hao/preset/设计助理预设动作库_v2.atn";
app.load(new File(path));
}
}
}
function dz_getActionList(params) {
var list, setCounter, ref, desc, listItem, numberChildren, i, ls;
var list = [];
var setCounter = 1;
while (true) {
var ref = new ActionReference();
ref.putIndex(c2t("ASet"), setCounter);
var desc = undefined;
try {
desc = executeActionGet(ref);
} catch (e) {
break ;
}
var listItem = {
name: "",
children: []
};
if (desc.hasKey(c2t("Nm  "))) {
listItem.name = desc.getString(c2t("Nm  "));
}
var numberChildren = 0;
if (desc.hasKey(c2t("NmbC"))) {
numberChildren = desc.getInteger(c2t("NmbC"));
}
if (numberChildren) {
for (var i = 1;i <= numberChildren; i += 1) {
var ref = new ActionReference();
ref.putIndex(c2t("Actn"), i);
ref.putIndex(c2t("ASet"), setCounter);
var desc = undefined;
desc = executeActionGet(ref);
if (desc.hasKey(c2t("Nm  "))) {
var ls = {
name: desc.getString(c2t("Nm  ")),
isAdd: false
};
listItem.children.push(ls);
}
}
}
list.push(listItem);
setCounter++;
}
return JSON.stringify(list);
}
function cmm_batchName(str, isFilter) {
var aXuHao, iKai, xh, xinStr, bS, shuZi, ls, i, linStr, th;
var aXuHao = Layer_getSelectedLayerId();
if (isFilter) {
aXuHao = cmm_filterSubLayer(aXuHao);
}
if (aXuHao.length == 0) {
_A("请选择需要更改名称的图层");
return;
}
var iKai = 0;
var xh = 0;
var bS = false;
if (str.indexOf("%%") != -1) {
bS = true;
str = str.replace("%%", "%");
}
if (str.indexOf("n=") != -1) {
var shuZi = str.indexOf("n=");
var ls = str.split("n=")[1];
ls = parseInt(ls);
str = str.replace("=" + ls, "");
iKai = ls;
if (iKai > 1) {
iKai -= 1
}
}
for (var i = 0;i < aXuHao.length; i += 1) {
Layer_onIdSelectLayer(aXuHao[i]);
if (bS) {
xh = (aXuHao.length - i) + iKai
} else {
xh = (i + 1) + iKai
}
xinStr = str;
var linStr = "疯子" + str;
if (linStr.indexOf("###")) {
xinStr = str.replace("###", app.activeDocument.activeLayer.name);
}
if (str.indexOf("%nn") != -1) {
if (xh < 10) {
xh = "0" + xh
}
xinStr = xinStr.replace("%nn", xh);
app.activeDocument.activeLayer.name = xinStr;
} else if (str.indexOf("%n") != -1) {
xinStr = xinStr.replace("%n", xh);
app.activeDocument.activeLayer.name = xinStr;
} else if (str.indexOf("=>") != -1) {
var th = str.split("=>");
xinStr = app.activeDocument.activeLayer.name.replace(th[0], th[1]);
app.activeDocument.activeLayer.name = xinStr;
} else {
app.activeDocument.activeLayer.name = xinStr
}
}
Layer_onIdMultipleSelectLayer(aXuHao, false);
}
function cmm_filterSubLayer(arr) {
var i, layer;
for (var i = 0;i < arr.length; i += 1) {
Layer_onIdSelectLayer(arr[i]);
var layer = Layer_active();
while (true) {
if (layer.parent.typename != "Document") {
if (cmm_indexOf(arr, layer.parent.id) != -1) {
arr.splice(i, 1);
i--;
break ;
}
layer = layer.parent;
} else {
break ;
}
}
}
return arr;
}
function cmm_indexOf(arr, n) {
var i;
for (var i = 0;i < arr.length; i += 1) {
if (arr[i] == n) {
return i;
}
}
return -1;
}
function cmm_setLayerColor(n) {
var aYan, desc165, ref66, desc166;
var aYan = new Array("None", "Rd  ", "Orng", "Ylw ", "Grn ", "Bl  ", "Vlt ", "Gry ");
var desc165 = new ActionDescriptor();
var ref66 = new ActionReference();
ref66.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc165.putReference(c2t("null"), ref66);
var desc166 = new ActionDescriptor();
desc166.putEnumerated(c2t("Clr "), c2t("Clr "), c2t(aYan[n]));
desc165.putObject(c2t("T   "), c2t("Lyr "), desc166);
executeAction(c2t("setd"), desc165, DialogModes.NO);
}
var option = {
texts: [{
name: "价格",
layerName: "268",
id: 8
}],
images: [{
name: "图片",
layerName: "7",
id: 25
}],
data: "",
savePath: "",
fileName: {
type: "1",
variable1: "",
connector: "",
variable2: ""
},
imageOption: {
matching: "1",
size: "1"
}
};
function tb_getTextLayerInfo(params) {
var obj;
try {
if (Layer_getSelectLayerNumber() != 1) {
return ps_returnErr("请选择单个图层");
}
} catch (error) {
return ps_returnErr("请选择图层");
}
if (!Layer_isText()) {
return ps_returnErr("请选择文字图层");
}
var obj = {
layerName: Layer_active().name,
id: Layer_active().id
};
return ps_returnOk(obj);
}
function tb_getImageLayerInfo(params) {
var obj;
try {
if (Layer_getSelectLayerNumber() != 1) {
return ps_returnErr("请选择单个图层");
}
if (!(Layer_isNormal() || Layer_isSmartObject())) {
return ps_returnErr("请选择普通或智能对象图层");
}
var obj = {
layerName: Layer_active().name,
id: Layer_active().id
};
return ps_returnOk(obj);
} catch (error) {
return ps_returnErr("请选择图层");
}
}
function tb_setInfoToXmp(str) {
var text;
var text = "SheJiZhuLiOverprint";
XMP_write(text, str);
}
function tb_getOverprintInfo(params) {
var text;
var text = "SheJiZhuLiOverprint";
return XMP_read(text);
}
function tb_useOverprint(str) {
var opt, i, key, path, docName, docId, type, errMsg, item, j, textItem, errImg, j2, img, imgPath, bImgVal, format, grouped, newPath, variable, newName;
var opt = ps_toObject(str);
for (var i = 0;i < opt.data.length; i += 1) {
for (var key in opt.data[i]) {
opt.data[i][key] = uncompileStr(opt.data[i][key]);
}
}
try {
if (opt.customPath != "") {
path = opt.customPath;
} else {
if (opt.savePath == 1) {
path = Folder.desktop;
} else {
path = app.activeDocument.path;
}
}
} catch (error) {
_A("请保存文件夹后使用");
return null;
}
if (Fs_isFolder(path) == false) {
return ps_returnErr("保存到文件夹不存在，请重新设置");
}
path += "/套版批量生成";
Fs_createFolder(path);
var docName = Doc_getName();
var docId = app.activeDocument.id;
try {
type = File_getFileExt(app.activeDocument.name);
} catch (err) {
type = "psd";
}
var errMsg = "";
try {
for (var i = 0;i < opt.data.length; i += 1) {
Doc_copyCurrentStatus();
var item = opt.data[i];
for (var j = 0;j < opt.texts.length; j += 1) {
var textItem = opt.texts[j];
Layer_onIdSelectLayer(textItem.id);
Layer_active().textItem.contents = item[textItem.name];
}
var errImg = [];
for (var j2 = 0;j2 < opt.images.length; j2 += 1) {
var img = opt.images[j2];
var imgPath = item["图片所在目录"] + "/";
if ((typeof item["图片所在子目录"] != "undefined") && (item["图片所在子目录"] != "")) {
imgPath += (item["图片所在子目录"] + "/");
}
var bImgVal = true;
if (opt.imageOption.matching == 1) {
if ((typeof item[img.name] == "undefined") || (item[img.name] == "")) {
errImg.push(("图片变量：" + img.name) + "，缺少值<br>");
bImgVal = false;
}
imgPath += item[img.name];
} else {
var format = tb_matchFormat(imgPath, j2 + 1);
imgPath += format;
}
if ((File_isFile(imgPath) && bImgVal) && tb_isImagePath(imgPath)) {
Layer_onIdSelectLayer(img.id);
var grouped = Layer_active().grouped;
if (opt.imageOption.size == 2) {
Layer_deleteCurrentLayer();
}
cy_embedImageIntoCurrentLayer(imgPath);
if (opt.imageOption.size == 1) {
Layer_onIdSelectLayer(img.id);
Layer_deleteCurrentLayer();
Layer_selectPrev();
}
try {
if (Layer_active().grouped != grouped) {
Layer_embedClipMask(grouped)
}
} catch (error) {

}
} else {
if (bImgVal) {
errImg.push(("缺少图片:" + imgPath) + "<br>");
}
}
}
var newPath = "";
if ((opt.fileName.docName != "[文档名]") && (opt.fileName.docName != "")) {
docName = opt.fileName.docName;
}
var variable = "";
if (typeof item[opt.fileName.variable] != "undefined") {
variable = item[opt.fileName.variable];
} else {
variable = i + 1;
}
var newName = "";
if (opt.fileName.type == 1) {
newName = (((variable + opt.fileName.connector) + docName) + ".") + type;
} else {
newName = (((docName + opt.fileName.connector) + variable) + ".") + type;
}
var newPath = tb_getPsdPath(path, newName);
if (type.toLowerCase() === "psb") {
Doc_saveAsPsb(newPath);
} else {
Doc_saveAsPsd(newPath);
}
if (opt.exportImage) {
cy_ExportImage(JSON.stringify(opt.exportImageOption));
}
Doc_close();
if (errImg.length > 0) {
errMsg += ((newName + "，异常信息：<br>") + errImg.join(""));
}
}
} catch (error) {
if (docId != app.activeDocument.id) {
Doc_close()
}
return ps_returnErr(error.message);
}
return errMsg == "" ? ps_returnOk() : ps_returnErr(errMsg);
}
function overprint_useOverprint(str) {
var opt, i, key, path, docName, docId, type, errMsg, item, j, textItem, errImg, j2, img, imgPath, bImgVal, format, grouped, msg, newPath, savePath;
var opt = ps_toObject(str);
for (var i = 0;i < opt.data.length; i += 1) {
for (var key in opt.data[i]) {
opt.data[i][key] = uncompileStr(opt.data[i][key]);
}
}
try {
if (opt.customPath != "") {
path = opt.customPath;
} else {
if (opt.savePath == 1) {
path = Folder.desktop;
} else {
path = app.activeDocument.path;
}
}
} catch (error) {
_A("请保存文件夹后使用");
return null;
}
if (Fs_isFolder(path) == false) {
return ps_returnErr("保存到文件夹不存在，请重新设置");
}
path += "/套版批量生成";
Fs_createFolder(path);
var docName = Doc_getName();
var docId = app.activeDocument.id;
try {
type = File_getFileExt(app.activeDocument.name);
} catch (err) {
type = "psd";
}
var errMsg = "";
try {
for (var i = 0;i < opt.data.length; i += 1) {
Doc_copyCurrentStatus();
var item = opt.data[i];
for (var j = 0;j < opt.texts.length; j += 1) {
var textItem = opt.texts[j];
Layer_onIdSelectLayer(textItem.id);
Layer_setText(item[textItem.name]);
}
var errImg = [];
for (var j2 = 0;j2 < opt.images.length; j2 += 1) {
var img = opt.images[j2];
var imgPath = item["图片所在目录"] + "/";
if ((typeof item["图片所在子目录"] != "undefined") && (item["图片所在子目录"] != "")) {
imgPath += (item["图片所在子目录"] + "/");
}
var bImgVal = true;
if (opt.imageOption.matching == 1) {
if ((typeof item[img.name] == "undefined") || (item[img.name] == "")) {
errImg.push(("图片变量：" + img.name) + "，缺少值<br>");
bImgVal = false;
}
imgPath += item[img.name];
} else {
var format = tb_matchFormat(imgPath, j2 + 1);
imgPath += format;
}
if ((File_isFile(imgPath) && bImgVal) && tb_isImagePath(imgPath)) {
Layer_onIdSelectLayer(img.id);
var grouped = Layer_active().grouped;
if (opt.imageOption.size == 2) {

}
try {
cy_embedImageIntoCurrentLayer(imgPath);
} catch (err) {
var msg = (((("变量" + img.name) + "嵌入图片:") + imgPath) + "失败") + "<br>";
errImg.push(msg);
}
if (opt.imageOption.size == 1) {
Layer_onIdSelectLayer(img.id);
Layer_selectPrev();
}
if (opt.imgReplaceType == 1) {
try {
Layer_releaseClipMask();
} catch (err) {

}
Layer_onIdSelectLayer(img.id);
Layer_deleteCurrentLayer();
}
} else {
if (bImgVal) {
errImg.push(("缺少图片:" + imgPath) + "<br>");
}
}
}
var newPath = (path + "/") + opt.fileFullName;
if (opt.exportImage) {
if (opt.ext == "gif") {
ps_exportGif(newPath + ".gif");
} else {
Doc_saveAs((newPath + ".") + opt.ext);
}
}
if (opt.isExportPsd) {
var savePath = (newPath + ".") + type;
if (type.toLowerCase() === "psb") {
Doc_saveAsPsb(savePath);
} else {
Doc_saveAsPsd(savePath);
}
}
Doc_close();
if (errImg.length > 0) {
errMsg += ("异常信息：<br>" + errImg.join(""));
}
}
} catch (error) {
if (docId != app.activeDocument.id) {
Doc_close()
}
return ps_returnErr(error.message);
}
return errMsg == "" ? ps_returnOk() : ps_returnErr(errMsg);
}
function tb_isImagePath(path) {
var ext, arr, i;
var ext = File_getFileExt(path);
ext = ext.toLowerCase();
var arr = ["jpg", "jpeg", "png", "bmp", "gif", "tif", "psd", "psb"];
for (var i = 0;i < arr.length; i += 1) {
if (arr[i] == ext) {
return true;
}
}
return false;
}
function tb_getPsdPath(path, newName) {
var psdPath, name, i;
var psdPath = (path + "/") + newName;
if (File_isFile(psdPath) == false) {
return psdPath;
}
var name = newName.substring(0, newName.length - 4);
for (var i = 1;i < 1000; i += 1) {
psdPath = ((((path + "/") + name) + "_") + i) + ".psd";
if (File_isFile(psdPath) == false) {
return psdPath;
}
}
}
function tb_openPsdFolder(str) {
var opt, path;
var opt = ps_toObject(str);
if (opt.customPath != "") {
path = opt.customPath;
} else {
if (opt.savePath == 1) {
path = Folder.desktop;
} else {
path = app.activeDocument.path;
}
}
path += "/套版批量生成";
Fs_openFolder(path);
}
function tb_matchFormat(path, num) {
var arr, i;
var arr = [".jpg", ".png", ".jpeg", ".tif", ".bmp", ".webp"];
for (var i = 0;i < arr.length; i += 1) {
if (File_isFile(((path + "/") + num) + arr[i])) {
return num + arr[i];
}
}
return num + arr[0];
}
function overprint_getAllLayers() {
var out;
var out = {
texts: [],
images: []
};
function getLayers(layers) {
var i, obj;
for (var i = 0;i < layers.length; i += 1) {
if ((layers[i].kind === LayerKind.TEXT) && !layers[i].allLocked) {
var obj = {};
obj.id = layers[i].id;
obj.type = "text";
obj.layerName = layers[i].name;
out.texts.push(obj);
}
if (((layers[i].kind == LayerKind.SMARTOBJECT) || (layers[i].kind == LayerKind.NORMAL)) && !layers[i].allLocked) {
var obj = {};
obj.id = layers[i].id;
obj.type = "image";
obj.layerName = layers[i].name;
out.images.push(obj);
}
if (layers[i].typename == "LayerSet") {
getLayers(layers[i].layers);
}
}
}
getLayers(app.activeDocument.layers);
return ps_returnOk(out);
}
function overprint_getSelectedLayerByItemIndex() {
var selectIndexs, out, i, layDescriptor, kind, lay;
var selectIndexs = Layer_getSelectedLayerItemIndex();
var out = [];
for (var i = 0;i < selectIndexs.length; i += 1) {
var layDescriptor = Action_onItemIndexGetDescriptor(selectIndexs[i]);
var kind = layDescriptor.getInteger(s2t("layerKind"));
if (((kind == 1) || (kind == 3)) || (kind == 5)) {
var lay = {};
lay.id = layDescriptor.getInteger(s2t("layerID"));
lay.layerName = layDescriptor.getString(s2t("name"));
lay.type = kind == 3 ? "text" : "image";
out.push(lay);
}
}
return ps_returnOk(out);
}
function ps_exportGif(path) {
var document, fileOut, exportOptionsSaveForWeb;
var document = app.activeDocument;
var fileOut = new File(path);
var exportOptionsSaveForWeb = new ExportOptionsSaveForWeb();
exportOptionsSaveForWeb.transparency = false;
exportOptionsSaveForWeb.includeProfile = true;
exportOptionsSaveForWeb.lossy = 0;
exportOptionsSaveForWeb.colors = 256;
exportOptionsSaveForWeb.colorReduction = ColorReductionType.SELECTIVE;
exportOptionsSaveForWeb.format = SaveDocumentType.COMPUSERVEGIF;
exportOptionsSaveForWeb.ditherAmount = 0;
exportOptionsSaveForWeb.dither = Dither.NOISE;
exportOptionsSaveForWeb.palette = Palette.LOCALADAPTIVE;
document.exportDocument(fileOut, ExportType.SAVEFORWEB, exportOptionsSaveForWeb);
}
function Unit_toPx(value) {
var resolutionScale, a;
var resolutionScale = app.activeDocument.resolution / 72;
if (value.toString().indexOf("px") != -1) {
resolutionScale = 1
}
var a = UnitValue(value);
return parseFloat(a.as("px")) * resolutionScale;
}
function Unit_pxToUnitString(value, unit) {
var a;
var a = UnitValue(value);
return (a.as(unit) + " ") + unit;
}
function Unit_setPx(old) {
var ls;
if (typeof old == "undefined") {
if (app.preferences.rulerUnits != Units.PIXELS) {
var ls = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
return ls;
}
return undefined;
} else {
app.preferences.rulerUnits = old;
}
}
function Rect(x, y, w, h) {
this.x = x;
this.y = y;
this.cx = w;
this.cy = h;
this.right = x + w;
this.bottom = y + h;
}
Rect.prototype.isEmpty = function (params) {
return (this.cx == 0) && (this.cy == 0);
};
function RGB(r, g, b) {
this.r = r;
this.g = g;
this.b = b;
}
RGB.prototype.toHex = function (params) {
var r, g, b, hex, i, item;
var r = Math.round(this.r);
var g = Math.round(this.g);
var b = Math.round(this.b);
var hex = [r.toString(16), g.toString(16), b.toString(16)];
for (var i = 0;i < hex.length; i += 1) {
var item = hex[i];
if (item.length == 1) {
hex[i] = "0" + item;
}
}
return hex.join("");
};
RGB.prototype.toPsColor = function (params) {
var color;
var color = new SolidColor();
color.red = this.r;
color.grain = this.g;
color.blue = this.b;
return color();
};
function CMYK(c, m, y, k) {
this.c = c;
this.m = m;
this.y = y;
this.k = k;
}
function LAB(l, a, b) {
this.l = l;
this.a = a;
this.b = b;
}
function Color(params) {
var type;
var type = "rgb";
if (Doc_isCMYK()) {
type = "cmyk";
} else {
if (Doc_isLAB()) {
type = "lab";
}
}
this.type = type;
this.rgb = new RGB(0, 0, 0);
this.cmyk = new CMYK(100, 100, 100, 100);
this.lab = new LAB(0, 0, 0);
this.hex = "000000";
}
Color.prototype.getDescriptor = function (col) {
var dCol3, dCol4;
var dCol3 = new ActionDescriptor();
var dCol4 = new ActionDescriptor();
if (app.activeDocument.mode == DocumentMode.CMYK) {
dCol4.putDouble(c2t("Cyn "), col.cmyk.cyan);
dCol4.putDouble(c2t("Mgnt"), col.cmyk.magenta);
dCol4.putDouble(c2t("Ylw "), col.cmyk.yellow);
dCol4.putDouble(c2t("Blck"), col.cmyk.black);
dCol3.putObject(c2t("Clr "), c2t("CMYC"), dCol4);
} else if (app.activeDocument.mode == DocumentMode.LAB) {
dCol4.putDouble(c2t("Lmnc"), col.lab.l);
dCol4.putDouble(c2t("A   "), col.lab.a);
dCol4.putDouble(c2t("B   "), col.lab.b);
dCol3.putObject(c2t("Clr "), c2t("LbCl"), dCol4);
} else {
dCol4.putDouble(s2t("red"), col.rgb.red);
dCol4.putDouble(s2t("grain"), col.rgb.green);
dCol4.putDouble(s2t("blue"), col.rgb.blue);
dCol3.putObject(c2t("Clr "), c2t("RGBC"), dCol4);
}
return dCol3;
};
function Color_psColorToDescriptor(col) {
var dCol3, dCol4;
var dCol3 = new ActionDescriptor();
var dCol4 = new ActionDescriptor();
if (app.activeDocument.mode == DocumentMode.CMYK) {
dCol4.putDouble(c2t("Cyn "), col.cmyk.cyan);
dCol4.putDouble(c2t("Mgnt"), col.cmyk.magenta);
dCol4.putDouble(c2t("Ylw "), col.cmyk.yellow);
dCol4.putDouble(c2t("Blck"), col.cmyk.black);
dCol3.putObject(c2t("Clr "), c2t("CMYC"), dCol4);
} else if (app.activeDocument.mode == DocumentMode.LAB) {
dCol4.putDouble(c2t("Lmnc"), col.lab.l);
dCol4.putDouble(c2t("A   "), col.lab.a);
dCol4.putDouble(c2t("B   "), col.lab.b);
dCol3.putObject(c2t("Clr "), c2t("LbCl"), dCol4);
} else {
dCol4.putDouble(s2t("red"), col.rgb.red);
dCol4.putDouble(s2t("grain"), col.rgb.green);
dCol4.putDouble(s2t("blue"), col.rgb.blue);
dCol3.putObject(c2t("Clr "), c2t("RGBC"), dCol4);
}
return dCol3;
}
function colorToPsColor(obj) {
var col;
if ((obj == null) || (typeof obj == "undefined")) {
return obj;
}
var col = new SolidColor();
if (Doc_isCMYK()) {
col.cmyk.cyan = obj.cmyk.c;
col.cmyk.magenta = obj.cmyk.m;
col.cmyk.yellow = obj.cmyk.y;
col.cmyk.black = obj.cmyk.k;
} else if (Doc_isLAB()) {
col.lab.l = obj.lab.l;
col.lab.a = obj.lab.a;
col.lab.b = obj.lab.b;
} else {
col.rgb.red = obj.rgb.r;
col.rgb.green = obj.rgb.g;
col.rgb.blue = obj.rgb.b;
}
return col;
}
function psColorToRGB(psCol) {
var c;
var c = psCol.rgb;
return new RGB(Math.round(c.red), Math.round(c.green), Math.round(c.blue));
}
function psColorToCMYK(psCol) {
var c;
var c = psCol.cmyk;
return new CMYK(Math.round(c.cyan), Math.round(c.magenta), Math.round(c.yellow), Math.round(c.black));
}
function psColorToLAB(psCol) {
var c;
var c = psCol.lab;
return new LAB(Math.round(c.l), Math.round(c.a), Math.round(c.b));
}
function psColorToMyColor(psCol) {
var col;
var col = new Color();
col.rgb = psColorToRGB(psCol);
col.hex = col.rgb.toHex();
col.cmyk = psColorToCMYK(psCol);
col.lab = psColorToLAB(psCol);
return col;
}
function psColorActionObjectToMyColor(dCol) {
var col;
var col = new Color();
if (Doc_isCMYK()) {
col.cmyk = psGetObjectValueToCMYK(dCol);
} else if (Doc_isLAB()) {
col.lab = psGetObjectValueToLAB(dCol);
} else {
if (Doc_isRGB()) {
col.rgb = psGetObjectValueToRGB(dCol);
col.hex = col.rgb.toHex();
}
}
return col;
}
function psGetObjectValueToRGB(obj) {
var r, g, b;
var r = obj.getDouble(s2t("red"));
var g = obj.getDouble(s2t("grain"));
var b = obj.getDouble(s2t("blue"));
return new RGB(Math.round(r), Math.round(g), Math.round(b));
}
function psGetObjectValueToLAB(obj) {
var r, g, b;
var r = obj.getDouble(c2t("Lmnc"));
var g = obj.getDouble(c2t("A   "));
var b = obj.getDouble(c2t("B   "));
return new LAB(Math.round(r), Math.round(g), Math.round(b));
}
function psGetObjectValueToCMYK(obj) {
var c, m, y, k;
var c = obj.getDouble(s2t("cyan"));
var m = obj.getDouble(s2t("magenta"));
var y = obj.getDouble(s2t("yellowColor"));
var k = obj.getDouble(s2t("black"));
return new CMYK(Math.round(c), Math.round(m), Math.round(y), Math.round(k));
}
function Selection_getBounds(lsSelect) {
var lsUnits, x, y, cx, cy;
var lsUnits = Unit_setPx();
try {
if (typeof lsSelect == "undefined") {
lsSelect = app.activeDocument.selection
}
var x = parseFloat(lsSelect.bounds[0]);
var y = parseFloat(lsSelect.bounds[1]);
var cx = parseFloat(lsSelect.bounds[2]) - x;
var cy = parseFloat(lsSelect.bounds[3]) - y;
Unit_setPx(lsUnits);
} catch (error) {
Unit_setPx(lsUnits);
throw new Error("错误")
}
return new Rect(x, y, cx, cy);
}
function Selection_isTrue(params) {
var a;
try {
var a = app.activeDocument.selection.bounds[0];
return true;
} catch (error) {
return false;
}
}
function Selection_creteRect(rect) {
var desc1188, ref399, desc1189;
var desc1188 = new ActionDescriptor();
var ref399 = new ActionReference();
ref399.putProperty(c2t("Chnl"), c2t("fsel"));
desc1188.putReference(c2t("null"), ref399);
var desc1189 = new ActionDescriptor();
desc1189.putUnitDouble(c2t("Top "), c2t("#Pxl"), rect.y);
desc1189.putUnitDouble(c2t("Left"), c2t("#Pxl"), rect.x);
desc1189.putUnitDouble(c2t("Btom"), c2t("#Pxl"), rect.y + rect.cy);
desc1189.putUnitDouble(c2t("Rght"), c2t("#Pxl"), rect.x + rect.cx);
desc1188.putObject(c2t("T   "), c2t("Rctn"), desc1189);
executeAction(c2t("setd"), desc1188, DialogModes.NO);
}
function Selection_clear(params) {
var desc1210, ref409;
var desc1210 = new ActionDescriptor();
var ref409 = new ActionReference();
ref409.putProperty(c2t("Chnl"), c2t("fsel"));
desc1210.putReference(c2t("null"), ref409);
desc1210.putEnumerated(c2t("T   "), c2t("Ordn"), c2t("None"));
executeAction(c2t("setd"), desc1210, DialogModes.NO);
}
function Selection_all(params) {
var d1, r1;
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
r1.putProperty(c2t("Chnl"), c2t("fsel"));
d1.putReference(c2t("null"), r1);
d1.putEnumerated(c2t("T   "), c2t("Ordn"), c2t("Al  "));
executeAction(c2t("setd"), d1, DialogModes.NO);
}
function Select_createLine(y) {
var desc1814, ref491, desc1815;
var desc1814 = new ActionDescriptor();
var ref491 = new ActionReference();
ref491.putProperty(c2t("Chnl"), c2t("fsel"));
desc1814.putReference(c2t("null"), ref491);
var desc1815 = new ActionDescriptor();
desc1815.putUnitDouble(c2t("Top "), c2t("#Pxl"), y);
desc1814.putObject(c2t("T   "), c2t("Sngr"), desc1815);
executeAction(c2t("setd"), desc1814, DialogModes.NO);
}
function Guid_addX(x, isArtboard) {
Guid_addGuide("x", x, isArtboard);
}
function Guid_addY(y, isArtboard) {
Guid_addGuide("y", y, isArtboard);
}
function Guid_addGuide(direction, val, isArtboard) {
var desc37, desc38, ref4;
var desc37 = new ActionDescriptor();
var desc38 = new ActionDescriptor();
desc38.putUnitDouble(c2t("Pstn"), c2t("#Pxl"), val);
if (direction == "x") {
desc38.putEnumerated(c2t("Ornt"), c2t("Ornt"), c2t("Vrtc"))
} else {
desc38.putEnumerated(c2t("Ornt"), c2t("Ornt"), c2t("Hrzn"))
}
desc38.putEnumerated(c2t("Knd "), c2t("Knd "), c2t("Dcmn"));
desc37.putObject(c2t("Nw  "), c2t("Gd  "), desc38);
var ref4 = new ActionReference();
ref4.putClass(c2t("Gd  "));
desc37.putReference(c2t("null"), ref4);
if (isArtboard === true) {
desc37.putEnumerated(s2t("guideTarget"), s2t("guideTarget"), s2t("guideTargetSelectedArtboard"))
} else {
desc37.putEnumerated(s2t("guideTarget"), s2t("guideTarget"), s2t("guideTargetCanvas"))
}
executeAction(c2t("Mk  "), desc37, DialogModes.NO);
}
function Point(x, y) {
this.x = x;
this.y = y;
}
Point.prototype.toString = function () {
return (this.x + ",") + this.y;
};
Point.prototype.toDescriptor = function () {
var result;
var result = new ActionDescriptor();
result.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), this.x);
result.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), this.y);
return result;
};
function Layer_getItemIndexLayerBounds(index, layerObj) {
var lsObj, bounds, obj;
typeof layerObj == "undefined" ? (lsObj = Layer_getLayerIteamIndexObject(index)) : (lsObj = layerObj);
var bounds = lsObj.getObjectValue(s2t("bounds"));
var obj = {};
obj.x = parseFloat(bounds.getUnitDoubleValue(s2t("left")));
obj.y = parseFloat(bounds.getUnitDoubleValue(s2t("top")));
obj.cx = parseFloat(bounds.getUnitDoubleValue(s2t("width")));
obj.cy = parseFloat(bounds.getUnitDoubleValue(s2t("height")));
return new Rect(obj.x, obj.y, obj.cx, obj.cy);
}
function Layer_getLayerIteamIndexObject(xuHao) {
var pianYi, r, d, options;
var pianYi = 0;
try {
if (app.activeDocument.backgroundLayer) {
pianYi = -1
}
} catch (e) {

}
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIndex(c2t("Lyr "), xuHao + pianYi);
d.putReference(c2t("null"), r);
var options = executeAction(c2t("getd"), d, DialogModes.NO);
return options;
}
function ArtBoard_getCurrentArtBoardBounds(params) {
var art, item, i, rect;
var art = Doc_getArtboardsIndex();
if (art.length > 0) {
var item = app.activeDocument.activeLayer.itemIndex;
for (var i = 0;i < art.length; i += 1) {
if (item <= art[i]) {
item = art[i];
break ;
}
}
var rect = Layer_getItemIndexLayerBounds(item);
return rect;
} else {
return false;
}
}
function Tool_set(name) {
var desc617, ref128;
var desc617 = new ActionDescriptor();
var ref128 = new ActionReference();
ref128.putClass(s2t(name));
desc617.putReference(c2t("null"), ref128);
desc617.putBoolean(s2t("dontRecord"), true);
desc617.putBoolean(s2t("forceNotify"), true);
executeAction(c2t("slct"), desc617, DialogModes.NO);
}
function Tool_setEyedropperTool(params) {
Tool_set("eyedropperTool");
}
function File_getFileFullName(path) {
var ls, name;
var ls = path.split("/");
var name = ls[ls.length - 1];
return name;
}
function File_getFileName(path) {
var ls, val, arr, name;
var ls = path.split("/");
var val = ls[ls.length - 1];
var arr = val.split(".");
arr.pop();
var name = arr.join(".");
return name;
}
function File_getFileExt(path) {
var ls, val, name;
var ls = path.split("/");
var val = ls[ls.length - 1];
var name = val.split(".");
return name[name.length - 1];
}
function File_getFileDirectory(path) {
var ls, dir;
var ls = path.split("/");
ls.pop();
var dir = ls.join("/");
return dir;
}
function File_isFile(path) {
var file, exists;
var file = new File(path);
var exists = file.exists;
file.close();
return exists;
}
function File_delete(path) {
var file;
var file = new File(path);
if (file.exists) {
file.remove();
file.close();
return true;
}
return false;
}
function File_copy(old, target) {
var f;
var f = new File(old);
if (f.exists) {
f.copy(target);
f.close();
return true;
}
return false;
}
function File_write(str, path) {
var f;
var f = new File(path);
f.open("w");
f.encoding = "UTF8";
f.writeln(str);
f.close();
}
function File_read(name) {
var f, str;
var f = new File(name);
if (!f.exists) {
return -1;
}
f.open();
f.open("r");
var str = f.read();
f.close();
return str;
}
function File_getNumberPath(path) {
var dir, name, ext, i, newPath;
if (!File_isFile(path)) {
return path;
}
var dir = File_getFileDirectory(path);
var name = File_getFileName(path);
var ext = File_getFileExt(path);
for (var i = 1;i < 4000; i += 1) {
var newPath = (((((dir + "/") + name) + "_") + i) + ".") + ext;
if (File_isFile(newPath) === false) {
return newPath;
}
}
return path;
}
function File_getfsName(path) {
var f;
var f = new File(path);
return f.fsName;
}
function File_openFile(name, ext) {
var path;
var path = File.openDialog(name, ext, false);
if (path == null) {
return -1;
}
return File_getfsName(path);
}
function File_openImage() {
return File_openFile("请选择图片", ["*.png", "*.jpg", "*.bmp", "*.jpeg"]);
}
function Fs_createFolder(path) {
var fol;
var fol = new Folder(path);
if (fol.exists == false) {
fol.create();
}
}
function Fs_isFolder(path) {
var file;
var file = new Folder(path);
return file.exists;
}
function Fs_deleteFolder(muLu) {
var fol, af, i, f;
var fol = new Folder(muLu);
if (fol.exists == false) {
return -1;
}
var af = fol.getFiles(function (stuff) {
return stuff instanceof File;
});
for (var i = 0;i < af.length; i += 1) {
var f = new File(af[i]);
if (f.exists) {
f.remove()
}
}
af = fol.getFiles(function (stuff) {
return stuff instanceof Folder;
});
for (var i = 0;i < af.length; i += 1) {
Fs_deleteFolder(af[i]);
}
fol.remove();
return 1;
}
function Fs_copyFolder(qiShi, muBiao) {
var fQs, af, i, f, str, iZuiHou, mz, xinMu, linFol;
if (qiShi[qiShi.length - 1] != "/") {
qiShi += "/"
}
if (muBiao[muBiao.length - 1] != "/") {
muBiao += "/"
}
var fQs = new Folder(qiShi);
if (fQs.exists == false) {
return -1;
}
Fs_createFolder(muBiao);
var af = fQs.getFiles(function (stuff) {
return stuff instanceof File;
});
for (var i = 0;i < af.length; i += 1) {
var f = new File(af[i]);
if (f.exists) {
var str = decodeURI(af[i]);
var iZuiHou = str.lastIndexOf("/") + 1;
var mz = str.substring(iZuiHou);
f.copy(muBiao + encodeURI(mz));
}
}
af = fQs.getFiles(function (stuff) {
return stuff instanceof Folder;
});
for (var i = 0;i < af.length; i += 1) {
var str = decodeURI(af[i]);
var iZuiHou = str.lastIndexOf("/");
var mz = str.substring(iZuiHou);
var xinMu = muBiao + encodeURI(mz);
var linFol = new Folder(xinMu);
if (linFol.exists == false) {
linFol.create()
}
Fs_copyFolder(af[i], xinMu + "/");
}
return 1;
}
function Fs_openFolder(path) {
var file;
var file = new Folder(path);
if (file.exists) {
file.execute()
}
}
function Fs_selectFolder(params) {
var str, fol;
var str = Folder.selectDialog();
if (str == null) {
return -1;
}
var str = decodeURI(str);
var fol = new Folder(str);
return fol.fsName.replace(/\\/g, "/");
}
function XMP_read(text) {
var xmp;
if (ExternalObject.AdobeXMPScript == undefined) {
ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript")
}
var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
return xmp.getProperty(XMPConst.NS_PHOTOSHOP, text).toString();
}
function XMP_write(text, string) {
var xmp;
if (ExternalObject.AdobeXMPScript == undefined) {
ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript")
}
var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
xmp.setProperty(XMPConst.NS_PHOTOSHOP, text, string);
app.activeDocument.xmpMetadata.rawData = xmp.serialize();
}
function XMP_delete(text) {
var xmp;
if (ExternalObject.AdobeXMPScript == undefined) {
ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript")
}
var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
xmp.deleteProperty(XMPConst.NS_PHOTOSHOP, text);
app.activeDocument.xmpMetadata.rawData = xmp.serialize();
}
function setDefalut(val, defalutVal) {
return typeof val == "undefined" ? defalutVal : val;
}
function Style_setGradient(colList, type, angle, zoom, alignLayer, reverse) {
var desc24, ref3, desc25, desc26, desc27, list4, color, i, num, psCol, postion, desc28, list5, desc32, desc33, desc34;
type = setDefalut(type, "Lnr ");
angle = setDefalut(angle, 0);
zoom = setDefalut(zoom, 100);
alignLayer = setDefalut(alignLayer, true);
reverse = setDefalut(reverse, false);
var desc24 = new ActionDescriptor();
var ref3 = new ActionReference();
ref3.putProperty(c2t("Prpr"), c2t("Lefx"));
ref3.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc24.putReference(c2t("null"), ref3);
var desc25 = new ActionDescriptor();
desc25.putUnitDouble(c2t("Scl "), c2t("#Prc"), 100);
var desc26 = new ActionDescriptor();
desc26.putBoolean(c2t("enab"), true);
desc26.putBoolean(s2t("present"), true);
desc26.putBoolean(s2t("showInDialog"), true);
desc26.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
desc26.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
var desc27 = new ActionDescriptor();
desc27.putString(c2t("Nm  "), "");
desc27.putEnumerated(c2t("GrdF"), c2t("GrdF"), c2t("CstS"));
desc27.putDouble(c2t("Intr"), 4096);
var list4 = new ActionList();
var color = new Color();
for (var i = 0;i < colList.length; i += 1) {
var num = 4096 / (colList.length - 1);
var psCol = colorToPsColor(colList[i].color);
var postion = typeof colList[i].position == "undefined" ? i * num : colList[i].position;
var desc28 = color.getDescriptor(psCol);
desc28.putEnumerated(c2t("Type"), c2t("Clry"), c2t("UsrS"));
desc28.putInteger(c2t("Lctn"), postion);
desc28.putInteger(c2t("Mdpn"), 50);
list4.putObject(c2t("Clrt"), desc28);
}
desc27.putList(c2t("Clrs"), list4);
var list5 = new ActionList();
var desc32 = new ActionDescriptor();
desc32.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc32.putInteger(c2t("Lctn"), 0);
desc32.putInteger(c2t("Mdpn"), 50);
list5.putObject(c2t("TrnS"), desc32);
var desc33 = new ActionDescriptor();
desc33.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc33.putInteger(c2t("Lctn"), 4096);
desc33.putInteger(c2t("Mdpn"), 50);
list5.putObject(c2t("TrnS"), desc33);
desc27.putList(c2t("Trns"), list5);
desc26.putObject(c2t("Grad"), c2t("Grdn"), desc27);
desc26.putUnitDouble(c2t("Angl"), c2t("#Ang"), 0);
desc26.putEnumerated(c2t("Type"), c2t("GrdT"), c2t("Lnr "));
desc26.putBoolean(c2t("Rvrs"), false);
desc26.putBoolean(c2t("Dthr"), false);
desc26.putBoolean(c2t("Algn"), true);
desc26.putUnitDouble(c2t("Scl "), c2t("#Prc"), 100);
var desc34 = new ActionDescriptor();
desc34.putUnitDouble(c2t("Hrzn"), c2t("#Prc"), 0);
desc34.putUnitDouble(c2t("Vrtc"), c2t("#Prc"), 0);
desc26.putObject(c2t("Ofst"), c2t("Pnt "), desc34);
desc25.putObject(c2t("GrFl"), c2t("GrFl"), desc26);
desc24.putObject(c2t("T   "), c2t("Lefx"), desc25);
executeAction(c2t("setd"), desc24, DialogModes.NO);
}
function Action_onItemIndexGetDescriptor(itemIndex) {
var pianYi, r, d, options;
var pianYi = Layer_getBackgroundIndexOffset();
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIndex(c2t("Lyr "), itemIndex + pianYi);
d.putReference(c2t("null"), r);
var options = executeAction(c2t("getd"), d, DialogModes.NO);
return options;
}
function App_setForegrounddColor(col) {
var kind;
if (app.version < "21.0.0") {
app.foregroundColor = col;
} else {
var kind = app.activeDocument.activeLayer.kind;
if ((kind == LayerKind.SOLIDFILL) || (kind == LayerKind.TEXT)) {
Layer_newLayer();
}
app.foregroundColor = col;
if ((kind == LayerKind.SOLIDFILL) || (kind == LayerKind.TEXT)) {
Layer_deleteCurrentLayer();
}
}
}
function Font_set(obj) {
var desc567, ref132, col, desc568;
var desc567 = new ActionDescriptor();
var ref132 = new ActionReference();
ref132.putProperty(c2t("Prpr"), c2t("TxtS"));
ref132.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc567.putReference(c2t("null"), ref132);
if (obj.color != null) {
var col = colorToPsColor(obj.color);
var desc568 = Color_psColorToDescriptor(col);
} else {
var desc568 = new ActionDescriptor();
}
desc568.putInteger(s2t("textOverrideFeatureName"), 0);
desc568.putInteger(s2t("typeStyleOperationType"), 3);
if (obj.scriptFamily != null) {
desc568.putString(s2t("fontPostScriptName"), obj.scriptFamily);
desc568.putString(c2t("FntN"), obj.fontName);
desc568.putString(c2t("FntS"), obj.weight);
}
desc568.putInteger(c2t("Scrp"), 25);
desc568.putInteger(c2t("FntT"), 2);
desc568.putBoolean(s2t("fontAvailable"), true);
if (obj.size != null) {
desc568.putUnitDouble(c2t("Sz  "), c2t("#Pnt"), obj.size)
}
desc568.putDouble(c2t("HrzS"), obj.horizontalScale);
desc568.putDouble(c2t("VrtS"), obj.verticalScale);
desc568.putBoolean(s2t("syntheticBold"), obj.fauxBold);
desc568.putBoolean(s2t("syntheticItalic"), obj.fauxItalic);
desc568.putBoolean(s2t("autoLeading"), obj.useAutoLeading);
if (obj.leading != null) {
desc568.putUnitDouble(c2t("Ldng"), c2t("#Pnt"), obj.leading)
}
if (obj.tracking != null) {
desc568.putInteger(c2t("Trck"), obj.tracking)
}
desc568.putUnitDouble(c2t("Bsln"), c2t("#Pnt"), obj.baselineShift);
desc568.putDouble(s2t("characterRotation"), 0);
desc568.putEnumerated(c2t("AtKr"), c2t("AtKr"), s2t(obj.autoKerning));
desc568.putEnumerated(s2t("fontCaps"), s2t("fontCaps"), s2t(obj.capitalization));
desc568.putEnumerated(s2t("digitSet"), s2t("digitSet"), s2t("defaultDigits"));
desc568.putEnumerated(s2t("dirOverride"), s2t("dirOverride"), s2t("dirOverrideDefault"));
desc568.putEnumerated(s2t("kashidas"), s2t("kashidas"), s2t("kashidaDefault"));
desc568.putEnumerated(s2t("diacVPos"), s2t("diacVPos"), s2t("diacVPosOpenType"));
desc568.putUnitDouble(s2t("diacXOffset"), c2t("#Pnt"), 0);
desc568.putUnitDouble(s2t("diacYOffset"), c2t("#Pnt"), 0);
desc568.putUnitDouble(s2t("markYDistFromBaseline"), c2t("#Pnt"), 100);
desc568.putEnumerated(s2t("baseline"), s2t("baseline"), c2t("Nrml"));
desc568.putEnumerated(s2t("otbaseline"), s2t("otbaseline"), c2t("Nrml"));
desc568.putEnumerated(s2t("strikethrough"), s2t("strikethrough"), s2t(obj.strikeThru));
desc568.putEnumerated(c2t("Undl"), c2t("Undl"), s2t(obj.underline));
desc568.putUnitDouble(s2t("underlineOffset"), c2t("#Pnt"), 0);
desc568.putBoolean(s2t("ligature"), obj.ligatures);
desc568.putBoolean(s2t("altligature"), obj.alternateLigatures);
desc568.putBoolean(s2t("contextualLigatures"), obj.context);
desc568.putBoolean(s2t("alternateLigatures"), false);
desc568.putBoolean(s2t("oldStyle"), false);
desc568.putBoolean(s2t("fractions"), false);
desc568.putBoolean(s2t("ordinals"), false);
desc568.putBoolean(s2t("swash"), false);
desc568.putBoolean(s2t("titling"), false);
desc568.putBoolean(s2t("connectionForms"), true);
desc568.putBoolean(s2t("stylisticAlternates"), false);
desc568.putBoolean(s2t("ornaments"), false);
desc568.putBoolean(s2t("justificationAlternates"), false);
desc568.putEnumerated(s2t("figureStyle"), s2t("figureStyle"), c2t("Nrml"));
desc568.putBoolean(s2t("proportionalMetrics"), false);
desc568.putBoolean(s2t("kana"), false);
desc568.putBoolean(s2t("italics"), false);
desc568.putBoolean(s2t("ruby"), false);
desc568.putEnumerated(s2t("baselineDirection"), s2t("baselineDirection"), s2t("rotated"));
desc568.putEnumerated(s2t("textLanguage"), s2t("textLanguage"), s2t(obj.language));
desc568.putEnumerated(s2t("japaneseAlternate"), s2t("japaneseAlternate"), s2t("defaultForm"));
desc568.putDouble(s2t("mojiZume"), 0);
desc568.putEnumerated(s2t("gridAlignment"), s2t("gridAlignment"), s2t("roman"));
desc568.putBoolean(s2t("enableWariChu"), false);
desc568.putInteger(s2t("wariChuCount"), 2);
desc568.putInteger(s2t("wariChuLineGap"), 0);
desc568.putDouble(s2t("wariChuScale"), 0.5);
desc568.putInteger(s2t("wariChuWidow"), 2);
desc568.putInteger(s2t("wariChuOrphan"), 2);
desc568.putEnumerated(s2t("wariChuJustification"), s2t("wariChuJustification"), s2t("wariChuAutoJustify"));
desc568.putInteger(s2t("tcyUpDown"), 0);
desc568.putInteger(s2t("tcyLeftRight"), 0);
desc568.putDouble(s2t("leftAki"), -1);
desc568.putDouble(s2t("rightAki"), -1);
desc568.putInteger(s2t("jiDori"), 0);
desc568.putBoolean(s2t("noBreak"), false);
desc568.putBoolean(c2t("Fl  "), true);
desc568.putBoolean(c2t("Strk"), false);
desc568.putBoolean(s2t("fillFirst"), true);
desc568.putBoolean(s2t("fillOverPrint"), false);
desc568.putBoolean(s2t("strokeOverPrint"), false);
desc568.putEnumerated(s2t("lineCap"), s2t("lineCap"), s2t("buttCap"));
desc568.putEnumerated(s2t("lineJoin"), s2t("lineJoin"), s2t("miterJoin"));
desc568.putUnitDouble(s2t("lineWidth"), c2t("#Pnt"), 1);
desc568.putUnitDouble(s2t("miterLimit"), c2t("#Pnt"), 4);
desc568.putDouble(s2t("lineDashoffset"), 0);
desc567.putObject(c2t("T   "), c2t("TxtS"), desc568);
executeAction(c2t("setd"), desc567, DialogModes.NO);
}
function Font_setParagraphStyle(obj) {
var desc1999, ref468, desc2000;
var desc1999 = new ActionDescriptor();
var ref468 = new ActionReference();
ref468.putProperty(c2t("Prpr"), s2t("paragraphStyle"));
ref468.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc1999.putReference(c2t("null"), ref468);
var desc2000 = new ActionDescriptor();
var desc2000 = new ActionDescriptor();
desc2000.putInteger(s2t("textOverrideFeatureName"), 0);
desc2000.putEnumerated(c2t("Algn"), c2t("Alg "), s2t(obj.justification));
desc2000.putUnitDouble(s2t("startIndent"), c2t("#Pnt"), obj.leftIndent);
desc2000.putUnitDouble(s2t("endIndent"), c2t("#Pnt"), obj.rightIndent);
desc2000.putUnitDouble(s2t("firstLineIndent"), c2t("#Pnt"), obj.firstLineIndent);
desc2000.putUnitDouble(s2t("spaceBefore"), c2t("#Pnt"), obj.spaceBefore);
desc2000.putUnitDouble(s2t("spaceAfter"), c2t("#Pnt"), obj.spaceAfter);
desc2000.putEnumerated(s2t("kinsokuSetName"), s2t("kinsokuSetName"), s2t(obj.kinsokuSetName));
desc2000.putEnumerated(s2t("mojiKumiName"), s2t("mojiKumiName"), s2t(obj.mojiKumiName));
desc1999.putObject(c2t("T   "), s2t("paragraphStyle"), desc2000);
executeAction(c2t("setd"), desc1999, DialogModes.NO);
}
function Font_setDirection(str) {
var desc2646, ref589;
var desc2646 = new ActionDescriptor();
var ref589 = new ActionReference();
ref589.putProperty(c2t("Prpr"), c2t("Ornt"));
ref589.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc2646.putReference(c2t("null"), ref589);
desc2646.putEnumerated(c2t("T   "), c2t("Ornt"), s2t(str));
executeAction(c2t("setd"), desc2646, DialogModes.NO);
}
function f_getScriptEventId(params) {
return stringIDToTypeID("AdobeScriptAutomation Scripts");
}
function Doc_deleteRawData() {
var xmp;
whatApp = String(app.name);
if (whatApp.search("Photoshop") > 0) {
if (!documents.length) {
_A("没有打开的文档，请打开一个文件来运行这个脚本");
return -1;
}
if (ExternalObject.AdobeXMPScript == undefined) {
ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript")
}
var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
xmp.deleteProperty(XMPConst.NS_PHOTOSHOP, "DocumentAncestors");
app.activeDocument.xmpMetadata.rawData = xmp.serialize();
}
return 1;
}
function Doc_saveAs(luJing) {
var ext;
var ext = File_getFileExt(luJing);
if (ext == "jpg") {
Doc_saveAsJpg(luJing, 10);
} else if (ext == "psd") {
Doc_saveAsPsd(luJing);
} else if (ext == "png") {
Doc_saveAsPng(luJing);
} else {
_A("程序错误，另存路径有错误");
}
}
function Doc_saveAsPsd(path) {
var d1, d2;
try {
var d1 = new ActionDescriptor();
var d2 = new ActionDescriptor();
d2.putBoolean(s2t("maximizeCompatibility"), false);
d1.putObject(c2t("As  "), c2t("Pht3"), d2);
d1.putPath(c2t("In  "), new File(path));
d1.putInteger(c2t("DocI"), 2849);
d1.putEnumerated(s2t("saveStage"), s2t("saveStageType"), s2t("saveSucceeded"));
executeAction(c2t("save"), d1, DialogModes.NO);
} catch (error) {
_A(error);
}
}
function Doc_saveAsPsb(path) {
var desc2725, desc2726;
var desc2725 = new ActionDescriptor();
var desc2726 = new ActionDescriptor();
desc2726.putBoolean(s2t("maximizeCompatibility"), true);
desc2725.putObject(s2t("as"), s2t("largeDocumentFormat"), desc2726);
desc2725.putPath(s2t("in"), new File(path));
desc2725.putInteger(s2t("documentID"), 3804);
desc2725.putBoolean(s2t("lowerCase"), true);
desc2725.putEnumerated(s2t("saveStage"), s2t("saveStageType"), s2t("saveBegin"));
executeAction(s2t("save"), desc2725, DialogModes.NO);
}
function Doc_saveAsJpg(path, quality) {
var desc443, desc444;
if (typeof quality == "undefined") {
quality = 10
}
var desc443 = new ActionDescriptor();
var desc444 = new ActionDescriptor();
desc444.putInteger(c2t("EQlt"), quality);
desc444.putEnumerated(c2t("MttC"), c2t("MttC"), c2t("None"));
desc443.putObject(c2t("As  "), c2t("JPEG"), desc444);
desc443.putPath(c2t("In  "), new File(new File(path)));
desc443.putInteger(c2t("DocI"), 548);
desc443.putBoolean(c2t("Cpy "), true);
desc443.putEnumerated(s2t("saveStage"), s2t("saveStageType"), s2t("saveSucceeded"));
executeAction(c2t("save"), desc443, DialogModes.NO);
}
function Doc_saveAsPng(path) {
var desc470, desc471;
var desc470 = new ActionDescriptor();
var desc471 = new ActionDescriptor();
desc471.putEnumerated(c2t("PGIT"), c2t("PGIT"), c2t("PGIN"));
desc471.putEnumerated(c2t("PNGf"), c2t("PNGf"), c2t("PGAd"));
desc471.putInteger(c2t("Cmpr"), 9);
desc470.putObject(c2t("As  "), c2t("PNGF"), desc471);
desc470.putPath(c2t("In  "), new File(new File(path)));
desc470.putInteger(c2t("DocI"), 548);
desc470.putBoolean(c2t("Cpy "), true);
desc470.putEnumerated(s2t("saveStage"), s2t("saveStageType"), s2t("saveSucceeded"));
executeAction(c2t("save"), desc470, DialogModes.NO);
}
function Doc_exportForWeb(opt, path, isFile) {
var saveImg, name, lsName, pathObj, oldPath, i, xuHao, fpng, fjpg, f4, f5;
try {
var saveImg = new ExportOptionsSaveForWeb();
if (opt.format == "jpg") {
saveImg.format = SaveDocumentType.JPEG;
saveImg.quality = opt.quality;
} else {
saveImg.format = SaveDocumentType.PNG;
saveImg.PNG8 = opt.png8;
}
var name = app.activeDocument.name;
var lsName = "tempsjzlexportweb";
if (isFile == true) {
name = File_getFileName(path);
path = File_getFileDirectory(path);
}
var oldPath = (((path + "/") + name) + ".") + opt.format;
pathObj = new File((((path + "/") + lsName) + ".") + opt.format);
app.activeDocument.exportDocument(pathObj, ExportType.SAVEFORWEB, saveImg);
if (pathObj.exists) {
File_delete(oldPath);
pathObj.rename((name + ".") + opt.format);
} else {
for (var i = 1;i < 2000; i += 1) {
var xuHao = i;
if (i < 10) {
xuHao = "0" + i
}
var fpng = new File(((((path + "/images/") + lsName) + "_") + xuHao) + ".png");
var fjpg = new File(((((path + "/images/") + lsName) + "_") + xuHao) + ".jpg");
if ((fpng.exists == false) && (fjpg.exists == false)) {
fpng.close();
fjpg.close();
break ;
}
var f4 = new File(((((path + "/images/") + name) + "_") + xuHao) + ".png");
if (f4.exists) {
f4.remove()
}
f4.close();
var f5 = new File(((((path + "/images/") + name) + "_") + xuHao) + ".jpg");
if (f5.exists) {
f5.remove()
}
f5.close();
if (fpng.exists) {
fpng.rename(((name + "_") + xuHao) + ".png");
fpng.close();
}
if (fjpg.exists) {
fjpg.rename(((name + "_") + xuHao) + ".jpg");
fjpg.close();
}
}
}
} catch (error) {
_A(error);
}
}
function Doc_exportForWebJpg(quality, path, isFile) {
var opt;
if (typeof quality == "undefined") {
quality = 100
}
var opt = {
format: "jpg",
quality: quality
};
Doc_exportForWeb(opt, path, isFile);
}
function Doc_exportForWebPng(png8, path, isFile) {
var opt;
if (typeof png8 == "undefined") {
png8 = false
}
var opt = {
format: "png",
png8: png8
};
Doc_exportForWeb(opt, path, isFile);
}
function Doc_isSave() {
var wenDangLuJing;
try {
var wenDangLuJing = app.activeDocument.fullName;
} catch (e) {
_A("请保存psd后使用本功能!");
return -1;
}
return 1;
}
function Doc_getWidth(params) {
var lsUnits, width;
var lsUnits = Unit_setPx();
var width = activeDocument.width;
Unit_setPx(lsUnits);
return parseFloat(width);
}
function Doc_getHeight(params) {
var lsUnits, height;
var lsUnits = Unit_setPx();
var height = activeDocument.height;
Unit_setPx(lsUnits);
return parseFloat(height);
}
function Doc_getSize(params) {
var obj, lsUnits, width, height;
var obj = ArtBoard_getCurrentArtBoardBounds();
if (obj !== false) {
return obj;
} else {
var lsUnits = Unit_setPx();
var width = parseFloat(activeDocument.width);
var height = parseFloat(activeDocument.height);
Unit_setPx(lsUnits);
return new Rect(0, 0, width, height);
}
}
function Doc_isArtboard(params) {
return Doc_getArtboardsIndex().length > 0;
}
function Doc_close(params) {
app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
}
function Doc_load(path) {
var file;
var file = new File(path);
app.load(file);
}
function Doc_save(params) {
app.activeDocument.save();
}
function Doc_getArtboardsIndex(params) {
var ab, abCount, theRef, getDescriptor, abDesc, i, abObj, abTopIndex;
try {
var ab = [];
var abCount = 0;
var theRef = new ActionReference();
theRef.putProperty(c2t("Prpr"), s2t("artboards"));
theRef.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
var getDescriptor = new ActionDescriptor();
getDescriptor.putReference(s2t("null"), theRef);
var abDesc = executeAction(c2t("getd"), getDescriptor, DialogModes.NO).getObjectValue(s2t("artboards"));
abCount = abDesc.getList(s2t("list")).count;
if (abCount > 0) {
for (var i = 0;i < abCount; i += 1) {
var abObj = abDesc.getList(s2t("list")).getObjectValue(i);
var abTopIndex = abObj.getInteger(s2t("top"));
ab.push(abTopIndex + 1);
}
}
return ab;
} catch (ex) {
alert(("getArtboardsIndex error[" + ex) + "]");
}
return [];
}
function Doc_isBackgroundLayer(params) {
try {
app.activeDocument.backgroundLayer;
return true;
} catch (e) {
return false;
}
}
function Doc_isCMYK(params) {
return app.activeDocument.mode == DocumentMode.CMYK;
}
function Doc_isRGB(params) {
return app.activeDocument.mode == DocumentMode.RGB;
}
function Doc_isLAB(params) {
return app.activeDocument.mode == DocumentMode.LAB;
}
function Doc_cutCanvas(cx, cy) {
var d1;
var d1 = new ActionDescriptor();
d1.putUnitDouble(c2t("Wdth"), c2t("#Pxl"), cx);
d1.putUnitDouble(c2t("Hght"), c2t("#Pxl"), cy);
d1.putEnumerated(c2t("Hrzn"), c2t("HrzL"), c2t("Cntr"));
d1.putEnumerated(c2t("Vrtc"), c2t("VrtL"), c2t("Cntr"));
executeAction(c2t("CnvS"), d1, DialogModes.NO);
}
function Doc_setCanvasWidth(cx) {
var d1, idbicubicSmoother;
var d1 = new ActionDescriptor();
d1.putUnitDouble(c2t("Wdth"), c2t("#Pxl"), cx);
d1.putBoolean(s2t("scaleStyles"), true);
d1.putBoolean(c2t("CnsP"), true);
var idbicubicSmoother = s2t("bicubicSmoother");
d1.putEnumerated(c2t("Intr"), c2t("Intp"), idbicubicSmoother);
executeAction(c2t("ImgS"), d1, DialogModes.NO);
}
function Doc_setCanvasHeight(cy) {
var desc181;
var desc181 = new ActionDescriptor();
desc181.putUnitDouble(c2t("Hght"), c2t("#Pxl"), cy);
desc181.putBoolean(s2t("scaleStyles"), true);
desc181.putBoolean(c2t("CnsP"), true);
desc181.putEnumerated(c2t("Intr"), c2t("Intp"), s2t("bicubicSmoother"));
executeAction(c2t("ImgS"), desc181, DialogModes.NO);
}
function Doc_importImage(lj) {
var desc3343, desc3344;
var desc3343 = new ActionDescriptor();
desc3343.putInteger(charIDToTypeID("Idnt"), 653);
desc3343.putPath(charIDToTypeID("null"), new File(lj));
desc3343.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
var desc3344 = new ActionDescriptor();
desc3344.putUnitDouble(charIDToTypeID("Hrzn"), charIDToTypeID("#Pxl"), 0);
desc3344.putUnitDouble(charIDToTypeID("Vrtc"), charIDToTypeID("#Pxl"), 0);
desc3343.putObject(charIDToTypeID("Ofst"), charIDToTypeID("Ofst"), desc3344);
executeAction(charIDToTypeID("Plc "), desc3343, DialogModes.NO);
}
function Doc_importLinkImage(path) {
var desc232, desc233;
var desc232 = new ActionDescriptor();
desc232.putInteger(c2t("Idnt"), 914);
desc232.putPath(c2t("null"), new File(path));
desc232.putBoolean(c2t("Lnkd"), true);
desc232.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc233 = new ActionDescriptor();
desc233.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0);
desc233.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
desc232.putObject(c2t("Ofst"), c2t("Ofst"), desc233);
executeAction(c2t("Plc "), desc232, DialogModes.NO);
}
function Doc_copyLayerToNewDoc() {
var desc6908, ref3924, ref3925;
var desc6908 = new ActionDescriptor();
var ref3924 = new ActionReference();
ref3924.putClass(c2t("Dcmn"));
desc6908.putReference(c2t("null"), ref3924);
var ref3925 = new ActionReference();
ref3925.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc6908.putReference(c2t("Usng"), ref3925);
desc6908.putInteger(c2t("Vrsn"), 5);
executeAction(c2t("Mk  "), desc6908, DialogModes.NO);
}
function Doc_switchDoc(id, a) {
var i;
for (var i = 0;i < app.documents.length; i += 1) {
Doc_switchNextDoc(a);
if (id == app.activeDocument.id) {
break ;
}
}
}
function Doc_switchNextDoc(a) {
var pianyi, desc8387, ref1899;
var pianyi = 1;
if (a == -1) {
pianyi = -1
}
var desc8387 = new ActionDescriptor();
var ref1899 = new ActionReference();
ref1899.putOffset(c2t("Dcmn"), pianyi);
desc8387.putReference(c2t("null"), ref1899);
desc8387.putInteger(c2t("DocI"), 4621);
executeAction(c2t("slct"), desc8387, DialogModes.NO);
}
function Doc_adjustImageCx(cx) {
var d1, idbicubicSmoother;
var d1 = new ActionDescriptor();
d1.putUnitDouble(c2t("Wdth"), c2t("#Pxl"), cx);
d1.putBoolean(s2t("scaleStyles"), true);
d1.putBoolean(c2t("CnsP"), true);
var idbicubicSmoother = s2t("bicubicSmoother");
d1.putEnumerated(c2t("Intr"), c2t("Intp"), idbicubicSmoother);
executeAction(c2t("ImgS"), d1, DialogModes.NO);
}
function Doc_adjustImageCy(cy) {
var desc181;
var desc181 = new ActionDescriptor();
desc181.putUnitDouble(c2t("Hght"), c2t("#Pxl"), cy);
desc181.putBoolean(s2t("scaleStyles"), true);
desc181.putBoolean(c2t("CnsP"), true);
desc181.putEnumerated(c2t("Intr"), c2t("Intp"), s2t("bicubicSmoother"));
executeAction(c2t("ImgS"), desc181, DialogModes.NO);
}
function Doc_copyCurrentStatus(params) {
var desc575, ref111, ref112;
var desc575 = new ActionDescriptor();
var ref111 = new ActionReference();
ref111.putClass(c2t("Dcmn"));
desc575.putReference(c2t("null"), ref111);
var ref112 = new ActionReference();
ref112.putProperty(c2t("HstS"), c2t("CrnH"));
desc575.putReference(c2t("Usng"), ref112);
executeAction(c2t("Mk  "), desc575, DialogModes.NO);
}
function Doc_getName(params) {
var docName, ls, extArr, ext, i;
var docName = app.activeDocument.name;
var ls = docName.split(".");
var extArr = ["psd", "psb", "jpg", "png", "jpeg", "tif", "bmp"];
var ext = ls[ls.length - 1];
for (var i = 0;i < extArr.length; i += 1) {
if (extArr[i] == ext) {
ls.pop();
break ;
}
}
docName = ls.join(".");
return docName;
}
function Doc_setRGBMode(params) {
var desc5;
if (app.activeDocument.mode == DocumentMode.RGB) {
return;
}
var desc5 = new ActionDescriptor();
desc5.putClass(c2t("T   "), c2t("RGBM"));
desc5.putBoolean(c2t("Mrge"), false);
desc5.putBoolean(c2t("Rstr"), false);
executeAction(c2t("CnvM"), desc5, DialogModes.NO);
}
function Layer_getBounds(lsLayer) {
var lsUnits, x, y, cx, cy;
var lsUnits = Unit_setPx();
if (typeof lsLayer == "undefined") {
lsLayer = app.activeDocument.activeLayer
}
var x = parseFloat(lsLayer.bounds[0]);
var y = parseFloat(lsLayer.bounds[1]);
var cx = parseFloat(lsLayer.bounds[2]) - x;
var cy = parseFloat(lsLayer.bounds[3]) - y;
Unit_setPx(lsUnits);
return new Rect(x, y, cx, cy);
}
function Layer_setName(name) {
var desc26, ref13, desc27;
var desc26 = new ActionDescriptor();
var ref13 = new ActionReference();
ref13.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc26.putReference(c2t("null"), ref13);
var desc27 = new ActionDescriptor();
desc27.putString(c2t("Nm  "), name);
desc26.putObject(c2t("T   "), c2t("Lyr "), desc27);
executeAction(c2t("setd"), desc26, DialogModes.NO);
}
function Layer_merge(params) {
var desc1671;
var desc1671 = new ActionDescriptor();
executeAction(c2t("Mrg2"), desc1671, DialogModes.NO);
}
function Layer_setOpacity(val) {
var desc532, ref114, desc533;
var desc532 = new ActionDescriptor();
var ref114 = new ActionReference();
ref114.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc532.putReference(c2t("null"), ref114);
var desc533 = new ActionDescriptor();
desc533.putUnitDouble(c2t("Opct"), c2t("#Prc"), val);
desc532.putObject(c2t("T   "), c2t("Lyr "), desc533);
executeAction(c2t("setd"), desc532, DialogModes.NO);
}
function Layer_copy(params) {
var idCpTL;
var idCpTL = c2t("CpTL");
executeAction(idCpTL, undefined, DialogModes.NO);
}
function Layer_isBoard(params) {
var r, d, options;
try {
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIdentifier(c2t("Lyr "), app.activeDocument.activeLayer.id);
d.putReference(c2t("null"), r);
var options = executeAction(c2t("getd"), d, DialogModes.NO);
if (options.getBoolean(s2t("artboardEnabled"))) {
return true;
}
return false;
} catch (e) {
return false;
}
}
function Layer_getName(params) {
return app.activeDocument.activeLayer.name;
}
function Layer_selectNext(params) {
var desc619, ref205;
var desc619 = new ActionDescriptor();
var ref205 = new ActionReference();
ref205.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Bckw"));
desc619.putReference(c2t("null"), ref205);
desc619.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc619, DialogModes.NO);
}
function Layer_selectPrev(params) {
var desc620, ref206;
var desc620 = new ActionDescriptor();
var ref206 = new ActionReference();
ref206.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Frwr"));
desc620.putReference(c2t("null"), ref206);
desc620.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc620, DialogModes.NO);
}
function Layer_addSelectNext(params) {
var desc621, ref207;
var desc621 = new ActionDescriptor();
var ref207 = new ActionReference();
ref207.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Bckw"));
desc621.putReference(c2t("null"), ref207);
desc621.putEnumerated(s2t("selectionModifier"), s2t("selectionModifierType"), s2t("addToSelection"));
desc621.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc621, DialogModes.NO);
}
function Layer_addSelectPrev(params) {
var desc623, ref209;
var desc623 = new ActionDescriptor();
var ref209 = new ActionReference();
ref209.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Frwr"));
desc623.putReference(c2t("null"), ref209);
desc623.putEnumerated(s2t("selectionModifier"), s2t("selectionModifierType"), s2t("addToSelection"));
desc623.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc623, DialogModes.NO);
}
function Layer_moveToNext() {
var desc56019, ref4075, ref4076;
var desc56019 = new ActionDescriptor();
var ref4075 = new ActionReference();
ref4075.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc56019.putReference(c2t("null"), ref4075);
var ref4076 = new ActionReference();
ref4076.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Prvs"));
desc56019.putReference(c2t("T   "), ref4076);
executeAction(c2t("move"), desc56019, DialogModes.NO);
}
function Layer_group(name) {
var desc640, ref222, ref223;
if (typeof name == "undefined") {
name = "组1"
}
var desc640 = new ActionDescriptor();
var ref222 = new ActionReference();
ref222.putClass(s2t("layerSection"));
desc640.putReference(c2t("null"), ref222);
var ref223 = new ActionReference();
ref223.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc640.putReference(c2t("From"), ref223);
desc640.putInteger(s2t("layerSectionStart"), 100);
desc640.putInteger(s2t("layerSectionEnd"), 101);
desc640.putString(c2t("Nm  "), name);
executeAction(c2t("Mk  "), desc640, DialogModes.NO);
app.activeDocument.activeLayer.name = name;
}
function Layer_unGroup(params) {
var desc204, ref66;
var desc204 = new ActionDescriptor();
var ref66 = new ActionReference();
ref66.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc204.putReference(c2t("null"), ref66);
executeAction(s2t("ungroupLayersEvent"), desc204, DialogModes.NO);
}
function Layer_moveLayerPosition(x, y) {
var rect, oldX, oldY, desc169, ref36, desc170;
var rect = Layer_getBounds();
var oldX = rect.x;
var oldY = rect.y;
x != -1 ? (x = x - oldX) : (x = 0);
y != -1 ? (y = y - oldY) : (y = 0);
var desc169 = new ActionDescriptor();
var ref36 = new ActionReference();
ref36.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc169.putReference(c2t("null"), ref36);
var desc170 = new ActionDescriptor();
desc170.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), x);
desc170.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), y);
desc169.putObject(c2t("T   "), c2t("Ofst"), desc170);
executeAction(c2t("move"), desc169, DialogModes.NO);
}
function Layer_offsetPosition(x, y) {
var desc7227, ref1954, desc7228;
var desc7227 = new ActionDescriptor();
var ref1954 = new ActionReference();
ref1954.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc7227.putReference(c2t("null"), ref1954);
desc7227.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc7228 = new ActionDescriptor();
desc7228.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), x);
desc7228.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), y);
desc7227.putObject(c2t("Ofst"), c2t("Ofst"), desc7228);
desc7227.putEnumerated(c2t("Intr"), c2t("Intp"), c2t("Bcbc"));
executeAction(c2t("Trnf"), desc7227, DialogModes.NO);
}
function Layer_rotateLayer(angle) {
var desc2885, ref735, desc2886;
var desc2885 = new ActionDescriptor();
var ref735 = new ActionReference();
ref735.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc2885.putReference(c2t("null"), ref735);
desc2885.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc2886 = new ActionDescriptor();
desc2886.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0.5);
desc2886.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0.5);
desc2885.putObject(c2t("Ofst"), c2t("Ofst"), desc2886);
desc2885.putUnitDouble(c2t("Angl"), c2t("#Ang"), angle);
desc2885.putEnumerated(c2t("Intr"), c2t("Intp"), c2t("Bcbc"));
executeAction(c2t("Trnf"), desc2885, DialogModes.NO);
}
function Layer_getSelectedLayerItemIndex(params) {
var resultLayerItemIndexs, ref, args, resultDesc, selIndexList;
var resultLayerItemIndexs = [];
var ref = new ActionReference();
var args = new ActionDescriptor();
ref.putProperty(c2t("Prpr"), s2t("targetLayers"));
ref.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
args.putReference(c2t("null"), ref);
var resultDesc = executeAction(c2t("getd"), args, DialogModes.NO);
if (!resultDesc.hasKey(s2t("targetLayers"))) {
resultLayerItemIndexs.push(app.activeDocument.activeLayer.itemIndex);
return resultLayerItemIndexs;
}
var selIndexList = resultDesc.getList(s2t("targetLayers"));
for (var i = 0;i < selIndexList.count; i += 1) {
resultLayerItemIndexs.push(selIndexList.getReference(i).getIndex(c2t("Lyr ")) + 1);
}
return resultLayerItemIndexs;
}
function Layer_getSelectedLayerId(params) {
var resultLayerItemIndexs, ref, args, resultDesc, selIndexList, backgroundIndexOffset, index, selectedLayersReference, id;
var resultLayerItemIndexs = [];
var ref = new ActionReference();
var args = new ActionDescriptor();
ref.putProperty(c2t("Prpr"), s2t("targetLayers"));
ref.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
args.putReference(c2t("null"), ref);
var resultDesc = executeAction(c2t("getd"), args, DialogModes.NO);
if (!resultDesc.hasKey(s2t("targetLayers"))) {
resultLayerItemIndexs.push(app.activeDocument.activeLayer.itemIndex);
return resultLayerItemIndexs;
}
var selIndexList = resultDesc.getList(s2t("targetLayers"));
var backgroundIndexOffset = 0;
try {
if (app.activeDocument.backgroundLayer) {
backgroundIndexOffset = -1
}
} catch (e) {

}
for (var i = 0;i < selIndexList.count; i += 1) {
var index = selIndexList.getReference(i).getIndex(c2t("Lyr ")) + 1;
var selectedLayersReference = new ActionReference();
selectedLayersReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("LyrI"));
selectedLayersReference.putIndex(charIDToTypeID("Lyr "), index + backgroundIndexOffset);
descriptor = executeActionGet(selectedLayersReference);
var id = descriptor.getInteger(charIDToTypeID("LyrI"));
resultLayerItemIndexs.push(id);
}
return resultLayerItemIndexs;
}
function Layer_addMask(params) {
var val, desc1159, ref386;
var val = Selection_isTrue() ? "RvlS" : "RvlA";
var desc1159 = new ActionDescriptor();
desc1159.putClass(c2t("Nw  "), c2t("Chnl"));
var ref386 = new ActionReference();
ref386.putEnumerated(c2t("Chnl"), c2t("Chnl"), c2t("Msk "));
desc1159.putReference(c2t("At  "), ref386);
desc1159.putEnumerated(c2t("Usng"), c2t("UsrM"), c2t(val));
executeAction(c2t("Mk  "), desc1159, DialogModes.NO);
}
function Layer_isText(id) {
return Layer_getTypeNumber(id) == 3;
}
function Layer_isNormal(id) {
return Layer_getTypeNumber(id) == 1;
}
function Layer_isSmartObject(id) {
return Layer_getTypeNumber(id) == 5;
}
function Layer_isSolidFill(id) {
return Layer_getTypeNumber(id) == 4;
}
function Layer_isGradientFill(params) {
if (app.activeDocument.activeLayer.kind == LayerKind.GRADIENTFILL) {
return true;
} else {
return false;
}
}
function Layer_isGroup(id) {
return Layer_getTypeNumber(id) == 7;
}
function Layer_isBackground(id) {
var r, d, options;
if (typeof id == "undefined") {
id = app.activeDocument.activeLayer.id
}
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIdentifier(c2t("Lyr "), id);
d.putReference(c2t("null"), r);
var options = executeAction(c2t("getd"), d, DialogModes.NO);
return options.getBoolean(s2t("background"));
}
function Layer_copyToDocument(params) {
var desc6908, ref3924, ref3925;
var desc6908 = new ActionDescriptor();
var ref3924 = new ActionReference();
ref3924.putClass(c2t("Dcmn"));
desc6908.putReference(c2t("null"), ref3924);
var ref3925 = new ActionReference();
ref3925.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc6908.putReference(c2t("Usng"), ref3925);
desc6908.putInteger(c2t("Vrsn"), 5);
executeAction(c2t("Mk  "), desc6908, DialogModes.NO);
}
function Layer_getTypeNumber(id) {
var layerReference, descriptor, kind;
if (typeof id == "undefined") {
id = app.activeDocument.activeLayer.id
}
var layerReference = new ActionReference();
layerReference.putIdentifier(c2t("Lyr "), id);
var descriptor = executeActionGet(layerReference);
var kind = descriptor.getInteger(s2t("layerKind"));
return kind;
}
function Layer_getBackgroundIndexOffset(params) {
var offest;
var offest = 0;
try {
if (app.activeDocument.backgroundLayer) {
offest = -1
}
} catch (e) {

}
return offest;
}
function Layer_onIdMultipleSelectLayer(aXuHao, bQuXiao) {
var i, desc, ref;
if (aXuHao == undefined) {
return false;
}
if (bQuXiao) {
Layer_onIdSelectLayer(aXuHao[0]);
}
for (var i = 0;i < aXuHao.length; i += 1) {
var desc = new ActionDescriptor();
var ref = new ActionReference();
ref.putIdentifier(c2t("Lyr "), aXuHao[i]);
desc.putReference(c2t("null"), ref);
desc.putEnumerated(s2t("selectionModifier"), s2t("selectionModifierType"), s2t("addToSelection"));
desc.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc, DialogModes.NO);
}
}
function Layer_onIdMultipleSelectLayer2(params) {
var desc294, ref121, list86;
var desc294 = new ActionDescriptor();
var ref121 = new ActionReference();
ref121.putIndex(c2t("Lyr "), 0);
desc294.putReference(c2t("null"), ref121);
var list86 = new ActionList();
list86.putInteger(7);
list86.putInteger(8);
list86.putInteger(4);
desc294.putList(c2t("LyrI"), list86);
desc294.putEnumerated(s2t("selectionModifier"), s2t("selectionModifierType"), s2t("addToSelectionContinuous"));
desc294.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc294, DialogModes.NO);
}
function Layer_onIdSelectLayer(layerID) {
var ref, desc;
if (layerID == undefined) {
return false;
}
try {
var ref = new ActionReference();
ref.putIdentifier(c2t("Lyr "), layerID);
var desc = new ActionDescriptor();
desc.putBoolean(c2t("MkVs"), false);
desc.putReference(c2t("null"), ref);
executeAction(c2t("slct"), desc, DialogModes.NO);
} catch (e) {
return false;
}
}
function Layer_onIndexSelectLayer(ItemIndex) {
var backgroundIndexOffset, ref, desc;
var backgroundIndexOffset = 0;
try {
if (app.activeDocument.backgroundLayer) {
backgroundIndexOffset = -1
}
} catch (e) {

}
try {
var ref = new ActionReference();
ref.putIndex(c2t("Lyr "), ItemIndex + backgroundIndexOffset);
var desc = new ActionDescriptor();
desc.putBoolean(c2t("MkVs"), false);
desc.putReference(c2t("null"), ref);
executeAction(c2t("slct"), desc, DialogModes.NO);
} catch (e) {
return false;
}
return true;
}
function Layer_onIndexMultipleSelectLayer(aXuHao, bQuXiao) {
var backgroundIndexOffset, i, desc, ref;
if (aXuHao == undefined) {
return false;
}
if (bQuXiao) {
Layer_onIndexSelectLayer(aXuHao[0]);
}
var backgroundIndexOffset = 0;
try {
if (app.activeDocument.backgroundLayer) {
backgroundIndexOffset = -1
}
} catch (e) {

}
for (var i = 0;i < aXuHao.length; i += 1) {
var desc = new ActionDescriptor();
var ref = new ActionReference();
ref.putIndex(c2t("Lyr "), aXuHao[i] + backgroundIndexOffset);
desc.putReference(c2t("null"), ref);
desc.putEnumerated(s2t("selectionModifier"), s2t("selectionModifierType"), s2t("addToSelection"));
desc.putBoolean(c2t("MkVs"), false);
executeAction(c2t("slct"), desc, DialogModes.NO);
}
}
function Layer_getShapeInfo(id) {
var obj, r, d, d1, xd, sGra, fGra, bfill, fillDesc;
var obj = {
border: false,
fill: false,
borderGradient: false,
fillGradient: false
};
if (!Layer_isSolidFill(id)) {
return obj;
}
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIdentifier(c2t("Lyr "), id);
d.putReference(c2t("null"), r);
var d1 = executeAction(c2t("getd"), d, DialogModes.NO);
try {
var xd = d1.getObjectValue(s2t("AGMStrokeStyleInfo"));
obj.border = xd.getBoolean(s2t("strokeEnabled"));
obj.fill = xd.getBoolean(s2t("fillEnabled"));
if (obj.border) {
try {
var sGra = xd.getObjectValue(s2t("strokeStyleContent")).getObjectValue(s2t("gradient"));
obj.borderGradient = true;
} catch (error) {

}
}
if (obj.fill) {
try {
var fGra = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("gradient"));
obj.fillGradient = true;
} catch (error) {

}
}
} catch (error) {
try {
var bfill = d1.getBoolean(s2t("fillEnabled"));
obj.fill = bfill;
} catch (error) {

}
try {
var fillDesc = d1.getList(s2t("adjustment"));
obj.fill = true;
try {
var fGra = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("gradient"));
obj.fillGradient = true;
} catch (error) {

}
} catch (error) {

}
}
return obj;
}
function Layer_setCurrentTextLayerColor(col) {
var desc226, ref96, color, desc227;
if (typeof col == "undefined") {
col = app.foregroundColor
}
var desc226 = new ActionDescriptor();
var ref96 = new ActionReference();
ref96.putProperty(c2t("Prpr"), c2t("TxtS"));
ref96.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc226.putReference(c2t("null"), ref96);
var color = new Color();
var desc227 = color.getDescriptor(col);
desc227.putInteger(s2t("textOverrideFeatureName"), 808466226);
desc227.putInteger(s2t("typeStyleOperationType"), 3);
desc226.putObject(c2t("T   "), c2t("TxtS"), desc227);
executeAction(c2t("setd"), desc226, DialogModes.NO);
}
function Layer_overlayColor(col) {
var desc5717, ref1195, desc5718, desc5719;
if (typeof col == "undefined") {
col = app.foregroundColor
}
var desc5717 = new ActionDescriptor();
var ref1195 = new ActionReference();
ref1195.putProperty(c2t("Prpr"), c2t("Lefx"));
ref1195.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc5717.putReference(c2t("null"), ref1195);
var desc5718 = new ActionDescriptor();
desc5718.putUnitDouble(c2t("Scl "), c2t("#Prc"), 100);
var desc5719 = Color_psColorToDescriptor(col);
desc5719.putBoolean(c2t("enab"), true);
desc5719.putBoolean(s2t("present"), true);
desc5719.putBoolean(s2t("showInDialog"), true);
desc5719.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
desc5719.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc5718.putObject(c2t("SoFi"), c2t("SoFi"), desc5719);
desc5717.putObject(c2t("T   "), c2t("Lefx"), desc5718);
executeAction(c2t("setd"), desc5717, DialogModes.NO);
}
function Layer_setSolidLayerColor(col) {
var desc232, ref80, color, desc233;
var desc232 = new ActionDescriptor();
var ref80 = new ActionReference();
ref80.putEnumerated(s2t("contentLayer"), c2t("Ordn"), c2t("Trgt"));
desc232.putReference(c2t("null"), ref80);
var color = new Color();
var desc233 = color.getDescriptor(col);
desc232.putObject(c2t("T   "), s2t("solidColorLayer"), desc233);
executeAction(c2t("setd"), desc232, DialogModes.NO);
}
function Layer_align(n) {
var duiQi, fangShi, desc395, ref117;
var duiQi = new Array("AdLf", "AdCH", "AdRg", "AdCV", "AdCH", "AdCV", "AdTp", "AdCV", "AdBt");
var fangShi = new Array("Algn", "Algn", "Algn", "Algn", "Dstr", "Dstr", "Algn", "Algn", "Algn");
var desc395 = new ActionDescriptor();
var ref117 = new ActionReference();
ref117.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc395.putReference(c2t("null"), ref117);
desc395.putEnumerated(c2t("Usng"), c2t("ADSt"), c2t(duiQi[n]));
executeAction(c2t(fangShi[n]), desc395, DialogModes.NO);
}
function Layer_unLocking(params) {
var desc791, ref270, desc792;
var desc791 = new ActionDescriptor();
var ref270 = new ActionReference();
ref270.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc791.putReference(c2t("null"), ref270);
var desc792 = new ActionDescriptor();
desc792.putBoolean(s2t("protectNone"), true);
desc791.putObject(s2t("layerLocking"), s2t("layerLocking"), desc792);
executeAction(s2t("applyLocking"), desc791, DialogModes.NO);
}
function Layer_isSingle(params) {
var arr;
var arr = Layer_getSelectedLayerItemIndex();
return arr.length == 1;
}
function Layer_toPlacedLayer() {
executeAction(s2t("newPlacedLayer"), undefined, DialogModes.NO);
}
function Layer_importPlacedLayer(path) {
var desc541, desc542;
var desc541 = new ActionDescriptor();
desc541.putInteger(c2t("Idnt"), 194);
desc541.putPath(c2t("null"), new File(path));
desc541.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc542 = new ActionDescriptor();
desc542.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0);
desc542.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
desc541.putObject(c2t("Ofst"), c2t("Ofst"), desc542);
executeAction(c2t("Plc "), desc541, DialogModes.NO);
}
function Layer_placedLayerRelinkToFile(path) {
var desc753;
var desc753 = new ActionDescriptor();
desc753.putPath(c2t("null"), new File(path));
executeAction(s2t("placedLayerRelinkToFile"), desc753, DialogModes.NO);
}
function Layer_importRelinkFile(name) {
var desc1004, desc1005, idOfst;
var desc1004 = new ActionDescriptor();
desc1004.putInteger(c2t("Idnt"), 715);
desc1004.putPath(c2t("null"), new File(name));
desc1004.putBoolean(c2t("Lnkd"), true);
desc1004.putEnumerated(c2t("FTcs"), c2t("QCSt"), c2t("Qcsa"));
var desc1005 = new ActionDescriptor();
desc1005.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), 0);
desc1005.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
var idOfst = c2t("Ofst");
desc1004.putObject(idOfst, idOfst, desc1005);
executeAction(c2t("Plc "), desc1004, DialogModes.NO);
}
function Layer_getSelectLayerNumber() {
var ref, args, resultDesc, selIndexList;
var ref = new ActionReference();
var args = new ActionDescriptor();
ref.putProperty(c2t("Prpr"), s2t("targetLayers"));
ref.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
args.putReference(c2t("null"), ref);
var resultDesc = executeAction(c2t("getd"), args, DialogModes.NO);
var selIndexList = resultDesc.getList(s2t("targetLayers"));
return selIndexList.count;
}
function Layer_embedClipMask(isGrouped) {
var val, desc160, ref60;
var val = c2t("GrpL");
if ((typeof isGrouped != "undefined") && (isGrouped == false)) {
val = c2t("Ungr");
}
var desc160 = new ActionDescriptor();
var ref60 = new ActionReference();
ref60.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc160.putReference(c2t("null"), ref60);
executeAction(val, desc160, DialogModes.NO);
}
function Layer_releaseClipMask() {
var desc1353, ref854;
var desc1353 = new ActionDescriptor();
var ref854 = new ActionReference();
ref854.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
desc1353.putReference(s2t("null"), ref854);
executeAction(s2t("ungroup"), desc1353, DialogModes.NO);
}
function Layer_selectAllLayer() {
var desc11243, ref2226;
var desc11243 = new ActionDescriptor();
var ref2226 = new ActionReference();
ref2226.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc11243.putReference(c2t("null"), ref2226);
executeAction(s2t("selectAllLayers"), desc11243, DialogModes.NO);
}
function Layer_changeLayerPanelItemIndex(n) {
var desc7302, ref4211, ref4212, list2118;
var desc7302 = new ActionDescriptor();
var ref4211 = new ActionReference();
ref4211.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc7302.putReference(c2t("null"), ref4211);
var ref4212 = new ActionReference();
ref4212.putIndex(c2t("Lyr "), n);
desc7302.putReference(c2t("T   "), ref4212);
desc7302.putBoolean(c2t("Adjs"), false);
desc7302.putInteger(c2t("Vrsn"), 5);
var list2118 = new ActionList();
list2118.putInteger(16);
list2118.putInteger(18);
list2118.putInteger(17);
desc7302.putList(c2t("LyrI"), list2118);
executeAction(c2t("move"), desc7302, DialogModes.NO);
}
function Layer_foldAllLayer() {
var desc1630;
var desc1630 = new ActionDescriptor();
executeAction(s2t("collapseAllGroupsEvent"), desc1630, DialogModes.NO);
}
function Layer_deleteCurrentLayer() {
var desc8586, ref5113;
var desc8586 = new ActionDescriptor();
var ref5113 = new ActionReference();
ref5113.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc8586.putReference(c2t("null"), ref5113);
executeAction(c2t("Dlt "), desc8586, DialogModes.NO);
}
function Layer_copyCurrentLayerToDoc(name) {
var desc8228, ref4848, ref4849, list2372;
var desc8228 = new ActionDescriptor();
var ref4848 = new ActionReference();
ref4848.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc8228.putReference(c2t("null"), ref4848);
var ref4849 = new ActionReference();
ref4849.putName(c2t("Dcmn"), name);
desc8228.putReference(c2t("T   "), ref4849);
desc8228.putInteger(c2t("Vrsn"), 5);
var list2372 = new ActionList();
list2372.putInteger(38);
desc8228.putList(c2t("Idnt"), list2372);
executeAction(c2t("Dplc"), desc8228, DialogModes.NO);
}
function Layer_getNumberOfCurrentLayer() {
var ref, args, resultDesc, selIndexList;
var ref = new ActionReference();
var args = new ActionDescriptor();
ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("targetLayers"));
ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
args.putReference(charIDToTypeID("null"), ref);
var resultDesc = executeAction(charIDToTypeID("getd"), args, DialogModes.NO);
var selIndexList = resultDesc.getList(stringIDToTypeID("targetLayers"));
return selIndexList.count;
}
function Layer_isMultiLayer(params) {
return Layer_getNumberOfCurrentLayer() > 1;
}
function Layer_active() {
return app.activeDocument.activeLayer;
}
function Layer_getItemIndexActionObject(xuHao) {
var pianYi, r, d, options;
var pianYi = 0;
try {
if (app.activeDocument.backgroundLayer) {
pianYi = -1
}
} catch (e) {

}
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIndex(charIDToTypeID("Lyr "), xuHao + pianYi);
d.putReference(charIDToTypeID("null"), r);
var options = executeAction(charIDToTypeID("getd"), d, DialogModes.NO);
return options;
}
function Layer_getIdActionObject(xuHao) {
var r, d, options;
var r = new ActionReference();
var d = new ActionDescriptor();
r.putIdentifier(charIDToTypeID("Lyr "), xuHao);
d.putReference(charIDToTypeID("null"), r);
var options = executeAction(charIDToTypeID("getd"), d, DialogModes.NO);
return options;
}
function Layer_idToItemIndex(arr) {
var newArr, i, opt;
var newArr = [];
for (var i = 0;i < arr.length; i += 1) {
var opt = Layer_getIdActionObject(arr[i]);
newArr.push(opt.getInteger(s2t("itemIndex")));
}
return newArr;
}
function Layer_getItemIndexLayerPosition(index, layerObj) {
var lsObj, bounds, obj;
typeof layerObj == "undefined" ? (lsObj = Layer_getItemIndexActionObject(index)) : (lsObj = layerObj);
var bounds = lsObj.getObjectValue(s2t("bounds"));
var obj = {};
obj.x = parseFloat(bounds.getUnitDoubleValue(s2t("left")));
obj.y = parseFloat(bounds.getUnitDoubleValue(s2t("top")));
obj.cx = parseFloat(bounds.getUnitDoubleValue(s2t("width")));
obj.cy = parseFloat(bounds.getUnitDoubleValue(s2t("height")));
return obj;
}
function Layer_copyCurrentLayer() {
executeAction(c2t("CpTL"), undefined, DialogModes.NO);
}
function Layer_hideLayer() {
var desc2611, list492, ref619;
var desc2611 = new ActionDescriptor();
var list492 = new ActionList();
var ref619 = new ActionReference();
ref619.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
list492.putReference(ref619);
desc2611.putList(c2t("null"), list492);
executeAction(c2t("Hd  "), desc2611, DialogModes.NO);
}
function Layer_createText(zihao, neiRong, duiQi) {
var fangShi, desc73235, ref8886, desc73236, desc73237, desc73238, desc73239, desc73240, list16180, desc73241, desc73242, desc73243, list16181, desc73244, desc73245, desc73246, desc73247, desc73248, desc73249, list16182, desc73250, desc73251, list16183;
var fangShi = new Array("Left", "Cntr", "Rght");
var desc73235 = new ActionDescriptor();
var ref8886 = new ActionReference();
ref8886.putClass(c2t("TxLr"));
desc73235.putReference(c2t("null"), ref8886);
var desc73236 = new ActionDescriptor();
desc73236.putString(c2t("Txt "), neiRong);
var desc73237 = new ActionDescriptor();
desc73237.putEnumerated(s2t("warpStyle"), s2t("warpStyle"), s2t("warpNone"));
desc73237.putDouble(s2t("warpValue"), 0);
desc73237.putDouble(s2t("warpPerspective"), 0);
desc73237.putDouble(s2t("warpPerspectiveOther"), 0);
desc73237.putEnumerated(s2t("warpRotate"), c2t("Ornt"), c2t("Hrzn"));
desc73236.putObject(s2t("warp"), s2t("warp"), desc73237);
var desc73238 = new ActionDescriptor();
desc73238.putUnitDouble(c2t("Hrzn"), c2t("#Prc"), 39.02439);
desc73238.putUnitDouble(c2t("Vrtc"), c2t("#Prc"), 72.74168);
desc73236.putObject(c2t("TxtC"), c2t("Pnt "), desc73238);
desc73236.putEnumerated(s2t("textGridding"), s2t("textGridding"), c2t("None"));
desc73236.putEnumerated(c2t("Ornt"), c2t("Ornt"), c2t("Hrzn"));
desc73236.putEnumerated(c2t("AntA"), c2t("Annt"), c2t("AnSm"));
var desc73239 = new ActionDescriptor();
desc73239.putUnitDouble(c2t("Left"), c2t("Pnt "), -44);
desc73239.putUnitDouble(c2t("Top "), c2t("Pnt "), -19.360107);
desc73239.putUnitDouble(c2t("Rght"), c2t("Pnt "), 44);
desc73239.putUnitDouble(c2t("Btom"), c2t("Pnt "), 23.056091);
desc73236.putObject(s2t("bounds"), s2t("bounds"), desc73239);
var desc73240 = new ActionDescriptor();
desc73240.putUnitDouble(c2t("Left"), c2t("Pnt "), -43);
desc73240.putUnitDouble(c2t("Top "), c2t("Pnt "), -18.782257);
desc73240.putUnitDouble(c2t("Rght"), c2t("Pnt "), 42.990143);
desc73240.putUnitDouble(c2t("Btom"), c2t("Pnt "), 1.654114);
desc73236.putObject(s2t("boundingBox"), s2t("boundingBox"), desc73240);
var list16180 = new ActionList();
var desc73241 = new ActionDescriptor();
desc73241.putEnumerated(c2t("TEXT"), c2t("TEXT"), c2t("Pnt "));
desc73241.putEnumerated(c2t("Ornt"), c2t("Ornt"), c2t("Hrzn"));
var desc73242 = new ActionDescriptor();
desc73242.putDouble(s2t("xx"), 1);
desc73242.putDouble(s2t("xy"), 0);
desc73242.putDouble(s2t("yx"), 0);
desc73242.putDouble(s2t("yy"), 1);
desc73242.putDouble(s2t("tx"), 0);
desc73242.putDouble(s2t("ty"), 0);
desc73241.putObject(c2t("Trnf"), c2t("Trnf"), desc73242);
desc73241.putInteger(s2t("rowCount"), 1);
desc73241.putInteger(s2t("columnCount"), 1);
desc73241.putBoolean(s2t("rowMajorOrder"), true);
desc73241.putUnitDouble(s2t("rowGutter"), c2t("Pnt "), 0);
desc73241.putUnitDouble(s2t("columnGutter"), c2t("Pnt "), 0);
desc73241.putUnitDouble(c2t("Spcn"), c2t("Pnt "), 0);
desc73241.putEnumerated(s2t("frameBaselineAlignment"), s2t("frameBaselineAlignment"), s2t("alignByAscent"));
desc73241.putUnitDouble(s2t("firstBaselineMinimum"), c2t("Pnt "), 0);
var desc73243 = new ActionDescriptor();
desc73243.putDouble(c2t("Hrzn"), 0);
desc73243.putDouble(c2t("Vrtc"), 0);
desc73241.putObject(s2t("base"), c2t("Pnt "), desc73243);
list16180.putObject(s2t("textShape"), desc73241);
desc73236.putList(s2t("textShape"), list16180);
var list16181 = new ActionList();
var desc73244 = new ActionDescriptor();
desc73244.putInteger(c2t("From"), 0);
desc73244.putInteger(c2t("T   "), 10);
var desc73245 = new ActionDescriptor();
desc73245.putBoolean(s2t("styleSheetHasParent"), true);
desc73245.putString(s2t("fontPostScriptName"), "SourceHanSansCN-Normal");
desc73245.putString(c2t("FntN"), "SourceHanSansCN");
desc73245.putString(c2t("FntS"), "Normal");
desc73245.putInteger(c2t("Scrp"), 25);
desc73245.putInteger(c2t("FntT"), 2);
desc73245.putBoolean(s2t("fontAvailable"), true);
desc73245.putUnitDouble(c2t("Sz  "), c2t("Pnt "), zihao);
desc73245.putUnitDouble(s2t("impliedFontSize"), c2t("Pnt "), zihao);
desc73245.putEnumerated(s2t("digitSet"), s2t("digitSet"), s2t("defaultDigits"));
desc73245.putUnitDouble(s2t("markYDistFromBaseline"), c2t("Pnt "), 100);
var desc73246 = new ActionDescriptor();
desc73246.putDouble(c2t("Rd  "), 51.000001);
desc73246.putDouble(c2t("Grn "), 51.000001);
desc73246.putDouble(c2t("Bl  "), 51.000001);
desc73245.putObject(c2t("Clr "), c2t("RGBC"), desc73246);
var desc73247 = new ActionDescriptor();
desc73247.putString(s2t("fontPostScriptName"), "AdobeHeitiStd-Regular");
desc73247.putString(c2t("FntN"), "AdobeHeitiStd");
desc73247.putString(c2t("FntS"), "R");
desc73247.putInteger(c2t("Scrp"), 25);
desc73247.putInteger(c2t("FntT"), 2);
desc73247.putBoolean(s2t("fontAvailable"), true);
desc73247.putUnitDouble(c2t("Sz  "), c2t("Pnt "), 12);
desc73247.putUnitDouble(s2t("impliedFontSize"), c2t("Pnt "), 12);
desc73247.putDouble(c2t("HrzS"), 100);
desc73247.putDouble(c2t("VrtS"), 100);
desc73247.putBoolean(s2t("syntheticBold"), false);
desc73247.putBoolean(s2t("syntheticItalic"), false);
desc73247.putBoolean(s2t("autoLeading"), true);
desc73247.putInteger(c2t("Trck"), 0);
desc73247.putUnitDouble(c2t("Bsln"), c2t("Pnt "), 0);
desc73247.putUnitDouble(s2t("impliedBaselineShift"), c2t("Pnt "), 0);
desc73247.putDouble(s2t("characterRotation"), 0);
desc73247.putEnumerated(c2t("AtKr"), c2t("AtKr"), s2t("metricsKern"));
desc73247.putEnumerated(s2t("fontCaps"), s2t("fontCaps"), c2t("Nrml"));
desc73247.putEnumerated(s2t("digitSet"), s2t("digitSet"), s2t("defaultDigits"));
desc73247.putEnumerated(s2t("dirOverride"), s2t("dirOverride"), s2t("dirOverrideDefault"));
desc73247.putEnumerated(s2t("kashidas"), s2t("kashidas"), s2t("kashidaDefault"));
desc73247.putEnumerated(s2t("diacVPos"), s2t("diacVPos"), s2t("diacVPosOpenType"));
desc73247.putUnitDouble(s2t("diacXOffset"), c2t("Pnt "), 0);
desc73247.putUnitDouble(s2t("diacYOffset"), c2t("Pnt "), 0);
desc73247.putUnitDouble(s2t("markYDistFromBaseline"), c2t("Pnt "), 100);
desc73247.putEnumerated(s2t("baseline"), s2t("baseline"), c2t("Nrml"));
desc73247.putEnumerated(s2t("otbaseline"), s2t("otbaseline"), c2t("Nrml"));
desc73247.putEnumerated(s2t("strikethrough"), s2t("strikethrough"), s2t("strikethroughOff"));
desc73247.putEnumerated(c2t("Undl"), c2t("Undl"), s2t("underlineOff"));
desc73247.putUnitDouble(s2t("underlineOffset"), c2t("Pnt "), 0);
desc73247.putBoolean(s2t("ligature"), true);
desc73247.putBoolean(s2t("altligature"), false);
desc73247.putBoolean(s2t("contextualLigatures"), false);
desc73247.putBoolean(s2t("alternateLigatures"), false);
desc73247.putBoolean(s2t("oldStyle"), false);
desc73247.putBoolean(s2t("fractions"), false);
desc73247.putBoolean(s2t("ordinals"), false);
desc73247.putBoolean(s2t("swash"), false);
desc73247.putBoolean(s2t("titling"), false);
desc73247.putBoolean(s2t("connectionForms"), false);
desc73247.putBoolean(s2t("stylisticAlternates"), false);
desc73247.putBoolean(s2t("ornaments"), false);
desc73247.putBoolean(s2t("justificationAlternates"), false);
desc73247.putEnumerated(s2t("figureStyle"), s2t("figureStyle"), c2t("Nrml"));
desc73247.putBoolean(s2t("proportionalMetrics"), false);
desc73247.putBoolean(s2t("kana"), false);
desc73247.putBoolean(s2t("italics"), false);
desc73247.putBoolean(s2t("ruby"), false);
desc73247.putEnumerated(s2t("baselineDirection"), s2t("baselineDirection"), s2t("rotated"));
desc73247.putEnumerated(s2t("textLanguage"), s2t("textLanguage"), s2t("englishLanguage"));
desc73247.putEnumerated(s2t("japaneseAlternate"), s2t("japaneseAlternate"), s2t("defaultForm"));
desc73247.putDouble(s2t("mojiZume"), 0);
desc73247.putEnumerated(s2t("gridAlignment"), s2t("gridAlignment"), s2t("roman"));
desc73247.putBoolean(s2t("enableWariChu"), false);
desc73247.putInteger(s2t("wariChuCount"), 2);
desc73247.putInteger(s2t("wariChuLineGap"), 0);
desc73247.putDouble(s2t("wariChuScale"), 0.5);
desc73247.putInteger(s2t("wariChuWidow"), 2);
desc73247.putInteger(s2t("wariChuOrphan"), 2);
desc73247.putEnumerated(s2t("wariChuJustification"), s2t("wariChuJustification"), s2t("wariChuAutoJustify"));
desc73247.putInteger(s2t("tcyUpDown"), 0);
desc73247.putInteger(s2t("tcyLeftRight"), 0);
desc73247.putDouble(s2t("leftAki"), -1);
desc73247.putDouble(s2t("rightAki"), -1);
desc73247.putInteger(s2t("jiDori"), 0);
desc73247.putBoolean(s2t("noBreak"), false);
var desc73248 = new ActionDescriptor();
desc73248.putDouble(c2t("Rd  "), 0);
desc73248.putDouble(c2t("Grn "), 0);
desc73248.putDouble(c2t("Bl  "), 0);
desc73247.putObject(c2t("Clr "), c2t("RGBC"), desc73248);
var desc73249 = new ActionDescriptor();
desc73249.putDouble(c2t("Rd  "), 0);
desc73249.putDouble(c2t("Grn "), 0);
desc73249.putDouble(c2t("Bl  "), 0);
desc73247.putObject(s2t("strokeColor"), c2t("RGBC"), desc73249);
desc73247.putBoolean(c2t("Fl  "), true);
desc73247.putBoolean(c2t("Strk"), false);
desc73247.putBoolean(s2t("fillFirst"), true);
desc73247.putBoolean(s2t("fillOverPrint"), false);
desc73247.putBoolean(s2t("strokeOverPrint"), false);
desc73247.putEnumerated(s2t("lineCap"), s2t("lineCap"), s2t("buttCap"));
desc73247.putEnumerated(s2t("lineJoin"), s2t("lineJoin"), s2t("miterJoin"));
desc73247.putUnitDouble(s2t("lineWidth"), c2t("Pnt "), 1);
desc73247.putUnitDouble(s2t("miterLimit"), c2t("Pnt "), 4);
desc73247.putDouble(s2t("lineDashoffset"), 0);
desc73245.putObject(s2t("baseParentStyle"), c2t("TxtS"), desc73247);
desc73244.putObject(c2t("TxtS"), c2t("TxtS"), desc73245);
list16181.putObject(c2t("Txtt"), desc73244);
desc73236.putList(c2t("Txtt"), list16181);
var list16182 = new ActionList();
var desc73250 = new ActionDescriptor();
desc73250.putInteger(c2t("From"), 0);
desc73250.putInteger(c2t("T   "), 5);
var desc73251 = new ActionDescriptor();
desc73251.putBoolean(s2t("styleSheetHasParent"), true);
desc73251.putEnumerated(c2t("Algn"), c2t("Alg "), c2t(fangShi[duiQi]));
desc73250.putObject(s2t("paragraphStyle"), s2t("paragraphStyle"), desc73251);
list16182.putObject(s2t("paragraphStyleRange"), desc73250);
desc73236.putList(s2t("paragraphStyleRange"), list16182);
var list16183 = new ActionList();
desc73236.putList(s2t("kerningRange"), list16183);
desc73235.putObject(c2t("Usng"), c2t("TxLr"), desc73236);
desc73235.putInteger(c2t("LyrI"), 1758);
executeAction(c2t("Mk  "), desc73235, DialogModes.NO);
app.activeDocument.activeLayer.textItem.language = Language.ENGLISHUSA;
app.activeDocument.activeLayer.textItem.autoKerning = AutoKernType.OPTICAL;
}
function Layer_moveToTextPanelTop(params) {
var desc315, ref84, ref85;
var desc315 = new ActionDescriptor();
var ref84 = new ActionReference();
ref84.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc315.putReference(c2t("null"), ref84);
var ref85 = new ActionReference();
ref85.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Frnt"));
desc315.putReference(c2t("T   "), ref85);
executeAction(c2t("move"), desc315, DialogModes.NO);
}
function Layer_newLayer(params) {
var desc99, ref21;
var desc99 = new ActionDescriptor();
var ref21 = new ActionReference();
ref21.putClass(c2t("Lyr "));
desc99.putReference(c2t("null"), ref21);
desc99.putInteger(c2t("LyrI"), 5);
executeAction(c2t("Mk  "), desc99, DialogModes.NO);
}
function Layer_lockTransparency() {
var desc575, ref194, desc576;
var desc575 = new ActionDescriptor();
var ref194 = new ActionReference();
ref194.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc575.putReference(c2t("null"), ref194);
var desc576 = new ActionDescriptor();
desc576.putBoolean(s2t("protectTransparency"), true);
desc575.putObject(s2t("layerLocking"), s2t("layerLocking"), desc576);
executeAction(s2t("applyLocking"), desc575, DialogModes.NO);
}
function Layer_altDelete() {
var desc634;
var desc634 = new ActionDescriptor();
desc634.putEnumerated(c2t("Usng"), c2t("FlCn"), c2t("FrgC"));
desc634.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc634.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
desc634.putBoolean(c2t("PrsT"), true);
executeAction(c2t("Fl  "), desc634, DialogModes.NO);
}
function Layer_unlockTransparency() {
var desc791, ref270, desc792;
var desc791 = new ActionDescriptor();
var ref270 = new ActionReference();
ref270.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc791.putReference(c2t("null"), ref270);
var desc792 = new ActionDescriptor();
desc792.putBoolean(s2t("protectNone"), true);
desc791.putObject(s2t("layerLocking"), s2t("layerLocking"), desc792);
executeAction(s2t("applyLocking"), desc791, DialogModes.NO);
}
function Layer_setSelectLayerColor(col, setForeground) {
var aXuHao, textArr, strokeArr, fillArr, colorFill, fillAndStrokeArr, i, options, lx, obj;
var aXuHao = Layer_getSelectedLayerItemIndex();
var textArr = [];
var strokeArr = [];
var fillArr = [];
var colorFill = [];
var fillAndStrokeArr = [];
if (setForeground) {
App_setForegrounddColor(col);
}
for (var i = 0;i < aXuHao.length; i += 1) {
var options = Action_onItemIndexGetDescriptor(aXuHao[i]);
var lx = options.getInteger(s2t("layerKind"));
if (lx == 3) {
textArr.push(aXuHao[i])
} else if (lx == 4) {
var obj = Shape_getShapeInfo(options);
if (obj.fill && obj.stroke) {
fillAndStrokeArr.push(aXuHao[i])
} else if (obj.fill) {
fillArr.push(aXuHao[i])
} else if (obj.stroke) {
strokeArr.push(aXuHao[i])
} else {
fillArr.push(aXuHao[i])
}
} else {
if (lx == 11) {
colorFill.push(aXuHao[i]);
}
}
}
if (textArr.length > 0) {
Layer_onIndexMultipleSelectLayer(textArr, true);
Layer_setTextColor(col);
}
for (var i = 0;i < fillAndStrokeArr.length; i += 1) {
Layer_onIndexSelectLayer(fillAndStrokeArr[i]);
Shape_setFillColor(col);
}
if (fillArr.length > 0) {
Layer_onIndexMultipleSelectLayer(fillArr, true);
Shape_setFillColor(true, col);
}
if (strokeArr.length > 0) {
Layer_onIndexMultipleSelectLayer(strokeArr, true);
Shape_setBorderColor(true, col);
}
for (var i = 0;i < colorFill.length; i += 1) {
Layer_onIndexSelectLayer(colorFill[i]);
Layer_setSolidLayerColor(col);
}
Layer_onIndexMultipleSelectLayer(aXuHao, false);
}
function Layer_setTextColor(col) {
var desc226, ref96, desc227;
var desc226 = new ActionDescriptor();
var ref96 = new ActionReference();
ref96.putProperty(c2t("Prpr"), c2t("TxtS"));
ref96.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc226.putReference(c2t("null"), ref96);
var desc227 = Color_psColorToDescriptor(col);
desc227.putInteger(s2t("textOverrideFeatureName"), 808466226);
desc227.putInteger(s2t("typeStyleOperationType"), 3);
desc226.putObject(c2t("T   "), c2t("TxtS"), desc227);
executeAction(c2t("setd"), desc226, DialogModes.NO);
}
function Layer_copyLayerStyle(params) {
executeAction(c2t("CpFX"), undefined, DialogModes.NO);
}
function Layer_pasteLayerStyle(params) {
var desc432;
var desc432 = new ActionDescriptor();
desc432.putBoolean(s2t("allowPasteFXOnLayerSet"), true);
executeAction(c2t("PaFX"), desc432, DialogModes.NO);
}
function Layer_clearLayerStyle(params) {
var desc794, ref187;
var desc794 = new ActionDescriptor();
var ref187 = new ActionReference();
ref187.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
desc794.putReference(c2t("null"), ref187);
executeAction(s2t("disableLayerStyle"), desc794, DialogModes.NO);
}
function Layer_setFontName(hjm, mz, zz) {
var d1, r1, d2, i, ii;
if (app.name == "Adobe Photoshop") {
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
r1.putProperty(c2t("Prpr"), c2t("TxtS"));
r1.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
d1.putReference(c2t("null"), r1);
var d2 = new ActionDescriptor();
d2.putString(s2t("fontPostScriptName"), hjm);
d2.putString(c2t("FntN"), mz);
d2.putString(c2t("FntS"), zz);
d1.putObject(c2t("T   "), c2t("TxtS"), d2);
executeAction(c2t("setd"), d1, DialogModes.NO);
} else if (app.name == "Adobe Illustrator") {
for (var i = 0;i < app.selection.length; i += 1) {
if (app.selection[i].constructor.name == "TextFrame") {
app.selection[i].textRange.characterAttributes.textFont = app.textFonts.getByName(hjm);
}
}
} else {
for (var i = 0;i < app.selection.length; i += 1) {
if (app.selection[i].constructor.name == "TextFrame") {
for (var ii = 0;ii < app.selection[i].paragraphs.length; ii += 1) {
app.selection[i].paragraphs[ii].appliedFont = app.fonts.item(mz);
app.selection[i].paragraphs[ii].fontStyle = zz;
}
} else {
if (app.selection[i].constructor.name == "Text") {
app.selection[i].appliedFont = app.fonts.item(mz);
app.selection[i].fontStyle = zz;
}
}
}
}
}
function Layer_setFontSize(daxiao) {
var desc8429, ref2516, desc8430;
var desc8429 = new ActionDescriptor();
var ref2516 = new ActionReference();
ref2516.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2516.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8429.putReference(c2t("null"), ref2516);
var desc8430 = new ActionDescriptor();
desc8430.putInteger(s2t("textOverrideFeatureName"), 808465458);
desc8430.putInteger(s2t("typeStyleOperationType"), 3);
desc8430.putUnitDouble(c2t("Sz  "), c2t("#Pnt"), daxiao);
desc8429.putObject(c2t("T   "), c2t("TxtS"), desc8430);
executeAction(c2t("setd"), desc8429, DialogModes.NO);
}
function Layer_setFontLineSpacing(daxiao) {
var desc8767, ref2643, desc8768;
var desc8767 = new ActionDescriptor();
var ref2643 = new ActionReference();
ref2643.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2643.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8767.putReference(c2t("null"), ref2643);
var desc8768 = new ActionDescriptor();
desc8768.putInteger(s2t("textOverrideFeatureName"), 808465461);
desc8768.putInteger(s2t("typeStyleOperationType"), 3);
desc8768.putBoolean(s2t("autoLeading"), false);
desc8768.putUnitDouble(c2t("Ldng"), c2t("#Pnt"), daxiao);
desc8767.putObject(c2t("T   "), c2t("TxtS"), desc8768);
executeAction(c2t("setd"), desc8767, DialogModes.NO);
}
function Layer_setFontWordSpacing(daxiao) {
var desc8779, ref2649, desc8780;
var desc8779 = new ActionDescriptor();
var ref2649 = new ActionReference();
ref2649.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2649.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8779.putReference(c2t("null"), ref2649);
var desc8780 = new ActionDescriptor();
desc8780.putInteger(s2t("textOverrideFeatureName"), 808465465);
desc8780.putInteger(s2t("typeStyleOperationType"), 3);
desc8780.putInteger(c2t("Trck"), daxiao);
desc8779.putObject(c2t("T   "), c2t("TxtS"), desc8780);
executeAction(c2t("setd"), desc8779, DialogModes.NO);
}
function Layer_setFontAddBold(value) {
var desc8794, ref2656, desc8795;
var desc8794 = new ActionDescriptor();
var ref2656 = new ActionReference();
ref2656.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2656.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8794.putReference(c2t("null"), ref2656);
var desc8795 = new ActionDescriptor();
desc8795.putInteger(s2t("textOverrideFeatureName"), 808465459);
desc8795.putInteger(s2t("typeStyleOperationType"), 3);
desc8795.putBoolean(s2t("syntheticBold"), value);
desc8794.putObject(c2t("T   "), c2t("TxtS"), desc8795);
executeAction(c2t("setd"), desc8794, DialogModes.NO);
}
function Layer_setFontSlanted(zhenJia) {
var desc8796, ref2657, desc8797;
var desc8796 = new ActionDescriptor();
var ref2657 = new ActionReference();
ref2657.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2657.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8796.putReference(c2t("null"), ref2657);
var desc8797 = new ActionDescriptor();
desc8797.putInteger(s2t("textOverrideFeatureName"), 808465460);
desc8797.putInteger(s2t("typeStyleOperationType"), 3);
desc8797.putBoolean(s2t("syntheticItalic"), zhenJia);
desc8796.putObject(c2t("T   "), c2t("TxtS"), desc8797);
executeAction(c2t("setd"), desc8796, DialogModes.NO);
}
function Layer_setFontAllCaps(zhenJia) {
var str, desc8833, ref2668, desc8834;
var str = "idNrml ";
if (zhenJia) {
str = "allCaps";
}
var desc8833 = new ActionDescriptor();
var ref2668 = new ActionReference();
ref2668.putProperty(c2t("Prpr"), c2t("TxtS"));
ref2668.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc8833.putReference(c2t("null"), ref2668);
var desc8834 = new ActionDescriptor();
desc8834.putInteger(s2t("textOverrideFeatureName"), 808465713);
desc8834.putInteger(s2t("typeStyleOperationType"), 3);
desc8834.putEnumerated(s2t("fontCaps"), s2t("fontCaps"), s2t(str));
desc8833.putObject(c2t("T   "), c2t("TxtS"), desc8834);
executeAction(c2t("setd"), desc8833, DialogModes.NO);
}
function Layer_setFontAlignment(n) {
var type, desc808, ref344, desc809;
var type = new Array("Left", "Cntr", "Rght");
var desc808 = new ActionDescriptor();
var ref344 = new ActionReference();
ref344.putProperty(c2t("Prpr"), s2t("paragraphStyle"));
ref344.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc808.putReference(c2t("null"), ref344);
var desc809 = new ActionDescriptor();
desc809.putInteger(s2t("textOverrideFeatureName"), 808464433);
desc809.putEnumerated(c2t("Algn"), c2t("Alg "), c2t(type[n]));
desc808.putObject(c2t("T   "), s2t("paragraphStyle"), desc809);
executeAction(c2t("setd"), desc808, DialogModes.NO);
}
function Layer_getTransformationRatio() {
var ref, desc, transform, iYY;
var ref = new ActionReference();
ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID("textKey"));
if (desc.hasKey(stringIDToTypeID("transform"))) {
var transform = desc.getObjectValue(stringIDToTypeID("transform"));
var iYY = transform.getUnitDoubleValue(stringIDToTypeID("yy"));
return iYY;
}
return 1;
}
function Layer_deleteHideLayer(params) {
var desc421, ref112;
var desc421 = new ActionDescriptor();
var ref112 = new ActionReference();
ref112.putEnumerated(c2t("Lyr "), c2t("Ordn"), s2t("hidden"));
desc421.putReference(c2t("null"), ref112);
executeAction(c2t("Dlt "), desc421, DialogModes.NO);
}
function Layer_deleteEmptyLayer(params) {
var desc425, ref116;
var desc425 = new ActionDescriptor();
var ref116 = new ActionReference();
ref116.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
desc425.putReference(c2t("null"), ref116);
executeAction(s2t("a0754df2-9c60-4b64-a940-6a2bb1102652"), desc425, DialogModes.NO);
}
function Layer_editSmartObject(params) {
var desc888;
var desc888 = new ActionDescriptor();
executeAction(stringIDToTypeID("placedLayerEditContents"), desc888, DialogModes.NO);
}
function Layer_getLayerColor(params) {
var col, info, r1, d1, tCol;
var col = new Color();
if (Layer_isText()) {
col = psColorToMyColor(app.activeDocument.activeLayer.textItem.color);
} else if (Layer_isSolidFill()) {
var info = Shape_getShapeInfo();
if (info.fill) {
col = info.fillColor;
} else {
if (info.stroke) {
col = info.strokeColor;
}
}
} else {
if (Layer_getTypeNumber() == 11) {
var r1 = new ActionReference();
var d1 = new ActionDescriptor();
r1.putEnumerated(s2t("contentLayer"), s2t("ordinal"), s2t("targetEnum"));
d1 = executeActionGet(r1);
var tCol = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("color"));
col = psColorActionObjectToMyColor(tCol);
}
}
return col;
}
function Layer_isSelectLayer(params) {
try {
Layer_getSelectLayerNumber();
} catch (error) {
return false;
}
return true;
}
function Layer_backroundToNormal(params) {
var desc291, ref32, desc292;
var desc291 = new ActionDescriptor();
var ref32 = new ActionReference();
ref32.putProperty(c2t("Lyr "), c2t("Bckg"));
desc291.putReference(c2t("null"), ref32);
var desc292 = new ActionDescriptor();
desc292.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc292.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
desc291.putObject(c2t("T   "), c2t("Lyr "), desc292);
desc291.putInteger(c2t("LyrI"), 12);
executeAction(c2t("setd"), desc291, DialogModes.NO);
}
function Layer_setPointText(params) {
var desc1451, ref666;
var desc1451 = new ActionDescriptor();
var ref666 = new ActionReference();
ref666.putProperty(c2t("Prpr"), c2t("TEXT"));
ref666.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc1451.putReference(c2t("null"), ref666);
desc1451.putEnumerated(c2t("T   "), c2t("TEXT"), c2t("Pnt "));
executeAction(c2t("setd"), desc1451, DialogModes.NO);
}
function Layer_setText(text) {
var desc59, ref6, desc60;
var desc59 = new ActionDescriptor();
var ref6 = new ActionReference();
ref6.putEnumerated(c2t("TxLr"), c2t("Ordn"), c2t("Trgt"));
desc59.putReference(c2t("null"), ref6);
var desc60 = new ActionDescriptor();
desc60.putString(c2t("Txt "), text);
desc59.putObject(c2t("T   "), c2t("TxLr"), desc60);
executeAction(c2t("setd"), desc59, DialogModes.NO);
}
function Layer_setBackgroudLayerColor(params) {
var desc70;
var desc70 = new ActionDescriptor();
desc70.putEnumerated(c2t("Usng"), c2t("FlCn"), c2t("FrgC"));
desc70.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100);
desc70.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
executeAction(c2t("Fl  "), desc70, DialogModes.NO);
}
function Shape_createLine(p1, p2, width, color) {
var desc245, ref78, desc246, desc247, desc248, desc249, desc250, desc251, desc252, list25, desc253, desc254;
if (typeof width == "undefined") {
width = 1
}
if (typeof color == "undefined") {
color = {
r: 74,
g: 255,
b: 255
}
}
var desc245 = new ActionDescriptor();
var ref78 = new ActionReference();
ref78.putClass(s2t("contentLayer"));
desc245.putReference(c2t("null"), ref78);
var desc246 = new ActionDescriptor();
var desc247 = new ActionDescriptor();
var desc248 = new ActionDescriptor();
desc248.putDouble(c2t("Rd  "), 41.003265);
desc248.putDouble(c2t("Grn "), 41.003265);
desc248.putDouble(c2t("Bl  "), 41.003265);
desc247.putObject(c2t("Clr "), c2t("RGBC"), desc248);
desc246.putObject(c2t("Type"), s2t("solidColorLayer"), desc247);
var desc249 = new ActionDescriptor();
var desc250 = new ActionDescriptor();
desc250.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), p1.x);
desc250.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), p1.y);
desc249.putObject(c2t("Strt"), c2t("Pnt "), desc250);
var desc251 = new ActionDescriptor();
desc251.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), p2.x);
desc251.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), p2.y);
desc249.putObject(c2t("End "), c2t("Pnt "), desc251);
desc249.putUnitDouble(c2t("Wdth"), c2t("#Pxl"), width);
desc246.putObject(c2t("Shp "), c2t("Ln  "), desc249);
var desc252 = new ActionDescriptor();
desc252.putInteger(s2t("strokeStyleVersion"), 2);
desc252.putBoolean(s2t("strokeEnabled"), true);
desc252.putBoolean(s2t("fillEnabled"), false);
desc252.putUnitDouble(s2t("strokeStyleLineWidth"), c2t("#Pxl"), width);
desc252.putUnitDouble(s2t("strokeStyleLineDashOffset"), c2t("Pnt "), 0);
desc252.putDouble(s2t("strokeStyleMiterLimit"), 100);
desc252.putEnumerated(s2t("strokeStyleLineCapType"), s2t("strokeStyleLineCapType"), s2t("strokeStyleButtCap"));
desc252.putEnumerated(s2t("strokeStyleLineJoinType"), s2t("strokeStyleLineJoinType"), s2t("strokeStyleMiterJoin"));
desc252.putEnumerated(s2t("strokeStyleLineAlignment"), s2t("strokeStyleLineAlignment"), s2t("strokeStyleAlignInside"));
desc252.putBoolean(s2t("strokeStyleScaleLock"), false);
desc252.putBoolean(s2t("strokeStyleStrokeAdjust"), false);
var list25 = new ActionList();
desc252.putList(s2t("strokeStyleLineDashSet"), list25);
desc252.putEnumerated(s2t("strokeStyleBlendMode"), c2t("BlnM"), c2t("Nrml"));
desc252.putUnitDouble(s2t("strokeStyleOpacity"), c2t("#Prc"), 100);
var desc253 = new ActionDescriptor();
var desc254 = new ActionDescriptor();
desc254.putDouble(c2t("Rd  "), color.r);
desc254.putDouble(c2t("Grn "), color.g);
desc254.putDouble(c2t("Bl  "), color.b);
desc253.putObject(c2t("Clr "), c2t("RGBC"), desc254);
desc252.putObject(s2t("strokeStyleContent"), s2t("solidColorLayer"), desc253);
desc252.putDouble(s2t("strokeStyleResolution"), 72);
desc246.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc252);
desc245.putObject(c2t("Usng"), s2t("contentLayer"), desc246);
desc245.putInteger(c2t("LyrI"), 19);
executeAction(c2t("Mk  "), desc245, DialogModes.NO);
}
function Shape_createRect(rect, isFill, isLine, fillCol, lineCol, lineWidth) {
var desc401, ref129, desc402, desc403, desc404, desc405, desc406, list42, desc407, desc408;
if (typeof rect == "undefined") {
return false;
}
if ((isFill == null) || (typeof isFill == "undefined")) {
isFill = false
}
if ((isLine == null) || (typeof isLine == "undefined")) {
isLine = false
}
if ((fillCol == null) || (typeof fillCol == "undefined")) {
fillCol = {
r: 0,
g: 0,
b: 0
}
}
if ((lineCol == null) || (typeof lineCol == "undefined")) {
lineCol = {
r: 0,
g: 0,
b: 0
}
}
if ((lineWidth == null) || (typeof lineWidth == "undefined")) {
lineWidth = 1
}
var desc401 = new ActionDescriptor();
var ref129 = new ActionReference();
ref129.putClass(s2t("contentLayer"));
desc401.putReference(c2t("null"), ref129);
var desc402 = new ActionDescriptor();
var desc403 = new ActionDescriptor();
var desc404 = new ActionDescriptor();
desc404.putDouble(c2t("Rd  "), fillCol.r);
desc404.putDouble(c2t("Grn "), fillCol.g);
desc404.putDouble(c2t("Bl  "), fillCol.b);
desc403.putObject(c2t("Clr "), c2t("RGBC"), desc404);
desc402.putObject(c2t("Type"), s2t("solidColorLayer"), desc403);
var desc405 = new ActionDescriptor();
desc405.putInteger(s2t("unitValueQuadVersion"), 1);
desc405.putUnitDouble(c2t("Top "), c2t("#Pxl"), rect.y);
desc405.putUnitDouble(c2t("Left"), c2t("#Pxl"), rect.x);
desc405.putUnitDouble(c2t("Btom"), c2t("#Pxl"), rect.y + rect.cy);
desc405.putUnitDouble(c2t("Rght"), c2t("#Pxl"), rect.x + rect.cx);
desc405.putUnitDouble(s2t("topRight"), c2t("#Pxl"), 0);
desc405.putUnitDouble(s2t("topLeft"), c2t("#Pxl"), 0);
desc405.putUnitDouble(s2t("bottomLeft"), c2t("#Pxl"), 0);
desc405.putUnitDouble(s2t("bottomRight"), c2t("#Pxl"), 0);
desc402.putObject(c2t("Shp "), c2t("Rctn"), desc405);
var desc406 = new ActionDescriptor();
desc406.putInteger(s2t("strokeStyleVersion"), 2);
desc406.putBoolean(s2t("strokeEnabled"), isLine);
desc406.putBoolean(s2t("fillEnabled"), isFill);
desc406.putUnitDouble(s2t("strokeStyleLineWidth"), c2t("#Pxl"), lineWidth);
desc406.putUnitDouble(s2t("strokeStyleLineDashOffset"), c2t("#Pnt"), 0);
desc406.putDouble(s2t("strokeStyleMiterLimit"), 100);
desc406.putEnumerated(s2t("strokeStyleLineCapType"), s2t("strokeStyleLineCapType"), s2t("strokeStyleButtCap"));
desc406.putEnumerated(s2t("strokeStyleLineJoinType"), s2t("strokeStyleLineJoinType"), s2t("strokeStyleMiterJoin"));
desc406.putEnumerated(s2t("strokeStyleLineAlignment"), s2t("strokeStyleLineAlignment"), s2t("strokeStyleAlignInside"));
desc406.putBoolean(s2t("strokeStyleScaleLock"), false);
desc406.putBoolean(s2t("strokeStyleStrokeAdjust"), false);
var list42 = new ActionList();
desc406.putList(s2t("strokeStyleLineDashSet"), list42);
desc406.putEnumerated(s2t("strokeStyleBlendMode"), c2t("BlnM"), c2t("Nrml"));
desc406.putUnitDouble(s2t("strokeStyleOpacity"), c2t("#Prc"), 100);
var desc407 = new ActionDescriptor();
var desc408 = new ActionDescriptor();
desc408.putDouble(c2t("Rd  "), lineCol.r);
desc408.putDouble(c2t("Grn "), lineCol.g);
desc408.putDouble(c2t("Bl  "), lineCol.b);
desc407.putObject(c2t("Clr "), c2t("RGBC"), desc408);
desc406.putObject(s2t("strokeStyleContent"), s2t("solidColorLayer"), desc407);
desc406.putDouble(s2t("strokeStyleResolution"), 72);
desc402.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc406);
desc401.putObject(c2t("Usng"), s2t("contentLayer"), desc402);
desc401.putInteger(c2t("LyrI"), 35);
executeAction(c2t("Mk  "), desc401, DialogModes.NO);
}
function Shape_set(isFill, fillCol, isLine, lineCol, lineWidth) {
var d1, r1, d2, d3;
var d1 = new ActionDescriptor();
var r1 = new ActionReference();
var d2 = new ActionDescriptor();
var d3 = new ActionDescriptor();
r1.putEnumerated(s2t("contentLayer"), c2t("Ordn"), c2t("Trgt"));
d1.putReference(s2t("null"), r1);
if ((isLine != null) && (typeof isLine == "boolean")) {
d3.putBoolean(s2t("strokeEnabled"), isLine);
}
if ((isFill != null) && (typeof isFill == "boolean")) {
d3.putBoolean(s2t("fillEnabled"), isFill);
}
d3.putInteger(s2t("strokeStyleVersion"), 2);
if ((lineWidth != null) && (typeof lineWidth != "undefined")) {
d3.putUnitDouble(s2t("strokeStyleLineWidth"), c2t("#Pxl"), lineWidth)
}
if ((lineCol != null) && (typeof lineCol != "undefined")) {
lineCol = Color_psColorToDescriptor(lineCol);
d3.putObject(s2t("strokeStyleContent"), s2t("solidColorLayer"), lineCol);
}
if ((fillCol != null) && (typeof fillCol != "undefined")) {
fillCol = Color_psColorToDescriptor(fillCol);
d2.putObject(c2t("FlCn"), s2t("solidColorLayer"), fillCol);
}
d2.putObject(s2t("strokeStyle"), s2t("strokeStyle"), d3);
d1.putObject(c2t("T   "), s2t("shapeStyle"), d2);
executeAction(c2t("setd"), d1, DialogModes.NO);
}
function Shape_setFillColor(set, col) {
if (typeof col == "undefined") {
col = app.foregroundColor;
}
Shape_set(set, col, null, null, null);
}
function Shape_setBorderColor(visible, col) {
if (typeof col == "undefined") {
col = app.foregroundColor
}
Shape_set(null, null, visible, col);
}
function Shape_setBorderWidth(width) {
Shape_set(null, null, null, null, width);
}
function Shape_createTriangle(x, y, radius, num, isSmooth, isFill, fillCol, isLine, lineCol) {
var desc1645, ref545, desc1646, desc1647, desc1648, desc1649, desc1650, desc1651, desc1652, list188, desc1653, desc1654;
if ((isFill == null) || (typeof isFill == "undefined")) {
fillCol = false
}
if ((fillCol == null) || (typeof fillCol == "undefined")) {
fillCol = new RGB(0, 0, 0)
}
if ((isLine == null) || (typeof isLine == "undefined")) {
isLine = false
}
if ((lineCol == null) || (typeof lineCol == "undefined")) {
lineCol = new RGB(0, 0, 0)
}
if ((isSmooth == null) || (typeof isSmooth == "undefined")) {
isSmooth = false
}
var desc1645 = new ActionDescriptor();
var ref545 = new ActionReference();
ref545.putClass(s2t("contentLayer"));
desc1645.putReference(c2t("null"), ref545);
var desc1646 = new ActionDescriptor();
var desc1647 = new ActionDescriptor();
var desc1648 = new ActionDescriptor();
desc1648.putDouble(c2t("Rd  "), fillCol.r);
desc1648.putDouble(c2t("Grn "), fillCol.g);
desc1648.putDouble(c2t("Bl  "), fillCol.b);
desc1647.putObject(c2t("Clr "), c2t("RGBC"), desc1648);
desc1646.putObject(c2t("Type"), s2t("solidColorLayer"), desc1647);
var desc1649 = new ActionDescriptor();
var desc1650 = new ActionDescriptor();
desc1650.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), x);
desc1650.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), y);
desc1649.putObject(c2t("Cntr"), c2t("Pnt "), desc1650);
var desc1651 = new ActionDescriptor();
desc1651.putUnitDouble(c2t("Hrzn"), c2t("#Pxl"), radius);
desc1651.putUnitDouble(c2t("Vrtc"), c2t("#Pxl"), 0);
desc1649.putObject(s2t("corner"), c2t("Ofst"), desc1651);
desc1649.putInteger(s2t("sides"), num);
desc1649.putUnitDouble(c2t("Rds "), c2t("#Pxl"), 0);
desc1649.putBoolean(s2t("smoothCorners"), isSmooth);
desc1646.putObject(c2t("Shp "), c2t("Plgn"), desc1649);
var desc1652 = new ActionDescriptor();
desc1652.putInteger(s2t("strokeStyleVersion"), 2);
desc1652.putBoolean(s2t("strokeEnabled"), isLine);
desc1652.putBoolean(s2t("fillEnabled"), isFill);
desc1652.putUnitDouble(s2t("strokeStyleLineWidth"), c2t("#Pxl"), 1);
desc1652.putUnitDouble(s2t("strokeStyleLineDashOffset"), c2t("Pnt "), 0);
desc1652.putDouble(s2t("strokeStyleMiterLimit"), 100);
desc1652.putEnumerated(s2t("strokeStyleLineCapType"), s2t("strokeStyleLineCapType"), s2t("strokeStyleButtCap"));
desc1652.putEnumerated(s2t("strokeStyleLineJoinType"), s2t("strokeStyleLineJoinType"), s2t("strokeStyleMiterJoin"));
desc1652.putEnumerated(s2t("strokeStyleLineAlignment"), s2t("strokeStyleLineAlignment"), s2t("strokeStyleAlignInside"));
desc1652.putBoolean(s2t("strokeStyleScaleLock"), false);
desc1652.putBoolean(s2t("strokeStyleStrokeAdjust"), false);
var list188 = new ActionList();
desc1652.putList(s2t("strokeStyleLineDashSet"), list188);
desc1652.putEnumerated(s2t("strokeStyleBlendMode"), c2t("BlnM"), c2t("Nrml"));
desc1652.putUnitDouble(s2t("strokeStyleOpacity"), c2t("#Prc"), 100);
var desc1653 = new ActionDescriptor();
var desc1654 = new ActionDescriptor();
desc1654.putDouble(c2t("Rd  "), lineCol.r);
desc1654.putDouble(c2t("Grn "), lineCol.g);
desc1654.putDouble(c2t("Bl  "), lineCol.b);
desc1653.putObject(c2t("Clr "), c2t("RGBC"), desc1654);
desc1652.putObject(s2t("strokeStyleContent"), s2t("solidColorLayer"), desc1653);
desc1652.putDouble(s2t("strokeStyleResolution"), 72);
desc1646.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc1652);
desc1645.putObject(c2t("Usng"), s2t("contentLayer"), desc1646);
desc1645.putInteger(c2t("LyrI"), 2068);
executeAction(c2t("Mk  "), desc1645, DialogModes.NO);
}
function Path_setPathPoint(x, y, lx, ly, rx, ry) {
var point;
var point = new PathPointInfo();
point.anchor = [x, y];
point.leftDirection = [lx, ly];
point.rightDirection = [rx, ry];
point.kind = PointKind.SMOOTHPOINT;
return point;
}
function Path_createShape(params) {
var desc1908, ref492, desc1909, desc1910, desc1911;
var desc1908 = new ActionDescriptor();
var ref492 = new ActionReference();
ref492.putClass(s2t("contentLayer"));
desc1908.putReference(c2t("null"), ref492);
var desc1909 = new ActionDescriptor();
var desc1910 = new ActionDescriptor();
var desc1911 = new ActionDescriptor();
desc1911.putDouble(c2t("Rd  "), 57.354084);
desc1911.putDouble(c2t("Grn "), 225.000002);
desc1911.putDouble(c2t("Bl  "), 207.241244);
desc1910.putObject(c2t("Clr "), c2t("RGBC"), desc1911);
desc1909.putObject(c2t("Type"), s2t("solidColorLayer"), desc1910);
desc1908.putObject(c2t("Usng"), s2t("contentLayer"), desc1909);
executeAction(c2t("Mk  "), desc1908, DialogModes.NO);
}
function Shape_createCircular(rect, isFill, fillCol, isLine, lineCol) {
var desc91, ref27, desc92, desc93, desc94, desc95, desc96, list6, desc97, desc98;
if ((isFill == null) || (typeof isFill == "undefined")) {
isFill = false
}
if ((isLine == null) || (typeof isLine == "undefined")) {
isLine = false
}
if ((fillCol == null) || (typeof fillCol == "undefined")) {
fillCol = new RGB(25, 25, 25)
}
if ((lineCol == null) || (typeof lineCol == "undefined")) {
lineCol = new RGB(25, 25, 25)
}
var desc91 = new ActionDescriptor();
var ref27 = new ActionReference();
ref27.putClass(s2t("contentLayer"));
desc91.putReference(c2t("null"), ref27);
var desc92 = new ActionDescriptor();
var desc93 = new ActionDescriptor();
var desc94 = new ActionDescriptor();
desc94.putDouble(c2t("Rd  "), fillCol.r);
desc94.putDouble(c2t("Grn "), fillCol.g);
desc94.putDouble(c2t("Bl  "), fillCol.b);
desc93.putObject(c2t("Clr "), c2t("RGBC"), desc94);
desc92.putObject(c2t("Type"), s2t("solidColorLayer"), desc93);
var desc95 = new ActionDescriptor();
desc95.putInteger(s2t("unitValueQuadVersion"), 1);
desc95.putUnitDouble(c2t("Top "), c2t("#Pxl"), rect.y);
desc95.putUnitDouble(c2t("Left"), c2t("#Pxl"), rect.x);
desc95.putUnitDouble(c2t("Btom"), c2t("#Pxl"), rect.y + rect.cy);
desc95.putUnitDouble(c2t("Rght"), c2t("#Pxl"), rect.x + rect.cx);
desc92.putObject(c2t("Shp "), c2t("Elps"), desc95);
var desc96 = new ActionDescriptor();
desc96.putInteger(s2t("strokeStyleVersion"), 2);
desc96.putBoolean(s2t("strokeEnabled"), isLine);
desc96.putBoolean(s2t("fillEnabled"), isFill);
desc96.putUnitDouble(s2t("strokeStyleLineWidth"), c2t("#Pxl"), 1);
desc96.putUnitDouble(s2t("strokeStyleLineDashOffset"), c2t("#Pnt"), 0);
desc96.putDouble(s2t("strokeStyleMiterLimit"), 100);
desc96.putEnumerated(s2t("strokeStyleLineCapType"), s2t("strokeStyleLineCapType"), s2t("strokeStyleButtCap"));
desc96.putEnumerated(s2t("strokeStyleLineJoinType"), s2t("strokeStyleLineJoinType"), s2t("strokeStyleMiterJoin"));
desc96.putEnumerated(s2t("strokeStyleLineAlignment"), s2t("strokeStyleLineAlignment"), s2t("strokeStyleAlignInside"));
desc96.putBoolean(s2t("strokeStyleScaleLock"), false);
desc96.putBoolean(s2t("strokeStyleStrokeAdjust"), false);
var list6 = new ActionList();
desc96.putList(s2t("strokeStyleLineDashSet"), list6);
desc96.putEnumerated(s2t("strokeStyleBlendMode"), c2t("BlnM"), c2t("Nrml"));
desc96.putUnitDouble(s2t("strokeStyleOpacity"), c2t("#Prc"), 100);
var desc97 = new ActionDescriptor();
var desc98 = new ActionDescriptor();
desc98.putDouble(c2t("Rd  "), lineCol.r);
desc98.putDouble(c2t("Grn "), lineCol.g);
desc98.putDouble(c2t("Bl  "), lineCol.b);
desc97.putObject(c2t("Clr "), c2t("RGBC"), desc98);
desc96.putObject(s2t("strokeStyleContent"), s2t("solidColorLayer"), desc97);
desc96.putDouble(s2t("strokeStyleResolution"), 72);
desc92.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc96);
desc91.putObject(c2t("Usng"), s2t("contentLayer"), desc92);
desc91.putInteger(c2t("LyrI"), 43);
executeAction(c2t("Mk  "), desc91, DialogModes.NO);
}
function Shape_setFillet(all, topLeft, topRight, bottomLeft, bottomRight) {
var i, desc827, desc828;
if (all == true) {
topRight = 0;
bottomLeft = 0;
bottomRight = 0;
}
for (var i = 0;i < 4; i += 1) {
var desc827 = new ActionDescriptor();
desc827.putInteger(s2t("keyOriginType"), 1);
desc827.putDouble(s2t("keyOriginResolution"), 72);
var desc828 = new ActionDescriptor();
desc828.putInteger(s2t("unitValueQuadVersion"), 1);
desc828.putUnitDouble(s2t("topRight"), c2t("#Pxl"), topRight);
desc828.putUnitDouble(s2t("topLeft"), c2t("#Pxl"), topLeft);
desc828.putUnitDouble(s2t("bottomLeft"), c2t("#Pxl"), bottomLeft);
desc828.putUnitDouble(s2t("bottomRight"), c2t("#Pxl"), bottomRight);
desc827.putObject(s2t("keyOriginRRectRadii"), s2t("radii"), desc828);
desc827.putInteger(s2t("keyActionRadiiSource"), all ? 1 : i);
desc827.putBoolean(s2t("keyActionChangeAllCorners"), all);
executeAction(s2t("changePathDetails"), desc827, DialogModes.NO);
if (all) {
break ;
}
}
}
function Shape_getShapeInfo(des) {
var obj, r1, d1, xd, sGra, fGra, bfill, fillDesc, tCol, d2, dCol;
var obj = {
stroke: false,
fill: false,
strokeGradient: false,
fillGradient: false,
strokeColor: null,
fillColor: null
};
var r1 = new ActionReference();
var d1 = new ActionDescriptor();
r1.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
d1 = executeActionGet(r1);
if (typeof des != "undefined") {
d1 = des
}
try {
var xd = d1.getObjectValue(s2t("AGMStrokeStyleInfo"));
obj.stroke = xd.getBoolean(s2t("strokeEnabled"));
obj.fill = xd.getBoolean(s2t("fillEnabled"));
if (obj.stroke) {
try {
var sGra = xd.getObjectValue(s2t("strokeStyleContent")).getObjectValue(s2t("gradient"));
obj.strokeGradient = true;
} catch (error) {

}
}
if (obj.fill) {
try {
var fGra = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("gradient"));
obj.fillGradient = true;
} catch (error) {

}
}
} catch (error) {
try {
var bfill = d1.getBoolean(s2t("fillEnabled"));
obj.fill = bfill;
} catch (error) {

}
try {
var fillDesc = d1.getList(s2t("adjustment"));
obj.fill = true;
try {
var fGra = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("gradient"));
obj.fillGradient = true;
} catch (error) {

}
} catch (error) {

}
}
try {
var tCol = d1.getList(s2t("adjustment")).getObjectValue(0).getObjectValue(s2t("color"));
obj.fillColor = psColorActionObjectToMyColor(tCol);
} catch (error) {

}
try {
var d2 = d1.getObjectValue(s2t("AGMStrokeStyleInfo"));
var dCol = d2.getObjectValue(s2t("strokeStyleContent")).getObjectValue(s2t("color"));
obj.strokeColor = psColorActionObjectToMyColor(dCol);
} catch (error) {

}
return obj;
}
function Shape_getColor(params) {

}
function Shape_getShapeGradient(params) {
var info, obj, r1, d1, objAdju;
var info = Shape_getShapeInfo();
var obj = {
fillGradient: false,
strokeGradient: false
};
var r1 = new ActionReference();
var d1 = new ActionDescriptor();
r1.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
d1 = executeActionGet(r1);
if (info.fill && info.fillGradient) {
obj.fillGradient = true;
var objAdju = d1.getList(s2t("adjustment")).getObjectValue(0);
obj.fill = Shape_getGradientValue(objAdju);
}
if (info.stroke && info.strokeGradient) {
obj.strokeGradient = true;
var objAdju = d1.getObjectValue(s2t("AGMStrokeStyleInfo")).getObjectValue(s2t("strokeStyleContent"));
obj.stroke = Shape_getGradientValue(objAdju);
}
return obj;
}
function Shape_getGradientValue(objAdju) {
var objFill, objGrad, gradient, colList, arrList, i, listObj, objColList, color, c, tranList, arrTran, objTran;
var objFill = {};
try {
objFill.angle = objAdju.getUnitDoubleValue(s2t("angle"));
} catch (error) {
objFill.angle = 0;
}
objFill.type = objAdju.getEnumerationValue(s2t("type"));
try {
objFill.reverse = objAdju.getBoolean(s2t("reverse"));
} catch (error) {
objFill.reverse = false;
}
try {
objFill.align = objAdju.getBoolean(s2t("align"));
} catch (error) {
objFill.align = true;
}
var objGrad = objAdju.getObjectValue(s2t("gradient"));
var gradient = {};
gradient.name = objGrad.getString(s2t("name"));
gradient.smoothness = objGrad.getDouble(s2t("interfaceIconFrameDimmed"));
var colList = objGrad.getList(s2t("colors"));
var arrList = [];
for (var i = 0;i < colList.count; i += 1) {
var listObj = {};
var objColList = colList.getObjectValue(i);
listObj.type = objColList.getEnumerationValue(s2t("type"));
listObj.location = objColList.getInteger(s2t("location"));
listObj.midpoint = objColList.getInteger(s2t("midpoint"));
var color = {};
if (app.activeDocument.mode == DocumentMode.CMYK) {
color.cyan = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("cyan")));
color.magenta = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("magenta")));
color.yellow = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("yellowColor")));
color.black = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("black")));
var c = new SolidColor();
c.cmyk.cyan = color.cyan;
c.cmyk.magenta = color.magenta;
c.cmyk.yellow = color.yellow;
c.cmyk.black = color.black;
color.hexValue = c.rgb.hexValue;
color.red = Math.round(c.rgb.red);
color.grain = Math.round(c.rgb.green);
color.blue = Math.round(c.rgb.blue);
} else {
color.red = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("red")));
color.grain = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("grain")));
color.blue = Math.round(objColList.getObjectValue(s2t("color")).getDouble(s2t("blue")));
var c = new SolidColor();
c.rgb.red = color.red;
c.rgb.green = color.grain;
c.rgb.blue = color.blue;
color.hexValue = c.rgb.hexValue;
color.cyan = Math.round(c.cmyk.cyan);
color.magenta = Math.round(c.cmyk.magenta);
color.yellow = Math.round(c.cmyk.yellow);
color.black = Math.round(c.cmyk.black);
}
listObj.color = color;
arrList.push(listObj);
}
gradient.colors = arrList;
var tranList = objGrad.getList(s2t("transparency"));
var arrTran = [];
for (var i = 0;i < tranList.count; i += 1) {
var listObj = {};
var objTran = tranList.getObjectValue(i);
listObj.opacity = objTran.getDouble(s2t("opacity"));
listObj.location = objTran.getInteger(s2t("location"));
listObj.midpoint = objTran.getInteger(s2t("midpoint"));
arrTran.push(listObj);
}
gradient.transparency = arrTran;
objFill.gradient = gradient;
return objFill;
}
function Shape_setFillGradient(obj) {
var desc1931, ref352, desc1932, desc1933, desc1934, desc1935, list238, i, desc1936, desc1937, list239, desc1942, desc1944;
var desc1931 = new ActionDescriptor();
var ref352 = new ActionReference();
ref352.putEnumerated(s2t("contentLayer"), c2t("Ordn"), c2t("Trgt"));
desc1931.putReference(c2t("null"), ref352);
var desc1932 = new ActionDescriptor();
var desc1933 = new ActionDescriptor();
desc1933.putBoolean(c2t("Dthr"), true);
desc1933.putBoolean(c2t("Rvrs"), obj.reverse);
desc1933.putUnitDouble(c2t("Angl"), c2t("#Ang"), obj.angle);
desc1933.putEnumerated(c2t("Type"), c2t("GrdT"), obj.type);
desc1933.putBoolean(c2t("Algn"), obj.align);
desc1933.putUnitDouble(c2t("Scl "), c2t("#Prc"), 100);
var desc1934 = new ActionDescriptor();
desc1934.putUnitDouble(c2t("Hrzn"), c2t("#Prc"), 0);
desc1934.putUnitDouble(c2t("Vrtc"), c2t("#Prc"), 0);
desc1933.putObject(c2t("Ofst"), c2t("Pnt "), desc1934);
var desc1935 = new ActionDescriptor();
desc1935.putString(c2t("Nm  "), obj.gradient.name);
desc1935.putEnumerated(c2t("GrdF"), c2t("GrdF"), c2t("CstS"));
desc1935.putDouble(c2t("Intr"), obj.gradient.smoothness);
var list238 = new ActionList();
for (var i = 0;i < obj.gradient.colors.length; i += 1) {
var desc1936 = new ActionDescriptor();
var desc1937 = new ActionDescriptor();
if (app.activeDocument.mode == DocumentMode.CMYK) {
desc1937.putDouble(c2t("Cyn "), obj.gradient.colors[i].color.cyan);
desc1937.putDouble(c2t("Mgnt"), obj.gradient.colors[i].color.magenta);
desc1937.putDouble(c2t("Ylw "), obj.gradient.colors[i].color.yellow);
desc1937.putDouble(c2t("Blck"), obj.gradient.colors[i].color.black);
desc1936.putObject(c2t("Clr "), c2t("CMYC"), desc1937);
} else {
desc1937.putDouble(c2t("Rd  "), obj.gradient.colors[i].color.red);
desc1937.putDouble(c2t("Grn "), obj.gradient.colors[i].color.grain);
desc1937.putDouble(c2t("Bl  "), obj.gradient.colors[i].color.blue);
desc1936.putObject(c2t("Clr "), c2t("RGBC"), desc1937);
}
desc1936.putEnumerated(c2t("Type"), c2t("Clry"), obj.gradient.colors[i].type);
desc1936.putInteger(c2t("Lctn"), obj.gradient.colors[i].location);
desc1936.putInteger(c2t("Mdpn"), obj.gradient.colors[i].midpoint);
list238.putObject(c2t("Clrt"), desc1936);
}
desc1935.putList(c2t("Clrs"), list238);
var list239 = new ActionList();
for (var i = 0;i < obj.gradient.transparency.length; i += 1) {
var desc1942 = new ActionDescriptor();
desc1942.putUnitDouble(c2t("Opct"), c2t("#Prc"), obj.gradient.transparency[i].opacity);
desc1942.putInteger(c2t("Lctn"), obj.gradient.transparency[i].location);
desc1942.putInteger(c2t("Mdpn"), obj.gradient.transparency[i].midpoint);
list239.putObject(c2t("TrnS"), desc1942);
}
desc1935.putList(c2t("Trns"), list239);
desc1933.putObject(c2t("Grad"), c2t("Grdn"), desc1935);
desc1932.putObject(c2t("FlCn"), s2t("gradientLayer"), desc1933);
var desc1944 = new ActionDescriptor();
desc1944.putInteger(s2t("strokeStyleVersion"), 2);
desc1944.putBoolean(s2t("fillEnabled"), true);
desc1932.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc1944);
desc1931.putObject(c2t("T   "), s2t("shapeStyle"), desc1932);
executeAction(c2t("setd"), desc1931, DialogModes.NO);
}
function Shape_setStrokeGradient(obj) {
var desc2452, ref449, desc2453, desc2454, desc2455, desc2456, desc2457, list290, i, desc2458, desc2459, list291, desc2464;
var desc2452 = new ActionDescriptor();
var ref449 = new ActionReference();
ref449.putEnumerated(s2t("contentLayer"), c2t("Ordn"), c2t("Trgt"));
desc2452.putReference(c2t("null"), ref449);
var desc2453 = new ActionDescriptor();
var desc2454 = new ActionDescriptor();
var desc2455 = new ActionDescriptor();
desc2455.putBoolean(c2t("Dthr"), true);
desc2455.putBoolean(c2t("Rvrs"), obj.reverse);
desc2455.putUnitDouble(c2t("Angl"), c2t("#Ang"), obj.angle);
desc2455.putEnumerated(c2t("Type"), c2t("GrdT"), obj.type);
desc2455.putBoolean(c2t("Algn"), obj.align);
desc2455.putUnitDouble(c2t("Scl "), c2t("#Prc"), 100);
var desc2456 = new ActionDescriptor();
desc2456.putUnitDouble(c2t("Hrzn"), c2t("#Prc"), 0);
desc2456.putUnitDouble(c2t("Vrtc"), c2t("#Prc"), 0);
desc2455.putObject(c2t("Ofst"), c2t("Pnt "), desc2456);
var desc2457 = new ActionDescriptor();
desc2457.putString(c2t("Nm  "), obj.gradient.name);
desc2457.putEnumerated(c2t("GrdF"), c2t("GrdF"), c2t("CstS"));
desc2457.putDouble(c2t("Intr"), obj.gradient.smoothness);
var list290 = new ActionList();
for (var i = 0;i < obj.gradient.colors.length; i += 1) {
var desc2458 = new ActionDescriptor();
var desc2459 = new ActionDescriptor();
if (app.activeDocument.mode == DocumentMode.CMYK) {
desc2459.putDouble(c2t("Cyn "), obj.gradient.colors[i].color.cyan);
desc2459.putDouble(c2t("Mgnt"), obj.gradient.colors[i].color.magenta);
desc2459.putDouble(c2t("Ylw "), obj.gradient.colors[i].color.yellow);
desc2459.putDouble(c2t("Blck"), obj.gradient.colors[i].color.black);
desc2458.putObject(c2t("Clr "), c2t("CMYC"), desc2459);
} else {
desc2459.putDouble(c2t("Rd  "), obj.gradient.colors[i].color.red);
desc2459.putDouble(c2t("Grn "), obj.gradient.colors[i].color.grain);
desc2459.putDouble(c2t("Bl  "), obj.gradient.colors[i].color.blue);
desc2458.putObject(c2t("Clr "), c2t("RGBC"), desc2459);
}
desc2458.putEnumerated(c2t("Type"), c2t("Clry"), obj.gradient.colors[i].type);
desc2458.putInteger(c2t("Lctn"), obj.gradient.colors[i].location);
desc2458.putInteger(c2t("Mdpn"), obj.gradient.colors[i].midpoint);
list290.putObject(c2t("Clrt"), desc2458);
}
desc2457.putList(c2t("Clrs"), list290);
var list291 = new ActionList();
for (var i = 0;i < obj.gradient.transparency.length; i += 1) {
var desc2464 = new ActionDescriptor();
desc2464.putUnitDouble(c2t("Opct"), c2t("#Prc"), obj.gradient.transparency[i].opacity);
desc2464.putInteger(c2t("Lctn"), obj.gradient.transparency[i].location);
desc2464.putInteger(c2t("Mdpn"), obj.gradient.transparency[i].midpoint);
list291.putObject(c2t("TrnS"), desc2464);
}
desc2457.putList(c2t("Trns"), list291);
desc2455.putObject(c2t("Grad"), c2t("Grdn"), desc2457);
desc2454.putObject(s2t("strokeStyleContent"), s2t("gradientLayer"), desc2455);
desc2454.putInteger(s2t("strokeStyleVersion"), 2);
desc2454.putBoolean(s2t("strokeEnabled"), true);
desc2453.putObject(s2t("strokeStyle"), s2t("strokeStyle"), desc2454);
desc2452.putObject(c2t("T   "), s2t("shapeStyle"), desc2453);
executeAction(c2t("setd"), desc2452, DialogModes.NO);
}
function Sys_setSystemEnvInfo(str) {
try {
app.env = ps_toObject(str);
return ps_returnOk(true);
} catch (err) {
app.env = {};
return ps_returnErr(false);
}
}
function s2t(s) {
return app.stringIDToTypeID(s);
}
function c2t(s) {
return app.charIDToTypeID(s);
}
function t2s(t) {
return typeIDToStringID(t);
}
if (typeof CSXSEvent === "undefined") {
var plugPlugLibPath = "lib:PlugPlugExternalObject";
try {
new ExternalObject(plugPlugLibPath);
if (typeof CSXSEvent === "undefined") {
throw new Error("Class CSXSEvent is undefined!")
}
} catch (e) {
alert(e.message || (("Load ExternalObject: " + plugPlugLibPath) + " failed!"));
}
}
function sendEvent(type, data) {
var event;
try {
var event = new CSXSEvent();
event.type = type;
event.data = serializeData(data);
event.dispatch();
} catch (e) {

}
}
function serializeData(data) {
if ((typeof data === "function") || (typeof data === "undefined")) {
throw new TypeError(("The data type: " + typeof data) + " is not supported!")
}
try {
data = JSON.stringify(data);
} catch (error) {
$.writeln(("The data: " + data) + "can't be JSON stringify");
throw error
}
return data;
}
function getErrorDetails(e) {
var name, line, fileName, description, sourceLine, errorDetails;
var name = e.name;
var line = e.line;
var fileName = e.fileName;
var description = e.description;
var sourceLine = e.source.split(/[\r\n]/)[line - 1];
var errorDetails = ((((name + " ") + e.number) + ": ") + description) + "\nat:";
errorDetails += ("\n  File: " + fileName);
errorDetails += ((("\n  Line: " + line) + " -> ") + (sourceLine.length < 300 ? sourceLine : sourceLine.substring(0, 300) + "..."));
if (e.start) {
errorDetails += ("\nBug: " + e.source.substring(e.start - 1, e.end));
}
return errorDetails;
}
function _A(str, title) {
var strTitle, d, txt, zs;
var strTitle = "提醒";
if (typeof title != "undefined") {
strTitle = title
}
var d = new Window("dialog", strTitle);
d.spacing = 2;
var txt = d.add("statictext");
txt.text = str;
d.add("statictext", undefined, "  ");
var zs = d.add("Button { text: '关闭', properties: { name: 'Cancel' }}");
zs.location = [200, 500];
zs.size = [200, 30];
d.show();
}
function _A2(obj) {
_A(JSON.stringify(obj));
}
function _A3() {
var str, i;
var str = "";
for (var i = 0;i < arguments.length; i += 1) {
str += (arguments[i] + " ");
}
_A(str);
}
function compileStr(code) {
var c, i;
if ((code == "") || (typeof code == "undefined")) {
return code;
}
var c = String.fromCharCode(code.charCodeAt(0) + code.length);
for (var i = 1;i < code.length; i += 1) {
c += String.fromCharCode(code.charCodeAt(i) + code.charCodeAt(i - 1));
}
return escape(c);
}
function uncompileStr(code) {
var c, i;
code = unescape(code);
var c = String.fromCharCode(code.charCodeAt(0) - code.length);
for (var i = 1;i < code.length; i += 1) {
c += String.fromCharCode(code.charCodeAt(i) - c.charCodeAt(i - 1));
}
return c;
}
function ps_onJsx(str) {
var doc, obj, name, params, i, type, funcStr;
if (documents.length == 0) {
app.documents.add(UnitValue("100 px"), UnitValue("100 px"), 72, "sjzl_tmep_newDoc");
var doc = app.activeDocument;
}
try {
var obj = JSON.parse(str);
if (typeof obj.f == "undefined") {
_A("函数名未填写");
return;
}
var name = "设计助理";
if (typeof obj.n != "undefined") {
name = obj.n
}
var params = "";
if (typeof obj.arr != "undefined") {
for (var i = 0;i < obj.arr.length; i += 1) {
var type = typeof obj.arr[i];
if (type == "string") {
params += (("'" + obj.arr[i]) + "'")
} else if (type == "object") {
params += (("'" + JSON.stringify(obj.arr[i])) + "'");
} else {
params += obj.arr[i]
}
if (obj.arr.length != (i + 1)) {
params += ","
}
}
}
var funcStr = ((obj.f + "(") + params) + ")";
app.activeDocument.suspendHistory(name, funcStr);
} catch (error) {
error = error.message;
if (error.indexOf("用户取消了操作") == -1) {
_A("错误：" + error);
}
}
if (typeof doc != "undefined") {
doc.close(SaveOptions.DONOTSAVECHANGES);
}
return 1;
}
function isOpenDoc(params) {
try {
if (app.documents.length > 0) {
return true;
}
} catch (error) {

}
_A("请打开文档后使用本功能!");
return false;
}
function ps_deleteSpechars(str) {
var pattern, rs, i;
var pattern = new RegExp("[/:*\"<>|]");
var rs = "";
for (var i = 0;i < str.length; i += 1) {
rs += str.substr(i, 1).replace(pattern, "");
}
rs = rs.replace(/\\/g, "");
if (rs.length > 70) {
rs = rs.substr(0, 70)
}
return rs;
}
function ps_copyObject(obj) {
var ls;
var ls = JSON.stringify(obj);
return JSON.parse(ls);
}
function ps_writeStatus(path, str) {
var f;
var f = new File(path);
f.open("w");
f.encoding = "UTF8";
f.write(str);
f.close();
}
function ps_funcStatus(status) {
var path;
var path = (Folder.userData + (app.env.VUE_APP_USER_DIR || "/SheJiZhuLi")) + "/ls_funcStatus.ini";
if (status == 1) {
ps_writeStatus(path, "1")
} else {
ps_writeStatus(path, "-1")
}
}
function ps_getGuid(params) {
var d, uuid;
var d = new Date().getTime();
var uuid = "xxxx4xxxyxxxxxxx".replace(/[xy]/g, function (c) {
var r;
var r = ((d + (Math.random() * 16)) % 16) | 0;
d = Math.floor(d / 16);
return (c == "x" ? r : (r & 3) | 8).toString(16);
});
return uuid.toUpperCase();
}
function ErrInfo(msg) {
this.err = 1;
this.msg = msg;
}
function OkInfo(data) {
this.err = 0;
if (typeof data == "undefined") {
data = ""
}
this.data = data;
}
function ps_returnErr(msg, code) {
var res;
var res = new ErrInfo(msg);
if (typeof code == "undefined") {
code = 0
}
res.code = code;
return JSON.stringify(res);
}
function ps_returnOk(data) {
var res;
var res = new OkInfo(data);
return JSON.stringify(res);
}
function ps_toObject(str) {
if ((typeof str != "undefined") && (typeof str != "object")) {
try {
return JSON.parse(str);
} catch (error) {
_A3("转换对象失败", error);
}
}
return str;
}
function ps_toTwo(s) {
return s < 10 ? "0" + s : s;
}
if (typeof JSON !== "object") {
JSON = {};
}
(function () {
var rx_one, rx_two, rx_three, rx_four, rx_escapable, rx_dangerous, gap, indent, meta, rep;
"use strict";
var rx_one = /^[\],:{}\s]*$/;
var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
function f(n) {
return n < 10 ? "0" + n : n;
}
function this_value() {
return this.valueOf();
}
if (typeof Date.prototype.toJSON !== "function") {
Date.prototype.toJSON = function () {
return isFinite(this.valueOf()) ? ((((((((((this.getUTCFullYear() + "-") + f(this.getUTCMonth() + 1)) + "-") + f(this.getUTCDate())) + "T") + f(this.getUTCHours())) + ":") + f(this.getUTCMinutes())) + ":") + f(this.getUTCSeconds())) + "Z" : null;
};
Boolean.prototype.toJSON = this_value;
Number.prototype.toJSON = this_value;
String.prototype.toJSON = this_value;
}
function quote(string) {
rx_escapable.lastIndex = 0;
return rx_escapable.test(string) ? ("\"" + string.replace(rx_escapable, function (a) {
var c;
var c = meta[a];
return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
})) + "\"" : ("\"" + string) + "\"";
}
function str(key, holder) {
var i, k, v, length, mind, partial, value;
var mind = gap;
var value = holder[key];
if ((value && (typeof value === "object")) && (typeof value.toJSON === "function")) {
value = value.toJSON(key);
}
if (typeof rep === "function") {
value = rep.call(holder, key, value);
}
switch(typeof value) {
case "string":
return quote(value);
case "number":
return isFinite(value) ? String(value) : "null";
case "boolean":
case "null":
return String(value);
case "object":
if (!value) {
return "null";
}
gap += indent;
partial = [];
if (Object.prototype.toString.apply(value) === "[object Array]") {
length = value.length;
for (var i = 0;i < length; i += 1) {
partial[i] = str(i, value) || "null";
}
v = (partial.length === 0 ? "[]" : gap) ? (((("[\n" + gap) + partial.join(",\n" + gap)) + "\n") + mind) + "]" : ("[" + partial.join(",")) + "]";
gap = mind;
return v;
}
if (rep && (typeof rep === "object")) {
length = rep.length;
for (var i = 0;i < length; i += 1) {
if (typeof rep[i] === "string") {
k = rep[i];
v = str(k, value);
if (v) {
partial.push((quote(k) + (gap ? ": " : ":")) + v);
}
}
}
} else {
for (var k in value) {
if (Object.prototype.hasOwnProperty.call(value, k)) {
v = str(k, value);
if (v) {
partial.push((quote(k) + (gap ? ": " : ":")) + v);
}
}
}
}
v = (partial.length === 0 ? "{}" : gap) ? (((("{\n" + gap) + partial.join(",\n" + gap)) + "\n") + mind) + "}" : ("{" + partial.join(",")) + "}";
gap = mind;
return v;
}
}
if (typeof JSON.stringify !== "function") {
meta = {
"\b": "\\b",
"\t": "\\t",
"\n": "\\n",
"\f": "\\f",
"\r": "\\r",
"\"": "\\\"",
"\\": "\\\\"
};
JSON.stringify = function (value, replacer, space) {
var i;
gap = "";
indent = "";
if (typeof space === "number") {
for (var i = 0;i < space; i += 1) {
indent += " ";
}
} else {
if (typeof space === "string") {
indent = space;
}
}
rep = replacer;
if ((replacer && (typeof replacer !== "function")) && ((typeof replacer !== "object") || (typeof replacer.length !== "number"))) {
throw new Error("JSON.stringify")
}
return str("", {
"": value
});
};
}
if (typeof JSON.parse !== "function") {
JSON.parse = function (text, reviver) {
var j;
function walk(holder, key) {
var k, v, value;
var value = holder[key];
if (value && (typeof value === "object")) {
for (var k in value) {
if (Object.prototype.hasOwnProperty.call(value, k)) {
v = walk(value, k);
if (v !== undefined) {
value[k] = v;
} else {
delete value[k];
}
}
}
}
return reviver.call(holder, key, value);
}
text = String(text);
rx_dangerous.lastIndex = 0;
if (rx_dangerous.test(text)) {
text = text.replace(rx_dangerous, function (a) {
return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
});
}
if (rx_one.test(text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""))) {
j = eval(("(" + text) + ")");
return typeof reviver === "function" ? walk({
"": j
}, "") : j;
}
throw new SyntaxError("JSON.parse")
};
}
})();
function init(params) {

}
init();
function s2t(s) {
return app.stringIDToTypeID(s);
}
function c2t(s) {
return app.charIDToTypeID(s);
}
function t2s(t) {
return app.typeIDToStringID(t);
}
function AppPreferences() {

}
AppPreferences.typeUnits = function () {
return app.preferences.typeUnits;
};
AppPreferences.typeUnitsStringID = function () {
return {
"TypeUnits.PIXELS": "pixelsUnit",
"TypeUnits.POINTS": "pointsUnit",
"TypeUnits.MM": "millimetersUnit"
}[app.preferences.typeUnits];
};
function layer_font_setFontSize(size, unitType) {
var _LFsetFontSizeAD, _LFsetFontSizeAR, _LFsetFontSizeAD2;
if ((unitType === undefined) || (unitType === null)) {
unitType = AppPreferences.typeUnitsStringID()
}
var _LFsetFontSizeAD = new ActionDescriptor();
var _LFsetFontSizeAR = new ActionReference();
_LFsetFontSizeAR.putProperty(s2t("property"), s2t("textStyle"));
_LFsetFontSizeAR.putEnumerated(s2t("textLayer"), s2t("ordinal"), s2t("targetEnum"));
_LFsetFontSizeAD.putReference(s2t("null"), _LFsetFontSizeAR);
var _LFsetFontSizeAD2 = new ActionDescriptor();
_LFsetFontSizeAD2.putInteger(s2t("textOverrideFeatureName"), 808465458);
_LFsetFontSizeAD2.putInteger(s2t("typeStyleOperationType"), 3);
_LFsetFontSizeAD2.putUnitDouble(s2t("size"), s2t(unitType), size);
_LFsetFontSizeAD.putObject(s2t("to"), s2t("textStyle"), _LFsetFontSizeAD2);
executeAction(s2t("set"), _LFsetFontSizeAD, DialogModes.NO);
}
function layer_font_setLeading(size, unitType) {
var _LFsetLeadingAD, ref3, _LFsetLeadingAD2;
if ((unitType === undefined) || (unitType === null)) {
unitType = AppPreferences.typeUnitsStringID()
}
var _LFsetLeadingAD = new ActionDescriptor();
var ref3 = new ActionReference();
ref3.putProperty(s2t("property"), s2t("textStyle"));
ref3.putEnumerated(s2t("textLayer"), s2t("ordinal"), s2t("targetEnum"));
_LFsetLeadingAD.putReference(s2t("null"), ref3);
var _LFsetLeadingAD2 = new ActionDescriptor();
_LFsetLeadingAD2.putInteger(s2t("textOverrideFeatureName"), 808465461);
_LFsetLeadingAD2.putInteger(s2t("typeStyleOperationType"), 3);
_LFsetLeadingAD2.putUnitDouble(s2t("leading"), s2t(unitType), size);
_LFsetLeadingAD.putObject(s2t("to"), s2t("textStyle"), _LFsetLeadingAD2);
executeAction(s2t("set"), _LFsetLeadingAD, DialogModes.NO);
}
function DevHelper() {

}
DevHelper.alert = function () {
var _dialog, _stxt, i, _closeBtn;
var _dialog = new Window("dialog", "alert");
_dialog.spacing = 2;
var _stxt = _dialog.add("statictext");
_stxt.text = "";
for (var i = 0;i < arguments.length; i += 1) {
_stxt.text += (arguments[i] + " ");
}
_dialog.add("statictext", undefined, "  ");
var _closeBtn = _dialog.add("Button { text: '关闭', properties: { name: 'Cancel' }}");
_closeBtn.location = [200, 500];
_closeBtn.size = [200, 30];
_dialog.show();
};
DevHelper.alertObj = function (messageObj) {
DevHelper.alert(JSON.stringify(messageObj));
};
function doc_openPsdAsDuplicate(path, name) {
var actDoc;
app.load(new File(path));
var actDoc = app.activeDocument;
if (!name) {
name = actDoc.name;
}
app.activeDocument.duplicate(name, false);
actDoc.close();
}