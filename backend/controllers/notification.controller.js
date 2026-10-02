/**
 * Notification Controller
 * Manages system notifications and alerts
 */

const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * List all notifications with pagination
 */
exports.getAllNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;

        let query = {};
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ isRead: false });

        const notifications = await Notification.find(query)
            .populate('student', 'name studentId')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
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
            success: false,
            message: 'Failed to fetch notifications.',
            error: error.message
        });
    }
};

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read.',
            data: { notification }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update notification.',
            error: error.message
        });
    }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });

        res.json({
            success: true,
            message: 'All notifications marked as read.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update notifications.',
            error: error.message
        });
    }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Notification deleted.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification.',
            error: error.message
        });
    }
};
