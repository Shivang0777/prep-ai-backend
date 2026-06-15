const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const multer = require('multer'); 
const Groq = require('groq-sdk'); // 🛠️ Groq SDK import kiya

// 🎯 FIX: Explicit memory storage setup taaki audio buffer RAM mein bane aur crash na ho
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🎯 Render dashboard par jo GROQ_API_KEY pehle se hai, yeh usko use karega
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. पुराना रास्ता: जवाब का एनालिसिस करने के लिए (POST)
router.post('/analyze', aiController.analyzeAnswer);

// 2. नया रास्ता: AI से अनलिमिटेड सवाल मँगवाने के लिए (GET)
router.get('/generate-questions', aiController.generateQuestions);

// 3. AI voice interview questions
router.post('/mock-question', aiController.generateMockInterviewQuestion);

// 🚨 4. FIX: Report Card banane ke liye safe route
router.post('/save-session', aiController.saveAndAnalyzeSession);


// 🎯 5. BULLETPROOF & LIGHT-SPEED WHISPER PROXY ROUTE (VIA GROQ)
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Audio file nahi mili" });
        }

        // Multer ke memory buffer ko seedha Groq ki Whisper API par bhej rahe hain
        const transcription = await groq.audio.transcriptions.create({
            file: {
                fieldname: 'audio',
                originalname: 'recording.mp4',
                encoding: '7bit',
                mimetype: req.file.mimetype,
                buffer: req.file.buffer, // RAM Buffer safe transfer
            },
            model: "whisper-large-v3", // Same high-quality top model
            language: "en",
        });

        // Groq ka response direct frontend ko bhej do (Format: { text: "..." })
        res.json({ text: transcription.text });
        
    } catch (error) {
        console.error("Groq Whisper Error:", error);
        res.status(500).json({ error: "Groq transcription failed" });
    }
});

module.exports = router;