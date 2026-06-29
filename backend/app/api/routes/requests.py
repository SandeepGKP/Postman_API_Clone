from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import SavedRequest, Collection
from app.schemas.core import SavedRequestCreate, SavedRequestResponse, SavedRequestBase

router = APIRouter()

@router.post("/", response_model=SavedRequestResponse)
def create_saved_request(req: SavedRequestCreate, db: Session = Depends(get_db)):
    # Check if collection exists
    collection = db.query(Collection).filter(Collection.id == req.collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    db_req = SavedRequest(**req.model_dump())
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@router.put("/{request_id}", response_model=SavedRequestResponse)
def update_saved_request(request_id: int, req: SavedRequestBase, db: Session = Depends(get_db)):
    db_req = db.query(SavedRequest).filter(SavedRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_req, key, value)
        
    db.commit()
    db.refresh(db_req)
    return db_req

@router.delete("/{request_id}")
def delete_saved_request(request_id: int, db: Session = Depends(get_db)):
    db_req = db.query(SavedRequest).filter(SavedRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(db_req)
    db.commit()
    return {"ok": True}
