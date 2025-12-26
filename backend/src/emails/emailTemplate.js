const welcomeEmailTemplate = ( fullName, appUrl ) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to ChatApp</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #e0e7ff, #f8fafc);
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .wrapper {
          padding: 48px 16px;
        }

        .glass-card {
          max-width: 640px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.75);
          border-radius: 22px;
          box-shadow:
            0 30px 60px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          overflow: hidden;
        }

        .header {
          padding: 42px 36px 32px;
          text-align: center;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.9),
            rgba(139, 92, 246, 0.9)
          );
          color: #ffffff;
        }

        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .header p {
          margin-top: 10px;
          font-size: 16px;
          opacity: 0.9;
        }

        .content {
          padding: 40px 36px;
          color: #1f2937;
          font-size: 16px;
          line-height: 1.75;
        }

        .content p {
          margin: 0 0 20px;
        }

        .pill {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          color: #4f46e5;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .feature-box {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          padding: 22px 20px;
          margin: 28px 0;
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .feature-box ul {
          padding-left: 18px;
          margin: 0;
        }

        .feature-box li {
          margin-bottom: 10px;
        }

        .cta {
          text-align: center;
          margin: 36px 0 20px;
        }

        .button {
          display: inline-block;
          padding: 18px 40px;
          border-radius: 999px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff !important;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          box-shadow:
            0 16px 30px rgba(79, 70, 229, 0.45);
        }

        .fallback {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin-top: 22px;
        }

        .link {
          color: #4f46e5;
          word-break: break-all;
          text-decoration: none;
        }

        .footer {
          padding: 26px 28px 32px;
          text-align: center;
          font-size: 13px;
          color: #9ca3af;
        }

        @media (max-width: 600px) {
          .content {
            padding: 32px 24px;
          }
          .header {
            padding: 34px 24px 26px;
          }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="glass-card">
          <div class="header">
            <h1>Welcome to ChatApp ✨</h1>
            <p>Where conversations feel effortless</p>
          </div>

          <div class="content">
            <span class="pill">🎉 Account successfully created</span>

            <p>Hi <strong>${fullName}</strong>,</p>

            <p>
              We’re excited to have you here. ChatApp is designed to make
              conversations feel natural, fast, and personal — whether
              you’re chatting one-on-one or with a group.
            </p>

            <div class="feature-box">
              <ul>
                <li>💬 Real-time messaging with instant delivery</li>
                <li>🔒 Secure conversations by default</li>
                <li>⚡ Clean, distraction-free experience</li>
              </ul>
            </div>

            <p>
              Jump in and start chatting right away — everything is already
              set up for you.
            </p>

            <div class="cta">
              <a href="${appUrl}" class="button" target="_blank">
                Open ChatApp
              </a>
            </div>

            <p class="fallback">
              Button not working? Open this link:<br />
              <a href="${appUrl}" class="link">${appUrl}</a>
            </p>
          </div>

          <div class="footer">
            © 2025 ChatApp · Crafted for meaningful conversations 💬
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};

export default welcomeEmailTemplate;
