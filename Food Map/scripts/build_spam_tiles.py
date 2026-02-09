#!/usr/bin/env python3
import argparse
import json
import math
import os
from pathlib import Path

import mercantile
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject
from rasterio import shutil as rio_shutil
from PIL import Image

TILE_SIZE = 256


def parse_color(value):
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError("Color must be a 6-char hex value, e.g. 4c7c5c")
    return tuple(int(value[i:i + 2], 16) for i in range(0, 6, 2))


def build_cog(src_path, cog_path):
    cog_path = Path(cog_path)
    cog_path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(src_path) as src:
        try:
            rio_shutil.copy(
                src,
                cog_path,
                driver="COG",
                compress="DEFLATE",
                overview_resampling="average",
                blocksize=512,
            )
        except Exception:
            try:
                rio_shutil.copy(
                    src,
                    cog_path,
                    driver="COG",
                    compress="DEFLATE",
                    overview_resampling="nearest",
                    blocksize=512,
                )
            except Exception:
                rio_shutil.copy(
                    src,
                    cog_path,
                    driver="COG",
                    compress="DEFLATE",
                    blocksize=512,
                )


def compute_stats(src_path, sample_step=1):
    with rasterio.open(src_path) as src:
        data = src.read(1, masked=True)
    data = data.filled(np.nan)
    valid = data[np.isfinite(data) & (data > 0)]
    if valid.size == 0:
        return 0.0, 1.0
    if sample_step > 1:
        valid = valid[::sample_step]
    vmin = float(np.nanpercentile(valid, 5))
    vmax = float(np.nanpercentile(valid, 98))
    if math.isclose(vmin, vmax):
        vmax = vmin + 1.0
    return vmin, vmax


def render_tile(data, vmin, vmax, base_color):
    data = data.astype("float32")
    mask = np.isfinite(data) & (data > 0)
    if not np.any(mask):
        return Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (0, 0, 0, 0))

    norm = np.zeros_like(data, dtype="float32")
    norm[mask] = (data[mask] - vmin) / (vmax - vmin)
    norm = np.clip(norm, 0.0, 1.0)

    shade = 0.35 + 0.65 * norm
    r_base, g_base, b_base = base_color

    rgb = np.stack(
        [
            (r_base * shade).astype("uint8"),
            (g_base * shade).astype("uint8"),
            (b_base * shade).astype("uint8"),
        ],
        axis=-1,
    )

    alpha = np.zeros_like(data, dtype="uint8")
    alpha[mask] = (60 + 195 * norm[mask]).astype("uint8")

    rgba = np.dstack([rgb, alpha])
    return Image.fromarray(rgba, mode="RGBA")


def build_tiles(src_path, output_dir, min_zoom, max_zoom, vmin, vmax, base_color):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with rasterio.open(src_path) as src:
        for zoom in range(min_zoom, max_zoom + 1):
            tiles = list(mercantile.tiles(-180, -85.0511, 180, 85.0511, [zoom]))
            for tile in tiles:
                bounds = mercantile.xy_bounds(tile)
                dst_transform = from_bounds(
                    bounds.left,
                    bounds.bottom,
                    bounds.right,
                    bounds.top,
                    TILE_SIZE,
                    TILE_SIZE,
                )
                dst = np.full((TILE_SIZE, TILE_SIZE), np.nan, dtype="float32")
                reproject(
                    source=rasterio.band(src, 1),
                    destination=dst,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=dst_transform,
                    dst_crs="EPSG:3857",
                    resampling=Resampling.average,
                    dst_nodata=np.nan,
                )

                image = render_tile(dst, vmin, vmax, base_color)
                tile_dir = output_dir / str(zoom) / str(tile.x)
                tile_dir.mkdir(parents=True, exist_ok=True)
                tile_path = tile_dir / f"{tile.y}.png"
                image.save(tile_path, format="PNG", optimize=True)


def main():
    parser = argparse.ArgumentParser(description="Generate raster tiles from SPAM GeoTIFF.")
    parser.add_argument("--input", required=True, help="Path to input GeoTIFF")
    parser.add_argument("--output", required=True, help="Directory for XYZ tiles")
    parser.add_argument("--min-zoom", type=int, default=0, help="Minimum zoom level")
    parser.add_argument("--max-zoom", type=int, default=5, help="Maximum zoom level")
    parser.add_argument("--color", default="5f7c6a", help="Base hex color for ramp")
    parser.add_argument("--cog", help="Optional path to output COG")
    parser.add_argument("--stats", help="Optional path to write stats JSON")
    args = parser.parse_args()

    base_color = parse_color(args.color)

    if args.cog:
        build_cog(args.input, args.cog)

    vmin, vmax = compute_stats(args.input)

    if args.stats:
        stats_path = Path(args.stats)
        stats_path.parent.mkdir(parents=True, exist_ok=True)
        with stats_path.open("w", encoding="utf-8") as handle:
            json.dump({"vmin": vmin, "vmax": vmax}, handle, indent=2)

    build_tiles(args.input, args.output, args.min_zoom, args.max_zoom, vmin, vmax, base_color)


if __name__ == "__main__":
    main()
