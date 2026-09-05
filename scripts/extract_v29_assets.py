"""Extract the curated Gersang visual set used by the V29 fusion UI."""

from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / "public" / "game-assets"
DECODER = ROOT / "idle-game" / "scripts" / "extract_agf.py"

spec = importlib.util.spec_from_file_location("gersang_agf", DECODER)
if spec is None or spec.loader is None:
    raise RuntimeError("Unable to load the AGF decoder")
agf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agf)
agf.OUT = OUT

CHARACTERS = {
    "hero-taiwan": "majo.AGF",
    "hero-china": "chinesephoenix.AGF",
    "hero-korea": "icequeen.AGF",
    "hero-japan": "BJ_SKULLSANTA_A.AGF",
    "merc-spear": "agiletiger.AGF",
    "merc-shield": "firedragon.AGF",
    "merc-archer": "blackdragon.AGF",
    "merc-shaman": "mon_bosstiger.AGF",
    "merc-samurai": "GUNDARI_GS_A1.AGF",
    "merc-ninja": "BJ_KRAMPUS_A.AGF",
    "merc-gunner": "greendragon.AGF",
    "merc-onmyoji": "black_tiger.AGF",
    "merc-blade": "fox.AGF",
    "merc-monk": "frosttiger_a.AGF",
    "merc-healer": "ice_dragon.AGF",
    "merc-cannon": "ninetailedfox_d_a.AGF",
    "merc-escort": "dragon_w.AGF",
    "merc-hunter": "aditi.AGF",
    "merc-elephant": "akbar.AGF",
    "merc-priest": "aengaeng.AGF",
}

ITEMS = {
    "item-weapon": "weapon01_i.AGF",
    "item-armor": "armor01_i.AGF",
    "item-helm": "helmet01_i.AGF",
    "item-boots": "shoes01_i.AGF",
    "item-gloves": "glove01_i.AGF",
    "item-ring": "ring01_i.AGF",
    "item-amulet": "element01_i.AGF",
    "item-accessory": "creature01_i.AGF",
}

BUILDINGS = {
    "market": "Market",
    "mercenary": "Barrack",
    "warehouse": "Bank",
    "inn": "GovernmentOffice",
    "pharmacy": "Clinic",
    "weapon": "MBarrack",
    "armor": "GBarrack",
}


def find_case_insensitive(folder: Path, name: str) -> Path:
    lowered = name.lower()
    for entry in folder.glob("*.AGF"):
        if entry.name.lower() == lowered:
            return entry
    raise FileNotFoundError(folder / name)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    character_dir = ROOT / "Assets" / "Textures" / "Characters"
    item_dir = ROOT / "Assets" / "Textures" / "Items"
    village_dir = ROOT / "Assets" / "Textures" / "UI" / "Village" / "Struct"

    for stem, name in CHARACTERS.items():
        agf.extract(find_case_insensitive(character_dir, name), [0], stem)
    for stem, name in ITEMS.items():
        agf.extract(find_case_insensitive(item_dir, name), [0], stem)
    for nation in ("Taiwan", "China", "Korea", "Japan"):
        for service, suffix in BUILDINGS.items():
            agf.extract(find_case_insensitive(village_dir / nation, nation + suffix + ".AGF"), [0], f"building-{nation.lower()}-{service}")

    print(f"Extracted {len(CHARACTERS)} character, {len(ITEMS)} item, and {len(BUILDINGS) * 4} building images")


if __name__ == "__main__":
    main()
