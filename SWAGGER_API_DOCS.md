# Swagger API Documentation

This document provides information about the Swagger API documentation and utility routes added to the Complaint Box Backend.

## 📚 API Documentation

### Accessing Swagger UI

Once the server is running, you can access the interactive Swagger API documentation at:

**Development:**
```
http://localhost:3000/api-docs
```

**Production:**
```
https://your-production-url.vercel.app/api-docs
```

### Swagger JSON

You can also access the raw Swagger specification in JSON format at:
```
http://localhost:3000/api-docs.json
```

## 🔑 JWT Secret Generator

A new utility endpoint has been added to generate secure JWT secrets.

### Generate JWT Secret

**Endpoint:** `POST /api/utils/generate-jwt-secret`

**Description:** Generates a cryptographically secure random JWT secret string that can be used as `JWT_SECRET` in environment variables.

**Request Body (Optional):**
```json
{
  "length": 64
}
```

**Response:**
```json
{
  "secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "length": 128,
  "message": "Copy this secret and add it to your .env file as JWT_SECRET",
  "usage": "JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6..."
}
```

**Usage Example:**

```bash
# Using curl
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret \
  -H "Content-Type: application/json" \
  -d '{"length": 64}'

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/utils/generate-jwt-secret" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"length": 64}'
```

**Parameters:**
- `length` (optional): Number of bytes for the secret (default: 64, min: 32, max: 256)
  - The resulting hex string will be twice the length in characters

### Hash Password Utility

**Endpoint:** `POST /api/utils/hash-password`

**Description:** Utility endpoint to hash passwords using bcrypt for testing or admin creation.

**Request Body:**
```json
{
  "password": "mySecurePassword123"
}
```

**Response:**
```json
{
  "hash": "$2a$10$X1.2Y3.4Z5.6A7.8B9.0C1.2D3.4E5.6F7.8G9.0H1.2I3.4J5.6K",
  "message": "Password hashed successfully"
}
```

## 📖 Available API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `PATCH /api/auth/admin/send-code` - Send verification code to admin email
- `PATCH /api/auth/admin/verify-code` - Verify admin code
- `POST /api/auth/admin/login` - Admin login

### Complaints (`/api/complaints`)

- `GET /api/complaints` - Get all complaints (filtered by role)
- `GET /api/complaints/:id` - Get single complaint
- `POST /api/complaints` - Create new complaint (students only)
- `PUT /api/complaints/:id` - Update complaint
- `PATCH /api/complaints/:id/status` - Update complaint status (faculty only)
- `DELETE /api/complaints/:id` - Delete complaint
- `PATCH /api/complaints/:id/read` - Mark complaint as read

### Users (`/api/users`)

- `GET /api/users` - Get all users (faculty/admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user (faculty only)
- `DELETE /api/users/:id` - Delete user

### Utilities (`/api/utils`)

- `POST /api/utils/generate-jwt-secret` - Generate JWT secret
- `POST /api/utils/hash-password` - Hash a password

### Health

- `GET /api/health` - Health check
- `GET /api` - API information

## 🔐 Authentication

Most endpoints require authentication using a JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

In Swagger UI, click the "Authorize" button at the top and enter your token in the format:
```
Bearer <your-token>
```

## 🚀 Getting Started

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open Swagger UI:**
   Navigate to `http://localhost:3000/api-docs` in your browser

3. **Generate a JWT Secret (if needed):**
   ```bash
   curl -X POST http://localhost:3000/api/utils/generate-jwt-secret
   ```

4. **Copy the secret to your `.env` file:**
   ```
   JWT_SECRET=<generated-secret>
   ```

## 📝 Swagger Configuration

The Swagger configuration is located at:
```
src/config/swagger.ts
```

The configuration includes:
- API metadata (title, version, description)
- Server URLs (development and production)
- Security schemes (Bearer JWT authentication)
- Common schema definitions (User, Complaint, Error, Success)

## 🔧 Customization

You can customize the Swagger UI appearance by modifying the options in `src/server.ts`:

```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Complaint Box API Documentation',
    customfavIcon: '/favicon.ico'
}));
```

## 📦 Dependencies

The following packages were added for Swagger support:

- `swagger-ui-express` - Swagger UI middleware for Express
- `swagger-jsdoc` - Generate Swagger spec from JSDoc comments
- `@types/swagger-ui-express` - TypeScript types
- `@types/swagger-jsdoc` - TypeScript types

## 🎯 Best Practices

1. **Keep documentation up-to-date:** When adding new endpoints, always add Swagger annotations
2. **Use proper HTTP status codes:** Follow REST conventions
3. **Include examples:** Provide example request/response bodies
4. **Document authentication requirements:** Clearly mark which endpoints require auth
5. **Use schema references:** Reuse schema definitions with `$ref` to avoid duplication

## 🐛 Troubleshooting

**Issue:** Swagger UI not loading
- **Solution:** Ensure server is running and visit the correct URL

**Issue:** Endpoints not appearing in Swagger
- **Solution:** Check that the route file is included in the `apis` array in `swagger.ts`

**Issue:** Authentication not working in Swagger UI
- **Solution:** Make sure to include "Bearer " prefix before the token

## 📚 Additional Resources

- [Swagger Documentation](https://swagger.io/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.0)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)
