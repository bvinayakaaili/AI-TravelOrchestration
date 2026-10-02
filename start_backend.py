import subprocess
import sys
import time
import os
from dotenv import load_dotenv

# Ensure UTF-8 output encoding for Windows consoles
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

python_exe = r".\venv\Scripts\python.exe"

services = [
    ("Flights Service", f"{python_exe} -m uvicorn services.flight_service.main:app --host 0.0.0.0 --port 8001 --reload"),
    ("Hotels Service",  f"{python_exe} -m uvicorn services.hotel_service.main:app --host 0.0.0.0 --port 8002 --reload"),
    ("Weather Service", f"{python_exe} -m uvicorn services.weather_service.main:app --host 0.0.0.0 --port 8003 --reload"),
    ("Places Service",  f"{python_exe} -m uvicorn services.places_service.main:app --host 0.0.0.0 --port 8004 --reload"),
    ("Budget Service",  f"{python_exe} -m uvicorn services.budget_service.main:app --host 0.0.0.0 --port 8005 --reload"),
    ("User Service",    f"{python_exe} -m uvicorn services.user_service.main:app --host 0.0.0.0 --port 8006 --reload"),
    ("Gateway",         f"{python_exe} -m uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --reload"),
]

processes = []

print("\n[INFO] Starting AI Travel Planner Backend...\n")

for name, command in services:
    print(f"Starting {name}...")
    process = subprocess.Popen(command, shell=True)
    processes.append(process)
    time.sleep(1)

print("\n[SUCCESS] All services started successfully!")
print("Press CTRL+C to stop everything.\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n[INFO] Shutting down services...\n")
    for p in processes:
        p.terminate()
    sys.exit()