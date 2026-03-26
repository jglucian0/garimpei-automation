const wppconnect = require('@wppconnect-team/wppconnect');

const messageRouterService = require('./messageRouterService');

class WppService {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  getClient(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    return session?.client || null;
  }

  updateSession(sessionId, data) {
    if (!this.sessionManager) return;
    this.sessionManager.updateSession(sessionId, data);
  }

  getSession(sessionId) {
    return this.sessionManager.getSession(sessionId);
  }

  async initSession(sessionId) {
    try {
      const client = await wppconnect.create(this.createWppOptions(sessionId));

      this.updateSession(sessionId, { client });

      this.checkInitialState(sessionId, client);
      this.registerMessageListener(sessionId, client);
      this.registerInterfaceListener(sessionId);

      return client;
    } catch (error) {
      console.error(`[WppService] Critical error when logging in ${sessionId}:`, error.message);
      this.updateSession(sessionId, { status: 'error' });
    }
  }

  createWppOptions(sessionId) {
    return {
      session: sessionId,
      executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
      autoClose: 0,
      waitForLogin: false,
      headless: true,
      useChrome: false,
      puppeteerOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      },

      catchQR: (base64Qr) => {
        this.updateSession(sessionId, {
          qrcode: base64Qr,
          status: 'qrcode'
        });
      },

      statusFind: (statusSession) => {
        if (statusSession === 'desconnectedMobile' || statusSession === 'browserClose') {
          console.log(`[WPP] Attention: The session ${sessionId} was disconnected by the cell phone or the browser closed!`);
          this.updateSession(sessionId, {
            status: statusSession,
            qrcode: null,
            interfaceReady: false
          });
          return;
        }

        if (statusSession === 'isLogged') {
          this.updateSession(sessionId, {
            status: 'connected',
            qrcode: null
          });
          return;
        }

        if (statusSession !== 'inChat' && statusSession !== 'CONNECTED') {
          this.updateSession(sessionId, { status: 'connecting' });
        }
      }
    };
  }

  checkInitialState(sessionId, client) {
    setTimeout(async () => {
      try {
        const state = await client.getConnectionState();

        if (state === 'CONNECTED') {
          this.updateSession(sessionId, {
            status: 'connected',
            qrcode: null,
            interfaceReady: true
          });
        }
      } catch (error) {
        console.warn(`[WppService] Failed to check initial state of ${sessionId}:`, error.message);
      }
    }, 3000);
  }

  registerMessageListener(sessionId, client) {
    client.onMessage(async (message) => {
      messageRouterService.routeIncomingMessage(client, message, sessionId)
        .catch(err => console.error(`[WppService] Message routing error: ${err.message}`));
    });
  }

  registerInterfaceListener(sessionId) {
    const client = this.getClient(sessionId);

    if (!client) return;

    client.onInterfaceChange((state) => {
      if (state?.mode !== 'MAIN') return;

      const session = this.getSession(sessionId);
      if (!session || session.interfaceReady) return;

      this.updateSession(sessionId, {
        status: 'connected',
        qrcode: null,
        interfaceReady: true
      });
    });
  }

  async closeSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session?.client) return;

    try {
      await session.client.close();
    } catch (error) {
      console.warn(`[WppService] Error: error closing client ${sessionId}:`, error.message);
    }
  }

  async getAllGroups(sessionId) {
    const session = this.getSession(sessionId);
    if (!session?.client) throw new Error('Session not connected');

    try {
      const chats = await session.client.listChats();

      return chats
        .filter(chat => chat.isGroup)
        .map(group => ({
          id: group.id._serialized,
          name: group.name || group.contact?.name || 'Unnamed Group',
          unreadCount: group.unreadCount
        }));
    } catch (error) {
      throw new Error('Failed to list WhatsApp groups.', { cause: error });
    }
  }

  formatDestination(to) {
    if (to.includes('@')) return to;

    const clean = to.replace(/\D/g, '');
    const isGroup = clean.length > 15;

    return isGroup ? `${clean}@g.us` : `${clean}@c.us`;
  }

  async sendText(sessionId, to, message) {
    const session = this.getSession(sessionId);
    if (!session?.client) throw new Error('WhatsApp is not connected');

    const destination = this.formatDestination(to);

    try {
      return await session.client.sendText(destination, message);
    } catch (error) {
      return await session.client.sendText(destination, message);
    }
  }

  async sendImage(sessionId, to, imageUrl, caption) {
    const session = this.getSession(sessionId);
    if (!session?.client) throw new Error('Session not connected or client offline');

    const destination = this.formatDestination(to);

    try {
      return await session.client.sendImage(
        destination,
        imageUrl,
        'produto.jpg',
        caption
      );
    } catch (error) {
      throw new Error('Failed to send image via WhatsApp.', { cause: error });
    }
  }
}

module.exports = WppService;