# ELVORA — Smart Library Management System

A full-stack, cloud-connected library management system built with **React**, **Node.js/Express**, and **MongoDB Atlas**.

---

## 🗄️ MongoDB Atlas Integration

All book, student, and transaction data lives in **MongoDB Atlas** (or in-memory MongoDB for instant local demo).

### Quick Setup (3 steps)

1. **Create a free MongoDB Atlas cluster**
   - Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
   - Create a free M0 cluster → click **Connect** → **Drivers** → copy the URI

2. **Edit `backend/.env`**
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/elvora?retryWrites=true&w=majority
   ```
   Replace `<username>`, `<password>`, and the cluster host with your real values.
   Also whitelist your IP in Atlas → **Network Access** (or use `0.0.0.0/0` for dev).

3. **Start the servers** (see below) — the backend auto-seeds 18 books, 12 students, and sample transactions if the DB is empty.

> **No Atlas account?** Leave `MONGODB_URI` as the placeholder. The server automatically starts an in-memory MongoDB and seeds it — perfect for demos. Data is wiped when the server restarts.

---

## 🚀 Running the Application

### Backend (Express + MongoDB)
```bash
cd backend
npm install
npm run dev        # starts on http://localhost:5000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

### Default Login Credentials
| Email | Password | Role |
|-------|----------|------|
| admin@elvora.com | admin123 | Admin |
| librarian@elvora.com | lib123 | Librarian |

---

## 📡 REST API Reference

Base URL: `http://localhost:5000/api`
All routes (except `/auth/login`) require a `Bearer <JWT>` token.

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/books` | Get all books (search, filter, paginate) |
| `GET` | `/api/books/:id` | Get book by MongoDB `_id` |
| `GET` | `/api/books/barcode/:barcode` | Get book by barcode (ESP32) |
| `POST` | `/api/books` | Add new book |
| `PUT` | `/api/books/:id` | Update book |
| `DELETE` | `/api/books/:id` | Delete book |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students` | Get all students |
| `GET` | `/api/students/:id` | Get student by `_id` |
| `POST` | `/api/students` | Register student |
| `PUT` | `/api/students/:id` | Update student |
| `DELETE` | `/api/students/:id` | Delete student |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | Get all transactions (filter by status) |
| `POST` | `/api/transactions/issue` | Issue a book to a student |
| `POST` | `/api/transactions/return/:id` | Return a book (auto-calculates fine) |
| `POST` | `/api/transactions/update-overdue` | Mark overdue transactions |

### IoT / ESP32 Scan
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Process barcode scan (auto issue or return) |
| `POST` | `/api/scan/fingerprint` | Authenticate student by fingerprint hash |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Live library stats |
| `GET` | `/api/dashboard/charts` | Chart data (monthly, category, dept) |

---

## 📋 MongoDB Field Bindings (UI ↔ Database)

| MongoDB Field | UI Label | Description |
|---------------|----------|-------------|
| `title` | Book Title | Name of the book |
| `author` | Author Name | Author of the book |
| `availableCount` | Availability | Copies currently available |
| `totalCount` | Total Copies | Total copies in library |
| `category` | Category | Book genre/subject |
| `barcode` | Barcode / ID | ELVORA barcode (ELV-XXXX-XXXX) |
| `status` | Issue Status | Derived: Available / Partially / Fully Issued |

---

## 🔌 ESP32 Integration Guide

The backend is ready for ESP32 barcode scanner integration.

### Scan Endpoint
```
POST http://<server-ip>:5000/api/scan
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "barcode": "ELV-BK-0001",
  "studentId": "STU-2024-001",
  "action": "issue"   // or "return" — omit for auto-detect
}
```

The ESP32 scans a book barcode → sends the above POST request → the backend:
1. Looks up the book in MongoDB Atlas by barcode
2. Auto-detects whether to issue or return
3. Updates `availableCount` in MongoDB
4. Creates a transaction record
5. Returns the result with `{ success, action, message, data }`

### Fetch a Book (GET)
```
GET http://<server-ip>:5000/api/books/barcode/ELV-BK-0001
Authorization: Bearer <jwt_token>
```

---

## 🏗️ Project Structure

```
ELVORA/
├── backend/
│   ├── .env                    ← MongoDB Atlas URI goes here
│   ├── server.js               ← Express app + auto-seed
│   ├── models/
│   │   ├── Book.js             ← title, author, barcode, availableCount
│   │   ├── Student.js          ← studentId, name, department, booksIssued
│   │   ├── Transaction.js      ← issue/return with fine calculation
│   │   ├── User.js             ← admin/librarian accounts
│   │   └── Notification.js     ← system alerts
│   ├── controllers/
│   │   ├── book.controller.js
│   │   ├── student.controller.js
│   │   ├── transaction.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── scan.controller.js  ← ESP32 integration
│   │   └── auth.controller.js
│   └── routes/                 ← Express routers
│
└── frontend/
    ├── .env                    ← VITE_API_URL=http://localhost:5000/api
    └── src/
        ├── services/
        │   ├── api.js           ← Axios client with JWT interceptor
        │   └── mongoAtlasAPI.js ← MongoDB Atlas REST helpers + field bindings
        └── pages/
            ├── DashboardPage.jsx    ← Live stats + charts from MongoDB
            ├── BooksPage.jsx        ← Full CRUD — all data from MongoDB
            ├── StudentsPage.jsx     ← Student management from MongoDB
            ├── TransactionsPage.jsx ← Issue/return with live MongoDB updates
            ├── MongoDBBooksPage.jsx ← MongoDB Atlas demo + fetch-by-ID
            └── ScannerPage.jsx      ← IoT/ESP32 barcode simulation
```
