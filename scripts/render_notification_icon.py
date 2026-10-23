"""Render assets/notification-icon.png: AppMark as a white-on-transparent silhouette.

Android tints the status-bar icon one color from its alpha channel, so the two
circles would merge into one blob -- a thin gap along the teal circle's edge keeps
them apart, and the star is cut out. Pure Python (no PIL), 4x4 supersampling. Run: python scripts/render_notification_icon.py
"""
import math
import struct
import zlib
from pathlib import Path

SIZE = 96
SS = 4
GAP = 4.0  # logo units (160-unit box)

STAR = [(100,10),(114.5,64.9),(163.6,36.4),(135.1,85.5),(190,100),(135.1,114.5),(163.6,163.6),(114.5,135.1),
        (100,190),(85.5,135.1),(36.4,163.6),(64.9,114.5),(10,100),(64.9,85.5),(36.4,36.4),(85.5,64.9)]
# AppMark: translate(80,80) scale(0.2) translate(-100,-100)
STAR = [(80 + (x - 100) * 0.2, 80 + (y - 100) * 0.2) for x, y in STAR]

# Content spans x 10..150, y 28..132 in logo units; fit the width with a 2px margin.
SCALE = (SIZE - 4) / 140
OX = (SIZE - 140 * SCALE) / 2 - 10 * SCALE
OY = SIZE / 2 - 80 * SCALE


def in_star(x, y):
    inside = False
    n = len(STAR)
    for i in range(n):
        x1, y1 = STAR[i]
        x2, y2 = STAR[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def filled(x, y):
    d_coral = math.hypot(x - 62, y - 80)
    d_teal = math.hypot(x - 98, y - 80)
    if d_coral > 52 and d_teal > 52:
        return False
    if in_star(x, y):
        return False
    # The gap: a band just outside the teal circle's edge, inside the coral one.
    if 52 < d_teal < 52 + GAP and d_coral <= 52:
        return False
    return True


rows = []
for py in range(SIZE):
    row = bytearray([0])
    for px in range(SIZE):
        hits = 0
        for sy in range(SS):
            for sx in range(SS):
                x = (px + (sx + 0.5) / SS - OX) / SCALE
                y = (py + (sy + 0.5) / SS - OY) / SCALE
                hits += filled(x, y)
        row += bytes([255, 255, 255, round(255 * hits / (SS * SS))])
    rows.append(bytes(row))


def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))
open(Path(__file__).resolve().parent.parent / "assets" / "notification-icon.png", "wb").write(png)
print("wrote", len(png), "bytes")
