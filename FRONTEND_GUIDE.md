## Frontend Implementation Guide (CFA)

This guide maps the Scope of Work to the backend APIs you already have, with page flows, API contracts, and example snippets to help you build the frontend quickly.

Base API URL
- Development: `http://localhost:5004`
- Use a shared API client with the `Authorization: Bearer <token>` header after login.

Environment (frontend)
- `VITE_API_BASE_URL=http://localhost:5004`
- `VITE_RAZORPAY_KEY_ID=<your_razorpay_key_id>`

Auth token storage
- Store JWT in memory (Context/Redux) + localStorage for persistence.
- Send `Authorization: Bearer <token>` on authenticated calls.

---

### 1) User Authentication Pages

#### Sign-Up (New Customer)
Fields: Full Name, Email, Password, OTP verification by email (compatible with Otpless if you collect/verify OTP client-side).

Flow
1. User enters Full Name, Email, Password → click “Send OTP”
   - POST `/api/auth/signup/send-otp`
   - Body:
   ```json
   { "fullName": "John Doe", "email": "john@example.com", "password": "secret123" }
   ```
   - Response 200: `{ "message": "OTP sent for verification" }`
2. User enters the 6-digit OTP → click “Verify”
   - POST `/api/auth/signup/verify-otp`
   - Body:
   ```json
   { "email": "john@example.com", "otp": "123456" }
   ```
   - Response 200:
   ```json
   {
     "message": "Account verified successfully",
     "token": "<JWT>",
     "user": { "id": "...", "fullName": "John Doe", "email": "john@example.com", "customerId": "john_1234", "isVerified": true }
   }
   ```
3. Save token and user; redirect to Subscription page.

Resend OTP (optional)
- POST `/api/auth/signup/resend-otp`
- Body: `{ "email": "john@example.com" }`

Using Otpless
- If you verify OTP via Otpless on the client, simply call `/api/auth/signup/verify-otp` with the `email` and the verified `otp` you received. The backend will complete the account activation and return a token.

#### Login
Fields: Email, Password
- POST `/api/auth/login`
- Body:
```json
{ "email": "john@example.com", "password": "secret123" }
```
- Response 200:
```json
{ "message": "Login successful", "token": "<JWT>", "user": { "id": "...", "fullName": "John Doe", "email": "john@example.com", "customerId": "john_1234", "isVerified": true } }
```

#### Forgot Password
1) Send OTP
- POST `/api/auth/forgot-password/send-otp`
- Body: `{ "email": "john@example.com" }`
- Response 200: `{ "message": "Password reset OTP sent" }`

2) Verify OTP and set new password
- POST `/api/auth/forgot-password/verify-otp`
- Body:
```json
{ "email": "john@example.com", "otp": "123456", "newPassword": "newSecret123" }
```
- Response 200: `{ "message": "Password has been reset successfully" }`

---

### 2) Subscription Form

Features
- Auto-fill Name & Email if logged in (from `user` payload).
- Display 24/7 helpline message (static content on the page).
- Show available plans and allow selection.
- For family plan (maxMembers=4), allow adding up to 3 additional members (fields: name, email).
- Razorpay integration for payment.
- Success page with confirmation + subscription details.
- First 500 users payment amount is configured by admin; backend calculates the final `amount` and flags `isFreeUser`.

Endpoints
- Get plans: GET `/api/subscription/plans`
  - Response 200: `SubscriptionPlan[]` with fields: `_id, planId, planName, description, price, specialPrice, duration, maxMembers, features`.

- Create order: POST `/api/subscription/create-order` (Auth required)
  - Body:
  ```json
  { "planId": "<plan_id>", "additionalMembers": [{ "name": "Jane", "email": "jane@example.com" }] }
  ```
  - Response 200:
  ```json
  { "orderId": "order_...", "amount": 999, "currency": "INR", "isFreeUser": false, "plan": { "id": "...", "name": "Family Plan", "duration": 12, "maxMembers": 4 } }
  ```

