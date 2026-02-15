# 🎓 AIILP: Academic Industry Internship Linkage Platform

[![React](https://img.shields.io/badge/React-2025-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_&_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/SRS_Completion-100%25-brightgreen?style=for-the-badge)](https://github.com/)

**AIILP** is a comprehensive ecosystem designed to bridge the gap between Universities and Software Houses. Beyond the standard SRS requirements, this platform features **AI-driven analytics**, **real-time notifications**, and **automated bulk student onboarding**.

---

## 🖥️ Platform Showcase

### **The Hub & Entry**
*Secure, role-based access for Students, Universities, Software Houses, and Admins.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/1cdf3510-8b35-43f7-8105-5cfca3bb11cb" width="32%" alt="Home"/>
  <img src="https://github.com/user-attachments/assets/0fe0c231-0af8-4b1d-901a-b66ebad0e687" width="32%" alt="Signup"/>
  <img src="https://github.com/user-attachments/assets/7678bada-ce7f-4207-97d6-d1805f2b9dce" width="32%" alt="Login"/>
</div>

### **Admin & Analytics Command Center**
*Extra features: Real-time system monitoring, audit logs, and performance metrics.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/366c088d-617b-4ff0-b1ba-7734e2768352" width="49%" alt="Admin"/>
  <img src="https://github.com/user-attachments/assets/cd1a5367-4ed5-4751-8c3f-49f86c411b33" width="49%" alt="Analytics"/>
</div>

### **Management & Workflow**
*Role-specific modules for user approval, internship vetting, and activity tracking.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/da4fcee7-b67e-4a20-b69c-9ea671020d04" width="24%"/>
  <img src="https://github.com/user-attachments/assets/d5d26b6a-7076-4917-922f-d15ccab14d4d" width="24%"/>
  <img src="https://github.com/user-attachments/assets/be9cfecc-26f6-496e-a17a-82412d244dbf" width="24%"/>
  <img src="https://github.com/user-attachments/assets/0d400309-7229-46b9-abf4-30de58ec45bf" width="24%"/>
</div>

---

## 🔥 Features Beyond the SRS (~35% Extra)

* **🔔 Real-time Notification Engine:** Live toast and bell notifications for application status changes.
* **📈 Multi-Role Analytics:** Visualized trends for internship success rates and user growth.
* **📜 Audit Trail / Activity Logs:** Full accountability system tracking every admin and user action.
* **📁 Intelligent Bulk Upload:** CSV parsing for universities to register thousands of students in < 60s.
* **🖼️ Profile Personalization:** Integrated picture management and secure storage.

---

## 🛠️ Technical Implementation

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, TanStack Query |
| **Backend/DB** | Supabase (PostgreSQL + RLS) |
| **Real-time** | Supabase Realtime Channels |
| **Charts** | Recharts (for Dashboard Analytics) |
| **Auth** | Supabase Auth (JWT & Role-based Routing) |

---

## 📂 Project Architecture



```bash
src/
├── context/      # AuthContext & Supabase session logic
├── hooks/        # useNotifications & useAnalytics custom logic
├── pages/        # Role-based dashboards (Admin, University, SH, Student)
└── utils/        # CSV Parsers & Notification triggers
