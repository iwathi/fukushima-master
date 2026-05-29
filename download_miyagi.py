import urllib.request
import json
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# List of city codes for Miyagi
# Wait, I can get the list from the repo api, but to be safe, I can just download 04101 to 04999 and skip 404s
# Better yet, I can just fetch the github API list.
req = urllib.request.Request("https://api.github.com/repos/niiyz/JapanCityGeoJson/contents/geojson/04")
with urllib.request.urlopen(req, context=ctx) as response:
    contents = json.loads(response.read().decode())

features = []
for item in contents:
    if item['name'].endswith('.json'):
        url = item['download_url']
        print(f"Downloading {item['name']}...")
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, context=ctx) as r:
                data = json.loads(r.read().decode())
                # Some files might be FeatureCollection, some might be Feature
                if data['type'] == 'FeatureCollection':
                    features.extend(data['features'])
                elif data['type'] == 'Feature':
                    features.append(data)
        except Exception as e:
            print(f"Error downloading {item['name']}: {e}")
        time.sleep(0.1)

merged = {
    "type": "FeatureCollection",
    "features": features
}

with open("miyagi_full.geojson", "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False)

print(f"Merged {len(features)} features into miyagi_full.geojson")
