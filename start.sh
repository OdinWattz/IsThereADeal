#!/usr/bin/env bash
# Start both backend and frontend with a single command

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🎮 Starting GameDeals Tracker..."

# Backend
cd "$ROOT/backend"
if [ -f "$ROOT/.venv/bin/activate" ]; then
	source "$ROOT/.venv/bin/activate"
elif [ -f "$ROOT/backend/venv/bin/activate" ]; then
	source "$ROOT/backend/venv/bin/activate"
fi
echo "▶ Backend  → http://localhost:8000"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd "$ROOT/frontend"
echo "▶ Frontend → http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services started!"
echo "   API docs: http://localhost:8000/docs"
echo "   App:      http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
