const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const multer = require('multer'); 
const Groq = require('groq-sdk');

// Memory storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Purane saare routes ekdum safe hain
router.post('/analyze', aiController.analyzeAnswer);
router.get('/generate-questions', aiController.generateQuestions);
router.post('/mock-question', aiController.generateMockInterviewQuestion);
router.post('/save-session', aiController.saveAndAnalyzeSession);

// 🎯 FIX: Groq directly buffer accepting standard method
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Audio file nahi mili" });
        }

        // Groq SDK ko crash hone se bachane ke liye standard File creation method
        const file = await Groq.toFile(req.file.buffer, 'audio.mp4', { type: req.file.mimetype });

        const transcription = await groq.audio.transcriptions.create({
            file: file, // Ab sahi file format ja raha hai
            model: "whisper-large-v3",
            language: "en",
        });

        res.json({ text: transcription.text });
        
    } catch (error) {
        console.error("Groq Whisper Error:", error);
        res.status(500).json({ error: "Groq transcription failed" });
    }
});

module.exports = router;