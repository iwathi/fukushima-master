"""
宮城県市町村SVG再生成スクリプト（テキストラベル付き）
アスペクト比補正と市町村名テキスト付きで生成します
"""
import json
import re
import math

try:
    with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
        geojson = json.load(f)
except Exception as e:
    print(f"miyagi_full.geojsonが読み込めません: {e}")
    exit(1)

features = geojson['features']

# バウンディングボックスを計算
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

# 緯度補正（メルカトル投影の近似）
center_lat = (min_lat + max_lat) / 2
lon_scale = math.cos(math.radians(center_lat))

# 実際の幅・高さ（度単位、補正済み）
width_deg = (max_lon - min_lon) * lon_scale
height_deg = (max_lat - min_lat)

# 1000x1000にマッピング（padding付き）
padding = 40
target_w = 1000 - padding * 2
target_h = 1000 - padding * 2

scale = min(target_w / width_deg, target_h / height_deg)

# 中央揃え
scaled_w = width_deg * scale
scaled_h = height_deg * scale
offset_x = padding + (target_w - scaled_w) / 2
offset_y = padding + (target_h - scaled_h) / 2


def lon_lat_to_svg(lon, lat):
    """経度緯度をSVG座標に変換"""
    px = offset_x + ((lon - min_lon) * lon_scale) * scale
    py = offset_y + (max_lat - lat) * scale  # Y軸反転
    return px, py


# 市町村コードと名前のマッピング
city_names = {}
city_centroids = {}

for f in features:
    props = f['properties']
    city_code = props.get('N03_007', '')
    if not city_code:
        continue
    name = props.get('N03_004', '') or props.get('N03_003', '')
    city_names[city_code] = name

    # 重心を計算
    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    polygons = [coords] if geom_type == 'Polygon' else coords
    pts = []
    for poly in polygons:
        for ring in poly:
            for lon, lat in ring:
                pts.append((lon, lat))
    if pts:
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if city_code not in city_centroids:
            city_centroids[city_code] = (cx, cy)

# SVGパスを生成
svg_paths = []
# ユニークなコードをまとめてパスを生成
processed_codes = {}

for f in features:
    props = f['properties']
    city_code = props.get('N03_007', '')
    if not city_code:
        continue

    city_id = f"miyagi_{city_code}"

    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    polygons = [coords] if geom_type == 'Polygon' else coords

    d_parts = []
    for poly in polygons:
        for ring in poly:
            ring_points = []
            for i, (lon, lat) in enumerate(ring):
                # 間引き（3点に1点使用）
                if i % 3 != 0 and i != 0 and i != len(ring) - 1:
                    continue
                px, py = lon_lat_to_svg(lon, lat)
                ring_points.append(f"{px:.1f},{py:.1f}")
            if ring_points:
                d_parts.append(f"M {ring_points[0]}")
                for pt in ring_points[1:]:
                    d_parts.append(f"L {pt}")
                d_parts.append("Z")

    if d_parts:
        d = " ".join(d_parts)
        if city_id not in processed_codes:
            svg_paths.append(f'            <path id="{city_id}" d="{d}" class="map-area" />')
            processed_codes[city_id] = True

# テキストラベルを生成
svg_texts = []
for city_code, (cx, cy) in city_centroids.items():
    city_id = f"miyagi_{city_code}"
    name = city_names.get(city_code, '')
    if not name:
        continue
    px, py = lon_lat_to_svg(cx, cy)
    font_size = 10
    svg_texts.append(
        f'            <text id="text_{city_id}" x="{px:.1f}" y="{py:.1f}" '
        f'class="map-name-text" font-size="{font_size}">{name}</text>'
    )

all_elements = svg_paths + svg_texts

miyagi_svg_block = f"""          <svg id="miyagi-svg" class="fukushima-map real-map" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" style="display: none;">
            <g id="map-group-miyagi">
{chr(10).join(all_elements)}
            </g>
          </svg>"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

pattern = re.compile(r'<svg id="miyagi-svg".*?</svg>', re.DOTALL)
if pattern.search(html):
    new_html = pattern.sub(miyagi_svg_block, html)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(new_html)
    print(f"宮城SVGを再生成しました（パス: {len(svg_paths)}個, テキスト: {len(svg_texts)}個）")
    print(f"バウンディングボックス: lon={min_lon:.3f}~{max_lon:.3f}, lat={min_lat:.3f}~{max_lat:.3f}")
    print(f"SVGサイズ: {scaled_w:.0f} x {scaled_h:.0f} (offset: {offset_x:.0f}, {offset_y:.0f})")
else:
    print("miyagi-svgが見つかりませんでした。")
