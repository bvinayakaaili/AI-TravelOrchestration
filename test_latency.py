import httpx
import asyncio
import time

async def test():
    print("Testing orchestrator...")
    start = time.time()
    async with httpx.AsyncClient(timeout=300.0) as client:
        res = await client.post(
            "http://localhost:8000/plans/generate",
            json={"query": "Plan a 2-day trip to Goa under 20000 rupees", "source": "hyd", "budget": 20000, "num_days": 2}
        )
        data = res.json()
        print(f"Time taken: {round(time.time() - start, 2)}s")
        plan = data.get("trip_plan", {})
        print("Itinerary:", plan.get("itinerary", "None")[:100], "...")
        print("Budget Advice:", plan.get("budget_advice", "None")[:100], "...")
        print("Trace:", plan.get("workflow_explanation", {}).get("trace"))

if __name__ == "__main__":
    asyncio.run(test())
