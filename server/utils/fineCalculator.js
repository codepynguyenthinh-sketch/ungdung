// Fine calculation utilities
const { Borrow, Fine, Book, User } = require('../models');
const { Op } = require('sequelize');

const DAILY_FINE_RATE = 5000; // 5,000 đ per day (configure as needed)
const MAX_FINE_PER_BOOK = 100000; // Cap at 100,000đ per book (optional)

/**
 * Calculate fine for an overdue borrow
 * @param {Object} borrow - Borrow record with book info
 * @returns {number} Fine amount in VND
 */
function calculateOverdueFine(borrow) {
  const now = new Date();
  const dueDate = new Date(borrow.due_date);
  
  if (now <= dueDate) return 0; // Not overdue
  
  const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  let fineAmount = daysOverdue * DAILY_FINE_RATE;
  
  // Optional: Cap maximum fine
  if (MAX_FINE_PER_BOOK > 0) {
    fineAmount = Math.min(fineAmount, MAX_FINE_PER_BOOK);
  }
  
  return fineAmount;
}

/**
 * Auto-generate fines for all overdue borrows
 * Should be called periodically (daily) via cron job
 */
async function generateOverdueFines() {
  try {
    // Find all active borrows that are past due date
    const overdueBorrows = await Borrow.findAll({
      where: {
        status: { [Op.in]: ['borrowed', 'renewed'] },
        due_date: { [Op.lt]: new Date() },
      },
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title'] },
        { model: User, as: 'user', attributes: ['id'] },
      ],
    });

    let finesCreated = 0;
    let finesUpdated = 0;

    for (const borrow of overdueBorrows) {
      const fineAmount = calculateOverdueFine(borrow);
      
      // Check if fine already exists for this borrow
      const existingFine = await Fine.findOne({ where: { borrow_id: borrow.id } });
      
      if (existingFine) {
        // Update existing fine amount
        if (existingFine.amount !== fineAmount) {
          await existingFine.update({ amount: fineAmount });
          finesUpdated++;
        }
      } else if (fineAmount > 0) {
        // Create new fine
        const daysOverdue = Math.floor((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
        await Fine.create({
          user_id: borrow.user_id,
          borrow_id: borrow.id,
          amount: fineAmount,
          reason: 'overdue',
          overdue_days: daysOverdue,
          is_paid: false,
        });
        finesCreated++;
      }
    }

    console.log(`[Fine Generator] Created: ${finesCreated}, Updated: ${finesUpdated}`);
    return { finesCreated, finesUpdated, processed: overdueBorrows.length };
  } catch (err) {
    console.error('Error generating overdue fines:', err);
    throw err;
  }
}

/**
 * Get all overdue borrows for a user with calculated fines
 */
async function getUserOverdueBorrows(userId) {
  try {
    const overdueBorrows = await Borrow.findAll({
      where: {
        user_id: userId,
        status: { [Op.in]: ['borrowed', 'renewed'] },
        due_date: { [Op.lt]: new Date() },
      },
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'cover'] },
      ],
    });

    return overdueBorrows.map(borrow => {
      const daysOverdue = Math.floor((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
      const fineAmount = calculateOverdueFine(borrow);
      
      return {
        id: borrow.id,
        book: borrow.book,
        dueDate: borrow.due_date,
        daysOverdue,
        fineAmount,
        borrowDate: borrow.borrow_date,
      };
    });
  } catch (err) {
    console.error('Error fetching user overdue borrows:', err);
    return [];
  }
}

module.exports = {
  calculateOverdueFine,
  generateOverdueFines,
  getUserOverdueBorrows,
  DAILY_FINE_RATE,
  MAX_FINE_PER_BOOK,
};
