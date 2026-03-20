import subprocess
import sys
import time

python_exe = r".\\venv\\Scripts\\python.exe"

services = [
    ("Flights Service", f"{python_exe} -m uvicorn services.flight_service.main:app --port 8001 --reload"),
    ("Hotels Service",  f"{python_exe} -m uvicorn services.hotel_service.main:app --port 8002 --reload"),
    ("Weather Service", f"{python_exe} -m uvicorn services.weather_service.main:app --port 8003 --reload"),
    ("Places Service",  f"{python_exe} -m uvicorn services.places_service.main:app --port 8004 --reload"),
    ("Budget Service",  f"{python_exe} -m uvicorn services.budget_service.main:app --port 8005 --reload"),
    ("User Service",    f"{python_exe} -m uvicorn services.user_service.main:app --port 8006 --reload"),
    ("Gateway",         f"{python_exe} -m uvicorn gateway.main:app --port 8000 --reload"),
]

processes = []

print("\n🚀 Starting AI Travel Planner Backend\n")

for name, command in services:
    print(f"Starting {name}...")
    process = subprocess.Popen(command, shell=True)
    processes.append(process)
    time.sleep(1)

print("\n✅ All services started!")
print("Press CTRL+C to stop everything.\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Shutting down services...\n")
    for p in processes:
        p.terminate()
    sys.exit()