const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Brevo = require('@getbrevo/brevo'); // ✅ Brevo Imported
const multer = require('multer'); // 👈 ADDED: File handle karne ke liye
require('dotenv').config();

const coachRoutes = require('./routes/coachRoutes'); 

const app = express();
const upload = multer(); // 👈 ADDED: Audio chunks ko buffer mein rakhne ke liye

// Middleware
app.use(express.json());
app.use(cors());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🚀 MongoDB Atlas Connected!"))
  .catch((err) => console.log("❌ DB Connection Error: ", err));

// --- BREVO INITIALIZATION ---
// --- BREVO INITIALIZATION ---
// --- BREVO INITIALIZATION ---
// --- BREVO INITIALIZATION ---
const apiInstance = Brevo.TransactionalEmailsApi.alloc
  ? Brevo.TransactionalEmailsApi.alloc()
  : new Brevo.TransactionalEmailsApi();

if (apiInstance.authentications && apiInstance.authentications['api-key']) {
    apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
} else if (apiInstance.setApiKey) {
    apiInstance.setApiKey(0, process.env.BREVO_API_KEY);
} else {
    apiInstance.authentications = apiInstance.authentications || {};
    apiInstance.authentications['apiKey'] = { apiKey: process.env.BREVO_API_KEY };
}

// --- 1. USER SCHEMA ---
const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: String,
  experience: String,
  english: String,
  focus: String,
  otp: String,          
  otpExpires: Date,      
  isVerified: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- 2. QUESTION SCHEMA ---
const questionSchema = new mongoose.Schema({
    id: Number,
    title: String,
    difficulty: String,
    topic: String,
    description: String,
    example: String,
    snippets: Object,
    testCases: Array
});
const Question = mongoose.model('Question', questionSchema);

// --- 3. AI COACH ROUTES ---
app.use('/api/coach', coachRoutes);

// 🎯 NEW BYPASS ROUTE: Frontend ke ERR_NAME_NOT_RESOLVED block ko thik karne ke liye
app.post('/api/coach/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Audio file nahi mili" });
        }

        // Backend se direct Hugging Face ko hit (Yahan India ka ISP block kaam nahi karega)
        const hfResponse = await fetch(
            "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
            {
                headers: { 
                    Authorization: `Bearer ${process.env.HF_WHISPER_KEY}` // Key backend .env se uthayega
                },
                method: "POST",
                body: req.file.buffer, // Raw buffer direct hit hoga
            }
        );

        const aiResult = await hfResponse.json();
        res.json(aiResult); // Response direct frontend ko de diya
        
    } catch (error) {
        console.error("Backend HF Proxy Error:", error);
        res.status(500).json({ error: "Server failed to contact Hugging Face" });
    }
});

// --- 4. OTP SEND API ---
// --- 4. OTP SEND API ---
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log("📩 OTP Request for:", email);

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.password) {
      return res.status(400).json({ message: "Email already registered! Please login." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 600000; // 10 Min

    await User.findOneAndUpdate(
      { email },
      { otp: otpCode, otpExpires },
      { upsert: true, returnDocument: 'after' }
    );

    // 🎯 EXACT FIX: Route ke andar apiInstance ki key explicitly initialize kar di
    if (apiInstance.authentications && apiInstance.authentications['api-key']) {
        apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    } else if (apiInstance.setApiKey) {
        apiInstance.setApiKey(0, process.env.BREVO_API_KEY);
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Prep AI Security Verification Code";
    sendSmtpEmail.htmlContent = `<p>Your verification code is: <strong>${otpCode}</strong>. It is valid for 10 minutes.</p>`;
    sendSmtpEmail.sender = { "name": "Prep AI Support", "email": "support@prepai.dev" }; 
    sendSmtpEmail.to = [{ "email": email }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ OTP sent via Brevo to:", email);

    res.status(200).json({ message: "OTP sent successfully! 📧" });
  } catch (err) {
    console.error("❌ BREVO API ERROR:", err);
    res.status(500).json({ message: "Error sending OTP", error: err.message });
  }
});

// --- 5. OTP VERIFY API ---
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
        email, 
        otp, 
        otpExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: "Invalid or Expired OTP! ❌" });

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Email Verified! ✅" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// --- 6. SIGNUP API (Final Step) ---
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, experience, english, focus } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.findOneAndUpdate(
      { email },
      { 
        name, 
        password: hashedPassword, 
        role, 
        experience, 
        english, 
        focus, 
        otp: null, 
        otpExpires: null,
        isVerified: true 
      },
      { returnDocument: 'after' }
    );

    if (!user) return res.status(404).json({ message: "User not found. Verify email first." });
    res.status(201).json({ message: "User Registered Successfully! 🎉" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// --- 7. LOGIN API ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(404).json({ message: "User not found!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Password!" });

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '24h' }
    );

    res.status(200).json({ 
      message: "Access Granted!",
      token, 
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// --- 8. QUESTIONS API ---
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ message: "Questions fetch failed", error: err.message });
    }
});

app.get('/api/questions/:id', async (req, res) => {
    try {
        const question = await Question.findOne({ id: req.params.id });
        if (!question) return res.status(404).json({ message: "Question not found" });
        res.json(question);
    } catch (err) {
        res.status(500).json({ message: "Error fetching question", error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));