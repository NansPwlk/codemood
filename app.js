// Configuration et constantes
const CONFIG = {
    MAX_ENTRIES: 1000,
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 heures
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    POMODORO_DURATION: 25 * 60, // 25 minutes
    BREAK_DURATION: 5 * 60, // 5 minutes
    LONG_BREAK_DURATION: 15 * 60, // 15 minutes
    POMODOROS_BEFORE_LONG_BREAK: 4
};

const MOODS = {
    '😊': 'Heureux',
    '🚀': 'Productif',
    '💡': 'Inspiré',
    '🤔': 'Perplexe',
    '😫': 'Fatigué',
    '🤯': 'Dépassé',
    '☕️': 'Besoin de café',
    '😴': 'Endormi',
    '🎯': 'Concentré',
    '🎉': 'Célébration',
    '😤': 'Frustré',
    '🤓': 'En apprentissage'
};

const QUOTES = [
    "Le code est comme l'humour. Quand on doit l'expliquer, c'est mauvais.",
    "La simplicité est la sophistication suprême.",
    "Le meilleur code est celui qu'on n'a pas à écrire.",
    "Un bon développeur est celui qui regarde des deux côtés avant de traverser une rue à sens unique.",
    "Il y a deux façons d'écrire du code sans bugs. Seule la troisième fonctionne.",
    "Le débogage, c'est comme être un détective dans un film policier où vous êtes aussi le meurtrier.",
    "La documentation est comme le sexe : quand c'est bon, c'est très bon. Quand c'est mauvais, c'est quand même mieux que rien.",
    "Le code propre fait une chose, et la fait bien.",
    "La perfection est atteinte non pas lorsqu'il n'y a plus rien à ajouter, mais lorsqu'il n'y a plus rien à retirer.",
    "Un problème bien posé est à moitié résolu.",
    "Le code est lu beaucoup plus souvent qu'il n'est écrit.",
    "La première règle du débogage est de savoir ce que le code est censé faire."
];

// État global de l'application
const state = {
    currentMood: '😊',
    isDarkMode: false,
    selectedTags: new Set(),
    pomodoroTimer: null,
    pomodoroTimeLeft: CONFIG.POMODORO_DURATION,
    pomodoroCount: 0,
    isPomodoroActive: false,
    isBreakTime: false,
    githubData: null,
    searchQuery: '',
    currentFilter: 'all',
    dateRange: { start: null, end: null },
    editorContent: '',
    isEditing: false,
    currentEditId: null,
    isSaving: false,
    lastSyncTime: null
};

// Classe pour la gestion du stockage avec chiffrement
class StorageManager {
    constructor(encryptionKey = 'default-key') {
        this.storage = localStorage;
        this.encryptionKey = encryptionKey;
        this.initBackupSystem();
        this.validateStorage();
    }

    // Méthodes de cryptage/décryptage
    encrypt(data) {
        try {
            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            return btoa(stringData); // Version simple - à améliorer avec une vraie encryption
        } catch (error) {
            console.error('Erreur de cryptage:', error);
            return null;
        }
    }

    decrypt(data) {
        try {
            const decrypted = atob(data); // Version simple - à améliorer avec une vraie decryption
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Erreur de décryptage:', error);
            return null;
        }
    }

    validateStorage() {
        try {
            const keys = ['journalEntries', 'goals', 'settings'];
            keys.forEach(key => {
                const data = this.get(key);
                if (data === null) {
                    this.set(key, []);
                }
            });
        } catch (error) {
            console.error('Erreur de validation du stockage:', error);
            this.clearCorruptedData();
        }
    }

    clearCorruptedData() {
        const backup = {};
        
        // Sauvegarde des données valides
        for (let key in this.storage) {
            try {
                const value = this.get(key);
                if (value !== null) {
                    backup[key] = value;
                }
            } catch {
                // Ignorer les données corrompues
            }
        }
        
        // Réinitialisation et restauration
        this.storage.clear();
        for (let key in backup) {
            this.set(key, backup[key]);
        }
    }

