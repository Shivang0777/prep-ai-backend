import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Vault from '../models/Vault.js';

// 1. Cloudinary Config (Hamesha .env use karein)
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// 2. Multer setup (RAM mein file rakhne ke liye)
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limit: 50MB tak ki video
});

// 3. Controller Function
export const saveInterviewToVault = async (req, res) => {
  try {
    const { role, score, feedback } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: "Video file missing!" });
    }

    // Cloudinary pe video upload karne ka logic (Using Stream)
    const cloudinaryResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { 
          resource_type: "video", 
          folder: "prep_ai_vault",
          public_id: `interview_${Date.now()}` // Unique name
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(videoFile.buffer);
    });

    // 4. DB Entry - Ab MongoDB mein data save ho raha hai
    const newVaultEntry = await Vault.create({ 
      videoUrl: cloudinaryResponse.secure_url, 
      role: role || "N/A",
      score: score || "0",
      feedback: feedback || "No feedback provided",
      date: new Date()
    });

    // Final Response
    res.status(200).json({ 
        success: true,
        message: "Interview saved to vault successfully!", 
        data: newVaultEntry 
    });

  } catch (error) {
    console.error("🚨 Backend Error:", error);
    res.status(500).json({ error: "Failed to save interview to vault" });
  }
};