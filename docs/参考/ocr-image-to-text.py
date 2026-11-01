#!/usr/bin/env python3
"""
OCR 图片文字识别 — 基于 RapidOCR。

功能：
  1. 通用模式：提取纯文本（默认）
  2. 海报排版模式：提取文字+坐标+字号，输出 JSON（供 PS 调用）

依赖：
  pip install rapidocr_onnxruntime Pillow

用法：
  通用模式：
    python ocr-image-to-text.py <图片文件或目录>
    python ocr-image-to-text.py -o 输出文件 <图片文件或目录>

  海报排版模式（兼容 PS 调用）：
    python ocr-image-to-text.py <图片路径> <输出JSON路径>

示例：
  python ocr-image-to-text.py screenshot.png
  python ocr-image-to-text.py scan.jpg -o result.md
  python ocr-image-to-text.py 图片目录/
  python ocr-image-to-text.py poster.jpg layout_data.json   # 海报模式
"""

import json
import math
import os
import sys
import argparse
from pathlib import Path

from rapidocr_onnxruntime import RapidOCR
from PIL import Image


SUPPORTED_EXTS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp', '.gif'}


# ═══════════════════════════════════════════════════
# 海报排版模式专用功能（从 poster_parser 移植）
# ═══════════════════════════════════════════════════

def merge_text_blocks(blocks, y_tolerance_ratio=1.5, x_tolerance=20):
    """智能段落合并：将视觉上相邻的单行文本合并为多行段落"""
    if not blocks:
        return []

    blocks.sort(key=lambda b: b['rect']['top'])

    merged = []
    current_group = blocks[0]

    for next_block in blocks[1:]:
        vertical_gap = next_block['rect']['top'] - (current_group['rect']['top'] + current_group['rect']['height'])
        x_aligned = abs(current_group['rect']['left'] - next_block['rect']['left']) < x_tolerance

        if vertical_gap < (current_group['inferred_font_size'] * y_tolerance_ratio) and x_aligned:
            current_group['content'] += "\r" + next_block['content']
            new_left = min(current_group['rect']['left'], next_block['rect']['left'])
            new_top = current_group['rect']['top']
            new_right = max(current_group['rect']['left'] + current_group['rect']['width'],
                            next_block['rect']['left'] + next_block['rect']['width'])
            new_bottom = next_block['rect']['top'] + next_block['rect']['height']
            current_group['rect']['left'] = new_left
            current_group['rect']['top'] = new_top
            current_group['rect']['width'] = new_right - new_left
            current_group['rect']['height'] = new_bottom - new_top
        else:
            merged.append(current_group)
            current_group = next_block

    merged.append(current_group)
    return merged


def parse_image_to_json(image_path: str, output_json_path: str, engine: RapidOCR):
    """解析图片为带坐标的 JSON 结构"""
    with Image.open(image_path) as img:
        img_width, img_height = img.size

    result, elapse = engine(image_path)

    raw_blocks = []
    if result:
        for item in result:
            dt_boxes, text_content = item[0], item[1]
            x_coords = [p[0] for p in dt_boxes]
            y_coords = [p[1] for p in dt_boxes]

            left, top = int(min(x_coords)), int(min(y_coords))
            width, height = int(max(x_coords) - left), int(max(y_coords) - top)

            char_count = max(len(text_content.replace(" ", "")), 1)
            estimated_size_by_width = width / char_count
            estimated_size_by_height = height

            inferred_font_size = int((estimated_size_by_width * 0.7 + estimated_size_by_height * 0.3))
            inferred_font_size = max(math.ceil(inferred_font_size / 2) * 2, 12)

            raw_blocks.append({
                "type": "text",
                "content": text_content,
                "rect": {"left": left, "top": top, "width": width, "height": height},
                "inferred_font_size": inferred_font_size
            })
            print(f"✅ 提取文本: [{text_content}] (字号约 {inferred_font_size}px)")

    merged_blocks = merge_text_blocks(raw_blocks)

    output_data = {
        "image_size": {"width": img_width, "height": img_height},
        "blocks": merged_blocks
    }

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"🎉 解析完成！原始 {len(raw_blocks)} 个块 → 合并后 {len(merged_blocks)} 个段落。")
    print(f"💾 数据已保存至: {output_json_path}\n耗时: {elapse[0] if elapse else 0:.2f} 秒")

    return output_json_path


# ═══════════════════════════════════════════════════
# 通用模式功能
# ═══════════════════════════════════════════════════

def ocr_file(filepath: str, engine: RapidOCR) -> str:
    """对单张图片执行 OCR，返回纯文本"""
    result, _ = engine(filepath)
    if not result:
        return ""

    lines = []
    for item in result:
        text_content = item[1]
        if text_content.strip():
            lines.append(text_content.strip())
    return "\n".join(lines)


# ═══════════════════════════════════════════════════
# 入口
# ═══════════════════════════════════════════════════

def main():
    # 判断模式：如果第 2 个参数是 JSON 路径（非 -o/-l 开头），走海报排版模式
    if len(sys.argv) >= 3 and not sys.argv[2].startswith('-'):
        # 海报排版模式（兼容 PS 调用）
        image_path = sys.argv[1]
        output_json = sys.argv[2]
        if not os.path.exists(image_path):
            print(f"❌ 找不到图片: {image_path}", file=sys.stderr)
            sys.exit(1)
        engine = RapidOCR()
        parse_image_to_json(image_path, output_json, engine)
        return

    # 通用模式（纯文本）
    parser = argparse.ArgumentParser(description='OCR 图片文字识别')
    parser.add_argument('input', help='图片文件或目录路径')
    parser.add_argument('-o', '--output', help='输出文件（默认直接打印到终端）')
    parser.add_argument('-l', '--lang', default='chi_sim+eng',
                        help='OCR 语言（默认 chi_sim+eng，纯英文可设为 eng，RapidOCR 原生自动检测）')
    args = parser.parse_args()

    engine = RapidOCR()
    input_path = args.input

    if os.path.isdir(input_path):
        files = sorted(
            f for f in os.listdir(input_path)
            if os.path.splitext(f)[1].lower() in SUPPORTED_EXTS
        )
        if not files:
            print(f"目录 {input_path} 中没有找到图片文件", file=sys.stderr)
            sys.exit(1)
        results = {}
        for f in files:
            full = os.path.join(input_path, f)
            print(f"正在识别：{f} ...", file=sys.stderr)
            try:
                results[f] = ocr_file(full, engine)
            except Exception as e:
                results[f] = f"[错误] {e}"
    elif os.path.isfile(input_path):
        ext = os.path.splitext(input_path)[1].lower()
        if ext not in SUPPORTED_EXTS:
            print(f"不支持的文件格式：{ext}，支持：{', '.join(sorted(SUPPORTED_EXTS))}", file=sys.stderr)
            sys.exit(1)
        print(f"正在识别：{os.path.basename(input_path)} ...", file=sys.stderr)
        try:
            text = ocr_file(input_path, engine)
        except Exception as e:
            print(f"识别失败：{e}", file=sys.stderr)
            sys.exit(1)

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"已保存到 {args.output}")
        else:
            print(text)
        return
    else:
        print(f"路径不存在：{input_path}", file=sys.stderr)
        sys.exit(1)

    # 批量打印结果
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            for fname, text in results.items():
                f.write(f"--- {fname} ---\n{text}\n\n")
        print(f"已保存到 {args.output}")
    else:
        for fname, text in results.items():
            print(f"=== {fname} ===")
            print(text)
            print()


if __name__ == '__main__':
    main()
