export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
}

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}


export function generateToken(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}


export function getGmailAuthUrl(config: GmailOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}


export async function exchangeGmailCode(
  code: string,
  config: GmailOAuthConfig
): Promise<OAuthTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshGmailToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function sendGmailWithOAuth(
  to: string,
  subject: string,
  body: string,
  accessToken: string,
  from?: string
): Promise<{ messageId: string }> {

  // Create RFC 2822 formatted email
  const mime = createMimeMessage(from || "me", to, subject, body);

  // Base64 encode the message
  const encoded = btoa(mime).replace(/\+/g, "-").replace(/\//g, "_");

  const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encoded,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send email via Gmail: ${JSON.stringify(error)}`);
  }

  const data = (await response.json()) as { id: string };

  return {
    messageId: data.id,
  };
}

function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string
): string {
  const boundary = "boundary123";
  let message = "";

  message += `From: ${from}\r\n`;
  message += `To: ${to}\r\n`;
  message += `Subject: ${subject}\r\n`;
  message += `MIME-Version: 1.0\r\n`;
  message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  message += `\r\n`;
  message += `--${boundary}\r\n`;
  message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  message += `Content-Transfer-Encoding: 7bit\r\n`;
  message += `\r\n`;
  message += `${body}\r\n`;
  message += `--${boundary}--\r\n`;

  return message;
}
