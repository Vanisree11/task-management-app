# TaskFlow

A full-stack task management app with real-time sync — built to understand how authentication, REST APIs, and WebSockets actually fit together in a working product, not just in theory.

**Live demo:** [add your Netlify URL here]
**Backend API:** [add your Render URL here]

---

## What it does

- Create, update, and delete tasks across three states — To Do, In Progress, Done
- Filter by status, priority, or search by title
- Every change syncs instantly across open tabs/devices via WebSockets — no refresh needed
- Each user's tasks are private, protected behind JWT-based login

## Why I built it this way

Most task-manager tutorials stop at CRUD. I wanted to understand what happens after that — specifically, how a browser stays in sync with a server in real time without polling, and how JWT auth actually flows end to end (hash → issue token → verify on every request → scope every query to the logged-in user). Building the WebSocket layer myself, instead of using a library that hides it, was the point.

## Tech stack

**Backend**
- FastAPI (Python) — REST API + WebSocket endpoint in one app
- SQLAlchemy + SQLite — ORM and database
- JWT (python-jose) + bcrypt — authentication and password hashing

**Frontend**
- Vanilla HTML/CSS/JS — no framework, to keep the WebSocket/DOM-update logic transparent
- Native WebSocket API for live updates

**Deployment**
- Backend on Render
- Frontend on Netlify

## Architecture

```
Browser (Netlify)
   │
   ├── REST calls  ──────────► FastAPI backend (Render)
   │                                │
   └── WebSocket connection ────────┤
        (persistent, per-user)      │
                                     ▼
                              SQLite database
```

Every task create/update/delete goes through the REST API, then the backend pushes the same event over the WebSocket to any other open session for that user — so two tabs (or two devices) stay in sync without either one polling the server.

## Running it locally

```bash
# backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload

# then open frontend/index.html in a browser,
# or visit http://127.0.0.1:8000 if serving both together
```


Built as a hands-on exercise in full-stack architecture — API design, real-time data flow, and deployment, end to end.
