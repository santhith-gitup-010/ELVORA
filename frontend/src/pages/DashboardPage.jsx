/**
 * Dashboard Page
 * Admin overview with stats cards, charts, and recent activity
 */

import { useState, useEffect } from 'react';
import { dashboardAPI, transactionsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
    HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineArrowsRightLeft,
    HiOutlineExclamationTriangle, HiOutlineCheckCircle, HiOutlineBanknotes
} from 'react-icons/hi2';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const DashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, chartsRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getCharts()
            ]);
            setStats(statsRes.data.data);
            setCharts(chartsRes.data.data);

            // Auto-update overdue statuses
            try { await transactionsAPI.updateOverdue(); } catch { }
        } catch (err) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner text="Loading dashboard..." />;

    const statCards = [
        { label: 'Total Books', value: stats?.totalBooks || 0, icon: HiOutlineBookOpen, variant: 'primary', color: '#6366f1' },
        { label: 'Total Students', value: stats?.totalStudents || 0, icon: HiOutlineAcademicCap, variant: 'accent', color: '#06b6d4' },
        { label: 'Books Issued', value: stats?.issuedBooks || 0, icon: HiOutlineArrowsRightLeft, variant: 'info', color: '#3b82f6' },
        { label: 'Overdue Books', value: stats?.overdueBooks || 0, icon: HiOutlineExclamationTriangle, variant: 'danger', color: '#ef4444' },
        { label: 'Books Returned', value: stats?.returnedBooks || 0, icon: HiOutlineCheckCircle, variant: 'success', color: '#10b981' },
        { label: 'Total Fines (₹)', value: stats?.totalFines || 0, icon: HiOutlineBanknotes, variant: 'warning', color: '#f59e0b' },
    ];

    // Prepare chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = charts?.monthlyTransactions?.map(m => ({
        name: monthNames[(m._id.month - 1)] + ' ' + m._id.year,
        issued: m.issued,
        returned: m.returned,
        overdue: m.overdue,
        total: m.total
    })) || [];

    const categoryData = charts?.categoryDistribution?.map(c => ({
        name: c._id,
        value: c.count,
        copies: c.totalCopies
    })) || [];

    const deptData = charts?.departmentDistribution?.map(d => ({
        name: d._id,
        students: d.count
    })) || [];

    return (
        <div className="page-sections animate-fade-in">
            {/* Page Title */}
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</h1>
                <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                    Welcome back! Here's your library overview.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((card, index) => (
                    <div
                        key={card.label}
                        className={`glass-card stat-card stat-card-${card.variant}`}
                        style={{ padding: 20, animationDelay: `${index * 60}ms` }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `${card.color}15`,
                                }}
                            >
                                <card.icon style={{ width: 20, height: 20, color: card.color }} />
                            </div>
                        </div>
                        <p className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {card.value.toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 500, marginTop: 4, color: 'var(--text-muted)' }}>
                            {card.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="charts-grid">
                {/* Monthly Transactions */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                        Monthly Transactions
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="issued" stroke="#6366f1" fillOpacity={1} fill="url(#colorIssued)" strokeWidth={2} />
                            <Area type="monotone" dataKey="returned" stroke="#10b981" fillOpacity={1} fill="url(#colorReturned)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                        Books by Category
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {categoryData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <Legend
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-grid">
                {/* Department Distribution */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                        Students by Department
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={deptData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Borrowed Books */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                        Top Borrowed Books
                    </h3>
                    <div className="top-books-list">
                        {charts?.topBooks?.length > 0 ? charts.topBooks.map((book, index) => (
                            <div key={index} className="top-book-item">
                                <div
                                    className="rank"
                                    style={{ background: `${CHART_COLORS[index % CHART_COLORS.length]}20`, color: CHART_COLORS[index % CHART_COLORS.length] }}
                                >
                                    {index + 1}
                                </div>
                                <div className="book-info">
                                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {book.title}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book.author}</p>
                                </div>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                                    {book.count}×
                                </span>
                            </div>
                        )) : (
                            <p style={{ fontSize: '0.875rem', textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                No transaction data yet
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                    Recent Transactions
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Student</th>
                                <th>Book</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {charts?.recentTransactions?.length > 0 ? charts.recentTransactions.map((txn) => (
                                <tr key={txn._id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{txn.transactionId}</td>
                                    <td>{txn.student?.name || 'N/A'}</td>
                                    <td>{txn.book?.title || 'N/A'}</td>
                                    <td>
                                        <span className={`badge badge-${txn.status}`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.75rem' }}>{new Date(txn.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        No transactions yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
