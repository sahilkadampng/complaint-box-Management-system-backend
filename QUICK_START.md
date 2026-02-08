# Admin Setup - Quick Start Guide

## Step 1: Create Admin User

Run this command to create an admin user:

```bash
cd "c:\complaint box-2 - Copy backend\server"
npm run create-admin
```

**Default Credentials:**
- Email: `admin@complaintbox.com`
- Username: `admin`
- Password: `admin123456`

> ⚠️ **Important:** Edit `src/scripts/createAdmin.ts` to change the email to your actual email address before running!

## Step 2: Configure Email (SMTP)

Update `.env` file with your email settings:

```env
# For Gmail (Recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Complaint Box" <your-email@gmail.com>
```

### Gmail Setup:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Create app password for "Mail"
5. Copy the 16-character password
6. Paste it in `SMTP_PASS`

See [EMAIL_SETUP.md](EMAIL_SETUP.md) for other email providers.

## Step 3: Start the Backend Server

```bash
npm run dev
```

## Step 4: Test Admin Login

1. Open frontend: http://localhost:5173
2. Click "Admin Login" button
3. Enter admin email: `admin@complaintbox.com`
4. Click "Send Verification Code"
5. Check your email for 6-digit code
6. Enter the code
7. Enter password: `admin123456`
8. You should be redirected to Admin Dashboard

## Troubleshooting

### "Admin account not found"
**Solution:** You haven't created an admin user yet.
```bash
npm run create-admin
```

### "Verification code not sent" or email not received
**Solution:** SMTP is not configured properly.
1. Check `.env` file has correct SMTP settings
2. Verify Gmail app password is correct
3. Check spam/junk folder
4. Restart backend server after changing `.env`

### "Admin user already exists"
**Solution:** Admin user was already created.
- Check MongoDB for existing admin user
- Or use different username/email in the script

### Login redirects to Faculty Dashboard
**Solution:** This shouldn't happen anymore. The signup page no longer has admin option. Admin users can only be created via the script.

## Complete Admin Workflow

```
┌─────────────────────────────────────────────────┐
│  1. npm run create-admin                        │
│     ↓ Creates admin in MongoDB                  │
│  2. Configure SMTP in .env                      │
│     ↓ Enable email sending                      │
│  3. npm run dev                                 │
│     ↓ Start backend server                      │
│  4. Go to /admin-login                          │
│     ↓ Frontend admin login page                 │
│  5. Enter admin email                           │
│     ↓ Backend checks if admin exists            │
│  6. Backend sends 6-digit code via email        │
│     ↓ Code stored in MongoDB (10min expiry)     │
│  7. Check email, enter code                     │
│     ↓ Backend verifies code                     │
│  8. Enter password                              │
│     ↓ Backend validates password                │
│  9. JWT token generated                         │
│     ↓ Authenticated as admin                    │
│  10. Redirect to /admin-dashboard               │
└─────────────────────────────────────────────────┘
```

## Security Features

✅ **Email Verification** - Requires access to admin email
✅ **Time-Limited Codes** - Codes expire in 10 minutes
✅ **One-Time Use** - Codes deleted after verification
✅ **Database Storage** - Codes stored in MongoDB
✅ **Separate Login** - Admin login isolated from student/faculty
✅ **No Self-Registration** - Admin users can only be created via script

## Quick Commands Reference

```bash
# Backend
cd "c:\complaint box-2 - Copy backend\server"
npm run dev              # Start backend server
npm run create-admin     # Create admin user

# Frontend
cd "c:\complaint box-2\complaint-box4"
npm run dev             # Start frontend

# MongoDB (if using local)
mongosh                 # Connect to MongoDB
use complaint-box       # Switch to database
db.users.find({ role: "admin" })  # List admin users
```

## Next Steps

1. ✅ Create admin user
2. ✅ Configure SMTP
3. ✅ Test admin login
4. 🔄 Change default password after first login
5. 🔄 Create additional admin users if needed
6. 🔄 Review admin dashboard features

## Files Modified/Created

**Backend:**
- ✅ `src/models/VerificationCode.ts` - Database model for codes
- ✅ `src/routes/auth.ts` - Admin verification endpoints
- ✅ `src/services/userService.ts` - Email lookup for admin
- ✅ `src/scripts/createAdmin.ts` - Admin creation script
- ✅ `.env` - SMTP configuration
- ✅ `package.json` - Added `create-admin` script

**Frontend:**
- ✅ `src/pages/AdminLogin.tsx` - 3-step verification UI
- ✅ `src/pages/Login.tsx` - Admin login button
- ✅ `src/pages/register.tsx` - Admin option removed
- ✅ `src/context/AuthContext.tsx` - Admin role support
- ✅ `src/App.tsx` - Admin login route

**Documentation:**
- ✅ `EMAIL_SETUP.md` - Email configuration guide
- ✅ `CREATE_ADMIN.md` - Admin user creation guide
- ✅ `QUICK_START.md` - This file

## Support

If you encounter issues:
1. Check all steps were completed in order
2. Verify `.env` file has correct credentials
3. Check backend console logs for errors
4. Ensure MongoDB is running and accessible
5. Restart both frontend and backend servers
