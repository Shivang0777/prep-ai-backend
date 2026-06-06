import mongoose from 'mongoose';

const vaultSchema = new mongoose.Schema({
  role: { type: String, required: true },
  score: { type: String, required: true },
  feedback: { type: String, required: true },
  videoUrl: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Vault = mongoose.model('Vault', vaultSchema);
export default Vault;