## Admin API Reference

Base URL
- Development: `http://localhost:5004`
- All endpoints below are prefixed with the base URL

Authentication
- Scheme: Bearer token (JWT)
- Header: `Authorization: Bearer <token>`

### Admin Authentication

#### POST /api/admin/login
- Description: Admin login (rate limited)
- Body:
```json
{
  "email": "admin@admin.com",
  "password": "admin123"
}
```
- Response 200:
```json
{
  "message": "Login successful",
  "token": "<JWT_TOKEN>",
  "admin": {
    "id": "66fcb3...",
    "username": "admin",
    "email": "admin@admin.com",
    "role": "super_admin"
  }
}
```
- Errors: 401 Invalid credentials, 429 Too many attempts

#### GET /api/admin/profile
- Auth: Bearer token
- Response 200:
```json
{
  "_id": "66fcb3...",
  "username": "admin",
  "email": "admin@admin.com",
  "role": "super_admin",
  "isActive": true,
  "lastLogin": "2025-08-09T09:00:00.000Z",
  "createdAt": "2025-08-09T08:00:00.000Z",
  "updatedAt": "2025-08-09T09:00:00.000Z"
}
```

### Admin Dashboard

#### GET /api/admin/dashboard
- Auth: Bearer token
- Response 200:
```json
{
  "stats": {
    "totalUsers": 120,
    "activeSubscriptions": 54,
    "totalPayments": 210,
    "totalRevenue": 152340
  },
  "recentUsers": [
    {
      "fullName": "John Doe",
      "email": "john@example.com",
      "customerId": "john_3829",
      "createdAt": "2025-08-09T08:00:00.000Z"
    }
  ],
  "recentPayments": [
    {
      "amount": 999,
      "status": "completed",
      "userId": { "fullName": "John Doe", "email": "john@example.com" },
      "subscriptionId": { "planName": "Basic Plan" },
      "createdAt": "2025-08-09T09:00:00.000Z"
    }
  ],
  "mediaStats": [
    { "_id": "article", "count": 12 },
    { "_id": "video", "count": 5 }
  ]
}
```

### Users (Admin)

#### GET /api/admin/users
- Auth: Bearer token
- Query params: `page` (default 1), `limit` (default 20), `search`, `status` in `active|inactive|expired`
- Response 200:
```json
{
  "users": [
    {
      "_id": "66fcb3...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "customerId": "john_3829",
      "subscription": {
        "status": "active",
        "planId": "66fcb4...",
        "planName": "Basic Plan",
        "amount": 999
      },
      "createdAt": "2025-08-09T08:00:00.000Z"
    }
  ],
  "totalPages": 6,
  "currentPage": 1,
  "total": 120
}
```

#### GET /api/admin/users/:id
- Auth: Bearer token
- Response 200:
```json
{
  "user": {
    "_id": "66fcb3...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "customerId": "john_3829",
    "subscription": {
      "planId": "66fcb4...",
      "planName": "Basic Plan",
      "status": "active",
      "startDate": "2025-08-01T00:00:00.000Z",
      "endDate": "2026-08-01T00:00:00.000Z",
      "amount": 999
    },
    "additionalMembers": [
      { "name": "Jane", "email": "jane@example.com" }
    ]
  },
  "payments": [
    {
      "_id": "pay_66f...",
      "razorpayOrderId": "order_ABC",
      "amount": 999,
      "status": "completed",
      "createdAt": "2025-08-01T12:00:00.000Z",
      "subscriptionId": { "planName": "Basic Plan" }
    }
  ]
}
```

#### PUT /api/admin/users/:id/subscription
- Auth: Bearer token
- Body (any subset):
```json
{
  "status": "active",
  "planId": "66fcb4...",
  "amount": 999
}
```
- Response 200:
```json
{
  "message": "User subscription updated successfully",
  "subscription": {
    "planId": "66fcb4...",
    "planName": "Basic Plan",
    "status": "active",
    "startDate": "2025-08-01T00:00:00.000Z",
    "endDate": "2026-08-01T00:00:00.000Z",
    "paymentId": "66fcb9...",
    "amount": 999
  }
}
```

