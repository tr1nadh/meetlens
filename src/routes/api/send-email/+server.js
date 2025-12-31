import nodemailer from 'nodemailer';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
    try {
        const { recipient, summary, actionItems, pdfBase64 } = await request.json();

        // 1. Format the Action Items (Fixes [object Object] bug)
        let actionItemsHtml = '';
        if (actionItems && Array.isArray(actionItems) && actionItems.length > 0) {
            const listItems = actionItems.map(item => {
                const text = typeof item === 'object' && item !== null 
                    ? (item.task || item.text || item.content || item.description || JSON.stringify(item)) 
                    : item;
                return `<li style="margin-bottom: 10px; color: #334155;">${text}</li>`;
            }).join('');

            actionItemsHtml = `
                <div style="margin-top: 25px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #6366f1; margin-top: 0; font-size: 18px;">✅ Key Action Items</h3>
                    <ul style="padding-left: 20px; margin-bottom: 0;">${listItems}</ul>
                </div>`;
        }

        // 2. Build the Email Template
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
            </div>`;

        // 3. Configure Nodemailer Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: env.GMAIL_ADDRESS,
                pass: env.GMAIL_APP_PASSWORD
            }
        });

        // 4. Send Email
        await transporter.sendMail({
            from: `"AI Meeting Assistant" <${GMAIL_ADDRESS}>`,
            to: recipient,
            subject: `Meeting Analysis - ${new Date().toLocaleDateString()}`,
            html: emailHtml,
            attachments: [{
                filename: `Meeting_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
                content: pdfBase64,
                encoding: 'base64'
            }]
        });

        return json({ success: true, provider: 'nodemailer' });

    } catch (err) {
        console.error('SERVER ERROR:', err);
        return json(
            { success: false, error: err.message || 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}