// models/Habit.js
const mongoose = require('mongoose');

const SubTaskSchema = new mongoose.Schema({
    name: String,
    completed: { type: Boolean, default: false }
});

const HabitSchema = new mongoose.Schema({
    name: String,
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    date: { type: Date, default: Date.now },
    subTasks: [SubTaskSchema],
    completed: { type: Boolean, default: false }, // Completed only when all subtasks are done
    missed: { type: Boolean, default: false },
});

module.exports = mongoose.model('Habit', HabitSchema);