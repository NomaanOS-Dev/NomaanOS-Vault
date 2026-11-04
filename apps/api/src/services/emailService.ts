import nodemailer, { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  appBaseUrl: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    this.config = {
      host: process.env.SMTP_HOST || '',
      port,
      secure: port === 465,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM_EMAIL || 'NomaanOS Vault <noreply@nomaanos.com>',
      appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    };

    if (this.config.host) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.user
          ? {
              user: this.config.user,
              pass: this.config.password,
            }
          : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config.host);
  }

  /**
   * Send Account Verification Email
   */
  public async sendVerificationEmail(
    toEmail: string,
    rawToken: string,
    name: string = 'User'
  ): Promise<boolean> {
    const verificationUrl = `${this.config.appBaseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const subject = 'Verify your NomaanOS Vault account';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202923;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E9E5; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <tr>
            <td style="padding: 32px 36px; border-bottom: 1px solid #E5E9E5; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #E7F4EF; border: 1px solid #B7E3D6; border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 18px;">🛡️</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 17px; font-weight: 700; color: #202923; letter-spacing: -0.3px;">NomaanOS Vault</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #202923; margin: 0 0 16px 0; letter-spacing: -0.4px;">Verify your email address</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #78827B; margin: 0 0 24px 0;">
                Hello <strong>${escapeHtml(name)}</strong>,<br><br>
                Thank you for creating an account with NomaanOS Vault. To protect your zero-knowledge encryption foundation, please confirm your email address.
              </p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #168568; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 6px rgba(22, 133, 104, 0.25);">
                  Verify Account & Set Master Password
                </a>
              </div>
              <p style="font-size: 12px; line-height: 1.5; color: #78827B; margin: 0 0 16px 0;">
                Or copy and paste this verification link into your browser:<br>
                <a href="${verificationUrl}" style="color: #168568; word-break: break-all;">${verificationUrl}</a>
              </p>
              <div style="background-color: #F7F8F5; border: 1px solid #E5E9E5; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
                <p style="font-size: 12px; color: #78827B; margin: 0;">
                  ⏳ This link expires in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F7F8F5; padding: 20px 36px; border-top: 1px solid #E5E9E5; text-align: center;">
              <p style="font-size: 11px; color: #78827B; margin: 0;">
                Zero-Knowledge Cryptographic Workspace &bull; NomaanOS Vault
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const text = `NomaanOS Vault - Account Verification

Hello ${name},

Please verify your email address to complete your account registration:
${verificationUrl}

This link expires in 24 hours. If you did not create an account, you can safely ignore this email.`;

    return this.sendMail(toEmail, subject, text, html);
  }

  /**
   * Send Master Password Hint via Dedicated Private Email
   */
  public async sendMasterPasswordHintEmail(
    toEmail: string,
    hint: string,
    name: string = 'User'
  ): Promise<boolean> {
    const subject = 'Your NomaanOS Vault Master Password Hint';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202923;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E9E5; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <tr>
            <td style="padding: 32px 36px; border-bottom: 1px solid #E5E9E5; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 18px;">🔑</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 17px; font-weight: 700; color: #202923;">NomaanOS Vault</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #202923; margin: 0 0 16px 0;">Your Master Password Hint</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #78827B; margin: 0 0 20px 0;">
                Hello <strong>${escapeHtml(name)}</strong>,<br><br>
                During your Master Password setup, you configured a private memory hint. As part of our zero-knowledge architecture, this hint is never stored on our servers and has been emailed exclusively to your address.
              </p>
              
              <div style="background-color: #F7F8F5; border: 1px solid #B7E3D6; border-left: 4px solid #168568; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                <p style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #168568; margin: 0 0 6px 0; letter-spacing: 0.5px;">Your Hint:</p>
                <p style="font-size: 16px; font-weight: 600; color: #202923; margin: 0; font-family: monospace;">
                  ${escapeHtml(hint)}
                </p>
              </div>

              <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 18px; margin-top: 24px;">
                <p style="font-size: 12px; color: #92400E; margin: 0; line-height: 1.5;">
                  <strong>Important Security Notice:</strong> Standard email is not end-to-end encrypted. If your hint could reveal your actual password to an unauthorized party, please keep your email account protected with MFA.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F7F8F5; padding: 20px 36px; border-top: 1px solid #E5E9E5; text-align: center;">
              <p style="font-size: 11px; color: #78827B; margin: 0;">
                Zero-Knowledge Cryptographic Workspace &bull; NomaanOS Vault
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const text = `NomaanOS Vault - Master Password Hint

Hello ${name},

Here is your Master Password hint:
"${hint}"

Security Notice: Standard email is not end-to-end encrypted. Never share your master password or recovery key.`;

    return this.sendMail(toEmail, subject, text, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string
  ): Promise<boolean> {
    if (!this.transporter) {
      // In development or when SMTP is unconfigured, log notification without leaking sensitive payload
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EMAIL_SERVICE (DEV)] Mail intended for ${to} with subject "${subject}". (SMTP not configured)`);
        return true;
      }
      console.warn(`[EMAIL_SERVICE] Cannot send mail: SMTP is not configured in production.`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (err: any) {
      console.error(`[EMAIL_SERVICE] Failed to send email to ${to}:`, err.message);
      return false;
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const emailService = new EmailService();