    set(key, value) {
        try {
            const serialized = this.encrypt(value);
            if (this.getStorageSize() + serialized.length > CONFIG.MAX_STORAGE_SIZE) {
                this.cleanOldEntries();
            }
            this.storage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Erreur de stockage:', error);
            return false;
        }
    }

    get(key) {
        try {
            const item = this.storage.getItem(key);
            return item ? this.decrypt(item) : null;
        } catch (error) {
            console.error('Erreur de lecture:', error);
            return null;
        }
    }
    // Suite de la classe StorageManager
    getStorageSize() {
        let size = 0;
        for (let key in this.storage) {
            if (this.storage.hasOwnProperty(key)) {
                size += this.storage.getItem(key).length;
            }
        }
        return size;
    }

    cleanOldEntries() {
        const entries = this.get('journalEntries') || [];
        // Garder seulement les 1000 entrées les plus récentes
        const sortedEntries = entries.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        if (sortedEntries.length > CONFIG.MAX_ENTRIES) {
            sortedEntries.splice(CONFIG.MAX_ENTRIES);
            this.set('journalEntries', sortedEntries);
        }

        // Nettoyer les vieux objectifs complétés
        const goals = this.get('goals') || [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const filteredGoals = goals.filter(goal => 
            !goal.completed || 
            new Date(goal.completedAt) > thirtyDaysAgo
        );
        
        this.set('goals', filteredGoals);
    }

    async exportData() {
        try {
            const data = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                entries: this.get('journalEntries'),
                goals: this.get('goals'),
                settings: {
                    darkMode: this.get('darkMode'),
                    currentMood: this.get('currentMood'),
                    preferences: this.get('preferences')
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `codemood-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            // Enregistrer le moment de la dernière sauvegarde
            this.set('lastBackup', Date.now());
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            return false;
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validation de la structure des données
            if (!this.validateImportData(data)) {
                throw new Error('Format de données invalide');
            }

            // Fusion avec les données existantes
            await this.mergeImportedData(data);

            return true;
        } catch (error) {
            console.error('Erreur d\'import:', error);
            return false;
        }
    }

    validateImportData(data) {
        // Vérification de la version
        if (!data.version || !data.timestamp) return false;

        // Vérification de la structure des entrées
        if (!Array.isArray(data.entries)) return false;
        
        // Vérification de chaque entrée
        const validEntry = entry => 
            entry.id && 
            entry.content && 
            entry.timestamp &&
            Array.isArray(entry.tags);

        return data.entries.every(validEntry);
    }

    async mergeImportedData(importedData) {
        // Récupération des données existantes
        const existingEntries = this.get('journalEntries') || [];
        const existingGoals = this.get('goals') || [];

        // Fusion des entrées en évitant les doublons
        const mergedEntries = [...existingEntries];
        for (const importedEntry of importedData.entries) {
            if (!mergedEntries.some(e => e.id === importedEntry.id)) {
                mergedEntries.push(importedEntry);
            }
        }

        // Tri par date
        mergedEntries.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Fusion des objectifs
        const mergedGoals = [...existingGoals];
        if (importedData.goals) {
            for (const importedGoal of importedData.goals) {
                if (!mergedGoals.some(g => g.id === importedGoal.id)) {
                    mergedGoals.push(importedGoal);
                }
            }
        }

        // Sauvegarde des données fusionnées
        this.set('journalEntries', mergedEntries);
        this.set('goals', mergedGoals);

        // Import des préférences si elles existent
        if (importedData.settings) {
            this.set('preferences', {
                ...this.get('preferences'),
                ...importedData.settings.preferences
            });
        }
    }

    initBackupSystem() {
        setInterval(() => {
            const lastBackup = this.get('lastBackup');
            const now = Date.now();
            
            if (!lastBackup || (now - lastBackup > CONFIG.BACKUP_INTERVAL)) {
                this.exportData();
            }
        }, CONFIG.BACKUP_INTERVAL);
    }
}

// Classe pour la gestion des notifications
class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.notificationQueue = [];
        this.init();
    }

    async init() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === 'granted';
            
            if (this.hasPermission) {
                this.processQueue();
            }
        }
    }

    async notify(title, options = {}) {
        const notification = {
            title,
            options: {
                icon: '/icon.png',
                badge: '/badge.png',
                timestamp: Date.now(),
                ...options
            }
        };

        if (!this.hasPermission) {
            this.notificationQueue.push(notification);
            return;
        }

        try {
            const notif = new Notification(title, notification.options);
            
            notif.onclick = () => {
                window.focus();
                notif.close();
                
                if (options.onClick) {
                    options.onClick();
                }
            };

            // Auto-fermeture après 5 secondes
            setTimeout(() => notif.close(), 5000);
        } catch (error) {
            console.error('Erreur de notification:', error);
        }
    }

    async processQueue() {
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.notify(notification.title, notification.options);
            // Petit délai entre les notifications
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}
// Classe pour la gestion du Pomodoro
class PomodoroTimer {
    constructor(updateCallback) {
        this.timeLeft = CONFIG.POMODORO_DURATION;
        this.isActive = false;
        this.isBreak = false;
        this.timer = null;
        this.updateCallback = updateCallback;
        this.pomodorosCompleted = 0;
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.timer = setInterval(() => {
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.complete();
            } else {
                this.updateCallback(this.formatTime(), {
                    isBreak: this.isBreak,
                    pomodorosCompleted: this.pomodorosCompleted
                });
            }
        }, 1000);

        // Notification de démarrage
        notificationManager.notify(
            this.isBreak ? 'Pause démarrée' : 'Pomodoro démarré',
            { body: `Durée: ${this.formatTime()}` }
        );
    }

    pause() {
        if (!this.isActive) return;
        
        clearInterval(this.timer);
        this.isActive = false;
        this.updateCallback(this.formatTime(), {
            isBreak: this.isBreak,
            pomodorosCompleted: this.pomodorosCompleted
        });
    }

    reset() {
        clearInterval(this.timer);
        this.timeLeft = CONFIG.POMODORO_DURATION;
        this.isActive = false;
        this.isBreak = false;
        this.pomodorosCompleted = 0;
        this.updateCallback(this.formatTime(), {
            isBreak: this.isBreak,
            pomodorosCompleted: this.pomodorosCompleted
        });
    }

    complete() {
        clearInterval(this.timer);
        this.isActive = false;
        
        if (this.isBreak) {
            notificationManager.notify('Break terminé!', {
                body: 'Temps de se remettre au travail!'
            });
            this.timeLeft = CONFIG.POMODORO_DURATION;
            this.isBreak = false;
        } else {
            this.pomodorosCompleted++;
            
            // Déterminer si c'est une pause longue
            const isLongBreak = this.pomodorosCompleted % CONFIG.POMODOROS_BEFORE_LONG_BREAK === 0;
            this.timeLeft = isLongBreak ? CONFIG.LONG_BREAK_DURATION : CONFIG.BREAK_DURATION;
            
            notificationManager.notify('Pomodoro terminé!', {
                body: `Prenez une ${isLongBreak ? 'longue ' : ''}pause bien méritée.`
            });
            this.isBreak = true;
            
            // Sauvegarder les statistiques
            this.saveStats();
        }
        
        this.updateCallback(this.formatTime(), {
            isBreak: this.isBreak,
            pomodorosCompleted: this.pomodorosCompleted
        });
    }

    saveStats() {
        const stats = storageManager.get('pomodoroStats') || {
            totalCompleted: 0,
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {}
        };

        const today = new Date().toISOString().split('T')[0];
        const week = this.getWeekNumber();
        const month = today.substring(0, 7);

        // Mise à jour des statistiques
        stats.totalCompleted++;
        stats.dailyStats[today] = (stats.dailyStats[today] || 0) + 1;
        stats.weeklyStats[week] = (stats.weeklyStats[week] || 0) + 1;
        stats.monthlyStats[month] = (stats.monthlyStats[month] || 0) + 1;

        storageManager.set('pomodoroStats', stats);
    }

    getWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
    }

    formatTime() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Classe pour la gestion de GitHub
class GitHubManager {
    constructor(token = null) {
        this.token = token;
        this.baseUrl = 'https://api.github.com';
        this.rateLimitRemaining = null;
        this.rateLimitReset = null;
    }

    async setToken(token) {
        this.token = token;
        return this.validateToken();
    }

    async validateToken() {
        try {
            const response = await this.fetchGitHub('/user');
            return !!response.login;
        } catch (error) {
            console.error('Token GitHub invalide:', error);
            return false;
        }
    }

    async fetchGitHub(endpoint, options = {}) {
        if (!this.token) throw new Error('Token GitHub non défini');

        // Vérifier la limite de taux
        if (this.rateLimitRemaining === 0) {
            const resetTime = new Date(this.rateLimitReset * 1000);
            if (resetTime > new Date()) {
                throw new Error(`Limite d'API dépassée. Réessayez après ${resetTime.toLocaleTimeString()}`);
            }
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers
            }
        });

