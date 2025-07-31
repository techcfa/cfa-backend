# CFA Backend API

Cyber Fraud Awareness Backend API - A comprehensive backend service for managing cyber security awareness content, user subscriptions, and administrative functions.

## Features

- **User Authentication**: OTP-based registration and login system
- **Subscription Management**: Plan management with Razorpay integration
- **Media Management**: Content delivery system with file uploads
- **Admin Panel**: Comprehensive administrative functions
- **Google Sheets Integration**: Legacy data collection system
- **API Documentation**: Complete Swagger/OpenAPI documentation

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

### Accessing Documentation

1. Start the server: `npm start`
2. Open your browser and navigate to: `http://localhost:5004/api-docs`

### Documentation Features

- **Interactive API Explorer**: Test endpoints directly from the documentation
- **Request/Response Examples**: Detailed examples for all endpoints
- **Authentication**: JWT Bearer token authentication
- **Schema Definitions**: Complete data models and validation rules
- **Error Responses**: Comprehensive error handling documentation

### API Categories

The documentation is organized into the following categories:

- **Authentication**: User registration, login, and password management
- **Subscription**: Plan management and payment processing
- **Media**: Content management and delivery
- **Admin**: Administrative functions and user management
- **System**: Health checks and API information
- **Legacy**: Backward compatibility endpoints

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cfa-backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start the server
npm start
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS=your_google_sheets_credentials
SPREADSHEET_ID=your_spreadsheet_id

# Server
PORT=5004
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP for registration
- `POST /api/auth/verify-otp` - Verify OTP and register user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Send OTP for password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Subscription
- `GET /api/subscription/plans` - Get all subscription plans
- `GET /api/subscription/my-subscription` - Get user's subscription
- `POST /api/subscription/create-order` - Create subscription order
- `POST /api/subscription/verify-payment` - Verify payment and activate subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/payments` - Get payment history

### Media
- `GET /api/media` - Get all published media
- `GET /api/media/:id` - Get media by ID
- `GET /api/media/broadcast/updates` - Get broadcast updates
- `POST /api/media` - Create new media (admin)
- `POST /api/media/upload` - Upload media file (admin)
- `PUT /api/media/:id` - Update media (admin)
- `DELETE /api/media/:id` - Delete media (admin)
- `GET /api/media/admin/all` - Get all media (admin)

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/subscription` - Update user subscription
- `GET /api/admin/subscriptions` - Get all subscriptions
- `POST /api/admin/subscriptions` - Create subscription plan
- `PUT /api/admin/subscriptions/:id` - Update subscription plan
- `GET /api/admin/payments` - Get all payments

### System
- `GET /health` - Health check
- `GET /` - API information

### Legacy
- `GET /create-headers` - Create Google Sheets headers
- `POST /submit-form` - Submit form data to Google Sheets

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Database Seeding

```bash
npm run seed
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS configuration
- Helmet security headers
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact:
- Email: support@cfa.com
- Documentation: http://localhost:5004/api-docs (when server is running) 