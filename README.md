<p align="left">
  <img src="https://img.shields.io/badge/Hardware-NXP_FRDM--KL25Z-blue.svg?style=for-the-badge" alt="Hardware" />
  <img src="https://img.shields.io/badge/Sensor-MMA8451Q_Accelerometer-green.svg?style=for-the-badge" alt="Sensor" />
  <img src="https://img.shields.io/badge/Architecture-ARM_Cortex--M0%2B-orange.svg?style=for-the-badge" alt="Arch" />
  <img src="https://img.shields.io/badge/Output-Step_Counter%20%2B%20Motion_GUI-purple.svg?style=for-the-badge" alt="Output" />
</p>

# FRDM-KL25Z Motion Sensor & Visualization Project

This repository contains the source code and firmware for a motion sensing project using the NXP FRDM-KL25Z board (MMA8451Q Accelerometer).

The project evolved through three main stages, all of which are preserved here as pre-compiled binaries.

## 📂 Project Structure

- **`GyroscopeProject/`**: The main C++ source code for the firmware (Mbed OS).
  - `main.cpp`: The core application logic.
  - `PitchRoll_Visualization.bin`: **(Latest)** Firmware for 3D real-time visualization.
  - `StepCounter.bin`: Firmware for counting steps.
  - `XYZ_Terminal.bin`: Firmware that outputs raw X, Y, Z accelerometer data.
- **`3D_Visualization/`**: A web-based 3D visualization tool.
  - `server.py`: Python backend that reads serial data from the board and serves the web page.
  - `index.html` & `visualization.js`: The Three.js frontend.
- **`CommRecorder/`**: A C# utility for recording serial communication data.

## 🚀 Pre-Compiled Firmware Versions

We have included 3 different "flavors" of the firmware in the `GyroscopeProject` folder. You can drag and drop these directly onto your FRDM-KL25Z board to switch modes.

### 1. `XYZ_Terminal.bin` (Basic)
- **Function:** Reads raw data from the accelerometer.
- **Output:** Prints `X`, `Y`, and `Z` axis values directly to the serial terminal.
- **Use Case:** Debugging sensor connections and viewing raw noise levels.

### 2. `PitchRoll_Visualization.bin` (Advanced - Current)
- **Function:** Applies a **Simple Moving Average (SMA)** filter to smooth the data, then calculates **Pitch** and **Roll** angles using `atan2`.
- **Output:** Sends calibrated `PITCH:x.xx,ROLL:y.yy` data over serial at ~30ms intervals (60Hz).
- **Use Case:** Designed to drive the **Real-Time 3D Visualization**.
- **Setup:**
  1. Flash this binary.
  2. Run the python server: `python 3D_Visualization/server.py`
  3. Open `http://localhost:8888` in your browser.

### 3. `StepCounter.bin` (Application)
- **Function:** Implements a step-counting algorithm based on the accelerometer input.
- **Output:** Detects steps and updates a counter.
- **Use Case:** Activity tracking demo.

## 🛠️ Building from Source

This project uses Mbed OS 6. To build it yourself:

1. Ensure you have `mbed-cli` installed.
2. Navigate to `GyroscopeProject`.
3. Run `mbed deploy` to download the `mbed-os` library (excluded from this repo to save space).
4. Run `mbed compile -t GCC_ARM -m KL25Z`.

## 🖥️ 3D Visualization Setup

To run the Cyberpunk-themed 3D board visualization:

1. Flash `PitchRoll_Visualization.bin` to your board.
2. Install Python dependencies:
   ```bash
   pip install websockets pyserial
   ```
3. Run the server:
   ```bash
   cd 3D_Visualization
   python server.py
   ```
4. Visit `http://localhost:8888`.
