"""Download the CC0 Mars-surface assets used by the EVA visor scene.

Everything here is fetched from the public Poly Haven API (CC0, no account) so
the repository keeps a reproducible record of where the geometry and textures
came from. Run only when refreshing the assets:

    python apps/crew-tablet/scripts/fetch-mars-assets.py

Outputs into apps/crew-tablet/public/assets/mars/:
    ground/{cracked_red_ground_diff_1k.jpg,nor_gl,arm}
    rocks/<asset>/<asset>_1k.gltf + .bin + textures/
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "mars"
API = "https://api.polyhaven.com/files/"
UA = {"User-Agent": "LIGHTMINUTE-asset-fetch/1.0 (NASA Space Apps demo)"}

ROCKS = ["moon_rock_01", "moon_rock_04", "rock_07", "namaqualand_boulder_02"]
GROUND = ["Diffuse", "nor_gl", "arm"]
GROUND_ID = "cracked_red_ground"

# Lunar surface: NASA Apollo 11 mosaic + a greyed Poly Haven ground.
MOON_OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "moon"
APOLLO = (
    "https://commons.wikimedia.org/wiki/Special:FilePath/"
    "Apollo_11_Tranquility_Base_panoramic_%28JSC2007-E-045375%29.jpg"
)
MOON_GROUND_ID = "rocky_terrain"


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request) as response:  # noqa: S310 - fixed https API host
        return json.loads(response.read().decode("utf-8"))


def download(url: str, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request) as response:  # noqa: S310 - fixed https host
        data = response.read()
    dest.write_bytes(data)
    return len(data)


def fetch_ground() -> None:
    files = get_json(API + GROUND_ID)
    total = 0
    for slot in GROUND:
        entry = files[slot]["1k"]["jpg"]
        name = entry["url"].rsplit("/", 1)[-1]
        total += download(entry["url"], OUT / "ground" / name)
    print(f"ground {GROUND_ID}: {total // 1024} KB")


def fetch_rock(asset: str) -> None:
    files = get_json(API + asset)
    gltf = files["gltf"]["1k"]["gltf"]
    root = OUT / "rocks" / asset
    total = download(gltf["url"], root / gltf["url"].rsplit("/", 1)[-1])
    for relative, entry in gltf.get("include", {}).items():
        total += download(entry["url"], root / relative)
    print(f"rock {asset}: {total // 1024} KB")


def fetch_moon() -> None:
    """Apollo 11 mosaic (public domain) plus its Poly Haven ground."""
    files = get_json(API + MOON_GROUND_ID)
    total = 0
    for slot in ("Diffuse", "nor_gl"):
        entry = files[slot]["1k"]["jpg"]
        name = entry["url"].rsplit("/", 1)[-1]
        total += download(entry["url"], MOON_OUT / "ground" / name)
    print(f"moon ground {MOON_GROUND_ID}: {total // 1024} KB")

    # The original mosaic is 32 454 px wide; 8 192 keeps detail without the 17 MB.
    raw = MOON_OUT / "apollo11-original.jpg"
    download(APOLLO, raw)
    try:
        from PIL import Image

        image = Image.open(raw)
        width = 8192
        height = round(image.size[1] * width / image.size[0])
        image.resize((width, height), Image.LANCZOS).save(MOON_OUT / "panorama.jpg", quality=84, optimize=True)
        print(f"moon panorama: {width}x{height}")
    finally:
        raw.unlink(missing_ok=True)


def main() -> None:
    fetch_ground()
    for asset in ROCKS:
        fetch_rock(asset)
    fetch_moon()


if __name__ == "__main__":
    main()
