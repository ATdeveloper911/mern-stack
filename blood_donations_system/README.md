

---

# 🩸 BloodLink: Life-Saving Management System

[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)[![React(https://img.shields.io/badge/React-2025-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)[![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

**BloodLink** is a mission-critical MERN stack application designed to bridge the gap between blood donors and recipients. It features real-time matching, automated medical verification, and a multi-tiered administrative dashboard to ensure every drop counts.

---

## 🧩 The Problem vs. Our Solution

Before BloodLink, blood donation was hindered by manual record-keeping and slow communication. Here is how we engineered the fix:

* 
**The Problem:** Delayed response times during critical blood shortages.


* 
**The Solution:** **Real-time Socket.IO alerts** that notify compatible donors within a 10km radius instantly when a "Critical" request is created.




* 
**The Problem:** Risks to donor and recipient health due to lack of medical history tracking.


* 
**The Solution:** An **Eligibility Interval Enforcement** system that blocks donations if the 56-day cooldown period hasn't passed.




* 
**The Problem:** High administrative workload in verifying donors.


* 
**The Solution:** **Automated Eligibility Logic** that pre-filters users based on BMI and age before they even reach the medical queue.





---

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

## 🚀 10 Core Features

1. 
**Authentication & Authorization:** Secure RBAC for four distinct user roles (Donor, Recipient, Medical Admin, System Admin) using JWT and Bcrypt.


2. 
**User Management:** Detailed medical profile tracking including BMI, blood type, and disease history.


3. 
**Blood Request Management:** Urgency-based matching (Low to Critical) with automated compatibility checks.


4. 
**Donation Lifecycle:** Full traceability from "Scheduled" to "Distributed" status.


5. 
**Notification System:** Real-time push notifications via Socket.IO supplemented by Email alerts.


6. 
**Analytics & Reporting:** Visual dashboards for trend analysis and blood supply forecasting.


7. 
**Medical Verification:** Admin-led workflows to approve or reject donor eligibility based on medical history.


8. 
**Audit Trail:** Comprehensive activity logging for security and accountability (HIPAA/GDPR principles).


9. 
**Data Export:** Exporting records in PDF and CSV formats for offline analysis.


10. 
**System Settings:** Global configuration for donation intervals and request expiry periods.



---

## 🛠️ Technical Stack

| Component | Technology |
| --- | --- |
| **Frontend** | React.js, Tailwind CSS (Mobile-first) 

 |
| **Backend** | Node.js, Express.js 

 |
| **Database** | MongoDB (Mongoose ODM) 

 |
| **Real-time** | Socket.io 

 |
| **Security** | JWT, Bcrypt, & HTTPS Encryption 

 |
| **Services** | Cloudinary (Files) & Nodemailer (SMTP) 

 |

---

Would you like me to generate the **detailed installation guide** or perhaps the **API Endpoint documentation** to add more technical weight to the repo?
