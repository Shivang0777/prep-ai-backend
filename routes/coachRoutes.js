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

// 🎯 ORIGINAL READ MODULE ROUTE (Ise bilkul nahi chheda hai)
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Audio file nahi mili" });
        }

        const file = await Groq.toFile(req.file.buffer, 'audio.mp4', { type: req.file.mimetype });

        const transcription = await groq.audio.transcriptions.create({
            file: file, 
            model: "whisper-large-v3",
            language: "en",
        });

        res.json({ text: transcription.text });
        
    } catch (error) {
        console.error("Groq Whisper Error:", error);
        res.status(500).json({ error: "Groq transcription failed" });
    }
});

// 🎯 NEW MOCK INTERVIEW ROUTE (Sirf add kiya hai, purane wale ko bina chhede)
router.post('/transcribe-interview', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Mock Interview: Audio file nahi mili" });
        }

        console.log(`🎤 Interview Chunk Received: ${req.file.size} bytes`);

        // Extension mismatch se bachane ke liye standard webm format buffer inject kiya
        const file = await Groq.toFile(req.file.buffer, 'audio.webm', { type: req.file.mimetype });

        const transcription = await groq.audio.transcriptions.create({
            file: file, 
            model: "whisper-large-v3",
            language: "en",
            temperature: 0.0
        });

        const decodedText = transcription.text ? transcription.text.trim() : "";
        const lowerText = decodedText.toLowerCase();

        console.log(`📱 Decoded Text: "${decodedText}"`);

        // Voice commands analysis for hands-free mode
        let commandTriggered = null;
        if (lowerText.includes("next question") || lowerText.includes("next")) {
            commandTriggered = "next";
        } else if (
            lowerText.includes("session end") || 
            lowerText.includes("stop interview") || 
            lowerText.includes("end interview") ||
            lowerText.includes("stop")
        ) {
            commandTriggered = "stop";
        } else if (lowerText.includes("i am done") || lowerText.includes("done")) {
            commandTriggered = "done";
        }

        // Frontend ko decoded text aur parsed command dono jayenge
        return res.json({ 
            text: decodedText,
            command: commandTriggered 
        });
        
    } catch (error) {
        console.error("❌ Groq Interview Whisper Error:", error.message);
        return res.status(500).json({ error: "Groq interview transcription failed", details: error.message });
    }
});

module.exports = router;