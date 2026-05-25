// ============================================================
// PHONG THI NGHIEM - HE THONG DANG KY MUON THIET BI
// Google Apps Script Web App
// ============================================================

const SHEET_ID = '1LJ77poE_EjQWdKgGBN69s7xOKi7jBbo_R6iI3ZCIIxA';
const SHEET_NAME = 'Đăng ký mượn thiết bị';
const DEVICE_SHEET_NAME = 'Thiết bị & Phòng';

// ============================================================
// MAT KHAU ADMIN CO DINH
// Mat khau hien tai: "admin@2026"
// Cach tao hash moi: chay ham generateHash() trong Apps Script Editor
// ============================================================
const ADMIN_PASSWORD_HASH = 'b9e41d48edab1c1892c605524dfcd6f04730723a7839b03a121234a7f75bc99f';
// Hash tren = SHA256("admin@2026" + "PTN_SALT_2024")

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Đăng Ký Mượn Thiết Bị Phòng Thí Nghiệm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// TIEN ICH PARSE NGAY AN TOAN
// Xu ly ca Date object va chuoi DD/MM/YYYY
// ============================================================

function safeFormatDate(val, format) {
  if (!val) return '';
  try {
    var d;
    if (val instanceof Date && !isNaN(val.getTime())) {
      d = val;
    } else {
      var str = val.toString().trim();
      var parts = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (parts) {
        var rest = str.substring(parts[0].length).trim();
        d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
        if (rest) {
          var timeParts = rest.match(/(\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
          if (timeParts) {
            d.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]), parseInt(timeParts[3] || 0));
          }
        }
      } else {
        d = new Date(val);
      }
    }
    if (isNaN(d.getTime())) return val.toString();
    return Utilities.formatDate(d, Session.getScriptTimeZone(), format);
  } catch (e) {
    return val ? val.toString() : '';
  }
}

// ============================================================
// QUAN LY SHEET THIET BI & PHONG
// ============================================================

function getDeviceList() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) {
      sheet = createDeviceSheet(ss);
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ['Thiết bị khác'];
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const devices = data.map(r => r[0]).filter(v => v && v.toString().trim() !== '');
    if (!devices.includes('Thiết bị khác')) devices.push('Thiết bị khác');
    return devices;
  } catch (e) {
    return [
      'Máy đo pH', 'Kính hiển vi quang học', 'Cân phân tích', 'Máy ly tâm',
      'Tủ sấy', 'Lò nung', 'Máy quang phổ UV-Vis', 'Máy sắc ký HPLC',
      'Tủ hút', 'Máy khuấy từ', 'Bể siêu âm', 'Máy đo độ ẩm',
      'Máy đo nhiệt độ', 'Thiết bị PCR', 'Máy đo quang', 'Autoclave',
      'Tủ lạnh -20°C', 'Tủ lạnh -80°C', 'Máy điện di', 'Bơm chân không',
      'Thiết bị khác'
    ];
  }
}

function getRoomList() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) {
      sheet = createDeviceSheet(ss);
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ['Phòng khác'];
    const data = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    const rooms = data.map(r => r[0]).filter(v => v && v.toString().trim() !== '');
    const unique = [...new Set(rooms)];
    if (!unique.includes('Phòng khác')) unique.push('Phòng khác');
    return unique;
  } catch (e) {
    return ['PTN 101', 'PTN 102', 'PTN 103', 'PTN 201', 'PTN 202', 'PTN 203', 'PTN 301', 'PTN 302', 'Phòng khác'];
  }
}

function getDeviceRoomMap() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) sheet = createDeviceSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return {};
    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    const map = {};
    data.forEach(function(r) {
      const name = r[0] ? r[0].toString().trim() : '';
      const room = r[2] ? r[2].toString().trim() : '';
      if (name) map[name] = room;
    });
    return map;
  } catch (e) {
    return {};
  }
}

function getDeviceListPublic() {
  return getDeviceList();
}

function getRoomListPublic() {
  return getRoomList();
}

