const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/TripFleet',
    name: process.env.DB_NAME || 'TripFleet',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    },
  },

  jwt: {
    secret: process.env.PRIVATE_KEY || 'your-super-secret-jwt-key',
    expiresIn: '10d',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URI,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL]
      : ['http://localhost:3000', 'http://localhost:5173'],
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  upload: {
    maxFileSize: '10mb',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    destinations: {
      images: 'uploads/images',
      documents: 'uploads/documents',
    },
  },

  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },

  otp: {
    length: 6,
    expiryMinutes: 5,
    maxAttempts: 3,
  },

  constants: {
    userTypes: {
      ADMIN: '68484d1eefb856d41ac28c54',
      CUSTOMER: '68484d1eefb856d41ac28c55', 
      DRIVER: '68484d1eefb856d41ac28c56',
    },
    vehicleStatuses: {
      AVAILABLE: '684bbcb5a9dcd0556d12b2a5',
      IN_USE: '684bbcc2a9dcd0556d12b2a6',
      MAINTENANCE: '684bbcd2a9dcd0556d12b2a7',
      UNAVAILABLE: '684bbce0a9dcd0556d12b2a8',
    },
    tripStatuses: {
      SCHEDULED: '684942f5ff32840ef8e726f0',
      STARTED: '684942f5ff32840ef8e726f1', 
      COMPLETED: '684942f5ff32840ef8e726ef',
    },
    requestStatuses: {
      OPEN: '684da101412825ef8b404711',
      PENDING: '684da120412825ef8b404712',
      ACTIVE: '684da129412825ef8b404713',
      MATCHED: '684da132412825ef8b404714',
      PICKED_UP: '684da13e412825ef8b404715',
      DELIVERED: '684da149412825ef8b404716',
      CANCELLED: '684da154412825ef8b404717',
    },
    bookingStatuses: {
      PENDING: '685084f96bd3cba167bd01a1',
      ACTIVE: '685084f96bd3cba167bd01a2',
      PICKED_UP: '685084f96bd3cba167bd01a3',
      DELIVERED: '685084f96bd3cba167bd01a4',
      CONFIRMED: '685084f96bd3cba167bd01a5',
      CANCELLED: '685084f96bd3cba167bd01a6',
      COMPLETED: '685084f96bd3cba167bd01a7',
    },
  },
};

// Validation
const requiredEnvVars = ['MONGODB_URI', 'PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = config;