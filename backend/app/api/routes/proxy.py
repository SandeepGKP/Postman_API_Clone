from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
import httpx
import time
import json
from app.db.database import get_db
from app.db.models import History
from app.schemas.core import HistoryResponse
from typing import List

router = APIRouter()

@router.post("/send")
@router.get("/send")
@router.put("/send")
@router.delete("/send")
@router.patch("/send")
@router.options("/send")
@router.head("/send")
async def send_request(request: Request, db: Session = Depends(get_db)):
    start_time = time.time()
    
    # Read custom headers for proxy routing
    target_url = request.headers.get("x-postman-target-url")
    target_method = request.headers.get("x-postman-target-method")
    
    if not target_url or not target_method:
        raise HTTPException(status_code=400, detail="Missing target URL or Method in headers")

    # Reconstruct the headers intended for the target
    target_headers = {}
    
    # We parse the intended headers which were sent as a JSON string in x-postman-target-headers
    target_headers_str = request.headers.get("x-postman-target-headers")
    if target_headers_str:
        try:
            target_headers = json.loads(target_headers_str)
        except:
            pass

    # Extract the raw body from the incoming proxy request
    raw_body = await request.body()
    
    # Get the original content type sent from the frontend
    content_type = request.headers.get("content-type", "")
    if content_type:
        target_headers["Content-Type"] = content_type
        
    # Prevent httpx from failing due to host mismatch
    if "host" in target_headers:
        del target_headers["host"]
    if "Host" in target_headers:
        del target_headers["Host"]
    
    # Also drop content-length so httpx recalculates it
    if "content-length" in target_headers:
        del target_headers["content-length"]
    if "Content-Length" in target_headers:
        del target_headers["Content-Length"]
        
    # Drop Accept-Encoding so httpx can handle transparent decompression natively
    # (otherwise it might ask for brotli which we can't decompress if brotli is not installed)
    keys_to_delete = [k for k in target_headers.keys() if k.lower() == 'accept-encoding']
    for k in keys_to_delete:
        del target_headers[k]

    settings_str = request.headers.get("x-postman-settings")
    settings = {}
    if settings_str:
        try:
            settings = json.loads(settings_str)
        except:
            pass
            
    follow_redirects = settings.get("redirects", True)
    verify_ssl = settings.get("ssl", False)

    try:
        async with httpx.AsyncClient(verify=verify_ssl, follow_redirects=follow_redirects) as client:
            response = await client.request(
                method=target_method,
                url=target_url,
                headers=target_headers,
                content=raw_body if raw_body else None,
            )
            
            response_time = int((time.time() - start_time) * 1000)
            content = response.content # read raw bytes
            response_size = len(content)
            
            # Save to History
            history_record = History(
                method=target_method,
                url=str(response.url),
                status_code=response.status_code,
                response_time=response_time,
                response_size=response_size
            )
            db.add(history_record)
            db.commit()
            
            return {
                "status_code": response.status_code,
                "time": response_time,
                "size": response_size,
                "headers": dict(response.headers),
                # If it's valid text, return as string, else base64 (for simplicity here, we assume text API responses)
                "data": content.decode('utf-8', errors='replace')
            }
    except httpx.RequestError as exc:
        raise HTTPException(status_code=400, detail=f"Request failed: {str(exc)}")

@router.get("/history", response_model=List[HistoryResponse])
def get_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    history = db.query(History).order_by(History.created_at.desc()).offset(skip).limit(limit).all()
    return history

@router.delete("/history/{id}")
def delete_history_item(id: int, db: Session = Depends(get_db)):
    item = db.query(History).filter(History.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(item)
    db.commit()
    return {"status": "success"}

@router.delete("/history/date/{date_str}")
def delete_history_by_date(date_str: str, db: Session = Depends(get_db)):
    from sqlalchemy import cast, Date
    from datetime import datetime
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    db.query(History).filter(cast(History.created_at, Date) == target_date).delete()
    db.commit()
    return {"status": "success"}
