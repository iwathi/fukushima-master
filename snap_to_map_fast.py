import json
import math
import re
from shapely.geometry import Polygon, Point
from shapely.geometry import shape

# 1. 地図の投影パラメータを再計算
with open('miyagi_full.geojson', 'r') as f:
    geojson = json.load(f)

min_lon, max_lon = 180, -180
min_lat, max_lat = 90, -90
for f in geojson['features']:
    geom = shape(f['geometry'])
    bounds = geom.bounds
    min_lon = min(min_lon, bounds[0])
    min_lat = min(min_lat, bounds[1])
    max_lon = max(max_lon, bounds[2])
    max_lat = max(max_lat, bounds[3])

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

def lonlat_to_svg(lon, lat):
    x = offset_x + (lon - min_lon) * lon_scale * scale
    y = offset_y + (max_lat - lat) * scale
    return x, y

# 2. 宮城県のSVG座標系ポリゴンを作成 (リストとして保持)
polygons = []
for f in geojson['features']:
    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    
    if geom_type == 'Polygon':
        for ring in coords:
            poly_coords = [lonlat_to_svg(lon, lat) for lon, lat in ring]
            poly = Polygon(poly_coords)
            if not poly.is_valid: poly = poly.buffer(0)
            polygons.append(poly)
    elif geom_type == 'MultiPolygon':
        for poly_item in coords:
            for ring in poly_item:
                poly_coords = [lonlat_to_svg(lon, lat) for lon, lat in ring]
                poly = Polygon(poly_coords)
                if not poly.is_valid: poly = poly.buffer(0)
                polygons.append(poly)

# 3. NTT局データを読み込み、外側の点をスナップ
with open('data/miyagi_offices.js', 'r', encoding='utf-8') as f:
    content = f.read()

def snap_point(match):
    id_ = match.group(1)
    name = match.group(2)
    x = float(match.group(3))
    y = float(match.group(4))
    
    pt = Point(x, y)
    
    is_inside = False
    for poly in polygons:
        # buffer(2.0)で境界ギリギリも内側とみなす
        if poly.contains(pt) or poly.buffer(2.0).contains(pt):
            is_inside = True
            break
            
    if not is_inside:
        from shapely.ops import nearest_points
        # 最も近いポリゴンを見つける
        min_dist = float('inf')
        closest_poly = None
        for poly in polygons:
            dist = poly.distance(pt)
            if dist < min_dist:
                min_dist = dist
                closest_poly = poly
        
        if closest_poly:
            nearest_pt, _ = nearest_points(closest_poly, pt)
            
            # 重心に向けて少し内側に引っ張る
            centroid = closest_poly.centroid
            dx = centroid.x - nearest_pt.x
            dy = centroid.y - nearest_pt.y
            dist = math.sqrt(dx*dx + dy*dy)
            if dist > 0:
                pull = 3.0 # 3px内側に
                new_x = nearest_pt.x + (dx/dist) * pull
                new_y = nearest_pt.y + (dy/dist) * pull
            else:
                new_x = nearest_pt.x
                new_y = nearest_pt.y
                
            print(f"スナップ: {name} ({x:.1f}, {y:.1f}) -> ({new_x:.1f}, {new_y:.1f})")
            return f"{{ id: '{id_}', name: '{name}', x: {new_x:.2f}, y: {new_y:.2f} }}"
    
    return match.group(0)

new_content = re.sub(
    r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*x:\s*([\d.-]+),\s*y:\s*([\d.-]+)\s*\}",
    snap_point,
    content
)

with open('data/miyagi_offices.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("処理完了しました。")
