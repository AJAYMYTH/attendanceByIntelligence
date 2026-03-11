# Attendance By Intelligence (ABI) 🚀

A smart attendance tracking system with automated verification, analytics, and WhatsApp integration for absentee alerts.

## 🌟 Features
- **Smart Attendance**: Mark attendance easily with a toggle-based UI.
- **WhatsApp Integration**: Automatically send absentee lists to WhatsApp groups.
- **Student Management**: Manual registration and bulk Excel import.
- **Analytics Dashboard**: Visualize attendance trends and download detailed reports.
- **Security**: Role-based access control (Admin/Staff) and JWT-based authentication.

---

## 🛠️ Setup & Installation

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [Git](https://git-scm.com/)

### 2. Clone the Repository
Open your terminal or command prompt and run:
```bash
git clone https://github.com/AJAYMYTH/attendanceByIntelligence.git
cd "attendanceByIntelligence"
```

### 3. Install Dependencies
Install all required Node.js packages:
```bash
npm install
```

### 4. Configure Environment Variables
Create a file named `.env` in the root directory and add the following (replace placeholders with your actual Supabase credentials):
```env
PORT=5000
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET=your_random_secret_string
```

### 5. Supabase Database Setup
Create a Supabase project and run the following tables in the SQL Editor:
- `students`: (id, name, register_number, section)
- `attendance_records`: (id, student_id, status, section, attendance_date, recorded_by)
- `users`: (id, username, password, role, uid)

### 6. Run the Project
Start the server:
```bash
npm start
```
The application will be available at [http://localhost:5000](http://localhost:5000).

---

## 📱 Usage
1. **Login**: Use your authorized credentials.
2. **Mark Attendance**: Select a section, mark students, and click "Finalize Attendance".
3. **WhatsApp Redirect**: If there are absentees, a prompt will appear. Click "OK" to open WhatsApp with the pre-filled list.
4. **Analytics**: Go to the Analytics tab to view trends and download reports.

## 🛠️ Built With
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Utilities**: Chart.js, XLSX, JWT
