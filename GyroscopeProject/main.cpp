#include "mbed.h"
#include <stdio.h>
#include <cmath> // For atan2

// I2C Communication
I2C i2c(PTE25, PTE24);

// MMA8451Q I2C Address
const int mma8451_addr = 0x1d << 1;

// MMA8451Q Registers
const char REG_X_MSB = 0x01;
const char REG_STATUS = 0x00;
const char CTRL_REG1 = 0x2A;

// LEDs (Active LOW: 0 = On, 1 = Off)
DigitalOut led_red(LED_RED);
DigitalOut led_green(LED_GREEN);
DigitalOut led_blue(LED_BLUE);

// --- Simple Moving Average (SMA) Filter ---
const int FILTER_WINDOW_SIZE = 10;
static int16_t x_buffer[FILTER_WINDOW_SIZE];
static int16_t y_buffer[FILTER_WINDOW_SIZE];
static int16_t z_buffer[FILTER_WINDOW_SIZE];
static int avg_index = 0;
// --- End Filter ---

// Function to set LED color
// 0: Red, 1: Green, 2: Blue, 3: White
void setLedColor(int colorState) {
    if (colorState == 0) {      // Red
        led_red = 0; led_green = 1; led_blue = 1;
    } else if (colorState == 1) { // Green
        led_red = 1; led_green = 0; led_blue = 1;
    } else if (colorState == 2) { // Blue
        led_red = 1; led_green = 1; led_blue = 0;
    } else if (colorState == 3) { // White (All On)
        led_red = 0; led_green = 0; led_blue = 0;
    }
}

// Function to initialize the MMA8451Q
void initMMA8451Q() {
    char data[2];

    // Wake up the MMA8451Q
    data[0] = CTRL_REG1;
    data[1] = 0x01; // Active mode
    i2c.write(mma8451_addr, data, 2);
}

int main() {
    char data[6];
    int16_t x, y, z;
    float roll;
    
    // We keep pitch for debugging/info, though not strictly used for steps now
    float pitch; 

    int step_count = 0;
    int walk_state = 0; // 0: Neutral, 1: Leg Forward, 2: Leg Back
    int led_counter = 0;

    printf("Program Started\r\n");

    // Initialize the MMA8451Q
    initMMA8451Q();

    // Start Red
    setLedColor(0);

    while (1) {
        // Read the status register
        data[0] = REG_STATUS;
        i2c.write(mma8451_addr, data, 1, true);
        i2c.read(mma8451_addr, data, 1);

        // Check if new data is available
        if (data[0] & 0x08) {
            // Read the X, Y, Z axis data
            data[0] = REG_X_MSB;
            i2c.write(mma8451_addr, data, 1, true);
            i2c.read(mma8451_addr, data, 6);

            // Combine the MSB and LSB data for raw values
            x = (data[0] << 8) | data[1];
            y = (data[2] << 8) | data[3];
            z = (data[4] << 8) | data[5];

            // --- Apply SMA Filter ---
            // Add new values to the circular buffers
            x_buffer[avg_index] = x;
            y_buffer[avg_index] = y;
            z_buffer[avg_index] = z;

            // Increment index and wrap around
            avg_index = (avg_index + 1) % FILTER_WINDOW_SIZE;

            // Calculate the average
            int32_t x_sum = 0, y_sum = 0, z_sum = 0;
            for (int i = 0; i < FILTER_WINDOW_SIZE; i++) {
                x_sum += x_buffer[i];
                y_sum += y_buffer[i];
                z_sum += z_buffer[i];
            }
            int16_t x_avg = x_sum / FILTER_WINDOW_SIZE;
            int16_t y_avg = y_sum / FILTER_WINDOW_SIZE;
            int16_t z_avg = z_sum / FILTER_WINDOW_SIZE;
            // --- End Filter ---

            // Calculate Pitch and Roll from filtered data (in radians)
            pitch = atan2(y_avg, z_avg); // Rotation around X-axis
            roll = atan2(x_avg, z_avg);  // Rotation around Y-axis

            // --- Step Detection Logic (State Machine) ---
            // Observations:
            // Standing: ~1.55
            // Leg Forward (Left leg forward): ~0.90 (< 1.30)
            // Leg Back (Left leg back): ~1.80 (> 1.65)
            
            // State 0: Waiting for Left Leg Forward (Roll drops significantly)
            if (walk_state == 0 && roll < 1.30f) {
                walk_state = 1; 
            }
            // State 1: Transitioning/Waiting for Left Leg Back (Roll rises significantly)
            else if (walk_state == 1 && roll > 1.60f) {
                walk_state = 2;
            }
            // State 2: Completing step (Returning to Neutral range)
            else if (walk_state == 2 && roll < 1.60f && roll > 1.40f) {
                step_count += 2; // 1 Cycle = 2 Steps (Left + Right)
                walk_state = 0;  // Reset state
                
                // Cycle LED Color
                led_counter = (led_counter + 1) % 4;
                setLedColor(led_counter);
            }
            // --- End Step Detection Logic ---

            // Print Pitch, Roll, Steps, and current State for debugging
            printf("PITCH:%.2f,ROLL:%.2f,STEPS:%d,STATE:%d\r\n", pitch, roll, step_count, walk_state);


            //Board is  flat on the table with the PITCH & ROLL at about 0
            
            //Board is  flat on the table upside down with the PITCH & ROLL at about 3

            //Board is in my pocket, I'm standing straight meaning the ROLL is at aprox 1.5-1.6 (when the USB ports are facing up) and minus all that with the ports facing down

            //Meaning most likely the step counter has to do with the roll of the board :)


            //Condition for counting the steps based off of sudden movements of the board, if it exceeds a certain difference, still wondering if I should remove pitch and roll alltogether
        }

        ThisThread::sleep_for(std::chrono::milliseconds(20)); // Approx 50Hz update rate
    }
}
