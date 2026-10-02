/**
 * ELVORA Smart Library Management System
 * Main Server Entry Point
 * 
 * Supports both MongoDB Atlas and in-memory MongoDB (auto-detected)
 * Includes SSE for real-time updates, audit logging, and QR code system
 */

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sseManager = require('./utils/sseManager');
const { formatError } = require('./utils/errorResponse');

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: '*',  // Allow all origins — needed for mobile QR scanning via any LAN IP
  credentials: false
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Global rate limiter: 200 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' }
  }
});
app.use('/api/', globalLimiter);

// ─── Route Imports ───────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const studentRoutes = require('./routes/student.routes');
const transactionRoutes = require('./routes/transaction.routes');
const scanRoutes = require('./routes/scan.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const reservationRoutes = require('./routes/reservation.routes');
const auditRoutes = require('./routes/audit.routes');
const publicRoutes = require('./routes/public.routes');

// ─── Public Routes (no authentication) ──────────────────
app.use('/api/public', publicRoutes);

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/audit', auditRoutes);

// ─── SSE (Server-Sent Events) Endpoint ──────────────────
app.get('/api/events', (req, res) => {
  const channels = req.query.channels
    ? req.query.channels.split(',')
    : ['all'];
  
  const clientId = sseManager.addClient(req, res, channels);
  console.log(`📡 SSE client ${clientId} connected (channels: ${channels.join(', ')})`);
});

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ELVORA API is running',
    timestamp: new Date(),
    sseClients: sseManager.getClientCount(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ─── Metrics Endpoint ────────────────────────────────────
app.get('/api/metrics', async (req, res) => {
  try {
    const Book = require('./models/Book');
    const Student = require('./models/Student');
    const Transaction = require('./models/Transaction');
    const Reservation = require('./models/Reservation');

    const [books, students, transactions, reservations] = await Promise.all([
      Book.countDocuments(),
      Student.countDocuments(),
      Transaction.countDocuments(),
      Reservation.countDocuments({ status: { $in: ['pending', 'ready'] } })
    ]);

    res.json({
      success: true,
      data: {
        counts: { books, students, transactions, activeReservations: reservations },
        sseClients: sseManager.getClientCount(),
        uptime: process.uptime(),
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Metrics fetch failed.' } });
  }
});

// ─── Global Error Handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack || err.message);
  const { statusCode, body } = formatError(err);
  res.status(statusCode).json(body);
});

// ─── Serve Frontend (Production) ─────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found.`
      }
    });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Auto-Seed Function ─────────────────────────────────
