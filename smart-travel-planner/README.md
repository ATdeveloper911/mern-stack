# 🗺️ Smart Travel Buddy (MERN)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Google-8E75FF?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

**Smart Travel Buddy** is a comprehensive MERN-stack travel planning ecosystem specifically optimized for exploring Pakistan. It goes beyond simple search by integrating **AI Budget Estimation**, **Real-time Geocoding**, and **Interactive Mapping** to provide a 360-degree travel experience.

---

## 📸 Platform Preview

### **The Travel Hub**
*Explore destinations across Pakistan with real-time weather and location insights.*

![Home Page](https://github.com/user-attachments/assets/1826846a-6b6e-4a68-af3e-988dad353ecd)

<div align="center">
  <img src="https://github.com/user-attachments/assets/e1ea6990-d5e9-4c80-a2a8-538d28fd8da0" width="49%" alt="Dashboard"/>
  <img src="https://github.com/user-attachments/assets/5186407c-602e-4486-a38e-aa201d12a0e9" width="49%" alt="Location Info"/>
</div>

### **Intelligence & Mapping**
*AI-driven travel advice and precise Google Maps integration.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/b9421bd8-c062-4930-8f02-5237997c011d" width="32%"/>
  <img src="https://github.com/user-attachments/assets/6b2a61fa-c854-432f-9330-b147dfa9b35c" width="32%"/>
  <img src="https://github.com/user-attachments/assets/0aa52176-9f15-4eff-a5dc-21598f0fe6fd" width="32%"/>
</div>

---

## 🚀 Core Modules

* **🤖 Buddy Bot (Gemini AI):** A context-aware travel assistant for itinerary planning and destination advice.
* **💰 Money Map:** An AI-powered budget calculator that fetches real-time pricing for hotels and transport.
* **📍 Travel Map:** Interactive mapping with **Leaflet** and **Google Maps API** for directions and geocoding.
* **🏦 Travel Fund:** Manage your bucket list and track savings specifically for future trips.
* **☁️ Weather Module:** Integrated 5-day forecast for any Pakistani city via OpenWeatherMap API.
* **🔑 Admin Command Center:** Full CRUD management for destinations, hotel listings, and API key monitoring.

---

## 🛠️ Technical Stack



| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, React Router, Axios, Leaflet |
| **Backend** | Node.js, Express.js, JWT Middleware |
| **Database** | MongoDB (Mongoose ODM) |
| **Mapping** | Google Maps Platform (Directions, Geocoding, Places) |
| **AI Engine** | Google Gemini (Generative Language API) |
| **Weather** | OpenWeatherMap API |

---

## ⚙️ Developer Workflow

The project uses a unified development script to launch both tiers simultaneously.

1. **Clone & Install**
   ```bash
   git clone [https://github.com/your-username/smart-travel-buddy.git](https://github.com/your-username/smart-travel-buddy.git)
   npm run install-all
