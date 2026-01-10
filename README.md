# Complaint Box Backend API

Backend API server for the Complaint Box application built with Express, TypeScript, and MongoDB.

## Features

- User authentication (JWT-based)
- Role-based access control (Student/Faculty)
- Complaint management (CRUD operations)
- Status tracking with history
- File upload support (attachments)
- RESTful API design

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `server` directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/complaint-box
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
# Optional - email notifications (SMTP)
SMTP_HOST=smtp.mailprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM="Complaint Box" <no-reply@yourdomain.com>
# Optional - frontend URL used in notification links
FRONTEND_URL=http://localhost:5173
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Complaints
- `GET /api/complaints` - Get all complaints (filtered by role)
- `GET /api/complaints/:id` - Get single complaint
- `POST /api/complaints` - Create new complaint (Student only)
- `PUT /api/complaints/:id` - Update complaint
- `PATCH /api/complaints/:id/status` - Update complaint status (Faculty only)
- `DELETE /api/complaints/:id` - Delete complaint

### Users
- `GET /api/users` - Get all users (Faculty only)
- `GET /api/users/:id` - Get single user

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Database Models

### User
- Basic user information
- Role-based access (student/faculty)
- Password hashing with bcrypt

### Complaint
- Complaint details and metadata
- Status tracking with history
- Student and faculty associations

## Error Handling

The API returns standardized error responses:
```json
{
  "status": "error",
  "error": "Error message"
}
```

## Development

- TypeScript for type safety
- Express for routing
- Mongoose for MongoDB ODM
- JWT for authentication
- Express Validator for input validation

