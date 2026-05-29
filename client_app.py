# -*- coding: utf-8 -*-
"""
DPT Lab Manager Client - Modern UI Edition
Quản lý phòng máy ĐPT - Giao diện hiện đại với customtkinter
"""
import sys
import os
import io

# Ensure UTF-8 output on Windows
if sys.platform == 'win32' and sys.stdout is not None:
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        pass

import customtkinter as ctk
from tkinter import messagebox, simpledialog
import tkinter as tk
import requests
import socket
import psutil
import threading
import time
import ctypes
from flask import Flask, request, jsonify, send_file
import json
import keyboard
import sqlite3
import uuid
from PIL import Image, ImageGrab, ImageDraw, ImageTk, ImageSequence
import logging
import datetime
import qrcode
import qrcode.image.pil
import firebase_admin
from firebase_admin import credentials, db as firebase_db
import webbrowser
from werkzeug.serving import make_server

# ============================================================
# CONFIGURATION
# ============================================================
APP_NAME = "DPT Lab Manager"
APP_VERSION = "2.0.0"
THEME_MODE = "dark"
COLOR_SCHEME = "blue"

# Catppuccin Mocha color palette
COLORS = {
    'base': '#1e1e2e',
    'mantle': '#181825',
    'crust': '#11111b',
    'surface0': '#313244',
    'surface1': '#45475a',
    'surface2': '#585b70',
    'overlay0': '#6c7086',
    'overlay1': '#7f849c',
    'text': '#cdd6f4',
    'subtext0': '#a6adc8',
    'subtext1': '#bac2de',
    'blue': '#89b4fa',
    'lavender': '#b4befe',
    'sapphire': '#74c7ec',
    'sky': '#89dceb',
    'teal': '#94e2d5',
    'green': '#a6e3a1',
    'yellow': '#f9e2af',
    'peach': '#fab387',
    'maroon': '#eba0ac',
    'red': '#f38ba8',
    'mauve': '#cba6f7',
    'pink': '#f5c2e7',
    'flamingo': '#f2cdcd',
    'rosewater': '#f5e0dc',
    'accent': '#89b4fa',
    'accent_hover': '#74c7ec',
    'login_bg': '#222831',
    'login_entry': '#393e46',
    'login_accent': '#00ffe7',
}

# ============================================================
# RESOURCE PATH & LOGGING
# ============================================================
def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

if getattr(sys, 'frozen', False):
    base_log_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
else:
    base_log_dir = os.path.dirname(os.path.abspath(__file__))

log_file = os.path.join(base_log_dir, 'client_app.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    filename=log_file,
    filemode='a',
    encoding='utf-8'
)
logger = logging.getLogger(__name__)

# ============================================================
# WINDOWS ADMIN ELEVATION
# ============================================================
def is_running_as_admin():
    if os.name != 'nt':
        return True
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        return False

def elevate_to_admin():
    if os.name != 'nt':
        return False
    try:
        params = ' '.join(f'"{arg}"' for arg in sys.argv[1:])
        if getattr(sys, 'frozen', False):
            executable = sys.executable
        else:
            executable = sys.executable
            params = f'"{os.path.abspath(__file__)}" {params}'
        result = ctypes.windll.shell32.ShellExecuteW(None, 'runas', executable, params, None, 1)
        return result > 32
    except Exception as e:
        logger.error(f"Elevate error: {e}")
        return False

# ============================================================
# SYSTEM TRAY (pystray) - runs when minimized
# ============================================================
PYSTRAY_AVAILABLE = False
try:
    import pystray
    PYSTRAY_AVAILABLE = True
except ImportError:
    logger.warning("pystray not available, system tray disabled")

# ============================================================
# AUTO-START WITH WINDOWS
# ============================================================
def set_autostart(enable=True):
    """Add/remove app from Windows startup registry."""
    if os.name != 'nt':
        return False
    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
        app_name = "DPT-LabManager"
        if getattr(sys, 'frozen', False):
            exe_path = f'"{sys.executable}"'
        else:
            exe_path = f'"{sys.executable}" "{os.path.abspath(__file__)}"'
        
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enable:
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, exe_path)
        else:
            try:
                winreg.DeleteValue(key, app_name)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
        return True
    except Exception as e:
        logger.error(f"Autostart error: {e}")
        return False

def is_autostart_enabled():
    """Check if app is in Windows startup."""
    if os.name != 'nt':
        return False
    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
        try:
            winreg.QueryValueEx(key, "DPT-LabManager")
            winreg.CloseKey(key)
            return True
        except FileNotFoundError:
            winreg.CloseKey(key)
            return False
    except:
        return False


# ============================================================
# TASK MANAGER PROTECTION
# ============================================================
def disable_task_manager():
    """Disable Task Manager via Windows registry (requires admin)."""
    if os.name != 'nt':
        return False
    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        except FileNotFoundError:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
        winreg.SetValueEx(key, "DisableTaskMgr", 0, winreg.REG_DWORD, 1)
        winreg.CloseKey(key)
        logger.info("Task Manager disabled via registry")
        return True
    except Exception as e:
        logger.error(f"Disable TaskManager error: {e}")
        return False

def enable_task_manager():
    """Re-enable Task Manager via Windows registry."""
    if os.name != 'nt':
        return False
    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            winreg.DeleteValue(key, "DisableTaskMgr")
            winreg.CloseKey(key)
        except FileNotFoundError:
            pass
        logger.info("Task Manager re-enabled via registry")
        return True
    except Exception as e:
        logger.error(f"Enable TaskManager error: {e}")
        return False

def is_task_manager_disabled():
    """Check whether Task Manager is currently disabled."""
    if os.name != 'nt':
        return False
    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
        value, _ = winreg.QueryValueEx(key, "DisableTaskMgr")
        winreg.CloseKey(key)
        return value == 1
    except FileNotFoundError:
        return False
    except Exception as e:
        logger.debug(f"Task Manager status read error: {e}")
        return False

def verify_admin_credentials():
    """Hỏi admin credentials để xác thực quyền mở Task Manager."""
    if os.name != 'nt':
        return False
    
    # Hiển thị dialog hỏi mật khẩu admin
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    admin_password = simpledialog.askstring(
        "Xác thực Admin",
        "Nhập mật khẩu admin để mở Task Manager:",
        show="*",
        parent=root
    )
    root.destroy()
    
    if admin_password is None:  # User clicked Cancel
        return False
    
    # Kiểm tra mật khẩu admin (hardcoded mặc định: "admin")
    # Bạn có thể thay đổi hoặc lấy từ file config
    ADMIN_PASSWORD = "admin@2026"
    if admin_password == ADMIN_PASSWORD:
        return True
    else:
        tk.Tk().withdraw()
        messagebox.showerror("Lỗi", "Mật khẩu admin không chính xác!")
        return False

# Watchdog feature removed for client (was creating _watchdog.vbs and launching wscript)


