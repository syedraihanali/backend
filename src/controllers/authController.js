const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { findPatientByEmail } = require('../services/patientService');

// Authenticates a patient and issues a signed JWT.
async function signIn(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  const user = await findPatientByEmail(email);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Incorrect password.' });
  }

  const token = jwt.sign({ id: user.PatientID, email: user.Email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return res.json({
    message: 'Sign-in successful',
    token,
    user: {
      id: user.PatientID,
      fullName: user.FullName,
      email: user.Email,
    },
  });
}

// Stateless logout endpoint retained for API symmetry.
function logout(_req, res) {
  return res.json({ message: 'Logout successful' });
}

module.exports = {
  signIn,
  logout,
};
