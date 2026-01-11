import asyncio
import json
import logging
import threading
import http.server
import socketserver
import serial
import websockets
import time

# --- Configuration ---
HTTP_PORT = 8888
WEBSOCKET_PORT = 8889 
SERIAL_PORT = '/dev/ttyACM0'
BAUD_RATE = 9600
# --- End Configuration ---

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

latest_data = {"pitch": 0, "roll": 0}
connected_clients = set()

def read_from_serial():
    global latest_data
    
    # --- Auto-Calibration Variables ---
    CALIBRATION_SAMPLES = 100
    pitch_offset = 0.0
    roll_offset = 0.0
    
    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2) as ser:
                logging.info(f"Serial connected on {SERIAL_PORT}")
                ser.reset_input_buffer()
                
                # --- Perform Auto-Calibration ---
                logging.info(f"Calibrating... Please keep the board flat. Reading {CALIBRATION_SAMPLES} samples.")
                temp_pitch = []
                temp_roll = []
                
                for i in range(CALIBRATION_SAMPLES):
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith("PITCH:") and ",ROLL:" in line:
                        try:
                            parts = line.split(',')
                            temp_pitch.append(float(parts[0].split(':')[1]))
                            temp_roll.append(float(parts[1].split(':')[1]))
                        except (ValueError, IndexError):
                            pass # Ignore parsing errors during calibration
                    # Add a small delay to ensure we get fresh readings
                    time.sleep(0.03)

                if temp_pitch and temp_roll:
                    pitch_offset = sum(temp_pitch) / len(temp_pitch)
                    roll_offset = sum(temp_roll) / len(temp_roll)
                    logging.info(f"Calibration complete. Pitch Offset: {pitch_offset:.2f}, Roll Offset: {roll_offset:.2f}")
                else:
                    logging.warning("Calibration failed: Not enough data received. Using zero offset.")
                
                # --- Main Loop: Read and broadcast calibrated data ---
                while True:
                    try:
                        line = ser.readline().decode('utf-8', errors='ignore').strip()
                        if line.startswith("PITCH:") and ",ROLL:" in line:
                            parts = line.split(',')
                            pitch = float(parts[0].split(':')[1])
                            roll = float(parts[1].split(':')[1])
                            
                            # Apply calibration offset
                            calibrated_pitch = pitch - pitch_offset
                            calibrated_roll = roll - roll_offset
                            
                            latest_data = {"pitch": calibrated_pitch, "roll": calibrated_roll}
                    except (ValueError, IndexError):
                        pass # Ignore parsing errors to keep stream smooth
                        
        except serial.SerialException:
            logging.warning("Serial disconnected. Retrying in 2s...")
            time.sleep(2)

# --- THE FIX IS HERE ---
# Using *args makes this compatible with ALL versions of the websockets library
async def websocket_handler(websocket, *args):
    logging.info(f"Client connected from {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        logging.info("Client disconnected")
        connected_clients.remove(websocket)

async def broadcast_data():
    logging.info("Broadcaster started")
    while True:
        if connected_clients:
            message = json.dumps(latest_data)
            # Send to all clients, ignoring errors from disconnected ones
            tasks = [asyncio.create_task(client.send(message)) for client in connected_clients]
            if tasks:
                await asyncio.wait(tasks, return_when=asyncio.ALL_COMPLETED)
        await asyncio.sleep(0.03) # 30ms updates

def run_http_server():
    # Set allow_reuse_address to True to prevent "Address already in use"
    socketserver.TCPServer.allow_reuse_address = True
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", HTTP_PORT), Handler) as httpd:
        logging.info(f"HTTP server running at http://localhost:{HTTP_PORT}")
        httpd.serve_forever()

async def main():
    # Start Background Threads
    threading.Thread(target=read_from_serial, daemon=True).start()
    threading.Thread(target=run_http_server, daemon=True).start()
    
    # Run the data broadcaster in the background
    asyncio.create_task(broadcast_data())
    
    # Start WebSocket Server and run it forever
    # Bind to 0.0.0.0 to ensure it listens on all available network interfaces
    async with websockets.serve(websocket_handler, "0.0.0.0", WEBSOCKET_PORT):
        logging.info(f"WebSocket server started on ws://localhost:{WEBSOCKET_PORT}")
        await asyncio.Future()  # This runs forever, keeping the server alive to handle connections


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped.")