function createDeviceSheet(ss) {
  const sheet = ss.insertSheet(DEVICE_SHEET_NAME);

  sheet.getRange(1, 1, 1, 4).setValues([['TÊN THIẾT BỊ', 'VỊ TRÍ THIẾT BỊ', 'PHÒNG SỬ DỤNG', 'GHI CHÚ']]);
  const headerRange = sheet.getRange(1, 1, 1, 4);
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  const defaultDevices = [
    ['Máy đo pH', 'Tủ kính phòng 101', 'PTN 101'],
    ['Kính hiển vi quang học', 'Bàn thí nghiệm A', 'PTN 101'],
    ['Cân phân tích', 'Bàn cân phòng 102', 'PTN 102'],
    ['Máy ly tâm', 'Kệ thiết bị phòng 102', 'PTN 102'],
    ['Tủ sấy', 'Góc phải phòng 103', 'PTN 103'],
    ['Lò nung', 'Bàn chịu nhiệt phòng 103', 'PTN 103'],
    ['Máy quang phổ UV-Vis', 'Bàn quang học phòng 201', 'PTN 201'],
    ['Máy sắc ký HPLC', 'Bàn HPLC phòng 201', 'PTN 201'],
    ['Tủ hút', 'Dọc tường phòng 202', 'PTN 202'],
    ['Máy khuấy từ', 'Bàn thí nghiệm B', 'PTN 202'],
    ['Bể siêu âm', 'Kệ thiết bị phòng 203', 'PTN 203'],
    ['Máy đo độ ẩm', 'Tủ đo lường phòng 203', 'PTN 203'],
    ['Máy đo nhiệt độ', 'Tủ đo lường', 'PTN 301'],
    ['Thiết bị PCR', 'Bàn sinh học phân tử', 'PTN 301'],
    ['Máy đo quang', 'Bàn quang học', 'PTN 302'],
    ['Autoclave', 'Góc khử trùng', 'PTN 302'],
    ['Tủ lạnh -20°C', 'Phòng lạnh', 'PTN 201'],
    ['Tủ lạnh -80°C', 'Phòng lạnh', 'PTN 201'],
    ['Máy điện di', 'Bàn điện di', 'PTN 103'],
    ['Bơm chân không', 'Kệ thiết bị phụ', 'PTN 103'],
  ];

  sheet.getRange(2, 1, defaultDevices.length, 3).setValues(defaultDevices);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 180);

  sheet.getRange(1, 1, defaultDevices.length + 1, 4).setBorder(true, true, true, true, true, true);

  for (let i = 2; i <= defaultDevices.length + 1; i++) {
    if (i % 2 === 0) {
      sheet.getRange(i, 1, 1, 4).setBackground('#f8f9ff');
    }
  }

  return sheet;
}

function getDevicesWithLocation(token) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) sheet = createDeviceSheet(ss);

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, devices: [] };

    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const devices = data
      .filter(r => r[0] && r[0].toString().trim() !== '')
      .map((r, i) => ({
        rowIndex: i + 2,
        name: r[0] || '',
        location: r[1] || '',
        room: r[2] || '',
        notes: r[3] || ''
      }));

    return { success: true, devices };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function addDevice(token, deviceData) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) sheet = createDeviceSheet(ss);

    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;
    sheet.getRange(newRow, 1, 1, 4).setValues([[
      deviceData.name || '',
      deviceData.location || '',
      deviceData.room || '',
      deviceData.notes || ''
    ]]);

    if (newRow % 2 === 0) {
      sheet.getRange(newRow, 1, 1, 4).setBackground('#f8f9ff');
    } else {
      sheet.getRange(newRow, 1, 1, 4).setBackground('#ffffff');
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function updateDevice(token, rowIndex, deviceData) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'Sheet không tồn tại' };

    sheet.getRange(rowIndex, 1, 1, 4).setValues([[
      deviceData.name || '',
      deviceData.location || '',
      deviceData.room || '',
      deviceData.notes || ''
    ]]);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function deleteDevice(token, rowIndex) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(DEVICE_SHEET_NAME);
    if (!sheet) return { success: false, error: 'Sheet không tồn tại' };

    sheet.deleteRow(rowIndex);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// HAM HO TRO RENDER HTML (dung trong template)
