// app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const Habit = require('./models/Habit');const { Parser } = require('json2csv');
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/habitTrackerDB';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    serverSelectionTimeoutMS: 30000,
    useUnifiedTopology: true,
});

// Home Page: List all habits and display the counter for tasks left
app.get('/', async (req, res) => {
    // Fetch habits with incomplete sub-tasks or not completed
    const habits = await Habit.find({});

    let tasksLeft = 0;
    let habitsToDisplay = [];

    habits.forEach(habit => {
        const incompleteSubTasks = habit.subTasks.filter(subTask => !subTask.completed);

        if (incompleteSubTasks.length > 0 || !habit.completed) {
            // Add habit to the main list if there's any incomplete sub-task or the habit itself is not completed
            habitsToDisplay.push({
                _id: habit._id,
                name: habit.name,
                frequency: habit.frequency,
                subTasks: incompleteSubTasks,
                completed: habit.completed
            });

            // Count the incomplete sub-tasks
            tasksLeft += incompleteSubTasks.length;
        }
    });

    res.render('index', { habits: habitsToDisplay, tasksLeft });
});



// Route to view missed habits
app.get('/missed', async (req, res) => {
    const missedHabits = await Habit.find({ missed: true });
    res.render('missed', { missedHabits });
});

// Export missed habits to CSV
app.get('/missed/export', async (req, res) => {
    const missedHabits = await Habit.find({ missed: true });

    const fields = ['name', 'frequency', 'date'];
    const parser = new Parser({ fields });
    const csv = parser.parse(missedHabits);

    res.header('Content-Type', 'text/csv');
    res.attachment('missed_habits.csv');
    return res.send(csv);
});


// Create a new habit
app.post('/habit', async (req, res) => {
    const { name, frequency, subTasks } = req.body;
    const habit = new Habit({
        name,
        frequency,
        subTasks: subTasks.split(',').map((task) => ({ name: task.trim() })),
    });
    await habit.save();
    res.redirect('/');
});

// Mark habit as completed
app.post('/habit/:id/complete', async (req, res) => {
    const habit = await Habit.findById(req.params.id);
    habit.completed = true;
    await habit.save();
    res.redirect('/');
});

// Mark a sub-task as completed or uncompleted
app.post('/habit/:habitId/subtask/:subTaskId/toggle', async (req, res) => {
    const habit = await Habit.findById(req.params.habitId);
    const subTask = habit.subTasks.id(req.params.subTaskId);

    subTask.completed = !subTask.completed;

    // Check if all sub-tasks are completed
    habit.completed = habit.subTasks.every(sub => sub.completed);

    await habit.save();
    res.redirect('/');
});

// View a specific habit with subtasks
app.get('/habit/:id', async (req, res) => {
    const habit = await Habit.findById(req.params.id);
    res.render('habit', { habit });
});

// Dashboard to view missed habits
app.get('/dashboard', async (req, res) => {
    const missedHabits = await Habit.find({ missed: true });
    res.render('dashboard', { missedHabits });
});

// View finished habits
app.get('/finished', async (req, res) => {
    const habits = await Habit.find({});

    let finishedHabits = [];

    habits.forEach(habit => {
        const completedSubTasks = habit.subTasks.filter(subTask => subTask.completed);

        if (completedSubTasks.length > 0) {
            // Add the habit to the finished list if it has any completed sub-tasks
            finishedHabits.push({
                _id: habit._id,
                name: habit.name,
                frequency: habit.frequency,
                subTasks: completedSubTasks,
                completed: habit.completed
            });
        }
    });

    res.render('finished', { finishedHabits });
});

// Undo the completion of a habit
app.post('/habit/:id/undo', async (req, res) => {
    const habit = await Habit.findById(req.params.id);
    if (habit) {
        habit.completed = false;
        habit.subTasks.forEach(subTask => {
            subTask.completed = false;
        });
        await habit.save();
    }
    res.redirect('/finished');
});

// Undo a completed sub-task and mark the main habit as incomplete
app.post('/habit/:habitId/subtask/:subTaskId/undo', async (req, res) => {
    const habit = await Habit.findById(req.params.habitId);
    if (habit) {
        const subTask = habit.subTasks.id(req.params.subTaskId);

        if (subTask) {
            subTask.completed = false;
            habit.completed = false;

            await habit.save();
        }
    }
    res.redirect('/finished');
});

// Schedule a cron job to run at 12 AM every day
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily reset job at 12 AM');

    // Find and reset all daily habits
    const dailyHabits = await Habit.find({ frequency: 'daily' });
    dailyHabits.forEach(async (habit) => {
        habit.subTasks.forEach(subTask => {
            subTask.completed = false;
        });
        habit.completed = false;
        await habit.save();
    });

    // Find weekly habits that should reset today
    const weeklyHabits = await Habit.find({ frequency: 'weekly' });
    const today = new Date();

    weeklyHabits.forEach(async (habit) => {
        const diffInDays = Math.floor((today - habit.date) / (1000 * 60 * 60 * 24));

        if (diffInDays >= 7) {
            habit.subTasks.forEach(subTask => {
                subTask.completed = false;
            });
            habit.completed = false;
            habit.date = new Date(); // Reset the date to today
            await habit.save();
        }
    });
});

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));