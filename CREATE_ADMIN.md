# Creating Admin Users

## Quick Start

To create an admin user, run:

```bash
npm run create-admin
```

This will create an admin user with the following default credentials:
- **Username:** `admin`
- **Email:** `admin@complaintbox.com`
- **Password:** `admin123456`

## Customize Admin Details

Before running the script, you can edit the admin details in:
`src/scripts/createAdmin.ts`

Change these values:
```typescript
const adminData = {
    name: 'Admin User',           // Change admin name
    username: 'admin',             // Change username
    email: 'admin@complaintbox.com', // ⚠️ IMPORTANT: Change to your email
    password: 'admin123456',       // Change default password
    role: 'admin',
    createdBy: 'system',
};
```

## Important Notes

1. **Email is Required:** The admin login system uses email verification. Make sure the email you use is one you have access to.

2. **SMTP Configuration:** Before you can log in as admin, configure SMTP in your `.env` file (see [EMAIL_SETUP.md](EMAIL_SETUP.md))

3. **Security:** Change the default password immediately after first login

4. **One Admin Per Email/Username:** The script will fail if an admin with the same username or email already exists

## Admin Login Process

Once you've created an admin user:

1. Go to the login page
2. Click "Admin Login"
3. Enter your admin email
4. Check your email for the 6-digit verification code
5. Enter the code (valid for 10 minutes)
6. Enter your password
7. Access the admin dashboard

## Manual Admin Creation

You can also manually create an admin user in MongoDB:

```javascript
db.users.insertOne({
    name: "Your Name",
    username: "yourusername",
    email: "your.email@example.com",
    password: "$2a$10$...", // Use bcrypt to hash your password
    role: "admin",
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date()
})
```

**Note:** The password must be bcrypt hashed. Use the script above for automatic hashing.

## Troubleshooting

### "Admin user already exists"
- The username is already taken
- Either use a different username or delete the existing admin user

### "A user already exists with email"
- The email is already registered
- Use a different email or update the existing user's role to 'admin'

### "Admin account not found" during login
- The admin user doesn't exist in the database
- Run `npm run create-admin` to create one
- Make sure the email you're using matches the admin user's email

### Verification code not received
- Check your SMTP configuration in `.env`
- See [EMAIL_SETUP.md](EMAIL_SETUP.md) for email setup instructions
- Check spam folder

## Multiple Admin Users

To create multiple admin users:

1. Edit `src/scripts/createAdmin.ts` with new details
2. Run `npm run create-admin`
3. Repeat for each admin user

Or use the MongoDB shell/Compass to insert additional admin users manually.

## Deleting Admin Users

To remove an admin user:

```bash
# Using MongoDB shell
mongosh
use complaint-box
db.users.deleteOne({ username: "admin", role: "admin" })
```

Or use MongoDB Compass GUI to delete the user.
