const mongoose = require('mongoose');
const Question = require('./models/Question'); // पक्का कर ये रास्ता सही है
const fs = require('fs');
const path = require('path');

// तेरा MongoDB Atlas कनेक्शन स्ट्रिंग
const MONGO_URI = "mongodb+srv://shivangv456:9411337337@cluster0.3zp4t72.mongodb.net/prepAI?retryWrites=true&w=majority";

const seedDatabase = async () => {
    try {
        console.log("Connecting to Atlas... 🌐");
        await mongoose.connect(MONGO_URI);
        console.log("Neural Link Established.");

        // questions.json का रास्ता (उसी फोल्डर में होनी चाहिए)
        const filePath = path.join(__dirname, 'questions.json');

        // चेक करो कि फाइल मौजूद है या नहीं
        if (!fs.existsSync(filePath)) {
            console.error("❌ Error: 'questions.json' नहीं मिली! पहले फाइल बनाओ।");
            process.exit(1);
        }

        // फाइल पढ़ना और Parse करना
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const questions = JSON.parse(rawData);

        // 1. पुराना डेटा डिलीट (साफ-सफाई)
        console.log("Purging old mission data...");
        await Question.deleteMany({});

        // 2. नया डेटा इन्सर्ट
        console.log(`Injecting ${questions.length} new missions into Atlas...`);
        await Question.insertMany(questions);

        console.log("🚀 Mission Success: Atlas is now fully synced!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Critical Seeding Error:", err.message);
        process.exit(1);
    }
};

// रन करो
seedDatabase();