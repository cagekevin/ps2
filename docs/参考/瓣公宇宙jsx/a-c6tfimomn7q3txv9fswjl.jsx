function layer_remove_bg() {
var _0xdea6x2 = sTID(__Oxecc0c[0]);
executeAction(_0xdea6x2, undefined, DialogModes.NO);
}
function layer_shangehua() {
var _0xdea6x4 = sTID(__Oxecc0c[1]);
var _0xdea6x5 = new ActionDescriptor();
var _0xdea6x6 = cTID(__Oxecc0c[2]);
var _0xdea6x7 = new ActionReference();
var _0xdea6x8 = cTID(__Oxecc0c[3]);
var _0xdea6x9 = cTID(__Oxecc0c[4]);
var _0xdea6xa = cTID(__Oxecc0c[5]);
_0xdea6x7[__Oxecc0c[6]](_0xdea6x8, _0xdea6x9, _0xdea6xa);
_0xdea6x5[__Oxecc0c[7]](_0xdea6x6, _0xdea6x7);
executeAction(_0xdea6x4, _0xdea6x5, DialogModes.NO);
}
function getTextSize() {
var _0xdea6xc = new ActionReference();
_0xdea6xc[__Oxecc0c[6]](charIDToTypeID(__Oxecc0c[3]), charIDToTypeID(__Oxecc0c[4]), charIDToTypeID(__Oxecc0c[5]));
var _0xdea6xd = executeActionGet(_0xdea6xc)[__Oxecc0c[9]](stringIDToTypeID(__Oxecc0c[8]));
var _0xdea6xe = _0xdea6xd[__Oxecc0c[14]](stringIDToTypeID(__Oxecc0c[13]))[__Oxecc0c[9]](0)[__Oxecc0c[9]](stringIDToTypeID(__Oxecc0c[12]))[__Oxecc0c[11]](stringIDToTypeID(__Oxecc0c[10]));
if (_0xdea6xd[__Oxecc0c[16]](stringIDToTypeID(__Oxecc0c[15]))) {
var _0xdea6xf = _0xdea6xd[__Oxecc0c[9]](stringIDToTypeID(__Oxecc0c[15]))[__Oxecc0c[18]](stringIDToTypeID(__Oxecc0c[17]));
_0xdea6xe = _0xdea6xe * _0xdea6xf[__Oxecc0c[19]](0);
}
return _0xdea6xe;
}
var __encode = "jsjiami.com";
var _a = {};
var _0xb483 = ["_decode", "http://www.sojson.com/javascriptobfuscator.html"];
function (_0xd642x1) {
_0xd642x1[_0xb483[0]] = _0xb483[1];
}(_a);
var __Oxecc0c = ["removeBackground", "rasterizeLayer", "null", "Lyr ", "Ordn", "Trgt", "putEnumerated", "putReference", "textKey", "getObjectValue", "size", "getDouble", "textStyle", "textStyleRange", "getList", "transform", "hasKey", "yy", "getUnitDoubleValue", "toFixed", "undefined", "log", "删除", "版本号，js会定", "期弹窗，", "还请支持我们的工作", "jsjia", "mi.com"];
function (_0xdea6x10, _0xdea6x11, _0xdea6x12, _0xdea6x13, _0xdea6x14, _0xdea6x15) {
_0xdea6x15 = __Oxecc0c[20];
_0xdea6x13 = function (_0xdea6x16) {
if (typeof alert !== _0xdea6x15) {
alert(_0xdea6x16);
}
if (typeof console !== _0xdea6x15) {
console[__Oxecc0c[21]](_0xdea6x16);
}
};
_0xdea6x12 = function (_0xdea6x17, _0xdea6x10) {
return _0xdea6x17 + _0xdea6x10;
};
_0xdea6x14 = _0xdea6x12(__Oxecc0c[22], _0xdea6x12(_0xdea6x12(__Oxecc0c[23], __Oxecc0c[24]), __Oxecc0c[25]));
try {
_0xdea6x10 = __encode;
if (!(typeof _0xdea6x10 !== _0xdea6x15 && _0xdea6x10 === _0xdea6x12(__Oxecc0c[26], __Oxecc0c[27]))) {
_0xdea6x13(_0xdea6x14);
}
} catch (e) {
_0xdea6x13(_0xdea6x14);
}
}({});