        // Mise à jour des limites de taux
        this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
        this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset'));

        if (!response.ok) {
            throw new Error(`Erreur GitHub: ${response.statusText}`);
        }

        return response.json();
    }

    async getStats() {
        try {
            const user = await this.fetchGitHub('/user');
            const events = await this.fetchGitHub(`/users/${user.login}/events`);
            const repositories = await this.fetchGitHub('/user/repos?per_page=100');

            // Statistiques quotidiennes
            const today = new Date();
            const todayEvents = events.filter(event => {
                const eventDate = new Date(event.created_at);
                return eventDate.toDateString() === today.toDateString();
            });

            // Analyse des langages
            const languages = await this.analyzeLanguages(repositories);

            return {
                user: {
                    name: user.name,
                    login: user.login,
                    avatar: user.avatar_url
                },
                todayStats: {
                    commits: todayEvents.filter(e => e.type === 'PushEvent').length,
                    pullRequests: todayEvents.filter(e => e.type === 'PullRequestEvent').length,
                    issues: todayEvents.filter(e => e.type === 'IssuesEvent').length,
                    reviews: todayEvents.filter(e => e.type === 'PullRequestReviewEvent').length
                },
                streak: await this.calculateStreak(events),
                repositories: {
                    total: repositories.length,
                    stars: repositories.reduce((acc, repo) => acc + repo.stargazers_count, 0),
                    forks: repositories.reduce((acc, repo) => acc + repo.forks_count, 0),
                    languages: languages
                }
            };
        } catch (error) {
            console.error('Erreur de récupération des stats GitHub:', error);
            return null;
        }
    }
    // Suite de la classe GitHubManager
    async calculateStreak(events) {
        const dates = new Set();
        const today = new Date().toDateString();
        let currentDate = new Date();
        let streak = 0;
        
        // Créer un set de toutes les dates avec des commits
        events.forEach(event => {
            if (event.type === 'PushEvent') {
                const date = new Date(event.created_at).toDateString();
                dates.add(date);
            }
        });

        // Vérifier si aujourd'hui a des commits
        if (!dates.has(today)) {
            currentDate.setDate(currentDate.getDate() - 1);
        }

        // Compter les jours consécutifs
        while (dates.has(currentDate.toDateString())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    async analyzeLanguages(repositories) {
        const languages = {};
        const promises = repositories.map(repo => 
            this.fetchGitHub(`/repos/${repo.full_name}/languages`)
        );

        const results = await Promise.all(promises);
        results.forEach(langStats => {
            Object.entries(langStats).forEach(([lang, bytes]) => {
                languages[lang] = (languages[lang] || 0) + bytes;
            });
        });

        // Convertir en pourcentages
        const total = Object.values(languages).reduce((a, b) => a + b, 0);
        const percentages = {};
        Object.entries(languages).forEach(([lang, bytes]) => {
            percentages[lang] = (bytes / total * 100).toFixed(1);
        });

        return percentages;
    }

    async getContributions() {
        try {
            const user = await this.fetchGitHub('/user');
            const query = `
            query {
                user(login: "${user.login}") {
                    contributionsCollection {
                        contributionCalendar {
                            totalContributions
                            weeks {
                                contributionDays {
                                    contributionCount
                                    date
                                }
                            }
                        }
                    }
                }
            }`;

            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            const data = await response.json();
            return data.data.user.contributionsCollection.contributionCalendar;
        } catch (error) {
            console.error('Erreur lors de la récupération des contributions:', error);
            return null;
        }
    }
}

// Classe pour la gestion de l'éditeur
class EditorManager {
    constructor(elements, options = {}) {
        this.elements = elements;
        this.options = {
            autoSave: true,
            autoSaveInterval: 30000,
            maxLength: 50000,
            ...options
        };
        
        this.history = [];
        this.historyIndex = -1;
        this.isPreviewMode = false;
        this.unsavedChanges = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoSave();
        this.loadDrafts();
    }

    setupEventListeners() {
        const { editor, previewButton, formatButtons } = this.elements;

        editor.addEventListener('input', () => {
            this.updateCharCount();
            this.unsavedChanges = true;
            this.saveState();
        });

        editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
            }
        });

        previewButton?.addEventListener('click', () => this.togglePreview());

        formatButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.applyFormat(format);
            });
        });
    }

    setupAutoSave() {
        if (!this.options.autoSave) return;

        setInterval(() => {
            if (this.unsavedChanges) {
                this.saveDraft();
                this.unsavedChanges = false;
            }
        }, this.options.autoSaveInterval);
    }

    saveState() {
        const currentContent = this.elements.editor.value;
        
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(currentContent);
        this.historyIndex++;
        
        // Limiter la taille de l'historique
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements.editor.value = this.history[this.historyIndex];
            this.updateCharCount();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements.editor.value = this.history[this.historyIndex];
            this.updateCharCount();
        }
    }

    applyFormat(format) {
        const editor = this.elements.editor;
        const { selectionStart, selectionEnd } = editor;
        const selectedText = editor.value.substring(selectionStart, selectionEnd);
        
        let insertion = '';
        switch(format) {
            case 'bold':
                insertion = `**${selectedText || 'texte en gras'}**`;
                break;
            case 'italic':
                insertion = `*${selectedText || 'texte en italique'}*`;
                break;
            case 'code':
                insertion = selectedText.includes('\n') 
                    ? `\`\`\`\n${selectedText || 'code'}\n\`\`\``
                    : `\`${selectedText || 'code'}\``;
                break;
            case 'link':
                insertion = `[${selectedText || 'lien'}](url)`;
                break;
            case 'list':
                insertion = selectedText
                    ? selectedText.split('\n').map(line => `- ${line}`).join('\n')
                    : '- ';
                break;
            case 'quote':
                insertion = selectedText
                    ? selectedText.split('\n').map(line => `> ${line}`).join('\n')
                    : '> ';
                break;
        }

        editor.value = editor.value.substring(0, selectionStart) +
                      insertion +
                      editor.value.substring(selectionEnd);
                      
        this.updateCharCount();
        this.saveState();
        editor.focus();
    }

    togglePreview() {
        const { editor, previewPanel } = this.elements;
        this.isPreviewMode = !this.isPreviewMode;
        
        if (this.isPreviewMode) {
            const content = editor.value;
            const html = marked.parse(content, { 
                breaks: true,
                gfm: true 
            });
            previewPanel.innerHTML = this.sanitizeHtml(html);
            previewPanel.classList.remove('hidden');
            editor.classList.add('hidden');
        } else {
            previewPanel.classList.add('hidden');
            editor.classList.remove('hidden');
        }
    }

    sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Supprimer les scripts
        temp.querySelectorAll('script').forEach(el => el.remove());
        
        // Sécuriser les liens
        temp.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
        
        return temp.innerHTML;
    }

    updateCharCount() {
        const count = this.elements.editor.value.length;
        this.elements.charCount.textContent = count;
        
        // Avertissement si proche de la limite
        if (count > this.options.maxLength * 0.9) {
            this.elements.charCount.classList.add('text-red-500');
        } else {
            this.elements.charCount.classList.remove('text-red-500');
        }
    }

    saveDraft() {
        const content = this.elements.editor.value;
        if (content.trim()) {
            localStorage.setItem('editor_draft', content);
            localStorage.setItem('editor_draft_time', new Date().toISOString());
        }
    }

    loadDrafts() {
        const draft = localStorage.getItem('editor_draft');
        const draftTime = localStorage.getItem('editor_draft_time');
        
        if (draft && draftTime) {
            const timeDiff = new Date() - new Date(draftTime);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // Ne charger que les brouillons de moins de 24h
            if (hoursDiff < 24) {
                this.elements.editor.value = draft;
                this.updateCharCount();
                this.saveState();
            } else {
                // Nettoyer les vieux brouillons
                localStorage.removeItem('editor_draft');
                localStorage.removeItem('editor_draft_time');
            }
        }
    }
}
// Initialisation des gestionnaires
const storageManager = new StorageManager();
const notificationManager = new NotificationManager();
const githubManager = new GitHubManager();
const pomodoroTimer = new PomodoroTimer(updatePomodoroDisplay);
const editorManager = new EditorManager({
    editor: document.getElementById('journal-entry'),
    previewPanel: document.getElementById('preview-panel'),
    charCount: document.getElementById('char-count'),
    previewButton: document.querySelector('[data-format="preview"]'),
    formatButtons: document.querySelectorAll('.toolbar-btn')
});