### Subscription Plans (Admin)

#### GET /api/admin/subscriptions
- Auth: Bearer token
- Response 200:
```json
[
  {
    "_id": "66fcb4...",
    "planId": "basic",
    "planName": "Basic Plan",
    "description": "Basic cyber fraud awareness",
    "price": 999,
    "duration": 12,
    "maxMembers": 1,
    "features": ["24/7 Helpline", "Articles"],
    "isSpecialOffer": false,
    "specialPrice": null
  }
]
```

#### POST /api/admin/subscriptions
- Auth: Bearer token
- Body:
```json
{
  "planId": "family",
  "planName": "Family Plan",
  "description": "Up to 4 members",
  "price": 2499,
  "duration": 12,
  "maxMembers": 4,
  "features": ["Helpline", "Priority Consultation"],
  "isSpecialOffer": true,
  "specialPrice": 1999
}
```
- Response 201:
```json
{
  "message": "Subscription plan created successfully",
  "subscription": { "_id": "66fcb4...", "planId": "family", "planName": "Family Plan" }
}
```

#### PUT /api/admin/subscriptions/:id
- Auth: Bearer token
- Body (partial allowed):
```json
{
  "price": 2299,
  "isSpecialOffer": false
}
```
- Response 200:
```json
{
  "message": "Subscription plan updated successfully",
  "subscription": { "_id": "66fcb4...", "planId": "family", "price": 2299 }
}
```

### Media Management (Admin)

Types
- `article`, `video`, `podcast`, `update`, `alert`

#### POST /api/media
- Auth: Bearer token (admin)
- Body:
```json
{
  "title": "Cyber Safety Tips",
  "description": "Stay safe online",
  "type": "article",
  "content": "<p>...</p>",
  "tags": ["security", "tips"],
  "isPublished": true,
  "isBroadcast": false
}
```
- Response 201:
```json
{
  "message": "Media created successfully",
  "media": { "_id": "66fcc0...", "title": "Cyber Safety Tips", "isPublished": true }
}
```

#### POST /api/media/upload
- Auth: Bearer token (admin)
- Multipart form-data: field name `media`
- Response 200:
```json
{
  "message": "File uploaded successfully",
  "fileUrl": "/uploads/media-1723183923.jpg",
  "filename": "media-1723183923.jpg",
  "originalName": "banner.jpg",
  "size": 154322
}
```

#### PUT /api/media/:id
- Auth: Bearer token (admin)
- Body (any subset):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "type": "update",
  "content": "<p>Important update...</p>",
  "tags": ["update"],
  "isPublished": true,
  "isBroadcast": true
}
```
- Response 200:
```json
{
  "message": "Media updated successfully",
  "media": { "_id": "66fcc0...", "title": "Updated Title", "isBroadcast": true }
}
```

#### DELETE /api/media/:id
- Auth: Bearer token (admin)
- Response 200:
```json
{ "message": "Media deleted successfully" }
```

#### GET /api/media/admin/all
- Auth: Bearer token (admin)
- Query params: `type`, `status` in `published|draft`, `page` (default 1), `limit` (default 20)
- Response 200:
```json
{
  "media": [ { "_id": "66fcc0...", "title": "Cyber Safety Tips", "isPublished": true } ],
  "totalPages": 3,
  "currentPage": 1,
  "total": 45
}
```

### Broadcast Updates (User consumption)

#### GET /api/media/broadcast/updates
- Auth: Bearer token (user must have active subscription)
- Response 200:
```json
[
  { "_id": "66fcc5...", "type": "update", "title": "New Scam Alert", "isBroadcast": true }
]
```
- Error 403 (no active subscription):
```json
{ "message": "Active subscription required" }
```

### Error Responses
- General error format:
```json
{ "message": "<description>", "errors": [ {"msg": "...", "param": "..."} ] }
```
- Common codes: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error

### Notes
- Use the JWT token returned by admin login in the `Authorization` header for all admin endpoints.
- To broadcast content to all paid users in the media tab, set `isPublished: true` and `isBroadcast: true` on the media item.
- Upload uses multipart with field name `media` and returns a URL you can embed in content.