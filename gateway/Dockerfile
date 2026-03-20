FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all directories since gateway needs to import orchestrator
COPY gateway /app/gateway
COPY orchestrator /app/orchestrator

WORKDIR /app/gateway
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