async function autoSeed() {
  const User = require('./models/User');
  const Book = require('./models/Book');
  const Student = require('./models/Student');
  const Transaction = require('./models/Transaction');
  const Notification = require('./models/Notification');
  const { generateQRToken } = require('./utils/qrGenerator');

  // Check if already seeded
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('📦 Database already has data, skipping seed.');
    // Ensure all books have QR tokens
    const booksWithoutQR = await Book.find({ $or: [{ qr_token: null }, { qr_token: '' }] });
    if (booksWithoutQR.length > 0) {
      console.log(`🔄 Generating QR tokens for ${booksWithoutQR.length} books...`);
      for (const book of booksWithoutQR) {
        book.qr_token = generateQRToken();
        book.qr_token_created_at = new Date();
        await book.save();
      }
      console.log('✅ QR tokens generated.');
    }
    return;
  }

  console.log('🌱 Auto-seeding database with sample data...');

  // Create users
  await User.create({ name: 'ELVORA Admin', email: 'admin@elvora.com', password: 'admin123', role: 'admin' });
  await User.create({ name: 'Library Staff', email: 'librarian@elvora.com', password: 'lib123', role: 'librarian' });

  // Create books with QR tokens and digital URLs
  const sampleBooks = [
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', isbn: '978-0262033848', totalCount: 5, publisher: 'MIT Press', edition: '3rd', location: 'Shelf A-1', summary: 'Comprehensive guide to algorithms covering data structures, graph algorithms, and computational complexity.', digital_url: '', digital_access_policy: 'none' },
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', isbn: '978-0132350884', totalCount: 3, publisher: 'Prentice Hall', edition: '1st', location: 'Shelf A-2', summary: 'A handbook of agile software craftsmanship for writing clean, maintainable code.', digital_url: 'https://example.com/clean-code', digital_access_policy: 'members_only' },
    { title: 'Design Patterns', author: 'Gang of Four', category: 'Computer Science', isbn: '978-0201633610', totalCount: 4, publisher: 'Addison-Wesley', edition: '1st', location: 'Shelf A-3', summary: 'Elements of reusable object-oriented software design patterns.' },
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Technology', isbn: '978-0135957059', totalCount: 3, publisher: 'Addison-Wesley', edition: '2nd', location: 'Shelf B-1', summary: 'Classic advice on software development from journeyman to master.' },
    { title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', category: 'Computer Science', isbn: '978-0134610993', totalCount: 4, publisher: 'Pearson', edition: '4th', location: 'Shelf B-2', summary: 'The leading textbook on artificial intelligence, used in over 1500 universities.' },
    { title: 'Data Structures Using C', author: 'Reema Thareja', category: 'Computer Science', isbn: '978-0198099307', totalCount: 6, publisher: 'Oxford', edition: '2nd', location: 'Shelf B-3', summary: 'Comprehensive coverage of data structures implementation in C programming.' },
    { title: 'Engineering Mathematics', author: 'B.S. Grewal', category: 'Mathematics', isbn: '978-8174091956', totalCount: 8, publisher: 'Khanna Publishers', edition: '44th', location: 'Shelf C-1', summary: 'Standard textbook for engineering mathematics covering calculus, linear algebra, and differential equations.' },
    { title: 'Digital Electronics', author: 'Morris Mano', category: 'Engineering', isbn: '978-0132774208', totalCount: 5, publisher: 'Pearson', edition: '5th', location: 'Shelf C-2', summary: 'Principles of digital logic design and computer architecture.' },
    { title: 'Computer Networks', author: 'Andrew Tanenbaum', category: 'Computer Science', isbn: '978-0132126953', totalCount: 4, publisher: 'Pearson', edition: '5th', location: 'Shelf C-3', summary: 'Classic textbook on computer networking fundamentals and protocols.' },
    { title: 'Operating System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', isbn: '978-1119800361', totalCount: 5, publisher: 'Wiley', edition: '10th', location: 'Shelf D-1', summary: 'The definitive guide to operating system principles and design.' },
    { title: 'Database System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', isbn: '978-0078022159', totalCount: 4, publisher: 'McGraw-Hill', edition: '7th', location: 'Shelf D-2', summary: 'Comprehensive coverage of database system design, SQL, and modern database architectures.', digital_url: 'https://example.com/db-concepts', digital_access_policy: 'open' },
    { title: 'Thermodynamics: An Engineering Approach', author: 'Yunus Cengel', category: 'Engineering', isbn: '978-0073398174', totalCount: 3, publisher: 'McGraw-Hill', edition: '8th', location: 'Shelf D-3', summary: 'Engineering thermodynamics with practical applications and examples.' },
    { title: 'Strength of Materials', author: 'R.K. Rajput', category: 'Engineering', isbn: '978-8121935029', totalCount: 4, publisher: 'S. Chand', edition: '6th', location: 'Shelf E-1', summary: 'Fundamentals of mechanics of materials for engineering students.' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Literature', isbn: '978-0060935467', totalCount: 6, publisher: 'Harper Perennial', edition: '1st', location: 'Shelf F-1', summary: 'Pulitzer Prize-winning novel exploring racial injustice in the American South.' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', isbn: '978-0553380163', totalCount: 4, publisher: 'Bantam', edition: '10th Anniversary', location: 'Shelf F-2', summary: 'Landmark work on cosmology, black holes, and the nature of time.', digital_url: 'https://example.com/brief-history', digital_access_policy: 'members_only' },
    { title: 'Principles of Economics', author: 'N. Gregory Mankiw', category: 'Business', isbn: '978-1305585126', totalCount: 5, publisher: 'Cengage', edition: '8th', location: 'Shelf F-3', summary: 'Widely used introduction to micro and macroeconomic principles.' },
    { title: 'Machine Learning', author: 'Tom Mitchell', category: 'Computer Science', isbn: '978-0070428072', totalCount: 3, publisher: 'McGraw-Hill', edition: '1st', location: 'Shelf G-1', summary: 'Foundational textbook on machine learning algorithms and theory.' },
    { title: 'Fluid Mechanics', author: 'Frank White', category: 'Engineering', isbn: '978-0073398273', totalCount: 3, publisher: 'McGraw-Hill', edition: '8th', location: 'Shelf G-3', summary: 'Comprehensive treatment of fluid mechanics with engineering applications.' },
  ];

  const booksToCreate = sampleBooks.map((book, index) => ({
    ...book,
    availableCount: book.totalCount,
    barcode: `ELV-BK-${String(index + 1).padStart(4, '0')}`,
    qr_token: generateQRToken(),
    qr_token_created_at: new Date()
  }));
  const books = await Book.insertMany(booksToCreate);

  // Create students
  const sampleStudents = [
    { studentId: 'STU-2024-001', name: 'Arun Kumar', email: 'arun.kumar@college.edu', phone: '9876543210', department: 'Computer Science', year: 3 },
    { studentId: 'STU-2024-002', name: 'Priya Sharma', email: 'priya.sharma@college.edu', phone: '9876543211', department: 'Electronics', year: 2 },
    { studentId: 'STU-2024-003', name: 'Rahul Verma', email: 'rahul.verma@college.edu', phone: '9876543212', department: 'Mechanical', year: 4 },
    { studentId: 'STU-2024-004', name: 'Sneha Patel', email: 'sneha.patel@college.edu', phone: '9876543213', department: 'Computer Science', year: 1 },
    { studentId: 'STU-2024-005', name: 'Vikram Singh', email: 'vikram.singh@college.edu', phone: '9876543214', department: 'Civil', year: 3 },
    { studentId: 'STU-2024-006', name: 'Deepika Reddy', email: 'deepika.reddy@college.edu', phone: '9876543215', department: 'Information Technology', year: 2 },
    { studentId: 'STU-2024-007', name: 'Karthik Nair', email: 'karthik.nair@college.edu', phone: '9876543216', department: 'Electrical', year: 4 },
    { studentId: 'STU-2024-008', name: 'Ananya Gupta', email: 'ananya.gupta@college.edu', phone: '9876543217', department: 'Computer Science', year: 2 },
    { studentId: 'STU-2024-009', name: 'Mohammed Farhan', email: 'farhan.m@college.edu', phone: '9876543218', department: 'Electronics', year: 3 },
    { studentId: 'STU-2024-010', name: 'Lakshmi Iyer', email: 'lakshmi.iyer@college.edu', phone: '9876543219', department: 'Science', year: 1 },
    { studentId: 'STU-2024-011', name: 'Rajesh Menon', email: 'rajesh.menon@college.edu', phone: '9876543220', department: 'Mechanical', year: 2 },
    { studentId: 'STU-2024-012', name: 'Kavita Joshi', email: 'kavita.joshi@college.edu', phone: '9876543221', department: 'Arts', year: 3 },
  ];
  const students = await Student.insertMany(sampleStudents);

  // Create sample transactions
  const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;

  // Active issues
  const issuePairs = [{ si: 0, bi: 0 }, { si: 1, bi: 3 }, { si: 2, bi: 5 }, { si: 3, bi: 1 }, { si: 4, bi: 7 }];
  for (const pair of issuePairs) {
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 10));
    const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
    await Transaction.create({ student: students[pair.si]._id, book: books[pair.bi]._id, issueDate, dueDate, status: 'issued' });
    books[pair.bi].availableCount -= 1;
    await books[pair.bi].save();
    students[pair.si].booksIssued += 1;
    await students[pair.si].save();
  }

  // Returned
  const returnPairs = [{ si: 5, bi: 2 }, { si: 6, bi: 4 }, { si: 7, bi: 9 }];
  for (const pair of returnPairs) {
    const issueDate = new Date(); issueDate.setDate(issueDate.getDate() - 20);
    const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
    const returnDate = new Date(); returnDate.setDate(returnDate.getDate() - 2);
    await Transaction.create({ student: students[pair.si]._id, book: books[pair.bi]._id, issueDate, dueDate, returnDate, status: 'returned', fineAmount: 0 });
  }

  // Overdue
  const overduePairs = [{ si: 8, bi: 6 }, { si: 9, bi: 10 }];
  for (const pair of overduePairs) {
    const issueDate = new Date(); issueDate.setDate(issueDate.getDate() - 25);
    const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
    const overdueDays = Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24));
    const finePerDay = parseInt(process.env.FINE_PER_DAY) || 5;
    await Transaction.create({ student: students[pair.si]._id, book: books[pair.bi]._id, issueDate, dueDate, status: 'overdue', fineAmount: Math.max(0, overdueDays * finePerDay) });
    books[pair.bi].availableCount -= 1;
    await books[pair.bi].save();
    students[pair.si].booksIssued += 1;
    await students[pair.si].save();
  }

  // Notifications
  await Notification.insertMany([
    { type: 'system', title: 'Welcome to ELVORA', message: 'ELVORA Smart Library Management System has been initialized successfully.', priority: 'low' },
    { type: 'overdue', title: 'Books Overdue', message: 'There are 2 overdue books that need attention.', priority: 'high' },
    { type: 'due_reminder', title: 'Books Due Soon', message: 'Multiple books are due within the next 3 days.', priority: 'medium' },
  ]);

  // ── Seed Reservations ──────────────────────────────────────
  const Reservation = require('./models/Reservation');
  const AuditLog = require('./models/AuditLog');

  const reservationSeeds = [
    { student: students[5]._id, book: books[0]._id, position: 1, status: 'pending', autoIssue: true,
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000) },
    { student: students[6]._id, book: books[0]._id, position: 2, status: 'pending', autoIssue: false,
      expectedDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { student: students[7]._id, book: books[3]._id, position: 1, status: 'ready', autoIssue: true,
      expectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      notifiedAt: new Date() },
    { student: students[8]._id, book: books[1]._id, position: 1, status: 'pending', autoIssue: false,
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000) },
    { student: students[9]._id, book: books[7]._id, position: 1, status: 'fulfilled', autoIssue: true,
      expectedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fulfilledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { student: students[10]._id, book: books[5]._id, position: 1, status: 'cancelled', autoIssue: false,
      expectedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { student: students[11]._id, book: books[1]._id, position: 2, status: 'pending', autoIssue: true,
      expectedDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  ];
  await Reservation.insertMany(reservationSeeds);
  console.log('✅ Seeded 7 reservations');

  // ── Seed Audit Logs ────────────────────────────────────────
  const admin = await User.findOne({ role: 'admin' });
  const auditSeeds = [
    { action: 'user_login', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'user', targetId: admin?._id,
      details: { method: 'password' }, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    { action: 'book_issued', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[0].title, studentName: students[0].name, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      createdAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000) },
    { action: 'book_issued', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[3].title, studentName: students[1].name, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { action: 'book_issued', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[5].title, studentName: students[2].name },
      createdAt: new Date(Date.now() - 4.8 * 60 * 60 * 1000) },
    { action: 'book_issued', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[1].title, studentName: students[3].name },
      createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000) },
    { action: 'book_issued', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[7].title, studentName: students[4].name },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { action: 'book_returned', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[2].title, studentName: students[5].name, fineAmount: 0 },
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000) },
    { action: 'book_returned', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[4].title, studentName: students[6].name, fineAmount: 0 },
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { action: 'book_returned', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'transaction',
      details: { bookTitle: books[9].title, studentName: students[7].name, fineAmount: 0 },
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000) },
    { action: 'book_reserved', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'reservation',
      details: { bookTitle: books[0].title, studentName: students[5].name, position: 1, autoIssue: true },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { action: 'book_reserved', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'reservation',
      details: { bookTitle: books[0].title, studentName: students[6].name, position: 2, autoIssue: false },
      createdAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000) },
    { action: 'book_reserved', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'reservation',
      details: { bookTitle: books[3].title, studentName: students[7].name, position: 1, autoIssue: true },
      createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000) },
    { action: 'overdue_flagged', actorName: 'System', targetType: 'transaction',
      details: { bookTitle: books[6].title, studentName: students[8].name, daysOverdue: 11 },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { action: 'overdue_flagged', actorName: 'System', targetType: 'transaction',
      details: { bookTitle: books[10].title, studentName: students[9].name, daysOverdue: 11 },
      createdAt: new Date(Date.now() - 55 * 60 * 1000) },
    { action: 'fine_calculated', actorName: 'System', targetType: 'transaction',
      details: { bookTitle: books[6].title, studentName: students[8].name, fineAmount: 55 },
      createdAt: new Date(Date.now() - 50 * 60 * 1000) },
    { action: 'fine_calculated', actorName: 'System', targetType: 'transaction',
      details: { bookTitle: books[10].title, studentName: students[9].name, fineAmount: 55 },
      createdAt: new Date(Date.now() - 45 * 60 * 1000) },
    { action: 'qr_generated', actorName: 'System', targetType: 'book', targetId: books[0]._id,
      details: { bookTitle: books[0].title, barcode: books[0].barcode },
      createdAt: new Date(Date.now() - 40 * 60 * 1000) },
    { action: 'reservation_fulfilled', actorName: 'System (Auto-Issue)', targetType: 'reservation',
      details: { bookTitle: books[7].title, studentName: students[9].name },
      createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { action: 'reservation_cancelled', actorName: 'ELVORA Admin', actor: admin?._id, targetType: 'reservation',
      details: { bookTitle: books[5].title, studentName: students[10].name },
      createdAt: new Date(Date.now() - 20 * 60 * 1000) },
    { action: 'scan_processed', actorName: 'System', targetType: 'book', targetId: books[2]._id,
      details: { bookTitle: books[2].title, identifierType: 'barcode', barcode: books[2].barcode },
      createdAt: new Date(Date.now() - 10 * 60 * 1000) },
  ];
  await AuditLog.insertMany(auditSeeds);
  console.log('✅ Seeded 20 audit log entries');

  console.log('✅ Database seeded: 18 books (with QR tokens), 12 students, 10 transactions, 7 reservations, 20 audit logs, 2 users');
  console.log('🔐 Login: admin@elvora.com / admin123');
}

// ─── MongoDB Connection & Server Start ───────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const isPlaceholder = !mongoUri || mongoUri.includes('your_username') || mongoUri.includes('xxxxx');

    if (isPlaceholder) {
      console.log('📦 No MongoDB URI configured — starting in-memory database...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ Connected to in-memory MongoDB');
      console.log('⚠️  Data will be lost when server stops. Set MONGODB_URI in .env for persistence.');
    } else {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB Atlas');
    }

    // Auto-seed if empty
    await autoSeed();

    app.listen(PORT, '0.0.0.0', () => {
      // Get local network IP for QR code scanning
      const os = require('os');
      const nets = os.networkInterfaces();
      let localIP = 'localhost';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            localIP = net.address;
            break;
          }
        }
        if (localIP !== 'localhost') break;
      }

      console.log(`🚀 ELVORA Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌐 Local:   http://localhost:${PORT}`);
      console.log(`🌐 Network: http://${localIP}:${PORT}`);
      console.log(`📱 QR Scan URL format: http://${localIP}:5173/book/<barcode>`);
      console.log(`📡 SSE: http://localhost:${PORT}/api/events`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
