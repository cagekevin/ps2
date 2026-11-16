# -*- coding: utf-8 -*-
"""一键抠图推理脚本：图层图进，透明 PNG 出（原尺寸）。

用法: python cut.py <in.png> <out.png> <model.onnx>

退出码 0 = 成功；非 0 = 失败，stderr 写原因（Node 侧原样进 detail）。

**为什么是独立进程而不是常驻服务**：`docs/plan/21` 裁定 1 —— 每次 spawn 一次，
进程退出后模型内存立刻还给系统。168MB 的模型常驻会把 PS 的内存一起拖下去。

**为什么出透明图**：结果是原尺寸的 RGBA，交给 jsx 侧按 `left`/`top` 放回原层位置
（`mm_placePngIntoDoc`，与 DLSS 导回同一个函数）。尺寸与原层一致，所以对齐只需要一个平移。

**前处理 / 后处理照鲜艺逆向结果，三处都不能改**（依据见 `docs/plan/21` §5）：
1. 直接 squash 到模型输入尺寸（`Image.resize`），**不做 letterbox** ——
   鲜艺 `src\\rmbg.rs` 的错误串写的是「resized to incorrect size / Incorrect target image width」，
   即显式 resize 到 target 尺寸；灰底留边会让模型把留边当背景、边缘发灰。
2. 归一化 `x/255 - 0.5`（mean 0.5 / std 1.0），**不是 ImageNet 的 0.485/0.229** ——
   鲜艺 exe 常量池是 `255.0, 0.5, 1.0, 0.0` 四个 float32，且全文件扫不到任何 ImageNet 参数；
   用错整张掩码会系统性偏亮或偏暗。
3. 输出做 min-max 归一 —— 不做的话半透明边缘（玻璃、发丝）会糊成一片灰。
   实测：同图按 alpha bbox 裁切 549x352 vs 鲜艺 548x351，alpha 平均绝对差 1.06/255。
"""

import sys

import numpy as np
from PIL import Image


def fail(message):
    """统一失败出口：stderr + 退出码 1（Node 侧把 stderr 原样进 detail）"""
    sys.stderr.write(str(message) + "\n")
    sys.exit(1)


def load_session(model_path):
    try:
        import onnxruntime as ort
    except ImportError:
        fail("ModuleNotFoundError: onnxruntime（按 requirements.txt 安装）")
    try:
        return ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    except Exception as error:  # 模型损坏 / 版本不匹配都会在这里炸
        fail("onnxruntime 加载模型失败: " + str(error))


def preprocess(image, width, height):
    """原图 → 模型输入：直接拉伸到模型尺寸，再 /255 - 0.5"""
    resized = image.convert("RGB").resize((width, height), Image.BILINEAR)
    data = np.asarray(resized, dtype=np.float32) / 255.0
    data = data - 0.5
    # HWC → NCHW，onnxruntime 只吃 NCHW
    return data.transpose(2, 0, 1)[None, ...]


def main(argv):
    if len(argv) != 4:
        fail("用法: python cut.py <in.png> <out.png> <model.onnx>")

    in_path, out_path, model_path = argv[1], argv[2], argv[3]

    session = load_session(model_path)
    inputs = session.get_inputs()
    if not inputs:
        fail("模型没有输入节点")

    # 输入尺寸从模型读，不写死 1024（换模型时这里不用改）
    shape = inputs[0].shape
    height = shape[2] if isinstance(shape[2], int) else 1024
    width = shape[3] if isinstance(shape[3], int) else 1024

    try:
        source = Image.open(in_path)
    except Exception as error:
        fail("读不了输入图: " + str(error))

    original_size = source.size
    tensor = preprocess(source, width, height)

    try:
        outputs = session.run(None, {inputs[0].name: tensor})
    except Exception as error:
        fail("推理失败: " + str(error))

    # 输出是 [1, 1, H, W] 的 0–1 掩码（有的模型直接给 0–255，按最大值判一次）
    mask = np.asarray(outputs[0]).squeeze()
    if mask.ndim != 2:
        fail("模型输出形状不认识: " + str(np.asarray(outputs[0]).shape))
    if mask.max() > 1.5:
        mask = mask / 255.0

    # 掩码在模型尺寸上算的：先缩回原图尺寸，再做 min-max（顺序照鲜艺逆向结果）
    alpha = Image.fromarray(mask.astype(np.float32)).resize(original_size, Image.BILINEAR)
    values = np.asarray(alpha, dtype=np.float32)
    low = float(values.min())
    high = float(values.max())
    if high > low:
        values = (values - low) / (high - low)
    values = np.clip(values, 0.0, 1.0)

    # 原层自带的 alpha 乘进去：模型不知道原层哪里本来就是透明的
    source_alpha = np.asarray(source.convert("RGBA").getchannel("A"), dtype=np.float32) / 255.0
    values = values * source_alpha

    result = source.convert("RGBA")
    result.putalpha(Image.fromarray((values * 255.0).astype(np.uint8)))
    try:
        result.save(out_path, "PNG")
    except Exception as error:
        fail("写不了结果图: " + str(error))


if __name__ == "__main__":
    main(sys.argv)
