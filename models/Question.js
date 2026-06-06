const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, required: true },
    topic: { type: String, required: true },
    description: { type: String, default: "Mission description loading..." },
    example: { type: String, default: "" },
    testCases: [
        {
            input: String,
            inputDisplay: String,
            expected: String,
            injector: {
                javascript: String,
                python: String
            }
        }
    ],
    snippets: {
        javascript: String,
        python: String,
        java: String,
        cpp: String
    }
});

module.exports = mongoose.model('Question', QuestionSchema);