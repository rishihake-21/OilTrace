from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes_analysis import router as analysis_router


app = FastAPI(
    title="OSDVAS API",
    description="Oil Spill Detection and Vessel Attribution System",
    version="0.1.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

app.include_router(analysis_router)


@app.get("/")
def root():
    return {
        "name": "OSDVAS",
        "status": "running",
        "version": "0.1.0",
    }