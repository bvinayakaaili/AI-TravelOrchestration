import asyncio
from orchestrator.planner import TravelOrchestrator

async def main():
    try:
        o = TravelOrchestrator()
        result = await o.orchestrate({"query": "Plan a 3 day trip to Paris"})
        import json
        print(json.dumps(result, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        await o.close()

if __name__ == "__main__":
    asyncio.run(main())
