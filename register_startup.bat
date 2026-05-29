@echo off
chcp 65001 >nul
cd /d "%~dp0"

title DPT Lab Manager - Dang ky khoi dong cung Windows

REM ====================================================
REM Kiem tra quyen Administrator
REM ====================================================
net session >nul 2>&1
if errorlevel 1 (
    echo [YEU CAU] Can chay voi quyen Administrator!
    echo Dang yeu cau nang quyen...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ============================================
echo   DPT Lab Manager - Dang ky Startup
echo   Su dung Task Scheduler (ho tro Admin)
echo ============================================
echo.

REM ====================================================
REM Xac dinh duong dan EXE
REM ====================================================
set "CLIENT_EXE="
set "SERVER_EXE="

REM Tim DPT-Client.exe
if exist "%~dp0dist\DPT-Client\DPT-Client.exe" (
    set "CLIENT_EXE=%~dp0dist\DPT-Client\DPT-Client.exe"
) else if exist "%~dp0dist\DPT-Client.exe" (
    set "CLIENT_EXE=%~dp0dist\DPT-Client.exe"
) else if exist "%~dp0DPT-Client.exe" (
    set "CLIENT_EXE=%~dp0DPT-Client.exe"
)

REM Tim LabManager.exe (server)
if exist "%~dp0dist\LabManager\LabManager.exe" (
    set "SERVER_EXE=%~dp0dist\LabManager\LabManager.exe"
) else if exist "%~dp0dist\LabManager.exe" (
    set "SERVER_EXE=%~dp0dist\LabManager.exe"
) else if exist "%~dp0LabManager.exe" (
    set "SERVER_EXE=%~dp0LabManager.exe"
) else if exist "%~dp0dist\DPT-Server\DPT-Server.exe" (
    set "SERVER_EXE=%~dp0dist\DPT-Server\DPT-Server.exe"
) else if exist "%~dp0dist\DPT-Server.exe" (
    set "SERVER_EXE=%~dp0dist\DPT-Server.exe"
) else if exist "%~dp0DPT-Server.exe" (
    set "SERVER_EXE=%~dp0DPT-Server.exe"
)

REM ====================================================
REM Menu chon
REM ====================================================
echo Chon hanh dong:
echo   [1] Dang ky CA HAI (Client + Server) khoi dong cung Windows
echo   [2] Chi dang ky CLIENT khoi dong cung Windows
echo   [3] Chi dang ky SERVER khoi dong cung Windows
echo   [4] Xoa CA HAI khoi danh sach khoi dong
echo   [5] Xem trang thai hien tai
echo   [0] Thoat
echo.
set /p CHOICE="Nhap lua chon (0-5): "

if "%CHOICE%"=="1" goto REGISTER_BOTH
if "%CHOICE%"=="2" goto REGISTER_CLIENT
if "%CHOICE%"=="3" goto REGISTER_SERVER
if "%CHOICE%"=="4" goto UNREGISTER_BOTH
if "%CHOICE%"=="5" goto CHECK_STATUS
if "%CHOICE%"=="0" goto END
echo [ERROR] Lua chon khong hop le!
goto END

REM ====================================================
REM DANG KY CLIENT (Task Scheduler)
REM ====================================================
:REGISTER_CLIENT
if "%CLIENT_EXE%"=="" (
    echo [ERROR] Khong tim thay DPT-Client.exe!
    echo   Hay build truoc bang build-test.bat hoac build.bat
    goto END
)
echo Dang dang ky DPT-Client vao Task Scheduler...

REM Xoa task cu neu co
schtasks /Delete /TN "DPT-Client-Startup" /F >nul 2>&1

REM Tao task moi: chay khi LOGON, quyen cao nhat (HIGHEST), khong can mat khau
schtasks /Create /TN "DPT-Client-Startup" /TR "\"%CLIENT_EXE%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong the tao Task Scheduler cho Client!
    goto END
)
echo [OK] DPT-Client da duoc dang ky khoi dong cung Windows!
echo     Duong dan: %CLIENT_EXE%
echo     Task name: DPT-Client-Startup
echo     Trigger:   Khi dang nhap Windows
echo     Quyen:     Run with highest privileges (Admin)
goto END

