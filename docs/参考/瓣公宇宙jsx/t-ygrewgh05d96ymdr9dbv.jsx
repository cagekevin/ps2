function doesIdExists(_0x672dx4) {
var _0x672dx5 = true;
var _0x672dx6 = new ActionReference();
_0x672dx6[__Oxecc0d[3]](charIDToTypeID(__Oxecc0d[2]), _0x672dx4);
try {
var _0x672dx7 = executeActionGet(_0x672dx6);
} catch (err) {
_0x672dx5 = false;
}
return _0x672dx5;
}
function multiSelectByIDs(_0x672dx9) {
if (_0x672dx9[__Oxecc0d[4]] != Array) {
_0x672dx9 = [_0x672dx9];
}
var _0x672dxa = new Array();
var _0x672dxb = charIDToTypeID(__Oxecc0d[5]);
var _0x672dxc = new ActionDescriptor();
var _0x672dxd = charIDToTypeID(__Oxecc0d[6]);
var _0x672dxe = new ActionReference();
for (var _0x672dxf = 0;_0x672dxf < _0x672dx9[__Oxecc0d[7]]; _0x672dxf += 1) {
if (doesIdExists(_0x672dx9[_0x672dxf]) == true) {
_0x672dxa[_0x672dxf] = charIDToTypeID(__Oxecc0d[2]);
_0x672dxe[__Oxecc0d[3]](_0x672dxa[_0x672dxf], _0x672dx9[_0x672dxf]);
}
}
_0x672dxc[__Oxecc0d[8]](_0x672dxd, _0x672dxe);
var _0x672dx10 = charIDToTypeID(__Oxecc0d[9]);
_0x672dxc[__Oxecc0d[10]](_0x672dx10, false);
executeAction(_0x672dxb, _0x672dxc, DialogModes.NO);
}
function start_piliang_select_layers(_0x672dx12) {
var _0x672dx13 = new Array();
var _0x672dxa = app[__Oxecc0d[0]][__Oxecc0d[11]];
for (var _0x672dx14 = 0;_0x672dx14 < _0x672dxa[__Oxecc0d[7]]; _0x672dx14 += 1) {
if (_0x672dxa[_0x672dx14][__Oxecc0d[12]] == false && _0x672dxa[_0x672dx14][__Oxecc0d[13]] != LayerKind[__Oxecc0d[14]] && _0x672dxa[_0x672dx14][__Oxecc0d[15]] == false && _0x672dxa[_0x672dx14][__Oxecc0d[16]][2] >= 10 || _0x672dxa[_0x672dx14][__Oxecc0d[16]][3] >= 10) {
_0x672dx13[__Oxecc0d[18]](_0x672dxa[_0x672dx14][__Oxecc0d[17]]);
}
}
multiSelectByIDs(_0x672dx13);
return _0x672dx13;
}
var __encode = "jsjiami.com";
var _a = {};
var _0xb483 = ["_decode", "http://www.sojson.com/javascriptobfuscator.html"];
function (_0xd642x1) {
_0xd642x1[_0xb483[0]] = _0xb483[1];
}(_a);
var __Oxecc0d = ["activeDocument", "activeLayer", "Lyr ", "putIdentifier", "constructor", "slct", "null", "length", "putReference", "MkVs", "putBoolean", "layers", "positionLocked", "kind", "TEXT", "isBackgroundLayer", "bounds", "id", "push", "undefined", "log", "删除", "版本号，js会定", "期弹窗，", "还请支持我们的工作", "jsjia", "mi.com"];
var actDoc = app[__Oxecc0d[0]];
var actLayer = actDoc[__Oxecc0d[1]];
function (_0x672dx15, _0x672dx16, _0x672dx17, _0x672dx18, _0x672dx19, _0x672dx14) {
_0x672dx14 = __Oxecc0d[19];
_0x672dx18 = function (_0x672dx1a) {
if (typeof alert !== _0x672dx14) {
alert(_0x672dx1a);
}
if (typeof console !== _0x672dx14) {
console[__Oxecc0d[20]](_0x672dx1a);
}
};
_0x672dx17 = function (_0x672dx1b, _0x672dx15) {
return _0x672dx1b + _0x672dx15;
};
_0x672dx19 = _0x672dx17(__Oxecc0d[21], _0x672dx17(_0x672dx17(__Oxecc0d[22], __Oxecc0d[23]), __Oxecc0d[24]));
try {
_0x672dx15 = __encode;
if (!(typeof _0x672dx15 !== _0x672dx14 && _0x672dx15 === _0x672dx17(__Oxecc0d[25], __Oxecc0d[26]))) {
_0x672dx18(_0x672dx19);
}
} catch (e) {
_0x672dx18(_0x672dx19);
}
}({});