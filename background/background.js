// ========================================
// YouTube Auto Reply - Background Service Worker
// Handles badge updates and state management
// ========================================

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('[YouTube Auto Reply] Extension installed');

    // Set default settings
    chrome.storage.local.get(['settings'], (data) => {
        if (!data.settings) {
            chrome.storage.local.set({
                settings: {
                    autoReplyEnabled: false,
                    replyDelay: 15,
                    replyMode: 'all',
                    keywords: '',
                    randomDelay: true,
                    activeTemplate: '',
                    rotateTemplates: false
                },
                templates: [
                    {
                        id: 'default-1',
                        name: 'Thank You',
                        text: 'Thank you so much for your comment, {username}! 🙏'
                    },
                    {
                        id: 'default-2',
                        name: 'Appreciate',
                        text: 'Really appreciate the support, {username}! Glad you enjoyed the video! 😊'
                    }
                ],
                replies: [],
                processedComments: []
            });
        }
    });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'UPDATE_STATE':
            updateBadge(message.enabled);
            break;

        case 'INCREMENT_BADGE':
            incrementBadgeCount();
            break;

        case 'RESET_BADGE':
            chrome.action.setBadgeText({ text: '' });
            break;
    }

    sendResponse({ success: true });
    return true;
});

// Badge management
function updateBadge(isActive) {
    if (isActive) {
        chrome.action.setBadgeBackgroundColor({ color: '#2ea043' });
        chrome.action.setBadgeText({ text: 'ON' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

async function incrementBadgeCount() {
    try {
        const data = await chrome.storage.local.get(['replies']);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayReplies = (data.replies || []).filter(r => new Date(r.timestamp) >= today).length;

        chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
        chrome.action.setBadgeText({ text: todayReplies.toString() });
    } catch (error) {
        console.error('[YouTube Auto Reply] Failed to update badge:', error);
    }
}

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
        // Notify content script about current state
        chrome.storage.local.get(['settings', 'templates'], (data) => {
            if (data.settings && data.settings.autoReplyEnabled) {
                chrome.tabs.sendMessage(tabId, {
                    type: 'TOGGLE_AUTO_REPLY',
                    enabled: true,
                    settings: data.settings,
                    templates: data.templates || []
                }).catch(() => {
                    // Content script might not be ready yet
                });
            }
        });
    }
});
