from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter()

SCENARIO_DIR = Path("data/scenarios")


@router.get("/scenarios")
def get_scenarios():
    scenarios = []

    if not SCENARIO_DIR.exists():
        return {"scenarios": []}

    for scenario_file in SCENARIO_DIR.glob("*/scenario.json"):
        try:
            with open(scenario_file, "r", encoding="utf-8") as f:
                scenario = json.load(f)

            scenarios.append(scenario)

        except Exception:
            continue

    return {"scenarios": scenarios}