# Email Configuration Guide

## Admin Login Verification System

The admin login system uses email verification codes for enhanced security. Before admins can log in, they must:
1. Enter their email address
2. Receive a 6-digit verification code via email
3. Enter the code (valid for 10 minutes)
4. Log in with their password

## Required Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure the following SMTP settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Complaint Box" <no-reply@yourdomain.com>
```

### 2. Gmail Setup (Recommended)

**Step 1: Enable 2-Factor Authentication**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification

**Step 2: Generate App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "Complaint Box"
4. Copy the 16-character password
5. Use this password in `SMTP_PASS`

**Step 3: Update .env**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=abcd-efgh-ijkl-mnop
EMAIL_FROM="Complaint Box System" <your-gmail@gmail.com>
```

### 3. Alternative SMTP Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### SendGrid (Professional)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun (Professional)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Database Schema

### VerificationCode Model

The system stores verification codes in MongoDB:

```typescript
{
  email: string,        // Admin email address
  code: string,         // 6-digit verification code
  expiresAt: Date,      // Expiration timestamp (10 minutes)
  createdAt: Date       // Creation timestamp
}
```

**Features:**
- Automatic cleanup of expired codes (MongoDB TTL index)
- One code per email (old codes are deleted when new ones are generated)
- Codes expire after 10 minutes

## API Endpoints

### Send Verification Code
```http
PATCH /api/auth/admin/send-code
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "message": "Verification code sent successfully"
}
```

### Verify Code
```http
PATCH /api/auth/admin/verify-code
Content-Type: application/json

{
  "email": "admin@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Code verified successfully"
}
```

## Testing

### Without SMTP Configuration
If SMTP is not configured, the system will:
- Log a warning: "SMTP not configured. Emails will not be sent."
- Skip email sending
- **Note:** The verification flow will not work without proper email configuration

### With SMTP Configuration
1. Ensure `.env` has valid SMTP credentials
2. Restart the server
3. Test admin login flow:
   - Navigate to `/admin-login`
   - Enter admin email
   - Check email for 6-digit code
   - Enter code
   - Enter password
   - Should redirect to admin dashboard

## Troubleshooting

### Email Not Received
1. **Check SMTP credentials** - Verify username and password
2. **Check spam folder** - Verification emails might be flagged
3. **Check server logs** - Look for email sending errors
4. **Verify email exists** - Admin user must exist in database with correct email

### Code Expired
- Codes expire after 10 minutes
- Request a new code by going back to Step 1

### Invalid Code Error
- Ensure you're entering the exact 6-digit code
- Code is case-sensitive and must match exactly
- Each code can only be used once

### SMTP Connection Issues
- **Port blocked?** Try port 465 with `SMTP_SECURE=true`
- **Firewall?** Ensure outgoing SMTP connections are allowed
- **Credentials?** Double-check username and password

## Security Features

1. **Email Verification** - Only users with access to the admin email can log in
2. **Time-Limited Codes** - Codes expire after 10 minutes
3. **One-Time Use** - Codes are deleted after successful verification
4. **Database Storage** - Codes stored securely in MongoDB (not in memory)
5. **Auto Cleanup** - MongoDB TTL index automatically removes expired codes
6. **Separate Login Flow** - Admin login is completely separate from student/faculty

## Production Recommendations

1. **Use Professional Email Service**
   - SendGrid, Mailgun, or AWS SES for reliability
   - Gmail/Outlook are fine for development but may have sending limits

2. **Environment Security**
   - Never commit `.env` file to version control
   - Use environment variable management (AWS Secrets Manager, Azure Key Vault)

3. **Rate Limiting**
   - Implement rate limiting on verification endpoints to prevent abuse
   - Example: Max 3 code requests per email per hour

4. **Monitoring**
   - Log all verification attempts
   - Monitor failed verification attempts
   - Alert on unusual patterns

5. **Backup Authentication**
   - Consider implementing backup admin access method
   - Phone SMS verification as alternative
   - Emergency admin recovery process
