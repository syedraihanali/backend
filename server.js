// server.js

// Import required packages
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser'); // Optional: Consider using express.json() instead
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
// const crypto = require('crypto');

// // Generate a random 256-bit secret key (32 bytes)
// const jwtSecretKey = crypto.randomBytes(32).toString('hex');

// console.log('Your JWT Secret Key:', jwtSecretKey);

// Load environment variables from .env file
dotenv.config();

// Initialize the Express app
const app = express();
const port = process.env.PORT || 5001;

// CORS Configuration: Allow specific origins
// const allowedOrigins = [
//   'https://azadzamani.github.io', // GitHub Pages frontend
//   'http://localhost:3000',        // Local development frontend
//   'http://localhost:9138/'
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('CORS policy violation: Origin not allowed'));
//     }
//   },
//   optionsSuccessStatus: 200, // Some legacy browsers choke on 204
//   credentials: true, 
// };

app.use(cors());
// Enable CORS with the specified options
// app.use(cors(corsOptions));

// Middleware to parse incoming JSON data
app.use(bodyParser.json()); // Alternatively, use app.use(express.json());

// Initialize MySQL database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await usage
const promisePool = pool.promise();

// Function to execute queries
const executeQuery = async (query, params) => {
  try {
    const [rows] = await promisePool.execute(query, params);
    return rows;
  } catch (err) {
    throw err;
  }
};

// Function to initialize the database schema
const initializeDatabase = async () => {
  try {
    // Create doctors table
    await executeQuery(
      `CREATE TABLE IF NOT EXISTS doctors (
        DoctorID INT PRIMARY KEY AUTO_INCREMENT,
        FullName VARCHAR(255) NOT NULL,
        MaxPatientNumber INT NOT NULL,
        CurrentPatientNumber INT NOT NULL DEFAULT 0
      )`
    );
    console.log('Doctors table ready.');

    // Insert initial doctors if table is empty
    const doctorsCount = await executeQuery('SELECT COUNT(*) AS count FROM doctors');
    if (doctorsCount[0].count === 0) {
      const doctors = [
        { FullName: 'Dr. John Smith', MaxPatientNumber: 100, CurrentPatientNumber: 0 },
        { FullName: 'Dr. Emily Davis', MaxPatientNumber: 80, CurrentPatientNumber: 0 },
        { FullName: 'Dr. Michael Brown', MaxPatientNumber: 120, CurrentPatientNumber: 0 },
        // Add more doctors as needed
      ];

      const insertDoctorPromises = doctors.map((doc) =>
        executeQuery(
          'INSERT INTO doctors (FullName, MaxPatientNumber, CurrentPatientNumber) VALUES (?, ?, ?)',
          [doc.FullName, doc.MaxPatientNumber, doc.CurrentPatientNumber]
        )
      );

      await Promise.all(insertDoctorPromises);
      console.log('Initial doctors inserted.');
    }

    // Create patients table
    await executeQuery(
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
    console.log('Patients table ready.');

    // Create available_time table
    await executeQuery(
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
    console.log('Available_time table ready.');

    // Create appointments table
    await executeQuery(
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
    console.log('Appointments table ready.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  }
};

// Initialize the database
initializeDatabase();

// JWT Middleware to Protect Routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid access token' });
    }
    req.user = user; // { id: PatientID, email: Email }
    next();
  });
}

// API route to register a new patient
app.post('/api/register', async (req, res) => {
  const { fullName, birthdate, gender, phoneNumber, email, password, address, selectedDoctor } = req.body;

  if (!fullName || !birthdate || !gender || !phoneNumber || !email || !password || !selectedDoctor || !address) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if the selected doctor can accept new patients
    const doctor = await executeQuery('SELECT * FROM doctors WHERE DoctorID = ?', [selectedDoctor]);

    if (doctor.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (doctor[0].CurrentPatientNumber >= doctor[0].MaxPatientNumber) {
      return res.status(400).json({ error: 'Selected doctor is at full capacity. Please choose another doctor.' });
    }

    // Hash the password before storing
    const hash = await bcrypt.hash(password, 10);

    // Insert the new patient
    const result = await executeQuery(
      'INSERT INTO patients (FullName, BirthDate, PhoneNumber, Email, Gender, PasswordHash, Address, DoctorID) VALUES (?, ?, ?, ?, ?, ?, ?,?)',
      [fullName, birthdate, phoneNumber, email, gender, hash, address, selectedDoctor]
    );

    // Update doctor's current patient count
    await executeQuery('UPDATE doctors SET CurrentPatientNumber = CurrentPatientNumber + 1 WHERE DoctorID = ?', [
      selectedDoctor,
    ]);

    res.json({ message: 'Patient registered successfully', patientId: result.insertId });
  } catch (err) {
    console.error('Error registering patient:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Error registering patient' });
    }
  }
});

