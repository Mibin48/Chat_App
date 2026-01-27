import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
    console.log('Testing Resend Email Service...\n');

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY is not set in .env file');
        return;
    }
    console.log('✓ RESEND_API_KEY is configured');

    // Check if email sender is configured
    if (!process.env.EMAIL_FROM) {
        console.error('❌ EMAIL_FROM is not set in .env file');
        return;
    }
    console.log('✓ EMAIL_FROM is configured:', process.env.EMAIL_FROM);

    if (!process.env.EMAIL_FROM_NAME) {
        console.error('❌ EMAIL_FROM_NAME is not set in .env file');
        return;
    }
    console.log('✓ EMAIL_FROM_NAME is configured:', process.env.EMAIL_FROM_NAME);

    // Test sending an email
    console.log('\nAttempting to send test email...');

    try {
        const { data, error } = await resend.emails.send({
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_FROM, // Sending to self for testing
            subject: 'Resend Test Email',
            html: '<h1>Test Email</h1><p>This is a test email from your Chat App to verify Resend is working correctly.</p>'
        });

        if (error) {
            console.error('❌ Error sending email:', error);
            return;
        }

        console.log('✅ Email sent successfully!');
        console.log('Email ID:', data.id);
        console.log('\nResend is working correctly! ✨');

    } catch (error) {
        console.error('❌ Exception occurred:', error.message);
    }
}

testResend();
