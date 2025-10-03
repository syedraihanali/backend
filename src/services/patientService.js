const bcrypt = require('bcryptjs');
const { execute } = require('../database/query');

// Persists a new patient with a securely hashed password.
async function createPatient({
  fullName,
  birthDate,
  gender,
  phoneNumber,
  email,
  password,
  address,
  doctorId,
}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await execute(
    `INSERT INTO patients (FullName, BirthDate, PhoneNumber, Email, Gender, PasswordHash, Address, DoctorID)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, birthDate, phoneNumber, email, gender, passwordHash, address, doctorId]
  );
  return { id: result.insertId, fullName, email };
}

// Returns the full list of patients.
async function listPatients() {
  return execute('SELECT * FROM patients');
}

// Retrieves a patient by identifier.
async function findPatientById(id) {
  const patients = await execute('SELECT * FROM patients WHERE PatientID = ?', [id]);
  return patients[0];
}

// Retrieves a patient by email address.
async function findPatientByEmail(email) {
  const patients = await execute('SELECT * FROM patients WHERE Email = ?', [email]);
  return patients[0];
}

// Returns the doctor assigned to a patient, if any.
async function getDoctorIdForPatient(patientId) {
  const patients = await execute('SELECT DoctorID FROM patients WHERE PatientID = ?', [patientId]);
  return patients[0]?.DoctorID;
}

module.exports = {
  createPatient,
  listPatients,
  findPatientById,
  findPatientByEmail,
  getDoctorIdForPatient,
};
