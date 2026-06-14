const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/d-cert';

const signer = {
  username: process.env.SIGNER_USERNAME || 'signer',
  password: process.env.SIGNER_PASSWORD || '123456',
  fullName: process.env.SIGNER_FULL_NAME || 'Tai khoan ky duyet',
  email: process.env.SIGNER_EMAIL || 'signer@d-cert.local',
  role: 'SIGNER',
  status: 'ACTIVE',
};

async function main() {
  await mongoose.connect(mongoUri);

  const existing = await User.findOne({
    $or: [{ username: signer.username }, { email: signer.email }],
  });

  if (existing) {
    existing.username = signer.username;
    existing.password = signer.password;
    existing.fullName = signer.fullName;
    existing.email = signer.email;
    existing.role = signer.role;
    existing.status = signer.status;
    await existing.save();

    console.log(`Updated signer user: ${existing.username} (${existing.role})`);
    return;
  }

  const created = await User.create(signer);
  console.log(`Created signer user: ${created.username} (${created.role})`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
