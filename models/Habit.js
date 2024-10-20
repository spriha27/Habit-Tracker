const mongoose = require('mongoose');

const subTaskSchema = new mongoose.Schema({
  name: {
      type: String,
      required: [true, 'Subtask name is required']
  },
  completed: { type: Boolean, default: false }
});

const HabitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  missed: { 
    type: Boolean, 
    default: false,
},
  subTasks: [subTaskSchema],
});

const Habit = mongoose.model('Habit', HabitSchema);
module.exports = Habit;