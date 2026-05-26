import json
import urllib.request
import re

url = "https://raw.githubusercontent.com/dataofjapan/land/master/fukushima.geojson"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    geojson = json.loads(response.read().decode())

geo_dict = {}
for f in geojson['features']:
    props = f['properties']
    geo_dict[props['ward_ja']] = props['code'][:5]

js_path = "/Users/hiroki/Documents/Gemini/fukushima-master/data/municipalities.js"
with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

match = re.search(r'const municipalitiesData = (\[.*?\]);', js_content, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    mismatches = []
    for item in data:
        name = item['name']
        js_id = item['id']
        if name in geo_dict:
            geo_id = geo_dict[name]
            if js_id != geo_id:
                mismatches.append(f"{name}: JS={js_id}, Geo={geo_id}")
                item['id'] = geo_id
        else:
            mismatches.append(f"NOT FOUND IN GEOJSON: {name}")
    
    print("Mismatches found and fixed:")
    for m in mismatches:
        print(m)
        
    new_js = "const municipalitiesData = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(new_js)
