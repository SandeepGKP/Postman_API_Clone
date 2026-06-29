from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    collections = relationship("Collection", back_populates="workspace", cascade="all, delete")
    environments = relationship("Environment", back_populates="workspace", cascade="all, delete")

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="collections")
    requests = relationship("SavedRequest", back_populates="collection", cascade="all, delete")
    monitors = relationship("Monitor", back_populates="collection", cascade="all, delete")

class SavedRequest(Base):
    __tablename__ = "saved_requests"
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"))
    name = Column(String)
    method = Column(String)
    url = Column(String)
    headers = Column(JSON, default=list)
    query_params = Column(JSON, default=list)
    body_type = Column(String, default="none")
    body = Column(Text, nullable=True)
    auth_type = Column(String, default="none")
    auth_credentials = Column(JSON, default=dict)
    
    collection = relationship("Collection", back_populates="requests")

class Environment(Base):
    __tablename__ = "environments"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    name = Column(String, index=True)
    
    workspace = relationship("Workspace", back_populates="environments")
    variables = relationship("EnvironmentVariable", back_populates="environment", cascade="all, delete")

class EnvironmentVariable(Base):
    __tablename__ = "environment_variables"
    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id"))
    key = Column(String)
    value = Column(String)
    
    environment = relationship("Environment", back_populates="variables")

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    method = Column(String)
    url = Column(String)
    status_code = Column(Integer)
    response_time = Column(Integer)
    response_size = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class MockServer(Base):
    __tablename__ = "mock_servers"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    name = Column(String)
    route = Column(String, index=True, unique=True)
    expected_status = Column(Integer, default=200)
    expected_body = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Monitor(Base):
    __tablename__ = "monitors"
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"))
    name = Column(String)
    interval_minutes = Column(Integer, default=60)
    last_run = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    
    collection = relationship("Collection", back_populates="monitors")
