const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/d-cert';

const START_STUDENT_ID = Number(process.env.STUDENT_SEED_START || 102220150);
const STUDENT_COUNT = Number(process.env.STUDENT_SEED_COUNT || 10);
const DEFAULT_PASSWORD = process.env.STUDENT_SEED_PASSWORD || '123456';

const buildStudent = (studentId) => ({
  username: studentId,
  password: DEFAULT_PASSWORD,
  fullName: `Sinh vien ${studentId}`,
  email: `${studentId}@student.d-cert.local`,
  role: 'STUDENT',
  studentId,
  status: 'ACTIVE',
});

async function upsertStudent(student) {
  const existing = await User.findOne({
    $or: [
      { username: student.username },
      { email: student.email },
      { studentId: student.studentId },
    ],
  });

  if (existing) {
    existing.username = student.username;
    existing.password = student.password;
    existing.fullName = student.fullName;
    existing.email = student.email;
    existing.role = student.role;
    existing.studentId = student.studentId;
    existing.status = student.status;
    await existing.save();
    return { action: 'updated', user: existing };
  }

  const created = await User.create(student);
  return { action: 'created', user: created };
}

async function main() {
  await mongoose.connect(mongoUri);

  const results = [];
  for (let i = 0; i < STUDENT_COUNT; i += 1) {
    const studentId = String(START_STUDENT_ID + i);
    results.push(await upsertStudent(buildStudent(studentId)));
  }

  for (const result of results) {
    console.log(`${result.action}: ${result.user.username} (${result.user.role}) password=${DEFAULT_PASSWORD}`);
  }

  console.log(`Done. Total students processed: ${results.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
