## Habit Tracker Web Application

This is a **Habit Tracker** web application that helps users create and manage habits, track their progress on daily/weekly tasks, and monitor missed habits. Built using **Node.js**, **Express**, **MongoDB**, and **EJS**, the app features a visually appealing UI with a gradient-based orange and brown palette, enhanced by **Bootstrap 5.3.3** for responsive design.

### **Features**

- **Add New Habits**: Users can add habits with customizable subtasks that can be set to daily or weekly.
- **Track Habit Progress**: Mark subtasks as completed or undo them, with progress updated dynamically.
- **View Completed Habits**: Track finished habits with options to move them back to the active list.
- **Missed Habit Tracking**: View and export missed habits for further analysis in CSV format.
- **Responsive Design**: Beautifully styled with Bootstrap 5.3.3 and an orange/brown gradient color palette.

### **Tech Stack**

- **Backend**: Node.js, Express
- **Frontend**: EJS (Embedded JavaScript templates), Bootstrap 5.3.3
- **Database**: MongoDB (using Mongoose as the ODM)
- **Styling**: CSS with Bootstrap and gradient-based custom styles

### **Prerequisites**

- Node.js and npm installed
- MongoDB installed and running locally

### **Installation**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/habit-tracker.git
   cd habit-tracker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start MongoDB** (if not running)
   ```bash
   mongod
   ```

4. **Run the Application**
   ```bash
   node app.js
   ```

5. Open your browser and visit: `http://localhost:3300`

### **File Structure**

```
habit-tracker
│
├── models
│   └── Habit.js          # Mongoose model for habits and subtasks
├── views
│   ├── index.ejs         # Main page view
│   ├── finished.ejs      # Finished habits view
│   ├── missed.ejs        # Missed habits view
│   └── habit.ejs         # Individual habit view
├── public
│   └── style.css         # Custom CSS styling (if any)
├── app.js                # Main application logic and routes
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

### **Key Routes**

- **Home** (`/`): View all active habits and add new ones.
- **Finished** (`/finished`): View completed habits with the option to undo.
- **Missed** (`/missed`): View missed habits and export them to CSV.



### **Exporting Missed Habits**

1. Visit the "Missed Habits" page via `/missed`.
2. Click on the "Export as CSV" button to download a CSV file containing missed habits.

### **Styling and Customization**

The app utilizes Bootstrap 5.3.3 along with custom gradient styles in an orange and brown palette. Feel free to customize the styles in the `style.css` or directly within the EJS files.

### **Dependencies**

- [Express](https://expressjs.com/) - Web framework for Node.js
- [EJS](https://ejs.co/) - Embedded JavaScript templating
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling for Node.js
- [Bootstrap 5.3.3](https://getbootstrap.com/) - CSS framework for responsive design
- [json2csv](https://www.npmjs.com/package/json2csv) - For exporting data in CSV format

### **Potential Improvements**

- Add authentication to support multiple users.
- Introduce analytics for habit trends over time.
- Integrate a calendar view to visualize completed and missed habits.

### **Contributing**

Contributions are welcome! Please create a pull request for any changes you'd like to make.

### **License** ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---