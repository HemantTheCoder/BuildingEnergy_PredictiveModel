from pydantic import BaseModel
from typing import Dict, Any, Optional

class PredictRequest(BaseModel):
    climate_overrides: Optional[Dict[str, Any]] = None

try:
    req = PredictRequest.parse_obj({
        "climate_overrides": {
            "metadata": {"source": "NASA POWER"}
        }
    })
    print("SUCCESS")
except Exception as e:
    print(e)
