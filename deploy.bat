@echo off
REM Quick deployment script for Performate (Windows)

echo 🚀 Performate Deployment Helper
echo ================================
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  No .env file found!
    echo Please create a .env file with:
    echo.
    echo VITE_SUPABASE_URL=your_supabase_url
    echo VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    echo.
    pause
)

echo 📦 Building project...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed! Please fix errors and try again.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo Choose deployment option:
echo 1. Preview locally
echo 2. Just build (no deploy)
echo.
set /p option="Enter option (1-2): "

if "%option%"=="1" (
    echo 👀 Starting preview server...
    call npm run preview
) else if "%option%"=="2" (
    echo ✅ Build complete! Files are in the 'dist' folder.
    echo You can deploy manually by uploading the 'dist' folder to your hosting platform.
) else (
    echo Invalid option
)

pause

