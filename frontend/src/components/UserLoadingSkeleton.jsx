import React from 'react';

function UsersLoadingSkeleton() {
  return (
    <div className="space-y-0.5 pb-2">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="chat-item pointer-events-none animate-pulse"
          style={{
            background: 'var(--bg-glass)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Avatar Placeholder */}
          <div
            className="flex-shrink-0"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: item % 3 === 0 ? '14px' : '50%',
              background: 'var(--bg-glass-hover)',
              border: '1.5px solid var(--border-subtle)',
            }}
          />
          {/* Info Details Placeholders */}
          <div className="flex-1 min-w-0">
            <div
              className="mb-2"
              style={{
                height: '13px',
                width: '60%',
                background: 'var(--bg-glass-hover)',
                borderRadius: '6px',
              }}
            />
            <div
              style={{
                height: '9px',
                width: '35%',
                background: 'var(--bg-glass)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default UsersLoadingSkeleton;