"""
宮城NTT局座標補正スクリプト
旧アフィン変換座標系から新座標系（アスペクト比補正済み）に変換します
"""
import json
import re
import math

# === 旧アフィン変換のパラメータを復元 ===
with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson['features']

def get_centroid(city_name):
    """指定した市名の重心を計算"""
    for f in features:
        props = f['properties']
        if props.get('N03_004', '') == city_name or props.get('N03_003', '') == city_name:
            geom_type = f['geometry']['type']
            coords = f['geometry']['coordinates']
            polygons = [coords] if geom_type == 'Polygon' else coords
            pts = []
            for poly in polygons:
                for ring in poly:
                    for lon, lat in ring:
                        pts.append((lon, lat))
            return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    return 0, 0

# 旧アフィン変換のコントロールポイント（regenerate_miyagi.py より）
x1_g, y1_g = get_centroid('気仙沼市')
x2_g, y2_g = get_centroid('白石市')
x3_g, y3_g = get_centroid('大崎市')

x1_p, y1_p = 872, 214
x2_p, y2_p = 248, 994
x3_p, y3_p = 483, 493


def solve_affine(x1, y1, u1, x2, y2, u2, x3, y3, u3):
    """3点から2Dアフィン変換係数を求める"""
    D = x1*(y2 - y3) - y1*(x2 - x3) + (x2*y3 - y2*x3)
    if D == 0: return 1, 0, 0
    A = (u1*(y2 - y3) - y1*(u2 - u3) + (u2*y3 - y2*u3)) / D
    B = (x1*(u2 - u3) - u1*(x2 - x3) + (x2*u3 - u2*x3)) / D
    C = (x1*(y2*u3 - u2*y3) - y1*(x2*u3 - u2*x3) + u1*(x2*y3 - y2*x3)) / D
    return A, B, C


# 旧アフィン変換: (lon, lat) -> (px, py)
A, B, C = solve_affine(x1_g, y1_g, x1_p, x2_g, y2_g, x2_p, x3_g, y3_g, x3_p)
D_c, E, F = solve_affine(x1_g, y1_g, y1_p, x2_g, y2_g, y2_p, x3_g, y3_g, y3_p)

# 旧変換の逆行列を計算: (px, py) -> (lon, lat)
# px = A*lon + B*lat + C  =>  A*lon + B*lat = px - C
# py = D*lon + E*lat + F  =>  D*lon + E*lat = py - F
det = A * E - B * D_c
inv_A = E / det
inv_B = -B / det
inv_D = -D_c / det
inv_E = A / det
inv_C = -(inv_A * C + inv_B * F)
inv_F = -(inv_D * C + inv_E * F)


def old_svg_to_lonlat(px, py):
    """旧SVG座標 -> 経度緯度"""
    lon = inv_A * px + inv_B * py + inv_C
    lat = inv_D * px + inv_E * py + inv_F
    return lon, lat


# === 新座標系のパラメータ（regenerate_miyagi_with_labels.py と同じ）===
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


def lonlat_to_new_svg(lon, lat):
    """経度緯度 -> 新SVG座標"""
    px = offset_x + ((lon - min_lon) * lon_scale) * scale
    py = offset_y + (max_lat - lat) * scale
    return px, py


# === miyagi_offices.js を読み込んで座標を変換 ===
with open("data/miyagi_offices.js", "r", encoding="utf-8") as f:
    content = f.read()

# 各エントリの x, y を正規表現で抽出・変換
def replace_coords(m):
    x_old = float(m.group(1))
    y_old = float(m.group(2))
    lon, lat = old_svg_to_lonlat(x_old, y_old)
    x_new, y_new = lonlat_to_new_svg(lon, lat)
    return f"x: {x_new:.2f}, y: {y_new:.2f}"


new_content = re.sub(r'x:\s*([\d.]+),\s*y:\s*([\d.]+)', replace_coords, content)

with open("data/miyagi_offices.js", "w", encoding="utf-8") as f:
    f.write(new_content)

print("miyagi_offices.js の座標補正が完了しました！")

# 検証：気仙沼市中心局を旧→新変換してみる
# 気仙沼市の旧SVG重心: (872, 214) → 新SVG重心: (879.7, 148.7)
lon_test, lat_test = old_svg_to_lonlat(872, 214)
px_test, py_test = lonlat_to_new_svg(lon_test, lat_test)
print(f"\n検証: 旧(872, 214) -> 経緯({lon_test:.3f}, {lat_test:.3f}) -> 新({px_test:.1f}, {py_test:.1f})")
print(f"気仙沼市SVGテキスト座標: (879.6, 148.4) と近いことを確認")
