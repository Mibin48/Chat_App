import { sender } from "../lib/brevo.js"
import welcomeEmailTemplate from "./emailTemplate.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
    console.log("INSIDE sendWelcomeEmail (Brevo):");
    console.log({ email, name, clientURL });

    // Since you don't own a custom domain, we must force the recipient to be your verified sandbox email
    // in development so Brevo does not throw errors if you are in a sandbox/restricted account.
    const recipientEmail = email;

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sender: { name: sender.name, email: sender.email },
                to: [{ email: recipientEmail, name }],
                subject: `Welcome to Chat_App, ${name}!`,
                htmlContent: welcomeEmailTemplate(name, clientURL)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error sending welcome email via Brevo:", data);
            throw new Error(data.message || "Failed to send welcome email");
        }

        console.log(`Welcome Email sent successfully via Brevo to ${recipientEmail} (for user: ${name})`, data);
    } catch (error) {
        console.error("Failed to send welcome email via Brevo:", error);
        throw error;
    }
};