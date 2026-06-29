import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from app.api.routes import collections, requests, proxy, environments, advanced
from app.db.database import engine, Base

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Postman Clone API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(proxy.router, prefix="/api/proxy", tags=["Proxy"])
app.include_router(environments.router, prefix="/api/environments", tags=["Environments"])
app.include_router(advanced.router, prefix="/api/advanced", tags=["Advanced"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
