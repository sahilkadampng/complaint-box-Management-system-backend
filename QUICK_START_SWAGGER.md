# Quick Start Guide - Swagger & JWT Generator

## 🚀 Quick Access

### Swagger Documentation
```
http://localhost:3000/api-docs
```

### Generate JWT Secret
```bash
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret
```

## 📋 Step-by-Step Setup

### 1. Start the Server
```bash
cd "complaint box-2 - Copy backend\server"
npm install  # if not already done
npm run dev
```

### 2. Generate JWT Secret
```bash
# Using PowerShell (Windows)
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/utils/generate-jwt-secret" -Method POST
Write-Host "JWT_SECRET=$($result.secret)"

# Using curl (Linux/Mac/Windows)
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret

# Or just run the test script
npm run test-jwt
```

### 3. Update .env File
Copy the generated secret to your `.env` file:
```env
JWT_SECRET=your-generated-secret-here
```

### 4. Access Swagger UI
Open your browser and navigate to:
```
http://localhost:3000/api-docs
```

## 🎯 Common Tasks

### Browse All API Endpoints
1. Go to `http://localhost:3000/api-docs`
2. Expand any section (Auth, Complaints, Users, Utils, Health)
3. Click on an endpoint to see details

### Test an Endpoint
1. Open Swagger UI at `http://localhost:3000/api-docs`
2. Find the endpoint you want to test
3. Click "Try it out"
4. Fill in required parameters
5. Click "Execute"
6. View the response

### Authenticate in Swagger UI
1. Register or login to get a JWT token:
   - POST `/api/auth/signup` or `/api/auth/login`
   - Copy the `token` from the response
2. Click the "Authorize" button at the top
3. Enter: `Bearer <your-token>`
4. Click "Authorize"
5. Now you can test protected endpoints

### Generate a New JWT Secret
```bash
# Default length (64 bytes = 128 hex characters)
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret

# Custom length (32 bytes = 64 hex characters)
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret \
  -H "Content-Type: application/json" \
  -d '{"length": 32}'
```

### Hash a Password
```bash
curl -X POST http://localhost:3000/api/utils/hash-password \
  -H "Content-Type: application/json" \
  -d '{"password": "myPassword123"}'
```

## 📝 Example Workflow

### 1. Setup Environment
```bash
# Generate JWT secret
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret > secret.json

# Extract secret (PowerShell)
$secret = (Get-Content secret.json | ConvertFrom-Json).secret
Add-Content .env "JWT_SECRET=$secret"
```

### 2. Create Admin Account
```bash
# Using the create-admin script
npm run create-admin
```

### 3. Test Authentication
1. Go to `http://localhost:3000/api-docs`
2. Find `POST /api/auth/login`
3. Click "Try it out"
4. Enter credentials
5. Copy the token from response
6. Click "Authorize" and paste token
7. Test other endpoints

## 🔍 Troubleshooting

### Server not starting?
```bash
# Check if port 3000 is available
netstat -ano | findstr :3000

# Try a different port
$env:PORT=3001
npm run dev
```

### Swagger UI not loading?
1. Ensure server is running
2. Clear browser cache
3. Check console for errors
4. Verify `/api-docs` path

### JWT secret not working?
```bash
# Generate a new one
curl -X POST http://localhost:3000/api/utils/generate-jwt-secret

# Restart server after updating .env
```

### Authentication failing?
1. Check token format: `Bearer <token>` (note the space)
2. Verify token hasn't expired (default: 7 days)
3. Check JWT_SECRET in .env matches the one used to generate token

## 📚 Documentation Links

- **Detailed Swagger Guide:** [SWAGGER_API_DOCS.md](./SWAGGER_API_DOCS.md)
- **Implementation Summary:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Main README:** [README.md](./README.md)

## 🎓 Learning Resources

### Understanding Swagger/OpenAPI
- **What is it?** A specification for describing REST APIs
- **Benefits:** Interactive testing, automatic documentation, client generation
- **Format:** JSON/YAML describing endpoints, parameters, responses

### Understanding JWT
- **What is it?** JSON Web Token for stateless authentication
- **Structure:** Header.Payload.Signature
- **Security:** Secret-based signing prevents tampering

## ⚡ Pro Tips

1. **Use Tags:** Swagger groups endpoints by tags (Auth, Complaints, etc.)
2. **Try Examples:** Each endpoint has example request/response
3. **Export Collection:** Download OpenAPI spec to import into Postman
4. **Generate Client:** Use swagger-codegen to generate API clients
5. **Keep Secrets Safe:** Never commit JWT secrets to git

## 🎉 Quick Reference

| Task | Command |
|------|---------|
| Start server | `npm run dev` |
| Open Swagger | Browser → `http://localhost:3000/api-docs` |
| Generate JWT secret | `curl -X POST http://localhost:3000/api/utils/generate-jwt-secret` |
| Test utilities | `npm run test-jwt` |
| Type check | `npm run type-check` |
| Build | `npm run build` |
| Create admin | `npm run create-admin` |

---

**Need Help?** Check [SWAGGER_API_DOCS.md](./SWAGGER_API_DOCS.md) for detailed documentation.
