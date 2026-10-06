"""One-command launcher for the whole RetailIQ stack.

    uv run --project backend python run.py          (or double-click start.bat)

1. Builds the React frontend into frontend/dist if it hasn't been built yet.
2. Starts the mock source-of-truth API on :3000.
3. Starts the FastAPI backend on :8000. It serves the built frontend, and on
   first run loads the data and builds the search index.
4. Opens http://127.0.0.1:8000 in the browser.

Ctrl+C stops everything. Pass --rebuild to rebuild the frontend.
"""

from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
SOURCE_PORT = 3000
BACKEND_PORT = int(os.getenv("PORT", "8000"))
APP_URL = f"http://127.0.0.1:{BACKEND_PORT}"


def say(msg: str):
    print(f"[retailiq] {msg}", flush=True)


def port_busy(port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def wait_for(url: str, timeout: float, proc: subprocess.Popen) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except OSError:
            pass
        time.sleep(1)
    return False


def build_frontend(force: bool):
    if (FRONTEND / "dist" / "index.html").exists() and not force:
        return
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("[retailiq] Node.js is needed to build the frontend once. Install it from https://nodejs.org and run again.")
    if not (FRONTEND / "node_modules").exists():
        say("installing frontend packages (first run only) ...")
        subprocess.run([npm, "ci"], cwd=FRONTEND, check=True)
    say("building the frontend ...")
    subprocess.run([npm, "run", "build"], cwd=FRONTEND, check=True)


def main():
    build_frontend(force="--rebuild" in sys.argv)

    for port, what in ((SOURCE_PORT, "mock source API"), (BACKEND_PORT, "backend")):
        if port_busy(port):
            sys.exit(f"[retailiq] Port {port} (needed for the {what}) is already in use. "
                     "Close the other program, or an older RetailIQ window, and try again.")

    env = {**os.environ, "PYTHONUTF8": "1", "PYTHONUNBUFFERED": "1"}
    procs: list[subprocess.Popen] = []

    def stop(*_):
        for p in procs:
            if p.poll() is None:
                p.terminate()
        for p in procs:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()

    try:
        say(f"starting the mock source API on :{SOURCE_PORT} ...")
        source = subprocess.Popen([sys.executable, "-m", "mock_source_api"], cwd=BACKEND, env=env)
        procs.append(source)
        if not wait_for(f"http://127.0.0.1:{SOURCE_PORT}/", 60, source):
            sys.exit("[retailiq] The mock source API did not start.")

        say(f"starting the backend on :{BACKEND_PORT} (the first run downloads embedding models and loads data, about 1-3 minutes) ...")
        backend = subprocess.Popen([sys.executable, "main.py"], cwd=BACKEND, env=env)
        procs.append(backend)
        if not wait_for(f"{APP_URL}/api/health", 600, backend):
            sys.exit("[retailiq] The backend did not start. See the log above.")

        with urllib.request.urlopen(f"{APP_URL}/api/health", timeout=5) as r:
            health = r.read().decode()
        say(f"ready: {APP_URL}   login: {os.getenv('DEMO_USERNAME', 'admin')} / {os.getenv('DEMO_PASSWORD', 'admin123')}")
        say(f"agent: {health}")
        say("press Ctrl+C to stop")
        if "--no-browser" not in sys.argv:
            webbrowser.open(APP_URL)

        signal.signal(signal.SIGTERM, stop)
        while all(p.poll() is None for p in procs):
            time.sleep(1)
        say("a service stopped; shutting down")
    except KeyboardInterrupt:
        say("stopping ...")
    finally:
        stop()


if __name__ == "__main__":
    main()
