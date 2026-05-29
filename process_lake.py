import json
import re
import urllib.request

# Read OSM data
with open("lake.json", "r") as f:
    osm_data = json.load(f)

coords = []
if osm_data.get('elements'):
    for element in osm_data['elements']:
        if element['type'] == 'relation':
            for member in element['members']:
                if member['type'] == 'way':
                    for node in member['geometry']:
                        coords.append((node['lon'], node['lat']))
            break

if not coords:
    print("No coordinates found for Lake Inawashiro")
    exit(1)

print(f"Got {len(coords)} coordinates from OSM")

# Need affine transform
url_geojson = "https://raw.githubusercontent.com/dataofjapan/land/master/fukushima.geojson"
req_geojson = urllib.request.Request(url_geojson, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_geojson) as response:
    geojson_data = json.load(response)

centroids = {}
for feat in geojson_data['features']:
    props = feat['properties']
    name = props['ward_ja']
    if name in ['福島市', '白河市', 'いわき市']:
        geom = feat['geometry']['coordinates']
        if feat['geometry']['type'] == 'Polygon':
            pts = geom[0]
        else:
            pts = geom[0][0]
        lons = [p[0] for p in pts]
        lats = [p[1] for p in pts]
        centroids[name] = (sum(lons)/len(lons), sum(lats)/len(lats))

def parse_svg_path(d_string):
    pts = []
    tokens = re.findall(r'[MLZmlz\s]+|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?', d_string)
    x, y = 0, 0
    i = 0
    while i < len(tokens):
        tok = tokens[i].strip()
        if not tok:
            i += 1
            continue
        if tok in ['M', 'L']:
            x = float(tokens[i+1])
            y = float(tokens[i+2])
            pts.append((x, y))
            i += 3
        elif tok in ['m', 'l']:
            x += float(tokens[i+1])
            y += float(tokens[i+2])
            pts.append((x, y))
            i += 3
        elif tok in ['Z', 'z']:
            i += 1
        else:
            i += 1
    return pts

svg_centroids = {}
with open('index.html', 'r') as f:
    html = f.read()

city_codes = {'福島市': '07201', '白河市': '07205', 'いわき市': '07204'}
for city, code in city_codes.items():
    match = re.search(r'id="' + code + '".*?d="(.*?)"', html, re.DOTALL)
    if match:
        pts = parse_svg_path(match.group(1))
        if pts:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            svg_centroids[city] = (sum(xs)/len(xs), sum(ys)/len(ys))

p1 = centroids['福島市']; P1 = svg_centroids['福島市']
p2 = centroids['白河市']; P2 = svg_centroids['白河市']
p3 = centroids['いわき市']; P3 = svg_centroids['いわき市']

x1, y1 = p1; X1, Y1 = P1
x2, y2 = p2; X2, Y2 = P2
x3, y3 = p3; X3, Y3 = P3

den = x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2)

a = (X1*(y2 - y3) + X2*(y3 - y1) + X3*(y1 - y2)) / den
b = (X1*(x3 - x2) + X2*(x1 - x3) + X3*(x2 - x1)) / den
c = (X1*(x2*y3 - x3*y2) + X2*(x3*y1 - x1*y3) + X3*(x1*y2 - x2*y1)) / den
d = (Y1*(y2 - y3) + Y2*(y3 - y1) + Y3*(y1 - y2)) / den
e = (Y1*(x3 - x2) + Y2*(x1 - x3) + Y3*(x2 - x1)) / den
f = (Y1*(x2*y3 - x3*y2) + Y2*(x3*y1 - x1*y3) + Y3*(x1*y2 - x2*y1)) / den

def transform(lon, lat):
    return a*lon + b*lat + c, d*lon + e*lat + f

# Simplify coordinates (Douglas-Peucker is ideal, but for now just skip close points)
svg_coords = []
last_x, last_y = None, None
for lon, lat in coords:
    sx, sy = transform(lon, lat)
    # Basic simplification to reduce path size
    if last_x is None or abs(sx - last_x) > 0.5 or abs(sy - last_y) > 0.5:
        svg_coords.append((sx, sy))
        last_x, last_y = sx, sy

path_d = "M " + " L ".join([f"{x:.1f},{y:.1f}" for x, y in svg_coords]) + " Z"
with open("lake_svg.txt", "w") as out:
    out.write(path_d)
print(f"Wrote lake_svg.txt with {len(svg_coords)} points")
