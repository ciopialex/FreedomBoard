// --- 1. Imports (Using the Import Map from index.html) ---
import * as THREE from 'three';
// These addons work because of the "three/addons/" mapping in your HTML
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Helper function to create a futuristic texture ---
function createFuturisticTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    // Base color
    context.fillStyle = '#1A1A1A';
    context.fillRect(0, 0, 512, 512);

    // Glowing lines
    context.strokeStyle = '#00FFFF';
    context.lineWidth = 2;
    context.shadowColor = '#00FFFF';
    context.shadowBlur = 10;

    for (let i = 0; i < 50; i++) {
        context.beginPath();
        context.moveTo(Math.random() * 512, Math.random() * 512);
        context.lineTo(Math.random() * 512, Math.random() * 512);
        context.stroke();
    }
    
    // Add some "circuit" like elements
    context.fillStyle = '#00FFFF';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 2;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }

    return new THREE.CanvasTexture(canvas);
}


// --- 2. Scene, Camera & Renderer Setup ---
const canvas = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set background to white

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15); // Centered the cube in the screen

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping; // Better lighting handling

// --- 3. Post-Processing (The "Glow" Effect) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 0.85);
bloomPass.threshold = 0.5;
bloomPass.strength = 0.7;
bloomPass.radius = 0.2;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 4. Cyberpunk Environment ---

// The Grid Floor - more subtle
const gridHelper = new THREE.GridHelper(100, 100, 0xcccccc, 0xdddddd);
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// --- 5. The Cube Model ---

// A pivot point is used to separate the initial "lie flat" rotation from the live rotation
const pivot = new THREE.Group();
scene.add(pivot);

const cubeGeometry = new THREE.BoxGeometry(7, 7, 7);
const futuristicTexture = createFuturisticTexture();
const cubeMaterial = new THREE.MeshStandardMaterial({
    map: futuristicTexture,
    metalness: 0.8,
    roughness: 0.2,
    emissive: '#00FFFF',
    emissiveMap: futuristicTexture,
    emissiveIntensity: 0.5
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

// --- Initial Orientation Adjustment ---
// Rotate the cube 90 degrees on the X-axis so it aligns with the grid's "flat" plane
cube.rotation.x = -Math.PI / 2;

// Add the cube to the pivot group instead of the scene directly
pivot.add(cube);


// --- 6. Axes Helpers (To visualize orientation) ---
const axisLength = 10; // Make axes slightly longer than the cube
const headLength = 1;
const headWidth = 0.5;

// X-Axis (Red)
const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-axisLength / 2, 0, 0), axisLength, 0xff004d, headLength, headWidth);
cube.add(xAxis);

// Y-Axis (Blue)
const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -axisLength / 2, 0), axisLength, 0x00ccff, headLength, headWidth);
cube.add(yAxis);

// Z-Axis (Yellow)
const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -axisLength / 2), axisLength, 0xffcc00, headLength, headWidth);
cube.add(zAxis);

// --- 6a. Axis Labels ---
function createAxisLabel(text, color, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 48;
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1); 
    sprite.position.copy(position);

    return sprite;
}

const xLabel = createAxisLabel('X', '#ff004d', new THREE.Vector3(axisLength / 2 + 1, 0, 0));
cube.add(xLabel);

const yLabel = createAxisLabel('Y', '#00ccff', new THREE.Vector3(0, axisLength / 2 + 1, 0));
cube.add(yLabel);

const zLabel = createAxisLabel('Z', '#ffcc00', new THREE.Vector3(0, 0, axisLength / 2 + 1));
cube.add(zLabel);


// --- 7. WebSocket Logic ---
let latestSensorData = { pitch: 0, roll: 0 };
const readout = document.getElementById('data-readout');

function connectWebSocket() {
    // Connect to port 8889 as defined in your server.py
    const ws = new WebSocket('ws://127.0.0.1:8889');

    ws.onopen = () => {
        console.log('Connected to WebSocket');
        if(readout) {
            readout.innerText = "STATUS: CONNECTED";
            readout.style.color = "#008000";
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.pitch !== undefined && data.roll !== undefined) {
                latestSensorData = data;
                
                // Update the text on screen if it exists
                if(readout) {
                    readout.innerHTML = `PITCH: ${data.pitch.toFixed(2)}<br>ROLL:  ${data.roll.toFixed(2)}`;
                }
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected. Reconnecting in 2s...');
        if(readout) {
            readout.innerText = "STATUS: DISCONNECTED";
            readout.style.color = "#8B0000";
        }
        setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
    };
}

// --- 8. Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // We now apply the live rotation to the PIVOT group, not the cube itself.
    // This preserves our initial "lie flat" rotation.
    
    // Physical Roll from the sensor drives the PIVOT's X-axis rotation
    pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, latestSensorData.roll, 0.1);
    
    // Physical Pitch from the sensor drives the PIVOT's Z-axis rotation
    pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, -latestSensorData.pitch, 0.1);
    
    // Keep Y (yaw) stable at 0 since we don't have a compass
    pivot.rotation.y = 0; 

    // IMPORTANT: Use composer.render() for the Glow effect, NOT renderer.render()
    composer.render();
}

// Handle Window Resizing
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
});

// Start everything
connectWebSocket();
animate();
