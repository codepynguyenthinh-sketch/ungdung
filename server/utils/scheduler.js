const cron = require('node-cron');
const { Op } = require('sequelize');
const { Borrow, Book, User, Message } = require('../models');

const scheduleOverdueCheck = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      // Find borrows that are about to become overdue
      const overdueBorrows = await Borrow.findAll({
        where: { status: { [Op.in]: ['borrowed', 'renewed'] }, due_date: { [Op.lt]: new Date() } },
        include: [
          { model: Book, as: 'book', attributes: ['id', 'title', 'author'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        ],
      });

      // Mark as overdue
      const [count] = await Borrow.update(
        { status: 'overdue' },
        { where: { status: { [Op.in]: ['borrowed', 'renewed'] }, due_date: { [Op.lt]: new Date() } } }
      );
      console.log(`[Scheduler] Marked ${count} borrows as overdue`);

      // Send overdue notification messages to students
      const notifiedUsers = new Set();
      for (const borrow of overdueBorrows) {
        if (!borrow.user || notifiedUsers.has(borrow.user.id)) continue;

        const userOverdueBooks = overdueBorrows.filter(b => b.user_id === borrow.user.id);
        const bookList = userOverdueBooks.map(b => `- "${b.book?.title || 'N/A'}"`).join('\n');
        const daysOverdue = Math.max(...userOverdueBooks.map(b => Math.ceil((new Date() - new Date(b.due_date)) / (1000 * 60 * 60 * 24))));

        await Message.create({
          user_id: borrow.user.id,
          subject: `⚠️ Cảnh báo: Bạn có ${userOverdueBooks.length} sách quá hạn`,
          body: `Xin chào ${borrow.user.name},\n\nBạn có ${userOverdueBooks.length} cuốn sách đã quá hạn trả:\n${bookList}\n\nVui lòng trả sách sớm nhất có thể để tránh phát sinh thêm phí phạt.\nSách quá hạn lâu nhất: ${daysOverdue} ngày.\n\nTrân trọng,\nThư viện`,
          status: 'new',
        });

        notifiedUsers.add(borrow.user.id);
      }

      if (notifiedUsers.size > 0) {
        console.log(`[Scheduler] Sent overdue notifications to ${notifiedUsers.size} students`);
      }

      // Send reminders for books due tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const dueSoonBorrows = await Borrow.findAll({
        where: {
          status: { [Op.in]: ['borrowed', 'renewed'] },
          due_date: { [Op.between]: [startOfTomorrow, endOfTomorrow] },
        },
        include: [
          { model: Book, as: 'book', attributes: ['id', 'title'] },
          { model: User, as: 'user', attributes: ['id', 'name'] },
        ],
      });

      const remindedUsers = new Set();
      for (const borrow of dueSoonBorrows) {
        if (!borrow.user || remindedUsers.has(borrow.user.id)) continue;

        const userDueSoonBooks = dueSoonBorrows.filter(b => b.user_id === borrow.user.id);
        const bookList = userDueSoonBooks.map(b => `- "${b.book?.title || 'N/A'}"`).join('\n');

        await Message.create({
          user_id: borrow.user.id,
          subject: `📅 Nhắc nhở: ${userDueSoonBooks.length} sách sắp đến hạn trả`,
          body: `Xin chào ${borrow.user.name},\n\nCác sách sau sẽ đến hạn trả vào ngày mai:\n${bookList}\n\nVui lòng trả sách đúng hạn hoặc gia hạn nếu cần.\n\nTrân trọng,\nThư viện`,
          status: 'new',
        });

        remindedUsers.add(borrow.user.id);
      }

      if (remindedUsers.size > 0) {
        console.log(`[Scheduler] Sent due-soon reminders to ${remindedUsers.size} students`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  });
  console.log('[Scheduler] Overdue check & notification scheduled');
};

module.exports = { scheduleOverdueCheck };
