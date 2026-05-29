# -*- coding: utf-8 -*-
import sys
import io
# Đảm bảo output UTF-8 trên Windows
if sys.platform == 'win32' and sys.stdout is not None:
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        pass

from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, send_file, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy import inspect, text, or_
from threading import Thread
import importlib

# OpenPyXL imports
if importlib.util.find_spec("openpyxl") is not None:
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, Border, Side
    OPENPYXL_AVAILABLE = True
else:
    OPENPYXL_AVAILABLE = False

# Firebase imports
if importlib.util.find_spec("firebase_admin") is not None:
    import firebase_admin
    from firebase_admin import credentials, db as firebase_db
    FIREBASE_AVAILABLE = True
else:
    FIREBASE_AVAILABLE = False

import os, time, datetime, socket, logging, json, glob, webbrowser, pandas as pd
import subprocess

# Cấu hình file upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==== Đường dẫn và khởi tạo thư mục ====
def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def ensure_directories():
    directories = [
        resource_path('static/uploads/ads'),
        resource_path('static/uploads/backgrounds'),
        resource_path('static/css'),
        resource_path('static/js'),
        resource_path('templates')
    ]
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

ensure_directories()

# ==== Flask App & Config ====
app = Flask(__name__, 
            template_folder=resource_path('templates'),
            static_folder=resource_path('static'))
app.secret_key = 'your-very-secret-key'
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg2://DPTIUH:libiuh2025@localhost:5432/lab_manager'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = resource_path('static/uploads/ads')
app.config['BACKGROUND_FOLDER'] = resource_path('static/uploads/backgrounds')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['BACKGROUND_FOLDER'], exist_ok=True)
app.config['HEARTBEAT_INTERVAL'] = 5
app.config['HEARTBEAT_TIMEOUT'] = 15
app.config['EXTENDED_TIMEOUT'] = 45

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client_apis = {}
server_start_time = datetime.datetime.now()

firebase_sync_status = {
    'running': False,
    'total': 0,
    'synced': 0,
    'failed': 0,
    'started_at': None,
    'completed_at': None,
    'message': ''
}

# ==== Model ====
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    class_name = db.Column(db.String(50))
    khoa_vien = db.Column(db.String(100))
    password_hash = db.Column(db.String(255), nullable=False)
    plain_password = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    sessions = db.relationship('Session', backref='user', lazy=True)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Computer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    mac_address = db.Column(db.String(20))
    ip_address = db.Column(db.String(15))
    status = db.Column(db.String(20), default='offline')
    last_active = db.Column(db.DateTime)
    api_port = db.Column(db.Integer, default=5001)
    sessions = db.relationship('Session', backref='computer', lazy=True)

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    computer_id = db.Column(db.Integer, db.ForeignKey('computer.id'), nullable=False)
    login_time = db.Column(db.DateTime, nullable=False)
    logout_time = db.Column(db.DateTime)
    duration = db.Column(db.Integer)

class Advertisement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(500), nullable=False)
    link = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    is_active = db.Column(db.Boolean, default=True)

class Background(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)

class Setting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

class PendingEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(20), nullable=False)
    student_id = db.Column(db.String(20), nullable=False)
    computer_id = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.now)
    synced = db.Column(db.Boolean, default=False)
    event_uuid = db.Column(db.String(36), unique=True, nullable=False)

# ==== Khởi tạo DB ====
def init_db():
    with app.app_context():
        db.create_all()
        if Background.query.count() == 0:
            default_bg = Background(filename='default.jpg', url='static/images/default-bg.jpg', is_active=True)
            db.session.add(default_bg)
            db.session.commit()
        
        inspector = inspect(db.engine)
        
        if 'computer' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('computer')]
            if 'api_port' not in columns:
                try:
                    with db.engine.begin() as conn:
                        conn.execute(text('ALTER TABLE computer ADD COLUMN api_port INTEGER DEFAULT 5001'))
                except: pass
        
        if 'user' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('user')]
            if 'khoa_vien' not in columns:
                try:
                    with db.engine.begin() as conn:
                        conn.execute(text('ALTER TABLE "user" ADD COLUMN khoa_vien VARCHAR(100)'))
                except: pass
        
        migrate_ads_from_json_to_db()
        
        if Computer.query.count() == 0:
            for i in range(1, 67):
                computer = Computer(id=i, name=f'PC-{i:02d}', ip_address=None, mac_address=f'00:1A:2B:3C:{i:02d}:FF', status='offline', api_port=5001)
                db.session.add(computer)
            db.session.commit()
        
        admin = User.query.filter_by(student_id='admin').first()
        if not admin:
            admin = User(student_id='admin', name='Quản trị viên', class_name='ADMIN', khoa_vien='System', password_hash=generate_password_hash('admin123'), plain_password='admin123')
            db.session.add(admin)
            db.session.commit()

        if Setting.query.filter_by(name='client_idle_timeout_seconds').first() is None:
            db.session.add(Setting(name='client_idle_timeout_seconds', value=str(10 * 60)))
            db.session.commit()

def migrate_ads_from_json_to_db():
    try:
        if Advertisement.query.count() > 0:
            return
        ads_path = resource_path('ads.json')
        if os.path.exists(ads_path):
            with open(ads_path, 'r', encoding='utf-8') as f:
                ads_data = json.load(f)
            for ad_data in ads_data:
                ad = Advertisement(image_url=ad_data.get('image_url', ''), link=ad_data.get('link', ''), is_active=True)
                db.session.add(ad)
            db.session.commit()
    except: pass

init_db()

# ==== Firebase ====
FIREBASE_URL = 'https://login-iuh-default-rtdb.firebaseio.com/'
def get_firebase_key_path():
    possible_paths = [resource_path('firebase_key.json'), os.path.join(os.path.dirname(__file__), "firebase_key.json"), "firebase_key.json"]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

FIREBASE_KEY_PATH = get_firebase_key_path()

def initialize_firebase():
    if not FIREBASE_AVAILABLE:
        return False
    if firebase_admin._apps:
        return True

    if not FIREBASE_KEY_PATH:
        logger.warning('Firebase key file not found: firebase_key.json')
        return False

    try:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_URL})
        logger.info(f'Firebase initialized from {FIREBASE_KEY_PATH}')
        return True
    except Exception as e:
        logger.error(f'Firebase initialization failed: {e}')
        return False

# Initialize Firebase if possible at startup
initialize_firebase()

def sync_user_to_firebase(user):
    if not FIREBASE_AVAILABLE:
        return
    if not firebase_admin._apps:
        if not initialize_firebase():
            return
    try:
        ref = firebase_db.reference(f'users/{user.student_id}')
        ref.set({'id': user.id, 'student_id': user.student_id, 'name': user.name, 'class_name': user.class_name, 'khoa_vien': user.khoa_vien, 'plain_password': user.plain_password or '', 'created_at': user.created_at.isoformat() if user.created_at else None})
    except Exception as e:
        logger.error(f'Firebase sync failed for {user.student_id}: {e}')

def get_computer_name_from_ip(ip_address):
    try:
        parts = ip_address.strip().split('.')
        if len(parts) != 4: return None
        last_octet = int(parts[-1])
        if 1 <= last_octet <= 66: return f'PC-{last_octet:02d}'
        elif 101 <= last_octet <= 166: return f'PC-{last_octet-100:02d}'
        else: return f'PC-{(hash(ip_address) % 66 + 1):02d}'
    except: return None


def get_setting(name, default=None):
    setting = Setting.query.filter_by(name=name).first()
    if setting:
        try:
            return setting.value
        except Exception:
            return setting.value
    return default


def set_setting(name, value):
    setting = Setting.query.filter_by(name=name).first()
    if setting:
        setting.value = str(value)
        setting.updated_at = datetime.datetime.now()
    else:
        setting = Setting(name=name, value=str(value))
        db.session.add(setting)
    db.session.commit()
    return setting

