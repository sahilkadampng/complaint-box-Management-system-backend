import { Resend } from 'resend';

// ────────────────────────────────────────────────────────
// Resend email service — serverless-friendly, no SMTP pool
// ────────────────────────────────────────────────────────
//
// Required env vars:
//   RESEND_API_KEY  – API key from https://resend.com/api-keys
//   EMAIL_FROM      – Verified sender, e.g. "Complaint Box <noreply@yourdomain.com>"
//
// Domain verification (one-time):
//   1. Go to https://resend.com/domains → Add Domain
//   2. Add the DNS records Resend gives you (MX, TXT/SPF, DKIM CNAME)
//   3. Click "Verify". Once verified, use any address @yourdomain.com as EMAIL_FROM.
//   4. For testing without a domain you can use "onboarding@resend.dev" as EMAIL_FROM.
// ────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Complaint Box <onboarding@resend.dev>';

let resend: Resend | null = null;

if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
} else {
    console.warn(
        '⚠️  RESEND_API_KEY not set. Emails will not be sent. ' +
        'Get your key at https://resend.com/api-keys'
    );
}

/**
 * Send an email via Resend API.
 *
 * @param to      - Single address or array of addresses
 * @param subject - Email subject line
 * @param html    - HTML body
 * @param text    - Optional plain-text fallback (auto-generated from html if omitted)
 */
export async function sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
): Promise<void> {
    if (!resend) {
        console.warn('sendEmail skipped — Resend client not configured');
        return;
    }

    const recipients = Array.isArray(to) ? to : [to];

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: recipients,
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ''),
        });

        if (error) {
            console.error('Resend API error:', error);
            return;
        }

        console.log(
            `✅ Email sent (id: ${data?.id}) to ${recipients.join(', ')}`
        );
    } catch (err) {
        // Log but never throw — email failures must not crash the request
        console.error('Failed to send email:', err);
    }
}
