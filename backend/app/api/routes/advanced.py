from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Workspace, MockServer, Monitor, Collection, SavedRequest
from app.schemas.core import WorkspaceCreate, WorkspaceResponse, MockServerCreate, MockServerResponse, MonitorCreate, MonitorResponse
from typing import List
import json
import asyncio
from datetime import datetime

router = APIRouter()

# WORKSPACES
@router.get("/workspaces", response_model=List[WorkspaceResponse])
def get_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).all()

@router.post("/workspaces", response_model=WorkspaceResponse)
def create_workspace(workspace: WorkspaceCreate, db: Session = Depends(get_db)):
    db_workspace = Workspace(**workspace.dict())
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

# MOCK SERVERS
@router.get("/mocks", response_model=List[MockServerResponse])
def get_mocks(db: Session = Depends(get_db)):
    return db.query(MockServer).all()

@router.post("/mocks", response_model=MockServerResponse)
def create_mock(mock: MockServerCreate, db: Session = Depends(get_db)):
    db_mock = MockServer(**mock.dict())
    db.add(db_mock)
    db.commit()
    db.refresh(db_mock)
    return db_mock

@router.api_route("/mock/{route:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def execute_mock(route: str, db: Session = Depends(get_db)):
    mock = db.query(MockServer).filter(MockServer.route == route).first()
    if not mock:
        raise HTTPException(status_code=404, detail="Mock route not found")
    
    return Response(content=mock.expected_body, status_code=mock.expected_status, media_type="application/json")

# MONITORS
@router.get("/monitors", response_model=List[MonitorResponse])
def get_monitors(db: Session = Depends(get_db)):
    return db.query(Monitor).all()

@router.post("/monitors", response_model=MonitorResponse)
def create_monitor(monitor: MonitorCreate, db: Session = Depends(get_db)):
    db_mon = Monitor(**monitor.dict())
    db.add(db_mon)
    db.commit()
    db.refresh(db_mon)
    return db_mon

# Simple background task for monitors (simplified for demo)
@router.post("/monitors/{monitor_id}/run")
def trigger_monitor_run(monitor_id: int, db: Session = Depends(get_db)):
    mon = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not mon:
        raise HTTPException(status_code=404)
        
    mon.last_run = datetime.utcnow()
    db.commit()
    return {"status": "success", "message": f"Monitor {monitor_id} executed successfully for collection {mon.collection_id}"}