# ==== API Endpoints ====
@app.route('/api/register_client', methods=['POST'])
def register_client():
    try:
        data = request.get_json()
        computer_id = data.get('computer_id')
        ip = data.get('ip')
        if not ip or ip.startswith('127.') or ip == '0.0.0.0' or ip == '::1':
            ip = request.remote_addr
        api_port = data.get('api_port', 5001)
        session_id = data.get('session_id')

        computer = Computer.query.filter_by(ip_address=ip).first()
        if not computer and computer_id:
            computer = Computer.query.get(computer_id)
        if not computer:
            computer_name = get_computer_name_from_ip(ip)
            if computer_name:
                computer = Computer.query.filter_by(name=computer_name).first()
                if not computer:
                    computer = Computer(name=computer_name, ip_address=ip, mac_address=f'00:1A:2B:3C:{computer_id:02d}:FF' if computer_id else '00:1A:2B:3C:00:00', status='online', api_port=api_port, last_active=datetime.datetime.now())
                    db.session.add(computer)
                    db.session.flush()

        if not computer:
            return jsonify({'success': False, 'message': 'Cannot identify computer'}), 400

        computer.ip_address = ip
        computer.api_port = api_port
        previous_last_active = computer.last_active
        computer.last_active = datetime.datetime.now()

        if session_id and isinstance(session_id, str) and session_id.startswith('offline-'):
            session_id = None

        active_session = None
        if session_id:
            active_session = Session.query.filter_by(id=session_id, logout_time=None).first()
            if active_session and active_session.computer_id != computer.id:
                active_session = None

            if not active_session:
                closed_session = db.session.get(Session, session_id) if not isinstance(session_id, str) or session_id.isdigit() else None
                if closed_session and closed_session.computer_id == computer.id and closed_session.logout_time:
                    active_session = Session(user_id=closed_session.user_id, computer_id=computer.id, login_time=datetime.datetime.now())
                    db.session.add(active_session)
                    db.session.flush()
                    logger.info(f"Restored session for user {closed_session.user_id} on computer {computer.id}")

        if not active_session:
            active_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).order_by(Session.login_time.desc()).first()

        computer.status = 'Đang sử dụng' if active_session else 'online'

        db.session.commit()
        client_apis[computer.id] = {'ip': ip, 'port': api_port}
        timeout_seconds = int(get_setting('client_idle_timeout_seconds', 10 * 60))
        client_config = {'idle_timeout_seconds': timeout_seconds}
        
        if active_session:
            user = User.query.get(active_session.user_id)
            return jsonify({'success': True, 'has_active_session': True, 'session_id': active_session.id, 'user_name': user.student_id if user else 'Unknown', 'user_id': user.id if user else None, 'client_config': client_config})
        return jsonify({'success': True, 'has_active_session': False, 'client_config': client_config})
    except Exception as e:
        logger.error(f"Register error: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    try:
        data = request.get_json()
        computer_id = data.get('computer_id')
        computer = Computer.query.get(computer_id)
        if not computer and data.get('ip'):
            computer = Computer.query.filter_by(ip_address=data['ip']).first()
        if computer:
            computer.last_active = datetime.datetime.now()
            if data.get('ip'):
                computer.ip_address = data['ip']
            if data.get('api_port'):
                computer.api_port = data['api_port']
                client_apis[computer.id] = {'ip': computer.ip_address, 'port': computer.api_port}
            
            active_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()

            if not active_session and data.get('session_id'):
                sid = data['session_id']
                closed_session = db.session.get(Session, sid) if not isinstance(sid, str) or str(sid).isdigit() else None
                if closed_session and closed_session.computer_id == computer.id and closed_session.logout_time:
                    active_session = Session(user_id=closed_session.user_id, computer_id=computer.id, login_time=datetime.datetime.now())
                    db.session.add(active_session)
                    logger.info(f"Restored session for user {closed_session.user_id} on computer {computer.id} via heartbeat")

            computer.status = 'Đang sử dụng' if active_session else 'online'
            db.session.commit()
            timeout_seconds = int(get_setting('client_idle_timeout_seconds', 10 * 60))
            return jsonify({'success': True, 'session_active': active_session is not None, 'session_id': active_session.id if active_session else None, 'client_config': {'idle_timeout_seconds': timeout_seconds}})
        return jsonify({'success': False}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(student_id=data['student_id']).first()
        if not user:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        password = data.get('password', '')
        if password:
            if not user.check_password(password):
                return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        computer = Computer.query.get(data['computer_id'])
        if not computer:
            return jsonify({'success': False, 'message': 'Computer not found'}), 404
        
        existing_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()
        if existing_session:
            return jsonify({'success': False, 'message': 'Computer is in use'}), 409
        
        new_session = Session(user_id=user.id, computer_id=computer.id, login_time=datetime.datetime.now())
        computer.status = 'Đang sử dụng'
        computer.last_active = datetime.datetime.now()
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({'success': True, 'session_id': new_session.id, 'user_name': user.student_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/client_login', methods=['POST'])
def client_login_api():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        computer_id = data.get('computer_id')

        if not student_id or not computer_id:
            return jsonify({'success': False, 'message': 'Thiếu thông tin đăng nhập'}), 400

        user = User.query.filter_by(student_id=student_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'Không tìm thấy user'}), 404

        computer = Computer.query.get(computer_id)
        if not computer:
            return jsonify({'success': False, 'message': 'Không tìm thấy máy tính'}), 404

        existing_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()
        if existing_session:
            if data.get('force'):
                now = datetime.datetime.now()
                existing_session.logout_time = now
                existing_session.duration = int((now - existing_session.login_time).total_seconds())
            else:
                return jsonify({'success': False, 'message': 'Máy tính đang được sử dụng'}), 409

        new_session = Session(user_id=user.id, computer_id=computer.id, login_time=datetime.datetime.now())
        computer.status = 'Đang sử dụng'
        computer.last_active = datetime.datetime.now()
        db.session.add(new_session)
        db.session.commit()

        return jsonify({'success': True, 'session_id': new_session.id, 'user_name': user.student_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/sync_events', methods=['POST'])
def sync_events():
    try:
        data = request.get_json() or {}
        events = data.get('events', [])
        if not isinstance(events, list):
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ'}), 400

        synced_count = 0
        for event in events:
            event_type = event.get('event_type')
            student_id = str(event.get('student_id') or '').strip()
            computer_id = event.get('computer_id')
            timestamp = event.get('timestamp')

            if not event_type or not student_id or not computer_id:
                continue

            try:
                computer_id = int(computer_id)
            except (TypeError, ValueError):
                continue

            user = User.query.filter_by(student_id=student_id).first()
            computer = Computer.query.get(computer_id)
            if not user or not computer:
                continue

            event_time = datetime.datetime.now()
            if timestamp:
                try:
                    event_time = datetime.datetime.fromisoformat(timestamp)
                except Exception:
                    pass

            if event_type == 'login':
                existing_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()
                if existing_session:
                    continue
                new_session = Session(user_id=user.id, computer_id=computer.id, login_time=event_time)
                computer.status = 'Đang sử dụng'
                computer.last_active = event_time
                db.session.add(new_session)
                synced_count += 1
            elif event_type == 'logout':
                active_session = Session.query.filter_by(computer_id=computer.id, user_id=user.id, logout_time=None).first()
                if not active_session:
                    continue
                active_session.logout_time = event_time
                active_session.duration = int((event_time - active_session.login_time).total_seconds())
                other_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).filter(Session.id != active_session.id).first()
                computer.status = 'Đang sử dụng' if other_session else 'online'
                synced_count += 1

        db.session.commit()
        return jsonify({'success': True, 'synced_count': synced_count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/qr_login', methods=['POST'])
def qr_login():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        user_id = data.get('user_id') or data.get('id')
        computer_id = data.get('computer_id')

        if student_id is not None:
            student_id = str(student_id).strip()
        if user_id is not None:
            user_id = str(user_id).strip()
        if isinstance(computer_id, str) and computer_id.isdigit():
            computer_id = int(computer_id)

        if not computer_id or (not student_id and not user_id):
            return jsonify({'success': False, 'message': 'Thiếu thông tin'}), 400

        user = None
        if student_id:
            user = User.query.filter_by(student_id=student_id).first()

        if not user and user_id:
            try:
                user_id_int = int(user_id)
                user = db.session.get(User, user_id_int)
            except (ValueError, TypeError):
                user = None

        if not user and student_id and student_id.isdigit():
            try:
                user = db.session.get(User, int(student_id))
            except (ValueError, TypeError):
                user = None

        if not user:
            return jsonify({'success': False, 'message': 'Không tìm thấy user'}), 404

        computer = db.session.get(Computer, computer_id)
        if not computer:
            return jsonify({'success': False, 'message': 'Không tìm thấy máy tính'}), 404

        existing_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()
        if existing_session:
            return jsonify({'success': False, 'message': 'Máy tính đang được sử dụng bởi user khác'}), 409

        new_session = Session(user_id=user.id, computer_id=computer.id, login_time=datetime.datetime.now())
        computer.status = 'Đang sử dụng'
        computer.last_active = datetime.datetime.now()
        db.session.add(new_session)
        db.session.commit()

        return jsonify({'success': True, 'session_id': new_session.id, 'user_name': user.student_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        data = request.get_json()
        session_obj = Session.query.get(data['session_id'])
        if not session_obj or session_obj.logout_time:
            return jsonify({'success': False, 'message': 'Session not found'})
        
        session_obj.logout_time = datetime.datetime.now()
        session_obj.duration = int((session_obj.logout_time - session_obj.login_time).total_seconds())
        
        computer = Computer.query.get(session_obj.computer_id)
        if computer:
            other_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).filter(Session.id != session_obj.id).first()
            computer.status = 'online' if not other_session else 'Đang sử dụng'
        
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/computers', methods=['GET'])
def get_computers():
    computers = Computer.query.order_by(Computer.id).all()
    return jsonify([{'id': c.id, 'name': c.name, 'status': c.status, 'ip_address': c.ip_address, 'last_active': c.last_active.isoformat() if c.last_active else None} for c in computers])

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'student_id': u.student_id, 'name': u.name, 'class_name': u.class_name, 'khoa_vien': u.khoa_vien, 'created_at': u.created_at.isoformat() if u.created_at else None} for u in users])

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(student_id=data['student_id']).first():
            return jsonify({'success': False, 'message': 'Student ID exists'}), 400
        if len(data['password']) < 8:
            return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        
        new_user = User(student_id=data['student_id'], name=data.get('name', data['student_id']), class_name=data.get('class_name', ''), khoa_vien=data.get('khoa_vien'), password_hash=generate_password_hash(data['password']), plain_password=data['password'])
        db.session.add(new_user)
        db.session.commit()
        sync_user_to_firebase(new_user)
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==== REMOTE CONTROL APIs ====
@app.route('/api/remote/shutdown/<int:computer_id>', methods=['POST'])
def remote_shutdown(computer_id):
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'success': False, 'message': 'Client not registered'}), 404
        
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/shutdown"
        
        for attempt in range(3):
            try:
                response = requests.post(url, timeout=5, json={})
                if response.status_code == 200:
                    computer = Computer.query.get(computer_id)
                    if computer:
                        computer.status = 'Tắt máy'
                        db.session.commit()
                    return jsonify({'success': True, 'message': 'Shutdown command sent'})
            except:
                time.sleep(1)
        return jsonify({'success': False, 'message': 'Failed after 3 attempts'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/remote/restart/<int:computer_id>', methods=['POST'])
def remote_restart(computer_id):
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'success': False, 'message': 'Client not registered'}), 404
        
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/restart"
        
        for attempt in range(3):
            try:
                response = requests.post(url, timeout=5, json={})
                if response.status_code == 200:
                    computer = Computer.query.get(computer_id)
                    if computer:
                        computer.status = 'Khởi động'
                        db.session.commit()
                    return jsonify({'success': True, 'message': 'Restart command sent'})
            except:
                time.sleep(1)
        return jsonify({'success': False, 'message': 'Failed after 3 attempts'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/remote/screenshot/<int:computer_id>', methods=['GET'])
def remote_screenshot(computer_id):
    try:
        logger.info(f"Request remote screenshot for computer {computer_id}")
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'success': False, 'message': 'Client not registered'}), 404
        
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/screenshot"
        logger.info(f"Forwarding screenshot request to client {client_info['ip']}:{client_info['port']}")
        response = requests.get(url, timeout=20)
        if response.status_code == 200 and response.content:
            logger.info(f"Received screenshot {len(response.content)} bytes from client {computer_id}")
            # Tạo response với cache headers
            img_response = send_file(io.BytesIO(response.content), mimetype='image/jpeg', as_attachment=False, download_name=f'screenshot_{computer_id}.jpg')
            # Set cache headers để browser không cache cũ
            img_response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            img_response.headers['Pragma'] = 'no-cache'
            img_response.headers['Expires'] = '0'
            img_response.headers['Last-Modified'] = datetime.datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
            return img_response
        log_body = response.text if response is not None else 'no response'
        logger.warning(f"Screenshot request failed: status={response.status_code if response is not None else 'N/A'} body={log_body}")
        return jsonify({'success': False, 'message': 'No screenshot', 'detail': log_body}), 502
    except requests.exceptions.Timeout:
        logger.error(f"Timeout getting screenshot from {computer_id}")
        return jsonify({'success': False, 'message': 'Timeout'}), 504
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error for screenshot {computer_id}: {e}")
        return jsonify({'success': False, 'message': f'Cannot connect: {str(e)}'}), 503
    except Exception as e:
        logger.error(f"Screenshot error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/remote/logout/<int:computer_id>', methods=['POST'])
def remote_logout(computer_id):
    try:
        if computer_id not in client_apis:
            return jsonify({'success': False, 'message': 'Client not registered'}), 404
        
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/logout"
        response = requests.post(url, timeout=5)
        
        if response.status_code == 200:
            session_obj = Session.query.filter_by(computer_id=computer_id, logout_time=None).first()
            if session_obj:
                session_obj.logout_time = datetime.datetime.now()
                session_obj.duration = int((session_obj.logout_time - session_obj.login_time).total_seconds())
                computer = Computer.query.get(computer_id)
                if computer:
                    computer.status = 'online'
                db.session.commit()
            return jsonify({'success': True})
        return jsonify({'success': False}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/remote/status/<int:computer_id>', methods=['GET'])
def remote_status(computer_id):
    try:
        if computer_id not in client_apis:
            return jsonify({'online': False, 'message': 'Not registered'})
        
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/status"
        response = requests.get(url, timeout=3)
        
        if response.status_code == 200:
            return response.json()
        return jsonify({'online': False, 'message': f'HTTP {response.status_code}'})
    except Exception as e:
        return jsonify({'online': False, 'message': str(e)})

# ==== Shadow Defender Remote APIs ====
def _sd_forward(computer_id, endpoint, method='POST'):
    """Helper: forward Shadow Defender command to client."""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'success': False, 'message': 'Client chưa kết nối'}), 404
        client_info = client_apis[computer_id]
        url = f"http://{client_info['ip']}:{client_info['port']}/api/shadow_defender/{endpoint}"
        if method == 'GET':
            resp = requests.get(url, timeout=10)
        else:
            resp = requests.post(url, timeout=10, json={})
        try:
            data = resp.json()
        except Exception:
            data = {'success': False, 'message': f'Client trả về HTTP {resp.status_code}'}
        return (jsonify(data), resp.status_code)
    except requests.exceptions.ConnectionError:
        return jsonify({'success': False, 'message': 'Không thể kết nối tới client'}), 503
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'message': 'Client không phản hồi (timeout)'}), 504
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/remote/shadow_defender/drives/<int:computer_id>', methods=['GET'])
def remote_sd_drives(computer_id):
    return _sd_forward(computer_id, 'drives', method='GET')

