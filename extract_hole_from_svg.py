import re
from collections import defaultdict

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

def round_pt(pt):
    return (round(pt[0], 1), round(pt[1], 1))

with open('index.html', 'r') as f:
    html = f.read()

# Find all paths
paths = re.findall(r'<path id="(\d+)" d="(.*?)"', html)
edges = defaultdict(int)
segments = []

for muni_id, d_str in paths:
    pts = parse_svg_path(d_str)
    for i in range(len(pts)):
        p1 = round_pt(pts[i])
        p2 = round_pt(pts[(i+1) % len(pts)])
        if p1 == p2:
            continue
        edge = tuple(sorted((p1, p2)))
        edges[edge] += 1
        segments.append((p1, p2, muni_id))

# Find edges that appear exactly once
boundary_edges = set(e for e, count in edges.items() if count == 1)

# Group boundary edges into contiguous loops
adj = defaultdict(list)
for p1, p2 in boundary_edges:
    adj[p1].append(p2)
    adj[p2].append(p1)

visited = set()
loops = []

for start_node in list(adj.keys()):
    if start_node in visited:
        continue
    
    loop = [start_node]
    visited.add(start_node)
    curr = start_node
    
    while True:
        neighbors = adj[curr]
        next_node = None
        for n in neighbors:
            if n not in visited:
                next_node = n
                break
        
        if next_node is None:
            break
            
        loop.append(next_node)
        visited.add(next_node)
        curr = next_node
        
    loops.append(loop)

print(f"Found {len(loops)} boundary loops.")

# The lake should be one of the smaller loops (the prefecture boundary is the largest)
if loops:
    loops.sort(key=len)
    for i, loop in enumerate(loops):
        print(f"Loop {i}: {len(loop)} points")
        
    # The lake is probably the second largest or something, but wait!
    # Fukushima has no islands (mostly), but there might be tiny gaps.
    # We know the lake is between Aizuwakamatsu(072028), Koriyama(072036), Inawashiro(074080)
    # Let's find which loop has coordinates near x=420, y=290
    
    lake_loop = None
    for loop in loops:
        xs = [p[0] for p in loop]
        ys = [p[1] for p in loop]
        cx = sum(xs) / len(xs)
        cy = sum(ys) / len(ys)
        
        # Check if centroid is near 420, 290
        if 350 < cx < 480 and 220 < cy < 350:
            lake_loop = loop
            print(f"Found lake loop with {len(loop)} points! Centroid: ({cx:.1f}, {cy:.1f})")
            break
            
    if lake_loop:
        path_str = "M " + " L ".join(f"{p[0]},{p[1]}" for p in lake_loop) + " Z"
        with open("lake_path.txt", "w") as out:
            out.write(path_str)
        print("Wrote lake_path.txt")
