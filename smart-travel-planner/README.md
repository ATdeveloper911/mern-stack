# 🗺️ Smart Travel Buddy (MERN)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Google-8E75FF?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

**Smart Travel Buddy** is a comprehensive MERN-stack travel planning ecosystem specifically optimized for exploring Pakistan. It goes beyond simple search by integrating **AI Budget Estimation**, **Real-time Geocoding**, and **Interactive Mapping** to provide a 360-degree travel experience.

---

## 📸 Platform Preview

### 🏠 **Home & Dashboard**
Experience the central hub of your travel planning journey.

<p align="center">
  <img src="https://github.com/user-attachments/assets/1826846a-6b6e-4a68-af3e-988dad353ecd?raw=true" width="80%" alt="Home Page"/>
  <br />
  <em>The Travel Hub - Your starting point for exploring Pakistan</em>
</p>

<p align="center">
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/dashboard.png?raw=true" width="45%" alt="User Dashboard"/>
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/travel-hub.png?raw=true" width="45%" alt="Travel Hub"/>
  <br />
  <em>User Dashboard (left) & Travel Hub (right)</em>
</p>

---

### 🎯 **Core Features Showcase**

<table>
  <tr>
    <td width="33%" align="center">
      <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/travel-map.png?raw=true" width="100%" alt="Travel Map"/>
      <br />
      <strong>🗺️ Travel Map</strong>
      <br />
      <sub>Interactive mapping with directions & geocoding</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/chatbot.png?raw=true" width="100%" alt="Chat Bot"/>
      <br />
      <strong>🤖 Buddy Bot</strong>
      <br />
      <sub>AI-powered travel assistant (Gemini AI)</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/money-map.png?raw=true" width="100%" alt="Money Map"/>
      <br />
      <strong>💰 Money Map</strong>
      <br />
      <sub>AI budget calculator with real-time pricing</sub>
    </td>
  </tr>
</table>

---

### 🔐 **Authentication Flow**

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/signup.png?raw=true" width="100%" alt="Sign Up"/>
        <br />
        <strong>📝 Sign Up</strong>
      </td>
      <td align="center">
        <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/login.png?raw=true" width="100%" alt="Login"/>
        <br />
        <strong>🔑 Login</strong>
      </td>
    </tr>
    <tr>
      <td align="center" colspan="2">
        <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/reset-password.png?raw=true" width="100%" alt="Reset Password"/>
        <br />
        <strong>🔄 Reset Password</strong>
      </td>
    </tr>
  </table>
</div>

---

### ⚡ **Quick Actions & Utilities**

<div align="center">
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/quick-actions.png?raw=true" width="80%" alt="Quick Actions"/>
  <br />
  <em>Quick Actions Menu</em>
</div>

---

### 🌤️ **Smart Weather Integration**

<p align="center">
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/weather-1.png?raw=true" width="45%" alt="Weather View 1"/>
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/weather-2.png?raw=true" width="45%" alt="Weather View 2"/>
  <br />
  <em>5-day weather forecast for any Pakistani city</em>
</p>

---

### ⚙️ **Settings & Configuration**

<p align="center">
  <img src="https://github.com/YOUR_USERNAME/smart-travel-buddy/blob/main/screenshots/settings.png?raw=true" width="80%" alt="Settings"/>
  <br />
  <em>User Settings Panel</em>
</p>

---

## 🚀 Core Modules

| Module | Description | Key Features |
|:-------|:------------|:-------------|
| 🤖 **Buddy Bot** | Context-aware travel assistant | Itinerary planning, destination advice, Gemini AI powered |
| 💰 **Money Map** | AI-powered budget calculator | Real-time pricing for hotels & transport |
| 🗺️ **Travel Map** | Interactive mapping solution | Leaflet + Google Maps API, directions, geocoding |
| 🏦 **Travel Fund** | Bucket list & savings tracker | Trip goals, progress monitoring |
| ☁️ **Weather Module** | Integrated forecast system | 5-day forecasts via OpenWeatherMap |
| 🔑 **Admin Center** | Full platform control | CRUD operations, API key monitoring |

---

## 🛠️ Technical Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 18, React Router, Axios, Leaflet |
| **Backend** | Node.js, Express.js, JWT Authentication |
| **Database** | MongoDB with Mongoose ODM |
| **Mapping** | Google Maps Platform (Directions, Geocoding, Places) |
| **AI Engine** | Google Gemini (Generative Language API) |
| **Weather** | OpenWeatherMap API |

---

## ⚙️ Developer Workflow

The project uses a unified development script to launch both tiers simultaneously.

### 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smart-travel-buddy.git
   cd smart-travel-buddy

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Create .env files in both client and server directories
   # Add your API keys for:
   # - MongoDB Atlas
   # - Google Maps
   # - Google Gemini AI
   # - OpenWeatherMap
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

---

## 📝 License

[MIT](https://choosealicense.com/licenses/mit/)

---

<p align="center">
  Made with ❤️ for travelers exploring Pakistan
</p>
```
