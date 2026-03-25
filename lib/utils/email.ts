import nodemailer from 'nodemailer';
import { User } from '@/types';

// Initialize the Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email', // Fallback for local testing if needed
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const SENDER_EMAIL = process.env.SMTP_FROM_EMAIL || '"VOICE Gurukul" <noreply@iskconsadhana.org>';

/**
 * Sends a notification email to the managers for a new user registration.
 */
export async function sendRegistrationNotification(
    managerEmail: string,
    managerName: string,
    newUser: any,
    approveLink: string
) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Registration Mail to ${managerEmail} for user ${newUser.name}`);
        console.warn(`Approve Link: ${approveLink}`);
        return true;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #ea580c; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">New Registration</h1>
                </div>
                <div style="padding: 30px; color: #333333; line-height: 1.6;">
                    <p style="margin-top: 0; font-size: 16px;">Hare Krishna <strong>${managerName}</strong>,</p>
                    <p style="font-size: 16px;">A new user has registered for the VOICE Gurukul and is awaiting your approval.</p>
                    
                    <h3 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-top: 25px; font-size: 18px;">User Details</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 15px;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 40%; color: #6b7280;"><strong>Name:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${newUser.name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><strong>Email:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${newUser.email || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><strong>Phone:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${newUser.phone || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><strong>Counselor:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                                ${newUser.hierarchy?.counselor === 'Other' ? (newUser.hierarchy?.otherCounselor || 'Other') : (newUser.hierarchy?.counselor || 'N/A')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><strong>Role / Ashram:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${newUser.hierarchy?.ashram || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><strong>Temple:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                                ${newUser.hierarchy?.currentTemple === 'Other' ? (newUser.hierarchy?.otherTemple || 'Other') : (newUser.hierarchy?.currentTemple || 'N/A')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #6b7280;"><strong>Center:</strong></td>
                            <td style="padding: 10px 0; font-weight: 500;">
                                ${newUser.hierarchy?.currentCenter === 'Other' ? (newUser.hierarchy?.otherCenter || 'Other') : (newUser.hierarchy?.currentCenter || 'N/A')}
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${approveLink}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Approve User Now</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-bottom: 0;">If you'd like to reject the user, please log into the admin dashboard to process the rejection.</p>
                </div>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: SENDER_EMAIL,
            to: managerEmail,
            subject: 'Action Required: New Registration',
            html: htmlContent,
        });
        return true;
    } catch (error) {
        console.error('Failed to send registration email:', error);
        return false;
    }
}

/**
 * Sends a welcome/approval notification to the newly approved user.
 */
export async function sendApprovalNotification(userEmail: string, userName: string, dashboardUrl: string) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Approval Welcome Mail to ${userEmail} for user ${userName}`);
        return true;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #ea580c; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Account Approved!</h1>
                </div>
                <div style="padding: 30px; color: #333333; line-height: 1.6;">
                    <p style="margin-top: 0; font-size: 16px;">Hare Krishna <strong>${userName}</strong>,</p>
                    <p style="font-size: 16px;">Your registration for the VOICE Gurukul has been reviewed and <strong>approved</strong>!</p>
                    <p style="font-size: 16px;">You can now log in and access your dashboard to begin tracking your sadhana and staying connected with your center.</p>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${dashboardUrl}" style="background-color: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Go to Dashboard</a>
                    </div>
                    
                    <div style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 30px; font-style: italic; line-height: 1.8;">
                        Hare Krishna Hare Krishna Krishna Krishna Hare Hare<br/>
                        Hare Rama Hare Rama Rama Rama Hare Hare
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: SENDER_EMAIL,
            to: userEmail,
            subject: 'Your Account is Approved!',
            html: htmlContent,
        });
        return true;
    } catch (error) {
        console.error('Failed to send approval email:', error);
        return false;
    }
}

/**
 * Sends a rejection notification to the user.
 */
export async function sendRejectionNotification(userEmail: string, userName: string, rejectionReason: string) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Rejection Mail to ${userEmail} for user ${userName}`);
        console.warn(`Reason: ${rejectionReason}`);
        return true;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #dc2626; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Application Status Update</h1>
                </div>
                <div style="padding: 30px; color: #333333; line-height: 1.6;">
                    <p style="margin-top: 0; font-size: 16px;">Hare Krishna <strong>${userName}</strong>,</p>
                    <p style="font-size: 16px;">Thank you for your interest in VOICE Gurukul. After reviewing your registration, we are unable to approve your application at this time.</p>
                    
                    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Reason for Rejection:</h4>
                        <p style="margin: 0; color: #7f1d1d; font-style: italic;">&ldquo;${rejectionReason}&rdquo;</p>
                    </div>

                    <p style="font-size: 16px;">Don't worry! You can log in to your account to update your details and resubmit your application for review.</p>
                    
                    <div style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 30px; font-style: italic; line-height: 1.8;">
                        Hare Krishna Hare Krishna Krishna Krishna Hare Hare<br/>
                        Hare Rama Hare Rama Rama Rama Hare Hare
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: SENDER_EMAIL,
            to: userEmail,
            subject: 'Update Regarding Your Registration',
            html: htmlContent,
        });
        return true;
    } catch (error) {
        console.error('Failed to send rejection email:', error);
        return false;
    }
}
