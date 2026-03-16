const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['SYS_ADMIN', 'OFFICER', 'SIGNER'], 
    default: 'OFFICER' 
  },
  walletAddress: { 
    type: String, 
    sparse: true, 
    unique: true,
    lowercase: true 
  },
  status: { type: String, enum: ['ACTIVE', 'LOCKED'], default: 'ACTIVE' }
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);