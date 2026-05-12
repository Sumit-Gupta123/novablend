# 🌌 NovaBlend: Zero-Cost AI Photo Editor

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-latest-purple) ![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue) ![License](https://img.shields.io/badge/License-MIT-green)

**NovaBlend** is a fully-featured, browser-based photo editing and collage studio. It leverages modern WebAssembly (WASM) and WebGL to run advanced Artificial Intelligence models directly on the user's device. 

By eliminating the need for cloud-based backend servers and expensive API keys, NovaBlend remains infinitely scalable, entirely private (images never leave your device), and **100% free to host and operate**.

---

## 🎯 Core Capabilities

### 🧠 Client-Side AI Features
*   **Background Eraser:** Instantly removes backgrounds from portraits and objects. Powered by `@imgly/background-removal`, executing a sophisticated segmentation model locally via WASM.
*   **Quality Upscaler:** Makes blurry or low-res images crisp. Uses `UpscalerJS` and `TensorFlow.js` to run super-resolution neural networks on the user's local GPU.

### 🎨 Design Studio
*   **Advanced Typography:** Inject text onto the canvas with live-updating properties (Font Family, Size, Color).
*   **Vector Shapes:** Add and manipulate rectangles, circles, and triangles.
*   **Freehand Draw:** A dynamic brush tool for custom sketching directly over your collages.
*   **Z-Index Layering:** Full control over object overlapping with "Bring Forward" and "Send Backward" mechanics.
*   **Instant Photo Filters:** One-click application of Grayscale or Sepia effects to uploaded assets.

### ⚙️ Workspace Engine
*   **Smart History Stack:** A custom-built History Engine tracks object additions, movements, deletions, and AI modifications, allowing for infinite **Undo / Redo**.
*   **High-Res Export:** Renders the final HTML5 canvas state into a high-quality, 2x resolution PNG file for download.
*   **Immersive UI:** A full-screen, dark-mode-first aesthetic inspired by professional desktop applications.

---

## 🛠️ Technology Stack

*   **Core:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Canvas Manipulation:** [Fabric.js (v6)](http://fabricjs.com/) - *Handles all object rendering, layering, and canvas events.*
*   **AI Models:** 
    *   [@imgly/background-removal](https://img.ly/showcases/cesdk/web/background-removal/web)
    *   [UpscalerJS](https://upscalerjs.com/) & [@tensorflow/tfjs](https://www.tensorflow.org/js)

---

## 📂 Project Structure

```text
novablend/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   └── NovaCanvas.tsx  # THE CORE ENGINE: Contains all Fabric.js & AI logic
│   ├── App.tsx             # Root component wrapper
│   ├── main.tsx            # React DOM entry point (Strict Mode disabled for Fabric)
│   ├── index.css           # Global CSS resets for full-screen rendering
│   
├── index.html              # Main HTML shell
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite bundler configuration

