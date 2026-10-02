import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import BookOverviewPage from './pages/BookOverviewPage';
import StudentsPage from './pages/StudentsPage';
import TransactionsPage from './pages/TransactionsPage';
import ScannerPage from './pages/ScannerPage';
import ReservationsPage from './pages/ReservationsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import MongoDBBooksPage from './pages/MongoDBBooksPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes — no login required */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/book/:barcode" element={<BookOverviewPage />} />

            {/* Authenticated dashboard routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/audit" element={<AuditTrailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/mongodb-atlas" element={<MongoDBBooksPage />} />
              <Route path="/mongodb-books" element={<MongoDBBooksPage />} />
              <Route path="/firebase-books" element={<MongoDBBooksPage />} />
              {/* QR token short-link fallback */}
              <Route path="/b/:token" element={<BookDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

