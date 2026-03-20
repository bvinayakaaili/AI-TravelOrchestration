# Telegram Bot for AI Travel Planner

This folder contains a headless Telegram adapter that uses the existing API gateway and orchestrator services. No backend/service code modifications are required.

## Setup

1. Copy config:
   ```bash
   cp config.example.yml config.yml
   ```
2. Edit `config.yml` with your token and gateway URL.
3. Setup virtualenv and install dependencies:
   ```bash
   python -m venv .venv
   .venv\Scripts\Activate.ps1  # Windows
   pip install -r requirements.txt
   ```

## Run

```bash
python bot.py
```

## Usage

In Telegram, send:

- `Plan a 2-day trip from Hyderabad to Goa under 15000`
- `What is the weather in Mumbai?`
- `Compare Goa vs Delhi for 3 days`

The bot will call backend gateway: `POST /plans/generate` and return a formatted plan.
