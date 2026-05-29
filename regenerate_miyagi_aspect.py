import json
import re
import math

try:
    with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
        geojson = json.load(f)
except:
    print("Could not load miyagi_full.geojson")
    exit(1)

features = geojson['features']

# Find bounding box
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

# Aspect ratio correction
center_lat = (min_lat + max_lat) / 2
lon_scale = math.cos(math.radians(center_lat))

# Adjusted width and height
width_deg = (max_lon - min_lon) * lon_scale
height_deg = (max_lat - min_lat)

# Map to 1000x1000 bounding box with padding
padding = 50
target_w = 1000 - padding*2
target_h = 1000 - padding*2

scale = min(target_w / width_deg, target_h / height_deg)

# Calculate offsets to center the map
scaled_w = width_deg * scale
scaled_h = height_deg * scale
offset_x = padding + (target_w - scaled_w) / 2
offset_y = padding + (target_h - scaled_h) / 2

svg_paths = []
for f in features:
    props = f['properties']
    city_code = props.get('N03_007', '')
    if not city_code: continue
    
    # Check if city_code already has miyagi_ prefix. If not, add it.
    if city_code.startswith("miyagi_"):
        city_id = city_code
    else:
        city_id = f"miyagi_{city_code}"
    
    geom_type = f['geometry']['type']
    coords = f['geometry']['coordinates']
    polygons = [coords] if geom_type == 'Polygon' else coords
    
    d_parts = []
    for poly in polygons:
        for ring in poly:
            for i, (lon, lat) in enumerate(ring):
                # SIMPLIFY: Skip points to reduce size
                if i % 3 != 0 and i != 0 and i != len(ring)-1:
                    continue
                px = offset_x + ((lon - min_lon) * lon_scale) * scale
                # Y is inverted (latitude increases going north, SVG Y increases going south)
                py = offset_y + (max_lat - lat) * scale
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
    print("Replaced miyagi-svg with correct aspect ratio paths.")
else:
    print("Could not find miyagi-svg in index.html.")