# ============================================================
# MAIN CLIENT CLASS
# ============================================================
class LabManagerClient:
    def __init__(self, master):
        self.master = master
        self.master.title(APP_NAME)
        self.master.geometry("400x300")
        
        # Set customtkinter appearance
        ctk.set_appearance_mode(THEME_MODE)
        ctk.set_default_color_theme(COLOR_SCHEME)
        
        self.api_server = None
        self.api_server_running = False
        
        self.computer_id = self.get_computer_id()
        self.session_file = f"session_{self.computer_id}.json"
        self.pending_db = f"pending_events_{self.computer_id}.db"
        self.sync_thread = None
        self.last_login_info = None
        self.session_id = None
        self.load_session_from_file()
        self.init_pending_db()
        
        self.server_url = self.load_server_config()
        self.client_port = 5001
        self.has_setup_ui = False
        self.ping_active = False
        self.blocked_keys = set()
        self.is_registration_mode = False
        self.is_qr_mode = False
        # Low-level keyboard hook state
        self._ll_hook_active = False
        self._ll_hook_handle = None
        self._ll_hook_proc   = None
        self._ll_hook_thread = None
        
        # Idle timeout
        self.IDLE_TIMEOUT_SECONDS = 10 * 60
        self._idle_timer_id = None
        self.last_activity_time = time.time()
        self._idle_check_thread = None
        self._idle_check_running = False
        
        # Background loading flag
        self._bg_loading = False
        
        # System tray
        self.tray_icon = None
        self.tray_thread = None
        
        # Setup Flask app
        self.setup_client_api()
        
        # Show splash screen then setup login
        self.show_splash_screen()
        
        # Start API server
        self.start_client_api()
        
        # Start heartbeat
        self.start_heartbeat()
        self.start_sync_thread()
        
        # Register with server
        self.master.after(2000, self.register_with_server_once)
        
        # Firebase
        self.FIREBASE_URL = 'https://login-iuh-default-rtdb.firebaseio.com/'
        self.FIREBASE_KEY_PATH = resource_path("firebase_key.json")
        self.firebase_initialized = False
        self.firebase_listener = None
        self.qr_login_processing = False
        self.qr_login_processed = False
        self.qr_login_processed_timer = None
        self.qr_login_lock = threading.Lock()
        
        if not firebase_admin._apps and os.path.exists(self.FIREBASE_KEY_PATH):
            try:
                cred = credentials.Certificate(self.FIREBASE_KEY_PATH)
                firebase_admin.initialize_app(cred, {'databaseURL': self.FIREBASE_URL})
                self.firebase_initialized = True
                self.setup_firebase_listener()
            except Exception as e:
                logger.warning(f"Firebase init error: {e}")
    
    # ============================================================
    # SPLASH SCREEN
    # ============================================================
    def _load_logo_image(self, size=(60, 60)):
        """Load IUH logo, remove black background, return CTkImage."""
        try:
            import numpy as np
            logo_path = resource_path("logo.png")
            if not os.path.exists(logo_path):
                return None
            img = Image.open(logo_path).convert("RGBA")
            data = np.array(img)
            r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
            black_mask = (r < 30) & (g < 30) & (b < 30)
            data[:,:,3] = np.where(black_mask, 0, a)
            img = Image.fromarray(data)
            img = img.resize(size, Image.Resampling.LANCZOS)
            return ctk.CTkImage(light_image=img, dark_image=img, size=size)
        except Exception as e:
            logger.warning(f"Logo load error: {e}")
            return None

    def show_splash_screen(self):
        """Show a splash screen for 2 seconds then switch to login."""
        self.clear_window()
        self.master.attributes('-fullscreen', True)
        self.master.configure(bg=COLORS['crust'])
        
        splash_frame = ctk.CTkFrame(self.master, fg_color=COLORS['base'], corner_radius=20, border_width=2, border_color=COLORS['surface1'])
        splash_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        # IUH Logo
        self.splash_logo = self._load_logo_image(size=(80, 80))
        if self.splash_logo:
            ctk.CTkLabel(splash_frame, image=self.splash_logo, text="").pack(pady=(30, 10))
        
        ctk.CTkLabel(
            splash_frame,
            text=APP_NAME,
            font=ctk.CTkFont(family="Segoe UI", size=28, weight="bold"),
            text_color=COLORS['accent']
        ).pack(pady=(10, 5))
        
        ctk.CTkLabel(
            splash_frame,
            text=f"Phiên bản {APP_VERSION}",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color=COLORS['subtext0']
        ).pack(pady=(0, 5))
        
        ctk.CTkLabel(
            splash_frame,
            text="Hệ thống quản lý phòng máy thực hành",
            font=ctk.CTkFont(family="Segoe UI", size=14),
            text_color=COLORS['text']
        ).pack(pady=(0, 10))
        
        # Loading bar
        self.splash_progress = ctk.CTkProgressBar(splash_frame, width=300, height=6, progress_color=COLORS['accent'], fg_color=COLORS['surface0'])
        self.splash_progress.pack(pady=(10, 5))
        self.splash_progress.set(0)
        
        ctk.CTkLabel(
            splash_frame,
            text="Đang khởi động...",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color=COLORS['overlay1']
        ).pack(pady=(5, 30))
        
        # Animate progress bar
        self._animate_splash(0)
    
    def _animate_splash(self, progress):
        """Animate splash progress bar."""
        if progress < 1.0:
            progress += 0.04
            try:
                self.splash_progress.set(progress)
            except:
                return
            self.master.after(60, lambda: self._animate_splash(progress))
        else:
            self.master.after(300, self.setup_login_ui)
    
    # ============================================================
    # FLASK API SERVER
    # ============================================================
    def setup_client_api(self):
        """Setup Flask routes."""
        self.client_app = Flask(__name__)
        
        @self.client_app.route('/api/shutdown', methods=['POST'])
        def shutdown():
            logger.info("Received shutdown command")
            threading.Thread(target=self._do_shutdown, daemon=True).start()
            return jsonify({'success': True})
        
        @self.client_app.route('/api/restart', methods=['POST'])
        def restart():
            logger.info("Received restart command")
            threading.Thread(target=self._do_restart, daemon=True).start()
            return jsonify({'success': True})
        
        @self.client_app.route('/api/lock', methods=['POST'])
        def lock():
            logger.info("Received lock command")
            self._do_lock()
            return jsonify({'success': True})
        
        @self.client_app.route('/api/status', methods=['GET'])
        def status():
            return jsonify({
                'computer_id': self.computer_id,
                'hostname': socket.gethostname(),
                'ip': self.get_local_ip(),
                'logged_in': self.session_id is not None,
                'status': 'online',
                'api_port': self.client_port
            })
        
        @self.client_app.route('/api/remote_login', methods=['POST'])
        def remote_login():
            logger.info("Received remote login command")
            data = request.get_json() or {}
            student_id = data.get('student_id')

            # Always ensure the client is in a clean logged out state first.
            if self.session_id:
                try:
                    self.master.after(0, self.do_logout)
                except Exception as e:
                    logger.warning(f"Error scheduling local logout before remote login: {e}")

            if not student_id:
                self.master.after(0, self.setup_login_ui)
                return jsonify({'success': True, 'message': 'Remote login requested, showing login screen.'})

            try:
                response = requests.post(
                    f"{self.server_url}/api/client_login",
                    json={'student_id': student_id, 'computer_id': self.computer_id, 'force': True},
                    timeout=10
                )
                if response.status_code == 200 and response.json().get('success'):
                    result = response.json()
                    self.session_id = result.get('session_id')
                    self.last_login_info = {'student_id': student_id, 'computer_id': self.computer_id}
                    self.save_session_to_file()
                    user_name = result.get('user_name', student_id)
                    self.master.after(0, lambda: self.setup_main_ui(user_name))
                    return jsonify({'success': True, 'message': f'Remote login thành công cho {student_id}', 'user_name': user_name})
                message = response.json().get('message', 'Remote login failed')
                logger.warning(f"Remote login failed: {message}")
                self.master.after(0, self.setup_login_ui)
                return jsonify({'success': False, 'message': message}), response.status_code
            except Exception as e:
                logger.error(f"Remote login request error: {e}")
                self.master.after(0, self.setup_login_ui)
                return jsonify({'success': False, 'message': str(e)}), 500

        @self.client_app.route('/api/logout', methods=['POST'])
        def logout():
            logger.info("Received logout command from server")
            self.master.after(0, self.do_logout)
            return jsonify({'success': True})
        
        @self.client_app.route('/api/screenshot', methods=['GET'])
        def screenshot():
            try:
                logger.info(f"Screenshot request from {request.remote_addr}")
                img = ImageGrab.grab()
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=70)
                buf.seek(0)
                return send_file(buf, mimetype='image/jpeg', as_attachment=False, download_name='screenshot.jpg')
            except Exception as e:
                logger.error(f"Screenshot error: {e}")
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.client_app.route('/api/health', methods=['GET'])
        def health():
            return jsonify({'status': 'ok', 'version': APP_VERSION})

        # ---- Shadow Defender remote control ----
        # Possible locations for Shadow Defender CLI executables.
        SD_POSSIBLE_PATHS = [
            r"C:\Program Files\Shadow Defender\CmdTool.exe",
            r"C:\Program Files (x86)\Shadow Defender\CmdTool.exe",
            r"C:\Program Files\Shadow Defender\SDCmd.exe",
            r"C:\Program Files (x86)\Shadow Defender\SDCmd.exe"
        ]
 
        def find_sd_exe():
            for p in SD_POSSIBLE_PATHS:
                if os.path.exists(p):
                    return p
            return None
 
        def _build_sd_args(executable_path, action, parameter=None):
            basename = os.path.basename(executable_path).lower()
            if basename == 'cmdtool.exe':
                if action == 'status':
                    return ['/list']
                if action == 'enable':
                    return [f'/enter:{parameter}', '/now']
                if action == 'disable':
                    return [f'/exit:{parameter}']
                if action == 'commit':
                    return [f'/commit:{parameter}']
                return []
            # Fallback to old SDCmd syntax.
            if action == 'status':
                return ['-query']
            if action == 'enable':
                return ['-protected', parameter]
            if action == 'disable':
                return ['-unprotected', parameter]
            if action == 'commit':
                return ['-commit', parameter]
            return []
 
        def _run_sd(action, parameter=None, timeout=15):
            """Run Shadow Defender CLI and return (success, output, path)."""
            import subprocess
            sd_path = find_sd_exe()
            if not sd_path:
                return False, "Không tìm thấy CmdTool.exe hoặc SDCmd.exe. Vui lòng cài Shadow Defender hoặc đặt file vào thư mục chuẩn.", None
            args = [sd_path] + _build_sd_args(sd_path, action, parameter)
            try:
                result = subprocess.run(
                    args,
                    capture_output=True, text=True,
                    timeout=timeout, creationflags=0x08000000
                )
                output = (result.stdout + result.stderr).strip()
                return result.returncode == 0, output, sd_path
            except subprocess.TimeoutExpired:
                return False, "Shadow Defender không phản hồi (timeout)", sd_path
            except Exception as e:
                return False, str(e), sd_path
 
        @self.client_app.route('/api/shadow_defender/drives', methods=['GET'])
        def sd_drives():
            """Trả về danh sách ổ đĩa thực tế trên máy này."""
            import string
            drives = []
            for letter in string.ascii_uppercase:
                drive = f"{letter}:"
                path = f"{drive}\\"
                if os.path.exists(path):
                    try:
                        total = 0
                        free = 0
                        import ctypes as _ct
                        sectors, bytes_per, free_clusters, total_clusters = _ct.c_ulonglong(), _ct.c_ulonglong(), _ct.c_ulonglong(), _ct.c_ulonglong()
                        _ct.windll.kernel32.GetDiskFreeSpaceExW(
                            path, _ct.byref(free_clusters), _ct.byref(total_clusters), None
                        )
                        stat = os.statvfs(path) if hasattr(os, 'statvfs') else None
                        if stat:
                            total = stat.f_blocks * stat.f_frsize
                            free = stat.f_bavail * stat.f_frsize
                        else:
                            import shutil
                            usage = shutil.disk_usage(path)
                            total = usage.total
                            free = usage.free
                        total_gb = round(total / (1024**3), 1)
                        label = f"{drive} ({total_gb} GB)"
                    except Exception:
                        label = drive
                    drives.append({'drive': drive, 'label': label})
            return jsonify({'success': True, 'drives': drives})
 
        @self.client_app.route('/api/shadow_defender/status', methods=['GET'])
        def sd_status():
            ok, output, path = _run_sd('status')
            if path is None:
                return jsonify({'success': False, 'installed': False, 'path': None, 'message': output}), 404
 
            mode = 'unknown'
            shadowed = []
            for line in (output or '').splitlines():
                clean_line = line.strip()
                if not clean_line:
                    continue
                if clean_line.upper().startswith('C') or clean_line.upper().startswith('C:'):
                    shadowed.append('C:')
                if clean_line.upper().startswith('D') or clean_line.upper().startswith('D:'):
                    shadowed.append('D:')
                if clean_line.upper().startswith('E') or clean_line.upper().startswith('E:'):
                    shadowed.append('E:')
            if 'C:' in shadowed:
                mode = 'Đang đóng băng (C: ON)'
            else:
                mode = 'Đang mở băng (C: OFF)'
            return jsonify({'success': ok, 'installed': True, 'path': path, 'status': {'mode': mode, 'output': output, 'shadowed_drives': shadowed}})
 
        @self.client_app.route('/api/shadow_defender/enable', methods=['POST'])
        def sd_enable():
            data = request.get_json() or {}
            drive = data.get('drive', 'C:').upper().rstrip('\\')
            if drive.endswith(':'):
                drive = drive[:-1]
            ok, output, path = _run_sd('enable', drive)
            if path is None:
                logger.warning(f"Shadow Defender enable failed - exe missing: {output}")
                return jsonify({'success': False, 'message': output, 'suggestion': 'Cài Shadow Defender hoặc đặt CmdTool.exe vào C:\\Program Files\\Shadow Defender\\'}), 404
            if ok:
                logger.info(f"Shadow Defender: đóng băng {drive} thành công")
                return jsonify({'success': True, 'message': f'Đóng băng ổ {drive}: thành công.\nRestart để có hiệu lực.', 'output': output})
            logger.warning(f"Shadow Defender enable {drive} failed: {output}")
            return jsonify({'success': False, 'message': f'Lỗi đóng băng {drive}: {output}'}), 500
 
        @self.client_app.route('/api/shadow_defender/disable', methods=['POST'])
        def sd_disable():
            data = request.get_json() or {}
            drive = data.get('drive', 'C:').upper().rstrip('\\')
            if drive.endswith(':'):
                drive = drive[:-1]
            ok, output, path = _run_sd('disable', drive)
            if path is None:
                logger.warning(f"Shadow Defender disable failed - exe missing: {output}")
                return jsonify({'success': False, 'message': output, 'suggestion': 'Cài Shadow Defender hoặc đặt CmdTool.exe vào C:\\Program Files\\Shadow Defender\\'}), 404
            if ok:
                logger.info(f"Shadow Defender: mở băng {drive} thành công")
                return jsonify({'success': True, 'message': f'Mở băng ổ {drive}: thành công.\nRestart để có hiệu lực.', 'output': output})
            logger.warning(f"Shadow Defender disable {drive} failed: {output}")
            return jsonify({'success': False, 'message': f'Lỗi mở băng {drive}: {output}'}), 500
 
        @self.client_app.route('/api/shadow_defender/commit', methods=['POST'])
        def sd_commit():
            data = request.get_json() or {}
            drive = data.get('drive', 'C:').upper().rstrip('\\')
            if drive.endswith(':'):
                drive = drive[:-1]
            commit_path = f"{drive}:\\"
            ok, output, path = _run_sd('commit', commit_path)
            if path is None:
                logger.warning(f"Shadow Defender commit failed - exe missing: {output}")
                return jsonify({'success': False, 'message': output, 'suggestion': 'Cài Shadow Defender hoặc đặt CmdTool.exe vào C:\\Program Files\\Shadow Defender\\'}), 404
            if ok:
                logger.info(f"Shadow Defender: commit {commit_path} thành công")
                return jsonify({'success': True, 'message': f'Commit ổ {commit_path} thành công — thay đổi đã được lưu vĩnh viễn.', 'output': output})
            logger.warning(f"Shadow Defender commit {commit_path} failed: {output}")
            return jsonify({'success': False, 'message': f'Lỗi commit {commit_path}: {output}'}), 500
        
        @self.client_app.route('/api/notification', methods=['POST'])
        def receive_notification():
            try:
                self.last_activity_time = time.time()
                data = request.get_json()
                title = data.get('title', 'Thông báo')
                message = data.get('message', '')
                notification_type = data.get('type', 'info')
                
                logger.info(f"Received notification: {title} - {message}")
                
                def show_topmost_message(t, m, typ):
                    try:
                        self.master.lift()
                        self.master.attributes('-topmost', True)
                        self.master.focus_force()
                        if typ == 'error':
                            messagebox.showerror(t, m, parent=self.master)
                        elif typ == 'warning':
                            messagebox.showwarning(t, m, parent=self.master)
                        else:
                            messagebox.showinfo(t, m, parent=self.master)
                    finally:
                        self.master.attributes('-topmost', False)
                
                self.master.after(0, lambda t=title, m=message, typ=notification_type: show_topmost_message(t, m, typ))
                return jsonify({'success': True})
            except Exception as e:
                logger.error(f"Notification error: {e}")
                return jsonify({'success': False, 'message': str(e)}), 500
    
    def start_client_api(self):
        """Start Flask API server."""
        if os.name == 'nt':
            self._open_firewall_port()
        
        def run_server():
            try:
                self.api_server = make_server('0.0.0.0', self.client_port, self.client_app, threaded=True)
                self.api_server_running = True
                logger.info(f"API server started on port {self.client_port}")
                self.api_server.serve_forever()
            except Exception as e:
                logger.error(f"Failed to start API server: {e}")
                self.api_server_running = False
                self.master.after(10000, self.start_client_api)
        
        self.api_server_thread = threading.Thread(target=run_server, daemon=True)
        self.api_server_thread.start()
        time.sleep(2)
        
        if self._check_api_server():
            logger.info("API server verified")
        else:
            logger.warning("API server may not be running correctly")
    
    def _check_api_server(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('127.0.0.1', self.client_port))
            sock.close()
            return result == 0
        except:
            return False
    
    def _open_firewall_port(self):
        import subprocess
        rule_name = f"LabClient_Port{self.client_port}"
        try:
            subprocess.run(['netsh', 'advfirewall', 'firewall', 'delete', 'rule', f'name={rule_name}'], capture_output=True, timeout=5)
            result = subprocess.run(['netsh', 'advfirewall', 'firewall', 'add', 'rule', f'name={rule_name}', 'protocol=TCP', 'dir=in', f'localport={self.client_port}', 'action=allow', 'enable=yes', 'profile=any'], capture_output=True, timeout=5)
            if result.returncode == 0:
                logger.info(f"Firewall port {self.client_port} opened")
        except Exception as e:
            logger.warning(f"Firewall error: {e}")
    
    def _do_shutdown(self):
        time.sleep(2)
        if self.session_id:
            self.master.after(0, self.do_logout)
            time.sleep(1)
        os.system("shutdown /s /t 1")
    
    def _do_restart(self):
        time.sleep(2)
        if self.session_id:
            self.master.after(0, self.do_logout)
            time.sleep(1)
        os.system("shutdown /r /t 1")
    
    def _do_lock(self):
        try:
            ctypes.windll.user32.LockWorkStation()
        except Exception as e:
            logger.error(f"Lock error: {e}")
    
    # ============================================================
    # NETWORK & IDENTITY
    # ============================================================
    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith('127.'):
                return ip
        except:
            pass
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            if ip and not ip.startswith('127.'):
                return ip
        except:
            pass
        return '127.0.0.1'
    
    def get_computer_id(self):
        try:
            ip = self.get_local_ip()
            parts = ip.split('.')
            if len(parts) == 4:
                last_octet = int(parts[-1])
                if 1 <= last_octet <= 66:
                    return last_octet
                elif 101 <= last_octet <= 166:
                    return last_octet - 100
            return 1
        except:
            return 1
    
    def prompt_for_server_ip(self, config_path):
        """Hỏi người dùng nhập IP server lần đầu chạy."""
        # Tạo một cửa sổ Tkinter ẩn để hiển thị dialog
        root = tk.Tk()
        root.withdraw()  # Ẩn cửa sổ chính
        
        while True:
            result = tk.simpledialog.askstring(
                "Cấu hình Server",
                "Nhập địa chỉ IP của Server (VD: 192.168.1.100):",
                parent=root
            )
            
            if result is None:  # Người dùng nhấn Cancel
                root.destroy()
                return None
            
            result = result.strip()
            if result:
                # Validate IP format (simple check)
                parts = result.split('.')
                if len(parts) == 4 and all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
                    root.destroy()
                    return result
                else:
                    messagebox.showerror(
                        "Lỗi",
                        "Định dạng IP không hợp lệ!\nVui lòng nhập lại (VD: 192.168.1.100)",
                        parent=root
                    )
            else:
                messagebox.showwarning(
                    "Cảnh báo",
                    "Vui lòng nhập IP server!",
                    parent=root
                )
    
    def load_server_config(self):
        default_config = {"server_ip": "127.0.0.1", "server_port": 5000}
        if getattr(sys, 'frozen', False):
            exe_dir = os.path.dirname(sys.executable)
        else:
            exe_dir = os.path.dirname(os.path.abspath(__file__))
        
        config_path = os.path.join(exe_dir, "server_config.json")
        
        # Kiểm tra nếu config tồn tại và có server_ip hợp lệ
        config_valid = False
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                if 'server_ip' in config and config['server_ip']:
                    config_valid = True
                    server_ip = config['server_ip']
                    server_port = config.get('server_port', default_config['server_port'])
        except Exception as e:
            logger.warning(f"Config read error: {e}")
        
        # Nếu config không tồn tại hoặc không hợp lệ, hỏi người dùng
        if not config_valid:
            server_ip = self.prompt_for_server_ip(config_path)
            if server_ip is None:
                # Người dùng cancel, dùng IP mặc định
                logger.info("User cancelled IP configuration, using default")
                server_ip = default_config['server_ip']
            
            # Lưu cấu hình vào file
            try:
                config_to_save = {
                    "server_ip": server_ip,
                    "server_port": default_config['server_port'],
                    "room_name": "Phong May DPT",
                    "api_key": "dpt-lab-manager-2024"
                }
                os.makedirs(exe_dir, exist_ok=True)
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config_to_save, f, indent=4, ensure_ascii=False)
                logger.info(f"Server config saved: {config_path}")
            except Exception as e:
                logger.error(f"Error saving config: {e}")
            
            server_port = default_config['server_port']
        
        server_url = f"http://{server_ip}:{server_port}"
        server_url = server_url.rstrip('/')
        if server_url.endswith('/api'):
            server_url = server_url[:-4]
        
        logger.info(f"Server URL configured: {server_url}")
        return server_url
    
    # ============================================================
    # SESSION PERSISTENCE
    # ============================================================
    def load_session_from_file(self):
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.session_id = data.get('session_id')
                    self.last_login_info = data.get('last_login_info')
        except:
            self.session_id = None
            self.last_login_info = None

    def save_session_to_file(self):
        try:
            session_data = {'session_id': self.session_id}
            if self.last_login_info:
                session_data['last_login_info'] = self.last_login_info
            with open(self.session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f)
        except Exception as e:
            logger.error(f"Save session error: {e}")
    
    def clear_session_file(self):
        try:
            if os.path.exists(self.session_file):
                os.remove(self.session_file)
        except:
            pass
        self.session_id = None
        self.last_login_info = None
    
    # ============================================================
    # PENDING EVENTS (OFFLINE SYNC)
    # ============================================================
    def init_pending_db(self):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS pending_events (
                    event_uuid TEXT PRIMARY KEY,
                    event_type TEXT,
                    student_id TEXT,
                    computer_id INTEGER,
                    timestamp TEXT,
                    synced INTEGER DEFAULT 0
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Init pending DB error: {e}")

    def save_pending_event(self, event_type, student_id, computer_id, timestamp=None):
        if timestamp is None:
            timestamp = datetime.datetime.now().isoformat()
        event_uuid = str(uuid.uuid4())
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('INSERT INTO pending_events VALUES (?, ?, ?, ?, ?, ?)',
                      (event_uuid, event_type, student_id, computer_id, timestamp, 0))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save pending event error: {e}")
        return event_uuid

    def get_pending_events(self):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('SELECT event_uuid, event_type, student_id, computer_id, timestamp FROM pending_events WHERE synced = 0')
            rows = c.fetchall()
            conn.close()
            events = []
            for row in rows:
                events.append({
                    'event_uuid': row[0],
                    'event_type': row[1],
                    'student_id': row[2],
                    'computer_id': row[3],
                    'timestamp': row[4]
                })
            return events
        except Exception as e:
            logger.error(f"Get pending events error: {e}")
            return []

    def mark_synced(self, event_uuid):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('UPDATE pending_events SET synced = 1 WHERE event_uuid = ?', (event_uuid,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Mark synced error: {e}")

    def is_server_online(self):
        try:
            response = requests.post(f"{self.server_url}/api/heartbeat", json={'computer_id': self.computer_id}, timeout=5)
            return response.status_code == 200
        except:
            return False

    def sync_pending_events(self):
        if not self.is_server_online():
            return False
        events = self.get_pending_events()
        if not events:
            return True
        try:
            response = requests.post(f"{self.server_url}/api/sync_events", json={'events': events}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    for event in events:
                        self.mark_synced(event['event_uuid'])
                    logger.info(f"Synced {data.get('synced_count', 0)} events")
                    return True
        except Exception as e:
            logger.error(f"Sync pending events error: {e}")
        return False

    def start_sync_thread(self):
        if self.sync_thread and self.sync_thread.is_alive():
            return
        def sync_loop():
            while True:
                try:
                    self.sync_pending_events()
                except Exception as e:
                    logger.error(f"Sync loop error: {e}")
                time.sleep(30)
        self.sync_thread = threading.Thread(target=sync_loop, daemon=True)
        self.sync_thread.start()

    def apply_client_config(self, config):
        if not isinstance(config, dict):
            return
        timeout_seconds = config.get('idle_timeout_seconds')
        try:
            timeout_seconds = int(timeout_seconds)
            if timeout_seconds > 0:
                self.IDLE_TIMEOUT_SECONDS = timeout_seconds
                logger.info(f"Set idle timeout from server: {self.IDLE_TIMEOUT_SECONDS} seconds")
        except Exception:
            pass

    def register_with_server_once(self):
        try:
            client_ip = self.get_local_ip()
            register_data = {
                'computer_id': self.computer_id,
                'ip': client_ip,
                'api_port': self.client_port,
                'name': socket.gethostname()
            }
            if self.session_id:
                register_data['session_id'] = self.session_id
            
            response = requests.post(f"{self.server_url}/api/register_client", json=register_data, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.apply_client_config(data.get('client_config'))
                if data.get('has_active_session') and data.get('session_id'):
                    self.session_id = data.get('session_id')
                    user_name = data.get('user_name')
                    self.master.after(0, lambda: self.setup_main_ui(user_name))
                logger.info("Registered with server")
                self.sync_pending_events()
            else:
                logger.error(f"Registration failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Registration error: {e}")
            self.master.after(10000, self.register_with_server_once)
    
    # ============================================================
    # HEARTBEAT & FIREBASE
    # ============================================================
    def send_heartbeat(self):
        while True:
            try:
                if self.api_server_running:
                    heartbeat_data = {'computer_id': self.computer_id, 'ip': self.get_local_ip(), 'api_port': self.client_port}
                    if self.session_id:
                        heartbeat_data['session_id'] = self.session_id
                    response = requests.post(f"{self.server_url}/api/heartbeat", json=heartbeat_data, timeout=5)
                    if response.status_code == 200:
                        data = response.json()
                        self.apply_client_config(data.get('client_config'))
            except:
                pass
            time.sleep(15)
    
    def start_heartbeat(self):
        heartbeat_thread = threading.Thread(target=self.send_heartbeat, daemon=True)
        heartbeat_thread.start()
    
    def setup_firebase_listener(self):
        if not self.firebase_initialized:
            logger.warning("Firebase not initialized, skipping listener setup")
            return
        try:
            root_ref = firebase_db.reference(f'login_requests/{self.computer_id}')
            logger.info(f"Firebase QR listener initialized for computer {self.computer_id}")
            
            def callback(event):
                try:
                    logger.info(f"Firebase event received for computer {self.computer_id} - data: {event.data}")
                    if event.data is None:
                        return
                    if not self.can_process_qr_request():
                        logger.info("Duplicate QR login request ignored")
                        return
                    
                    success = False
                    try:
                        student_id = None
                        user_id = None
                        
                        if isinstance(event.data, dict):
                            student_id = event.data.get('student_id')
                            user_id = event.data.get('user_id') or event.data.get('id')
                        elif isinstance(event.data, str):
                            try:
                                payload = json.loads(event.data)
                                student_id = payload.get('student_id')
                                user_id = payload.get('user_id') or payload.get('id')
                            except:
                                student_id = None
                                user_id = None
                        
                        if student_id:
                            student_id = str(student_id).strip()
                        if user_id:
                            user_id = str(user_id).strip()
                        
                        if not student_id and not user_id:
                            logger.warning(f"No student_id or user_id in QR data: {event.data}")
                            return
                        
                        request_payload = {'computer_id': self.computer_id}
                        if student_id:
                            request_payload['student_id'] = student_id
                        if user_id:
                            request_payload['user_id'] = user_id
                        
                        logger.info(f"Processing QR login request: {request_payload}")
                        response = requests.post(
                            f"{self.server_url}/api/qr_login",
                            json=request_payload,
                            timeout=10
                        )
                        logger.info(f"QR login API response: {response.status_code}")
                        
                        if response.ok and response.json().get('success'):
                            user_name = response.json().get('user_name')
                            self.session_id = response.json().get('session_id')
                            self.save_session_to_file()
                            self.master.after(0, lambda un=user_name: self.setup_main_ui(un))
                            messagebox.showinfo("Thành công", f"Đăng nhập QR thành công!\nChào mừng {user_name}")
                            logger.info(f"QR login successful for {user_name}")
                            success = True
                        else:
                            error_msg = response.json().get('message', 'Unknown error') if response.ok else 'Request failed'
                            messagebox.showerror("Lỗi", f"Đăng nhập QR thất bại: {error_msg}")
                            logger.error(f"QR login failed: {error_msg}")
                    except Exception as e:
                        logger.error(f"QR login request error: {e}")
                    finally:
                        self.finish_qr_request(success)
                    
                    try:
                        root_ref.delete()
                        logger.info(f"Deleted Firebase node: login_requests/{self.computer_id}")
                    except:
                        pass
                except Exception as e:
                    logger.error(f"Firebase QR callback error: {e}")
            
            self.firebase_listener = root_ref.listen(callback)
            logger.info("Firebase listener started successfully")
        except Exception as e:
            logger.error(f"Failed to setup Firebase listener: {e}")
            self.firebase_listener = None
    
    def can_process_qr_request(self):
        with self.qr_login_lock:
            if self.qr_login_processing:
                return False
            if self.qr_login_processed:
                return False
            self.qr_login_processing = True
            return True
    
    def finish_qr_request(self, success):
        with self.qr_login_lock:
            self.qr_login_processing = False
            if success:
                self.qr_login_processed = True
                if self.qr_login_processed_timer:
                    self.master.after_cancel(self.qr_login_processed_timer)
                self.qr_login_processed_timer = self.master.after(5000, self.reset_qr_processed_flag)
    
    def reset_qr_processed_flag(self):
        with self.qr_login_lock:
            self.qr_login_processed = False
            self.qr_login_processed_timer = None
    
    # ============================================================
    # KEYBOARD BLOCKING
    # ============================================================
    # ============================================================
    # LOW-LEVEL KEYBOARD HOOK (WinAPI) — chặn Win/Alt+Tab/Alt+F4
    # mà KHÔNG chặn Alt đơn (IME vẫn gõ dấu được)
    # ============================================================
    def _install_ll_hook(self, block_alt_tab=True):
        """Cài Windows LowLevelKeyboardHook trên thread riêng.
        block_alt_tab=True  → dùng cho màn login  (block Alt+Tab, Alt+F4, Win, Ctrl+Shift+Esc)
        block_alt_tab=False → dùng cho form đăng ký (chỉ block Win, Ctrl+Shift+Esc;
                               Alt đơn được thả ra cho Unikey/IME)
        """
        if os.name != 'nt':
            return

        import ctypes
        import ctypes.wintypes

        WH_KEYBOARD_LL = 13
        WM_KEYDOWN    = 0x0100
        WM_SYSKEYDOWN = 0x0104
        VK_LWIN   = 0x5B
        VK_RWIN   = 0x5C
        VK_TAB    = 0x09
        VK_F4     = 0x73
        VK_ESCAPE = 0x1B
        VK_MENU   = 0x12   # Alt
        LLKHF_ALTDOWN = 0x20

        # Định nghĩa đúng struct KBDLLHOOKSTRUCT
        class KBDLLHOOKSTRUCT(ctypes.Structure):
            _fields_ = [
                ("vkCode",      ctypes.wintypes.DWORD),
                ("scanCode",    ctypes.wintypes.DWORD),
                ("flags",       ctypes.wintypes.DWORD),
                ("time",        ctypes.wintypes.DWORD),
                ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
            ]

        HOOKPROC = ctypes.CFUNCTYPE(
            ctypes.c_int,
            ctypes.c_int,
            ctypes.wintypes.WPARAM,
            ctypes.POINTER(KBDLLHOOKSTRUCT)
        )

        user32 = ctypes.windll.user32

        def low_level_handler(nCode, wParam, lParam):
            if nCode >= 0 and wParam in (WM_KEYDOWN, WM_SYSKEYDOWN):
                kb = lParam.contents
                vk       = kb.vkCode
                flags    = kb.flags
                alt_down = bool(flags & LLKHF_ALTDOWN)

                block = False

                # Win key — luôn block
                if vk in (VK_LWIN, VK_RWIN):
                    block = True

                # Ctrl+Shift+Esc — luôn block
                if vk == VK_ESCAPE:
                    ctrl  = user32.GetAsyncKeyState(0x11) & 0x8000
                    shift = user32.GetAsyncKeyState(0x10) & 0x8000
                    if ctrl and shift:
                        block = True

                if block_alt_tab:
                    # Màn login: block Alt+Tab, Alt+F4, Alt đơn
                    if vk == VK_TAB and alt_down:
                        block = True
                    if vk == VK_F4 and alt_down:
                        block = True
                    if vk == VK_MENU:
                        block = True
                else:
                    # Form đăng ký: chỉ block Alt+Tab và Alt+F4
                    # Alt đơn KHÔNG block → Unikey/IME gõ dấu được
                    if vk == VK_TAB and alt_down:
                        block = True
                    if vk == VK_F4 and alt_down:
                        block = True

                if block:
                    return 1  # nuốt phím, không truyền đi

            return user32.CallNextHookEx(
                self._ll_hook_handle, nCode, wParam, lParam)

        self._ll_hook_proc = HOOKPROC(low_level_handler)
        self._ll_hook_handle = user32.SetWindowsHookExW(
            WH_KEYBOARD_LL, self._ll_hook_proc, None, 0)

        # Message loop — bắt buộc để hook nhận sự kiện
        msg = ctypes.wintypes.MSG()
        while self._ll_hook_active:
            ret = ctypes.windll.user32.PeekMessageW(
                ctypes.byref(msg), None, 0, 0, 0x0001)  # PM_REMOVE
            if ret:
                ctypes.windll.user32.TranslateMessage(ctypes.byref(msg))
                ctypes.windll.user32.DispatchMessageW(ctypes.byref(msg))
            else:
                time.sleep(0.005)

        if self._ll_hook_handle:
            ctypes.windll.user32.UnhookWindowsHookEx(self._ll_hook_handle)
            self._ll_hook_handle = None

    def _start_ll_hook(self, block_alt_tab=True):
        """Khởi động hook thread."""
        self._stop_ll_hook()  # dừng hook cũ nếu có và đợi thread thoát
        self._ll_hook_active = True
        self._ll_hook_handle = None
        self._ll_hook_proc   = None
        t = threading.Thread(
            target=self._install_ll_hook,
            args=(block_alt_tab,),
            daemon=True
        )
        t.start()
        self._ll_hook_thread = t

    def _stop_ll_hook(self):
        """Dừng hook."""
        self._ll_hook_active = False
        # Cho thread cũ thoát và dọn sạch state nếu nó vẫn còn chạy
        if self._ll_hook_thread and self._ll_hook_thread.is_alive():
            self._ll_hook_thread.join(timeout=1.0)
        self._ll_hook_thread = None

    # ---- wrapper tương thích với code cũ ----
    def block_keys_safe(self):
        """Màn login: block Alt, Win, Alt+Tab, Alt+F4, Ctrl+Shift+Esc."""
        if os.name == 'nt':
            self._start_ll_hook(block_alt_tab=True)

    def block_winkey_only(self):
        """Form đăng ký: block Win + Alt+Tab + Alt+F4,
        KHÔNG block Alt đơn để Unikey/IME gõ dấu tiếng Việt."""
        if os.name == 'nt':
            self._start_ll_hook(block_alt_tab=False)

    def unblock_keys_safe(self):
        """Gỡ hook, trả lại bàn phím bình thường."""
        self._stop_ll_hook()
        # Dọn blocked_keys cũ của thư viện keyboard (nếu còn)
        for key in list(self.blocked_keys):
            try:
                keyboard.unblock_key(key)
                self.blocked_keys.remove(key)
            except:
                pass

    # ============================================================
    # LOGIN UI (Modern with customtkinter)
    # ============================================================
    def setup_login_ui(self):
        self.is_qr_mode = False
        self.clear_window()
        self.apply_default_background()
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)
        
        # Chỉ block phím ở màn login, không block khi đang ở form đăng ký
        if not self.is_registration_mode:
            threading.Thread(target=self.block_keys_safe, daemon=True).start()
        
        self.login_frame = ctk.CTkFrame(
            self.master,
            fg_color=COLORS['login_bg'],
            corner_radius=0,
            border_width=2,
            border_color=COLORS['surface1']
        )
        self.login_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        # Inner padding frame
        inner = ctk.CTkFrame(self.login_frame, fg_color="transparent")
        inner.pack(padx=40, pady=30)
        
        # IUH Logo
        self.login_logo = self._load_logo_image(size=(64, 64))
        if self.login_logo:
            ctk.CTkLabel(inner, image=self.login_logo, text="").pack(pady=(0, 10))
        
        # Title
        self.title_label = ctk.CTkLabel(
            inner,
            text="HỆ THỐNG QUẢN LÝ PHÒNG MÁY",
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color=COLORS['login_accent']
        )
        self.title_label.pack(pady=(0, 5))
        
        
        # Student ID field
        id_frame = ctk.CTkFrame(inner, fg_color="transparent")
        id_frame.pack(fill='x', pady=(0, 8))

        self.student_id_placeholder = "Nhập mã sinh viên"
        self.student_id_entry = ctk.CTkEntry(
            id_frame,
            width=300,
            height=42,
            font=ctk.CTkFont(family="Segoe UI", size=13),
            corner_radius=10,
            border_width=2,
            fg_color=COLORS['login_entry'],
            border_color=COLORS['surface1'],
            text_color=COLORS['overlay0']
        )
        self.student_id_entry.pack(fill='x')
        self.student_id_entry.insert(0, self.student_id_placeholder)
        self.student_id_entry.bind("<FocusIn>", lambda e: self._clear_placeholder(e.widget, self.student_id_placeholder))
        self.student_id_entry.bind("<FocusOut>", lambda e: self._restore_placeholder(e.widget, self.student_id_placeholder))
        self.student_id_entry.bind("<Return>", lambda e: self.do_login())
        
        # Login button
        self.login_btn = ctk.CTkButton(
            inner,
            text="Đăng nhập",
            command=self.do_login,
            width=300,
            height=44,
            corner_radius=10,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=COLORS['login_accent'],
            hover_color=COLORS['accent_hover'],
            text_color=COLORS['login_bg']
        )
        self.login_btn.pack(pady=(16, 8))
        
        # QR Login button
        self.qr_login_btn = ctk.CTkButton(
            inner,
            text="Đăng nhập bằng QR Code",
            command=self.show_qr_info,
            width=300,
            height=38,
            corner_radius=10,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color=COLORS['green'],
            hover_color=COLORS['teal'],
            text_color=COLORS['crust']
        )
        self.qr_login_btn.pack(pady=(0, 8))
        
        # Toggle to registration
        self.toggle_btn = ctk.CTkButton(
            inner,
            text="Chưa có tài khoản? Đăng ký ngay",
            command=self.toggle_registration_mode,
            width=300,
            height=32,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11),
            fg_color="transparent",
            hover_color=COLORS['surface0'],
            text_color=COLORS['login_accent'],
            border_width=1,
            border_color=COLORS['surface1']
        )
        self.toggle_btn.pack(pady=(4, 10))
        
        # Separator
        sep = ctk.CTkFrame(inner, fg_color=COLORS['surface1'], height=1)
        sep.pack(fill='x', pady=(4, 8))
        
        # Machine info
        self.machine_info = ctk.CTkLabel(
            inner,
            text=self.get_machine_info(),
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color=COLORS['overlay0']
        )
        self.machine_info.pack(pady=(0, 0))
        
        # Load background
        threading.Thread(target=self.load_background, daemon=True).start()
    
    def _clear_placeholder(self, entry, placeholder):
        try:
            if entry.get() == placeholder:
                entry.delete(0, 'end')
                entry.configure(text_color=COLORS['text'])
        except Exception:
            pass

    def _restore_placeholder(self, entry, placeholder):
        try:
            if not entry.get():
                entry.insert(0, placeholder)
                entry.configure(text_color=COLORS['overlay0'])
        except Exception:
            pass

    def toggle_registration_mode(self):
        self.is_registration_mode = not self.is_registration_mode
        
        if self.is_registration_mode:
            self._show_registration_form()
        else:
            self.setup_login_ui()
    
    def _show_registration_form(self):
        """Show the registration form with modern UI."""
        self.unblock_keys_safe()        # Bỏ hết block cũ
        self.block_winkey_only()        # Chỉ giữ block Win key, Alt thả ra cho IME
        self.clear_window()
        self.apply_default_background()
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)
        
        reg_frame = ctk.CTkFrame(
            self.master,
            fg_color=COLORS['login_bg'],
            corner_radius=20,
            border_width=2,
            border_color=COLORS['surface1']
        )
        reg_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        inner = ctk.CTkFrame(reg_frame, fg_color="transparent")
        inner.pack(padx=40, pady=30)
        
        ctk.CTkLabel(
            inner,
            text="ĐĂNG KÝ TÀI KHOẢN SINH VIÊN",
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color=COLORS['login_accent']
        ).pack(pady=(0, 20))
        
        # Mã SV và mật khẩu dùng CTkEntry, Họ tên + Lớp dùng tk.Entry thuần để gõ tiếng Việt
        ctk_fields = [
            ("Mã sinh viên", "student_id_entry", "Nhập mã sinh viên", False),
            ("Mật khẩu",    "password_entry",   "Ít nhất 8 ký tự",   True),
        ]
        tk_fields = [
            ("Họ và tên", "name_entry",  "Nhập họ tên đầy đủ"),
            ("Lớp",       "class_entry", "Ví dụ: DHKTPM17A"),
        ]

        for label_text, attr_name, placeholder, is_password in ctk_fields:
            frame = ctk.CTkFrame(inner, fg_color="transparent")
            frame.pack(fill='x', pady=(0, 6))
            ctk.CTkLabel(
                frame,
                text=label_text,
                font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
                text_color=COLORS['text'],
                anchor='w'
            ).pack(fill='x', pady=(0, 3))
            entry = ctk.CTkEntry(
                frame,
                width=300, height=38,
                font=ctk.CTkFont(family="Arial", size=12),
                placeholder_text=placeholder,
                corner_radius=8, border_width=2,
                fg_color=COLORS['login_entry'],
                border_color=COLORS['surface1'],
                text_color=COLORS['text'],
                placeholder_text_color=COLORS['overlay0'],
                show="*" if is_password else ""
            )
            entry.pack(fill='x')
            setattr(self, attr_name, entry)

        for label_text, attr_name, placeholder in tk_fields:
            frame = ctk.CTkFrame(inner, fg_color="transparent")
            frame.pack(fill='x', pady=(0, 6))
            ctk.CTkLabel(
                frame,
                text=label_text,
                font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
                text_color=COLORS['text'],
                anchor='w'
            ).pack(fill='x', pady=(0, 3))
            # tk.Entry thuần — không bị low-level keyboard hook chặn IME
            entry = tk.Entry(
                frame,
                font=('Arial', 12),
                bg=COLORS['login_entry'],
                fg=COLORS['text'],
                insertbackground=COLORS['text'],
                relief='flat',
                bd=0,
                highlightthickness=2,
                highlightbackground=COLORS['surface1'],
                highlightcolor=COLORS['accent'],
            )
            entry.pack(fill='x', ipady=8)
            # Placeholder giả
            entry.insert(0, placeholder)
            entry.config(fg=COLORS['overlay0'])
            def on_focus_in(e, w=entry, ph=placeholder):
                if w.get() == ph:
                    w.delete(0, 'end')
                    w.config(fg=COLORS['text'])
            def on_focus_out(e, w=entry, ph=placeholder):
                if not w.get():
                    w.insert(0, ph)
                    w.config(fg=COLORS['overlay0'])
            entry.bind('<FocusIn>',  on_focus_in)
            entry.bind('<FocusOut>', on_focus_out)
            setattr(self, attr_name, entry)
        
        # Ensure registration input starts focused so IME can attach correctly
        if hasattr(self, 'name_entry'):
            self.master.after(50, lambda: self.name_entry.focus_force())

        # Khoa/Vien dropdown
        kv_frame = ctk.CTkFrame(inner, fg_color="transparent")
        kv_frame.pack(fill='x', pady=(0, 6))
        
        ctk.CTkLabel(
            kv_frame,
            text="Khoa / Viện",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color=COLORS['text'],
            anchor='w'
        ).pack(fill='x', pady=(0, 3))
        
        khoa_vien_values = [
            "Khoa Công nghệ Thông tin",
            "Khoa Công nghệ Cơ khí",
            "Khoa Công nghệ Điện",
            "Khoa Công nghệ Điện tử",
            "Khoa Công nghệ Động lực",
            "Khoa Công nghệ Nhiệt - Lạnh",
            "Khoa Công nghệ May - Thời trang",
            "Khoa Công nghệ Hóa học",
            "Khoa Ngoại ngữ",
            "Khoa Quản trị Kinh doanh",
            "Khoa Thương mại - Du lịch",
            "Khoa Kỹ thuật Xây dựng",
            "Khoa Luật",
            "Viện Tài chính - Kế toán",
            "Viện Công nghệ Sinh học và Thực phẩm",
            "Viện Khoa học Công nghệ và Quản lý Môi trường",
            "Khoa Khoa học Cơ bản"
        ]
        
        self.khoa_vien_entry = ctk.CTkComboBox(
            kv_frame,
            width=300,
            height=38,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            values=khoa_vien_values,
            corner_radius=8,
            border_width=2,
            fg_color=COLORS['login_entry'],
            border_color=COLORS['surface1'],
            text_color=COLORS['text'],
            button_color=COLORS['accent'],
            button_hover_color=COLORS['accent_hover'],
            dropdown_fg_color=COLORS['surface0'],
            dropdown_text_color=COLORS['text'],
            dropdown_hover_color=COLORS['surface1'],
            state="readonly"
        )
        self.khoa_vien_entry.pack(fill='x')
        self.khoa_vien_entry.set(khoa_vien_values[0])
        
        # Register button
        ctk.CTkButton(
            inner,
            text="Đăng ký tài khoản",
            command=self.do_register,
            width=300,
            height=44,
            corner_radius=10,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=COLORS['login_accent'],
            hover_color=COLORS['accent_hover'],
            text_color=COLORS['login_bg']
        ).pack(pady=(16, 8))
        
        # Back to login
        ctk.CTkButton(
            inner,
            text="Đã có tài khoản? Đăng nhập",
            command=self.toggle_registration_mode,
            width=300,
            height=32,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11),
            fg_color="transparent",
            hover_color=COLORS['surface0'],
            text_color=COLORS['login_accent'],
            border_width=1,
            border_color=COLORS['surface1']
        ).pack(pady=(4, 0))
    
    # ============================================================
    # QR CODE DISPLAY
    # ============================================================
    def show_qr_info(self):
        if not self.firebase_initialized:
            messagebox.showerror('Lỗi', 'Chưa kết nối Firebase. QR login không khả dụng.')
            return

        self.is_qr_mode = True

        if hasattr(self, 'qr_frame') and self.qr_frame.winfo_exists():
            self.qr_frame.destroy()

        data = {
            'action': 'qr_login',
            'computer_id': self.computer_id,
            'server_url': self.server_url,
            'firebase_url': self.FIREBASE_URL,
        }
        payload = json.dumps(data, separators=(',', ':'))
        qr = qrcode.QRCode(
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=4
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')

        try:
            # Clear the login frame content
            for widget in self.login_frame.winfo_children():
                widget.destroy()
            
            qr_inner = ctk.CTkFrame(self.login_frame, fg_color="transparent")
            qr_inner.pack(padx=40, pady=30)

            qr_img = ImageTk.PhotoImage(img)
            qr_label = tk.Label(qr_inner, image=qr_img, bg=COLORS['login_bg'])
            qr_label.image = qr_img
            qr_label.pack(pady=(8, 10))

            ctk.CTkLabel(
                qr_inner,
                text='QUÉT QR ĐỂ ĐĂNG NHẬP',
                font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
                text_color=COLORS['login_accent']
            ).pack(pady=(0, 6))
            
            ctk.CTkLabel(
                qr_inner,
                text=f'Mã máy: PC-{self.computer_id:02d}',
                font=ctk.CTkFont(family="Segoe UI", size=12),
                text_color=COLORS['text']
            ).pack(pady=(0, 4))
            
            ctk.CTkLabel(
                qr_inner,
                text='Quét bằng app trên điện thoại để đăng nhập.\nHệ thống sẽ tự động xác thực.',
                font=ctk.CTkFont(family="Segoe UI", size=10),
                text_color=COLORS['subtext0'],
                wraplength=260,
                justify='center'
            ).pack(pady=(0, 12))

            ctk.CTkButton(
                qr_inner,
                text='Quay lại đăng nhập',
                command=self.setup_login_ui,
                width=200,
                height=36,
                corner_radius=8,
                font=ctk.CTkFont(family="Segoe UI", size=11),
                fg_color="transparent",
                hover_color=COLORS['surface0'],
                text_color=COLORS['login_accent'],
                border_width=1,
                border_color=COLORS['surface1']
            ).pack(pady=(0, 4))

        except Exception as e:
            logger.error(f"QR inline error: {e}")
            messagebox.showerror('Lỗi', 'Không thể hiển thị QR code')
    
    # ============================================================
    # LOGIN / REGISTER / LOGOUT LOGIC
    # ============================================================
    def do_register(self):
        student_id = self.student_id_entry.get().strip()
        password   = self.password_entry.get().strip()
        # tk.Entry dùng placeholder giả — lọc ra nếu còn placeholder
        name       = self.name_entry.get().strip()
        if name == "Nhập họ tên đầy đủ": name = ""
        class_name = self.class_entry.get().strip()
        if class_name == "Ví dụ: DHKTPM17A": class_name = ""
        khoa_vien  = self.khoa_vien_entry.get().strip()
        
        if not all([student_id, password, name, class_name, khoa_vien]):
            messagebox.showerror("Lỗi", "Vui lòng nhập đầy đủ thông tin")
            return
        if len(password) < 8:
            messagebox.showerror("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự")
            return
        
        try:
            response = requests.post(f"{self.server_url}/api/register", json={
                'student_id': student_id, 'password': password, 'name': name,
                'class_name': class_name, 'khoa_vien': khoa_vien
            }, timeout=10)
            if response.status_code == 200 and response.json().get('success'):
                messagebox.showinfo("Thành công", "Đăng ký thành công!\nVui lòng đăng nhập.")
                self.toggle_registration_mode()
            else:
                messagebox.showerror("Lỗi", response.json().get('message', 'Đăng ký thất bại'))
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể kết nối đến server: {e}")
    
    def do_login(self):
        student_id = self.student_id_entry.get().strip()
        if student_id == getattr(self, 'student_id_placeholder', ''):
            student_id = ''
        if not student_id:
            messagebox.showerror("Lỗi", "Vui lòng nhập mã sinh viên")
            return
        
        try:
            response = requests.post(f"{self.server_url}/api/qr_login", json={'student_id': student_id, 'computer_id': self.computer_id}, timeout=3)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.session_id = data['session_id']
                    self.last_login_info = {'student_id': student_id, 'computer_id': self.computer_id}
                    self.save_session_to_file()
                    self.setup_main_ui(data['user_name'])
                    self.register_with_server_once()
                    return
            elif response.status_code in (401, 403, 404, 409):
                error_msg = response.json().get('message', 'Đăng nhập thất bại')
                messagebox.showerror("Lỗi", error_msg)
                return
            else:
                raise Exception(f"Server trả lỗi {response.status_code}")
        except Exception as e:
            logger.error(f"Login error: {e}")
            self.do_offline_login(student_id, "")

    def do_offline_login(self, student_id, password):
        if not student_id:
            messagebox.showerror("Lỗi", "Vui lòng nhập mã sinh viên để đăng nhập offline")
            return
        event_uuid = self.save_pending_event('login', student_id, self.computer_id)
        self.session_id = f"offline-{event_uuid}"
        self.last_login_info = {'student_id': student_id, 'computer_id': self.computer_id}
        self.save_session_to_file()
        self.setup_main_ui(f"{student_id} (Offline)")
        messagebox.showinfo("Đăng nhập offline", "Đăng nhập offline thành công!\nDữ liệu sẽ được đồng bộ khi server online.")

    def do_logout(self):
        self.stop_idle_check_thread()

        if not self.session_id:
            self.has_setup_ui = False
            self.clear_window()
            self.master.overrideredirect(False)
            self.master.attributes('-fullscreen', True)
            self.master.attributes('-topmost', True)
            self.setup_login_ui()
            return
        
        student_id = None
        if self.last_login_info:
            student_id = self.last_login_info.get('student_id')

        if isinstance(self.session_id, str) and self.session_id.startswith('offline-'):
            if student_id:
                self.save_pending_event('logout', student_id, self.computer_id)
        else:
            try:
                response = requests.post(f"{self.server_url}/api/logout", json={'session_id': self.session_id}, timeout=5)
                if response.status_code != 200 or not response.json().get('success'):
                    if student_id:
                        self.save_pending_event('logout', student_id, self.computer_id)
            except:
                if student_id:
                    self.save_pending_event('logout', student_id, self.computer_id)
        
        self.session_id = None
        self.has_setup_ui = False
        self.clear_session_file()
        
        # Destroy system tray if active
        self._destroy_tray()
        
        self.clear_window()
        self.master.overrideredirect(False)
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)
        self.setup_login_ui()
    
    # ============================================================
    # IDLE TIMEOUT
    # ============================================================
    def reset_idle_timer(self, event=None):
        self.last_activity_time = time.time()

    def _get_system_idle_seconds(self):
        """Return system idle seconds on Windows, otherwise None."""
        if os.name != 'nt':
            return None
        try:
            class LASTINPUTINFO(ctypes.Structure):
                _fields_ = [
                    ('cbSize', ctypes.wintypes.UINT),
                    ('dwTime', ctypes.wintypes.DWORD),
                ]

            last_input = LASTINPUTINFO()
            last_input.cbSize = ctypes.sizeof(LASTINPUTINFO)

            if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(last_input)):
                return None

            if hasattr(ctypes.windll.kernel32, 'GetTickCount64'):
                tick_count = ctypes.windll.kernel32.GetTickCount64()
            else:
                tick_count = ctypes.windll.kernel32.GetTickCount()

            elapsed_ms = tick_count - last_input.dwTime
            if elapsed_ms < 0:
                elapsed_ms = 0
            return elapsed_ms / 1000.0
        except Exception:
            return None

    def _get_foreground_process_name(self):
        if os.name != 'nt':
            return None
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if not hwnd:
                return None
            pid = ctypes.wintypes.DWORD()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            proc = psutil.Process(pid.value)
            return proc.name().lower()
        except Exception:
            return None

    def _is_meeting_app_active(self):
        meeting_names = {
            'zoom.exe', 'zoommeeting.exe',
            'teams.exe', 'teams_windows_x64.exe', 'msteams.exe'
        }

        fg_name = self._get_foreground_process_name()
        if fg_name and fg_name in meeting_names:
            return True

        try:
            for proc in psutil.process_iter(['name']):
                name = proc.info.get('name')
                if name and name.lower() in meeting_names:
                    return True
        except Exception:
            pass

        return False

    def start_idle_check_thread(self):
        if self._idle_check_thread and self._idle_check_thread.is_alive():
            return
        self._idle_check_running = True
        def check_idle():
            while self._idle_check_running:
                try:
                    if self.session_id:
                        system_idle = self._get_system_idle_seconds()
                        if system_idle is not None:
                            elapsed = system_idle
                        else:
                            elapsed = time.time() - self.last_activity_time

                        if elapsed > self.IDLE_TIMEOUT_SECONDS:
                            if self._is_meeting_app_active():
                                logger.info("Meeting app active, skipping idle logout")
                            else:
                                logger.info(f"Auto-logout do idle timeout ({self.IDLE_TIMEOUT_SECONDS // 60} phút)")
                                self.master.after(0, self.do_logout)
                                break
                except Exception:
                    pass
                time.sleep(5)
        self._idle_check_thread = threading.Thread(target=check_idle, daemon=True)
        self._idle_check_thread.start()

    def stop_idle_check_thread(self):
        self._idle_check_running = False

    # ============================================================
    # MAIN UI (After Login) - Modern Sidebar
    # ============================================================
    def setup_main_ui(self, user_name):
        if self.has_setup_ui:
            return
        
        self.has_setup_ui = True
        self.clear_window()
        self.master.attributes('-fullscreen', False)
        self.master.overrideredirect(True)
        self.master.attributes('-topmost', False)
        self.master.resizable(False, False)
        self.unblock_keys_safe()
        
        screen_width = self.master.winfo_screenwidth()
        screen_height = self.master.winfo_screenheight()
        
        width = 300
        taskbar_height = 40
        self.full_height = screen_height - taskbar_height
        self.collapsed_height = 50
        self.sidebar_width = width
        self.sidebar_expanded = True
        self.x_pos = screen_width - width - 10
        self.y_pos = 0

        self.master.geometry(f"{width}x{self.full_height}+{self.x_pos}+{self.y_pos}")
        self.master.configure(bg=COLORS['base'])
        
        # Main container
        main_frame = ctk.CTkFrame(self.master, fg_color=COLORS['base'], corner_radius=0)
        main_frame.pack(fill='both', expand=True)
        
        # ---- HEADER ----
        header = ctk.CTkFrame(main_frame, fg_color=COLORS['surface0'], corner_radius=0, height=50)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        header_inner = ctk.CTkFrame(header, fg_color="transparent")
        header_inner.pack(fill='both', expand=True, padx=8, pady=4)
        
        # IUH Logo in sidebar header
        self.sidebar_logo = self._load_logo_image(size=(36, 36))
        if self.sidebar_logo:
            ctk.CTkLabel(header_inner, image=self.sidebar_logo, text="").pack(side='left', padx=(0, 6))
        
        # User info
        user_frame = ctk.CTkFrame(header_inner, fg_color="transparent")
        user_frame.pack(side='left', fill='y')
        
        ctk.CTkLabel(
            user_frame,
            text=user_name,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color=COLORS['text']
        ).pack(anchor='w')
        
        ctk.CTkLabel(
            user_frame,
            text=f"PC-{self.computer_id:02d}",
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color=COLORS['subtext0']
        ).pack(anchor='w')
        
        # Toggle button
        self.toggle_button = ctk.CTkButton(
            header_inner,
            text='◀',
            command=self.toggle_sidebar,
            width=36,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=COLORS['surface1'],
            hover_color=COLORS['surface2'],
            text_color=COLORS['text']
        )
        self.toggle_button.pack(side='right')
        
        # ---- CONTENT ----
        self.content_frame = ctk.CTkFrame(main_frame, fg_color=COLORS['base'], corner_radius=0)
        self.content_frame.pack(fill='both', expand=True, padx=8, pady=(8, 0))
        
        # Status indicator
        status_frame = ctk.CTkFrame(self.content_frame, fg_color=COLORS['surface0'], corner_radius=10, height=30)
        status_frame.pack(fill='x', pady=(0, 8))
        
        status_inner = ctk.CTkFrame(status_frame, fg_color="transparent")
        status_inner.pack(padx=10, pady=6)
        
        # Green dot + online text
        ctk.CTkLabel(
            status_inner,
            text="●  Đang hoạt động",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color=COLORS['green']
        ).pack(side='left')
        
        # Action buttons
        btn_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        btn_frame.pack(fill='x', pady=(0, 8))
        
        # Row 1: Logout + Shutdown
        row1 = ctk.CTkFrame(btn_frame, fg_color="transparent")
        row1.pack(fill='x', pady=(0, 4))
        
        ctk.CTkButton(
            row1,
            text="Đăng xuất",
            command=self.do_logout,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color=COLORS['red'],
            hover_color=COLORS['maroon'],
            text_color=COLORS['crust']
        ).pack(side='left', expand=True, fill='x', padx=(0, 3))
        
        ctk.CTkButton(
            row1,
            text="Tắt máy",
            command=self.shutdown_computer,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color=COLORS['peach'],
            hover_color=COLORS['yellow'],
            text_color=COLORS['crust']
        ).pack(side='left', expand=True, fill='x', padx=(3, 0))
        
        # Row 2: Restart + Refresh
        row2 = ctk.CTkFrame(btn_frame, fg_color="transparent")
        row2.pack(fill='x', pady=(0, 4))
        
        ctk.CTkButton(
            row2,
            text="Khởi động lại",
            command=self._do_restart,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color=COLORS['blue'],
            hover_color=COLORS['sapphire'],
            text_color=COLORS['crust']
        ).pack(side='left', expand=True, fill='x', padx=(0, 3))
        
        ctk.CTkButton(
            row2,
            text="Làm mới nền",
            command=self.reload_background,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color=COLORS['green'],
            hover_color=COLORS['teal'],
            text_color=COLORS['crust']
        ).pack(side='left', expand=True, fill='x', padx=(3, 0))

        # Row 3: Task Manager toggle
        row3 = ctk.CTkFrame(btn_frame, fg_color="transparent")
        row3.pack(fill='x', pady=(0, 4))
        self.task_manager_button = ctk.CTkButton(
            row3,
            text="Khóa Task Manager",
            command=self.toggle_task_manager,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color=COLORS['yellow'],
            hover_color=COLORS['peach'],
            text_color=COLORS['crust']
        )
        self.task_manager_button.pack(expand=True, fill='x')
        
        self.task_manager_disabled = is_task_manager_disabled()
        self.update_task_manager_button()
        
        # Machine info
        info_frame = ctk.CTkFrame(self.content_frame, fg_color=COLORS['surface0'], corner_radius=10)
        info_frame.pack(fill='x', pady=(0, 8))
        
        ctk.CTkLabel(
            info_frame,
            text=self.get_machine_info(),
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color=COLORS['subtext0']
        ).pack(padx=10, pady=6)
        
        # Separator
        sep = ctk.CTkFrame(self.content_frame, fg_color=COLORS['surface1'], height=1, corner_radius=0)
        sep.pack(fill='x', pady=(0, 8))
        
        # Ads frame
        self.ads_frame = ctk.CTkScrollableFrame(
            self.content_frame,
            fg_color="transparent",
            scrollbar_button_color=COLORS['surface1'],
            scrollbar_button_hover_color=COLORS['surface2']
        )
        self.ads_frame.pack(fill='both', expand=True)
        self.ad_photo_images = []
        self.ad_image_labels = []
        threading.Thread(target=self.load_ads, daemon=True).start()
        
        self.sidebar_expanded = True
        self.master.update_idletasks()
        
        # Bind activity events
        for event in ("<Motion>", "<KeyPress>", "<ButtonPress>"):
            self.master.bind(event, self.reset_idle_timer, add="+")
        
        self.reset_idle_timer()
        self.start_idle_check_thread()
        
        # Setup system tray
        self._setup_system_tray(user_name)

    def update_task_manager_button(self):
        if getattr(self, 'task_manager_disabled', False):
            self.task_manager_button.configure(text='Mở Task Manager', fg_color=COLORS['green'], hover_color=COLORS['teal'])
        else:
            self.task_manager_button.configure(text='Khóa Task Manager', fg_color=COLORS['yellow'], hover_color=COLORS['peach'])

    def toggle_task_manager(self):
        if os.name != 'nt':
            messagebox.showinfo('Không hỗ trợ', 'Tính năng này chỉ hỗ trợ trên Windows.')
            return

        try:
            if self.task_manager_disabled:
                # Mở Task Manager: cần xác thực admin
                if verify_admin_credentials():
                    if enable_task_manager():
                        self.task_manager_disabled = False
                        messagebox.showinfo('Task Manager', 'Đã mở Task Manager.')
                    else:
                        messagebox.showerror('Lỗi', 'Không thể mở Task Manager.')
                # Nếu xác thực sai, không làm gì (lỗi đã hiển thị trong verify_admin_credentials)
            else:
                # Tắt Task Manager: không cần xác thực
                if disable_task_manager():
                    self.task_manager_disabled = True
                    messagebox.showinfo('Task Manager', 'Đã khóa Task Manager.')
                else:
                    messagebox.showerror('Lỗi', 'Không thể khóa Task Manager.')
        except Exception as e:
            logger.error(f"Toggle Task Manager error: {e}")
            messagebox.showerror('Lỗi', f'Không thể thực hiện: {e}')
        finally:
            self.update_task_manager_button()
    
    # ============================================================
    # SYSTEM TRAY
    # ============================================================
    def _setup_system_tray(self, user_name):
        """Create system tray icon."""
        if not PYSTRAY_AVAILABLE:
            return
        
        try:
            icon_path = resource_path("myicon.ico")
            if os.path.exists(icon_path):
                tray_image = Image.open(icon_path)
                tray_image = tray_image.resize((64, 64), Image.Resampling.LANCZOS)
            else:
                tray_image = Image.new('RGB', (64, 64), color=COLORS['accent'])
            
            menu = pystray.Menu(
                pystray.MenuItem(f"User: {user_name}", lambda: None, enabled=False),
                pystray.MenuItem(f"PC-{self.computer_id:02d}", lambda: None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Hiện cửa sổ", self._tray_show_window),
                pystray.MenuItem("Đăng xuất", self._tray_logout),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Tắt máy", self._tray_shutdown),
            )
            
            self.tray_icon = pystray.Icon(APP_NAME, tray_image, f"{APP_NAME} - {user_name}", menu)
            self.tray_thread = threading.Thread(target=self.tray_icon.run, daemon=True)
            self.tray_thread.start()
            logger.info("System tray icon created")
        except Exception as e:
            logger.warning(f"System tray error: {e}")
    
    def _destroy_tray(self):
        if self.tray_icon:
            try:
                self.tray_icon.stop()
            except:
                pass
            self.tray_icon = None
    
    def _tray_show_window(self):
        self.master.after(0, lambda: (
            self.master.deiconify(),
            self.master.lift(),
            self.master.focus_force()
        ))
    
    def _tray_logout(self):
        self.master.after(0, self.do_logout)
    
    def _tray_shutdown(self):
        self.master.after(0, self.shutdown_computer)
    
    # ============================================================
    # ADS & BACKGROUND
    # ============================================================
    def load_ads(self):
        try:
            base_url = self.server_url
            if base_url.endswith('/api'):
                base_url = base_url[:-4]

            response = requests.get(f"{base_url}/api/get_advertisement", timeout=10)
            if response.status_code != 200:
                return

            ads = response.json()
            if not ads:
                return

            ads = ads[:5]
            ad_items = []
            for ad in ads:
                image_url = ad.get('image_url')
                link = ad.get('link')
                if not image_url:
                    continue

                if image_url.startswith('http://') or image_url.startswith('https://'):
                    img_url = image_url
                else:
                    img_url = f"{base_url}/{image_url.lstrip('/')}"

                img_response = requests.get(img_url, timeout=10)
                if img_response.status_code != 200:
                    continue

                image = Image.open(io.BytesIO(img_response.content))
                if image.width > 0:
                    target_width = min(image.width, self.sidebar_width - 30)
                    ratio = target_width / image.width
                    target_height = max(1, int(image.height * ratio))
                    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(image)
                ad_items.append((photo, link))

            if not ad_items:
                return

            def _show_ads():
                for lbl in self.ad_image_labels:
                    lbl.destroy()
                self.ad_image_labels = []
                self.ad_photo_images = []

                for photo, link in ad_items:
                    label = tk.Label(self.ads_frame, image=photo, bg=COLORS['base'], cursor='hand2' if link else '')
                    if link:
                        label.bind('<Button-1>', lambda e, url=link: webbrowser.open(url))
                    label.pack(fill='x', pady=(0, 6))
                    self.ad_image_labels.append(label)
                    self.ad_photo_images.append(photo)

            self.master.after(0, _show_ads)
        except Exception as e:
            logger.warning(f"Load ad error: {e}")
        
    def reload_background(self):
        logger.info("User requested background reload")
        if self._bg_loading:
            logger.warning("Background already loading, skipping")
            return
        self.reset_idle_timer()
        if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
            try:
                self.bg_label.image = None
                self.bg_label.destroy()
            except:
                pass
        threading.Thread(target=self.load_background, daemon=True).start()
    
    def toggle_sidebar(self):
        if self.sidebar_expanded:
            self.content_frame.pack_forget()
            self.master.geometry(f"{self.sidebar_width}x{self.collapsed_height}+{self.x_pos}+{self.y_pos}")
            self.toggle_button.configure(text='▶')
            self.sidebar_expanded = False
        else:
            self.master.geometry(f"{self.sidebar_width}x{self.full_height}+{self.x_pos}+{self.y_pos}")
            self.content_frame.pack(fill='both', expand=True, padx=8, pady=(8, 0))
            self.toggle_button.configure(text='◀')
            self.sidebar_expanded = True
        self.reset_idle_timer()
    
    def shutdown_computer(self):
        confirm = messagebox.askyesno("Xác nhận", "Bạn có chắc muốn tắt máy?")
        if confirm:
            self._do_shutdown()
    
    def apply_default_background(self):
        if self._bg_loading:
            logger.info("Background already loading, skipping default")
            return
        try:
            default_path = resource_path('background.jpg')
            if os.path.exists(default_path):
                image = Image.open(default_path)
                screen_width = self.master.winfo_screenwidth()
                screen_height = self.master.winfo_screenheight()
                image = image.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
                self.bg_photo = ImageTk.PhotoImage(image)

                if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
                    try:
                        self.bg_label.image = None
                        self.bg_label.destroy()
                    except:
                        pass

                self.bg_label = tk.Label(self.master, image=self.bg_photo)
                self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)
                self.bg_label.lower()
                self.master.update_idletasks()
            else:
                logger.warning(f"Default background not found: {default_path}")
        except Exception as e:
            logger.warning(f"Default background load error: {e}")

    def load_background(self):
        if self._bg_loading:
            logger.info("Background load already in progress, skipping")
            return
        self._bg_loading = True
        try:
            base_url = self.server_url
            if base_url.endswith('/api'):
                base_url = base_url[:-4]

            response = requests.get(f"{base_url}/api/get_active_background", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('url'):
                    url = data.get('url')
                    img_response = requests.get(url, timeout=10)
                    if img_response.status_code == 200:
                        image = Image.open(io.BytesIO(img_response.content))
                        screen_width = self.master.winfo_screenwidth()
                        screen_height = self.master.winfo_screenheight()
                        image = image.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
                        self.bg_photo = ImageTk.PhotoImage(image)

                        def _apply_bg():
                            try:
                                if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
                                    try:
                                        self.bg_label.image = None
                                        self.bg_label.destroy()
                                    except:
                                        pass
                                self.bg_label = tk.Label(self.master, image=self.bg_photo)
                                self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)
                                self.bg_label.lower()
                                self.master.update_idletasks()
                                logger.info("Background reloaded successfully")
                            except Exception as e:
                                logger.warning(f"Apply background error: {e}")
                            finally:
                                self._bg_loading = False
                        self.master.after(0, _apply_bg)
                        return
                else:
                    logger.warning(f"No active background from server: {data}")
        except Exception as e:
            logger.warning(f"Background error: {e}")
        self._bg_loading = False
    
    # ============================================================
    # UTILITY
    # ============================================================
    def get_machine_info(self):
        return f"Máy: PC-{self.computer_id:02d}  |  IP: {self.get_local_ip()}"
    
    def clear_window(self):
        for widget in self.master.winfo_children():
            widget.destroy()
    
    def on_closing(self):
        self.unblock_keys_safe()
        self._destroy_tray()
        try:
            enable_task_manager()
        except:
            pass
        if self.api_server:
            try:
                self.api_server.shutdown()
            except:
                pass
        self.master.destroy()


# ============================================================
# ENTRY POINT
# ============================================================
if __name__ == "__main__":
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}...")
    
    if os.name == 'nt' and not is_running_as_admin():
        logger.info("Elevating to admin privileges...")
        if elevate_to_admin():
            sys.exit(0)
        else:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Lỗi", "Không thể nâng quyền.\nVui lòng chạy với quyền Administrator.")
            root.destroy()
            sys.exit(1)
    
    # Set auto-start if not already
    if os.name == 'nt' and not is_autostart_enabled():
        set_autostart(True)
        logger.info("Auto-start enabled")
    # Hide console window for client GUI
    try:
        def hide_console():
            if os.name == 'nt':
                import ctypes
                ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        hide_console()
    except Exception:
        pass

    # Disable Task Manager to prevent students from killing the process (requires admin)
    try:
        disable_task_manager()
    except Exception:
        logger.debug("Unable to disable Task Manager (missing privileges?)")
    
    root = ctk.CTk()
    try:
        root.iconbitmap(resource_path("myicon.ico"))
    except:
        pass
    
    app = LabManagerClient(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    # Watchdog disabled: startup handled by system/startup scripts
    root.mainloop()