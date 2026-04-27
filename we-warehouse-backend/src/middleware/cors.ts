import cors from 'cors';

// In development, allow all origins for easier debugging
const isDevelopment = process.env.NODE_ENV !== 'production';

const rawAllowed = process.env.ALLOWED_ORIGINS?.trim();
const allowedOrigins = rawAllowed
  ? rawAllowed.split(',').map((s) => s.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:5178',
    ];

export const corsMiddleware = cors({
  origin: isDevelopment ? true : (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
