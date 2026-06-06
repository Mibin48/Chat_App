import React from 'react';

function MessagesLoadingSkeleton() {
  // Varying widths to simulate realistic chat dialog flows
  const bubbleWidths = [
    { isOwn: false, width: '180px' },
    { isOwn: true,  width: '120px' },
    { isOwn: false, width: '240px' },
    { isOwn: true,  width: '190px' },
    { isOwn: false, width: '140px' },
    { isOwn: true,  width: '80px' },
  ];

  return (
    <div className="flex-1 w-full p-4 space-y-4 overflow-y-auto" style={{ maxWidth: '760px', margin: '0 auto' }}>
      {bubbleWidths.map((msg, index) => (
        <div
          key={index}
          className={`flex items-end gap-1.5 animate-pulse
            ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'}
          `}
        >
          {/* Avatar for other messages */}
          {!msg.isOwn && (
            <div className="flex-shrink-0 w-7">
              <div
                className="w-7 h-7 rounded-full"
                style={{
                  background: 'var(--bg-glass-hover)',
                  border: '1.5px solid var(--border-subtle)',
                }}
              />
            </div>
          )}

          {/* Bubble content */}
          <div
            className={`flex flex-col gap-0.5 ${msg.isOwn ? 'items-end' : 'items-start'}`}
            style={{ maxWidth: 'min(72%, 480px)' }}
          >
            <div
              className={`relative ${msg.isOwn ? 'bubble-own' : 'bubble-other'}`}
              style={{
                width: msg.width,
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                // Keep the exact card/glow shape but fade for loading state
                opacity: 0.65,
              }}
            >
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  background: msg.isOwn ? 'rgba(255, 255, 255, 0.3)' : 'var(--border-medium)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessagesLoadingSkeleton;