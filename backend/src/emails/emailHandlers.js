import { resendClient, sender } from "../lib/resend.js"
import welcomeEmailTemplate from "./emailTemplate.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
    console.log("INSIDE sendWelcomeEmail:");
    console.log({ email, name, clientURL });

    // Resend free tier only allows sending to verified email (dash48x48@gmail.com)
    // In production with verified domain, this should be changed to send to actual user email
    const recipientEmail = process.env.NODE_ENV === 'production'
        ? email
        : process.env.VERIFIED_EMAIL || 'dash48x48@gmail.com';

    const { data, error } = await resendClient.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: recipientEmail,
        subject: `Welcome to Chat_App, ${name}!`,
        html: welcomeEmailTemplate(name, clientURL)
    });

    if (error) {
        console.error("Error sending welcome email:", error);
        throw new Error("Failed to send welcome email");
    }
    console.log(`Welcome Email sent successfully to ${recipientEmail} (for user: ${name})`, data);
};