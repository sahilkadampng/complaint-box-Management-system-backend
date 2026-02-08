import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || `"Complaint Box" <no-reply@localhost>`;

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
} else {
    console.warn('SMTP not configured. Emails will not be sent. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env');
}

export async function sendEmail(to: string | string[], subject: string, html: string, text?: string) {
    if (!transporter) {
        console.warn('sendEmail skipped because transporter is not configured');
        return;
    }

    const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ''),
        html,
    } as const;

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId} to ${Array.isArray(to) ? to.join(',') : to}`);
    } catch (err) {
        console.error('Failed to send email', err);
    }
}
