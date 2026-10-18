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