// API route to get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await executeQuery('SELECT * FROM doctors');
    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API route to get all patients (protected route)
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const patients = await executeQuery('SELECT * FROM patients');
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API route to get a specific patient by ID (protected route)
app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await executeQuery('SELECT * FROM patients WHERE PatientID = ?', [id]);

    if (patient.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient[0]);
  } catch (err) {
    console.error('Error fetching patient:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API route to get upcoming appointments for a patient (protected route)
app.get('/api/patients/:id/upcomingAppointments', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Ensure the requester is accessing their own data
  if (parseInt(id, 10) !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const appointments = await executeQuery(
      `
      SELECT 
        a.AppointmentID, 
        d.FullName AS doctor, 
        DATE_FORMAT(at.ScheduleDate, '%Y-%m-%d') AS date, 
        TIME_FORMAT(at.StartTime, '%H:%i') AS startTime, 
        TIME_FORMAT(at.EndTime, '%H:%i') AS endTime
      FROM appointments a
      JOIN doctors d ON a.DoctorID = d.DoctorID
      JOIN available_time at ON a.AvailableTimeID = at.AvailableTimeID
      WHERE a.PatientID = ? AND at.ScheduleDate >= CURDATE()
      ORDER BY at.ScheduleDate ASC, at.StartTime ASC
      `,
      [id]
    );

    res.json(appointments);
  } catch (err) {
    console.error('Error fetching upcoming appointments:', err.message);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// API route to get appointment history for a patient (protected route)
app.get('/api/patients/:id/appointmentHistory', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Ensure the requester is accessing their own data
  if (parseInt(id, 10) !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const history = await executeQuery(
      `
      SELECT 
        a.AppointmentID, 
        d.FullName AS doctor, 
        DATE_FORMAT(at.ScheduleDate, '%Y-%m-%d') AS date, 
        TIME_FORMAT(at.StartTime, '%H:%i') AS time
      FROM appointments a
      JOIN doctors d ON a.DoctorID = d.DoctorID
      JOIN available_time at ON a.AvailableTimeID = at.AvailableTimeID
      WHERE a.PatientID = ? AND at.ScheduleDate < CURDATE()
      ORDER BY at.ScheduleDate DESC, at.StartTime DESC
      `,
      [id]
    );

    res.json(history);
  } catch (err) {
    console.error('Error fetching appointment history:', err.message);
    res.status(500).json({ error: 'Failed to fetch appointment history' });
  }
});

// API route to fetch available time slots for the patient's doctor (protected route)
app.get('/api/available_times', authenticateToken, async (req, res) => {
  const patientID = req.user.id;

  try {
    // Fetch the doctor's ID assigned to the patient
    const doctorResult = await executeQuery('SELECT DoctorID FROM patients WHERE PatientID = ?', [patientID]);

    if (doctorResult.length === 0 || !doctorResult[0].DoctorID) {
      return res.status(400).json({ error: 'No doctor assigned to the patient' });
    }

    const doctorID = doctorResult[0].DoctorID;

    // Fetch available time slots for the doctor
    const availableTimes = await executeQuery(
      `
      SELECT 
        AvailableTimeID, 
        DoctorID, 
        DATE_FORMAT(ScheduleDate, '%Y-%m-%d') AS ScheduleDate, 
        TIME_FORMAT(StartTime, '%H:%i') AS StartTime, 
        TIME_FORMAT(EndTime, '%H:%i') AS EndTime
      FROM available_time
      WHERE DoctorID = ? AND IsAvailable = 1 AND ScheduleDate >= CURDATE()
      ORDER BY ScheduleDate ASC, StartTime ASC
      `,
      [doctorID]
    );

    res.json(availableTimes);
  } catch (err) {
    console.error('Error fetching available time slots:', err.message);
    res.status(500).json({ error: 'Failed to fetch available time slots' });
  }
});

// API route to book an appointment (protected route)
app.post('/api/book_appointment', authenticateToken, async (req, res) => {
  const patientID = req.user.id;
  const { availableTimeID } = req.body;

  if (!availableTimeID) {
    return res.status(400).json({ error: 'AvailableTimeID is required' });
  }

  try {
    // Start a transaction
    await promisePool.query('START TRANSACTION');

    // Check if the available time slot is still available
    const timeSlotResult = await executeQuery(
      'SELECT * FROM available_time WHERE AvailableTimeID = ? AND IsAvailable = 1 FOR UPDATE',
      [availableTimeID]
    );

    if (timeSlotResult.length === 0) {
      await promisePool.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected time slot is no longer available' });
    }

    const timeSlot = timeSlotResult[0];
    const doctorID = timeSlot.DoctorID;
    const scheduleDate = timeSlot.ScheduleDate;
    const startTime = timeSlot.StartTime;
    const endTime = timeSlot.EndTime;

    // Insert the appointment
    const appointmentResult = await executeQuery(
      'INSERT INTO appointments (PatientID, DoctorID, AvailableTimeID) VALUES (?, ?, ?)',
      [patientID, doctorID, availableTimeID]
    );

    const appointmentID = appointmentResult.insertId;

    // Update the available_time slot to not available
    await executeQuery('UPDATE available_time SET IsAvailable = 0 WHERE AvailableTimeID = ?', [availableTimeID]);

    // Commit the transaction
    await promisePool.query('COMMIT');

    res.json({
      message: 'Appointment booked successfully',
      appointment: {
        AppointmentID: appointmentID,
        DoctorID: doctorID,
        ScheduleDate: scheduleDate,
        StartTime: startTime,
        EndTime: endTime,
      },
    });
  } catch (err) {
    console.error('Error booking appointment:', err.message);
    await promisePool.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Login endpoint

app.post('/api/signin', async (req, res) => {
  debugger;
  const { email, password } = req.body;

  // Check if both fields are filled in
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter both email and password' });
  }

  try {
    // Find the user by email
    const users = await executeQuery('SELECT * FROM patients WHERE Email = ?', [email]);
    console.log(users)
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    console.log(user)
    // Compare the entered password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // If password matches, issue a JWT token
    const token = jwt.sign(
      { id: user.PatientID, email: user.Email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Sign-in successful',
      token,
      user: {
        id: user.PatientID,
        FullName: user.FullName,
        Email: user.Email,
      },
    });
  } catch (err) {
    console.error('Error during sign-in:', err.message);
    res.status(500).json({ message: 'Error during sign-in' });
  }
});

// Logout endpoint (optional)
app.post('/api/logout', (req, res) => {
  // Since JWTs are stateless, logout can be handled on the client side by deleting the token.
  // Alternatively, implement token blacklisting on the server side for enhanced security.
  res.json({ message: 'Logout successful' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Error handling middleware (should be the last middleware)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