// ============================================================

function getDeviceOptionsHtml() {
  return getDeviceList().map(d => `<option value="${d}">${d}</option>`).join('');
}

function getRoomOptionsHtml() {
  return getRoomList().map(r => `<option value="${r}">${r}</option>`).join('');
}

// ============================================================
// SUBMIT FORM & QUAN LY SHEET DANG KY
// ============================================================

function submitForm(formData) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupSheet(sheet);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) setupSheet(sheet);

    const now = new Date();
    const fromDate = formData.fromDate ? new Date(formData.fromDate) : '';
    const toDate = formData.toDate ? new Date(formData.toDate) : '';

    const newRow = [
      now,
      fromDate,
      toDate,
      '',
      '',
      '',
      formData.teacherName || '',
      formData.studentName || '',
      formData.className || '',
      formData.teacherPhone || '',
      formData.studentPhone || '',
      formData.deviceName || '',
      formData.room || '',
      formData.deviceStatus || '',
      formData.purpose || '',
      formData.notes || '',
      formData.email || '',
      formData.studentName2 || '',
      formData.purpose2 || '',
      formData.notes2 || '',
      formData.supervisorName || '',
      '', '', '', '',
    ];

    const targetRow = sheet.getLastRow() + 1;
    sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);

    sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(targetRow, 2).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(targetRow, 3).setNumberFormat('dd/MM/yyyy');

    applyRowFormulas(sheet, targetRow);

    return { success: true, rowNumber: targetRow };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function setupSheet(sheet) {
  const headerRow = [
    'TIMESTAMP', 'TỪ NGÀY THÁNG NĂM\n(SỬ DỤNG)', 'ĐẾN NGÀY THÁNG NĂM\n(SỬ DỤNG)',
    'NGƯỜI GIẢI QUYẾT', 'THỜI GIAN THỰC TRẢ\n(PTN CẬP NHẬT)', 'GIỜ TRẢ\n(PHÒNG THÍ NGHIỆM SẼ CẬP NHẬT)',
    'HỌ VÀ TÊN\nGIẢNG VIÊN ĐĂNG KÝ', 'SINH VIÊN THAY THẾ GV\nTHỰC HIỆN THÍ NGHIỆM\n(NẾU CÓ)',
    'LỚP (NẾU LÀ SV)\nLÀ GIẢNG VIÊN THÌ GHI GV', 'SỐ ĐIỆN THOẠI\n(GIẢNG VIÊN)',
    'SỐ ĐIỆN THOẠI\n(SINH VIÊN)', 'TÊN THIẾT BỊ SỬ DỤNG', 'PHÒNG SỬ DỤNG',
    'TÌNH TRẠNG THIẾT BỊ\n(NHIỆT ĐỘ, ĐỘ ẨM, VV...)', 'MỤC ĐÍCH SỬ DỤNG', 'GHI CHÚ',
    'ĐỊA CHỈ EMAIL', 'SINH VIÊN THAY THẾ GV\nTHỰC HIỆN (NẾU CÓ)',
    'MỤC ĐÍCH SỬ DỤNG (2)', 'GHI CHÚ (2)', 'HỌ VÀ TÊN GVHD',
    'V', 'W', 'X', 'Y',
    'MƯỢN CHƯA TRẢ\nDƯỚI 1 THÁNG', 'MƯỢN CHƯA TRẢ\nTRÊN 1 THÁNG', 'ĐẶT LỊCH HẸN TRƯỚC'
  ];

  sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);

  const headerRange = sheet.getRange(1, 1, 1, headerRow.length);
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(9);
  headerRange.setWrap(true);
  headerRange.setVerticalAlignment('middle');
  headerRange.setHorizontalAlignment('center');
  sheet.setRowHeight(1, 60);
  sheet.setFrozenRows(1);

  sheet.getRange(1, 26).setValue('=TODAY()');
  setupConditionalFormatting(sheet);

  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 150);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 110);
  sheet.setColumnWidth(11, 110);
  sheet.setColumnWidth(12, 160);
  sheet.setColumnWidth(13, 100);
  sheet.setColumnWidth(14, 160);
  sheet.setColumnWidth(15, 180);
  sheet.setColumnWidth(16, 160);
  sheet.setColumnWidth(17, 160);
  sheet.setColumnWidth(21, 150);
}

