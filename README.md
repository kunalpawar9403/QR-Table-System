# Smart Restaurant QR Ordering System

## 🌟 Architecture Overview

The system has been consolidated into **two core experiences**:

### 1. 🖥️ One Single Master Dashboard (`/dashboard`)
* **URL:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
* Contains all operational tools in one cohesive interface:
  * **🍳 Kitchen Display (KDS):** Live order tickets with authentic brass bell chime, bump status buttons (`Start Cooking` ➔ `Mark Ready` ➔ `Served`), elapsed timers, and thermal KOT printing.
  * **🪑 Tables & Floor Plan:** Visual floor map of all 10 tables. Click any table to inspect its current check and preview/print its **Acrylic QR Stand**.
  * **📜 Orders & Billing Stream:** Complete audit trail of orders, guest notes, and billing.
  * **🍽️ Menu & 86'd Stock Control:** Live switches to turn menu items in-stock or sold-out across all customer phones.
  * **📱 QR Scanner Simulator:** Side-by-side simulator embedded in the dashboard to test scanning, menu unlocking, and live kitchen chime without leaving the dashboard!

---

### 2. 📱 Customer Phone Web App with Scanner Gate (`/`)
* **URL:** [http://localhost:3000](http://localhost:3000)
* **Scanner Prerequisite:** The menu cards **only show after scanning**!
  * **Step 1:** Customer opens the link or points their phone camera at the acrylic QR stand on their table.
  * **Step 2:** If accessed without a scanned table, the **Scanner Screen** appears with a camera viewfinder or quick 1-tap table selector.
  * **Step 3:** Once scanned (e.g. Table 3 verified 🟢), the full **Spice Garden Menu Cards** unlock with dish photography, customization options, cart drawer, and live progress tracker!
  * **Step 4:** Once submitted, order immediately rings the chime on the Master Dashboard!

---

## 🚀 Production Deployment on Render

This project is configured for **Render** Web Service deployment with persistent WebSockets (Socket.io) and MongoDB Atlas cloud database.

### 1. MongoDB Atlas Setup (Free Cloud Database)
1. Sign up / log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (**M0 Free Tier**).
3. Under **Database Access**, create a user (e.g., `tablemint_admin`) with a secure password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** ➔ **Drivers** (Node.js) and copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/tablemint?retryWrites=true&w=majority
   ```

### 2. Deploy to Render
1. Push this repository to your GitHub account.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** ➔ **Blueprint** (or **Web Service**).
3. Connect your repository. Render automatically reads `render.yaml`.
4. Configure the Environment Variables in Render:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `STAFF_PIN`: 4-digit code for floor staff (e.g. `4829`).
   - `STAFF_SECRET`: (Render generates this automatically via `render.yaml`).
   - `NODE_ENV`: `production`.
5. Click **Deploy**. The build will install dependencies, build the React Vite bundle, and boot the server.
6. TableMint will automatically connect to MongoDB and migrate your menu, tables, and settings on first boot!

