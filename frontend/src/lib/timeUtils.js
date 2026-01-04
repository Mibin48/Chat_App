// Time formatting utilities
export const formatMessageTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Less than 1 minute
    if (diffInSeconds < 60) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours
    if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Less than 7 days
    if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    // More than 7 days - show date
    const isThisYear = messageTime.getFullYear() === now.getFullYear();

    if (isThisYear) {
        return messageTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return messageTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export const formatFullDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export const formatDateSeparator = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);

    // Reset time to midnight for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

    if (msgDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (msgDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    } else if (messageDate.getFullYear() === now.getFullYear()) {
        return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } else {
        return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
};

export const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};
