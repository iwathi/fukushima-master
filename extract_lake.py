import json
import urllib.request
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union

url = "https://raw.githubusercontent.com/dataofjapan/land/master/fukushima.geojson"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.load(response)

polys = []
for feat in data['features']:
    geom = shape(feat['geometry'])
    polys.append(geom)

fukushima = unary_union(polys)

holes = []
if isinstance(fukushima, Polygon):
    for ring in fukushima.interiors:
        holes.append(ring)
elif isinstance(fukushima, MultiPolygon):
    for poly in fukushima.geoms:
        for ring in poly.interiors:
            holes.append(ring)

print(f"Found {len(holes)} holes.")

if holes:
    # Find the largest hole (Lake Inawashiro)
    largest_hole = max(holes, key=lambda ring: Polygon(ring).area)
    lake_poly = Polygon(largest_hole)
    print("Largest hole area:", lake_poly.area)
    
    lake_geojson = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [list(largest_hole.coords)]
        },
        "properties": {"name": "Lake Inawashiro"}
    }
    with open('lake.geojson', 'w') as f:
        json.dump(lake_geojson, f)
    print("Saved lake.geojson")