function setupConditionalFormatting(sheet) {
  const range = sheet.getRange('A2:AE1157');
  const rules = [];

  const rule1 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(OR($D2="",$E2=""),$Z$1-$C2<=31,OR($B2<>"",$C2<>""),$B2<TODAY())')
    .setBackground('#cfe2ff').setFontColor('#dc3545').setRanges([range]).build();
  rules.push(rule1);

  const rule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(OR($D2="",$E2=""),$Z$1-$C2>31,OR($B2<>"",$C2<>""),$B2<TODAY())')
    .setBackground('#fff3cd').setFontColor('#212529').setBold(true).setRanges([range]).build();
  rules.push(rule2);

  const rule3 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($B2>=TODAY(),OR($D2="",$E2=""))')
    .setBackground('#ffe5b4').setFontColor('#7a4100').setRanges([range]).build();
  rules.push(rule3);

  sheet.setConditionalFormatRules(rules);
}

function applyRowFormulas(sheet, rowNum) {
  sheet.getRange(rowNum, 26).setFormula(
    `=IF(AND(OR($D${rowNum}="",$E${rowNum}=""),$Z$1-$C${rowNum}<=31,OR($B${rowNum}<>"",$C${rowNum}<>""),$B${rowNum}<TODAY()),"✓","")`
  );
  sheet.getRange(rowNum, 27).setFormula(
    `=IF(AND(OR($D${rowNum}="",$E${rowNum}=""),$Z$1-$C${rowNum}>31,OR($B${rowNum}<>"",$C${rowNum}<>""),$B${rowNum}<TODAY()),"✓","")`
  );
  sheet.getRange(rowNum, 28).setFormula(
    `=IF(AND($B${rowNum}>=TODAY(),OR($D${rowNum}="",$E${rowNum}="")),"✓","")`
  );
}

// ============================================================
// HE THONG XAC THUC ADMIN - MAT KHAU CO DINH
// ============================================================

function adminLogin(password) {
  try {
    const inputHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + 'PTN_SALT_2024'
    ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

    const storedHash = ADMIN_PASSWORD_HASH;

    if (inputHash !== storedHash) {
      return { success: false, error: 'Mật khẩu không đúng!' };
    }

    const token = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      inputHash + new Date().toISOString() + Math.random()
    ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

    const expiry = new Date().getTime() + (2 * 60 * 60 * 1000);

    PropertiesService.getScriptProperties().setProperty('SESSION_' + token, expiry.toString());

    return { success: true, token: token, expiry: expiry };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function verifyAdminToken(token) {
  try {
    if (!token) return { valid: false };
    const props = PropertiesService.getScriptProperties();
    const expiry = props.getProperty('SESSION_' + token);
    if (!expiry) return { valid: false };
    if (new Date().getTime() > parseInt(expiry)) {
      props.deleteProperty('SESSION_' + token);
      return { valid: false, expired: true };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false };
  }
}

function adminLogout(token) {
  try {
    if (token) PropertiesService.getScriptProperties().deleteProperty('SESSION_' + token);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

// ============================================================
// CAC HAM CO XAC THUC ADMIN
// ============================================================

function getRegistrationsSecure(token, page, pageSize) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true, expired: check.expired || false };
  return getRegistrations(page, pageSize);
}

function getStatsSecure(token) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true, expired: check.expired || false };
  return getStats();
}

// ============================================================
// TRA THIET BI (ADMIN)
// ============================================================

