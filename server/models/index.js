const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

// ─── User ───────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  email:        { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password:     { type: DataTypes.STRING, allowNull: false },
  student_id:   { type: DataTypes.STRING(50), unique: true },
  phone:        { type: DataTypes.STRING(20) },
  address:      { type: DataTypes.TEXT },
  role:         { type: DataTypes.ENUM('user','librarian','admin'), defaultValue: 'user' },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  avatar:       { type: DataTypes.STRING },
  borrow_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_fines:  { type: DataTypes.INTEGER, defaultValue: 0 },
  unpaid_fines: { type: DataTypes.INTEGER, defaultValue: 0 },
  permissions:  { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  reset_token:  { type: DataTypes.STRING },
  reset_token_expires: { type: DataTypes.DATE },
}, { tableName: 'users' });

User.beforeCreate(async (u) => { u.password = await bcrypt.hash(u.password, 10); });
User.beforeUpdate(async (u) => { if (u.changed('password')) u.password = await bcrypt.hash(u.password, 10); });
User.prototype.matchPassword = async function (p) { return bcrypt.compare(p, this.password); };
User.prototype.toJSON = function () {
  const v = { ...this.get() };
  delete v.password;
  delete v.reset_token;
  delete v.reset_token_expires;
  return v;
};

// ─── Category ────────────────────────────────────────────────────────────────
const Category = sequelize.define('Category', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'categories' });

// ─── Department (Khoa viện) ──────────────────────────────────────────────────
const Department = sequelize.define('Department', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'departments' });

// ─── Book ─────────────────────────────────────────────────────────────────────
const Book = sequelize.define('Book', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:            { type: DataTypes.STRING(255), allowNull: false },
  author:           { type: DataTypes.STRING(200), allowNull: false },
  isbn:             { type: DataTypes.STRING(20), unique: true },
  category_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categories', key: 'id' } },
  department_id:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' } },
  publisher:        { type: DataTypes.STRING(150) },
  publish_year:     { type: DataTypes.INTEGER },
  edition:          { type: DataTypes.STRING(50) },
  description:      { type: DataTypes.TEXT },
  cover:            { type: DataTypes.STRING },
  total_copies:     { type: DataTypes.INTEGER, defaultValue: 1 },
  available_copies: { type: DataTypes.INTEGER, defaultValue: 1 },
  location:         { type: DataTypes.STRING(50) },
  language:         { type: DataTypes.STRING(50), defaultValue: 'Tiếng Việt' },
  pages:            { type: DataTypes.INTEGER },
  tags:             { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  is_active:        { type: DataTypes.BOOLEAN, defaultValue: true },
  borrow_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  deposit:          { type: DataTypes.INTEGER, defaultValue: 0 },
  pdf_url:          { type: DataTypes.STRING },
  is_public_pdf:    { type: DataTypes.BOOLEAN, defaultValue: false },
  // 'public'  = ai cũng xem được (cả Internet)
  // 'lan'     = chỉ mạng nội bộ (LAN) mới xem được
  // 'private' = phải đăng nhập mới xem (dù LAN hay WAN)
  access_level:     { type: DataTypes.ENUM('public','lan','private'), defaultValue: 'public' },
}, { tableName: 'books' });

// ─── Borrow ───────────────────────────────────────────────────────────────────
const Borrow = sequelize.define('Borrow', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  book_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'books', key: 'id' } },
  copy_id:      { type: DataTypes.INTEGER, references: { model: 'book_copies', key: 'id' } },
  borrow_date:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  due_date:     { type: DataTypes.DATE, allowNull: false },
  return_date:  { type: DataTypes.DATE },
  status:       { type: DataTypes.ENUM('borrowed','returned','overdue','renewed','lost'), defaultValue: 'borrowed' },
  borrow_type:  { type: DataTypes.ENUM('home','onsite'), defaultValue: 'home' },
  renew_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  max_renewals: { type: DataTypes.INTEGER, defaultValue: 2 },
  note:         { type: DataTypes.TEXT },
  processed_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'borrows' });

// ─── Fine ─────────────────────────────────────────────────────────────────────
const Fine = sequelize.define('Fine', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  borrow_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'borrows', key: 'id' } },
  amount:       { type: DataTypes.INTEGER, allowNull: false },
  reason:       { type: DataTypes.ENUM('overdue','damaged','lost','deposit'), defaultValue: 'overdue' },
  overdue_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_paid:      { type: DataTypes.BOOLEAN, defaultValue: false },
  paid_date:    { type: DataTypes.DATE },
  paid_by:      { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  note:         { type: DataTypes.TEXT },
}, { tableName: 'fines' });

// ─── Reservation ─────────────────────────────────────────────────────────────
const Reservation = sequelize.define('Reservation', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  book_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'books', key: 'id' } },
  status:      { type: DataTypes.ENUM('pending','ready','fulfilled','cancelled','expired'), defaultValue: 'pending' },
  expires_at:  { type: DataTypes.DATE },
  notified_at: { type: DataTypes.DATE },
}, { tableName: 'reservations' });

