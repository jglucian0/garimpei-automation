class SseService {
  constructor() {
    this.clients = new Map();
  }

  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId).push(res);

    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  removeClient(userId, res) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId).filter(client => client !== res);
      if (userClients.length === 0) {
        this.clients.delete(userId);
      } else {
        this.clients.set(userId, userClients);
      }
    }
  }

  sendEventToUser(userId, data) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      const message = `data: ${JSON.stringify(data)}\n\n`;
      userClients.forEach(client => client.write(message));
    }
  }
}

module.exports = new SseService();