@app.route('/api/remote/shadow_defender/status/<int:computer_id>', methods=['GET'])
def remote_sd_status(computer_id):
    return _sd_forward(computer_id, 'status', method='GET')

@app.route('/api/remote/shadow_defender/enable/<int:computer_id>', methods=['POST'])
def remote_sd_enable(computer_id):
    return _sd_forward(computer_id, 'enable')

@app.route('/api/remote/shadow_defender/disable/<int:computer_id>', methods=['POST'])
def remote_sd_disable(computer_id):
    return _sd_forward(computer_id, 'disable')

@app.route('/api/remote/shadow_defender/commit/<int:computer_id>', methods=['POST'])
def remote_sd_commit(computer_id):
    return _sd_forward(computer_id, 'commit')

# ==== Debug APIs ====
@app.route('/api/debug/client_apis', methods=['GET'])
def debug_client_apis():
    result = {'registered': len(client_apis), 'clients': []}
    for cid, info in client_apis.items():
        computer = Computer.query.get(cid)
        result['clients'].append({
            'computer_id': cid,
            'name': computer.name if computer else f'PC-{cid}',
            'ip': info['ip'],
            'port': info['port'],
            'status': computer.status if computer else 'Unknown'
        })
    return jsonify(result)

# ==== Web Routes ====
@app.route('/')
def home():
    return redirect(url_for('admin_panel'))

@app.route('/admin')
def admin_panel():
    computers = Computer.query.order_by(Computer.id).all()
    users = User.query.order_by(User.student_id).all()
    client_idle_timeout_seconds = int(get_setting('client_idle_timeout_seconds', 10 * 60))
    
    # Xử lý partial request để làm mới danh sách máy
    if request.args.get('partial') == '1':
        return render_template('computer_management_partial.html', computers=computers, now=datetime.datetime.now(), client_idle_timeout_seconds=client_idle_timeout_seconds)
    
    return render_template('admin.html', computers=computers, users=users, now=datetime.datetime.now(), client_idle_timeout_seconds=client_idle_timeout_seconds)

@app.route('/client')
def client_login():
    return render_template('login.html')

