from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- Environment Schemas ---
class EnvironmentVariableBase(BaseModel):
    key: str
    value: str

class EnvironmentVariableCreate(EnvironmentVariableBase):
    pass

class EnvironmentVariableResponse(EnvironmentVariableBase):
    id: int
    environment_id: int
    model_config = ConfigDict(from_attributes=True)

class EnvironmentBase(BaseModel):
    name: str

class EnvironmentCreate(EnvironmentBase):
    variables: List[EnvironmentVariableCreate] = []

class EnvironmentResponse(EnvironmentBase):
    id: int
    variables: List[EnvironmentVariableResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Request Schemas ---
class SavedRequestBase(BaseModel):
    name: str
    method: str
    url: str
    headers: List[Dict[str, Any]] = []
    query_params: List[Dict[str, Any]] = []
    body_type: str = "none"
    body: Optional[str] = None
    auth_type: str = "none"
    auth_credentials: Dict[str, Any] = {}

class SavedRequestCreate(SavedRequestBase):
    collection_id: int

class SavedRequestResponse(SavedRequestBase):
    id: int
    collection_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Collection Schemas ---
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    pass

class CollectionResponse(CollectionBase):
    id: int
    created_at: datetime
    requests: List[SavedRequestResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- History Schemas ---
class HistoryResponse(BaseModel):
    id: int
    method: str
    url: str
    status_code: int
    response_time: int
    response_size: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class MockServerCreate(BaseModel):
    workspace_id: Optional[int] = None
    name: str
    route: str
    expected_status: int = 200
    expected_body: str = "{}"

class MockServerResponse(MockServerCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MonitorCreate(BaseModel):
    collection_id: int
    name: str
    interval_minutes: int = 60

class MonitorResponse(MonitorCreate):
    id: int
    last_run: Optional[datetime]
    status: str
    
    class Config:
        from_attributes = True
