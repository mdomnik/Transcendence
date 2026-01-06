# Authentication Implementation Changes

## Overview
Implemented complete cookie-based JWT authentication with Google OAuth support following Pattern A (industry standard).

---

## Backend Changes

### 1. **Cookie-Based Authentication Setup**
**File:** `backend/src/main.ts`
- **Added:** Cookie-parser middleware
- **Why:** NestJS needs this middleware to parse httpOnly cookies from requests
```typescript
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

**File:** `backend/package.json`
- **Added:** Dependencies
  - `cookie-parser: ^1.4.7`
  - `@types/cookie-parser: ^1.4.7`

---

### 2. **Flexible Login (Email OR Username)**
**File:** `backend/src/auth/dto/auth.dto.ts`
- **Added:** `SignInDto` class
- **Why:** Allow users to login with either email or username in a single field
```typescript
export class SignInDto {
  identifier: string;  // Can be email or username
  password: string;
}
```

**File:** `backend/src/auth/auth.service.ts`
- **Modified:** `signin()` method to search by both email and username
- **Why:** Improves user experience - users don't need to remember which they used
```typescript
const user = await this.prisma.user.findFirst({
  where: {
    OR: [
      { email: dto.identifier },
      { username: dto.identifier }
    ]
  }
});
```

---

### 3. **Authentication Controllers - Set httpOnly Cookies**
**File:** `backend/src/auth/auth.controller.ts`

**Changed:** `signup()` endpoint
- **Before:** Returned JWT token in JSON response
- **After:** Sets JWT as httpOnly cookie and returns success message
- **Why:** Cookies are more secure (protected from XSS attacks)
```typescript
@Post('signup')
async signup(@Body() dto: AuthDto, @Res() res: Response) {
    const result = await this.authService.signup(dto);
    res.cookie('access_token', result.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: 'localhost',
    });
    return res.status(201).json({ message: 'Signup successful' });
}
```

**Changed:** `signin()` endpoint
- Same pattern as signup - sets cookie instead of returning token

**Fixed:** `logout()` method
- **Issue:** Had duplicate method definition causing compilation error
- **Fixed:** Removed duplicate, kept only the one with `@Post` decorator

**Changed:** Google OAuth redirect handler
- **Before:** Simple redirect to frontend
- **After:** Sets cookie and uses HTML redirect to ensure cookie is set
```typescript
@Get('google/redirect')
@UseGuards(GoogleAuthGuard)
async handleRedirect(@User() user, @Res() res: Response) {
    const { access_token } = await this.authService.signToken(user.username, user.id, user.email);
    res.cookie('access_token', access_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
        domain: 'localhost',
    });
    return res.send(`
        <html>
            <head>
                <script>
                    window.location.href = 'http://localhost:8080/auth/callback';
                </script>
            </head>
            <body><p>Redirecting...</p></body>
        </html>
    `);
}
```

**File:** `backend/src/auth/auth.module.ts`
- **Added:** `ConfigModule` to imports
- **Why:** Required for JwtStrategy to access environment variables

---

### 4. **JWT Strategy - Extract from Cookies**
**File:** `backend/src/auth/strategy/jwt.strategy.ts`
- **Changed:** JWT extraction method
- **Before:** Extracted from `Authorization: Bearer <token>` header
- **After:** Extracts from `access_token` cookie
- **Why:** We're using cookie-based authentication, not header-based
```typescript
import { Request } from 'express';

