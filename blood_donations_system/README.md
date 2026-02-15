# 🩸 BloodLink: Life-Saving Management System

[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-2025-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

**BloodLink** is a mission-critical MERN stack application designed to bridge the gap between blood donors and recipients. It features real-time matching, automated medical verification, and a multi-tiered administrative dashboard to ensure every drop counts.

---

## 🖥️ System Showcase

### **Dashboard Ecosystem**
*A unified interface for Donors, Medical Staff, and System Administrators.*

![Home Page](https://github.com/user-attachments/assets/a22c6e94-3e44-4776-a85c-1b7313cb71e6)

<div align="center">
  <img src="https://github.com/user-attachments/assets/d2c52369-7f85-45a5-a27c-e3d57790577e" width="49%" alt="System Admin"/>
  <img src="https://github.com/user-attachments/assets/431f9762-e12b-41a7-bff6-b8c964d7f656" width="49%" alt="Medical Admin"/>
</div>

### **Donor & Inventory Management**
*Efficient tracking of donations and verified digital receipts.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/90049036-6320-4c3c-9910-21946be76707" width="32%"/>
  <img src="https://github.com/user-attachments/assets/e70ffcd9-a88e-4df9-9b91-72432fcb4e20" width="32%"/>
  <img src="https://github.com/user-attachments/assets/e262f4fe-5627-4c16-aa86-8dd5239b45b0" width="32%"/>
</div>

---

## 🚀 Core Capabilities

* **⚡ Real-time Matching:** Uses Socket.io to instantly notify compatible donors when an emergency request is created.
* **🛡️ Role-Based Access (RBAC):** Secure gateways for Donors, Recipients, Medical Admins, and System Super-Admins.
* **📊 Advanced Analytics:** Visualized data for blood demand forecasting and regional inventory levels.
* **📑 Digital Audit Trail:** Every donation, request, and verification is logged for medical accountability.
* **📱 Fully Responsive:** Built with a mobile-first approach using Tailwind/Bootstrap for on-the-go access.

---

## 🛠️ Technical Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React.js, Context API, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.io |
| **Auth** | JWT (JSON Web Tokens) & BcryptJS |
| **Deployment** | Vercel (Frontend), Render/AWS (Backend) |

---

## ⚙️ Installation & Setup

1. **Clone the Project**
   ```bash
   git clone [https://github.com/yourusername/bloodlink.git](https://github.com/yourusername/bloodlink.git)
   cd bloodlink
