# 💻 Local Setup & Development Guide

Follow these instructions to configure, run, and build the Provender platform on your local machine.

---

## 📋 Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (version **18.0.0** or higher is recommended)
*   [npm](https://www.npmjs.com/) (bundled with Node.js) or [Bun](https://bun.sh/) package manager

---

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository
Open your terminal and navigate to your project working directory:
```bash
git clone <repository-url>
cd Project
```

### 2. Install Dependencies
Run the install command to restore all project packages:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root of the project directory to hold your connection keys:
```env
# Supabase Database & Auth configurations
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Replace the values above with your actual Supabase Project URL and Anon API key).*

---

## 🚀 Running the Project

### 🖥️ Run the Development Server
To spin up a local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Once started, the application will run at **`http://localhost:5173/`**.

### ⚙️ Production Build
To compile and bundle assets for production optimization:
```bash
npm run build
```
This generates the optimized build chunks under a newly created `/dist` folder. You can test the production build locally using:
```bash
npm run preview
```

### 🧪 Run Type Checks
To verify that there are no syntax or type errors in the codebase:
```bash
npx tsc --noEmit
```

---

## 💡 Switching Modes: Live vs. Mock Data

The project features a built-in fallback system that enables development even if you aren't connected to a live Supabase instance:

*   **Database Mode (Default)**: Authenticates and stores data directly in your live Supabase PostgreSQL database.
*   **Mock/Local Mode**: Stores sessions and state inside the browser's `localStorage`.
    *   To activate mock mode, append `?mock=role` (e.g., `?mock=owner` or `?mock=delivery`) to your URL parameters when logging in, or select the **Mock Login** options on the Auth interface.
