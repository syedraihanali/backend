const { listDoctors } = require('../services/doctorService');

// Returns the catalog of doctors available in the clinic.
async function getDoctors(_req, res) {
  const doctors = await listDoctors();
  return res.json(doctors);
}

module.exports = {
  getDoctors,
};
