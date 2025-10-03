const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const errorHandler = require('./middleware/errorHandler');

// Create and configure the Express application instance.
const app = express();

// Apply security headers, enable CORS, and parse JSON payloads with a sensible limit.
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Lightweight health-check endpoint for monitoring.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register application routes.
app.use('/api', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Fallback handler for unmatched routes to avoid Express default HTML responses.
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Centralized error handler ensures consistent JSON error responses.
app.use(errorHandler);

module.exports = { app, config };
