// ========================================
// YouTube Auto Reply - Popup Script
// With Daily Limit & License Key System
// ========================================

const FREE_DAILY_LIMIT = 5;
const WHATSAPP_LINK = 'https://wa.me/917479701271?text=Hi!%20I%20want%20to%20upgrade%20YouTube%20Auto%20Reply%20extension%20to%20Premium';

// Pre-generated Premium License Keys (Share these with customers)
const VALID_LICENSE_KEYS = [
    'YTAR-PRO-2026-AXKQ',
    'YTAR-PRO-2026-BMWN',
    'YTAR-PRO-2026-CVZP',
    'YTAR-PRO-2026-DFHT',
    'YTAR-PRO-2026-EJLS',
    'YTAR-PRO-2026-FGMR',
    'YTAR-PRO-2026-GNPQ',
    'YTAR-PRO-2026-HKRT',
    'YTAR-PRO-2026-JLWX',
    'YTAR-PRO-2026-KMZY',
    'YTAR-PRO-2026-LPAB',
    'YTAR-PRO-2026-MQCD',
    'YTAR-PRO-2026-NREF',
    'YTAR-PRO-2026-PSGH',
    'YTAR-PRO-2026-QTIJ',
    'YTAR-PRO-2026-RUKL',
    'YTAR-PRO-2026-SVMN',
    'YTAR-PRO-2026-TWOP',
    'YTAR-PRO-2026-UXQR',
    'YTAR-PRO-2026-VYST'
];

class AutoReplyPopup {
    constructor() {
        this.templates = [];
        this.replies = [];
        this.settings = {
            autoReplyEnabled: false,
            replyDelay: 15,
            replyMode: 'all',
            keywords: '',
            randomDelay: true,
            activeTemplate: '',
            rotateTemplates: false,
            isPremium: false,
            premiumKey: ''
        };
        this.dailyUsage = {
            date: '',
            count: 0
        };

        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderTemplates();
        this.renderReplies();
        this.updateStats();
        this.updateUsageBanner();
        this.updatePremiumUI();
        this.updateUI();
    }