- Verify payment and activate: POST `/api/subscription/verify-payment` (Auth)
  - Body:
  ```json
  { "orderId": "order_...", "paymentId": "pay_...", "signature": "<razorpay_signature>", "additionalMembers": [...] }
  ```
  - Response 200:
  ```json
  { "message": "Subscription activated successfully", "subscription": { "status": "active", "planName": "Family Plan", ... }, "additionalMembers": [...] }
  ```

- My subscription: GET `/api/subscription/my-subscription` (Auth)

- Payments history: GET `/api/subscription/payments` (Auth)

Razorpay integration (web)
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```
```ts
async function handleCheckout(api, token, planId, additionalMembers) {
  const { data: order } = await api.post('/api/subscription/create-order', { planId, additionalMembers }, { headers: { Authorization: `Bearer ${token}` } });
  if (order.amount <= 0) {
    // Edge case: confirm with backend if zero-amount activation is supported
    // Otherwise show a success message and refresh subscription via /my-subscription
    return;
  }
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount * 100,
    currency: order.currency,
    order_id: order.orderId,
    name: 'CFA Subscription',
    handler: async function (response) {
      const verify = {
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        additionalMembers
      };
      await api.post('/api/subscription/verify-payment', verify, { headers: { Authorization: `Bearer ${token}` } });
      // Navigate to success page
    }
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
}
```

---

### 3) Hero Banner
- Static or CMS-driven section.
- Suggested fields: headline, subheadline, background image, primary action (CTA to Subscribe).

---

### 4) Media Tab

Features
- Banners: two sliding banners or single split banner (use uploaded media URLs).
- Trust info: Company name, CIN, ROC Registration, Directors’ names & emails, office address.
- Cyber awareness content list: articles/videos from backend.
- Updates pushed from admin portal.

Endpoints
- Public media list: GET `/api/media?type=article|video&tag=...&page=1&limit=10`
- Media details: GET `/api/media/:id`
- Broadcast updates (paid users): GET `/api/media/broadcast/updates` (Auth, requires active subscription)

UI Suggestions
- Tabs: Articles, Videos, Updates
- Card: title, tag list, publishedAt, preview, “Read More” → detail page
- Video card: thumbnail + play overlay → opens player

---

### 5) Global UX/State

Auth Guard
- Protect subscription and broadcast pages.
- If no token → redirect to login.

User Context (React example)
```ts
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => token ? JSON.parse(localStorage.getItem('user') || 'null') : null);

  const login = (t, u) => { setToken(t); setUser(u); localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); };
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user'); };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
```

API Client
```ts
import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
export function authHeaders(token) { return token ? { Authorization: `Bearer ${token}` } : {}; }
```

---

### 6) Pages Checklist

- Auth
  - Sign-Up: fullName, email, password, send OTP → verify OTP → save token
  - Login: email, password → token
  - Forgot Password: email → send OTP → verify OTP + new password
- Subscription
  - Plans list → select plan → additional members form if needed → create order → Razorpay checkout → verify → success page
  - My subscription page (status, plan, start/end, members)
  - Payment history list
- Media
  - Public media list with filters (type, tag, pagination)
  - Media detail page
  - Broadcast updates tab (requires active subscription)
- Home
  - Hero banner, trust info block, CTA to subscribe

---

### 7) Edge Cases & Notes

- First 500 users pricing: backend decides `amount` and `isFreeUser`. If `amount` is 0, coordinate with backend for activation flow (e.g., skip Razorpay and show success, or a dedicated zero-amount activation endpoint).
- Customer ID: provided by backend in `user.customerId`. Display it in profile/subscription success.
- Additional members: for plans with `maxMembers > 1`, allow up to `maxMembers - 1` additional entries (fields: name, email).
- Access control: broadcast updates require an active subscription; the API will return 403 otherwise.
- Error handling: show backend error messages from `message` or `errors` arrays.

---

### 8) Admin Portal (Frontend Brief)

- Login (email/password) → token
- Media management: create/edit/delete, upload file (multipart field name `media`), publish/broadcast toggles
- Users: list/search, view details, update subscription
- Subscriptions: list/create/edit plans
- Dashboard: show stats and recent activity

Refer to `ADMIN_API.md` for complete admin API contracts.