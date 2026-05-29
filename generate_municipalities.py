import json

with open("miyagi_full.geojson", "r", encoding="utf-8") as f:
    geojson = json.load(f)

cities = []
for f in geojson['features']:
    props = f['properties']
    city_code = props.get('N03_007', '')
    city_name = props.get('N03_004', '') or props.get('N03_003', '')
    if city_code and city_name:
        cities.append(f"  {{ id: 'miyagi_{city_code}', name: '{city_name}', kana: '{city_name}', area: '宮城県', features: ['宮城県の自治体です', '詳細なデータは準備中です'] }}")

js_content = "const miyagiMunicipalities = [\n" + ",\n".join(cities) + "\n];\n"
with open("data/miyagi_municipalities.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Generated {len(cities)} municipalities.")
