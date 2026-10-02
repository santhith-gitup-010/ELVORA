/**
 * Server-Sent Events (SSE) Manager
 * Manages real-time event broadcasting to connected clients
 * Supports channel-based subscriptions for targeted updates
 */

class SSEManager {
    constructor() {
        this.clients = new Map(); // clientId -> { res, channels }
        this.clientCounter = 0;
    }

    /**
     * Add a new SSE client connection
     */
    addClient(req, res, channels = ['all']) {
        const clientId = ++this.clientCounter;

        // SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no'
        });

        // Send initial connection event
        res.write(`event: connected\ndata: ${JSON.stringify({ clientId, channels })}\n\n`);

        // Keep-alive heartbeat every 30s
        const heartbeat = setInterval(() => {
            res.write(`:heartbeat ${Date.now()}\n\n`);
        }, 30000);

        this.clients.set(clientId, { res, channels: new Set(channels), heartbeat });

        // Clean up on disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            this.clients.delete(clientId);
        });

        return clientId;
    }

    /**
     * Broadcast event to all clients on a channel
     */
    broadcast(eventName, data, channel = 'all') {
        const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

        for (const [, client] of this.clients) {
            if (client.channels.has(channel) || client.channels.has('all')) {
                try {
                    client.res.write(payload);
                } catch (err) {
                    // Client disconnected; will be cleaned up
                }
            }
        }
    }

    /**
     * Send event to a specific client
     */
    sendToClient(clientId, eventName, data) {
        const client = this.clients.get(clientId);
        if (client) {
            try {
                client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch (err) {
                // Noop
            }
        }
    }

    /**
     * Get count of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }

    /**
     * Convenience: broadcast book availability update
     */
    broadcastBookUpdate(book) {
        this.broadcast('book_updated', {
            bookId: book._id,
            title: book.title,
            availableCount: book.availableCount,
            totalCount: book.totalCount,
            timestamp: new Date().toISOString()
        }, 'books');
    }

    /**
     * Convenience: broadcast transaction event
     */
    broadcastTransaction(action, transaction) {
        this.broadcast('transaction', {
            action,
            transactionId: transaction.transactionId || transaction._id,
            timestamp: new Date().toISOString()
        }, 'transactions');
    }

    /**
     * Convenience: broadcast reservation update
     */
    broadcastReservation(action, reservation) {
        this.broadcast('reservation', {
            action,
            reservationId: reservation.reservationId || reservation._id,
            bookId: reservation.book,
            timestamp: new Date().toISOString()
        }, 'reservations');
    }
}

// Singleton instance
const sseManager = new SSEManager();
module.exports = sseManager;
