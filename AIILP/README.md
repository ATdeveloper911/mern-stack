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
  <img src="https://github.com/user-attachments/assets/1cdf3510-8b35-43f7-8105-5cfca3bb11cb" width="32%" alt="Home"/>
  <img src="https://github.com/user-attachments/assets/0fe0c231-0af8-4b1d-901a-b66ebad0e687" width="32%" alt="Signup"/>
  <img src="https://github.com/user-attachments/assets/7678bada-ce7f-4207-97d6-d1805f2b9dce" width="32%" alt="Login"/>
</div>

### **Admin & Analytics Command Center**
*Extra features: Real-time system monitoring, audit logs, and performance metrics.*

<div align="center">
  <img src="https://github.com/user-attachments/assets/366c088d-617b-4ff0-b1ba-7734e2768352" width="49%" alt="Admin"/>
  <img src="https://github.com/user-attachments/assets/cd1a5367-4ed5-4751-8c3f-49f86c411b33" width="49%" alt="Analytics"/>
  <img src="https://github.com/user-attachments/assets/ead22273-9f86-4ef3-9987-fc3419e3cc8d" width="49%" alt="Analytics2"/>

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

## 🛠️ Comprehensive Feature Suite

### 👨‍💻 Student & Guest Features

* **CV Form Creation:** A comprehensive, multi-section interface for personal, educational, and professional data.
* **Internship Application:** One-click submission system with built-in validation to prevent duplicate applications.
* **Real-time Status Tracking:** Live tracking of application states: Pending, Reviewing, Accepted, or Rejected.
* **Application Withdrawal:** Ability for students to withdraw pending applications directly from their dashboard.
* **Personalized Profile Management:** Integrated profile picture management and secure data updates.
* **Interactive Search:** Real-time search and filtering for internships by title, description, or software house.

### 🏢 Software House Features

* **Internship Management:** Complete lifecycle management for posting, editing, and deleting internship listings.
* **Applicant Vetting Dashboard:** Streamlined interface to view all applicants, review CVs, and update statuses.
* **Acceptance Rate Metrics:** Specialized analytics tracking acceptance rates and monthly application trends.
* **Real-time Notifications:** Instant alerts for new applications and administrative approval status.

### 🏫 University Features

* **Bulk Student Onboarding:** Intelligent CSV parsing to register thousands of students with auto-generated credentials in under 60 seconds.
* **Student Oversight:** A dedicated management portal to view all enrolled students and track their application history.
* **University Analytics:** Visualized trends for student engagement and internship success rates.
* **Notification Center:** Real-time alerts for student application milestones.

### 🛡️ Administrative Command Center

* **Comprehensive User Management:** Ability to approve, reject, activate, or deactivate any user account.
* **Listing Vetting:** Manual approval workflow for all software house registrations and internship postings.
* **Immutable Audit Logs:** A high-level activity log tracking every administrative action for 100% accountability.
* **Executive Dashboard:** Real-time monitoring of user growth, role distribution, and platform activity trends.

---
## 🔥 Technical System Capabilities

* **🔔 Notification Engine:** Live toast and bell notifications powered by Supabase Realtime Channels.
* **📈 Advanced Analytics:** Data visualization using Recharts for trend analysis and performance metrics.
* **🛡️ Data Security:** Fine-grained Row Level Security (RLS) ensuring that sensitive medical or personal data is strictly protected.
* **⚡ High Performance:** Optimized to handle 1,000+ concurrent read operations and bulk data processing.

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



