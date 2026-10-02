/**
 * Audit Log Controller
 * Provides read access to the audit trail for administrators
 */

const AuditLog = require('../models/AuditLog');

/**
 * GET /api/audit
 * List audit log entries with filters and pagination
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const {
            action, targetType, actor,
            startDate, endDate,
            page = 1, limit = 50, sort = '-createdAt'
        } = req.query;

        let query = {};

        if (action) query.action = action;
        if (targetType) query.targetType = targetType;
        if (actor) query.actor = actor;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await AuditLog.countDocuments(query);

        const logs = await AuditLog.find(query)
            .populate('actor', 'name email role')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs.', details: error.message }
        });
    }
};

/**
 * GET /api/audit/actions
 * List distinct action types (for filter dropdown)
 */
exports.getActionTypes = async (req, res) => {
    try {
        const actions = await AuditLog.distinct('action');
        res.json({ success: true, data: { actions } });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch action types.' }
        });
    }
};

/**
 * GET /api/audit/stats
 * Audit log summary statistics
 */
exports.getAuditStats = async (req, res) => {
    try {
        const [totalLogs, actionBreakdown, recentActivity] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.find()
                .sort('-createdAt')
                .limit(10)
                .populate('actor', 'name email')
        ]);

        res.json({
            success: true,
            data: { totalLogs, actionBreakdown, recentActivity }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit stats.' }
        });
    }
};
