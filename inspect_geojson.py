import json
import urllib.request

url = "https://raw.githubusercontent.com/dataofjapan/land/master/fukushima.geojson"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.load(response)

for feat in data['features']:
    props = feat['properties']
    if '猪苗代湖' in str(props.values()):
        print("Found Lake Inawashiro by name:", props)
    # Check if there are features without a city code
    if not props.get('N03_007'):
        print("Found feature without city code:", props)
