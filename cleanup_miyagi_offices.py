"""
宮城NTT局データのクリーンアップスクリプト
1. ゴミデータ（電話局の写真館、文字、事）を削除
2. 実在するが地図外の局（耕英・鬼首・文字・湯ノ原・江島）の座標を地図内にクリップ
"""
import re
import json
import math

# ゴミデータとして削除する名前リスト（明らかに局名ではないもの）
GARBAGE_NAMES = {'電話局の写真館', '文字', '事'}

# 新座標系のパラメータを計算
with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson['features']
min_lon, max_lon = 180, -180
min_lat, max_lat = 90, -90
for f in features:
    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    polygons = [coords] if geom_type == 'Polygon' else coords
    for poly in polygons:
        for ring in poly:
            for lon, lat in ring:
                if lon < min_lon: min_lon = lon
                if lon > max_lon: max_lon = lon
                if lat < min_lat: min_lat = lat
                if lat > max_lat: max_lat = lat

center_lat = (min_lat + max_lat) / 2
lon_scale = math.cos(math.radians(center_lat))
width_deg = (max_lon - min_lon) * lon_scale
height_deg = (max_lat - min_lat)
padding = 40
target_w = 1000 - padding * 2
target_h = 1000 - padding * 2
scale = min(target_w / width_deg, target_h / height_deg)
scaled_w = width_deg * scale
scaled_h = height_deg * scale
offset_x = padding + (target_w - scaled_w) / 2
offset_y = padding + (target_h - scaled_h) / 2

# 地図の座標範囲（余裕を持たせる）
SVG_X_MIN = 30
SVG_X_MAX = 990
SVG_Y_MIN = 30
SVG_Y_MAX = 980

with open("data/miyagi_offices.js", "r", encoding="utf-8") as f:
    content = f.read()

# 全エントリを解析
pattern = re.compile(
    r'\{ id: \'(ntt_miyagi_\d+)\', name: \'([^\']+)\', x: ([\d.-]+), y: ([\d.-]+) \}'
)

removed = []
clipped = []
kept = 0


def process_entry(m):
    global kept
    id_ = m.group(1)
    name = m.group(2)
    x = float(m.group(3))
    y = float(m.group(4))

    # ゴミデータを削除
    if name in GARBAGE_NAMES:
        removed.append(name)
        return None  # 削除

    # 範囲外をクリップ
    x_clipped = max(SVG_X_MIN, min(SVG_X_MAX, x))
    y_clipped = max(SVG_Y_MIN, min(SVG_Y_MAX, y))

    if x != x_clipped or y != y_clipped:
        clipped.append(f'{name}: ({x:.1f},{y:.1f}) -> ({x_clipped:.1f},{y_clipped:.1f})')

    kept += 1
    return f"{{ id: '{id_}', name: '{name}', x: {x_clipped:.2f}, y: {y_clipped:.2f} }}"


# エントリを処理
lines = content.split('\n')
new_lines = []
for line in lines:
    m = pattern.search(line)
    if m:
        result = process_entry(m)
        if result is None:
            continue  # ゴミデータ行をスキップ
        # 行の中の元のマッチを置き換え
        new_line = line[:m.start()] + result + line[m.end():]
        # 末尾のカンマが重複しないよう整形
        new_lines.append(new_line)
    else:
        new_lines.append(line)

new_content = '\n'.join(new_lines)

# 末尾の連続するカンマを修正（削除後に ,,が生じる場合）
new_content = re.sub(r',\s*,', ',', new_content)
# 最後のエントリ後の余分なカンマを修正
new_content = re.sub(r',\s*\]', '\n];', new_content)

with open("data/miyagi_offices.js", "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"処理完了！")
print(f"  削除（ゴミデータ）: {len(removed)}件 → {removed}")
print(f"  クリップ（範囲外）: {len(clipped)}件")
for c in clipped:
    print(f"    {c}")
print(f"  残存: {kept}件")
