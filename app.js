const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const Habit = require('./models/Habit');
const { Parser } = require('json2csv');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/habitTrackerDB';
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');

   // Check if we're in development mode
   if (process.env.NODE_ENV === 'development') {
    console.log('Running in development mode. Dropping existing collections...');

    const db = mongoose.connection.db;

    // Check if the "habits" collection exists before dropping it
    const collections = await db.listCollections().toArray();
    const habitCollectionExists = collections.some(col => col.name === 'habits');

    if (habitCollectionExists) {
        await db.dropCollection('habits');
        console.log('Dropped habits collection');
    } else {
        console.log('No habits collection to drop.');
    }
}
  })
  .catch((err) => console.log('MongoDB connection error: ', err));

// Home Page: List all habits and display the counter for tasks left
app.get('/', async (req, res) => {
  const habits = await Habit.find({ completed: false }); // Fetch only incomplete habits
  let tasksLeft = 0;
  habits.forEach(habit => {
    const incompleteSubTasks = habit.subTasks.filter(subTask => !subTask.completed);
    tasksLeft += incompleteSubTasks.length;
  });
  res.render('index', { habits, tasksLeft });
});

// Create a new habit
app.post('/habit', async (req, res) => {
  const { name, frequency, subTasks } = req.body;

  try {
      // Ensure all subtasks have a non-empty name
      const validSubTasks = subTasks.split(',').map(subTask => subTask.trim()).filter(subTask => subTask !== '');

      if (validSubTasks.length === 0) {
          return res.status(400).send('Habit must have at least one valid subtask');
      }

      const habit = new Habit({
          name,
          frequency,
          subTasks: validSubTasks.map(taskName => ({ name: taskName }))
      });

      await habit.save();
      res.redirect('/');
  } catch (error) {
      console.error('Error creating habit:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/habit/:habitId/complete', async (req, res) => {
  const { habitId } = req.params;

  try {
      // Fetch the habit from the database
      const habit = await Habit.findById(habitId);

      if (!habit) {
          return res.status(404).send('Habit not found');
      }

      // Mark the habit and all its subtasks as complete
      habit.completed = true;
      habit.subTasks.forEach(subTask => {
          subTask.completed = true; // Mark each subtask as completed
      });

      // Save the updated habit
      await habit.save();

      // Redirect to the finished habits page (scroll to the completed habit)
      res.redirect('/finished');
  } catch (error) {
      console.error('Error completing habit:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Edit a habit
app.get('/habit/:id/edit', async (req, res) => {
  const habit = await Habit.findById(req.params.id);
  res.render('edit', { habit });
});

// Update a habit
app.post('/habit/:id/edit', async (req, res) => {
  const { name, frequency, subTasks } = req.body;
  const updatedSubTasks = subTasks.map((subTask) => ({
    name: subTask.name,
    completed: !!subTask.completed,
  }));

  await Habit.findByIdAndUpdate(req.params.id, {
    name,
    frequency,
    subTasks: updatedSubTasks,
  });
  res.redirect('/');
});

// Undo the completion of a habit
app.post('/habit/:id/undo', async (req, res) => {
    const habitId = req.params.id;
    try {
        const habit = await Habit.findById(habitId);
        if (!habit) {
            return res.status(404).send('Habit not found');
        }

        // Mark the habit as incomplete
        habit.completed = false;

        // Mark all subtasks as incomplete as well
        habit.subTasks.forEach(subTask => {
            subTask.completed = false;
        });

        await habit.save();
        res.redirect('/'); // Redirect back to the main page or the relevant page
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete a habit
app.post('/habit/:id/delete', async (req, res) => {
  await Habit.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

// Toggle a subtask as complete or incomplete
app.post('/habit/:habitId/subtask/:subTaskId/toggle', async (req, res) => {
  const habit = await Habit.findById(req.params.habitId);
  const subTask = habit.subTasks.id(req.params.subTaskId);

  subTask.completed = !subTask.completed;

  // Check if all subtasks are complete
  habit.completed = habit.subTasks.every((sub) => sub.completed);

  await habit.save();
  res.redirect('/');
});

// Edit a subtask
app.get('/habit/:habitId/subtask/:subTaskId/edit', async (req, res) => {
  const habit = await Habit.findById(req.params.habitId);
  const subTask = habit.subTasks.id(req.params.subTaskId);
  res.render('edit_subtask', { habit, subTask });
});

// Update a subtask
app.post('/habit/:habitId/subtask/:subTaskId/edit', async (req, res) => {
  const habit = await Habit.findById(req.params.habitId);
  const subTask = habit.subTasks.id(req.params.subTaskId);
  subTask.name = req.body.name;

  await habit.save();
  res.redirect('/');
});

app.post('/habit/:habitId/subtask/:subtaskId/undo', async (req, res) => {
    const { habitId, subtaskId } = req.params;

    try {
        const habit = await Habit.findById(habitId);
        const subTask = habit.subTasks.id(subtaskId);

        if (!subTask) {
            return res.status(404).send('Subtask not found');
        }

        subTask.completed = false;

        // Mark the habit as incomplete if any subtask is undone
        habit.completed = false;
        await habit.save();

        res.redirect('/');
    } catch (error) {
        console.error('Error undoing subtask:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to mark a subtask as completed and move it to the finished subtasks page
app.post('/habit/:habitId/subtask/:subtaskId/complete', async (req, res) => {
    const { habitId, subtaskId } = req.params;

    try {
        const habit = await Habit.findById(habitId);
        const subTask = habit.subTasks.id(subtaskId);

        if (!subTask) {
            return res.status(404).send('Subtask not found');
        }

        subTask.completed = true; // Mark the subtask as completed

        await habit.save(); // Save the updated habit

        res.redirect(`/#subtask-${subtaskId}`);
    } catch (error) {
        console.error('Error completing subtask:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to get finished habits and subtasks
app.get('/finished', async (req, res) => {
    try {
        // Fetch all habits with completed subtasks
        const finishedHabits = await Habit.find({
            'subTasks.completed': true
        });

        // Collect all completed subtasks along with the habit details
        let finishedSubtasks = [];

        finishedHabits.forEach(habit => {
            habit.subTasks.forEach(subTask => {
                if (subTask.completed) {
                    finishedSubtasks.push({
                        name: subTask.name,
                        habitName: habit.name,
                        habitId: habit._id,
                        _id: subTask._id // Subtask ID
                    });
                }
            });
        });

        res.render('finished', { finishedHabits, finishedSubtasks });
    } catch (error) {
        console.error('Error fetching finished habits and subtasks:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/habit/:habitId/subtask/:subtaskId/delete', async (req, res) => {
  const { habitId, subtaskId } = req.params;

  try {
      // Find the habit by its ID
      const habit = await Habit.findById(habitId);

      if (!habit) {
          return res.status(404).send('Habit not found');
      }

      // Find the index of the subtask and remove it
      const subtaskIndex = habit.subTasks.findIndex(subTask => subTask._id.toString() === subtaskId);

      if (subtaskIndex > -1) {
          habit.subTasks.splice(subtaskIndex, 1); // Remove the subtask from the array
      } else {
          return res.status(404).send('Subtask not found');
      }

      // Save the updated habit
      await habit.save();

      // Redirect to the main page after deletion
      res.redirect('/');
  } catch (error) {
      console.error('Error deleting subtask:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/missed', async (req, res) => {
  try {
      // Fetch missed habits (this assumes you have a 'missed' property in the Habit model)
      const missedHabits = await Habit.find({ missed: true });

      // Render the missed habits page with the retrieved data
      res.render('missed', { missedHabits });
  } catch (error) {
      console.error('Error fetching missed habits:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Cron job for daily and weekly resets
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily reset job at 12 AM');

  const today = new Date();

  // Reset and mark missed daily habits
  const dailyHabits = await Habit.find({ frequency: 'daily' });
  dailyHabits.forEach(async (habit) => {
    if (!habit.completed) {
      habit.missed = true; // Mark habit as missed if not completed
    }
    habit.subTasks.forEach((subTask) => {
      subTask.completed = false;
    });
    habit.completed = false;
    habit.missed = false; // Reset missed status after each day
    habit.date = today; // Update the reset date to today
    await habit.save();
  });

  // Reset and mark missed weekly habits
  const weeklyHabits = await Habit.find({ frequency: 'weekly' });
  weeklyHabits.forEach(async (habit) => {
    const diffInDays = Math.floor((today - habit.date) / (1000 * 60 * 60 * 24));
    if (diffInDays >= 7) {
      if (!habit.completed) {
        habit.missed = true; // Mark as missed if the weekly habit wasn't completed
      }
      habit.subTasks.forEach((subTask) => {
        subTask.completed = false;
      });
      habit.completed = false;
      habit.missed = false; // Reset missed status after each week
      habit.date = today; // Update the reset date to today
      await habit.save();
    }
  });
});

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));