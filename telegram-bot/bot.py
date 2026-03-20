import traceback
from pathlib import Path

import httpx
import yaml
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "config.yml"


def get_config():
    if not CONFIG_FILE.exists():
        raise FileNotFoundError("config.yml not found; copy config.example.yml to config.yml")
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def extract_source_destination(query: str):
    lower = query.lower()
    source = None
    destination = None

    tokens = lower.split()
    if "from" in tokens:
        idx = tokens.index("from")
        if idx + 1 < len(tokens):
            source = tokens[idx + 1].strip(',')

    if "to" in tokens:
        idx = tokens.index("to")
        if idx + 1 < len(tokens):
            destination = tokens[idx + 1].strip(',')

    if not destination and "in" in tokens:
        idx = tokens.index("in")
        if idx + 1 < len(tokens):
            destination = tokens[idx + 1].strip(',')

    return source, destination


def format_plan(plan: dict) -> str:
    if not plan:
        return "No plan returned."

    try:
        pieces = [
            f"🏟️ Trip: {plan.get('source', 'Unknown')} → {plan.get('destination', 'Unknown')} ({plan.get('duration', 'N/A')})",
            f"💰 Estimated Budget: ₹{plan.get('estimated_budget', 'N/A')}",
        ]

        weather = plan.get('weather', {})
        if weather and isinstance(weather, dict):
            pieces.append(f"🌤 Weather in {weather.get('city', plan.get('destination', 'Unknown'))}: {weather.get('temperature', 'N/A')} — {weather.get('condition', 'N/A')}")

        if plan.get('budget_advice'):
            pieces.append(f"💡 Budget tips: {plan.get('budget_advice')}")

        if plan.get('itinerary'):
            pieces.append("🗺️ Itinerary:")
            pieces.append(str(plan.get('itinerary')))

        return "\n\n".join(pieces)
    except Exception as e:
        return f"Error formatting plan: {str(e)}"


async def call_gateway(query: str, chat_id: int, gateway_url: str, source: str = None, destination: str = None):
    payload = {
        "query": query,
        "session_id": str(chat_id)
    }
    if source:
        payload["source"] = source
    if destination:
        payload["destination"] = destination

    async with httpx.AsyncClient(timeout=120.0) as client:  # Increased timeout to 120 seconds
        response = await client.post(f"{gateway_url}/plans/generate", json=payload)
        response.raise_for_status()
        return response.json()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Welcome to AI Travel Planner Bot!\n"
        "Send a query like:\n"
        "- Plan a 2-day trip from Hyderabad to Goa under 15000\n"
        "- What is the weather in Mumbai?\n"
        "- Compare Goa vs Delhi for 3 days"
    )


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    cfg = get_config()
    gateway_url = cfg.get('gateway_url', 'http://localhost:8000')
    query = update.message.text.strip()
    chat_id = update.effective_chat.id

    source, destination = extract_source_destination(query)

    await update.message.reply_text('⏳ Planning your trip...')
    try:
        result = await call_gateway(query, chat_id, gateway_url, source=source, destination=destination)
        if result.get('status') != 'success':
            await update.message.reply_text('Backend returned an error: ' + str(result))
            return

        plan = result.get('trip_plan', {})
        text = format_plan(plan)
        # Check message length (Telegram limit is 4096 chars)
        if len(text) > 4000:
            text = text[:4000] + "\n\n[Message truncated due to length limit]"
        await update.message.reply_text(text)
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        if len(error_msg) > 4000:
            error_msg = error_msg[:4000] + "..."
        await update.message.reply_text(error_msg)


def main():
    cfg = get_config()
    token = cfg.get('telegram_token')
    if not token:
        raise ValueError('telegram_token missing in config.yml')

    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))

    print('Telegram bot is running...')
    app.run_polling()


if __name__ == '__main__':
    main()
