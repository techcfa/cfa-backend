const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const { requestLogger } = require('./middleware/logger');

// Import configurations
const connectDB = require('./config/database');
const swaggerSpecs = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const mediaRoutes = require('./routes/media');
const adminRoutes = require('./routes/admin');

// Import Google Sheets service
const { createSheetHeaders, writeSheet } = require('./googleSheetService');

const app = express();

/**
 * @swagger
 * components:
 *   schemas:
 *     FormSubmissionRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         
 *         - city
 *         - message
 *       properties:
 *         fullName:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         
 *         city:
 *           type: string
 *           example: "Mumbai"
 *         contactAs:
 *           type: string
 *           example: "Individual"
 *         helpType:
 *           type: string
 *           example: "General Inquiry"
 *         message:
 *           type: string
 *           example: "I need help with cyber security"
 *         preferredContact:
 *           type: string
 *           example: "Email"
 *         bestTime:
 *           type: string
 *           example: "Morning"
 *     HealthResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "OK"
 *         timestamp:
 *           type: string
 *           format: date-time
 *         uptime:
 *           type: number
 *           description: Server uptime in seconds
 *     ApiInfoResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "CFA Backend API"
 *         version:
 *           type: string
 *           example: "1.0.0"
 *         documentation:
 *           type: string
 *           example: "/api-docs"
 *         endpoints:
 *           type: object
 *           properties:
 *             auth:
 *               type: string
 *               example: "/api/auth"
 *             subscription:
 *               type: string
 *               example: "/api/subscription"
 *             media:
 *               type: string
 *               example: "/api/media"
 *             admin:
 *               type: string
 *               example: "/api/admin"
 */

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (logs every endpoint call)
app.use(requestLogger);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CFA Backend API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Legacy Google Sheets routes (keeping for backward compatibility)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1fsiaBNAbwX92V4nhO_UQUai9g_EvDyFGdx215DvZcdA';

/**
 * @swagger
 * /create-headers:
 *   get:
 *     summary: Create Google Sheets headers
 *     description: Creates headers in the Google Sheets for data organization (legacy endpoint)
 *     tags: [Legacy]
 *     responses:
 *       200:
 *         description: Headers created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Headers created"
 *       500:
 *         description: Failed to create headers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/create-headers', async (req, res) => {
  try {
    await createSheetHeaders(SPREADSHEET_ID);
    res.json({ message: 'Headers created' });
  } catch (error) {
    console.error('Error creating headers:', error);
    res.status(500).json({ error: 'Failed to create headers' });
  }
});

/**
 * @swagger
 * /submit-form:
 *   post:
 *     summary: Submit form data to Google Sheets
 *     description: Submits form data to Google Sheets (legacy endpoint)
 *     tags: [Legacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FormSubmissionRequest'
 *     responses:
 *       200:
 *         description: Data written to sheet successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Data written to sheet"
 *       400:
 *         description: Required fields are missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to write data to sheet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/submit-form', async (req, res) => {
  try {
    const { fullName, email, city, contactAs, helpType, message, preferredContact, bestTime } = req.body;

    if (!fullName || !email || !city || !message) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const values = [[
      fullName,
      email,
      city,
      contactAs || '',
      helpType || '',
      message,
      preferredContact || '',
      bestTime || ''
    ]];

    await writeSheet(SPREADSHEET_ID, values);
    res.json({ message: 'Data written to sheet' });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ error: 'Failed to write data to sheet' });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status and uptime information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     description: Returns basic API information and available endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInfoResponse'
 */
// API info endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CFA Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      subscription: '/api/subscription',
      media: '/api/media',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start server
const PORT = process.env.PORT || 5004;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    // Drop obsolete unique index on mobileNumber if it exists
    try {
      const indexes = await mongoose.connection.db.collection('users').indexes();
      const hasMobileIndex = indexes.find((idx) => idx.name === 'mobileNumber_1');
      if (hasMobileIndex) {
        await mongoose.connection.db.collection('users').dropIndex('mobileNumber_1');
        console.log('Removed obsolete index: mobileNumber_1');
      }
    } catch (idxErr) {
      // Ignore if collection doesn't exist yet or index not found
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Index cleanup notice:', idxErr.message);
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 CFA Backend Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();