jwtFromRequest: ExtractJwt.fromExtractors([
    (request: Request) => {
        return request?.cookies?.access_token;
    },
]),
```

---

### 5. **User Endpoint - Return Username**
**File:** `backend/src/user/user.controller.ts`
- **Added:** `username` field to response
- **Before:** Only returned id and email
- **After:** Returns id, email, and username
- **Why:** Frontend needs username to display user info
```typescript
@Get('me')
getMe(@User() user) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
    }
}
```

---

### 6. **Database Schema**
**File:** `backend/prisma/schema.prisma`
- **Added:** `googleId` field to User model (if not already present)
- **Why:** Store Google OAuth ID for OAuth authentication

---

## Frontend Changes

### 1. **Simplified Authentication Library**
**File:** `frontend/app/lib/auth.ts`
- **Removed:** All cookie checking utilities (`getCookie`, `deleteCookie`, `hasAuthCookie`)
- **Why:** httpOnly cookies cannot be accessed by JavaScript - browser handles them automatically
- **Result:** Simplified to only make API calls with `credentials: 'include'`

**Before:**
```typescript
export function hasAuthCookie(): boolean {
  return getCookie('access_token') !== null;
}
```

**After:**
```typescript
// Removed - httpOnly cookies are handled automatically by browser
```

---

### 2. **Authentication Context**
**File:** `frontend/app/context/AuthContext.tsx`
- **Removed:** Cookie existence check before API call
- **Changed:** Always makes API request to `/api/users/me`
- **Why:** Can't check httpOnly cookies in JavaScript, let backend validate

**Before:**
```typescript
if (!hasAuthCookie()) {
  setUser(null);
  return;
}
```

**After:**
```typescript
// Just make the API call - browser sends cookies automatically
const currentUser = await fetchCurrentUser();
```

---

### 3. **Login Modal**
**File:** `frontend/app/components/LoginModal.tsx`
- **Changed:** Input field from email-specific to generic identifier
  - Type: `email` → `text`
  - Placeholder: "Email" → "Email or Username"
  - Field name: `email` → `identifier`
- **Changed:** Redirect after success
  - Before: Called `onLoginSuccess()` callback (for 2FA)
  - After: Redirects directly to `/dashboard`
- **Why:** Simplified flow without 2FA, matches backend changes

---

### 4. **Signup Modal**
**File:** `frontend/app/components/SignUpModal.tsx`
- **Changed:** After successful signup
  - Before: Closed modal and switched to login modal
  - After: Redirects directly to `/dashboard`
- **Why:** Backend now sets auth cookie on signup, user is already logged in

---

### 5. **Dashboard Page**
**File:** `frontend/app/dashboard/page.tsx`
- **Changed:** Username display logic
  - Before: `user.email?.split('@')[0]`
  - After: `user.username || user.email?.split('@')[0] || "Player"`
- **Why:** Backend now provides username, prefer that over parsing email

---

### 6. **OAuth Callback Page** (New File)
**File:** `frontend/app/auth/callback/page.tsx`
- **Created:** New intermediate page for Google OAuth redirect
- **Purpose:** 
  1. Receives redirect from backend after Google auth
  2. Waits for cookie to be set
  3. Refreshes user data
  4. Redirects to dashboard
- **Why:** Ensures proper cookie handling and user state update after OAuth

```typescript
useEffect(() => {
  const handleCallback = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await refreshUser();
    router.push("/dashboard");
  };
  handleCallback();
}, [refreshUser, router]);
```

---

## Key Benefits

1. **Security:** httpOnly cookies cannot be accessed by JavaScript (XSS protection)
2. **Better UX:** Users can login with email OR username
3. **Cleaner Code:** Removed unnecessary cookie handling in frontend
4. **OAuth Support:** Full Google authentication integration
5. **Consistent:** All auth methods (signup, login, OAuth) use same cookie mechanism

---

## Testing Checklist

- [x] Signup with username/email/password → redirects to dashboard
- [x] Login with email → redirects to dashboard
- [x] Login with username → redirects to dashboard
- [x] Google OAuth → redirects to dashboard via callback page
- [x] Dashboard displays correct username
- [x] Logout clears cookie and redirects to home
- [x] Protected routes redirect to home when not authenticated

---

## Technical Notes

- Cookie domain set to `localhost` for development
- Cookie maxAge: 24 hours
- JWT expiration: 24 hours
- sameSite: 'lax' (allows redirect from Google)
- secure: false (for development, should be true in production)
