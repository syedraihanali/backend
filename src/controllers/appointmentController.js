const {
  getAvailableTimes,
  bookAppointment,
} = require('../services/appointmentService');
const { getDoctorIdForPatient } = require('../services/patientService');

// Lists available appointment slots for the authenticated patient.
async function getAvailableTimesForPatient(req, res) {
  const patientId = req.user.id;
  const doctorId = await getDoctorIdForPatient(patientId);

  if (!doctorId) {
    return res.status(400).json({ error: 'No doctor assigned to the patient.' });
  }

  const availableTimes = await getAvailableTimes(doctorId);
  return res.json(availableTimes);
}

// Books an appointment for the authenticated patient using a transactional workflow.
async function bookAppointmentForPatient(req, res) {
  const patientId = req.user.id;
  const { availableTimeID } = req.body;

  if (!availableTimeID) {
    return res.status(400).json({ error: 'availableTimeID is required.' });
  }

  const appointment = await bookAppointment({ patientId, availableTimeId: availableTimeID });

  return res.json({
    message: 'Appointment booked successfully',
    appointment: {
      AppointmentID: appointment.appointmentId,
      DoctorID: appointment.doctorId,
      ScheduleDate: appointment.scheduleDate,
      StartTime: appointment.startTime,
      EndTime: appointment.endTime,
    },
  });
}

module.exports = {
  getAvailableTimesForPatient,
  bookAppointmentForPatient,
};
