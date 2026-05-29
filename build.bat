@echo off
chcp 65001 >nul

REM Chuyen ve thu muc chua file build.bat nay
cd /d "%~dp0"

title DPT Lab Manager - Build Tool v2.0
echo.
echo ============================================
echo   DPT Lab Manager - Build Tool v2.0
echo ============================================
echo Thu muc: %CD%
echo.

REM ====================================================
REM [0] Kiem tra quyen Admin
REM ====================================================
net session >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Ban nen chay voi quyen Administrator!
    echo.
)

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
REM [0] Kiem tra va chuan bi file can thiet
REM ====================================================
echo Kiem tra cac file can thiet...

if not exist "client_app.py" (
    echo [ERROR] Khong tim thay client_app.py!
    pause
    exit /b 1
)

if not exist "app.py" (
    echo [ERROR] Khong tim thay app.py!
    pause
    exit /b 1
)

if not exist "server_config.json" (
    echo [INFO] File server_config.json se duoc tao tu dong khi chay lan dau tien.
    echo [INFO] Ban se duoc yeu cau nhap dia chi IP cua Server.
)

if not exist "myicon.ico" (
    echo [CANH BAO] Khong tim thay myicon.ico - se build khong co icon
)

if not exist "firebase_key.json" (
    echo [CANH BAO] Khong tim thay firebase_key.json - Firebase se bi tat
)

if not exist "requirements.txt" (
    echo [INFO] Khong tim thay requirements.txt, tao moi...
    (
        echo customtkinter>=5.2.0
        echo requests>=2.31.0
        echo psutil>=5.9.0
        echo flask>=3.0.0
        echo flask-sqlalchemy>=3.1.0
        echo flask-cors>=4.0.0
        echo keyboard>=0.13.5
        echo Pillow>=10.0.0
        echo "qrcode[pil]>=7.4.0"
        echo firebase-admin>=6.5.0
        echo werkzeug>=3.0.0
        echo pystray>=0.19.5
        echo pyinstaller>=6.0.0
        echo openpyxl>=3.1.0
        echo pandas>=2.0.0
    ) > requirements.txt
)

echo [OK] Kiem tra hoan tat.
echo.

REM ====================================================
REM [1.5] Don dep thu muc build/dist cu
REM ====================================================
echo Dang don dep build/dist cu...
if exist "build\DPT-CLIENT" (
    takeown /f "build\DPT-CLIENT" /r /d y >nul 2>&1
    icacls "build\DPT-CLIENT" /grant administrators:F /t >nul 2>&1
    rd /s /q "build\DPT-CLIENT" >nul 2>&1
)
if exist "build\DPT-SERVER" (
    takeown /f "build\DPT-SERVER" /r /d y >nul 2>&1
    icacls "build\DPT-SERVER" /grant administrators:F /t >nul 2>&1
    rd /s /q "build\DPT-SERVER" >nul 2>&1
)
echo [OK] Don dep hoan tat.
echo.

REM ====================================================
REM [1/4] Cai dat dependencies
REM ====================================================
echo [1/4] Dang cai dat dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Khong the cai dat dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies da duoc cai dat.
echo.

REM ====================================================
REM [2/4] Build DPT-Client.exe
REM ====================================================
echo [2/4] Dang build DPT-Client.exe...

if exist "DPT-CLIENT.spec" (
    pyinstaller DPT-CLIENT.spec --noconfirm
) else if exist "client_app.spec" (
    echo [CANH BAO] Dung client_app.spec thay the
    pyinstaller client_app.spec --noconfirm
) else (
    echo [ERROR] Khong tim thay file spec cho Client!
    pause
    exit /b 1
)

if errorlevel 1 (
    echo [ERROR] Build Client that bai!
    pause
    exit /b 1
)
echo [OK] DPT-Client.exe da duoc build.
echo.

REM ====================================================
REM [3/4] Build DPT-Server.exe
REM ====================================================
echo [3/4] Dang build DPT-Server.exe...

if exist "DPT-SERVER.spec" (
    pyinstaller DPT-SERVER.spec --noconfirm
    if errorlevel 1 (
        echo [ERROR] Build Server that bai!
        pause
        exit /b 1
    )
    echo [OK] DPT-Server.exe da duoc build.
) else (
    echo [INFO] Khong co DPT-SERVER.spec, bo qua build server.
)
echo.

REM ====================================================
REM [4/4] Sao chep file cau hinh vao dist\
REM ====================================================
echo [4/4] Dang sao chep file cau hinh...
if not exist "dist" mkdir dist

REM Luu y: server_config.json se duoc tao tu dong khi chay lan dau tien
REM Khong copy server_config.json de nguoi dung co the cau hinh IP server
if exist "server_config.json" copy /Y server_config.json dist\ >nul 2>&1
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
echo   dist\DPT-Client.exe  - Cai dat tren may SINH VIEN
echo   dist\DPT-Server.exe  - Chay tren may GIAO VIEN
echo.

REM ====================================================
REM [5/5] Dang ky khoi dong cung Windows (Task Scheduler)
REM ====================================================
echo.
set /p REG_CHOICE="Ban co muon dang ky khoi dong cung Windows khong? (Y/N): "
if /i "%REG_CHOICE%"=="Y" (
    echo.
    echo Dang dang ky vao Task Scheduler (ho tro quyen Admin)...
    
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
    
    REM --- Dang ky DPT-Server ---
    set "SERVER_PATH="
    if exist "%~dp0dist\DPT-Server\DPT-Server.exe" (
        set "SERVER_PATH=%~dp0dist\DPT-Server\DPT-Server.exe"
    ) else if exist "%~dp0dist\DPT-Server.exe" (
        set "SERVER_PATH=%~dp0dist\DPT-Server.exe"
    )
    
    if defined SERVER_PATH (
        schtasks /Delete /TN "DPT-Server-Startup" /F >nul 2>&1
        schtasks /Create /TN "DPT-Server-Startup" /TR "\"%SERVER_PATH%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
        if errorlevel 1 (
            echo [CANH BAO] Khong the tao Task Scheduler cho Server
        ) else (
            echo [OK] DPT-Server da dang ky khoi dong cung Windows
        )
    ) else (
        echo [CANH BAO] Khong tim thay DPT-Server.exe
    )
    
    echo.
    echo [THANH CONG] Da dang ky startup qua Task Scheduler!
)

echo.
echo ============================================
echo   Huong dan:
echo   1. May SERVER: Chay DPT-Server.exe voi quyen Admin
echo                  Web admin tai http://localhost:5000
echo   2. May CLIENT: Chay DPT-Client.exe
echo                  Lan dau tien, ban se duoc yeu cau nhap IP Server
echo                  File server_config.json se duoc tao tu dong
echo   3. De dang ky/go startup rieng: chay register_startup.bat
echo ============================================
echo.
pause
