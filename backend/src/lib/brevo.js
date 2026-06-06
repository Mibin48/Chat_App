import dotenv from 'dotenv';
dotenv.config();

export const sender = {
    email: process.env.EMAIL_FROM || "onboarding@resend.dev",
    name: process.env.EMAIL_FROM_NAME || "Mibin Benny",
};
