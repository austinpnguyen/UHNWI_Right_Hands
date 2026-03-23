#!/usr/bin/env python3
"""
run.py — Dynasty OS Process Manager
Controls the frontend (Next.js) and backend (Node.js) services.

Usage:
    python run.py start           # start both
    python run.py start --be      # backend only
    python run.py start --fe      # frontend only
    python run.py stop            # stop both
    python run.py stop --be       # backend only
    python run.py stop --fe       # frontend only
    python run.py restart         # restart both
    python run.py status          # check running services
    python run.py logs --be       # tail backend logs
    python run.py logs --fe       # tail frontend logs
"""

import argparse
import os
import signal
import subprocess
import sys
import time
import json
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────
ROOT     = Path(__file__).parent.resolve()
PID_FILE = ROOT / ".pids.json"

SERVICES = {
    "be": {
        "label":   "Backend  (Node.js :1110)",
        "cwd":     ROOT / "backend",
        "cmd":     ["node", "server.js"],
        "log":     ROOT / "backend.log",
        "url":     "http://localhost:1110",
    },
    "fe": {
        "label":   "Frontend (Next.js :8080)",
        "cwd":     ROOT / "frontend",
        "cmd":     ["npm", "run", "dev"],
        "log":     ROOT / "frontend.log",
        "url":     "http://localhost:8080",
    },
}

# ─── PID helpers ──────────────────────────────────────────────────────────────

def load_pids() -> dict:
    if PID_FILE.exists():
        try:
            return json.loads(PID_FILE.read_text())
        except Exception:
            pass
    return {}

def save_pids(pids: dict):
    PID_FILE.write_text(json.dumps(pids, indent=2))

def is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False

# ─── Service control ──────────────────────────────────────────────────────────

def start_service(key: str, pids: dict) -> dict:
    svc = SERVICES[key]

    # Check if already running
    if key in pids and is_running(pids[key]):
        print(f"  ✓ {svc['label']} already running (pid {pids[key]})")
        return pids

    log_file = open(svc["log"], "a")
    log_file.write(f"\n\n{'='*60}\n")
    log_file.write(f"[STARTED] {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    log_file.write(f"{'='*60}\n")
    log_file.flush()

    proc = subprocess.Popen(
        svc["cmd"],
        cwd=svc["cwd"],
        stdout=log_file,
        stderr=log_file,
        start_new_session=True,   # detach from parent so Ctrl+C doesn't kill children
    )

    pids[key] = proc.pid
    print(f"  ↑ {svc['label']}  started (pid {proc.pid})  →  {svc['url']}")
    print(f"    logs → {svc['log']}")
    return pids


def stop_service(key: str, pids: dict) -> dict:
    svc = SERVICES[key]
    pid = pids.get(key)

    if not pid:
        print(f"  - {svc['label']} not tracked (no pid)")
        return pids

    if not is_running(pid):
        print(f"  - {svc['label']} already stopped")
        pids.pop(key, None)
        return pids

    try:
        os.killpg(os.getpgid(pid), signal.SIGTERM)
        time.sleep(0.5)
        if is_running(pid):
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        print(f"  ↓ {svc['label']}  stopped (pid {pid})")
    except Exception as e:
        print(f"  ✗ Could not stop {svc['label']}: {e}")

    pids.pop(key, None)
    return pids


# ─── Commands ─────────────────────────────────────────────────────────────────

def cmd_start(keys: list[str]):
    pids = load_pids()
    print("Starting services...")
    for key in keys:
        pids = start_service(key, pids)
    save_pids(pids)
    print()

def cmd_stop(keys: list[str]):
    pids = load_pids()
    print("Stopping services...")
    for key in keys:
        pids = stop_service(key, pids)
    save_pids(pids)
    print()

def cmd_restart(keys: list[str]):
    cmd_stop(keys)
    time.sleep(1)
    cmd_start(keys)

def cmd_status():
    pids = load_pids()
    print("\nDynasty OS — Service Status")
    print("─" * 45)
    for key, svc in SERVICES.items():
        pid   = pids.get(key)
        alive = pid and is_running(pid)
        icon  = "🟢" if alive else "🔴"
        info  = f"pid {pid}" if alive else "stopped"
        print(f"  {icon}  {svc['label']:<32}  {info}")
    print()

def cmd_logs(keys: list[str]):
    """Tail logs for selected services (blocks — Ctrl+C to exit)."""
    files = [str(SERVICES[k]["log"]) for k in keys]
    print(f"Tailing logs: {', '.join(files)}  (Ctrl+C to exit)\n")
    try:
        subprocess.run(["tail", "-f", "-n", "50"] + files)
    except KeyboardInterrupt:
        print("\nStopped.")

# ─── CLI ──────────────────────────────────────────────────────────────────────

def resolve_keys(args) -> list[str]:
    """Return the list of service keys based on --be / --fe flags."""
    keys = []
    if getattr(args, "be", False): keys.append("be")
    if getattr(args, "fe", False): keys.append("fe")
    return keys or list(SERVICES.keys())   # default: all

def main():
    parser = argparse.ArgumentParser(
        prog="python run.py",
        description="Dynasty OS — Frontend & Backend Process Manager",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    for cmd_name in ("start", "stop", "restart", "logs"):
        p = sub.add_parser(cmd_name)
        p.add_argument("--be", action="store_true", help="Backend only")
        p.add_argument("--fe", action="store_true", help="Frontend only")

    sub.add_parser("status")

    args = parser.parse_args()
    keys = resolve_keys(args) if args.command != "status" else []

    if args.command == "start":
        cmd_start(keys)
    elif args.command == "stop":
        cmd_stop(keys)
    elif args.command == "restart":
        cmd_restart(keys)
    elif args.command == "status":
        cmd_status()
    elif args.command == "logs":
        cmd_logs(keys)

if __name__ == "__main__":
    main()
