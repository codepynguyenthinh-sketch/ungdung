#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script import Excel -> PostgreSQL trực tiếp
Dùng: python3 import_excel.py <file.xlsx>
"""

import sys
import os

# ============================================================
#  CẤU HÌNH - chỉnh nếu cần
# ============================================================
DB_HOST     = "localhost"
DB_PORT     = 5432
DB_NAME     = "lab_manager"
DB_USER     = "DPTIUH"
DB_PASS     = "libiuh2025"

BATCH_SIZE  = 500        # số dòng insert mỗi lần
MIN_PASS_LEN = 6         # độ dài mật khẩu tối thiểu
# ============================================================

def check_deps():
    missing = []
    for pkg in ["pandas", "openpyxl", "psycopg2", "werkzeug"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"❌ Thiếu thư viện: {', '.join(missing)}")
        print(f"   Chạy: pip install {' '.join(missing)}")
        sys.exit(1)

check_deps()

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

# ─── Màu terminal ──────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def info(msg):    print(f"{CYAN}ℹ  {msg}{RESET}")
def success(msg): print(f"{GREEN}✓  {msg}{RESET}")
def warn(msg):    print(f"{YELLOW}⚠  {msg}{RESET}")
def error(msg):   print(f"{RED}✗  {msg}{RESET}")

# ─── Đọc file Excel ────────────────────────────────────────
def read_excel(filepath):
    info(f"Đọc file: {filepath}")
    encodings = ["utf-8", "utf-8-sig", "cp1258", "latin-1"]

    # Thử các engine để xử lý cả .xlsx và .xls
    for engine in [None, "openpyxl", "xlrd"]:
        try:
            kwargs = {"dtype": str}
            if engine:
                kwargs["engine"] = engine
            df = pd.read_excel(filepath, **kwargs)
            break
        except Exception:
            continue
    else:
        error("Không đọc được file Excel. Kiểm tra định dạng .xlsx / .xls")
        sys.exit(1)

    # Normalize tên cột
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r"[\s\-]+", "_", regex=True)
        .str.normalize("NFC")
    )

    success(f"Đọc được {len(df):,} dòng")
    info(f"Các cột: {list(df.columns)}")
    return df

# ─── Kiểm tra cột bắt buộc ─────────────────────────────────
REQUIRED = ["student_id", "name", "class_name", "khoa_vien", "password"]

COL_ALIASES = {
    "student_id":  ["student_id", "ma_sv", "masv", "mssv", "ma_sinh_vien", "id"],
    "name":        ["name", "ho_ten", "hoten", "ten", "full_name", "họ_tên"],
    "class_name":  ["class_name", "lop", "lớp", "class", "ten_lop"],
    "khoa_vien":   ["khoa_vien", "khoa", "vien", "faculty", "khoa_viện"],
    "password":    ["password", "mat_khau", "matkhau", "pass", "mk"],
}

def resolve_columns(df):
    """Map tên cột trong file sang tên chuẩn, hỗ trợ alias."""
    col_map = {}
    for standard, aliases in COL_ALIASES.items():
        for alias in aliases:
            if alias in df.columns:
                col_map[standard] = alias
                break

    missing = [c for c in REQUIRED if c not in col_map]
    if missing:
        error(f"Thiếu cột: {missing}")
        error(f"Cột trong file: {list(df.columns)}")
        error("Đổi tên cột trong Excel thành: student_id, name, class_name, khoa_vien, password")
        sys.exit(1)

    # Rename về tên chuẩn
    rename = {v: k for k, v in col_map.items()}
    df = df.rename(columns=rename)
    return df

# ─── Kết nối PostgreSQL ─────────────────────────────────────
def get_conn():
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT,
            dbname=DB_NAME, user=DB_USER, password=DB_PASS,
            connect_timeout=10,
            options="-c client_encoding=UTF8"
        )
        conn.autocommit = False
        return conn
    except psycopg2.OperationalError as e:
        error(f"Không kết nối được PostgreSQL: {e}")
        sys.exit(1)

# ─── Main import ────────────────────────────────────────────
def import_users(df, conn):
    cur = conn.cursor()

    # Load existing student_ids (1 query)
    info("Kiểm tra dữ liệu đã có trong DB...")
    cur.execute('SELECT student_id FROM "user"')
    existing = set(row[0] for row in cur.fetchall())
    info(f"DB hiện có {len(existing):,} user")

    success_count = 0
    skip_count    = 0
    error_count   = 0
    errors        = []
    batch         = []
    now           = datetime.now()

    total = len(df)
    info(f"Bắt đầu xử lý {total:,} dòng...\n")

    for idx, row in df.iterrows():
        lineno = idx + 2  # dòng Excel (header = 1)

        try:
            student_id = str(row["student_id"]).strip()
            password   = str(row["password"]).strip()
            name       = str(row["name"]).strip()
            class_name = str(row["class_name"]).strip()
            khoa_vien  = str(row["khoa_vien"]).strip() if pd.notna(row["khoa_vien"]) else ""

            # Bỏ qua dòng rỗng
            if not student_id or student_id.lower() in ("nan", "none", ""):
                skip_count += 1
                continue

            # Trùng student_id
            if student_id in existing:
                skip_count += 1
                continue

            # Kiểm tra mật khẩu
            if len(password) < MIN_PASS_LEN:
                error_count += 1
                errors.append(f"Dòng {lineno}: {student_id} - mật khẩu < {MIN_PASS_LEN} ký tự")
                continue

            # Lưu plain password vào cả hai cột (client login dùng plain_password)
            # password_hash dùng prefix "plain:" để phân biệt khi cần
            pwd_hash = "plain:" + password

            batch.append((student_id, name, class_name, khoa_vien, pwd_hash, password, now))
            existing.add(student_id)
            success_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Dòng {lineno}: {e}")

        # Bulk insert mỗi BATCH_SIZE dòng
        if len(batch) >= BATCH_SIZE:
            _flush(cur, batch)
            batch.clear()
            conn.commit()
            pct = success_count / total * 100
            print(f"  {CYAN}→ {success_count:,}/{total:,} ({pct:.0f}%)  bỏ qua: {skip_count}  lỗi: {error_count}{RESET}", end="\r")

    # Flush phần còn lại
    if batch:
        _flush(cur, batch)
        conn.commit()

    cur.close()
    print()  # newline sau progress
    return success_count, skip_count, error_count, errors


def _flush(cur, batch):
    execute_values(
        cur,
        '''INSERT INTO "user" (student_id, name, class_name, khoa_vien, password_hash, plain_password, created_at)
           VALUES %s
           ON CONFLICT (student_id) DO NOTHING''',
        batch,
        page_size=BATCH_SIZE
    )


# ─── Entry point ────────────────────────────────────────────
def main():
    print(f"\n{BOLD}{CYAN}{'='*50}")
    print("   IMPORT EXCEL -> POSTGRESQL")
    print(f"{'='*50}{RESET}\n")

    if len(sys.argv) < 2:
        error("Thiếu đường dẫn file!")
        print(f"  Dùng: python3 import_excel.py <file.xlsx>")
        sys.exit(1)

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        error(f"Không tìm thấy file: {filepath}")
        sys.exit(1)

    # Đọc Excel
    df = read_excel(filepath)
    df = resolve_columns(df)

    # Kết nối DB
    info(f"Kết nối PostgreSQL {DB_HOST}:{DB_PORT}/{DB_NAME}...")
    conn = get_conn()
    success("Kết nối DB thành công")

    # Import
    t_start = datetime.now()
    ok, skipped, errs, err_list = import_users(df, conn)
    elapsed = (datetime.now() - t_start).total_seconds()

    conn.close()

    # Kết quả
    print(f"\n{BOLD}{'─'*50}{RESET}")
    success(f"Import thành công : {ok:,} user")
    if skipped:
        warn(f"Bỏ qua (trùng/rỗng): {skipped:,} dòng")
    if errs:
        error(f"Lỗi              : {errs} dòng")
        for e in err_list[:10]:
            print(f"  {RED}- {e}{RESET}")
        if len(err_list) > 10:
            print(f"  {RED}... và {len(err_list)-10} lỗi khác{RESET}")
    print(f"{CYAN}Thời gian         : {elapsed:.1f}s{RESET}")
    print(f"{BOLD}{'─'*50}{RESET}\n")


if __name__ == "__main__":
    main()