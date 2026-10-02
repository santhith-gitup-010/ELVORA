import { useState, useEffect } from 'react';
import { studentsAPI } from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineMagnifyingGlass, HiOutlineAcademicCap, HiOutlineFunnel } from 'react-icons/hi2';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Information Technology', 'Chemical', 'Biomedical', 'Aerospace', 'Arts', 'Commerce', 'Science', 'Other'];

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editStudent, setEditStudent] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [form, setForm] = useState({ studentId: '', name: '', email: '', phone: '', department: 'Computer Science', year: 1 });

    useEffect(() => { fetchStudents(); }, [search, department, pagination.page]);

    const fetchStudents = async () => {
        try {
            const res = await studentsAPI.getAll({ search: search || undefined, department: department !== 'all' ? department : undefined, page: pagination.page, limit: 15 });
            setStudents(res.data.data.students);
            setPagination(res.data.data.pagination);
        } catch { toast.error('Failed to load students'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editStudent) { await studentsAPI.update(editStudent._id, form); toast.success('Student updated'); }
            else { await studentsAPI.create(form); toast.success('Student registered'); }
            setShowModal(false); resetForm(); fetchStudents();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this student?')) return;
        try { await studentsAPI.delete(id); toast.success('Deleted'); fetchStudents(); } catch { toast.error('Failed'); }
    };

    const openEdit = (s) => { setEditStudent(s); setForm({ studentId: s.studentId, name: s.name, email: s.email, phone: s.phone, department: s.department, year: s.year }); setShowModal(true); };
    const resetForm = () => { setEditStudent(null); setForm({ studentId: '', name: '', email: '', phone: '', department: 'Computer Science', year: 1 }); };

    return (
        <div className="page-sections animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <HiOutlineAcademicCap style={{ width: 28, height: 28, color: '#06b6d4', verticalAlign: 'middle' }} /> Student Management
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>{pagination.total} registered students</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary"><HiOutlinePlus style={{ width: 20, height: 20 }} /> Add Student</button>
            </div>

            <div className="glass-card" style={{ padding: 16 }}>
                <div className="search-filter-bar">
                    <div className="search-wrapper">
                        <HiOutlineMagnifyingGlass style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search students..." value={search} onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input-field" style={{ paddingLeft: 40 }} />
                    </div>
                    <div className="filter-wrapper">
                        <HiOutlineFunnel style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)', zIndex: 1 }} />
                        <select value={department} onChange={e => { setDepartment(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input-field" style={{ paddingLeft: 40, minWidth: 180 }}>
                            <option value="all">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Student ID</th><th>Name</th><th>Department</th><th>Year</th><th>Email</th><th>Phone</th><th>Books</th><th>Actions</th></tr></thead>
                            <tbody>
                                {students.length > 0 ? students.map(s => (
                                    <tr key={s._id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.studentId}</td>
                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                        <td><span className="badge" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{s.department}</span></td>
                                        <td style={{ textAlign: 'center' }}>{s.year}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{s.email}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{s.phone}</td>
                                        <td><span style={{ fontWeight: 700, color: s.booksIssued > 3 ? '#f59e0b' : '#10b981' }}>{s.booksIssued}/5</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => openEdit(s)} className="btn-icon btn-secondary" title="Edit"><HiOutlinePencilSquare style={{ width: 16, height: 16 }} /></button>
                                                <button onClick={() => handleDelete(s._id)} className="btn-icon btn-secondary" style={{ color: '#f87171' }} title="Delete"><HiOutlineTrash style={{ width: 16, height: 16 }} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>No students found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {pagination.pages > 1 && (
                        <div className="pagination-bar">
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.pages}</p>
                            <div className="btn-group">
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1} className="btn btn-secondary btn-sm">Previous</button>
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="btn btn-secondary btn-sm">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editStudent ? 'Edit Student' : 'Register Student'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-grid">
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Student ID *</label><input type="text" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} className="input-field" required disabled={!!editStudent} /></div>
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" required /></div>
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Phone *</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" required /></div>
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Department *</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input-field">{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Year *</label><select value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} className="input-field"><option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option><option value={4}>4th</option></select></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editStudent ? 'Update' : 'Register'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StudentsPage;
