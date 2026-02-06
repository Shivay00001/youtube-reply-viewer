// ========================================
// YouTube Auto Reply - Content Script
// With Daily Limit Enforcement
// ========================================

const FREE_DAILY_LIMIT = 5;

class YouTubeAutoReply {
    constructor() {
        this.isEnabled = false;
        this.settings = {};
        this.templates = [];
        this.processedComments = new Set();
        this.observer = null;
        this.replyQueue = [];
        this.isProcessing = false;
        this.dailyUsage = { date: '', count: 0 };
        this.freeLimit = FREE_DAILY_LIMIT;

        this.init();
    }

    async init() {
        // Load saved state
        await this.loadState();

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
            sendResponse({ success: true });
        });

        // Start observing if enabled
        if (this.isEnabled) {
            this.startObserving();
        }

        console.log('[YouTube Auto Reply] Content script initialized');
    }

    async loadState() {
        try {
            const data = await chrome.storage.local.get(['settings', 'templates', 'processedComments', 'dailyUsage']);
            this.settings = data.settings || {};
            this.templates = data.templates || [];
            this.isEnabled = this.settings.autoReplyEnabled || false;
            this.processedComments = new Set(data.processedComments || []);

            // Load daily usage
            const today = new Date().toDateString();
            if (data.dailyUsage && data.dailyUsage.date === today) {
                this.dailyUsage = data.dailyUsage;
            } else {
                this.dailyUsage = { date: today, count: 0 };
            }
        } catch (error) {
            console.error('[YouTube Auto Reply] Failed to load state:', error);
        }
    }

    async saveProcessedComments() {
        try {
            // Keep only last 1000 processed comments
            const comments = Array.from(this.processedComments).slice(-1000);
            await chrome.storage.local.set({ processedComments: comments });
        } catch (error) {
            console.error('[YouTube Auto Reply] Failed to save processed comments:', error);
        }
    }

    async saveDailyUsage() {
        try {
            await chrome.storage.local.set({ dailyUsage: this.dailyUsage });
            // Notify popup about usage update
            chrome.runtime.sendMessage({
                type: 'USAGE_UPDATED',
                dailyUsage: this.dailyUsage
            }).catch(() => { });
        } catch (error) {
            console.error('[YouTube Auto Reply] Failed to save daily usage:', error);
        }
    }

    hasReachedLimit() {
        if (this.settings.isPremium) return false;
        return this.dailyUsage.count >= this.freeLimit;
    }

    handleMessage(message) {
        switch (message.type) {
            case 'TOGGLE_AUTO_REPLY':
                this.isEnabled = message.enabled;
                this.settings = message.settings;
                this.templates = message.templates;
                if (message.dailyUsage) this.dailyUsage = message.dailyUsage;
                if (message.freeLimit) this.freeLimit = message.freeLimit;

                if (this.isEnabled) {
                    this.startObserving();
                    this.scanExistingComments();
                } else {
                    this.stopObserving();
                }
                break;

            case 'GET_STATUS':
                return {
                    enabled: this.isEnabled,
                    queueLength: this.replyQueue.length,
                    dailyUsage: this.dailyUsage
                };
        }
    }

    // ========================================
    // Comment Observation
    // ========================================
    startObserving() {
        if (this.observer) return;

        // Wait for comments section to load
        this.waitForComments().then(() => {
            const commentsSection = document.querySelector('#comments');
            if (!commentsSection) return;

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkForNewComments(node);
                        }
                    }
                }
            });

            this.observer.observe(commentsSection, {
                childList: true,
                subtree: true
            });

            console.log('[YouTube Auto Reply] Started observing comments');
        });
    }

    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('[YouTube Auto Reply] Stopped observing comments');
        }
    }

    waitForComments() {
        return new Promise((resolve) => {
            const check = () => {
                const comments = document.querySelector('#comments');
                if (comments) {
                    resolve();
                } else {
                    setTimeout(check, 1000);
                }
            };
            check();
        });
    }

    // ========================================
    // Comment Processing
    // ========================================
    scanExistingComments() {
        const comments = document.querySelectorAll('ytd-comment-thread-renderer');
        comments.forEach(comment => this.processComment(comment));
    }

    checkForNewComments(node) {
        if (node.tagName === 'YTD-COMMENT-THREAD-RENDERER') {
            this.processComment(node);
        } else if (node.querySelectorAll) {
            const comments = node.querySelectorAll('ytd-comment-thread-renderer');
            comments.forEach(comment => this.processComment(comment));
        }
    }

    processComment(commentElement) {
        try {
            // Check daily limit first
            if (this.hasReachedLimit()) {
                console.log('[YouTube Auto Reply] Daily limit reached, skipping comment');
                return;
            }

            // Get comment ID
            const commentId = this.getCommentId(commentElement);
            if (!commentId || this.processedComments.has(commentId)) return;

            // Check if this is from channel owner (we skip those)
            if (this.isChannelOwnerComment(commentElement)) return;

            // Check if already has a reply from channel owner
            if (this.hasChannelOwnerReply(commentElement)) return;

            // Get comment data
            const commentData = this.extractCommentData(commentElement);
            if (!commentData) return;

            // Check if should reply based on settings
            if (!this.shouldReply(commentData)) return;

            // Add to queue
            this.addToQueue(commentElement, commentData, commentId);

        } catch (error) {
            console.error('[YouTube Auto Reply] Error processing comment:', error);
        }
    }

    getCommentId(element) {
        // Try to get a unique identifier
        const authorElement = element.querySelector('#author-text');
        const contentElement = element.querySelector('#content-text');

        if (authorElement && contentElement) {
            const author = authorElement.textContent.trim();
            const content = contentElement.textContent.trim().substring(0, 50);
            return `${author}-${content}`.replace(/\s+/g, '-');
        }
        return null;
    }

    isChannelOwnerComment(element) {
        // Check for owner badge
        const ownerBadge = element.querySelector('ytd-author-comment-badge-renderer');
        return !!ownerBadge;
    }

    hasChannelOwnerReply(element) {
        // Check replies for owner badge
        const replies = element.querySelectorAll('ytd-comment-renderer');
        for (const reply of replies) {
            if (reply.querySelector('ytd-author-comment-badge-renderer')) {
                return true;
            }
        }
        return false;
    }

    extractCommentData(element) {
        const authorElement = element.querySelector('#author-text');
        const contentElement = element.querySelector('#content-text');

        if (!authorElement || !contentElement) return null;

        return {
            username: authorElement.textContent.trim().replace('@', ''),
            comment: contentElement.textContent.trim(),
            element: element
        };
    }

    shouldReply(commentData) {
        switch (this.settings.replyMode) {
            case 'all':
                return true;

            case 'keywords':
                if (!this.settings.keywords) return false;
                const keywords = this.settings.keywords.split(',').map(k => k.trim().toLowerCase());
                const comment = commentData.comment.toLowerCase();
                return keywords.some(keyword => comment.includes(keyword));

            case 'questions':
                return commentData.comment.includes('?');

            default:
                return true;
        }
    }

    // ========================================
    // Reply Queue Management
    // ========================================
    addToQueue(element, commentData, commentId) {
        // Double check limit before adding to queue
        if (this.hasReachedLimit()) {
            console.log('[YouTube Auto Reply] Daily limit reached, cannot add to queue');
            return;
        }

        this.replyQueue.push({
            element,
            commentData,
            commentId,
            timestamp: Date.now()
        });

        console.log(`[YouTube Auto Reply] Added to queue: ${commentData.username}`);

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.isProcessing || this.replyQueue.length === 0) return;

        this.isProcessing = true;

        while (this.replyQueue.length > 0 && this.isEnabled) {
            // Check limit before each reply
            if (this.hasReachedLimit()) {
                console.log('[YouTube Auto Reply] Daily limit reached, stopping queue processing');
                this.replyQueue = [];
                break;
            }

            const item = this.replyQueue.shift();

            // Calculate delay
            let delay = (this.settings.replyDelay || 15) * 1000;
            if (this.settings.randomDelay) {
                const variation = delay * 0.3;
                delay += (Math.random() * variation * 2) - variation;
            }

            // Wait before replying
            await this.sleep(delay);

            // Check if still enabled
            if (!this.isEnabled) break;

            // Perform reply
            await this.performReply(item);
        }

        this.isProcessing = false;
    }

    async performReply(item) {
        try {
            // Final limit check before replying
            if (this.hasReachedLimit()) {
                console.log('[YouTube Auto Reply] Daily limit reached, cannot reply');
                return;
            }

            const { element, commentData, commentId } = item;

            // Get template
            const template = this.getTemplate();
            if (!template) {
                console.log('[YouTube Auto Reply] No template available');
                return;
            }

            // Generate reply text
            const replyText = this.generateReplyText(template, commentData);

            // Click reply button
            const replyButton = element.querySelector('#reply-button-end button, #reply-button button');
            if (!replyButton) {
                console.log('[YouTube Auto Reply] Reply button not found');
                return;
            }

            replyButton.click();
            await this.sleep(500);

            // Find and fill reply input
            const replyInput = element.querySelector('#contenteditable-root');
            if (!replyInput) {
                console.log('[YouTube Auto Reply] Reply input not found');
                return;
            }

            replyInput.focus();
            replyInput.textContent = replyText;

            // Trigger input event for YouTube to recognize the text
            replyInput.dispatchEvent(new Event('input', { bubbles: true }));
            await this.sleep(300);

            // Click submit button
            const submitButton = element.querySelector('#submit-button button');
            if (submitButton && !submitButton.disabled) {
                submitButton.click();

                // Mark as processed
                this.processedComments.add(commentId);
                await this.saveProcessedComments();

                // Increment daily usage
                this.dailyUsage.count++;
                await this.saveDailyUsage();

                // Log the reply
                await this.logReply(commentData, replyText);

                console.log(`[YouTube Auto Reply] Replied to: ${commentData.username} (${this.dailyUsage.count}/${this.freeLimit} today)`);
            }

        } catch (error) {
            console.error('[YouTube Auto Reply] Failed to reply:', error);
        }
    }

    getTemplate() {
        if (this.templates.length === 0) return null;

        if (this.settings.rotateTemplates) {
            const randomIndex = Math.floor(Math.random() * this.templates.length);
            return this.templates[randomIndex];
        }

        return this.templates.find(t => t.id === this.settings.activeTemplate) || this.templates[0];
    }

    generateReplyText(template, commentData) {
        let text = template.text;

        // Replace variables
        text = text.replace(/\{username\}/g, commentData.username);
        text = text.replace(/\{channel\}/g, this.getChannelName());
        text = text.replace(/\{video\}/g, this.getVideoTitle());

        return text;
    }

    getChannelName() {
        const channelElement = document.querySelector('#channel-name a');
        return channelElement ? channelElement.textContent.trim() : 'My Channel';
    }

    getVideoTitle() {
        const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
        return titleElement ? titleElement.textContent.trim() : 'this video';
    }

    async logReply(commentData, replyText) {
        try {
            const data = await chrome.storage.local.get(['replies']);
            const replies = data.replies || [];

            replies.unshift({
                username: commentData.username,
                comment: commentData.comment,
                reply: replyText,
                timestamp: Date.now(),
                url: window.location.href
            });

            // Keep only last 100 replies
            const trimmedReplies = replies.slice(0, 100);

            await chrome.storage.local.set({ replies: trimmedReplies });

            // Update badge
            chrome.runtime.sendMessage({ type: 'INCREMENT_BADGE' });

        } catch (error) {
            console.error('[YouTube Auto Reply] Failed to log reply:', error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new YouTubeAutoReply());
} else {
    new YouTubeAutoReply();
}
