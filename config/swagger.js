const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CFA Backend API',
      version: '1.0.0',
      description: 'Cyber Fraud Awareness Backend API Documentation',
      contact: {
        name: 'CFA Support',
        email: 'support@cfa.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5004',
        description: 'Development server'
      },
      {
        url: 'https://api.cfa.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoints'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Subscription',
        description: 'Subscription management and payment processing'
      },
      {
        name: 'Media',
        description: 'Media content management and delivery'
      },
      {
        name: 'Admin',
        description: 'Administrative functions and user management'
      },
      {
        name: 'System',
        description: 'System health and information endpoints'
      },
      {
        name: 'Legacy',
        description: 'Legacy endpoints for backward compatibility'
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js', './index.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs; 