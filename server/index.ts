import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import 'dotenv/config';

import { registerRoutes } from './routes';
import { serveStatic } from './static';

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

// Clerk user ID extraction middleware
app.use((req, res, next) => {
    // Extract user ID from Clerk's __session cookie or authorization header
    // In production, you'd verify the JWT token here
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract user ID from JWT (simplified - in production use proper JWT verification)
        try {
            const token = authHeader.substring(7);
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            req.headers['x-user-id'] = payload.sub || 'default-user';
        } catch (err) {
            // If parsing fails, use default
            req.headers['x-user-id'] = 'default-user';
        }
    } else {
        // For development, use a default user ID
        req.headers['x-user-id'] = 'default-user';
    }
    next();
});

// Logger Utility.
export function log(message: string, source = 'express') {
    const formattedTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
}

// API Request logger middleware.
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    let capturedJsonResponse: unknown;

    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
        capturedJsonResponse = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        const duration = Date.now() - start;

        if (path.startsWith('/api')) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            log(logLine);
        }
    });

    next();
});

// Bootstrap Server.
(async () => {
    await registerRoutes(httpServer, app);

    // Global error handler.
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';

        console.error('Internal Server Error:', err);

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
        log(`Server running at http://${host}:${port}`);
        if (host === '0.0.0.0') {
            log(`Accessible from remote machines at http://172.16.1.123:${port}`);
        }
    });
})();
