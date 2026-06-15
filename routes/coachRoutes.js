const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const multer = require('multer'); // 🛠️ Naya: Audio handle karne ke liye
const upload = multer(); // 🛠️ Naya: Audio handle karne ke liye

// 1. पुराना रास्ता: जवाब का एनालिसिस करने के लिए (POST)
router.post('/analyze', aiController.analyzeAnswer);

// 2. नया रास्ता: AI से अनलिमिटेड सवाल मँगवाने के लिए (GET)
router.get('/generate-questions', aiController.generateQuestions);

// 3. AI voice interview questions
router.post('/mock-question', aiController.generateMockInterviewQuestion);

// 🚨 4. FIX: Yeh missing tha! Iske bina Report Card nahi banega
router.post('/save-session', aiController.saveAndAnalyzeSession);


// 🎯 5. NEW SAFE PROXY ROUTE: (Isse server.js aur Brevo ekdum safe rahenge)
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Audio file nahi mili" });
        }

        // Backend se Hugging Face ko hit maaro (Bypass client network block)
        const hfResponse = await fetch(
            "https://api.huggingface.co/models/openai/whisper-large-v3",
            {
                headers: { 
                    Authorization: `Bearer ${process.env.HF_WHISPER_KEY}` 
                },
                method: "POST",
                body: req.file.buffer, 
            }
        );

        const aiResult = await hfResponse.json();
        res.json(aiResult); 
        
    } catch (error) {
        console.error("Backend HF Proxy Error:", error);
        res.status(500).json({ error: "Hugging Face proxy failed" });
    }
});


module.exports = router;