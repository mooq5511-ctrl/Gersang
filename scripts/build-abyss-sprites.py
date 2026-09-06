"""Build compact browser sprite sheets from the extracted AGF frames."""

from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
MATERIALS = PROJECT.parent
OUTPUT = PROJECT / "public" / "game-assets"


def build(source_name: str, frame_count: int, output_name: str) -> None:
    source = MATERIALS / f"{source_name}_extracted"
    frames = [
        Image.open(source / f"{source_name}-{index}.png").convert("RGBA")
        for index in range(frame_count)
    ]
    width, height = frames[0].size
    if any(frame.size != (width, height) for frame in frames):
        raise ValueError(f"Inconsistent canvas sizes in {source_name}")

    sheet = Image.new("RGBA", (width * frame_count, height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / output_name
    sheet.save(target, optimize=True)
    print(f"{target.name}: {frame_count} frames, {sheet.width}x{sheet.height}")


if __name__ == "__main__":
    # The first directional block gives one coherent right-facing combat action.
    build("ABYSS_FIRE_A", 10, "hero-normal-attack.png")
    build("ABYSS_WATER_A", 11, "hero-water-skill.png")
