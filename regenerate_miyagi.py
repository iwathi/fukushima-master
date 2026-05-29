import json
import re

try:
    with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
        geojson = json.load(f)
except:
    print("Could not load miyagi_full.geojson")
    exit(1)

features = geojson['features']

def get_centroid(city_name):
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

x1_g, y1_g = get_centroid('気仙沼市')
x2_g, y2_g = get_centroid('白石市')
x3_g, y3_g = get_centroid('大崎市')

x1_p, y1_p = 872, 214
x2_p, y2_p = 248, 994
x3_p, y3_p = 483, 493

def solve_affine(x1, y1, u1, x2, y2, u2, x3, y3, u3):
    D = x1*(y2 - y3) - y1*(x2 - x3) + (x2*y3 - y2*x3)
    if D == 0: return 1, 0, 0
    A = (u1*(y2 - y3) - y1*(u2 - u3) + (u2*y3 - y2*u3)) / D
    B = (x1*(u2 - u3) - u1*(x2 - x3) + (x2*u3 - u2*x3)) / D
    C = (x1*(y2*u3 - u2*y3) - y1*(x2*u3 - u2*x3) + u1*(x2*y3 - y2*x3)) / D
    return A, B, C

A, B, C = solve_affine(x1_g, y1_g, x1_p, x2_g, y2_g, x2_p, x3_g, y3_g, x3_p)
D, E, F = solve_affine(x1_g, y1_g, y1_p, x2_g, y2_g, y2_p, x3_g, y3_g, y3_p)

svg_paths = []
for f in features:
    props = f['properties']
    city_code = props.get('N03_007', '')
    if not city_code: continue
    
    city_id = f"miyagi_{city_code}"
    
    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    polygons = [coords] if geom_type == 'Polygon' else coords
    
    d_parts = []
    for poly in polygons:
        for ring in poly:
            for i, (lon, lat) in enumerate(ring):
                # SIMPLIFY: Skip 4 out of 5 points to dramatically reduce SVG size!
                if i % 5 != 0 and i != 0 and i != len(ring)-1:
                    continue
                px = A * lon + B * lat + C
                py = D * lon + E * lat + F
                if i == 0:
                    d_parts.append(f"M {px:.1f},{py:.1f}")
                else:
                    d_parts.append(f"L {px:.1f},{py:.1f}")
            d_parts.append("Z")
    
    d = " ".join(d_parts)
    svg_paths.append(f'            <path id="{city_id}" d="{d}" class="map-area" />')

miyagi_svg_block = f"""          <svg id="miyagi-svg" class="fukushima-map real-map" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" style="display: none;">
            <g id="map-group-miyagi">
{chr(10).join(svg_paths)}
            </g>
          </svg>"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

pattern = re.compile(r'<svg id="miyagi-svg".*?</svg>', re.DOTALL)
if pattern.search(html):
    new_html = pattern.sub(miyagi_svg_block, html)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(new_html)
    print("Replaced miyagi-svg with simplified paths.")
else:
    print("Could not find miyagi-svg in index.html.")
