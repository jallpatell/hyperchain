import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = ['authorization', 'cookie', 'x-api-key', 'password', 'pass', 'token', 'secret', 'key'];

function redact(value: unknown): unknown {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(redact);
    if (typeof value !== 'object') return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
            out[k] = '[REDACTED]';
        } else {
            out[k] = redact(v);
        }
    }
    return out;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const payload = {
        ts: new Date().toISOString(),
        level,
        message,
        ...(meta ? { meta: redact(meta) } : {}),
    };
    const line = JSON.stringify(payload);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
    write('info', message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
    write('warn', message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
    write('error', message, meta);
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id']?.toString() || crypto.randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const start = Date.now();
    res.on('finish', () => {
        if (req.path.startsWith('/api')) {
            logInfo('api_request', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                durationMs: Date.now() - start,
            });
        }
    });
    next();
}