# ==== Advertisement APIs ====
@app.route('/api/client_config', methods=['GET'])
def client_config():
    try:
        timeout_seconds = int(get_setting('client_idle_timeout_seconds', 10 * 60))
        return jsonify({'success': True, 'client_config': {'idle_timeout_seconds': timeout_seconds}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/set_client_idle_timeout', methods=['POST'])
def set_client_idle_timeout():
    data = request.get_json() or {}
    timeout_seconds = data.get('timeout_seconds')
    try:
        timeout_seconds = int(timeout_seconds)
        if timeout_seconds < 30:
            return jsonify({'success': False, 'message': 'Timeout phải lớn hơn hoặc bằng 30 giây'}), 400
        set_setting('client_idle_timeout_seconds', timeout_seconds)
        return jsonify({'success': True, 'client_config': {'idle_timeout_seconds': timeout_seconds}})
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Giá trị timeout không hợp lệ'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/get_advertisement', methods=['GET'])
def get_advertisement():
    ads = Advertisement.query.filter_by(is_active=True).order_by(Advertisement.created_at.desc()).all()
    return jsonify([{'image_url': ad.image_url, 'link': ad.link} for ad in ads])

@app.route('/api/admin/advertisements', methods=['GET', 'POST'])
def admin_advertisements():
    if request.method == 'GET':
        ads = Advertisement.query.order_by(Advertisement.created_at.desc()).all()
        return jsonify([{'id': a.id, 'image_url': a.image_url, 'link': a.link, 'is_active': a.is_active, 'created_at': a.created_at.isoformat() if a.created_at else None} for a in ads])
    
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image'}), 400
        file = request.files['image']
        link = request.form.get('link')
        if not link:
            return jsonify({'success': False, 'message': 'Link required'}), 400
        
        filename = secure_filename(f"{int(time.time())}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        ad = Advertisement(image_url=f"static/uploads/ads/{filename}", link=link, is_active=True)
        db.session.add(ad)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/advertisements/<int:ad_id>', methods=['PUT', 'DELETE'])
def manage_advertisement(ad_id):
    if request.method == 'DELETE':
        try:
            ad = Advertisement.query.get_or_404(ad_id)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], ad.image_url.replace('static/uploads/ads/', ''))
            if os.path.exists(filepath):
                os.remove(filepath)
            db.session.delete(ad)
            db.session.commit()
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500

    try:
        ad = Advertisement.query.get_or_404(ad_id)
        link = None
        image = None

        if request.content_type and request.content_type.startswith('application/json'):
            data = request.get_json(silent=True) or {}
            link = data.get('link')
        else:
            link = request.form.get('link')
            image = request.files.get('image')

        if link is None and (not image or not image.filename):
            return jsonify({'success': False, 'message': 'No update data provided'}), 400

        if link is not None:
            ad.link = link

        if image and image.filename:
            filename = secure_filename(f"{int(time.time())}_{image.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            old_filepath = os.path.join(app.config['UPLOAD_FOLDER'], ad.image_url.replace('static/uploads/ads/', ''))
            if os.path.exists(old_filepath):
                os.remove(old_filepath)

            ad.image_url = f"static/uploads/ads/{filename}"

        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==== Background APIs ====
@app.route('/api/get_backgrounds', methods=['GET'])
def get_backgrounds():
    backgrounds = Background.query.all()
    return jsonify({'backgrounds': [{'filename': b.filename, 'url': url_for('static', filename=f'uploads/backgrounds/{b.filename}', _external=True), 'is_active': b.is_active} for b in backgrounds]})

@app.route('/api/get_active_background', methods=['GET'])
def get_active_background():
    bg = Background.query.filter_by(is_active=True).first()
    if bg:
        # Trả về URL đầy đủ (absolute) để client có thể tải ảnh trực tiếp
        absolute_url = url_for('static', filename=f'uploads/backgrounds/{bg.filename}', _external=True)
        return jsonify({'success': True, 'url': absolute_url})
    return jsonify({'success': False}), 404

@app.route('/api/upload_background', methods=['POST'])
def upload_background():
    if 'background' not in request.files:
        return jsonify({'success': False, 'message': 'No file'}), 400
    file = request.files['background']
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{int(time.time())}_{file.filename}")
        filepath = os.path.join(app.config['BACKGROUND_FOLDER'], filename)
        file.save(filepath)
        new_bg = Background(filename=filename, url=f"static/uploads/backgrounds/{filename}", is_active=False)
        db.session.add(new_bg)
        db.session.commit()
        return jsonify({'success': True, 'url': f"static/uploads/backgrounds/{filename}"})
    return jsonify({'success': False, 'message': 'Invalid file'}), 400

@app.route('/api/delete_background', methods=['POST'])
def delete_background():
    data = request.get_json()
    filename = data.get('filename')
    if not filename:
        return jsonify({'success': False, 'message': 'Filename is required'}), 400
    try:
        bg = Background.query.filter_by(filename=filename).first()
        if not bg:
            return jsonify({'success': False, 'message': 'Background not found'}), 404
        filepath = os.path.join(app.config['BACKGROUND_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(bg)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/set_active_background', methods=['POST'])
def set_active_background():
    data = request.get_json()
    filename = data.get('filename')
    Background.query.update({'is_active': False})
    bg = Background.query.filter_by(filename=filename).first()
    if bg:
        bg.is_active = True
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

# ==== Background Tasks ====
def check_computers_status():
    grace_period = datetime.timedelta(seconds=app.config.get('HEARTBEAT_TIMEOUT', 15) * 6)
    while True:
        try:
            now = datetime.datetime.now()
            timeout = datetime.timedelta(seconds=app.config['HEARTBEAT_TIMEOUT'])
            
            with app.app_context():
                since_start = now - server_start_time
                if since_start < grace_period:
                    time.sleep(app.config['HEARTBEAT_INTERVAL'])
                    continue

                computers = Computer.query.all()
                for computer in computers:
                    if computer.last_active is None:
                        continue
                    
                    active_session = Session.query.filter_by(computer_id=computer.id, logout_time=None).first()
                    time_since = now - computer.last_active
                    
                    if time_since > timeout * 3:
                        computer.status = 'offline'
                        if active_session:
                            active_session.logout_time = computer.last_active
                            active_session.duration = int((active_session.logout_time - active_session.login_time).total_seconds())
                    elif time_since > timeout:
                        computer.status = 'Mất kết nối' if active_session else 'offline'
                    else:
                        computer.status = 'Đang sử dụng' if active_session else 'online'
                
                db.session.commit()
            time.sleep(app.config['HEARTBEAT_INTERVAL'])
        except Exception as e:
            logger.error(f"Status check error: {e}")
            time.sleep(5)

def start_background_tasks():
    status_thread = Thread(target=check_computers_status, daemon=True)
    status_thread.start()

start_background_tasks()

ALL_KHOA_VIEN = [
    "Khoa Công nghệ Cơ khí", "Khoa Công nghệ Thông tin", "Khoa Công nghệ Điện",
    "Khoa Công nghệ Điện tử", "Khoa Công nghệ Động lực", "Khoa Công nghệ Nhiệt - Lạnh",
    "Khoa Công nghệ May - Thời trang", "Khoa Công nghệ Hóa học", "Khoa Ngoại ngữ",
    "Khoa Quản trị Kinh doanh", "Khoa Thương mại - Du lịch", "Khoa Kỹ thuật Xây dựng",
    "Khoa Luật", "Viện Tài chính - Kế toán", "Viện Công nghệ Sinh học và Thực phẩm",
    "Viện Khoa học Công nghệ và Quản lý Môi trường", "Khoa Khoa học Cơ bản"
]

@app.route('/api/report/khoa_vien_range', methods=['GET'])
def report_khoa_vien_range():
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    try:
        from_dt = datetime.datetime.strptime(from_date, '%Y-%m-%d')
        to_dt = datetime.datetime.strptime(to_date, '%Y-%m-%d') + datetime.timedelta(days=1)
        
        results = db.session.query(User.khoa_vien, db.func.count(Session.id)).join(Session, Session.user_id == User.id).filter(Session.login_time >= from_dt, Session.login_time < to_dt).group_by(User.khoa_vien).all()
        result_dict = {r[0]: r[1] for r in results}
        
        report = [{'khoa_vien': khoa, 'so_luot': result_dict.get(khoa, 0)} for khoa in ALL_KHOA_VIEN]
        return jsonify(report)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def open_browser():
    time.sleep(2)
    ip = get_local_ip()
    webbrowser.open_new(f'http://{ip}:5000')

# ============ THÊM CÁC API NÀY VÀO app.py (thêm trước if __name__ == '__main__') ============

@app.route('/api/remote/force_register/<int:computer_id>', methods=['POST'])
def force_register_client(computer_id):
    """Force server to register a client by IP from database"""
    try:
        computer = Computer.query.get(computer_id)
        if not computer:
            return jsonify({'success': False, 'message': 'Computer not found'}), 404
        
        if not computer.ip_address:
            return jsonify({'success': False, 'message': 'Computer has no IP address'}), 404
        
        # Force register
        client_apis[computer.id] = {
            'ip': computer.ip_address,
            'port': computer.api_port or 5001
        }
        
        return jsonify({
            'success': True,
            'message': f'Registered {computer.name} with IP {computer.ip_address}',
            'computer': {
                'id': computer.id,
                'name': computer.name,
                'ip': computer.ip_address,
                'port': computer.api_port
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/remote/shutdown/<int:computer_id>', methods=['POST'])
def remote_shutdown_fixed(computer_id):
    """Improved shutdown with better error handling"""
    try:
        logger.info(f"🔌 SHUTDOWN request for computer {computer_id}")
        
        # Try to get from client_apis first
        client_info = client_apis.get(computer_id)
        
        # If not found, try to get from database
        if not client_info:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_info = {
                    'ip': computer.ip_address,
                    'port': computer.api_port or 5001
                }
                # Cache for next time
                client_apis[computer_id] = client_info
                logger.info(f"📝 Cached client {computer_id} from DB: {client_info}")
            else:
                return jsonify({
                    'success': False,
                    'message': f'Computer {computer_id} not registered',
                    'debug': {
                        'computer_exists': computer is not None,
                        'computer_ip': computer.ip_address if computer else None,
                        'registered_clients': list(client_apis.keys())
                    }
                }), 404
        
        # Send shutdown command with retry
        url = f"http://{client_info['ip']}:{client_info['port']}/api/shutdown"
        logger.info(f"🔌 Sending shutdown to {url}")
        
        for attempt in range(3):
            try:
                response = requests.post(url, timeout=5, json={})
                if response.status_code == 200:
                    computer = Computer.query.get(computer_id)
                    if computer:
                        computer.status = 'Tắt máy'
                        db.session.commit()
                    logger.info(f"✅ Shutdown successful for {computer_id}")
                    return jsonify({'success': True, 'message': 'Shutdown command sent'})
                else:
                    logger.warning(f"Attempt {attempt+1}: HTTP {response.status_code}")
            except requests.exceptions.Timeout:
                logger.warning(f"Attempt {attempt+1}: Timeout")
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Attempt {attempt+1}: Connection error: {e}")
            time.sleep(1)
        
        return jsonify({
            'success': False,
            'message': 'Failed to send shutdown command after 3 attempts',
            'url': url
        }), 500
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/remote/restart/<int:computer_id>', methods=['POST'])
def remote_restart_fixed(computer_id):
    """Improved restart with better error handling"""
    try:
        logger.info(f"🔄 RESTART request for computer {computer_id}")
        
        client_info = client_apis.get(computer_id)
        if not client_info:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_info = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
                client_apis[computer_id] = client_info
            else:
                return jsonify({'success': False, 'message': f'Computer {computer_id} not registered'}), 404
        
        url = f"http://{client_info['ip']}:{client_info['port']}/api/restart"
        logger.info(f"🔄 Sending restart to {url}")
        
        for attempt in range(3):
            try:
                response = requests.post(url, timeout=5, json={})
                if response.status_code == 200:
                    computer = Computer.query.get(computer_id)
                    if computer:
                        computer.status = 'Khởi động'
                        db.session.commit()
                    logger.info(f"✅ Restart successful for {computer_id}")
                    return jsonify({'success': True, 'message': 'Restart command sent'})
            except:
                time.sleep(1)
        
        return jsonify({'success': False, 'message': 'Failed after 3 attempts'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/remote/screenshot/<int:computer_id>', methods=['GET'])
def remote_screenshot_fixed(computer_id):
    """Improved screenshot with better timeout"""
    try:
        logger.info(f"📸 SCREENSHOT request for computer {computer_id}")
        
        client_info = client_apis.get(computer_id)
        if not client_info:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_info = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
                client_apis[computer_id] = client_info
            else:
                return jsonify({'success': False, 'message': 'Client not registered'}), 404
        
        url = f"http://{client_info['ip']}:{client_info['port']}/api/screenshot"
        
        # Shorter timeout for faster response
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200 and response.content:
            logger.info(f"✅ Screenshot received: {len(response.content)} bytes")
            img_response = send_file(
                io.BytesIO(response.content),
                mimetype='image/jpeg',
                as_attachment=False,
                download_name=f'screenshot_{computer_id}.jpg'
            )
            # Set cache headers để browser không cache cũ
            img_response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            img_response.headers['Pragma'] = 'no-cache'
            img_response.headers['Expires'] = '0'
            img_response.headers['Last-Modified'] = datetime.datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
            return img_response
        else:
            return jsonify({'success': False, 'message': 'No screenshot data'}), 502
            
    except requests.exceptions.Timeout:
        logger.error(f"Timeout getting screenshot from {computer_id}")
        return jsonify({'success': False, 'message': 'Timeout - Client did not respond'}), 504
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error: {e}")
        return jsonify({'success': False, 'message': f'Cannot connect: {str(e)}'}), 503
    except Exception as e:
        logger.error(f"Screenshot error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/remote/status/<int:computer_id>', methods=['GET'])
def remote_status_fixed(computer_id):
    """Check if client is online"""
    try:
        client_info = client_apis.get(computer_id)
        if not client_info:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_info = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'online': False, 'message': 'Not registered'})
        
        url = f"http://{client_info['ip']}:{client_info['port']}/api/status"
        response = requests.get(url, timeout=3)
        
        if response.status_code == 200:
            return response.json()
        return jsonify({'online': False, 'message': f'HTTP {response.status_code}'})
    except Exception as e:
        return jsonify({'online': False, 'message': str(e)})


@app.route('/api/remote/broadcast_shutdown', methods=['POST'])
def broadcast_shutdown():
    """Shutdown all online clients"""
    results = {'success': [], 'failed': []}
    
    for computer_id, client_info in list(client_apis.items()):
        try:
            computer = Computer.query.get(computer_id)
            url = f"http://{client_info['ip']}:{client_info['port']}/api/shutdown"
            response = requests.post(url, timeout=3, json={})
            
            if response.status_code == 200:
                results['success'].append(computer_id)
                if computer:
                    computer.status = 'Tắt máy'
            else:
                results['failed'].append(computer_id)
        except Exception as e:
            results['failed'].append(computer_id)
            logger.error(f"Broadcast shutdown failed for {computer_id}: {e}")
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'results': results,
        'total': len(client_apis),
        'success_count': len(results['success']),
        'failed_count': len(results['failed'])
    })


@app.route('/api/debug/check_connection/<int:computer_id>', methods=['GET'])
def debug_check_connection(computer_id):
    """Debug endpoint to test connection to client"""
    try:
        computer = Computer.query.get(computer_id)
        if not computer:
            return jsonify({'success': False, 'message': 'Computer not found'}), 404
        
        result = {
            'computer_id': computer_id,
            'computer_name': computer.name,
            'computer_ip': computer.ip_address,
            'computer_port': computer.api_port,
            'computer_status': computer.status,
            'in_client_apis': computer_id in client_apis,
            'client_apis_info': client_apis.get(computer_id),
            'ping_test': None,
            'port_test': None,
            'api_test': None
        }
        
        # Test ping
        import subprocess
        try:
            ping = subprocess.run(['ping', '-n', '1', '-w', '1000', computer.ip_address], 
                                 capture_output=True, text=True, timeout=3)
            result['ping_test'] = ping.returncode == 0
        except:
            result['ping_test'] = False
        
        # Test port
        if computer.ip_address:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                port_result = sock.connect_ex((computer.ip_address, computer.api_port or 5001))
                sock.close()
                result['port_test'] = port_result == 0
            except:
                result['port_test'] = False
        
        # Test API
        if computer.ip_address and result.get('port_test'):
            try:
                url = f"http://{computer.ip_address}:{computer.api_port or 5001}/api/status"
                response = requests.get(url, timeout=3)
                result['api_test'] = {
                    'success': response.status_code == 200,
                    'status_code': response.status_code,
                    'response': response.json() if response.status_code == 200 else None
                }
            except Exception as e:
                result['api_test'] = {'success': False, 'error': str(e)}
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
# ============ THÊM CÁC ROUTE SAU VÀO app.py ============

@app.route('/admin/shutdown_all', methods=['POST'])
def shutdown_all():
    """Tắt tất cả máy online - gọi trực tiếp tới tất cả client đã đăng ký"""
    errors = []
    success_count = 0
    
    # Tắt tất cả client_apis
    for computer_id, client_info in list(client_apis.items()):
        try:
            computer = Computer.query.get(computer_id)
            if not computer:
                continue
                
            client_url = f"http://{client_info['ip']}:{client_info['port']}/api/shutdown"
            logger.info(f"🔌 [SHUTDOWN_ALL] Gửi shutdown đến {computer.name}")
            
            response = requests.post(client_url, timeout=3, json={})
            if response.status_code == 200:
                computer.status = 'Tắt máy'
                db.session.commit()
                success_count += 1
            else:
                errors.append(computer.name)
        except requests.exceptions.RequestException:
            if computer:
                errors.append(computer.name)
        except Exception:
            if computer:
                errors.append(computer.name)
    
    if success_count > 0:
        flash(f"✓ Đã gửi lệnh tắt thành công đến {success_count} máy", 'success')
    if errors:
        flash(f"❌ Không thể tắt: {', '.join(errors)}", 'error')
    if success_count == 0 and not errors:
        flash("⚠️ Không có máy nào online", 'warning')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/restart_all', methods=['POST'])
def restart_all():
    """Khởi động lại tất cả máy online - gọi trực tiếp tới tất cả client đã đăng ký"""
    errors = []
    success_count = 0
    
    # Khởi động lại tất cả client_apis
    for computer_id, client_info in list(client_apis.items()):
        try:
            computer = Computer.query.get(computer_id)
            if not computer:
                continue
                
            client_url = f"http://{client_info['ip']}:{client_info['port']}/api/restart"
            logger.info(f"🔄 [RESTART_ALL] Gửi restart đến {computer.name}")
            
            response = requests.post(client_url, timeout=3, json={})
            if response.status_code == 200:
                computer.status = 'Khởi động'
                db.session.commit()
                success_count += 1
            else:
                errors.append(computer.name)
        except requests.exceptions.RequestException:
            if computer:
                errors.append(computer.name)
        except Exception:
            if computer:
                errors.append(computer.name)
    
    if success_count > 0:
        flash(f"✓ Đã gửi lệnh khởi động lại thành công đến {success_count} máy", 'success')
    if errors:
        flash(f"❌ Không thể khởi động lại: {', '.join(errors)}", 'error')
    if success_count == 0 and not errors:
        flash("⚠️ Không có máy nào online", 'warning')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/shutdown_online', methods=['POST'])
def shutdown_online():
    """Tắt tất cả máy online - alias cho shutdown_all"""
    return shutdown_all()


@app.route('/admin/restart_online', methods=['POST'])
def restart_online():
    """Khởi động lại tất cả máy online - alias cho restart_all"""
    return restart_all()


@app.route('/admin/shutdown/<int:computer_id>')
def admin_shutdown(computer_id):
    """Tắt máy từ admin panel"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                flash(f'Máy {computer_id} không online hoặc chưa đăng ký', 'error')
                return redirect(url_for('admin_panel'))
        
        client_info = client_apis[computer_id]
        client_url = f"http://{client_info['ip']}:{client_info['port']}/api/shutdown"
        
        response = requests.post(client_url, timeout=5, json={})
        
        if response.status_code == 200:
            computer = Computer.query.get(computer_id)
            if computer:
                computer.status = 'Tắt máy'
                db.session.commit()
            flash(f'✓ Đã gửi lệnh tắt máy thành công', 'success')
        else:
            flash('❌ Không thể gửi lệnh tắt máy - client không phản hồi', 'error')
    except requests.exceptions.RequestException as e:
        flash(f'❌ Không thể kết nối đến client: {str(e)}', 'error')
    except Exception as e:
        flash(f'❌ Lỗi: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/restart/<int:computer_id>')
def admin_restart(computer_id):
    """Khởi động lại máy từ admin panel"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                flash(f'Máy {computer_id} không online hoặc chưa đăng ký', 'error')
                return redirect(url_for('admin_panel'))
        
        client_info = client_apis[computer_id]
        client_url = f"http://{client_info['ip']}:{client_info['port']}/api/restart"
        
        response = requests.post(client_url, timeout=5, json={})
        
        if response.status_code == 200:
            computer = Computer.query.get(computer_id)
            if computer:
                computer.status = 'Khởi động'
                db.session.commit()
            flash(f'✓ Đã gửi lệnh khởi động lại thành công', 'success')
        else:
            flash('❌ Không thể gửi lệnh khởi động lại - client không phản hồi', 'error')
    except requests.exceptions.RequestException as e:
        flash(f'❌ Không thể kết nối đến client: {str(e)}', 'error')
    except Exception as e:
        flash(f'❌ Lỗi: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/logout/<int:computer_id>')
def admin_logout(computer_id):
    """Đăng xuất user trên client từ admin panel"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                flash('Client chưa đăng ký hoặc offline', 'error')
                return redirect(url_for('admin_panel'))
        
        client_info = client_apis[computer_id]
        client_url = f"http://{client_info['ip']}:{client_info['port']}/api/logout"
        
        response = requests.post(client_url, timeout=5)
        
        if response.status_code == 200:
            active_session = Session.query.filter_by(computer_id=computer_id, logout_time=None).first()
            if active_session:
                now = datetime.datetime.now()
                active_session.logout_time = now
                active_session.duration = int((now - active_session.login_time).total_seconds())
                computer = Computer.query.get(computer_id)
                if computer:
                    computer.status = 'online'
                db.session.commit()
            flash('Đã gửi lệnh đăng xuất tới client!', 'success')
        else:
            flash('Không thể gửi lệnh đăng xuất tới client', 'error')
    except Exception as e:
        flash(f'Lỗi khi gửi lệnh đăng xuất: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/remote_login/<int:computer_id>')
def admin_remote_login(computer_id):
    """Đăng nhập từ xa vào client từ admin panel"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                flash('Client chưa đăng ký hoặc offline', 'error')
                return redirect(url_for('admin_panel'))

        student_id = request.args.get('student_id', 'admin')
        client_info = client_apis[computer_id]
        client_url = f"http://{client_info['ip']}:{client_info['port']}/api/remote_login"

        response = requests.post(client_url, timeout=10, json={'student_id': student_id})

        if response.status_code == 200 and response.json().get('success'):
            flash(f'Đã gửi lệnh đăng nhập từ xa tới client với tài khoản {student_id}!', 'success')
        else:
            message = response.json().get('message', 'Không thể gửi lệnh đăng nhập từ xa tới client')
            flash(f'Không thể đăng nhập từ xa: {message}', 'error')
    except Exception as e:
        flash(f'Lỗi khi gửi lệnh đăng nhập từ xa: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


@app.route('/admin/screenshot/<int:computer_id>')
def admin_screenshot(computer_id):
    """Xem screenshot từ admin panel"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                flash('Client chưa đăng ký hoặc offline', 'error')
                return redirect(url_for('admin_panel'))
        
        client_info = client_apis[computer_id]
        screenshot_url = f"http://{client_info['ip']}:{client_info['port']}/api/screenshot"
        
        response = requests.get(screenshot_url, timeout=15)
        
        if response.status_code == 200 and response.content:
            return send_file(
                io.BytesIO(response.content),
                mimetype='image/jpeg',
                as_attachment=False,
                download_name=f'screenshot_{computer_id}.jpg'
            )
        else:
            flash('Không thể lấy screenshot từ client', 'error')
            return redirect(url_for('admin_panel'))
            
    except requests.exceptions.Timeout:
        flash('Timeout - client không phản hồi', 'error')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


# Thêm API endpoint cho screenshot (GET)
@app.route('/get_screenshot/<int:computer_id>')
def get_screenshot(computer_id):
    """Lấy screenshot từ client (API endpoint)"""
    return admin_screenshot(computer_id)


# Thêm API endpoint cho upload screenshot
@app.route('/upload_screenshot', methods=['POST'])
def upload_screenshot():
    """Client upload screenshot lên server"""
    try:
        computer_id = request.form.get('computer_id')
        file = request.files.get('screenshot')
        
        if not computer_id or not file:
            return jsonify({'success': False, 'message': 'Missing data'}), 400
        
        # Lưu screenshot vào memory hoặc disk
        if not hasattr(app, 'latest_screenshots'):
            app.latest_screenshots = {}
        
        app.latest_screenshots[computer_id] = file.read()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ============ THÊM CÁC ROUTE IMPORT/EXPORT USERS ============

@app.route('/admin/import_users', methods=['GET', 'POST'])
def import_users():
    """Import users from Excel file"""
    if request.method == 'POST':
        file = request.files.get('file')
        if not file:
            flash('Vui lòng chọn file Excel!', 'error')
            return redirect(url_for('admin_panel') + '#import-users')
        file_bytes = file.read()
        return redirect(url_for('admin_panel') + '#import-users')

    # GET request - hiển thị form import
    return render_template('import_users.html')


@app.route('/admin/import_users_stream', methods=['POST'])
def import_users_stream():
    """Stream import progress về browser - hỗ trợ file lớn không bị timeout"""
    from flask import Response, stream_with_context
    import io
    from psycopg2.extras import execute_values
    import psycopg2

    file = request.files.get('file')
    if not file:
        return Response('data: {"error": "Không có file"}\'\n\'\n', mimetype='text/event-stream')

    file_bytes = file.read()

    def generate():
        try:
            # Đọc Excel
            yield 'data: {"status":"reading","msg":"Đang đọc file Excel..."}\n\n'
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace('-', '_')

            total = len(df)
            yield f'data: {{"status":"reading","msg":"Đọc được {total:,} dòng"}}\n\n'

            required_columns = ['student_id', 'name', 'class_name', 'khoa_vien', 'password']
            missing = [c for c in required_columns if c not in df.columns]
            if missing:
                yield f'data: {{"status":"error","msg":"Thiếu cột: {", ".join(missing)}"}}\n\n'
                return

            # Kết nối PostgreSQL trực tiếp (psycopg2) để dùng execute_values nhanh hơn
            db_uri = app.config['SQLALCHEMY_DATABASE_URI']
            # parse URI: postgresql+psycopg2://user:pass@host:port/dbname
            import re
            m = re.match(r'postgresql\+psycopg2://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_uri)
            if m:
                db_user, db_pass, db_host, db_port, db_name = m.groups()
            else:
                yield 'data: {"status":"error","msg":"Không parse được DB URI"}\n\n'
                return

            conn = psycopg2.connect(
                host=db_host, port=int(db_port),
                dbname=db_name, user=db_user, password=db_pass,
                options="-c client_encoding=UTF8"
            )
            cur = conn.cursor()

            yield 'data: {"status":"checking","msg":"Kiểm tra dữ liệu đã có..."}\n\n'
            cur.execute('SELECT student_id FROM "user"')
            existing_ids = set(row[0] for row in cur.fetchall())
            yield f'data: {{"status":"checking","msg":"DB hiện có {len(existing_ids):,} user"}}\n\n'

            BATCH_SIZE = 500
            batch = []
            success_count = 0
            skip_count = 0
            error_count = 0
            errors = []
            now = datetime.datetime.now()

            for idx, row in df.iterrows():
                try:
                    student_id = str(row['student_id']).strip()
                    password   = str(row['password']).strip()
                    name       = str(row['name']).strip()
                    class_name = str(row['class_name']).strip()
                    khoa_vien  = str(row['khoa_vien']).strip() if pd.notna(row['khoa_vien']) else ''

                    if not student_id or student_id.lower() in ('nan', 'none', ''):
                        skip_count += 1
                        continue
                    if student_id in existing_ids:
                        skip_count += 1
                        continue
                    if len(password) < 6:
                        error_count += 1
                        errors.append(f'Dòng {idx+2}: {student_id} mật khẩu < 6 ký tự')
                        continue

                    batch.append((student_id, name, class_name, khoa_vien,
                                  'plain:' + password, password, now))
                    existing_ids.add(student_id)
                    success_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f'Dòng {idx+2}: {str(e)}')

                # Flush mỗi BATCH_SIZE dòng và gửi progress
                if len(batch) >= BATCH_SIZE:
                    execute_values(cur,
                        'INSERT INTO "user" (student_id,name,class_name,khoa_vien,password_hash,plain_password,created_at) VALUES %s ON CONFLICT (student_id) DO NOTHING',
                        batch, page_size=BATCH_SIZE)
                    conn.commit()
                    batch.clear()
                    pct = int((idx + 1) / total * 100)
                    yield f'data: {{"status":"progress","current":{success_count},"total":{total},"pct":{pct},"skip":{skip_count},"err":{error_count}}}\n\n'

            # Flush phần còn lại
            if batch:
                execute_values(cur,
                    'INSERT INTO "user" (student_id,name,class_name,khoa_vien,password_hash,plain_password,created_at) VALUES %s ON CONFLICT (student_id) DO NOTHING',
                    batch, page_size=BATCH_SIZE)
                conn.commit()

            cur.close()
            conn.close()

            err_preview = ' | '.join(errors[:5])
            yield f'data: {{"status":"done","success":{success_count},"skip":{skip_count},"error":{error_count},"errors":"{err_preview}"}}\n\n'

        except Exception as e:
            yield f'data: {{"status":"error","msg":"{str(e).replace(chr(34), chr(39))}"}}\n\n'

    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'X-Accel-Buffering': 'no', 'Cache-Control': 'no-cache'})


@app.route('/admin/export_users_excel')
def export_users_excel():
    """Export all users to Excel file"""
    if not OPENPYXL_AVAILABLE:
        return "Excel export not available - openpyxl not installed", 503
    
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Users"
        
        # Header
        headers = ["student_id", "name", "class_name", "khoa_vien", "password"]
        ws.append(headers)
        
        # Format header
        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal='center')
        
        # Data
        users = User.query.all()
        for user in users:
            ws.append([
                user.student_id,
                user.name,
                user.class_name or '',
                user.khoa_vien or '',
                ''  # Không export password để bảo mật
            ])
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 30)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Export file
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return send_file(
            output,
            download_name=f"users_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        flash(f'Lỗi export: {str(e)}', 'error')
        return redirect(url_for('admin_panel'))


@app.route('/admin/export_users_template')
def export_users_template():
    """Download template Excel file for importing users"""
    if not OPENPYXL_AVAILABLE:
        return "Excel export not available - openpyxl not installed", 503
    
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "UsersTemplate"
        
        # Header
        headers = ["student_id", "name", "class_name", "khoa_vien", "password"]
        ws.append(headers)
        
        # Format header
        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal='center')
        
        # Example data
        example_data = [
            ["20123456", "Nguyễn Văn A", "DHTH17A", "Khoa Công nghệ Thông tin", "12345678"],
            ["20123457", "Trần Thị B", "DHTH17B", "Khoa Công nghệ Thông tin", "12345678"],
            ["20123458", "Lê Văn C", "DHKT18A", "Khoa Công nghệ Cơ khí", "12345678"],
        ]
        
        for row_data in example_data:
            ws.append(row_data)
        
        # Add instruction comment
        ws['G1'] = "Hướng dẫn:"
        ws['G2'] = "- student_id: Mã số sinh viên (bắt buộc, duy nhất)"
        ws['G3'] = "- name: Họ tên đầy đủ (bắt buộc)"
        ws['G4'] = "- class_name: Tên lớp (bắt buộc)"
        ws['G5'] = "- khoa_vien: Tên khoa/viện (bắt buộc)"
        ws['G6'] = "- password: Mật khẩu (bắt buộc, tối thiểu 8 ký tự)"
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 25)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Export file
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return send_file(
            output,
            download_name="users_import_template.xlsx",
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        flash(f'Lỗi tạo template: {str(e)}', 'error')
        return redirect(url_for('admin_panel'))


# Thêm route để xóa user
@app.route('/admin/delete_user/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    """Delete a user"""
    try:
        user = User.query.get(user_id)
        if not user:
            flash('Không tìm thấy người dùng!', 'error')
            return redirect(url_for('admin_panel'))
        
        # Xóa sessions trước
        Session.query.filter_by(user_id=user.id).delete()
        
        # Xóa user
        db.session.delete(user)
        db.session.commit()
        
        # Xóa từ Firebase nếu có
        if FIREBASE_AVAILABLE and firebase_admin._apps:
            try:
                ref = firebase_db.reference(f'users/{user.student_id}')
                ref.delete()
            except:
                pass
        
        flash(f'✓ Đã xóa người dùng {user.student_id} - {user.name}', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi khi xóa: {str(e)}', 'error')
    
    return redirect(url_for('admin_panel'))


# Thêm route để cập nhật user
@app.route('/admin/update_user/<int:user_id>', methods=['POST'])
def update_user(user_id):
    """Update user information"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'student_id' in data:
            user.student_id = data['student_id']
        if 'name' in data:
            user.name = data['name']
        if 'class_name' in data:
            user.class_name = data['class_name']
        if 'khoa_vien' in data:
            user.khoa_vien = data['khoa_vien']
        if 'password' in data and data['password']:
            if len(data['password']) >= 8:
                user.set_password(data['password'])
                user.plain_password = data['password']
            else:
                return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        
        db.session.commit()
        
        # Sync to Firebase
        sync_user_to_firebase(user)
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# API để lấy danh sách users (có thể đã có, nhưng đảm bảo tồn tại)
@app.route('/api/users/list', methods=['GET'])
def api_users_list():
    """Get list of users for admin panel"""
    search = request.args.get('search', '').strip()
    query = User.query
    
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.student_id.ilike(like),
                User.name.ilike(like),
                User.class_name.ilike(like),
                User.khoa_vien.ilike(like)
            )
        )
    
    users = query.order_by(User.id.desc()).all()
    
    return jsonify({
        'success': True,
        'users': [{
            'id': u.id,
            'student_id': u.student_id,
            'name': u.name,
            'class_name': u.class_name,
            'khoa_vien': u.khoa_vien or '',
            'created_at': u.created_at.isoformat() if u.created_at else None
        } for u in users],
        'total': len(users)
    })


@app.route('/admin/users', methods=['GET'])
def admin_users():
    """Get list of users for admin panel user management page"""
    search = request.args.get('search', '').strip()
    query = User.query
    
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.student_id.ilike(like),
                User.name.ilike(like),
                User.class_name.ilike(like),
                User.khoa_vien.ilike(like)
            )
        )
    
    users = query.order_by(User.id.desc()).all()
    
    return jsonify({
        'users': [{
            'id': u.id,
            'student_id': u.student_id,
            'name': u.name,
            'class_name': u.class_name,
            'khoa_vien': u.khoa_vien or '',
            'created_at': u.created_at.isoformat() if u.created_at else None
        } for u in users],
        'total': len(users)
    })

@app.route('/admin/add_user', methods=['POST'])
def add_user():
    """Add a new user from admin panel"""
    try:
        data = request.get_json()
        student_id = data.get('student_id', '').strip()
        name = data.get('name', '').strip()
        class_name = data.get('class_name', '').strip()
        khoa_vien = data.get('khoa_vien', '').strip()
        password = data.get('password', '').strip()
        
        if not student_id or not name or not password:
            return jsonify({'success': False, 'message': 'Mã SV, Họ tên và Mật khẩu là bắt buộc'}), 400
        
        if User.query.filter_by(student_id=student_id).first():
            return jsonify({'success': False, 'message': 'Mã sinh viên đã tồn tại'}), 400
        
        if len(password) < 8:
            return jsonify({'success': False, 'message': 'Mật khẩu phải có ít nhất 8 ký tự'}), 400
        
        user = User(student_id=student_id, name=name, class_name=class_name, khoa_vien=khoa_vien)
        user.set_password(password)
        user.plain_password = password
        
        db.session.add(user)
        db.session.commit()
        
        sync_user_to_firebase(user)
        
        return jsonify({'success': True, 'message': 'Tài khoản được thêm thành công', 'user_id': user.id})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add user error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user_api(user_id):
    """Update user via API (for admin panel user management)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'Tài khoản không tồn tại'}), 404
        
        data = request.get_json()
        
        if 'student_id' in data:
            user.student_id = data['student_id']
        if 'name' in data:
            user.name = data['name']
        if 'class_name' in data:
            user.class_name = data['class_name']
        if 'khoa_vien' in data:
            user.khoa_vien = data['khoa_vien']
        if 'password' in data and data['password']:
            if len(data['password']) >= 8:
                user.set_password(data['password'])
                user.plain_password = data['password']
            else:
                return jsonify({'success': False, 'message': 'Mật khẩu phải có ít nhất 8 ký tự'}), 400
        
        db.session.commit()
        sync_user_to_firebase(user)
        
        return jsonify({'success': True, 'message': 'Cập nhật thành công'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update user error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user_api(user_id):
    """Delete user via API (for admin panel user management)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'Tài khoản không tồn tại'}), 404
        
        Session.query.filter_by(user_id=user_id).delete()
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Xóa thành công'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete user error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/send_notification/<int:computer_id>', methods=['POST'])
def send_notification_to_computer(computer_id):
    """Send notification to a specific computer"""
    try:
        if computer_id not in client_apis:
            computer = Computer.query.get(computer_id)
            if computer and computer.ip_address:
                client_apis[computer_id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
            else:
                return jsonify({'success': False, 'message': 'Client chưa đăng ký hoặc offline'}), 404
        
        data = request.get_json()
        title = data.get('title', 'Thông báo từ quản lý')
        message = data.get('message', '')
        notification_type = data.get('type', 'info')
        
        client_info = client_apis[computer_id]
        notify_url = f"http://{client_info['ip']}:{client_info['port']}/api/notification"
        
        response = requests.post(
            notify_url,
            json={
                'title': title,
                'message': message,
                'type': notification_type
            },
            timeout=5
        )
        
        if response.status_code == 200:
            logger.info(f"Notification sent to computer {computer_id}")
            return jsonify({'success': True, 'message': 'Gửi thông báo thành công'})
        else:
            logger.error(f"Failed to send notification to {computer_id}: {response.status_code}")
            return jsonify({'success': False, 'message': f'Không thể gửi thông báo (lỗi {response.status_code})'}), 502
            
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'message': 'Hết thời gian chờ - client không phản hồi'}), 502
    except Exception as e:
        logger.error(f"Notification error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/broadcast_notification', methods=['POST'])
def broadcast_notification():
    """Broadcast notification to all online computers"""
    try:
        data = request.get_json()
        title = data.get('title', 'Thông báo từ quản lý')
        message = data.get('message', '')
        notification_type = data.get('type', 'info')
        
        # Get all online computers
        computers = Computer.query.filter_by(status='Đang sử dụng').all()
        
        results = {'success': 0, 'failed': 0, 'errors': []}
        
        for computer in computers:
            try:
                if computer.id not in client_apis and computer.ip_address:
                    client_apis[computer.id] = {'ip': computer.ip_address, 'port': computer.api_port or 5001}
                
                if computer.id in client_apis:
                    client_info = client_apis[computer.id]
                    notify_url = f"http://{client_info['ip']}:{client_info['port']}/api/notification"
                    
                    response = requests.post(
                        notify_url,
                        json={
                            'title': title,
                            'message': message,
                            'type': notification_type
                        },
                        timeout=3
                    )
                    
                    if response.status_code == 200:
                        results['success'] += 1
                        logger.info(f"Broadcast notification sent to {computer.name}")
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"{computer.name}: HTTP {response.status_code}")
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"{computer.name}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Gửi thành công: {results["success"]}, Thất bại: {results["failed"]}',
            'details': results
        })
    except Exception as e:
        logger.error(f"Broadcast notification error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Route để render trang import_users.html (nếu chưa có)
@app.route('/admin/import_users_page')
def import_users_page():
    """Render import users page"""
    return render_template('import_users.html')


def run_bulk_firebase_sync():
    global firebase_sync_status
    with app.app_context():
        firebase_sync_status.update({
            'running': True,
            'total': 0,
            'synced': 0,
            'failed': 0,
            'started_at': datetime.datetime.now(),
            'completed_at': None,
            'message': ''
        })

        try:
            if not FIREBASE_AVAILABLE:
                raise RuntimeError('Firebase library chưa được cài đặt')
            if not firebase_admin._apps and not initialize_firebase():
                raise RuntimeError('Firebase chưa được khởi tạo. Kiểm tra firebase_key.json và cấu hình')

            users = User.query.order_by(User.id).all()
            total = len(users)
            firebase_sync_status['total'] = total

            batch_size = 100
            for i in range(0, total, batch_size):
                batch = users[i:i + batch_size]
                for user in batch:
                    try:
                        sync_user_to_firebase(user)
                        firebase_sync_status['synced'] += 1
                    except Exception as e:
                        firebase_sync_status['failed'] += 1
                        logger.error(f"Lỗi đồng bộ user {user.student_id}: {e}")
                time.sleep(0.5)

            firebase_sync_status['message'] = f"Hoàn tất: {firebase_sync_status['synced']}/{total} users"
        except Exception as e:
            firebase_sync_status['message'] = str(e)
            logger.error(f"Firebase bulk sync error: {e}")
        finally:
            firebase_sync_status['running'] = False
            firebase_sync_status['completed_at'] = datetime.datetime.now()


@app.route('/admin/sync_all_users_to_firebase', methods=['POST'])
def sync_all_users_to_firebase():
    """Bắt đầu đồng bộ tất cả user hiện có từ PostgreSQL lên Firebase trong background"""
    if firebase_sync_status['running']:
        return jsonify({'success': False, 'message': 'Đang có tiến trình đồng bộ Firebase đang chạy. Vui lòng đợi hoàn thành.'}), 409

    if not FIREBASE_AVAILABLE and not initialize_firebase():
        return jsonify({'success': False, 'message': 'Firebase chưa được khởi tạo. Kiểm tra firebase_key.json và cấu hình'}), 500

    thread = Thread(target=run_bulk_firebase_sync, daemon=True)
    thread.start()
    return jsonify({'success': True, 'message': 'Đã bắt đầu đồng bộ trong nền. Bạn có thể tiếp tục sử dụng phần quản lý.', 'status_url': url_for('firebase_sync_status_api')})


@app.route('/admin/firebase_sync_status', methods=['GET'])
def firebase_sync_status_api():
    status = firebase_sync_status.copy()
    if status['started_at']:
        status['started_at'] = status['started_at'].isoformat()
    if status['completed_at']:
        status['completed_at'] = status['completed_at'].isoformat()
    return jsonify(status)


def hide_console():
    """Ẩn cửa sổ terminal khi chạy dưới dạng exe."""
    if os.name == 'nt':
        import ctypes
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)

