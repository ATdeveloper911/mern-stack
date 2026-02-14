# 🩸 BloodLink - Blood Donation Management System

A comprehensive MERN stack application for managing blood donations, connecting donors with recipients, and saving lives through technology.

## 🌟 Features

### Core Features
- **User Management**: Role-based access control (Donor, Recipient, Medical Admin, System Admin)
- **Blood Request Management**: Create, track, and fulfill blood requests
- **Donation Tracking**: Record and monitor blood donations
- **Real-time Notifications**: Instant updates via Socket.IO
- **Geolocation Services**: Find nearby donors and hospitals
- **Analytics Dashboard**: Comprehensive reporting and insights
- **Audit Trail**: Complete system activity logging
- **Data Export**: Export data in multiple formats (CSV, Excel, PDF)

### Advanced Features
- **Predictive Analytics**: Blood demand forecasting
- **Mobile-First Design**: Responsive across all devices
- **Real-time Matching**: AI-powered donor-recipient matching
- **Medical Integration**: Hospital system integration
- **Emergency Alerts**: Critical blood request notifications
- **Multi-language Support**: Internationalization ready

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blood_donations_system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   **Backend (.env)**
   ```bash
   cp backend/env.example backend/.env
   ```
   
   Update `backend/.env` with your MongoDB connection string:
   ```
   MONGO_URI=mongodb+srv://awais:awais123456@cluster0.slr4sml.mongodb.net/?appName=Cluster0
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=1h
   NODE_ENV=development
   PORT=5000
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend (.env)**
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   
   Update `frontend/.env` with your configuration:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Start the application**
   
   **Option 1: Single command (Recommended)**
   ```bash
   npm start
   ```
   
   **Option 2: Using concurrently**
   ```bash
   npm run dev
   ```
   
   **Option 3: Platform-specific scripts**
   
   **Windows:**
   ```cmd
   start.bat
   ```
   
   **Linux/Mac:**
   ```bash
   ./start.sh
   ```
   
   All methods will start both backend (port 5000) and frontend (port 3000) servers simultaneously.

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/health

## 🏗️ Project Structure

```
blood_donations_system/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database configuration
│   ├── middleware/         # Custom middleware
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── socket/            # Socket.IO handlers
│   ├── utils/             # Utility functions
│   └── server.js          # Main server file
├── frontend/              # React.js frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── layouts/       # Layout components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── package.json
└── package.json           # Root package.json
```

## 🎯 User Roles

### Donor
- Register and manage profile
- View donation history
- Receive blood request notifications
- Update availability status

### Recipient
- Create blood requests
- Track request status
- Find compatible donors
- Manage urgent requests

### Medical Administrator
- Verify donations
- Manage blood requests
- Access medical reports
- Monitor system health

### System Administrator
- User management
- System configuration
- Audit trail access
- Data export capabilities

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgotpassword` - Forgot password
- `PUT /api/auth/resetpassword/:token` - Reset password

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users` - Get all users (Admin)

### Blood Requests
- `POST /api/blood-requests` - Create blood request
- `GET /api/blood-requests` - Get all requests
- `GET /api/blood-requests/my-requests` - Get user's requests
- `PUT /api/blood-requests/:id/status` - Update request status

### Donations
- `POST /api/donations` - Record donation
- `GET /api/donations` - Get all donations
- `GET /api/donations/my-donations` - Get user's donations
- `PUT /api/donations/:id/status` - Update donation status

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## 🔌 Real-time Features

The application uses Socket.IO for real-time communication:

- **Live Notifications**: Instant notification delivery
- **Blood Request Updates**: Real-time status changes
- **Donation Tracking**: Live donation updates
- **Emergency Alerts**: Critical notifications
- **User Activity**: Online status and activity

## 📱 Mobile Responsiveness

The application is built with mobile-first design:

- **Responsive Layout**: Adapts to all screen sizes
- **Touch-Friendly**: Optimized for mobile interactions
- **Progressive Web App**: Can be installed on mobile devices
- **Offline Support**: Basic functionality without internet

## 🎨 Design System

### Color Palette
- **Primary**: Blood Red (#ff0000)
- **Secondary**: Various blood type colors
- **Neutral**: Gray scale for text and backgrounds
- **Status**: Green (success), Red (error), Blue (info), Yellow (warning)

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, accessible font sizes
- **Mobile**: Optimized for small screens

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run all tests
npm run test:all
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas
2. Configure environment variables
3. Deploy to Heroku, AWS, or similar platform

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to Vercel, Netlify, or similar platform
3. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@bloodlink.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 🙏 Acknowledgments

- Medical professionals who provided insights
- Open source community for amazing tools
- Blood donation organizations for inspiration

---

**Made with ❤️ for saving lives** 🩸