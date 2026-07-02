// Auth check
const token = localStorage.getItem('moon_token');
const username = localStorage.getItem('moon_username');
if (!token) {
    window.location.href = 'auth.html';
}

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatWelcome = document.getElementById('chat-welcome');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const usernameDisplay = document.getElementById('username-display');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const logoutBtn = document.getElementById('logout-btn');

// Set username
usernameDisplay.textContent = username || 'User';

// State
let isStreaming = false;

// Load chat history on page load
loadChatHistory();

// Auto-resize textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    sendBtn.disabled = !chatInput.value.trim() || isStreaming;
});

// User menu toggle
userMenuBtn.addEventListener('click', () => {
    userDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.remove('open');
    }
});

// Logout
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('moon_token');
    localStorage.removeItem('moon_username');
    window.location.href = 'auth.html';
});

// Clear chat
clearChatBtn.addEventListener('click', async () => {
    if (!confirm('Clear all chat history?')) return;
    try {
        await fetch(getApiUrl('/api/chat/history'), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        chatMessages.innerHTML = '';
        chatMessages.classList.remove('active');
        chatWelcome.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to clear history:', err);
    }
});

// Suggestion chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const msg = chip.dataset.msg;
        chatInput.value = msg;
        chatInput.dispatchEvent(new Event('input'));
        sendMessage(msg);
    });
});

// Send message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message || isStreaming) return;
    sendMessage(message);
});

// Handle Enter key (Shift+Enter for new line)
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message && !isStreaming) {
            sendMessage(message);
        }
    }
});

async function sendMessage(message) {
    // Show messages area, hide welcome
    chatWelcome.classList.add('hidden');
    chatMessages.classList.add('active');

    // Add user message
    appendMessage('user', message);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    isStreaming = true;

    // Add AI message placeholder
    const aiMessageEl = appendMessage('assistant', '');
    const textEl = aiMessageEl.querySelector('.message-text');
    textEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    // Stream response
    try {
        const response = await fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        if (response.status === 401) {
            localStorage.removeItem('moon_token');
            window.location.href = 'auth.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        textEl.innerHTML = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            textEl.innerHTML = `<div class="error-message">${parsed.error}</div>`;
                            break;
                        }
                        if (parsed.content) {
                            fullText += parsed.content;
                            textEl.innerHTML = formatMarkdown(fullText);
                            scrollToBottom();
                        }
                    } catch (e) {
                        // skip invalid JSON
                    }
                }
            }
        }

        if (!fullText && !textEl.querySelector('.error-message')) {
            textEl.innerHTML = '<div class="error-message">No response received. Check that DeepSeek is running.</div>';
        }
    } catch (err) {
        textEl.innerHTML = `<div class="error-message">Connection error: ${err.message}</div>`;
    } finally {
        isStreaming = false;
        sendBtn.disabled = !chatInput.value.trim();
    }

    scrollToBottom();
}

function appendMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';

    const isUser = role === 'user';
    const avatarClass = isUser ? 'user-avatar' : 'ai-avatar';
    const avatarText = isUser ? (username ? username[0].toUpperCase() : 'U') : '&#9790;';
    const roleName = isUser ? username || 'You' : 'Moon AI';

    messageEl.innerHTML = `
        <div class="message-avatar ${avatarClass}">${avatarText}</div>
        <div class="message-content">
            <div class="message-role">${roleName}</div>
            <div class="message-text">${content ? formatMarkdown(content) : ''}</div>
        </div>
    `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();
    return messageEl;
}

function formatMarkdown(text) {
    // Code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Line breaks to paragraphs
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    // Wrap in paragraph
    if (!text.startsWith('<pre>') && !text.startsWith('<div>')) {
        text = `<p>${text}</p>`;
    }
    return text;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatHistory() {
    try {
        const response = await fetch(getApiUrl('/api/chat/history'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('moon_token');
            window.location.href = 'auth.html';
            return;
        }

        if (!response.ok) return;

        const history = await response.json();
        if (history.length > 0) {
            chatWelcome.classList.add('hidden');
            chatMessages.classList.add('active');
            history.forEach(msg => {
                appendMessage(msg.role, msg.content);
            });
        }
    } catch (err) {
        // Silently fail - user can still chat
        console.error('Failed to load history:', err);
    }
}
