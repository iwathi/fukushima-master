import re

# クランプ範囲
MIN_X = 88.0
MAX_X = 912.0
MIN_Y = 40.0
MAX_Y = 960.0

with open("data/miyagi_offices.js", "r", encoding="utf-8") as f:
    content = f.read()

def clamp(match):
    id_ = match.group(1)
    name = match.group(2)
    x = float(match.group(3))
    y = float(match.group(4))
    
    clamped_x = max(MIN_X, min(MAX_X, x))
    clamped_y = max(MIN_Y, min(MAX_Y, y))
    
    if x != clamped_x or y != clamped_y:
        print(f"Clamped {name}: ({x}, {y}) -> ({clamped_x}, {clamped_y})")
        
    return f"{{ id: '{id_}', name: '{name}', x: {clamped_x:.2f}, y: {clamped_y:.2f} }}"

new_content = re.sub(
    r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*x:\s*([\d.-]+),\s*y:\s*([\d.-]+)\s*\}",
    clamp,
    content
)

with open("data/miyagi_offices.js", "w", encoding="utf-8") as f:
    f.write(new_content)
