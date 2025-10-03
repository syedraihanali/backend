const mysql = require('mysql2/promise');
const config = require('./src/config/env');

// Utility script to seed random availability slots for doctors.
function formatDate(date) {
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2);
  const day = (`0${date.getDate()}`).slice(-2);
  return `${year}-${month}-${day}`;
}

function formatTime(hour) {
  return `${hour.toString().padStart(2, '0')}:00:00`;
}

async function populateAvailableTime() {
  const connection = await mysql.createConnection({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  });

  try {
    console.log('Connected to the database.');

    await connection.execute('DELETE FROM available_time WHERE ScheduleDate < CURDATE()');
    console.log('Deleted expired available_time records.');

    const [doctors] = await connection.execute('SELECT DoctorID FROM doctors');
    if (doctors.length === 0) {
      console.log('No doctors found in the database. Please add doctors first.');
      return;
    }

    const doctorIDs = doctors.map((doc) => doc.DoctorID);
    console.log(`Found ${doctorIDs.length} doctor(s).`);

    const today = new Date();
    const numberOfDays = 10;
    const dailyStartHour = 9;
    const dailyEndHour = 16;

    let totalInserts = 0;

    for (let dayOffset = 0; dayOffset < numberOfDays; dayOffset += 1) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const formattedDate = formatDate(currentDate);

      for (let hour = dailyStartHour; hour < dailyEndHour; hour += 1) {
        const startTime = formatTime(hour);
        const endTime = formatTime(hour + 1);

        for (const doctorID of doctorIDs) {
          const isAvailable = Math.random() < 0.7 ? 1 : 0;
          await connection.execute(
            'INSERT INTO available_time (DoctorID, ScheduleDate, StartTime, EndTime, IsAvailable) VALUES (?, ?, ?, ?, ?)',
            [doctorID, formattedDate, startTime, endTime, isAvailable]
          );
          totalInserts += 1;
        }
      }
    }

    console.log(`Inserted ${totalInserts} available time slots into the database.`);
  } catch (error) {
    console.error('Error populating available time:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

populateAvailableTime();
