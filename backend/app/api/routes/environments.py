from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import Environment, EnvironmentVariable
from app.schemas.core import EnvironmentCreate, EnvironmentResponse

router = APIRouter()

@router.post("/", response_model=EnvironmentResponse)
def create_environment(env: EnvironmentCreate, db: Session = Depends(get_db)):
    db_env = Environment(name=env.name)
    db.add(db_env)
    db.commit()
    db.refresh(db_env)
    
    for var in env.variables:
        db_var = EnvironmentVariable(environment_id=db_env.id, key=var.key, value=var.value)
        db.add(db_var)
        
    db.commit()
    db.refresh(db_env)
    return db_env

@router.get("/", response_model=List[EnvironmentResponse])
def read_environments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    environments = db.query(Environment).offset(skip).limit(limit).all()
    return environments

@router.put("/{env_id}", response_model=EnvironmentResponse)
def update_environment(env_id: int, env: EnvironmentCreate, db: Session = Depends(get_db)):
    db_env = db.query(Environment).filter(Environment.id == env_id).first()
    if not db_env:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    db_env.name = env.name
    
    # Delete old variables
    db.query(EnvironmentVariable).filter(EnvironmentVariable.environment_id == env_id).delete()
    
    # Add new variables
    for var in env.variables:
        db_var = EnvironmentVariable(environment_id=db_env.id, key=var.key, value=var.value)
        db.add(db_var)
        
    db.commit()
    db.refresh(db_env)
    return db_env

@router.delete("/{env_id}")
def delete_environment(env_id: int, db: Session = Depends(get_db)):
    db_env = db.query(Environment).filter(Environment.id == env_id).first()
    if not db_env:
        raise HTTPException(status_code=404, detail="Environment not found")
    db.delete(db_env)
    db.commit()
    return {"ok": True}
