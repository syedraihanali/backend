const { execute, transaction } = require('../database/query');

// Retrieves upcoming appointments for a patient.
async function getUpcomingAppointments(patientId) {
  return execute(
    `SELECT
        a.AppointmentID,
        d.FullName AS doctor,
        DATE_FORMAT(at.ScheduleDate, '%Y-%m-%d') AS date,
        TIME_FORMAT(at.StartTime, '%H:%i') AS startTime,
        TIME_FORMAT(at.EndTime, '%H:%i') AS endTime
      FROM appointments a
      JOIN doctors d ON a.DoctorID = d.DoctorID
      JOIN available_time at ON a.AvailableTimeID = at.AvailableTimeID
      WHERE a.PatientID = ? AND at.ScheduleDate >= CURDATE()
      ORDER BY at.ScheduleDate ASC, at.StartTime ASC`,
    [patientId]
  );
}

// Retrieves historical appointments for a patient.
async function getAppointmentHistory(patientId) {
  return execute(
    `SELECT
        a.AppointmentID,
        d.FullName AS doctor,
        DATE_FORMAT(at.ScheduleDate, '%Y-%m-%d') AS date,
        TIME_FORMAT(at.StartTime, '%H:%i') AS time
      FROM appointments a
      JOIN doctors d ON a.DoctorID = d.DoctorID
      JOIN available_time at ON a.AvailableTimeID = at.AvailableTimeID
      WHERE a.PatientID = ? AND at.ScheduleDate < CURDATE()
      ORDER BY at.ScheduleDate DESC, at.StartTime DESC`,
    [patientId]
  );
}

// Lists available appointment slots for a specific doctor.
async function getAvailableTimes(doctorId) {
  return execute(
    `SELECT
        AvailableTimeID,
        DoctorID,
        DATE_FORMAT(ScheduleDate, '%Y-%m-%d') AS ScheduleDate,
        TIME_FORMAT(StartTime, '%H:%i') AS StartTime,
        TIME_FORMAT(EndTime, '%H:%i') AS EndTime
      FROM available_time
      WHERE DoctorID = ? AND IsAvailable = 1 AND ScheduleDate >= CURDATE()
      ORDER BY ScheduleDate ASC, StartTime ASC`,
    [doctorId]
  );
}

// Books an appointment within a database transaction to avoid double booking.
async function bookAppointment({ patientId, availableTimeId }) {
  return transaction(async (connection) => {
    const [timeSlots] = await connection.execute(
      'SELECT * FROM available_time WHERE AvailableTimeID = ? AND IsAvailable = 1 FOR UPDATE',
      [availableTimeId]
    );
    const timeSlot = timeSlots[0];

    if (!timeSlot) {
      const error = new Error('Selected time slot is no longer available');
      error.statusCode = 400;
      throw error;
    }

    const [appointmentResult] = await connection.execute(
      'INSERT INTO appointments (PatientID, DoctorID, AvailableTimeID) VALUES (?, ?, ?)',
      [patientId, timeSlot.DoctorID, availableTimeId]
    );

    await connection.execute('UPDATE available_time SET IsAvailable = 0 WHERE AvailableTimeID = ?', [
      availableTimeId,
    ]);

    return {
      appointmentId: appointmentResult.insertId,
      doctorId: timeSlot.DoctorID,
      scheduleDate: timeSlot.ScheduleDate,
      startTime: timeSlot.StartTime,
      endTime: timeSlot.EndTime,
    };
  });
}

module.exports = {
  getUpcomingAppointments,
  getAppointmentHistory,
  getAvailableTimes,
  bookAppointment,
};
