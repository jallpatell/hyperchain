export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
}

export interface GmailOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

// Google OAuth config is shared across Gmail, Drive, Sheets
export type GoogleOAuthConfig = GmailOAuthConfig;

export interface SlackOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export function generateToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

// ─── Google OAuth (shared: Gmail, Drive, Sheets) ───────────────────────────

const GOOGLE_SCOPES: Record<string, string[]> = {
    gmail: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
    drive: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
    sheets: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
};

export function getGmailAuthUrl(config: GoogleOAuthConfig, state: string): string {
    return getGoogleAuthUrl(config, state, 'gmail');
}

export function getGoogleAuthUrl(config: GoogleOAuthConfig, state: string, service: 'gmail' | 'drive' | 'sheets'): string {
    const scopes = GOOGLE_SCOPES[service] ?? GOOGLE_SCOPES['gmail'];
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeGoogleCode(code: string, config: GoogleOAuthConfig): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!response.ok) throw new Error(`Failed to exchange code: ${await response.text()}`);
    const data = (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
}

export async function exchangeGmailCode(code: string, config: GoogleOAuthConfig): Promise<OAuthTokens> {
    return exchangeGoogleCode(code, config);
}

export async function exchangeGoogleServiceCode(code: string, config: GoogleOAuthConfig): Promise<OAuthTokens> {
    return exchangeGoogleCode(code, config);
}

async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
        }),
    });
    if (!response.ok) throw new Error(`Failed to refresh token: ${await response.text()}`);
    const data = (await response.json()) as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, refreshToken, expiresAt: Date.now() + data.expires_in * 1000 };
}

export async function refreshGmailToken(refreshToken: string, clientId: string, clientSecret: string): Promise<OAuthTokens> {
    return refreshGoogleToken(refreshToken, clientId, clientSecret);
}

export async function refreshGoogleServiceToken(refreshToken: string, clientId: string, clientSecret: string): Promise<OAuthTokens> {
    return refreshGoogleToken(refreshToken, clientId, clientSecret);
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to get Google user info');
    const data = (await res.json()) as { email: string };
    return data.email;
}

export async function sendGmailWithOAuth(
    to: string,
    subject: string,
    body: string,
    accessToken: string,
    from?: string,
): Promise<{ messageId: string }> {
    const mime = createMimeMessage(from || 'me', to, subject, body);
    const encoded = btoa(mime).replace(/\+/g, '-').replace(/\//g, '_');
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded }),
    });
    if (!response.ok) throw new Error(`Failed to send email via Gmail: ${JSON.stringify(await response.json())}`);
    const data = (await response.json()) as { id: string };
    return { messageId: data.id };
}

function createMimeMessage(from: string, to: string, subject: string, body: string): string {
    const boundary = 'boundary123';
    return [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        body,
        `--${boundary}--`,
    ].join('\r\n');
}

// ─── Google Drive ────────────────────────────────────────────────────────────

export async function listDriveFiles(
    accessToken: string,
    query?: string,
    pageSize = 20,
): Promise<{ files: { id: string; name: string; mimeType: string }[] }> {
    const params = new URLSearchParams({ pageSize: String(pageSize), fields: 'files(id,name,mimeType)' });
    if (query) params.set('q', query);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Drive list error: ${await res.text()}`);
    return res.json();
}

export async function uploadDriveFile(
    accessToken: string,
    name: string,
    content: string,
    mimeType = 'text/plain',
    folderId?: string,
): Promise<{ id: string; name: string }> {
    const metadata: any = { name, mimeType };
    if (folderId) metadata.parents = [folderId];

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: mimeType }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
    });
    if (!res.ok) throw new Error(`Drive upload error: ${await res.text()}`);
    return res.json();
}

export async function getDriveFile(
    accessToken: string,
    fileId: string,
): Promise<{ id: string; name: string; mimeType: string; content?: string }> {
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) throw new Error(`Drive get error: ${await metaRes.text()}`);
    const meta = (await metaRes.json()) as { id: string; name: string; mimeType: string };

    // Download text content for text-based files
    if (meta.mimeType.startsWith('text/') || meta.mimeType === 'application/json') {
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (contentRes.ok) {
            return { ...meta, content: await contentRes.text() };
        }
    }
    return meta;
}

// ─── Google Sheets ───────────────────────────────────────────────────────────

export async function readSheetValues(
    accessToken: string,
    spreadsheetId: string,
    range: string,
): Promise<{ values: any[][] }> {
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`Sheets read error: ${await res.text()}`);
    const data = (await res.json()) as { values?: any[][] };
    return { values: data.values ?? [] };
}

export async function appendSheetValues(
    accessToken: string,
    spreadsheetId: string,
    range: string,
    values: any[][],
): Promise<{ updatedRows: number }> {
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values }),
        },
    );
    if (!res.ok) throw new Error(`Sheets append error: ${await res.text()}`);
    const data = (await res.json()) as { updates?: { updatedRows: number } };
    return { updatedRows: data.updates?.updatedRows ?? 0 };
}

export async function updateSheetValues(
    accessToken: string,
    spreadsheetId: string,
    range: string,
    values: any[][],
): Promise<{ updatedRows: number }> {
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values }),
        },
    );
    if (!res.ok) throw new Error(`Sheets update error: ${await res.text()}`);
    const data = (await res.json()) as { updatedRows: number };
    return { updatedRows: data.updatedRows ?? 0 };
}

// ─── Slack ───────────────────────────────────────────────────────────────────

export function getSlackAuthUrl(config: SlackOAuthConfig, state: string): string {
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: 'chat:write,channels:read,channels:history,users:read',
        state,
    });
    return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function exchangeSlackCode(
    code: string,
    config: SlackOAuthConfig,
): Promise<{ accessToken: string; teamName: string; botUserId: string }> {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
        }),
    });
    if (!res.ok) throw new Error(`Slack token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as any;
    if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);
    return {
        accessToken: data.access_token,
        teamName: data.team?.name ?? 'Unknown',
        botUserId: data.bot_user_id ?? '',
    };
}

export async function sendSlackMessage(
    accessToken: string,
    channel: string,
    text: string,
    blocks?: any[],
): Promise<{ ts: string; channel: string }> {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text, ...(blocks ? { blocks } : {}) }),
    });
    if (!res.ok) throw new Error(`Slack API error: ${await res.text()}`);
    const data = (await res.json()) as any;
    if (!data.ok) throw new Error(`Slack message error: ${data.error}`);
    return { ts: data.ts, channel: data.channel };
}
