/**
 * Database Seed Script
 * Populates the database with sample data for testing
 * 
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Book = require('./models/Book');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
const Notification = require('./models/Notification');

const sampleBooks = [
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', isbn: '978-0262033848', totalCount: 5, publisher: 'MIT Press', edition: '3rd', location: 'Shelf A-1' },
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', isbn: '978-0132350884', totalCount: 3, publisher: 'Prentice Hall', edition: '1st', location: 'Shelf A-2' },
    { title: 'Design Patterns', author: 'Gang of Four', category: 'Computer Science', isbn: '978-0201633610', totalCount: 4, publisher: 'Addison-Wesley', edition: '1st', location: 'Shelf A-3' },
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Technology', isbn: '978-0135957059', totalCount: 3, publisher: 'Addison-Wesley', edition: '2nd', location: 'Shelf B-1' },
    { title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', category: 'Computer Science', isbn: '978-0134610993', totalCount: 4, publisher: 'Pearson', edition: '4th', location: 'Shelf B-2' },
    { title: 'Data Structures Using C', author: 'Reema Thareja', category: 'Computer Science', isbn: '978-0198099307', totalCount: 6, publisher: 'Oxford', edition: '2nd', location: 'Shelf B-3' },
    { title: 'Engineering Mathematics', author: 'B.S. Grewal', category: 'Mathematics', isbn: '978-8174091956', totalCount: 8, publisher: 'Khanna Publishers', edition: '44th', location: 'Shelf C-1' },
    { title: 'Digital Electronics', author: 'Morris Mano', category: 'Electronics', isbn: '978-0132774208', totalCount: 5, publisher: 'Pearson', edition: '5th', location: 'Shelf C-2' },
    { title: 'Computer Networks', author: 'Andrew Tanenbaum', category: 'Computer Science', isbn: '978-0132126953', totalCount: 4, publisher: 'Pearson', edition: '5th', location: 'Shelf C-3' },
    { title: 'Operating System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', isbn: '978-1119800361', totalCount: 5, publisher: 'Wiley', edition: '10th', location: 'Shelf D-1' },
    { title: 'Database System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', isbn: '978-0078022159', totalCount: 4, publisher: 'McGraw-Hill', edition: '7th', location: 'Shelf D-2' },
    { title: 'Thermodynamics: An Engineering Approach', author: 'Yunus Cengel', category: 'Engineering', isbn: '978-0073398174', totalCount: 3, publisher: 'McGraw-Hill', edition: '8th', location: 'Shelf D-3' },
    { title: 'Strength of Materials', author: 'R.K. Rajput', category: 'Engineering', isbn: '978-8121935029', totalCount: 4, publisher: 'S. Chand', edition: '6th', location: 'Shelf E-1' },
    { title: 'The Art of Electronics', author: 'Paul Horowitz', category: 'Electronics', isbn: '978-0521809269', totalCount: 3, publisher: 'Cambridge University Press', edition: '3rd', location: 'Shelf E-2' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Literature', isbn: '978-0060935467', totalCount: 6, publisher: 'Harper Perennial', edition: '1st', location: 'Shelf F-1' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', isbn: '978-0553380163', totalCount: 4, publisher: 'Bantam', edition: '10th Anniversary', location: 'Shelf F-2' },
    { title: 'Principles of Economics', author: 'N. Gregory Mankiw', category: 'Business', isbn: '978-1305585126', totalCount: 5, publisher: 'Cengage', edition: '8th', location: 'Shelf F-3' },
    { title: 'Machine Learning', author: 'Tom Mitchell', category: 'Computer Science', isbn: '978-0070428072', totalCount: 3, publisher: 'McGraw-Hill', edition: '1st', location: 'Shelf G-1' },
    { title: 'Signals and Systems', author: 'Alan Oppenheim', category: 'Electronics', isbn: '978-0138147570', totalCount: 4, publisher: 'Prentice Hall', edition: '2nd', location: 'Shelf G-2' },
    { title: 'Fluid Mechanics', author: 'Frank White', category: 'Engineering', isbn: '978-0073398273', totalCount: 3, publisher: 'McGraw-Hill', edition: '8th', location: 'Shelf G-3' },
];

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

async function seed() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Book.deleteMany({}),
            Student.deleteMany({}),
            Transaction.deleteMany({}),
            Notification.deleteMany({})
        ]);

        // Create admin user
        console.log('👤 Creating admin user...');
        await User.create({
            name: 'ELVORA Admin',
            email: 'admin@elvora.com',
            password: 'admin123',
            role: 'admin'
        });

        // Create librarian
        await User.create({
            name: 'Library Staff',
            email: 'librarian@elvora.com',
            password: 'lib123',
            role: 'librarian'
        });

        // Seed books with barcodes
        console.log('📚 Seeding books...');
        const booksToCreate = sampleBooks.map((book, index) => ({
            ...book,
            availableCount: book.totalCount,
            barcode: `ELV-BK-${String(index + 1).padStart(4, '0')}`
        }));
        const books = await Book.insertMany(booksToCreate);

        // Seed students
        console.log('👨‍🎓 Seeding students...');
        const students = await Student.insertMany(sampleStudents);

        // Create sample transactions
        console.log('🔄 Creating sample transactions...');
        const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;

        // Issue some books (active)
        const issuePairs = [
            { si: 0, bi: 0 }, { si: 1, bi: 3 }, { si: 2, bi: 5 },
            { si: 3, bi: 1 }, { si: 4, bi: 7 }
        ];

        for (const pair of issuePairs) {
            const issueDate = new Date();
            issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 10));
            const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

            await Transaction.create({
                student: students[pair.si]._id,
                book: books[pair.bi]._id,
                issueDate,
                dueDate,
                status: 'issued'
            });

            // Update counts
            books[pair.bi].availableCount -= 1;
            await books[pair.bi].save();
            students[pair.si].booksIssued += 1;
            await students[pair.si].save();
        }

        // Create some returned transactions
        const returnPairs = [
            { si: 5, bi: 2 }, { si: 6, bi: 4 }, { si: 7, bi: 9 }
        ];

        for (const pair of returnPairs) {
            const issueDate = new Date();
            issueDate.setDate(issueDate.getDate() - 20);
            const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
            const returnDate = new Date();
            returnDate.setDate(returnDate.getDate() - 2);

            await Transaction.create({
                student: students[pair.si]._id,
                book: books[pair.bi]._id,
                issueDate,
                dueDate,
                returnDate,
                status: 'returned',
                fineAmount: 0
            });
        }

        // Create overdue transactions
        const overduePairs = [
            { si: 8, bi: 6 }, { si: 9, bi: 10 }
        ];

        for (const pair of overduePairs) {
            const issueDate = new Date();
            issueDate.setDate(issueDate.getDate() - 25);
            const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
            const overdueDays = Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24));
            const finePerDay = parseInt(process.env.FINE_PER_DAY) || 5;

            await Transaction.create({
                student: students[pair.si]._id,
                book: books[pair.bi]._id,
                issueDate,
                dueDate,
                status: 'overdue',
                fineAmount: overdueDays * finePerDay
            });

            books[pair.bi].availableCount -= 1;
            await books[pair.bi].save();
            students[pair.si].booksIssued += 1;
            await students[pair.si].save();
        }

        // Create sample notifications
        console.log('🔔 Creating sample notifications...');
        await Notification.insertMany([
            {
                type: 'system',
                title: 'Welcome to ELVORA',
                message: 'ELVORA Smart Library Management System has been initialized successfully.',
                priority: 'low'
            },
            {
                type: 'overdue',
                title: 'Books Overdue',
                message: 'There are 2 overdue books that need attention.',
                priority: 'high'
            },
            {
                type: 'due_reminder',
                title: 'Books Due Soon',
                message: 'Multiple books are due within the next 3 days.',
                priority: 'medium'
            }
        ]);

        console.log('\n✅ Database seeded successfully!');
        console.log('─────────────────────────────────────');
        console.log(`📚 Books: ${books.length}`);
        console.log(`👨‍🎓 Students: ${students.length}`);
        console.log(`🔄 Transactions: ${issuePairs.length + returnPairs.length + overduePairs.length}`);
        console.log('─────────────────────────────────────');
        console.log('🔐 Admin Login:');
        console.log('   Email: admin@elvora.com');
        console.log('   Password: admin123');
        console.log('─────────────────────────────────────');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seed();
