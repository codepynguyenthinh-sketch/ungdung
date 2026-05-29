@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"

REM Watchdog scripts removed from project; no pre-clean necessary

title DPT Lab Manager - Build Client Only
echo.
echo ============================================
echo   Build DPT-Client.exe
echo ============================================
echo.

echo [1] Cai dat dependencies...
python -m pip install -r requirements.txt
echo.
echo Dang build DPT-Client.exe...
python -m PyInstaller --clean DPT-CLIENT.spec --noconfirm

if errorlevel 1 (
    echo [ERROR] Build that bai!
    pause
    exit /b 1
)

REM Lưu ý: server_config.json sẽ được tạo tự động lần đầu chạy DPT-Client.exe
REM Không copy server_config.json để người dùng có thể cấu hình IP server
copy /Y background.jpg dist\ >nul 2>&1
copy /Y firebase_key.json dist\ >nul 2>&1
copy /Y myicon.ico dist\ >nul 2>&1
copy /Y logo.png dist\ >nul 2>&1

echo.
echo BUILD THANH CONG! -> dist\DPT-Client.exe
echo.
echo Lưu ý: Lần chạy đầu tiên, bạn sẽ được hỏi nhập IP của Server.
pause