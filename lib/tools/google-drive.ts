import { tool } from 'ai'
import { z } from 'zod'
import { getValidGoogleToken } from '../google/tokens'

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export function createGoogleDriveTools(userId: string) {
  return {
    searchDriveFiles: tool({
      description: 'Search for files in Google Drive',
      inputSchema: z.object({
        query: z.string().describe('Search query to find files'),
        maxResults: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
        mimeType: z.string().optional().describe('Filter by MIME type (e.g., application/pdf)'),
      }),
      async *execute({ query, maxResults, mimeType }) {
        yield { state: 'loading' as const, message: 'Searching Google Drive...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Drive not connected' };
          return { error: 'Google Drive not connected' };
        }

        let q = `fullText contains '${query}'`;
        if (mimeType) {
          q += ` and mimeType='${mimeType}'`;
        }
        q += ' and trashed=false';

        const params = new URLSearchParams({
          q,
          pageSize: String(maxResults),
          fields: 'files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)',
        });

        const response = await fetch(`${DRIVE_API}/files?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          yield { state: 'error' as const, message: 'Failed to search Drive' };
          return { error: await response.text() };
        }

        const data = await response.json();
        const files = data.files || [];

        yield { state: 'ready' as const, count: files.length };
        return {
          files: files.map((f: { id: string; name: string; mimeType: string; webViewLink?: string; createdTime?: string; modifiedTime?: string; size?: string }) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink,
            createdTime: f.createdTime,
            modifiedTime: f.modifiedTime,
            size: f.size,
          })),
        };
      },
    }),

    listRecentFiles: tool({
      description: 'List recently modified files in Google Drive',
      inputSchema: z.object({
        maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of files to return'),
      }),
      async *execute({ maxResults }) {
        yield { state: 'loading' as const, message: 'Fetching recent files...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Drive not connected' };
          return { error: 'Google Drive not connected' };
        }

        const params = new URLSearchParams({
          pageSize: String(maxResults),
          orderBy: 'modifiedTime desc',
          q: 'trashed=false',
          fields: 'files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)',
        });

        const response = await fetch(`${DRIVE_API}/files?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          yield { state: 'error' as const, message: 'Failed to list files' };
          return { error: await response.text() };
        }

        const data = await response.json();
        yield { state: 'ready' as const, count: data.files?.length || 0 };
        return { files: data.files || [] };
      },
    }),

    getFileContent: tool({
      description: 'Get the content of a Google Doc or text file from Drive',
      inputSchema: z.object({
        fileId: z.string().describe('The ID of the file to read'),
      }),
      async *execute({ fileId }) {
        yield { state: 'loading' as const, message: 'Reading file content...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Drive not connected' };
          return { error: 'Google Drive not connected' };
        }

        // First get file metadata
        const metaResponse = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!metaResponse.ok) {
          yield { state: 'error' as const, message: 'Failed to get file metadata' };
          return { error: await metaResponse.text() };
        }

        const meta = await metaResponse.json();
        
        // For Google Docs, export as plain text
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          const exportResponse = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/plain`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!exportResponse.ok) {
            yield { state: 'error' as const, message: 'Failed to export document' };
            return { error: await exportResponse.text() };
          }

          const content = await exportResponse.text();
          yield { state: 'ready' as const, name: meta.name };
          return { name: meta.name, content, mimeType: 'text/plain' };
        }

        // For other files, download content
        const downloadResponse = await fetch(
          `${DRIVE_API}/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!downloadResponse.ok) {
          yield { state: 'error' as const, message: 'Failed to download file' };
          return { error: await downloadResponse.text() };
        }

        const content = await downloadResponse.text();
        yield { state: 'ready' as const, name: meta.name };
        return { name: meta.name, content, mimeType: meta.mimeType };
      },
    }),
  };
}
