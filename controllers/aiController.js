const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- 1. ANALYSIS CONTROLLER (English Coach / Feedback) ---
exports.analyzeAnswer = async (req, res) => {
    console.log("--- New Analysis Request Received ---");
    try {
        const { question, userResponse } = req.body;

        if (!question || !userResponse) {
            return res.status(400).json({ error: "Bhai, question aur answer dono bhejna zaroori hai!" });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a professional Interview Coach. Evaluate the candidate's response like a human mentor. Return ONLY a JSON object."
                },
                {
                    role: "user",
                    content: `Review this: Question: "${question}", Answer: "${userResponse}". 
                    Return JSON: { "score": 1-10, "feedback": "critique", "improvedAnswer": "best way to say it" }`
                }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
            temperature: 0.5,
        });

        res.status(200).json(JSON.parse(chatCompletion.choices[0].message.content));
    } catch (error) {
        console.error("🚨 ANALYSIS ERROR:", error.message);
        res.status(500).json({ error: "Analysis fail ho gaya!" });
    }
};

// --- 2. QUESTION GENERATOR (Reading / Grammar Module) ---
exports.generateQuestions = async (req, res) => {
    console.log("--- New Question Generation Request ---");
    try {
        const { category } = req.query; 

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an experienced Interviewer. Generate human-like questions. Return ONLY JSON."
                },
                {
                    role: "user",
                    content: `Generate 5 unique questions for: ${category || 'General'}.
                    Rules: No textbook definitions. Focus on scenarios.
                    Return JSON: { "category": "${category}", "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"] }`
                }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
            temperature: 0.8, 
        });

        res.status(200).json(JSON.parse(chatCompletion.choices[0].message.content));
    } catch (error) {
        console.error("🚨 GENERATOR ERROR:", error.message);
        res.status(500).json({ error: "Questions nahi ban paye!" });
    }
};

// --- 3. MOCK INTERVIEW (Dynamic Cross-Questioning) ---
exports.generateMockInterviewQuestion = async (req, res) => {
    console.log("--- New Mock Interview Request ---");
    try {
        const { resumeText, chatHistory,role } = req.body;
        
        if (!resumeText) {
            return res.status(400).json({ error: "Resume text missing!" });
        }

        const systemPrompt = `You are 'Prep AI', a senior tech lead with 15 years of experience. You are interviewing for the role of ${role}. 

CONTEXT:
Resume: """${resumeText}"""

BEHAVIORAL GUIDELINES:
1. NO HEADERS: Never use words like "ROAST:", "AUDIT:", or "TRUTH-SLAYER" in your output. Just talk.
2. DETECT FAKES: If the candidate can't explain a technology listed on their resume, call it out directly. Example: "Wait, if you don't know the basics of [X], why did you list it as a skill?"
3. ANTI-BOT: If the answer sounds like a script or ChatGPT, shut it down: "Stop giving me a textbook definition. Tell me how YOU did it."
4. HUMAN TONE: Use natural phrases like "Look,", "Wait a second,", or "Let's be real."
5. PUNCHY & CONCISE: Strictly 1-2 short sentences. No yapping. No greetings. No fluff.
6. PERSISTENCE: If they avoid a question, don't move on. Ask it again differently until they answer or admit they don't know.`;

        // 🚨 FIXED: messages array initialization
        const messages = [{ role: "system", content: systemPrompt }];
        
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.slice(-4).forEach(msg => {
                messages.push({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.content
                });
            });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.1-8b-instant", 
            temperature: 0.4,
            max_tokens: 150,
        });

        const aiQuestion = chatCompletion.choices[0]?.message?.content?.trim();
        res.status(200).json({ question: aiQuestion });

    } catch (error) {
        console.error("🚨 MOCK ERROR:", error.message);
        res.status(200).json({ 
            question: "Technical connectivity issue, but let's proceed. Tell me about your most challenging project." 
        });
    }
};

exports.saveAndAnalyzeSession = async (req, res) => {
    try {
        const { chatHistory, resumeText } = req.body;

        // 1. AI se Full Feedback maango
        const analysisPrompt = `You are an expert Interview Auditor. 
        Analyze the following interview history between an AI and a Candidate.
        
        History: ${JSON.stringify(chatHistory)}
        
        Based on the technical depth, clarity, and accuracy of the Candidate's answers, generate a detailed report.
        Also, detect filler words (like 'umm', 'uhh', 'like', 'actually') from the chat history and estimate their timestamp in seconds based on the conversation flow.
        
        OUTPUT MUST BE ONLY A VALID JSON OBJECT:
        {
          "overallScore": 85, 
          "technicalScore": 80, 
          "communicationScore": 75, 
          "confidenceScore": 90, 
          "clarityScore": 70, 
          "contextScore": 75,
          "strengths": ["point 1", "point 2", "point 3"],
          "weaknesses": ["point 1", "point 2", "point 3"],
          "feedbackSummary": "Detailed summary here...",
          "fillerMoments": [
            { "timestamp": "0:15", "time": 15, "word": "umm" },
            { "timestamp": "0:45", "time": 45, "word": "like" }
          ]
        }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: analysisPrompt }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(completion.choices[0].message.content);

        // 2. Database mein save karo (Shayad tera 'Interview' model ho)
        // const newRecord = await Interview.create({ data: analysis, history: chatHistory });

        res.status(200).json(analysis);
    } catch (error) {
        res.status(500).json({ error: "Analysis failed" });
    }
};