// Sélecteurs DOM
const elements = {
    moodDisplay: document.getElementById('current-mood'),
    moodSelector: document.getElementById('mood-selector'),
    themeToggle: document.getElementById('theme-toggle'),
    journalEntry: document.getElementById('journal-entry'),
    saveButton: document.getElementById('save-entry'),
    tagButtons: document.querySelectorAll('.tag-btn'),
    goalInput: document.getElementById('new-goal'),
    addGoalButton: document.getElementById('add-goal'),
    goalsList: document.getElementById('goals-list'),
    quoteElement: document.getElementById('daily-quote'),
    searchInput: document.getElementById('search-input'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    dateRangePicker: document.getElementById('date-range'),
    pomodoroContainer: document.getElementById('pomodoro-container'),
    exportButton: document.getElementById('export-data'),
    importButton: document.getElementById('import-data'),
    githubConnect: document.getElementById('github-connect'),
    activityGraph: document.getElementById('activity-graph'),
    shortcutsModal: document.getElementById('shortcuts-modal')
};

// Utils
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Gestionnaires d'événements principaux
function setupEventListeners() {
    // Configuration du sélecteur d'humeur
    setupMoodSelector();

    // Écouteurs d'événements de base
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.saveButton.addEventListener('click', saveJournalEntry);
    elements.addGoalButton.addEventListener('click', addGoal);
    elements.tagButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleTag(btn));
    });

    // Recherche et filtrage
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });
    elements.dateRangePicker.addEventListener('change', handleDateRangeChange);

    // Import/Export
    elements.exportButton.addEventListener('click', () => storageManager.exportData());
    elements.importButton.addEventListener('change', handleDataImport);
    elements.githubConnect.addEventListener('click', handleGitHubConnect);

    // Pomodoro
    document.getElementById('pomodoro-start').addEventListener('click', () => pomodoroTimer.start());
    document.getElementById('pomodoro-pause').addEventListener('click', () => pomodoroTimer.pause());
    document.getElementById('pomodoro-reset').addEventListener('click', () => pomodoroTimer.reset());

    // Raccourcis clavier globaux
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Gestion du mode sombre automatique
    window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
        if (storageManager.get('autoTheme')) {
            setTheme(e.matches);
        }
    });

    // Détection de la mise hors ligne
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Sauvegarde avant fermeture
    window.addEventListener('beforeunload', e => {
        if (editorManager.unsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Gestionnaire de raccourcis clavier
function handleKeyboardShortcuts(event) {
    // Raccourcis généraux
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 's':
                event.preventDefault();
                saveJournalEntry();
                break;
            case 'f':
                event.preventDefault();
                elements.searchInput.focus();
                break;
            case 'k':
                event.preventDefault();
                elements.shortcutsModal.classList.remove('hidden');
                break;
            case ',':
                event.preventDefault();
                openSettings();
                break;
        }
    }

    // Fermeture des modales avec Échap
    if (event.key === 'Escape') {
        elements.shortcutsModal.classList.add('hidden');
    }
}

// Gestion du thème
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    storageManager.set('darkMode', isDark);
    elements.themeToggle.innerHTML = isDark ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
}

function setTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    elements.themeToggle.innerHTML = isDark ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
    storageManager.set('darkMode', isDark);
}

// Gestion de l'état en ligne/hors ligne
function updateOnlineStatus(event) {
    const isOnline = navigator.onlineType;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
        showNotification(
            'Mode hors ligne',
            'Les modifications seront synchronisées quand la connexion sera rétablie',
            'warning'
        );
    } else {
        synchronizeData();
    }
}

// Synchronisation des données
async function synchronizeData() {
    const lastSync = storageManager.get('lastSync');
    const pendingChanges = storageManager.get('pendingChanges') || [];
    
    if (pendingChanges.length > 0) {
        showNotification(
            'Synchronisation',
            'Synchronisation des modifications en cours...',
            'info'
        );
        
        for (const change of pendingChanges) {
            // Traiter les changements
            await processChange(change);
        }
        
        storageManager.set('pendingChanges', []);
        storageManager.set('lastSync', Date.now());
        
        showNotification(
            'Synchronisation terminée',
            'Toutes les modifications ont été synchronisées',
            'success'
        );
    }
}

async function processChange(change) {
    switch(change.type) {
        case 'entry':
            await saveEntry(change.data);
            break;
        case 'goal':
            await saveGoal(change.data);
            break;
        case 'settings':
            await saveSettings(change.data);
            break;
    }
}
// Gestion des entrées du journal
async function saveJournalEntry() {
    const content = elements.journalEntry.value.trim();
    if (!content) {
        showNotification('Erreur', 'Le contenu ne peut pas être vide', 'error');
        return;
    }

    try {
        elements.saveButton.disabled = true;
        elements.saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';

        const editId = elements.saveButton.dataset.editId;
        const entries = storageManager.get('journalEntries') || [];
        
        if (editId) {
            // Mode édition
            const entryIndex = entries.findIndex(e => e.id === editId);
            if (entryIndex !== -1) {
                entries[entryIndex] = {
                    ...entries[entryIndex],
                    content: content,
                    mood: state.currentMood,
                    tags: Array.from(state.selectedTags),
                    updatedAt: new Date().toISOString()
                };
            }
            elements.saveButton.dataset.editId = '';
            elements.saveButton.textContent = 'Sauvegarder';
        } else {
            // Nouvelle entrée
            entries.unshift({
                id: Date.now().toString(),
                content: content,
                mood: state.currentMood,
                tags: Array.from(state.selectedTags),
                timestamp: new Date().toISOString()
            });
        }
        
        await storageManager.set('journalEntries', entries);
        
        // Réinitialisation du formulaire
        elements.journalEntry.value = '';
        state.selectedTags.clear();
        elements.tagButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Mise à jour de l'affichage
        handleFilter(state.currentFilter);
        showNotification('Succès', 'Entrée sauvegardée avec succès');

        // Mettre à jour les statistiques
        updateStats();
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur', 'Erreur lors de la sauvegarde', 'error');
    } finally {
        elements.saveButton.disabled = false;
        elements.saveButton.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
    }
}

