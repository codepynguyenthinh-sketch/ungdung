@echo off
chcp 65001 >nul
title DPT Lab Manager - Cai dat Client
echo.
echo ============================================
echo   DPT Lab Manager - Cai dat Client v2.0
echo ============================================
echo.

set /p SERVER_IP="Nhap IP may server (vi du: 192.168.1.100): "
set /p COMPUTER_ID="Nhap so thu tu may (vi du: 1, 2, 3...): "

echo.
echo Dang cau hinh...

REM Create server_config.json
echo { > server_config.json
echo     "server_ip": "%SERVER_IP%", >> server_config.json
echo     "server_port": 5000 >> server_config.json
echo } >> server_config.json

echo.
echo ============================================
echo   CAU HINH XONG!
echo ============================================
echo.
echo   Server IP:    %SERVER_IP%
echo   Computer ID:  %COMPUTER_ID%
echo.
echo   File cau hinh: server_config.json
echo.
echo   Chay DPT-Client.exe de bat dau su dung.
echo   App se tu dong:
echo     - Khoi dong cung Windows
echo     - Hien thi o khay he thong (system tray)
echo     - Ket noi den server
echo.
echo ============================================

REM Open firewall
echo.
echo Dang mo firewall port 5001...
netsh advfirewall firewall add rule name="DPT-LabManager-Client" dir=in action=allow protocol=TCP localport=5001 >nul 2>&1
echo Firewall da duoc cau hinh.

echo.
pause
