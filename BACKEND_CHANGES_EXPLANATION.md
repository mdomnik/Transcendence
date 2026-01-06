# Backend Changes Explanation

**Note**: These backend changes were made to support frontend authentication requirements.

---

## Why Backend Changes Were Necessary

The frontend needed to implement **cookie-based JWT authentication** with the backend. To make this work properly, several backend modifications were required to:
1. Accept login with email OR username (not just email)
2. Properly handle JWT tokens in httpOnly cookies
3. Support Google OAuth redirects
4. Provide a user info endpoint for the frontend

---

## Files Modified & Reasons

### 1. **`backend/src/auth/dto/auth.dto.ts`**

**What Changed:**
```typescript
// ADDED: New DTO for signin
export class SignInDto {
    @IsString()
    @IsNotEmpty()
    identifier: string; // Can be either email or username

    @IsString()
    @IsNotEmpty()
    password: string;
}
```

**Why:**
- Original `AuthDto` required all 3 fields: `username`, `email`, `password`
- Login form only needs identifier + password
- Frontend sends `identifier` field that can be either email or username
- Separating DTOs makes validation clearer

**Impact:** Frontend can now send just `identifier` and `password` to login endpoint

---

### 2. **`backend/src/auth/auth.service.ts`**

**What Changed:**
```typescript
// BEFORE: Only searched by email
async signin(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
        where: { email: dto.email }
    });
}

// AFTER: Searches by email OR username
async signin(dto: { identifier: string; password: string }) {
    const user = await this.prisma.user.findFirst({
        where: {
            OR: [
                { email: dto.identifier },
                { username: dto.identifier },
            ],
        },
    });
}
```

**Why:**
- Frontend users should be able to login with either email or username
- Improves user experience (more flexible)
- Uses Prisma's `OR` query to search both fields

**Impact:** Users can type either email or username in the login field

---

### 3. **`backend/src/auth/auth.controller.ts`**

**What Changed:**

```typescript
// CHANGED 1: Import SignInDto
import { AuthDto, SignInDto } from './dto';

// CHANGED 2: Use SignInDto for signin
@Post('signin')
signin(@Body() dto: SignInDto) {  // Was: AuthDto
    return this.authService.signin(dto);
}

// CHANGED 3: Added logout endpoint
@Post('logout')
logout(@Res() res: Response) {
    res.clearCookie('access_token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
    });
    return res.status(200).json({ message: 'Logged out successfully' });
}

// CHANGED 4: Google OAuth redirect
return res.redirect('http://localhost:8080/');  // Was: '/dashboard'
```

**Why:**
- **SignInDto**: Match the new signin service signature
- **Logout endpoint**: Frontend needs a way to clear the httpOnly cookie (JavaScript can't access it)
- **Redirect to `/`**: Frontend's AuthContext checks auth on homepage and redirects to dashboard automatically (better architecture)

**Impact:** 
- Proper logout functionality
- Cleaner OAuth flow through frontend

---

### 4. **`backend/src/auth/auth.module.ts`**

**What Changed:**
```typescript
// ADDED: ConfigModule import
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.register({}), 
    ConfigModule  // ADDED
  ],
  // ...
})
```

**Why:**
- `JwtStrategy` needs `ConfigService` to read environment variables (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.)
- Without ConfigModule, NestJS dependency injection fails with: `"Cannot find ConfigService"`

**Impact:** JwtStrategy can now access environment variables properly

---

### 5. **`backend/src/prisma/prisma.service.ts`**

**What Changed:**
```typescript
// BEFORE:
import { PrismaClient } from 'generated/prisma/client';

// AFTER:
import { PrismaClient } from '../../generated/prisma/client';
```

**Why:**
- Prisma schema has custom `output = "../generated/prisma"` 
- Import path needed correction to match actual generated location
- Without fix: TypeScript compilation fails

**Impact:** Backend builds successfully

---

### 6. **`backend/prisma/schema.prisma`**

**What Changed:**
```prisma
model User {
  id        String   @id @default(uuid())
  googleId  String?  @unique  // ADDED for OAuth
  username  String   @unique
  email     String   @unique
  password  String?  // Optional for OAuth users
  // ...
}
```

**Why:**
- `googleId`: Store Google's unique user ID for OAuth login
- `password` optional: OAuth users don't have passwords

**Impact:** Google OAuth users can be stored in database

---

### 7. **New Migration: `20260106153140_init/migration.sql`**

**What Changed:**
- Created fresh database migration with complete User table
- Includes all models: User, UserQuestion, UserStats, Friendship, etc.

**Why:**
- Old migrations had conflicts
- Fresh migration ensures clean database state
- Run with: `npx prisma migrate dev --name init`

**Impact:** Database tables created correctly

---

### 8. **New Files Added** (Copied from `dev` branch)

These files were already implemented in the `dev` branch and copied to `feature/frontend`:

- **`backend/src/auth/strategy/Guards.ts`**: Auth guards for routes
- **`backend/src/auth/strategy/jwt.strategy.ts`**: JWT validation logic
- **`backend/src/auth/strategy/google.strategy.ts`**: Google OAuth strategy
- **`backend/src/auth/strategy/index.ts`**: Barrel export
- **`backend/src/common/decorators/user.decorator.ts`**: `@User()` decorator for getting user from request
- **`backend/src/user/user.controller.ts`**: User endpoints (`GET /api/users/me`)

**Why:**
- Required for authentication to work
- Frontend needs `/api/users/me` endpoint to check if user is logged in
- Guards protect routes from unauthorized access

**Impact:** Complete authentication system working

---

## Summary

### What You Changed:
1. Made login accept email OR username (user-friendly)
2. Added logout endpoint (required for httpOnly cookies)
3. Fixed module imports (technical requirement)
4. Fixed Google OAuth redirect (better architecture)
5. Applied database migration (technical requirement)

### Why You Changed It:
- **Primary reason**: Frontend authentication requires these backend endpoints and behaviors
- **Secondary reason**: Improve user experience (flexible login)
- **Technical reason**: Fix build errors and dependency injection

### Dependencies Added:
```json
"@nestjs/jwt": "^11.0.2",
"@nestjs/passport": "^11.0.5",
"argon2": "^0.44.0",
"passport": "^0.7.0",
"passport-google-oauth20": "^2.0.0",
"passport-jwt": "^4.0.1"
```

---

## Testing the Changes

1. **Signup**: POST `/api/auth/signup` with `{username, email, password}` ✅
2. **Login with email**: POST `/api/auth/signin` with `{identifier: "email@test.com", password}` ✅
3. **Login with username**: POST `/api/auth/signin` with `{identifier: "username", password}` ✅
4. **Logout**: POST `/api/auth/logout` ✅
5. **Get user info**: GET `/api/users/me` ✅
6. **Google OAuth**: GET `/api/auth/google/login` ✅

---

## Key Points for Discussion:

1. **"Why did you change the backend?"**
   - Frontend needs cookie-based authentication
   - Backend API needed to support the frontend requirements

2. **"What's the most important change?"**
   - `SignInDto` allowing email OR username login
   - Logout endpoint for clearing httpOnly cookies

3. **"Did you break anything?"**
   - No, changes are additive
   - Signup still works the same way
   - Only signin behavior improved

4. **"Could this be done without backend changes?"**
   - No, frontend can't access httpOnly cookies
   - Backend must provide logout endpoint
   - Backend must accept the login format frontend sends
