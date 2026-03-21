import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import 'dotenv/config';

import { registerRoutes } from './routes';
import { serveStatic } from './static';
import { requestLoggingMiddleware, logInfo, logError } from './logger';

const app = express();
const httpServer = createServer(app);

// Extend incoming message to store raw body for signature verification.
declare module 'http' {
    interface IncomingMessage {
        rawBody?: Buffer;
    }
}

// JSON body parser with raw body capture.
app.use(
    express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }),
);

app.use(express.urlencoded({ extended: false }));

// Auth context extraction middleware.
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub;
        } catch (err) {
            userId = undefined;
        }
    }
    if (!userId && typeof req.headers['x-user-id'] === 'string') {
        userId = req.headers['x-user-id'] as string;
    }
    (req as any).auth = { userId };
    next();
});
app.use(requestLoggingMiddleware);

// Bootstrap Server.
(async () => {
    await registerRoutes(httpServer, app);

    // Global error handler.
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';

        logError('internal_server_error', { err: err instanceof Error ? err.message : String(err) });

        if (res.headersSent) {
            return next(err);
        }

        return res.status(status).json({ message });
    });

    // Setup Frontend.
    if (process.env.NODE_ENV === 'production') {
        serveStatic(app);
    } else {
        const { setupVite } = await import('./vite');
        await setupVite(httpServer, app);
    }

    // Starter Server. [ Remote Access Enabled ]
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || '127.0.0.1';

    httpServer.listen(port, host, () => {
        logInfo('server_started', { host, port });
        if (host === '0.0.0.0') {
            logInfo('server_remote_access_enabled', { host: '172.16.1.123', port });
        }
    });
})();
