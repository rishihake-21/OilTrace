from fastapi import FastAPI

from src.api.routes.health import router as health_router
from src.api.routes.scenarios import router as scenarios_router

app = FastAPI(title="OilTrace API")

app.include_router(health_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")