    // ========================================
    // Data Management
    // ========================================
    async loadData() {
        try {
            const data = await chrome.storage.local.get(['templates', 'replies', 'settings', 'dailyUsage']);

            this.templates = data.templates || [
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
            ];

            this.replies = data.replies || [];
            this.settings = { ...this.settings, ...data.settings };

            // Load daily usage and reset if new day
            const today = new Date().toDateString();
            if (data.dailyUsage && data.dailyUsage.date === today) {
                this.dailyUsage = data.dailyUsage;
            } else {
                this.dailyUsage = { date: today, count: 0 };
                await this.saveDailyUsage();
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    async saveData() {
        try {
            await chrome.storage.local.set({
                templates: this.templates,
                replies: this.replies,
                settings: this.settings
            });
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    async saveDailyUsage() {
        try {
            await chrome.storage.local.set({ dailyUsage: this.dailyUsage });
        } catch (error) {
            console.error('Failed to save daily usage:', error);
        }
    }

    // ========================================
    // License Key Validation
    // ========================================
    validateLicenseKey(key) {
        const normalizedKey = key.trim().toUpperCase();
        return VALID_LICENSE_KEYS.includes(normalizedKey);
    }

    async activateLicense() {
        const keyInput = document.getElementById('licenseKey');
        const messageDiv = document.getElementById('licenseMessage');
        const key = keyInput.value.trim().toUpperCase();

        if (!key) {
            messageDiv.textContent = 'Please enter a license key';
            messageDiv.className = 'license-message error';
            return;
        }

        if (this.validateLicenseKey(key)) {
            // Valid key - activate premium
            this.settings.isPremium = true;
            this.settings.premiumKey = key;
            await this.saveData();

            messageDiv.textContent = '✓ License activated successfully! Enjoy unlimited replies.';
            messageDiv.className = 'license-message success';

            this.updatePremiumUI();
            this.updateUsageBanner();
            this.updateUI();
        } else {
            // Invalid key
            messageDiv.textContent = '✗ Invalid license key. Please check and try again.';
            messageDiv.className = 'license-message error';
        }
    }

    async deactivateLicense() {
        if (confirm('Are you sure you want to deactivate your premium license?')) {
            this.settings.isPremium = false;
            this.settings.premiumKey = '';
            await this.saveData();

            this.updatePremiumUI();
            this.updateUsageBanner();
            this.updateUI();
        }
    }

    updatePremiumUI() {
        const premiumStatus = document.getElementById('premiumStatus');
        const licenseForm = document.getElementById('licenseForm');
        const licenseMessage = document.getElementById('licenseMessage');

        if (this.settings.isPremium) {
            // Show premium status
            premiumStatus.innerHTML = `
        <div class="premium-badge-large premium">
          <span>⭐ PREMIUM</span>
          <span class="limit-text">Unlimited replies</span>
        </div>
      `;

            // Hide form, show deactivate option
            licenseForm.innerHTML = `
        <div style="text-align: center; width: 100%;">
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            Key: ${this.settings.premiumKey}
          </p>
          <button class="btn btn-secondary" id="deactivateBtn" style="font-size: 12px;">
            Deactivate License
          </button>
        </div>
      `;

            // Add deactivate listener
            document.getElementById('deactivateBtn').addEventListener('click', () => this.deactivateLicense());

            licenseMessage.className = 'license-message';
            licenseMessage.textContent = '';
        } else {
            // Show free status
            premiumStatus.innerHTML = `
        <div class="premium-badge-large free">
          <span>FREE PLAN</span>
          <span class="limit-text">5 replies/day</span>
        </div>
      `;

            // Show activation form
            licenseForm.innerHTML = `
        <input type="text" class="input license-input" id="licenseKey" placeholder="Enter your license key">
        <button class="btn btn-primary" id="activateBtn">Activate</button>
      `;

            // Add activate listener
            document.getElementById('activateBtn').addEventListener('click', () => this.activateLicense());
        }
    }

    // ========================================
    // Usage & Limits
    // ========================================
    getRemainingReplies() {
        if (this.settings.isPremium) return Infinity;
        return Math.max(0, FREE_DAILY_LIMIT - this.dailyUsage.count);
    }

    hasReachedLimit() {
        if (this.settings.isPremium) return false;
        return this.dailyUsage.count >= FREE_DAILY_LIMIT;
    }

    updateUsageBanner() {
        const usageBanner = document.getElementById('usageBanner');
        const usageBar = document.getElementById('usageBar');
        const usedReplies = document.getElementById('usedReplies');
        const remainingReplies = document.getElementById('remainingReplies');
        const remainingCard = document.getElementById('remainingCard');

        const used = this.dailyUsage.count;
        const remaining = this.getRemainingReplies();
        const percentage = Math.min(100, (used / FREE_DAILY_LIMIT) * 100);

        if (usageBar) usageBar.style.width = `${percentage}%`;
        if (usedReplies) usedReplies.textContent = used;
        if (remainingReplies) remainingReplies.textContent = this.settings.isPremium ? '∞' : remaining;

        // Update banner state
        if (this.hasReachedLimit()) {
            usageBanner.classList.add('limit-reached');
            remainingCard.classList.add('exhausted');
        } else {
            usageBanner.classList.remove('limit-reached');
            remainingCard.classList.remove('exhausted');
        }

        // Update upgrade button based on premium status
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (this.settings.isPremium && upgradeBtn) {
            upgradeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        Premium Active
      `;
            upgradeBtn.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
            upgradeBtn.style.color = '#1a1a1a';
            upgradeBtn.removeAttribute('href');
        }
    }

    // ========================================
    // Event Listeners
    // ========================================
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab').dataset.tab));
        });

        // Template management
        document.getElementById('addTemplateBtn').addEventListener('click', () => this.showTemplateForm());
        document.getElementById('cancelTemplate').addEventListener('click', () => this.hideTemplateForm());
        document.getElementById('saveTemplate').addEventListener('click', () => this.saveTemplate());

        // Settings
        document.getElementById('autoReplyEnabled').addEventListener('change', (e) => {
            this.settings.autoReplyEnabled = e.target.checked;
            this.saveData();
            this.updateUI();
        });

        document.getElementById('replyDelay').addEventListener('change', (e) => {
            this.settings.replyDelay = parseInt(e.target.value);
            this.saveData();
        });

        document.getElementById('replyMode').addEventListener('change', (e) => {
            this.settings.replyMode = e.target.value;
            this.saveData();
            this.toggleKeywordsSetting();
        });

        document.getElementById('keywords').addEventListener('change', (e) => {
            this.settings.keywords = e.target.value;
            this.saveData();
        });

        document.getElementById('randomDelay').addEventListener('change', (e) => {
            this.settings.randomDelay = e.target.checked;
            this.saveData();
        });

        document.getElementById('activeTemplate').addEventListener('change', (e) => {
            this.settings.activeTemplate = e.target.value;
            this.saveData();
        });

        document.getElementById('rotateTemplates').addEventListener('change', (e) => {
            this.settings.rotateTemplates = e.target.checked;
            this.saveData();
        });

        // Start button
        document.getElementById('startBtn').addEventListener('click', () => this.toggleAutoReply());

        // License activation (initial setup)
        const activateBtn = document.getElementById('activateBtn');
        if (activateBtn) {
            activateBtn.addEventListener('click', () => this.activateLicense());
        }
    }

    // ========================================
    // Tab Management
    // ========================================
    switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-content`);
        });
    }

    // ========================================
    // Template Management
    // ========================================
    renderTemplates() {
        const container = document.getElementById('templateList');
        const select = document.getElementById('activeTemplate');

        if (this.templates.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <p>No templates yet</p>
          <span>Create a template to get started</span>
        </div>
      `;
            select.innerHTML = '<option value="">No templates available</option>';
            return;
        }

        container.innerHTML = this.templates.map(template => `
      <div class="template-item ${this.settings.activeTemplate === template.id ? 'active' : ''}" data-id="${template.id}">
        <div class="template-info">
          <div class="template-name">${this.escapeHtml(template.name)}</div>
          <div class="template-preview">${this.escapeHtml(template.text)}</div>
        </div>
        <div class="template-actions">
          <button class="btn-icon" onclick="popup.editTemplate('${template.id}')" title="Edit">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="popup.deleteTemplate('${template.id}')" title="Delete">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    `).join('');

        select.innerHTML = '<option value="">Select template...</option>' +
            this.templates.map(t => `<option value="${t.id}" ${this.settings.activeTemplate === t.id ? 'selected' : ''}>${this.escapeHtml(t.name)}</option>`).join('');
    }

    showTemplateForm(template = null) {
        const form = document.getElementById('templateForm');
        form.classList.remove('hidden');
        form.dataset.editId = template ? template.id : '';

        document.getElementById('templateName').value = template ? template.name : '';
        document.getElementById('templateText').value = template ? template.text : '';
        document.getElementById('templateName').focus();
    }

    hideTemplateForm() {
        const form = document.getElementById('templateForm');
        form.classList.add('hidden');
        form.dataset.editId = '';
        document.getElementById('templateName').value = '';
        document.getElementById('templateText').value = '';
    }

    saveTemplate() {
        const name = document.getElementById('templateName').value.trim();
        const text = document.getElementById('templateText').value.trim();
        const editId = document.getElementById('templateForm').dataset.editId;

        if (!name || !text) {
            alert('Please fill in both fields');
            return;
        }

        if (editId) {
            const index = this.templates.findIndex(t => t.id === editId);
            if (index >= 0) {
                this.templates[index] = { ...this.templates[index], name, text };
            }
        } else {
            this.templates.push({
                id: `template-${Date.now()}`,
                name,
                text
            });
        }

        this.saveData();
        this.renderTemplates();
        this.hideTemplateForm();
    }

    editTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            this.showTemplateForm(template);
        }
    }

    deleteTemplate(id) {
        if (confirm('Delete this template?')) {
            this.templates = this.templates.filter(t => t.id !== id);
            if (this.settings.activeTemplate === id) {
                this.settings.activeTemplate = '';
            }
            this.saveData();
            this.renderTemplates();
        }
    }

    // ========================================
    // Reply History
    // ========================================
    renderReplies() {
        const container = document.getElementById('replyList');

        if (this.replies.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
          <p>No replies yet</p>
          <span>Start auto-replying to see activity here</span>
        </div>
      `;
            return;
        }

        container.innerHTML = this.replies.slice(0, 20).map(reply => `
      <div class="reply-item" onclick="popup.openReply('${this.escapeHtml(reply.url || '')}')">
        <div class="reply-avatar">${reply.username ? reply.username.charAt(0).toUpperCase() : '?'}</div>
        <div class="reply-content">
          <div class="reply-header">
            <span class="reply-username">${this.escapeHtml(reply.username || 'Unknown')}</span>
            <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
          </div>
          <div class="reply-text">${this.escapeHtml(reply.comment || '')}</div>
          <div class="reply-badge">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Replied
          </div>
        </div>
      </div>
    `).join('');
    }

    openReply(url) {
        if (url) {
            chrome.tabs.create({ url });
        }
    }

    // ========================================
    // Statistics
    // ========================================
    updateStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayReplies = this.replies.filter(r => new Date(r.timestamp) >= today).length;

        document.getElementById('totalReplies').textContent = this.replies.length;
        document.getElementById('todayReplies').textContent = todayReplies;
    }

    // ========================================
    // UI Updates
    // ========================================
    updateUI() {
        const indicator = document.getElementById('statusIndicator');
        const statusText = indicator.querySelector('.status-text');

        if (this.settings.autoReplyEnabled) {
            indicator.classList.add('active');
            statusText.textContent = 'Active';
        } else {
            indicator.classList.remove('active');
            statusText.textContent = 'Inactive';
        }

        document.getElementById('autoReplyEnabled').checked = this.settings.autoReplyEnabled;
        document.getElementById('replyDelay').value = this.settings.replyDelay;
        document.getElementById('replyMode').value = this.settings.replyMode;
        document.getElementById('keywords').value = this.settings.keywords;
        document.getElementById('randomDelay').checked = this.settings.randomDelay;
        document.getElementById('rotateTemplates').checked = this.settings.rotateTemplates;

        this.toggleKeywordsSetting();

        const startBtn = document.getElementById('startBtn');
        if (this.settings.autoReplyEnabled) {
            startBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
        Stop Auto-Reply
      `;
            startBtn.classList.add('active');
        } else {
            startBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        Start Auto-Reply
      `;
            startBtn.classList.remove('active');
        }

        if (this.hasReachedLimit() && !this.settings.autoReplyEnabled) {
            startBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Daily Limit Reached
      `;
            startBtn.style.background = 'var(--bg-tertiary)';
            startBtn.style.cursor = 'not-allowed';
        } else {
            startBtn.style.background = '';
            startBtn.style.cursor = '';
        }
    }

    toggleKeywordsSetting() {
        const keywordsSetting = document.getElementById('keywordsSetting');
        if (this.settings.replyMode === 'keywords') {
            keywordsSetting.classList.remove('hidden');
        } else {
            keywordsSetting.classList.add('hidden');
        }
    }

    // ========================================
    // Auto Reply Toggle
    // ========================================
    async toggleAutoReply() {
        if (!this.settings.autoReplyEnabled && this.hasReachedLimit()) {
            const upgrade = confirm('You have reached your daily free limit of 5 replies.\n\nUpgrade to Premium for unlimited replies!\n\nClick OK to contact us on WhatsApp.');
            if (upgrade) {
                window.open(WHATSAPP_LINK, '_blank');
            }
            return;
        }

        if (!this.settings.autoReplyEnabled) {
            if (this.templates.length === 0) {
                alert('Please create at least one reply template first');
                this.switchTab('templates');
                return;
            }

            if (!this.settings.activeTemplate && !this.settings.rotateTemplates) {
                alert('Please select an active template or enable template rotation');
                this.switchTab('settings');
                return;
            }
        }

        this.settings.autoReplyEnabled = !this.settings.autoReplyEnabled;
        await this.saveData();
        this.updateUI();
        this.updateUsageBanner();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && tab.url.includes('youtube.com')) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'TOGGLE_AUTO_REPLY',
                    enabled: this.settings.autoReplyEnabled,
                    settings: this.settings,
                    templates: this.templates,
                    dailyUsage: this.dailyUsage,
                    freeLimit: FREE_DAILY_LIMIT
                });
            }
        } catch (error) {
            console.log('Could not communicate with content script:', error);
        }

        chrome.runtime.sendMessage({
            type: 'UPDATE_STATE',
            enabled: this.settings.autoReplyEnabled
        });
    }

    // ========================================
    // Utility Functions
    // ========================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        return date.toLocaleDateString();
    }
}

// Listen for usage updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'USAGE_UPDATED') {
        popup.dailyUsage = message.dailyUsage;
        popup.updateUsageBanner();
        popup.updateStats();
        popup.updateUI();
    }
});

// Initialize popup
const popup = new AutoReplyPopup();