REM ====================================================
REM DANG KY SERVER (Task Scheduler)
REM ====================================================
:REGISTER_SERVER
if "%SERVER_EXE%"=="" (
    echo [ERROR] Khong tim thay LabManager.exe hoac DPT-Server.exe!
    echo   Hay build truoc bang build-test.bat hoac build.bat
    goto END
)
echo Dang dang ky DPT-Server vao Task Scheduler...

schtasks /Delete /TN "DPT-Server-Startup" /F >nul 2>&1

schtasks /Create /TN "DPT-Server-Startup" /TR "\"%SERVER_EXE%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong the tao Task Scheduler cho Server!
    goto END
)
echo [OK] DPT-Server da duoc dang ky khoi dong cung Windows!
echo     Duong dan: %SERVER_EXE%
echo     Task name: DPT-Server-Startup
echo     Trigger:   Khi dang nhap Windows
echo     Quyen:     Run with highest privileges (Admin)
goto END

REM ====================================================
REM DANG KY CA HAI
REM ====================================================
:REGISTER_BOTH
set HAS_ERROR=0

if "%CLIENT_EXE%"=="" (
    echo [CANH BAO] Khong tim thay DPT-Client.exe - bo qua Client
    set HAS_ERROR=1
) else (
    echo Dang dang ky DPT-Client...
    schtasks /Delete /TN "DPT-Client-Startup" /F >nul 2>&1
    schtasks /Create /TN "DPT-Client-Startup" /TR "\"%CLIENT_EXE%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong the dang ky Client!
        set HAS_ERROR=1
    ) else (
        echo [OK] DPT-Client: %CLIENT_EXE%
    )
)

if "%SERVER_EXE%"=="" (
    echo [CANH BAO] Khong tim thay LabManager.exe/DPT-Server.exe - bo qua Server
    set HAS_ERROR=1
) else (
    echo Dang dang ky DPT-Server...
    schtasks /Delete /TN "DPT-Server-Startup" /F >nul 2>&1
    schtasks /Create /TN "DPT-Server-Startup" /TR "\"%SERVER_EXE%\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong the dang ky Server!
        set HAS_ERROR=1
    ) else (
        echo [OK] DPT-Server: %SERVER_EXE%
    )
)

if "%HAS_ERROR%"=="0" (
    echo.
    echo [THANH CONG] Ca hai ung dung da duoc dang ky khoi dong cung Windows!
)

REM Xoa registry cu (neu co tu phien ban truoc)
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1
echo [INFO] Da xoa registry startup cu (neu co) de tranh chay trung.
goto END

REM ====================================================
REM XOA CA HAI
REM ====================================================
:UNREGISTER_BOTH
echo Dang xoa DPT-Client khoi Task Scheduler...
schtasks /Delete /TN "DPT-Client-Startup" /F >nul 2>&1
echo [OK] DPT-Client da duoc xoa.

echo Dang xoa DPT-Server khoi Task Scheduler...
schtasks /Delete /TN "DPT-Server-Startup" /F >nul 2>&1
echo [OK] DPT-Server da duoc xoa.

REM Xoa luon registry (neu co)
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" /f >nul 2>&1

echo.
echo [THANH CONG] Da xoa ca hai ung dung khoi startup (Task Scheduler + Registry).
goto END

REM ====================================================
REM KIEM TRA TRANG THAI
REM ====================================================
:CHECK_STATUS
echo.
echo --- Trang thai Startup ---
echo.

echo [CLIENT] DPT-Client-Startup:
schtasks /Query /TN "DPT-Client-Startup" 2>nul
if errorlevel 1 (
    echo   -> Chua dang ky trong Task Scheduler
)

echo.
echo [SERVER] DPT-Server-Startup:
schtasks /Query /TN "DPT-Server-Startup" 2>nul
if errorlevel 1 (
    echo   -> Chua dang ky trong Task Scheduler
)

echo.
echo --- Registry (phuong phap cu) ---
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" 2>nul
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Client" 2>nul
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" 2>nul
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DPT-Server" 2>nul
echo.

:END
echo.
pause
