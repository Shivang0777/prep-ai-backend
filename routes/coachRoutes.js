const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 1. पुराना रास्ता: जवाब का एनालिसिस करने के लिए (POST)
router.post('/analyze', aiController.analyzeAnswer);

// 2. नया रास्ता: AI से अनलिमिटेड सवाल मँगवाने के लिए (GET)
router.get('/generate-questions', aiController.generateQuestions);

// 3. AI voice interview questions
router.post('/mock-question', aiController.generateMockInterviewQuestion);

// 🚨 4. FIX: Yeh missing tha! Iske bina Report Card nahi banega

router.post('/save-session', aiController.saveAndAnalyzeSession);
module.exports = router;

