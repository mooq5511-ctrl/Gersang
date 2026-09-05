"""Convert the user-selected ABYSS_FIRE_A AGF direction into a web sprite sheet."""

from __future__ import annotations

import importlib.util
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "char" / "ABYSS_FIRE_A.AGF"
OUTPUT = PROJECT / "public" / "game-assets" / "hero-normal-attack.png"
TEMP = PROJECT / ".abyss-fire-frames"
DECODER = ROOT / "idle-game" / "scripts" / "extract_agf.py"


def main() -> None:
    spec = importlib.util.spec_from_file_location("gersang_agf", DECODER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load the AGF decoder")
    agf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(agf)

    if TEMP.exists():
        shutil.rmtree(TEMP)
    TEMP.mkdir(parents=True)
    try:
        agf.OUT = TEMP
        frames = list(range(10))
        agf.extract(SOURCE, frames, "abyss-fire")
        images = [Image.open(TEMP / f"abyss-fire-{index}.png").convert("RGBA") for index in frames]
        width, height = images[0].size
        sheet = Image.new("RGBA", (width * len(images), height), (255, 255, 255, 0))
        for index, image in enumerate(images):
            sheet.alpha_composite(image, (index * width, 0))
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(OUTPUT, optimize=True)
        print(f"{OUTPUT.name}: {len(images)} frames, {sheet.width}x{sheet.height}")
    finally:
        shutil.rmtree(TEMP, ignore_errors=True)


if __name__ == "__main__":
    main()
