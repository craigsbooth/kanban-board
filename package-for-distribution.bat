@echo off
REM Ten10 Project Management - Distribution Package Creator for Windows
REM This script creates a clean package ready for distribution

echo ========================================
echo Creating distribution package...
echo ========================================

REM Create timestamp using PowerShell (wmic is deprecated)
for /f "usebackq tokens=*" %%i in (`powershell -command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set "timestamp=%%i"

set "PACKAGE_DIR=ten10-project-management-dist"
set "PACKAGE_NAME=ten10-project-management_%timestamp%"

REM Remove existing package directory if it exists
if exist "%PACKAGE_DIR%" (
    rmdir /s /q "%PACKAGE_DIR%"
)

REM Create package directory
mkdir "%PACKAGE_DIR%"

echo [INFO] Copying source files...

REM Copy essential files and directories (excluding node_modules and build artifacts)
xcopy /e /i packages\backend\src "%PACKAGE_DIR%\packages\backend\src"
xcopy /e /i packages\backend\prisma "%PACKAGE_DIR%\packages\backend\prisma"
xcopy /e /i packages\frontend\src "%PACKAGE_DIR%\packages\frontend\src"
xcopy /e /i packages\frontend\public "%PACKAGE_DIR%\packages\frontend\public" 2>nul

REM Copy configuration files
copy "packages\backend\package.json" "%PACKAGE_DIR%\packages\backend\"
copy "packages\backend\tsconfig.json" "%PACKAGE_DIR%\packages\backend\"
copy "packages\backend\jest.config.js" "%PACKAGE_DIR%\packages\backend\"
copy "packages\backend\jest.config.auth.js" "%PACKAGE_DIR%\packages\backend\"
copy "packages\backend\.eslintrc.js" "%PACKAGE_DIR%\packages\backend\"

copy "packages\frontend\package.json" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\tsconfig.json" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\tsconfig.node.json" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\vite.config.ts" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\tailwind.config.js" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\postcss.config.js" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\.eslintrc.cjs" "%PACKAGE_DIR%\packages\frontend\"
copy "packages\frontend\index.html" "%PACKAGE_DIR%\packages\frontend\"

REM Copy root files
copy package.json "%PACKAGE_DIR%\"
copy package-lock.json "%PACKAGE_DIR%\"
copy README.md "%PACKAGE_DIR%\"
copy QUICK_START.md "%PACKAGE_DIR%\"
copy setup.sh "%PACKAGE_DIR%\"
copy setup.bat "%PACKAGE_DIR%\"
copy .gitignore "%PACKAGE_DIR%\"

REM Copy environment examples
copy "packages\backend\.env.example" "%PACKAGE_DIR%\packages\backend\"
if exist "packages\frontend\.env.example" (
    copy "packages\frontend\.env.example" "%PACKAGE_DIR%\packages\frontend\"
)

REM Copy spec files (optional - for documentation)
if exist ".kiro" (
    xcopy /e /i .kiro "%PACKAGE_DIR%\.kiro"
)

echo [INFO] Cleaning up package...

REM Remove any accidentally copied build artifacts
if exist "%PACKAGE_DIR%\packages\backend\dist" (
    rmdir /s /q "%PACKAGE_DIR%\packages\backend\dist"
)
if exist "%PACKAGE_DIR%\packages\frontend\dist" (
    rmdir /s /q "%PACKAGE_DIR%\packages\frontend\dist"
)

REM Remove database files
del "%PACKAGE_DIR%\packages\backend\prisma\*.db" 2>nul

echo [INFO] Creating archive...

REM Create zip archive with better error handling
powershell -command "try { Compress-Archive -Path '%PACKAGE_DIR%' -DestinationPath '%PACKAGE_NAME%.zip' -Force -ErrorAction Stop; Write-Host 'Archive created successfully' } catch { Write-Host 'Archive creation failed:' $_.Exception.Message }"

REM Check if archive was created
if exist "%PACKAGE_NAME%.zip" (
    echo [OK] Created %PACKAGE_NAME%.zip
    for %%I in ("%PACKAGE_NAME%.zip") do echo    Size: %%~zI bytes
) else (
    echo [ERROR] Failed to create zip archive
    echo [WARN] You can manually zip the '%PACKAGE_DIR%' folder
)

REM Clean up temporary directory only if zip was created successfully
if exist "%PACKAGE_NAME%.zip" (
    rmdir /s /q "%PACKAGE_DIR%"
) else (
    echo [WARN] Keeping '%PACKAGE_DIR%' folder since zip creation failed
    echo    You can manually zip this folder and then delete it
)

echo.
echo ========================================
echo Distribution package created!
echo ========================================
echo.
echo Package file:
echo    - %PACKAGE_NAME%.zip
echo.
echo Ready to share!
echo.
echo Recipients should:
echo 1. Extract the archive
echo 2. Run setup.bat
echo 3. Start with: npm run dev
echo.
pause
