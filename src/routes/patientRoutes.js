const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authenticateToken = require('../middleware/authenticate');
const {
  registerPatient,
  getPatients,
  getPatientByIdHandler,
  getUpcomingAppointmentsForPatient,
  getAppointmentHistoryForPatient,
} = require('../controllers/patientController');

const router = Router();

// Patient onboarding and data endpoints.
router.post('/register', asyncHandler(registerPatient));
router.get('/', authenticateToken, asyncHandler(getPatients));
router.get('/:id', authenticateToken, asyncHandler(getPatientByIdHandler));
router.get('/:id/upcomingAppointments', authenticateToken, asyncHandler(getUpcomingAppointmentsForPatient));
router.get('/:id/appointmentHistory', authenticateToken, asyncHandler(getAppointmentHistoryForPatient));

module.exports = router;
