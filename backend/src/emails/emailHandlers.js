import { resendClient, sender } from "../lib/resend.js"
import welcomeEmailTemplate from "./emailTemplate.js";

export const sendWelcomeEmail = async(email,name,clientURL) =>{
    console.log("INSIDE sendWelcomeEmail:");
    console.log({ email, name, clientURL });

    const { data,error } = await resendClient.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: email,
        subject:"Welcome to Chat_App!",
        html: welcomeEmailTemplate(name,clientURL)
    });

    if(error){
        console.error("Error sending welcome email:",error);
        throw new Error("Failed to send welcome email");
    }
    console.log("Welcome Email sent successfully",data);
};