def set_server_autostart(enable=True):
    """Đăng ký / gỡ server khỏi Windows startup (Task Scheduler, fallback Registry)."""
    if os.name != 'nt':
        return
    try:
        task_name = "DPT-Server-Startup"
        if getattr(sys, 'frozen', False):
            exe_path = sys.executable
        else:
            exe_path = os.path.abspath(__file__)

        if enable:
            subprocess.run(
                ['schtasks', '/Delete', '/TN', task_name, '/F'],
                capture_output=True, timeout=10
            )
            result = subprocess.run(
                ['schtasks', '/Create', '/TN', task_name,
                 '/TR', f'"{exe_path}"',
                 '/SC', 'ONLOGON', '/RL', 'HIGHEST', '/F'],
                capture_output=True, timeout=10
            )
            if result.returncode == 0:
                logger.info(f"Task Scheduler: {task_name} registered successfully")
                return
            else:
                logger.warning("Task Scheduler failed, falling back to Registry")
        else:
            subprocess.run(
                ['schtasks', '/Delete', '/TN', task_name, '/F'],
                capture_output=True, timeout=10
            )
    except Exception as e:
        logger.warning(f"Task Scheduler error: {e}, falling back to Registry")

    try:
        import winreg
        app_name = "DPT-Server"
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        if getattr(sys, 'frozen', False):
            exe_path = sys.executable
        else:
            exe_path = os.path.abspath(__file__)
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enable:
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{exe_path}"')
        else:
            try:
                winreg.DeleteValue(key, app_name)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        logger.error(f"Registry autostart error: {e}")

