# Performate

A student performance management system built with React, TypeScript, and Supabase.

## Overview

Performate is a web application for managing student performance, attendance tracking, and morning bliss scores. It includes features for:

- Student management and class organization
- Attendance tracking by prayer times
- Morning bliss score management
- PDF report generation
- Admin panel for system management

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS (index.css)
- **Backend/Database**: Supabase (external service)
- **Charts**: Recharts
- **PDF Generation**: jsPDF with autotable plugin

## Project Structure

```
src/
├── components/     # Reusable UI components
│   └── Layout.tsx  # Main layout wrapper
├── contexts/       # React contexts for state management
│   ├── AuthContext.tsx     # Authentication state
│   └── ClassesContext.tsx  # Classes state
├── lib/            # Utility functions and configurations
│   ├── supabase.ts # Supabase client setup
│   └── utils.ts    # Helper functions
├── pages/          # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Classes.tsx
│   ├── AddStudents.tsx
│   ├── Reports.tsx
│   ├── MarkAttendance.tsx
│   ├── AttendanceMultipleEntry.tsx
│   ├── AttendanceReports.tsx
│   ├── ViewByPrayer.tsx
│   ├── MorningBlissScores.tsx
│   ├── MorningBlissReports.tsx
│   ├── AdminPanel.tsx
│   ├── ViewHistory.tsx
│   └── MultipleEntry.tsx
├── types/          # TypeScript type definitions
│   └── index.ts
├── App.tsx         # Main app with routing
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## Environment Variables

The app requires the following environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

## Development

The development server runs on port 5000 using Vite.

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Database Setup

The `supabase/migrations/` folder contains SQL migrations for setting up the database schema. These should be run in your Supabase project.

## Recent Changes

- Configured Vite for Replit environment (port 5000, host 0.0.0.0)
- Set up development workflow

## User Preferences

(To be updated based on user feedback)
