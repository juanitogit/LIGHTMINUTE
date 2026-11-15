"""Pre-registered synthetic study; see PREREG-conformal.md."""
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from adaptive_conformal import AdaptiveConformal


def main():
    result = {}
    for adaptive in (False, True):
        counters = {part:{"n":0,"covered":0,"width_sum":0.0} for part in ("all", "before", "after")}
        for seed in range(30000,30100):
            rng=random.Random(seed)
            model=AdaptiveConformal(adaptive=adaptive)
            for index in range(1000):
                prediction=0.0
                value=rng.gauss(0,1 if index < 500 else 2)
                band=model.interval(prediction)
                if band is not None:
                    for part in ("all", "before" if index < 500 else "after"):
                        count=counters[part];count["n"]+=1;count["covered"]+=int(band[0]<=value<=band[1]);count["width_sum"]+=band[1]-band[0]
                model.observe(prediction,value)
        for count in counters.values():
            count["coverage"] = count["covered"]/count["n"]
            count["mean_width"] = count.pop("width_sum")/count["n"]
        result["adaptive" if adaptive else "fixed"]=counters
    payload={"label":"synthetic, exploratory, not a clinical model","timestamp_utc":datetime.now(timezone.utc).isoformat(),"seeds":"30000–30099","results":result}
    path=Path(__file__).with_name("conformal-results.json")
    path.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))


if __name__ == "__main__":
    main()
