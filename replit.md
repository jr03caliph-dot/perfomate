# Performate

A student performance management system built with React, TypeScript, Express, and PostgreSQL.

## Overview

Performate is a web application for managing student performance, attendance tracking, and morning bliss scores. It includes features for:

- Student management and class organization
- Attendance tracking by prayer times
- Morning bliss score management
- Tally and star tracking for students
- PDF report generation
- Admin panel for system management

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Replit's built-in database via Drizzle ORM)
- **Authentication**: Custom session-based auth with bcrypt password hashing
- **Charts**: Recharts
- **PDF Generation**: jsPDF with autotable plugin

## Project Structure

```
├── server/                # Express.js backend
│   ├── index.ts           # Server entry point
│   ├── db.ts              # Database connection
│   ├── middleware/        # Auth middleware
│   └── routes/            # API routes
│       ├── auth.ts        # Authentication routes
│       ├── students.ts    # Student CRUD
│       ├── classes.ts     # Class management
│       ├── attendance.ts  # Attendance tracking
│       ├── tallies.ts     # Tally management
│       ├── stars.ts       # Star management
│       ├── morningBliss.ts# Morning bliss scores
│       └── admin.ts       # Admin operations
├── shared/
│   └── schema.ts          # Drizzle ORM schema (shared types)
├── src/                   # React frontend
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts for state
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── ClassesContext.tsx # Classes state
│   ├── lib/               # Utilities
│   │   ├── api.ts         # API client for backend
│   │   └── utils.ts       # Helper functions
│   ├── pages/             # Page components
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app with routing
│   └── main.tsx           # Entry point
├── drizzle.config.ts      # Drizzle ORM config
├── vite.config.ts         # Vite config
└── package.json           # Dependencies
```

## Database Schema

The app uses PostgreSQL with the following tables:
- `mentors` - User accounts for teachers/mentors
- `students` - Student records
- `classes` - Class definitions
- `tallies` - Class tally counts (negative marks)
- `stars` - Star counts (positive marks)
- `other_tallies` - Performance tally counts
- `attendance` - Daily prayer attendance
- `attendance_archive` - Archived attendance records
- `morning_bliss` - Morning bliss scores
- `tally_history` - History of tally/star changes
- `voice_of_director` - Director announcements
- `class_reasons` / `performance_reasons` / `star_reasons` - Configurable reasons
- `sessions` - Express session storage

## Environment Variables

The app uses Replit's built-in PostgreSQL database:
- `DATABASE_URL` - Automatically set by Replit

## Development

The development server runs both frontend and backend concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:5000 (Vite)
- Backend: http://localhost:3001 (Express)

Vite proxies `/api` requests to the backend.

## Authentication

The app uses custom session-based authentication:
1. Mentors register with email, password, full name, and short form
2. Passwords are hashed with bcrypt
3. Sessions are stored in PostgreSQL via connect-pg-simple
4. Session cookies are HTTP-only for security

Default admin panel password: `performate@123`

## Recent Changes (December 2024)

- Migrated from Supabase to Replit's built-in PostgreSQL database
- Replaced Supabase Auth with custom Express session-based authentication
- Created Express.js backend with all API routes
- Updated all frontend pages to use new API client
- Removed Supabase dependencies
- Configured Vite proxy for API requests

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new mentor
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

### Students
- `GET /api/students` - Get all students (optionally by class)
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Classes
- `GET /api/classes` - Get active classes
- `GET /api/classes/all` - Get all classes including inactive
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `POST /api/attendance/bulk` - Create multiple records

### Tallies & Stars
- `GET /api/tallies` - Get tallies
- `POST /api/tallies` - Add tally
- `GET /api/stars` - Get stars
- `POST /api/stars` - Add star

### Morning Bliss
- `GET /api/morning-bliss` - Get scores
- `POST /api/morning-bliss` - Add score

### Admin
- `GET/POST /api/admin/voice-of-director` - Director message
- `GET/POST/DELETE /api/admin/reasons/*` - Manage reasons
- `POST /api/admin/reset-monthly` - Monthly reset
- `GET/DELETE /api/admin/mentors` - Manage mentors

## Notes

- File upload for student photos has been disabled (was using Supabase Storage)
- Realtime updates have been removed (was using Supabase Realtime) - data refreshes on page load
- The app now uses optimistic updates for better UX
