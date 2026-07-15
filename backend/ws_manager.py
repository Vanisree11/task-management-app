import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    """
    Keeps track of active WebSocket connections per user_id so task
    changes can be pushed live to every device/tab that user has open.
    """

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, event: str, payload: dict):
        connections = self.active_connections.get(user_id, [])
        message = json.dumps({"event": event, "data": payload}, default=str)
        stale = []
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)


manager = ConnectionManager()