// ─── Message ─────────────────────────────────────────────────────────────────
const Message = sequelize.define('Message', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  subject:     { type: DataTypes.STRING(200), allowNull: false },
  body:        { type: DataTypes.TEXT, allowNull: false },
  status:      { type: DataTypes.ENUM('new','read','replied'), defaultValue: 'new' },
  reply:       { type: DataTypes.TEXT },
}, { tableName: 'messages' });


// ─── BookCopy (Đăng ký cá biệt) ──────────────────────────────────────────────
const BookCopy = sequelize.define('BookCopy', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  book_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'books', key: 'id' } },
  copy_code:   { type: DataTypes.STRING(30), allowNull: false, unique: true }, // vd: LIB-2025-00001
  condition:   { type: DataTypes.ENUM('good', 'worn', 'damaged', 'lost'), defaultValue: 'good' },
  status:      { type: DataTypes.ENUM('available', 'borrowed', 'reserved', 'lost', 'maintenance'), defaultValue: 'available' },
  acquired_at: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  note:        { type: DataTypes.TEXT },
}, { tableName: 'book_copies' });

// ─── Associations ─────────────────────────────────────────────────────────────
Category.hasMany(Book,        { foreignKey: 'category_id', as: 'books' });
Book.belongsTo(Category,      { foreignKey: 'category_id', as: 'category' });

Department.hasMany(Book,      { foreignKey: 'department_id', as: 'books' });
Book.belongsTo(Department,    { foreignKey: 'department_id', as: 'department' });

User.hasMany(Borrow,          { foreignKey: 'user_id',  as: 'borrows' });
Book.hasMany(Borrow,          { foreignKey: 'book_id',  as: 'borrows' });
Borrow.belongsTo(User,        { foreignKey: 'user_id',  as: 'user' });
Borrow.belongsTo(Book,        { foreignKey: 'book_id',  as: 'book' });
Borrow.belongsTo(User,        { foreignKey: 'processed_by', as: 'processor' });

User.hasMany(Fine,            { foreignKey: 'user_id',   as: 'fines' });
Borrow.hasOne(Fine,           { foreignKey: 'borrow_id', as: 'fine' });
Fine.belongsTo(User,          { foreignKey: 'user_id',   as: 'user' });
Fine.belongsTo(Borrow,        { foreignKey: 'borrow_id', as: 'borrow' });
Fine.belongsTo(User,          { foreignKey: 'paid_by',   as: 'paidByUser' });

User.hasMany(Reservation,     { foreignKey: 'user_id',  as: 'reservations' });
Book.hasMany(Reservation,     { foreignKey: 'book_id',  as: 'reservations' });
Reservation.belongsTo(User,   { foreignKey: 'user_id',  as: 'user' });
Reservation.belongsTo(Book,   { foreignKey: 'book_id',  as: 'book' });

User.hasMany(Message,         { foreignKey: 'user_id',  as: 'messages' });
Message.belongsTo(User,       { foreignKey: 'user_id',  as: 'user' });

Book.hasMany(BookCopy,     { foreignKey: 'book_id', as: 'copies' });
BookCopy.belongsTo(Book,   { foreignKey: 'book_id', as: 'book'   });
Borrow.belongsTo(BookCopy, { foreignKey: 'copy_id', as: 'copy'   });
BookCopy.hasMany(Borrow,   { foreignKey: 'copy_id', as: 'borrows' });

// ─── Inventory (Kiểm kê) ────────────────────────────────────────────────────
const Inventory = sequelize.define('Inventory', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  year:         { type: DataTypes.INTEGER, allowNull: false }, // năm kiểm kê
  inventory_date: { type: DataTypes.DATEONLY, allowNull: false },
  total_books:  { type: DataTypes.INTEGER, defaultValue: 0 }, // tổng sách lý thuyết
  total_found:  { type: DataTypes.INTEGER, defaultValue: 0 }, // tổng sách tìm thấy
  total_lost:   { type: DataTypes.INTEGER, defaultValue: 0 }, // tổng sách mất
  notes:        { type: DataTypes.TEXT },
  created_by:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
}, { tableName: 'inventories' });

// ─── InventoryDetail (Chi tiết kiểm kê) ─────────────────────────────────────
const InventoryDetail = sequelize.define('InventoryDetail', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inventory_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inventories', key: 'id' } },
  copy_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'book_copies', key: 'id' } },
  found:        { type: DataTypes.BOOLEAN, defaultValue: false }, // có tìm thấy hay không
  notes:        { type: DataTypes.TEXT },
}, { tableName: 'inventory_details' });

// ─── Associations (Inventory) ────────────────────────────────────────────────
User.hasMany(Inventory, { foreignKey: 'created_by', as: 'inventories' });
Inventory.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Inventory.hasMany(InventoryDetail, { foreignKey: 'inventory_id', as: 'details' });
InventoryDetail.belongsTo(Inventory, { foreignKey: 'inventory_id', as: 'inventory' });

BookCopy.hasMany(InventoryDetail, { foreignKey: 'copy_id', as: 'inventoryDetails' });
InventoryDetail.belongsTo(BookCopy, { foreignKey: 'copy_id', as: 'copy' });

Department.hasMany(User, { foreignKey: 'department_id', as: 'students' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

module.exports = { User, Category, Department, Book, Borrow, Fine, Reservation, Message, BookCopy, Inventory, InventoryDetail };
