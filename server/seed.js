require('dotenv').config();
const { connectDB } = require('./config/db');
const { User, Category, Book } = require('./models');

const seed = async () => {
  await connectDB();

  await Book.destroy({ where: {}, truncate: true, cascade: true });
  await Category.destroy({ where: {}, truncate: true, cascade: true });
  await User.destroy({ where: {}, truncate: true, cascade: true });

  await User.create({ name: 'Admin',       email: 'admin@library.com',     password: '123456', role: 'admin' });
  await User.create({ name: 'Thủ thư',     email: 'librarian@library.com', password: '123456', role: 'librarian' });
  await User.create({ name: 'Nguyễn Văn A', email: 'user@library.com',      password: '123456', role: 'user', student_id: 'SV001' });

  const cats = await Category.bulkCreate([
    { name: 'Công nghệ thông tin', description: 'Sách lập trình, CNTT' },
    { name: 'Kinh tế',             description: 'Sách kinh tế, quản trị' },
    { name: 'Văn học',             description: 'Tiểu thuyết, truyện ngắn' },
    { name: 'Khoa học tự nhiên',   description: 'Toán, Lý, Hóa, Sinh' },
    { name: 'Ngoại ngữ',           description: 'Tiếng Anh, Nhật, Hàn' },
    { name: 'Lịch sử - Địa lý',   description: 'Sách lịch sử, địa lý' },
  ], { returning: true });

  await Book.bulkCreate([
    { title: 'Lập trình JavaScript từ cơ bản đến nâng cao', author: 'Nguyễn Minh Tuấn',  isbn: '978-604-01-0001-1', category_id: cats[0].id, publisher: 'NXB Trẻ',         publish_year: 2022, total_copies: 5, available_copies: 5, location: 'A1-01' },
    { title: 'React.js - Xây dựng ứng dụng web hiện đại',   author: 'Trần Thị Bích',     isbn: '978-604-01-0002-2', category_id: cats[0].id, publisher: 'NXB Lao Động',    publish_year: 2023, total_copies: 3, available_copies: 3, location: 'A1-02' },
    { title: 'Cơ sở dữ liệu nâng cao',                      author: 'Lê Văn Cường',      isbn: '978-604-01-0003-3', category_id: cats[0].id, publisher: 'NXB ĐHQG',        publish_year: 2021, total_copies: 4, available_copies: 4, location: 'A1-03' },
    { title: 'Kinh tế vi mô',                                author: 'N. Gregory Mankiw', isbn: '978-604-01-0004-4', category_id: cats[1].id, publisher: 'NXB Thống Kê',    publish_year: 2020, total_copies: 6, available_copies: 6, location: 'B1-01' },
    { title: 'Quản trị kinh doanh',                          author: 'Phạm Thị Dung',     isbn: '978-604-01-0005-5', category_id: cats[1].id, publisher: 'NXB ĐH Kinh Tế', publish_year: 2022, total_copies: 4, available_copies: 4, location: 'B1-02' },
    { title: 'Số đỏ',                                        author: 'Vũ Trọng Phụng',    isbn: '978-604-01-0006-6', category_id: cats[2].id, publisher: 'NXB Văn Học',     publish_year: 2019, total_copies: 8, available_copies: 8, location: 'C1-01' },
    { title: 'Đắc nhân tâm',                                 author: 'Dale Carnegie',     isbn: '978-604-01-0007-7', category_id: cats[2].id, publisher: 'NXB Tổng Hợp',   publish_year: 2020, total_copies: 10, available_copies: 10, location: 'C1-02' },
    { title: 'Giải tích 1',                                  author: 'Nguyễn Đình Trí',   isbn: '978-604-01-0008-8', category_id: cats[3].id, publisher: 'NXB Giáo Dục',   publish_year: 2018, total_copies: 15, available_copies: 15, location: 'D1-01' },
    { title: 'English Grammar in Use',                       author: 'Raymond Murphy',    isbn: '978-604-01-0009-9', category_id: cats[4].id, publisher: 'Cambridge',       publish_year: 2019, total_copies: 7,  available_copies: 7,  location: 'E1-01' },
    { title: 'Lịch sử Việt Nam',                             author: 'Nhiều tác giả',     isbn: '978-604-01-0010-0', category_id: cats[5].id, publisher: 'NXB Giáo Dục',   publish_year: 2021, total_copies: 5,  available_copies: 5,  location: 'F1-01' },
  ]);

  console.log('\n✅ Seed PostgreSQL thành công!');
  console.log('📧 Tài khoản:');
  console.log('   Admin:     admin@library.com     / 123456');
  console.log('   Librarian: librarian@library.com / 123456');
  console.log('   User:      user@library.com      / 123456\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