# server watchdog removed: restart should be handled externally if needed

def run_tray_icon():
    """System tray icon với menu Mở Web / Khởi động lại / Thoát."""
    try:
        import pystray
        from PIL import Image, ImageDraw

        # Tạo icon xanh đơn giản nếu không có file icon
        img = Image.new('RGB', (64, 64), color='#1a73e8')
        draw = ImageDraw.Draw(img)
        draw.ellipse([8, 8, 56, 56], fill='white')
        draw.text((22, 18), 'D', fill='#1a73e8')

        def on_open(icon, item):
            ip = get_local_ip()
            webbrowser.open(f'http://{ip}:5000')

        def on_quit(icon, item):
            # No watchdog cleanup required (watchdog removed)
            icon.stop()
            os._exit(0)

        menu = pystray.Menu(
            pystray.MenuItem('Mở trang quản lý', on_open, default=True),
            pystray.MenuItem('Thoát server', on_quit),
        )
        icon = pystray.Icon('DPT-Server', img, 'DPT Lab Server đang chạy', menu)
        icon.run()
    except Exception as e:
        logger.error(f"Tray error: {e}")

if __name__ == '__main__':
    # Tắt log werkzeug rác
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    os.environ['WERKZEUG_RUN_MAIN'] = 'false'

    # Ẩn terminal
    hide_console()

    # Đăng ký tự khởi động cùng Windows
    set_server_autostart(True)

    # Server watchdog disabled (restart should be handled externally)

    # Mở trình duyệt sau 2 giây
    Thread(target=open_browser, daemon=True).start()

    # Chạy Flask trong thread riêng
    flask_thread = Thread(
        target=lambda: app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True),
        daemon=True
    )
    flask_thread.start()

    # System tray (blocking - giữ process sống)
    run_tray_icon()