// Mise à jour des statistiques
function updateStats() {
    const entries = storageManager.get('journalEntries') || [];
    const stats = {
        total: entries.length,
        byTag: {},
        byMood: {},
        byMonth: {},
        streakDays: calculateStreak(entries)
    };

    entries.forEach(entry => {
        // Stats par tag
        entry.tags.forEach(tag => {
            stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });

        // Stats par humeur
        stats.byMood[entry.mood] = (stats.byMood[entry.mood] || 0) + 1;

        // Stats par mois
        const month = entry.timestamp.substring(0, 7);
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
    });

    storageManager.set('stats', stats);
    updateStatsDisplay(stats);
}

function calculateStreak(entries) {
    if (entries.length === 0) return 0;

    const dates = new Set(
        entries.map(e => new Date(e.timestamp).toDateString())
    );
    let streak = 0;
    let currentDate = new Date();

    while (dates.has(currentDate.toDateString())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}

// Gestion des citations
function updateQuote() {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    const quote = QUOTES[randomIndex];
    elements.quoteElement.textContent = `"${quote}"`;
}

// Configuration initiale du sélecteur d'humeur
function setupMoodSelector() {
    const moodGrid = elements.moodSelector;
    moodGrid.innerHTML = '';
    
    Object.entries(MOODS).forEach(([emoji, description]) => {
        const option = document.createElement('div');
        option.className = 'mood-option';
        option.textContent = emoji;
        option.title = description;
        
        option.addEventListener('click', e => {
            e.stopPropagation();
            state.currentMood = emoji;
            elements.moodDisplay.textContent = emoji;
            moodGrid.classList.add('hidden');
            storageManager.set('currentMood', emoji);
        });
        
        moodGrid.appendChild(option);
    });

    // Gestionnaires d'événements pour l'affichage/masquage
    elements.moodDisplay.addEventListener('click', e => {
        e.stopPropagation();
        moodGrid.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        moodGrid.classList.add('hidden');
    });
}

// Fonctions d'initialisation
async function loadData() {
    try {
        // Chargement des entrées
        const entries = storageManager.get('journalEntries') || [];
        displayEntries(entries);

        // Chargement des objectifs
        loadGoals();

        // Mise à jour des citations
        updateQuote();

        // Chargement des stats GitHub si connecté
        const githubToken = storageManager.get('githubToken');
        if (githubToken) {
            const isValid = await githubManager.setToken(githubToken);
            if (isValid) {
                updateGitHubStats();
            } else {
                storageManager.set('githubToken', null);
            }
        }

        // Mise à jour des statistiques
        updateStats();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showNotification('Erreur', 'Erreur lors du chargement des données', 'error');
    }
}

// Fonction d'initialisation principale
async function init() {
    try {
        // Chargement du thème
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = storageManager.get('darkMode');
        const shouldBeDark = savedTheme ?? prefersDark;
        setTheme(shouldBeDark);

        // Chargement de l'humeur
        const savedMood = storageManager.get('currentMood');
        if (savedMood && MOODS[savedMood]) {
            state.currentMood = savedMood;
            elements.moodDisplay.textContent = state.currentMood;
        }

        // Configuration des composants
        setupMoodSelector();
        setupEventListeners();

        // Chargement des données
        await loadData();

        // Vérification de la connexion
        updateOnlineStatus();

        // Nettoyage des anciennes données si nécessaire
        await storageManager.cleanOldEntries();
    } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        showNotification('Erreur', 'Erreur lors de l\'initialisation', 'error');
    }
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', init);

// Service Worker pour le mode hors ligne
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker enregistré avec succès');
        }).catch(error => {
            console.error('Erreur d\'enregistrement du ServiceWorker:', error);
        });
    });
}
