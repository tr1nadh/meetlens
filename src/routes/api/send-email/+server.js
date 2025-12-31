import nodemailer from 'nodemailer';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
  try {
    const { recipient, summary, actionItems, pdfBase64 } = await request.json();

    // --------- BASIC VALIDATION ----------
    if (!recipient || !summary) {
      throw new Error('Missing required email fields');
    }

    if (!env.GMAIL_ADDRESS || !env.GMAIL_APP_PASSWORD) {
      throw new Error('Email credentials are not configured');
    }

    // --------- FIX: Clean base64 PDF ----------
    const cleanPdfBase64 =
      typeof pdfBase64 === 'string' && pdfBase64.includes(',')
        ? pdfBase64.split(',')[1]
        : pdfBase64;

    // --------- FORMAT ACTION ITEMS ----------
    let actionItemsHtml = '';
    if (Array.isArray(actionItems) && actionItems.length > 0) {
      const listItems = actionItems
        .map((item) => {
          const text =
            typeof item === 'object' && item !== null
              ? item.task ||
                item.text ||
                item.content ||
                item.description ||
                JSON.stringify(item)
              : item;

          return `<li style="margin-bottom: 10px; color: #334155;">${text}</li>`;
        })
        .join('');

      actionItemsHtml = `
        <div style="margin-top: 25px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="color: #6366f1; margin-top: 0; font-size: 18px;">✅ Key Action Items</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">${listItems}</ul>
        </div>
      `;
    }

    // --------- EMAIL TEMPLATE ----------
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #1e293b; background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
        <h1 style="color: #6366f1; text-align: center;">Meeting Insights</h1>

        <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #0f172a;">Summary</h3>
        <p style="line-height: 1.6; white-space: pre-wrap; color: #334155;">${summary}</p>

        ${actionItemsHtml}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px;">
            The full visual dashboard with analysis charts is attached as a PDF.
          </p>
        </div>
      </div>
    `;

    // --------- SMTP TRANSPORT (RAILWAY SAFE) ----------
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.GMAIL_ADDRESS,
        pass: env.GMAIL_APP_PASSWORD
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000
    });

    // --------- SEND EMAIL ----------
    await transporter.sendMail({
      from: `"MeetLens AI" <${env.GMAIL_ADDRESS}>`,
      to: recipient,
      subject: `Meeting Analysis - ${new Date().toLocaleDateString()}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Meeting_Report_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`,
          content: cleanPdfBase64,
          encoding: 'base64'
        }
      ]
    });

    return json({ success: true });
  } catch (err) {
    console.error('SMTP SERVER ERROR:', err);
    return json(
      {
        success: false,
        error: err.message || 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
