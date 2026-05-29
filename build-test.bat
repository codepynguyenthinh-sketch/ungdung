@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"

REM ====================================================
REM Tu dong yeu cau quyen Admin (UAC popup Yes/No)
REM ====================================================
net session >nul 2>&1
if errorlevel 1 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

REM Watchdog scripts removed from project; no pre-clean necessary

title DPT Lab Manager - Build Test v2.0
echo.
echo ============================================
echo   DPT Lab Manager - Build Test v2.0
echo   (client_app-test.py + app-test.py)
echo ============================================
echo Thu muc: %CD%
echo.

REM ====================================================
REM [0] Kiem tra Python
REM ====================================================
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python khong duoc cai dat hoac chua them vao PATH!
    echo Vui long cai dat Python 3.10 hoac 3.11 tu:
    echo   https://www.python.org/downloads/release/python-3119/
    echo KHI CAI: Tich chon "Add Python to PATH"
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Python %PYVER% da duoc tim thay.
echo.

REM ====================================================
REM [0] Kiem tra file can thiet
REM ====================================================
echo Kiem tra cac file can thiet...

if not exist "client_app-test.py" (
    echo [ERROR] Khong tim thay client_app-test.py!
    pause
    exit /b 1
)
if not exist "app-test.py" (
    echo [ERROR] Khong tim thay app-test.py!
    pause
    exit /b 1
)

if not exist "server_config.json" (
    echo [INFO] Tao server_config.json mau...
    echo {"server_host": "192.168.200.102", "server_port": 5000, "room_name": "Phong May DPT", "api_key": "dpt-lab-manager-2024"} > server_config.json
    echo [CANH BAO] Hay sua server_config.json voi IP may chu chinh xac!
)

echo [OK] Kiem tra hoan tat.
echo.

REM ====================================================
REM [1/5] Cai dat dependencies
REM ====================================================
echo [1/5] Dang cai dat dependencies...
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Khong the cai dat dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies da duoc cai dat.
echo.

REM ====================================================
REM [2/5] Build DPT-Client.exe (tu client_app-test.py)
REM ====================================================
echo [2/5] Dang build DPT-Client.exe (tu client_app-test.py)...
python -m PyInstaller --clean client_app-test.spec --noconfirm
if errorlevel 1 (
    echo [ERROR] Build Client that bai!
    pause
    exit /b 1
)
echo [OK] DPT-Client.exe da duoc build.
echo.

REM ====================================================
REM [3/5] Build LabManager.exe (tu app-test.py)
REM ====================================================
echo [3/5] Dang build LabManager.exe (tu app-test.py)...
python -m PyInstaller --clean LabManager.spec --noconfirm
if errorlevel 1 (
    echo [ERROR] Build Server that bai!
    pause
    exit /b 1
)
echo [OK] LabManager.exe da duoc build.
echo.

REM ====================================================
REM [4/5] Sao chep file cau hinh vao dist\
REM ====================================================
echo [4/5] Dang sao chep file cau hinh...
if not exist "dist" mkdir dist

copy /Y server_config.json dist\ >nul 2>&1
copy /Y background.jpg     dist\ >nul 2>&1
copy /Y ads.json           dist\ >nul 2>&1
if exist "firebase_key.json" copy /Y firebase_key.json dist\ >nul 2>&1
if exist "myicon.ico"        copy /Y myicon.ico         dist\ >nul 2>&1
if exist "logo.png"          copy /Y logo.png           dist\ >nul 2>&1

echo.
echo ============================================
echo   BUILD THANH CONG!
echo ============================================
echo.
echo   dist\DPT-Client.exe   - Cai dat tren may SINH VIEN
echo   dist\LabManager.exe   - Chay tren may GIAO VIEN
echo.

REM ====================================================
REM [5/5] Dang ky khoi dong cung Windows (Task Scheduler)
REM ====================================================
echo [5/5] Dang ky khoi dong cung Windows (Task Scheduler)...
echo.

REM --- Xoa registry cu (neu co tu phien ban truoc) ---
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1

REM --- Dang ky DPT-Client ---
set "CLIENT_PATH="
if exist "%~dp0dist\DPT-Client\DPT-Client.exe" (
    set "CLIENT_PATH=%~dp0dist\DPT-Client\DPT-Client.exe"
) else if exist "%~dp0dist\DPT-Client.exe" (
    set "CLIENT_PATH=%~dp0dist\DPT-Client.exe"
)

if defined CLIENT_PATH (
    schtasks /Delete /TN "DPT-Client-Startup" /F >nul 2>&1
    schtasks /Create /TN "DPT-Client-Startup" /TR "\"%CLIENT_PATH%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
    if errorlevel 1 (
        echo [CANH BAO] Khong the tao Task Scheduler cho Client
    ) else (
        echo [OK] DPT-Client da dang ky khoi dong cung Windows
    )
) else (
    echo [CANH BAO] Khong tim thay DPT-Client.exe
)

REM --- Dang ky LabManager (Server) ---
set "SERVER_PATH="
if exist "%~dp0dist\LabManager\LabManager.exe" (
    set "SERVER_PATH=%~dp0dist\LabManager\LabManager.exe"
) else if exist "%~dp0dist\LabManager.exe" (
    set "SERVER_PATH=%~dp0dist\LabManager.exe"
)

if defined SERVER_PATH (
    schtasks /Delete /TN "DPT-Server-Startup" /F >nul 2>&1
    schtasks /Create /TN "DPT-Server-Startup" /TR "\"%SERVER_PATH%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
    if errorlevel 1 (
        echo [CANH BAO] Khong the tao Task Scheduler cho Server
    ) else (
        echo [OK] LabManager (Server) da dang ky khoi dong cung Windows
    )
) else (
    echo [CANH BAO] Khong tim thay LabManager.exe
)

echo.
echo ============================================
echo   BUILD + DANG KY STARTUP THANH CONG!
echo ============================================
echo.
echo   dist\DPT-Client.exe   - Cai dat tren may SINH VIEN
echo   dist\LabManager.exe   - Chay tren may GIAO VIEN
echo.
echo   Ca hai se tu dong khoi dong cung Windows!
echo   De go startup: chay register_startup.bat -> chon [4]
echo ============================================
echo.
pause
