# Postman API Clone

A fully functional API testing and development environment built to replicate the core features of Postman. This application allows developers to build, test, manage, and execute HTTP requests seamlessly from a unified, modern interface. 

## 🚀 Features

- **Advanced Request Builder**: Support for GET, POST, PUT, DELETE, PATCH, and more.
- **Dynamic Environments**: Manage global variables (e.g., `{{base_url}}`) to seamlessly switch between local, staging, and production servers.
- **Intelligent Response Viewer**: Automatic formatting and syntax highlighting for JSON, XML, HTML, and Text. Includes detailed network metrics (Status Code, Time, Size).
- **Workspace & Collections**: Group your API requests logically into Collections and Workspaces.
- **History Tracking**: Automatically logs every request you send, allowing you to replay past requests instantly.
- **Advanced Features (Mock Servers & Monitors)**: Setup mock endpoints and schedule API monitoring.

## 🛠️ Architecture Overview

This project is built using a modern decoupled architecture:

### Frontend (Client)
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (with highly customized, dark-mode focused Postman-like aesthetics)
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`) and Zustand for global state.

### Backend (Server / Proxy)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: SQLite (managed via SQLAlchemy ORM)
- **Role**: Acts as an intermediary proxy. It circumvents CORS restrictions that typically block browser-based API testing tools, securely forwards requests to target APIs using `httpx`, logs the history into the database, and returns the response to the frontend.

## 💾 Database Schema

The backend uses a relational SQLite database. Below is the core schema with dummy data:

### Workspaces (`workspaces`)
| id | name |
|----|------|
| 1  | "My Workspace" |
| 2  | "Team Testing" |

### Collections (`collections`)
| id | workspace_id | name | description | created_at |
|----|--------------|------|-------------|------------|
| 1  | 1            | "JSONPlaceholder API" | "Sample requests to test the app." | 2026-06-28T10:00:00Z |
| 2  | 1            | "Auth Services"       | "Testing user login endpoints."    | 2026-06-28T11:00:00Z |

### Saved Requests (`saved_requests`)
| id | collection_id | name | method | url | body_type | body |
|----|---------------|------|--------|-----|-----------|------|
| 1  | 1             | "Get All Posts" | GET    | "{{base_url}}/posts" | none      | ""   |
| 2  | 1             | "Create Post"   | POST   | "{{base_url}}/posts" | raw       | '{"title": "foo"}' |

### Environments (`environments`)
| id | workspace_id | name | variables (JSON) |
|----|--------------|------|------------------|
| 1  | 1            | "Development" | `[{"key": "base_url", "value": "localhost:8000"}]` |
| 2  | 1            | "Production"  | `[{"key": "base_url", "value": "api.example.com"}]` |



## 📡 API Overview

The FastAPI backend exposes the following RESTful endpoints:

### Proxy
- `ALL /api/proxy/send`: The core proxy endpoint. Accepts custom headers (`x-postman-target-url`, `x-postman-target-method`) and securely forwards the HTTP request to the target destination.
- `GET /api/proxy/history`: Retrieves the chronological history of all executed requests.
- `DELETE /api/proxy/history/{id}`: Deletes a specific history record.

### Collections & Workspaces
- `GET /api/collections/workspaces`: Fetch all workspaces.
- `GET /api/collections/`: Fetch all collections within a workspace.
- `POST /api/collections/`: Create a new collection.

### Requests
- `GET /api/requests/collection/{collection_id}`: Fetch all saved requests in a collection.
- `POST /api/requests/`: Save a new API request.

### Environments
- `GET /api/environments/`: Retrieve all environments and their associated variables.
- `POST /api/environments/`: Create a new environment.
- `POST /api/environments/{env_id}/variables`: Add variables to an environment.

## 💻 Setup Instructions

Follow these steps to run the application locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.9+)

### 1. Start the Backend (FastAPI)
Open a terminal and navigate to the `backend` directory:
```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```
The backend will start on `http://localhost:8000`. The SQLite database (`postman_clone.db`) will be created automatically.

### 2. Start the Frontend (Next.js)
Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will start on `http://localhost:3000`.

### 3. Usage
1. Open your browser and go to `http://localhost:3000`.
2. Enter a URL (e.g., `https://jsonplaceholder.typicode.com/todos/1`), select `GET`, and click **Send**.
3. Explore Collections, History, and Environments from the sidebar!

---
*Disclaimer: This project is an assignment/clone built for educational purposes and is not affiliated with Postman, Inc.*
