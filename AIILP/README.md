# 🎓 AIILP: Academic Industry Internship Linkage Platform

[![React](https://img.shields.io/badge/React-2025-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_&_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/SRS_Completion-100%25-brightgreen?style=for-the-badge)](https://github.com/)


## 🚨 The Industry Problem: The "Linkage Gap"

Historically, students and guest applicants have struggled with a fragmented internship landscape. **University students** are often limited to local placements, while **Guest/External applicants** have no centralized way to access industry-vetted internships. On the other side, **Software Houses** face an administrative bottleneck when vetting hundreds of manual applications from multiple sources.

## 💡 The Solution: A Unified Internship Ecosystem

**AIILP** is a high-performance linkage platform that centralizes the entire internship lifecycle. It provides a **single, transparent platform** where both university-enrolled students and guest applicants can build professional CVs, apply to industry-vetted roles, and track their status in real-time.

---

## 🖥️ Platform Showcase

### **The Hub & Entry**

*Secure, role-based access for Students, Universities, Software Houses, and Admins.*

<div align="center">
<img src="[https://github.com/user-attachments/assets/1cdf3510-8b35-43f7-8105-5cfca3bb11cb](https://github.com/user-attachments/assets/1cdf3510-8b35-43f7-8105-5cfca3bb11cb)" width="32%" alt="Home"/>
<img src="[https://github.com/user-attachments/assets/0fe0c231-0af8-4b1d-901a-b66ebad0e687](https://github.com/user-attachments/assets/0fe0c231-0af8-4b1d-901a-b66ebad0e687)" width="32%" alt="Signup"/>
<img src="[https://github.com/user-attachments/assets/7678bada-ce7f-4207-97d6-d1805f2b9dce](https://github.com/user-attachments/assets/7678bada-ce7f-4207-97d6-d1805f2b9dce)" width="32%" alt="Login"/>
</div>

### **Admin & Analytics Command Center**

*Featuring real-time system monitoring, audit logs, and performance metrics.*

<div align="center">
<img src="[https://github.com/user-attachments/assets/366c088d-617b-4ff0-b1ba-7734e2768352](https://github.com/user-attachments/assets/366c088d-617b-4ff0-b1ba-7734e2768352)" width="49%" alt="Admin"/>
<img src="[https://github.com/user-attachments/assets/cd1a5367-4ed5-4751-8c3f-49f86c411b33](https://github.com/user-attachments/assets/cd1a5367-4ed5-4751-8c3f-49f86c411b33)" width="49%" alt="Analytics"/>
</div>

---

## 🚀 Advanced System Features

* **🔔 Real-time Notification Engine:** Live toast and bell notifications for instant application status updates via Supabase Realtime.
* **📈 Multi-Role Analytics Dashboards:** Specialized visualization for Admin, University, and Software House stakeholders to track growth and success rates.
* **📜 Immutable Audit Trail:** A full accountability system tracking all administrative actions (approvals, rejections, user management).
* **📁 Intelligent Bulk Onboarding:** High-speed CSV parsing allowing universities to register thousands of students with auto-generated credentials in < 60s.
* **📝 Dynamic CV Management:** A comprehensive form-based interface for students to build and update professional digital CVs directly on the platform.
* **🛡️ Security & Access Control:** Fine-grained Row Level Security (RLS) ensuring that sensitive student data is only visible to authorized organizations.

---

## 🛠️ Technical Implementation

| Layer | Technology |
| --- | --- |
| **Frontend** | React.js, Tailwind CSS, TanStack Query |
| **Backend/DB** | Supabase (PostgreSQL + RLS) |
| **Real-time** | Supabase Realtime Channels |
| **Charts** | Recharts (for Executive Dashboards) |
| **Auth** | Supabase Auth (JWT & Role-based Access) |

---

## 📂 Project Architecture

```bash
src/
├── context/      # AuthContext & Supabase session/role management
├── hooks/        # useNotifications & useAnalytics real-time logic
├── pages/        # Role-based dashboards (Admin, University, SH, Student)
└── utils/        # CSV Parsers, Notification Triggers, & Audit Logging

```

---

## 📫 Connect with the Architect

* **Portfolio**: [asad-portfolio-pi.vercel.app](https://asad-portfolio-pi.vercel.app/)
* **Status**: `SYSTEMS_OPERATIONAL` 🟢

---



