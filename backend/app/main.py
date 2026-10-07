import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import forms, public, responses
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_if_empty()  # creates tables and seeds demo data on a fresh database
    yield


app = FastAPI(title="Typeform Clone API", version="1.0.0", lifespan=lifespan)

allowed_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router)
app.include_router(responses.router)
app.include_router(public.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
