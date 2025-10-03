const { execute } = require('../database/query');

// Retrieves all doctors from the database.
async function listDoctors() {
  return execute('SELECT * FROM doctors');
}

// Finds a doctor by identifier.
async function getDoctorById(doctorId) {
  const doctors = await execute('SELECT * FROM doctors WHERE DoctorID = ?', [doctorId]);
  return doctors[0];
}

// Increments the active patient count for a doctor.
async function incrementDoctorPatientCount(doctorId) {
  await execute('UPDATE doctors SET CurrentPatientNumber = CurrentPatientNumber + 1 WHERE DoctorID = ?', [doctorId]);
}

module.exports = {
  listDoctors,
  getDoctorById,
  incrementDoctorPatientCount,
};