function returnDeviceSecure(token, rowIndex) {
  const check = verifyAdminToken(token);
  if (!check.valid) return { success: false, authError: true };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, error: 'Sheet không tồn tại' };

    const now = new Date();
    const resolver = 'Admin PTN';
    const returnDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const returnHour = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

    sheet.getRange(rowIndex, 4).setValue(resolver);
    sheet.getRange(rowIndex, 5).setValue(returnDate);
    sheet.getRange(rowIndex, 6).setValue(returnHour);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getRegistrations(page, pageSize) {
  try {
    page = page || 1;
    pageSize = pageSize || 20;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: true, data: [], total: 0 };

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [], total: 0 };

    const totalRecords = lastRow - 1;
    const startRow = Math.max(2, lastRow - (page - 1) * pageSize);
    const endRow = Math.max(2, startRow - pageSize + 1);
    const numRows = startRow - endRow + 1;

    const data = sheet.getRange(endRow, 1, numRows, 21).getValues();
    const formulas = sheet.getRange(endRow, 26, numRows, 3).getValues();

    const result = data.reverse().map((row, i) => {
      const fRow = formulas[numRows - 1 - i];
      const actualRow = startRow - i;
      return {
        rowIndex: actualRow,
        timestamp: safeFormatDate(row[0], 'dd/MM/yyyy HH:mm'),
        fromDate: safeFormatDate(row[1], 'dd/MM/yyyy'),
        toDate: safeFormatDate(row[2], 'dd/MM/yyyy'),
        resolver: row[3] || '',
        returnTime: row[4] || '',
        returnHour: row[5] || '',
        teacherName: row[6] || '',
        studentName: row[7] || '',
        className: row[8] || '',
        teacherPhone: row[9] || '',
        studentPhone: row[10] || '',
        deviceName: row[11] || '',
        room: row[12] || '',
        deviceStatus: row[13] || '',
        purpose: row[14] || '',
        notes: row[15] || '',
        email: row[16] || '',
        supervisorName: row[20] || '',
        underMonth: fRow[0] === '✓',
        overMonth: fRow[1] === '✓',
        scheduled: fRow[2] === '✓',
      };
    });

    return { success: true, data: result, total: totalRecords };
  } catch (e) {
    return { success: false, error: e.toString(), data: [], total: 0 };
  }
}

function getStats() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: true, stats: {} };

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, stats: { total: 0, returned: 0, underMonth: 0, overMonth: 0, scheduled: 0 } };

    const data = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    let total = lastRow - 1, returned = 0, underMonth = 0, overMonth = 0, scheduled = 0;
    const deviceCount = {}, roomCount = {};

    data.forEach(row => {
      const fromDate = row[1] ? new Date(row[1]) : null;
      const toDate = row[2] ? new Date(row[2]) : null;
      const resolver = row[3], returnTime = row[4];
      const device = row[11] || 'Không rõ';
      const room = row[12] || 'Không rõ';

      deviceCount[device] = (deviceCount[device] || 0) + 1;
      roomCount[room] = (roomCount[room] || 0) + 1;

      if (resolver || returnTime) { returned++; }
      else if (fromDate && fromDate >= today) { scheduled++; }
      else if (toDate) {
        const diff = (today - toDate) / 86400000;
        if (diff <= 31) underMonth++; else overMonth++;
      }
    });

    const topDevices = Object.entries(deviceCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topRooms = Object.entries(roomCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { success: true, stats: { total, returned, underMonth, overMonth, scheduled, topDevices, topRooms } };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function initializeSheet() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    setupSheet(sheet);

    if (!ss.getSheetByName(DEVICE_SHEET_NAME)) {
      createDeviceSheet(ss);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// TIEN ICH
// ============================================================

function generateHash() {
  const password = 'admin@2026';
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + 'PTN_SALT_2024'
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  Logger.log('Mật khẩu: ' + password);
  Logger.log('Hash: ' + hash);
  Logger.log('Dán vào ADMIN_PASSWORD_HASH trong code');
}
