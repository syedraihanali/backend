const {
  createPatient,
  listPatients,
  findPatientById,
} = require('../services/patientService');
const { getDoctorById, incrementDoctorPatientCount } = require('../services/doctorService');
const {
  getUpcomingAppointments,
  getAppointmentHistory,
} = require('../services/appointmentService');

// Registers a new patient and associates them with a doctor if capacity allows.
async function registerPatient(req, res) {
  const { fullName, birthdate, gender, phoneNumber, email, password, address, selectedDoctor } = req.body;

  if (!fullName || !birthdate || !gender || !phoneNumber || !email || !password || !address || !selectedDoctor) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const doctor = await getDoctorById(selectedDoctor);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  if (doctor.CurrentPatientNumber >= doctor.MaxPatientNumber) {
    return res
      .status(400)
      .json({ error: 'Selected doctor is at full capacity. Please choose another doctor.' });
  }

  try {
    const patient = await createPatient({
      fullName,
      birthDate: birthdate,
      gender,
      phoneNumber,
      email,
      password,
      address,
      doctorId: selectedDoctor,
    });

    await incrementDoctorPatientCount(selectedDoctor);

    return res.status(201).json({ message: 'Patient registered successfully', patientId: patient.id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    throw error;
  }
}

// Lists all registered patients. Requires authentication via middleware.
async function getPatients(_req, res) {
  const patients = await listPatients();
  return res.json(patients);
}

// Retrieves a single patient record by identifier.
async function getPatientByIdHandler(req, res) {
  const { id } = req.params;
  const patient = await findPatientById(id);
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' });
  }
  return res.json(patient);
}

// Provides upcoming appointments for the authenticated patient.
async function getUpcomingAppointmentsForPatient(req, res) {
  const { id } = req.params;
  if (Number.parseInt(id, 10) !== req.user.id) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const appointments = await getUpcomingAppointments(id);
  return res.json(appointments);
}

// Provides historical appointments for the authenticated patient.
async function getAppointmentHistoryForPatient(req, res) {
  const { id } = req.params;
  if (Number.parseInt(id, 10) !== req.user.id) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const history = await getAppointmentHistory(id);
  return res.json(history);
}

module.exports = {
  registerPatient,
  getPatients,
  getPatientByIdHandler,
  getUpcomingAppointmentsForPatient,
  getAppointmentHistoryForPatient,
};
