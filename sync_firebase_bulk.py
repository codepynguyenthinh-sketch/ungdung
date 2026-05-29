#!/usr/bin/env python3
import os
import sys
import time
import logging
from urllib.parse import urlparse, unquote

try:
    import psycopg2
except ImportError:
    print('Missing dependency: psycopg2. Cài bằng pip install psycopg2-binary')
    sys.exit(1)

try:
    import firebase_admin
    from firebase_admin import credentials, db
except ImportError:
    print('Missing dependency: firebase-admin. Cài bằng pip install firebase-admin')
    sys.exit(1)

DEFAULT_DB_URI = os.environ.get('DATABASE_URL', 'postgresql+psycopg2://DPTIUH:libiuh2025@localhost:5432/lab_manager')
DEFAULT_FIREBASE_KEY = os.environ.get('FIREBASE_KEY_PATH', os.path.join(os.path.dirname(__file__), 'firebase_key.json'))
DEFAULT_FIREBASE_URL = os.environ.get('FIREBASE_URL', 'https://login-iuh-default-rtdb.firebaseio.com/')

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)


def parse_db_uri(db_uri):
    if db_uri.startswith('postgresql+psycopg2://'):
        db_uri = db_uri.replace('postgresql+psycopg2://', 'postgresql://', 1)

    parsed = urlparse(db_uri)
    if not parsed.scheme.startswith('postgresql'):
        raise ValueError(f'Unsupported DB URI: {db_uri}')

    username = unquote(parsed.username) if parsed.username else None
    password = unquote(parsed.password) if parsed.password else None
    host = parsed.hostname or 'localhost'
    port = parsed.port or 5432
    dbname = parsed.path.lstrip('/')
    return username, password, host, port, dbname


def init_firebase(firebase_key_path, firebase_url):
    if not os.path.exists(firebase_key_path):
        raise FileNotFoundError(f'Firebase key not found: {firebase_key_path}')

    if firebase_admin._apps:
        logger.info('Firebase already initialized')
        return

    cred = credentials.Certificate(firebase_key_path)
    firebase_admin.initialize_app(cred, {'databaseURL': firebase_url})
    logger.info('Firebase initialized successfully')


def load_users_from_db(conn):
    with conn.cursor() as cur:
        cur.execute('SELECT id, student_id, name, class_name, khoa_vien, plain_password, created_at FROM "user" ORDER BY id')
        return cur.fetchall()


def build_payload(rows):
    payload = {}
    for idx, row in enumerate(rows, start=1):
        user_id, student_id, name, class_name, khoa_vien, plain_password, created_at = row
        if not student_id:
            continue
        payload[f'users/{student_id}'] = {
            'id': user_id,
            'student_id': student_id,
            'name': name or '',
            'class_name': class_name or '',
            'khoa_vien': khoa_vien or '',
            'plain_password': plain_password or '',
            'created_at': created_at.isoformat() if created_at else None,
        }
    return payload


def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]


def sync_batch(batch_rows, root_ref):
    payload = build_payload(batch_rows)
    if not payload:
        return 0
    root_ref.update(payload)
    return len(payload)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Bulk sync users from PostgreSQL to Firebase RTDB')
    parser.add_argument('--db-uri', default=DEFAULT_DB_URI, help='PostgreSQL URI')
    parser.add_argument('--firebase-key', default=DEFAULT_FIREBASE_KEY, help='Firebase service account JSON path')
    parser.add_argument('--firebase-url', default=DEFAULT_FIREBASE_URL, help='Firebase RTDB URL')
    parser.add_argument('--batch-size', type=int, default=500, help='Số lượng user đẩy mỗi lần')
    parser.add_argument('--sleep', type=float, default=0.5, help='Thời gian nghỉ giữa mỗi batch (giây)')
    parser.add_argument('--limit', type=int, default=0, help='Giới hạn số user đồng bộ (0 = tất cả)')
    args = parser.parse_args()

    logger.info('Starting Firebase bulk sync')
    logger.info(f'Connecting to DB: {args.db_uri}')
    logger.info(f'Using Firebase key: {args.firebase_key}')
    logger.info(f'Firebase URL: {args.firebase_url}')

    username, password, host, port, dbname = parse_db_uri(args.db_uri)
    if not username or not password or not dbname:
        raise ValueError('DB URI thiếu thông tin username/password/dbname')

    init_firebase(args.firebase_key, args.firebase_url)

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=username,
        password=password,
        options='-c client_encoding=UTF8'
    )

    try:
        rows = load_users_from_db(conn)
        if args.limit > 0:
            rows = rows[:args.limit]

        total = len(rows)
        logger.info(f'Loaded {total:,} users from PostgreSQL')

        root_ref = db.reference('/')
        synced = 0
        failed = 0

        for batch in chunked(rows, args.batch_size):
            try:
                count = sync_batch(batch, root_ref)
                synced += count
            except Exception as e:
                logger.error(f'Batch sync failed: {e}')
                # Nếu update batch lỗi, đẩy từng user để xác định user gây lỗi
                for row in batch:
                    try:
                        single_payload = build_payload([row])
                        root_ref.update(single_payload)
                        synced += 1
                    except Exception as inner:
                        failed += 1
                        logger.error(f'  Failed user {row[1]}: {inner}')

            logger.info(f'Synced {synced:,}/{total:,} users so far')
            if args.sleep > 0:
                time.sleep(args.sleep)

        logger.info('Bulk sync complete')
        logger.info(f'Total synced: {synced:,}, failed: {failed:,}')
    finally:
        conn.close()


if __name__ == '__main__':
    main()
