import json
from app.db.database import SessionLocal
from app.db.models import Workspace, Collection, SavedRequest, Environment, EnvironmentVariable, History, MockServer, Monitor

def run_seed():
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Workspace).count() > 0:
        db.close()
        return

    # Seed Workspace
    ws = Workspace(name="My Workspace")
    db.add(ws)
    db.commit()
    db.refresh(ws)

    # Seed Environment
    env = Environment(workspace_id=ws.id, name="Production JSONPlaceholder")
    db.add(env)
    db.commit()
    db.refresh(env)

    var1 = EnvironmentVariable(environment_id=env.id, key="base_url", value="https://jsonplaceholder.typicode.com")
    db.add(var1)
    db.commit()

    # Seed Collection
    col = Collection(workspace_id=ws.id, name="JSONPlaceholder API", description="Test endpoints")
    db.add(col)
    db.commit()
    db.refresh(col)

    req1 = SavedRequest(
        collection_id=col.id,
        name="Get All Posts",
        method="GET",
        url="{{base_url}}/posts",
        headers=[{"key": "Accept", "value": "application/json", "enabled": True}]
    )
    req2 = SavedRequest(
        collection_id=col.id,
        name="Create Post",
        method="POST",
        url="{{base_url}}/posts",
        body_type="raw",
        body=json.dumps({"title": "foo", "body": "bar", "userId": 1}),
        headers=[{"key": "Content-Type", "value": "application/json", "enabled": True}]
    )
    db.add(req1)
    db.add(req2)
    db.commit()

    # Seed Mock Server
    mock = MockServer(workspace_id=ws.id, name="Test Mock", route="test-mock", expected_status=200, expected_body='{"message": "Hello from functional mock server!"}')
    db.add(mock)
    db.commit()

    # Seed Monitor
    monitor = Monitor(collection_id=col.id, name="Nightly Build Check", interval_minutes=1440)
    db.add(monitor)
    db.commit()

    # Seed History
    hist = History(
        method="GET",
        url="https://jsonplaceholder.typicode.com/posts/1",
        status_code=200,
        response_time=120,
        response_size=840
    )
    db.add(hist)
    db.commit()

    db.close()
    print("Database seeded automatically on startup!")
