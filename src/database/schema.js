const { execute } = require('./query');

// Ensures the database schema exists before the application handles requests.
async function ensureSchema() {
  await createDoctorsTable();
  await createPatientsTable();
  await createAvailabilityTable();
  await createAppointmentsTable();
  await seedDoctors();
}

async function createDoctorsTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS doctors (
      DoctorID INT PRIMARY KEY AUTO_INCREMENT,
      FullName VARCHAR(255) NOT NULL,
      MaxPatientNumber INT NOT NULL,
      CurrentPatientNumber INT NOT NULL DEFAULT 0
    )`
  );
}

async function createPatientsTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS patients (
      PatientID INT PRIMARY KEY AUTO_INCREMENT,
      FullName VARCHAR(255) NOT NULL,
      BirthDate DATE NOT NULL,
      PhoneNumber VARCHAR(20) NOT NULL,
      Email VARCHAR(255) NOT NULL UNIQUE,
      Gender ENUM('Male', 'Female', 'Other') NOT NULL,
      PasswordHash VARCHAR(255) NOT NULL,
      Address VARCHAR(255) NOT NULL,
      DoctorID INT NULL,
      FOREIGN KEY (DoctorID) REFERENCES doctors(DoctorID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    )`
  );
}

async function createAvailabilityTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS available_time (
      AvailableTimeID INT PRIMARY KEY AUTO_INCREMENT,
      DoctorID INT NOT NULL,
      ScheduleDate DATE NOT NULL,
      StartTime TIME NOT NULL,
      EndTime TIME NOT NULL,
      IsAvailable TINYINT(1) NOT NULL DEFAULT 1,
      FOREIGN KEY (DoctorID) REFERENCES doctors(DoctorID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    )`
  );
}

async function createAppointmentsTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS appointments (
      AppointmentID INT PRIMARY KEY AUTO_INCREMENT,
      PatientID INT NOT NULL,
      DoctorID INT NOT NULL,
      AvailableTimeID INT NOT NULL,
      FOREIGN KEY (PatientID) REFERENCES patients(PatientID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      FOREIGN KEY (DoctorID) REFERENCES doctors(DoctorID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      FOREIGN KEY (AvailableTimeID) REFERENCES available_time(AvailableTimeID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    )`
  );
}

async function seedDoctors() {
  const [{ count }] = await execute('SELECT COUNT(*) AS count FROM doctors');
  if (count > 0) {
    return;
  }

  const doctors = [
    ['Dr. John Smith', 100, 0],
    ['Dr. Emily Davis', 80, 0],
    ['Dr. Michael Brown', 120, 0],
  ];

  await Promise.all(
    doctors.map((doctor) =>
      execute(
        'INSERT INTO doctors (FullName, MaxPatientNumber, CurrentPatientNumber) VALUES (?, ?, ?)',
        doctor
      )
    )
  );
}

module.exports = {
  ensureSchema,
};
