import { tool } from 'ai'
import { z } from 'zod'
import { getValidGoogleToken } from '../google/tokens'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

export function createGoogleGmailTools(userId: string) {
  return {
    listEmails: tool({
      description: 'List recent emails from Gmail inbox',
      inputSchema: z.object({
        maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of emails'),
        query: z.string().optional().describe('Gmail search query (e.g., "from:john@example.com")'),
        labelIds: z.array(z.string()).optional().describe('Filter by label IDs (e.g., ["INBOX", "UNREAD"])'),
      }),
      async *execute({ maxResults, query, labelIds }) {
        yield { state: 'loading' as const, message: 'Fetching emails...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Gmail not connected' };
          return { error: 'Gmail not connected' };
        }

        const params = new URLSearchParams({ maxResults: String(maxResults) });
        if (query) params.set('q', query);
        if (labelIds?.length) params.set('labelIds', labelIds.join(','));

        const listResponse = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!listResponse.ok) {
          yield { state: 'error' as const, message: 'Failed to list emails' };
          return { error: await listResponse.text() };
        }

        const listData = await listResponse.json();
        const messageIds = listData.messages || [];

        // Fetch details for each message
        const emails = await Promise.all(
          messageIds.slice(0, maxResults).map(async (m: { id: string }) => {
            const msgResponse = await fetch(
              `${GMAIL_API}/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!msgResponse.ok) return null;
            const msg = await msgResponse.json();

            const headers = msg.payload?.headers || [];
            const getHeader = (name: string) => headers.find((h: { name: string; value: string }) => h.name === name)?.value;

            return {
              id: msg.id,
              threadId: msg.threadId,
              snippet: msg.snippet,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              date: getHeader('Date'),
              labelIds: msg.labelIds,
            };
          })
        );

        const validEmails = emails.filter(Boolean);
        yield { state: 'ready' as const, count: validEmails.length };
        return { emails: validEmails };
      },
    }),

    getEmailContent: tool({
      description: 'Get the full content of a specific email',
      inputSchema: z.object({
        messageId: z.string().describe('The ID of the email message'),
      }),
      async *execute({ messageId }) {
        yield { state: 'loading' as const, message: 'Fetching email content...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Gmail not connected' };
          return { error: 'Gmail not connected' };
        }

        const response = await fetch(
          `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          yield { state: 'error' as const, message: 'Failed to fetch email' };
          return { error: await response.text() };
        }

        const msg = await response.json();
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: { name: string; value: string }) => h.name === name)?.value;

        // Extract body content
        let body = '';
        if (msg.payload?.body?.data) {
          body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
        } else if (msg.payload?.parts) {
          const textPart = msg.payload.parts.find(
            (p: { mimeType: string }) => p.mimeType === 'text/plain'
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
          }
        }

        yield { state: 'ready' as const };
        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          body,
        };
      },
    }),

    sendEmail: tool({
      description: 'Send an email via Gmail',
      inputSchema: z.object({
        to: z.string().email().describe('Recipient email address'),
        subject: z.string().describe('Email subject'),
        body: z.string().describe('Email body (plain text)'),
        cc: z.array(z.string().email()).optional().describe('CC recipients'),
        bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
      }),
      async *execute({ to, subject, body, cc, bcc }) {
        yield { state: 'loading' as const, message: 'Sending email...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Gmail not connected' };
          return { error: 'Gmail not connected' };
        }

        // Get user's email for the From header
        const profileResponse = await fetch(`${GMAIL_API}/users/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!profileResponse.ok) {
          yield { state: 'error' as const, message: 'Failed to get user profile' };
          return { error: await profileResponse.text() };
        }

        const profile = await profileResponse.json();
        const fromEmail = profile.emailAddress;

        // Build raw email
        const headers = [
          `From: ${fromEmail}`,
          `To: ${to}`,
          `Subject: ${subject}`,
        ];
        if (cc?.length) headers.push(`Cc: ${cc.join(', ')}`);
        if (bcc?.length) headers.push(`Bcc: ${bcc.join(', ')}`);
        headers.push('Content-Type: text/plain; charset=utf-8');
        headers.push('');
        headers.push(body);

        const rawMessage = Buffer.from(headers.join('\r\n')).toString('base64url');

        const sendResponse = await fetch(`${GMAIL_API}/users/me/messages/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: rawMessage }),
        });

        if (!sendResponse.ok) {
          yield { state: 'error' as const, message: 'Failed to send email' };
          return { error: await sendResponse.text() };
        }

        const sent = await sendResponse.json();
        yield { state: 'ready' as const, messageId: sent.id };
        return { success: true, messageId: sent.id, threadId: sent.threadId };
      },
    }),
  };
}
