import asyncio
import websockets
import logging
import sys

# Configure logging to show us EVERYTHING
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

print(f"Python Version: {sys.version.split()[0]}")
print(f"Websockets Library Version: {websockets.__version__}")

# A simple handler that accepts connection and sends fake data
async def debug_handler(websocket, *args):
    print(f"🟢 CONNECTION ACCEPTED! Client: {websocket.remote_address}")
    try:
        await websocket.send('{"pitch": 0.5, "roll": 0.5}')
        print("Sent test packet.")
        await websocket.wait_closed()
    except Exception as e:
        print(f"🔴 Connection Error: {e}")
    finally:
        print("⚪ Client Disconnected")

async def main():
    # We bind specifically to 127.0.0.1 to match your Client
    print("------------------------------------------------")
    print("STARTING DEBUG SERVER ON 127.0.0.1:8889")
    print("------------------------------------------------")
    
    async with websockets.serve(debug_handler, "127.0.0.1", 8889):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopped.")