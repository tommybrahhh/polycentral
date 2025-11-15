const WebSocket = require('ws');

let wss;
const clients = new Set(); // To keep track of all connected WebSocket clients

const initWebSocketServer = (httpServer) => {
    wss = new WebSocket.Server({ server: httpServer });

    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');
        clients.add(ws); // Add new client to the set

        ws.on('message', (message) => {
            console.log(`Received message from client: ${message}`);
            // You can add specific message handling logic here if needed
            // For now, we're primarily focused on server-to-client broadcasts
        });

        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
            clients.delete(ws); // Remove disconnected client from the set
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    wss.on('listening', () => {
        console.log('WebSocket server is listening');
    });

    console.log('WebSocket server initialized.');
};

const broadcastEventResolution = (eventId, data) => {
    if (!wss) {
        console.warn('WebSocket server not initialized. Cannot broadcast event resolution.');
        return;
    }
    const message = JSON.stringify({ type: 'EVENT_RESOLUTION', eventId, data });
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log(`Broadcasted event resolution for event ${eventId}:`, data);
};

const broadcastMessage = (data) => {
    if (!wss) {
        console.warn('WebSocket server not initialized. Cannot broadcast message.');
        return;
    }
    // --- WebSocket Broadcasting Logic ---
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

module.exports = {
    initWebSocketServer,
    broadcastEventResolution,
    broadcastMessage,
};
