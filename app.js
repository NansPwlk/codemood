// Configuration et constantes
const CONFIG = {
    MAX_ENTRIES: 1000,
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 heures
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    POMODORO_DURATION: 25 * 60, // 25 minutes
    BREAK_DURATION: 5 * 60, // 5 minutes
    LONG_BREAK_DURATION: 15 * 60, // 15 minutes
    POMODOROS_BEFORE_LONG_BREAK: 4,
    AUTO_SAVE_INTERVAL: 30000, // 30 secondes
    MAX_SEARCH_RESULTS: 100,
    TAGS_COLORS: {
        'bug': 'red',
        'feature': 'green',
        'refactor': 'blue',
        'docs': 'purple',
        'eureka': 'yellow',
        'learn': 'indigo',
        'idea': 'orange',
        'optimization': 'teal'
    }
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

// Templates pour les entrées
const TEMPLATES = {
    bug: `## Description du Bug
- **Type**: 
- **Sévérité**: 
- **Environnement**: 

### Comportement attendu

### Comportement actuel

### Étapes pour reproduire
1. 
2. 
3. 

### Solution
`,
    feature: `## Nouvelle Fonctionnalité
- **Type**: 
- **Priorité**: 
- **Estimation**: 

### Description

### Spécifications techniques

### Tâches
- [ ] 
- [ ] 
- [ ] 

### Notes
`,
    refactor: `## Refactoring
- **Portée**: 
- **Impact**: 
- **Risques**: 

### Motivation

### Changements proposés

### Tests nécessaires
`,
    default: ``
};

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
    lastSyncTime: null,
    pendingChanges: [],
    notifications: [],
    settings: {
        autoSave: true,
        soundEnabled: true,
        pushNotifications: true,
        darkModeAuto: true,
        pomodoroCustom: {
            workDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            longBreakInterval: 4
        }
    }
};
// Classes principales de l'application

// Gestionnaire de stockage avec encryption
class StorageManager {
    constructor(encryptionKey = 'default-key') {
        this.storage = localStorage;
        this.encryptionKey = encryptionKey;
        this.initBackupSystem();
        this.validateStorage();
        this.setupAutoSave();
    }

    setupAutoSave() {
        if (state.settings.autoSave) {
            setInterval(() => this.autoSave(), CONFIG.AUTO_SAVE_INTERVAL);
        }
    }

    autoSave() {
        if (state.editorContent && state.editorContent !== this.getLastSavedContent()) {
            this.saveEntry({
                content: state.editorContent,
                type: 'draft',
                timestamp: new Date().toISOString()
            });
        }
    }

    getLastSavedContent() {
        const drafts = this.get('drafts') || [];
        return drafts[0]?.content || '';
    }

    // Méthodes de cryptage basique (à remplacer par une vraie encryption en production)
    encrypt(data) {
        try {
            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            return window.btoa(stringData);
        } catch (error) {
            console.error('Erreur de cryptage:', error);
            showNotification('Erreur', 'Erreur lors du cryptage des données', 'error');
            return null;
        }
    }

    decrypt(data) {
        try {
            const decrypted = window.atob(data);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Erreur de décryptage:', error);
            return null;
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
            showNotification('Erreur', 'Erreur lors de la sauvegarde', 'error');
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

    getStorageSize() {
        let size = 0;
        for (let key in this.storage) {
            if (this.storage.hasOwnProperty(key)) {
                size += this.storage.getItem(key).length;
            }
        }
        return size;
    }

    validateStorage() {
        try {
            const requiredKeys = ['journalEntries', 'goals', 'settings', 'drafts'];
            requiredKeys.forEach(key => {
                if (this.get(key) === null) {
                    this.set(key, []);
                }
            });

            // Validation des données existantes
            const entries = this.get('journalEntries');
            if (entries && Array.isArray(entries)) {
                const validEntries = entries.filter(entry => 
                    entry && entry.id && entry.content && entry.timestamp
                );
                if (validEntries.length !== entries.length) {
                    this.set('journalEntries', validEntries);
                }
            }
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

    cleanOldEntries() {
        // Nettoyage des entrées du journal
        const entries = this.get('journalEntries') || [];
        const sortedEntries = entries.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        if (sortedEntries.length > CONFIG.MAX_ENTRIES) {
            sortedEntries.splice(CONFIG.MAX_ENTRIES);
            this.set('journalEntries', sortedEntries);
        }

        // Nettoyage des brouillons
        const drafts = this.get('drafts') || [];
        const recentDrafts = drafts.slice(0, 10); // Garde les 10 derniers brouillons
        this.set('drafts', recentDrafts);

        // Nettoyage des objectifs complétés
        const goals = this.get('goals') || [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeGoals = goals.filter(goal => 
            !goal.completed || 
            new Date(goal.completedAt) > thirtyDaysAgo
        );
        
        this.set('goals', activeGoals);
    }

    initBackupSystem() {
        setInterval(() => {
            const lastBackup = this.get('lastBackup');
            const now = Date.now();
            
            if (!lastBackup || (now - lastBackup > CONFIG.BACKUP_INTERVAL)) {
                this.exportData();
                this.set('lastBackup', now);
            }
        }, CONFIG.BACKUP_INTERVAL);
    }

    async exportData() {
        try {
            const data = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                entries: this.get('journalEntries'),
                goals: this.get('goals'),
                settings: this.get('settings'),
                stats: this.get('stats')
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `codemood-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showNotification('Succès', 'Données exportées avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            showNotification('Erreur', 'Erreur lors de l\'export des données', 'error');
            return false;
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!this.validateImportData(data)) {
                throw new Error('Format de données invalide');
            }

            await this.mergeImportedData(data);
            showNotification('Succès', 'Données importées avec succès');
            return true;
        } catch (error) {
            console.error('Erreur d\'import:', error);
            showNotification('Erreur', 'Erreur lors de l\'import des données', 'error');
            return false;
        }
    }
    // Suite de la classe StorageManager
    validateImportData(data) {
        // Vérification de la version et du timestamp
        if (!data.version || !data.timestamp) return false;

        // Vérification des entrées
        if (!Array.isArray(data.entries)) return false;
        
        const validEntry = entry => 
            entry.id && 
            entry.content && 
            entry.timestamp &&
            Array.isArray(entry.tags);

        return data.entries.every(validEntry);
    }

    async mergeImportedData(importedData) {
        // Fusion des entrées
        const existingEntries = this.get('journalEntries') || [];
        const mergedEntries = [...existingEntries];
        
        importedData.entries.forEach(importedEntry => {
            const existingIndex = mergedEntries.findIndex(e => e.id === importedEntry.id);
            if (existingIndex === -1) {
                mergedEntries.push(importedEntry);
            } else if (new Date(importedEntry.timestamp) > new Date(mergedEntries[existingIndex].timestamp)) {
                mergedEntries[existingIndex] = importedEntry;
            }
        });

        // Tri par date
        mergedEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Fusion des objectifs
        const existingGoals = this.get('goals') || [];
        const mergedGoals = [...existingGoals];
        if (importedData.goals) {
            importedData.goals.forEach(importedGoal => {
                if (!mergedGoals.some(g => g.id === importedGoal.id)) {
                    mergedGoals.push(importedGoal);
                }
            });
        }

        // Fusion des paramètres
        const existingSettings = this.get('settings') || {};
        const mergedSettings = {
            ...existingSettings,
            ...importedData.settings
        };

        // Sauvegarde des données fusionnées
        this.set('journalEntries', mergedEntries);
        this.set('goals', mergedGoals);
        this.set('settings', mergedSettings);

        // Mise à jour des statistiques
        await this.updateStats();
    }

    async updateStats() {
        const entries = this.get('journalEntries') || [];
        const stats = {
            totalEntries: entries.length,
            wordCount: entries.reduce((acc, entry) => 
                acc + entry.content.split(/\s+/).length, 0
            ),
            tagDistribution: {},
            moodDistribution: {},
            timeDistribution: this.calculateTimeDistribution(entries)
        };

        // Distribution des tags
        entries.forEach(entry => {
            entry.tags.forEach(tag => {
                stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
            });
            stats.moodDistribution[entry.mood] = (stats.moodDistribution[entry.mood] || 0) + 1;
        });

        this.set('stats', stats);
        return stats;
    }

    calculateTimeDistribution(entries) {
        const distribution = {
            hourly: new Array(24).fill(0),
            daily: new Array(7).fill(0),
            monthly: new Array(12).fill(0)
        };

        entries.forEach(entry => {
            const date = new Date(entry.timestamp);
            distribution.hourly[date.getHours()]++;
            distribution.daily[date.getDay()]++;
            distribution.monthly[date.getMonth()]++;
        });

        return distribution;
    }
}

// Gestionnaire de notifications
class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.notificationQueue = [];
        this.audio = new Audio('notification.mp3');
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
        if (!state.settings.soundEnabled && !state.settings.pushNotifications) {
            return;
        }

        const notification = {
            title,
            options: {
                icon: '/icon.png',
                badge: '/badge.png',
                timestamp: Date.now(),
                ...options
            }
        };

        if (state.settings.soundEnabled) {
            this.audio.play().catch(() => {});
        }

        if (!state.settings.pushNotifications || !this.hasPermission) {
            this.showInAppNotification(notification);
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
            this.showInAppNotification(notification);
        }
    }

    showInAppNotification(notification) {
        const container = document.getElementById('notifications-container');
        const element = document.createElement('div');
        element.className = 'notification slide-in';
        element.innerHTML = `
            <div class="notification-header">
                <h4>${notification.title}</h4>
                <button class="notification-close">&times;</button>
            </div>
            <p>${notification.options.body || ''}</p>
        `;

        container.appendChild(element);

        // Auto-suppression
        setTimeout(() => {
            element.classList.add('slide-out');
            setTimeout(() => element.remove(), 300);
        }, 5000);

        // Fermeture manuelle
        element.querySelector('.notification-close').addEventListener('click', () => {
            element.classList.add('slide-out');
            setTimeout(() => element.remove(), 300);
        });
    }

    async processQueue() {
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.notify(notification.title, notification.options);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}
// Gestionnaire du Pomodoro
class PomodoroTimer {
    constructor(updateCallback) {
        this.timeLeft = CONFIG.POMODORO_DURATION;
        this.isActive = false;
        this.isBreak = false;
        this.timer = null;
        this.updateCallback = updateCallback;
        this.pomodorosCompleted = 0;
        this.startTime = null;
        this.pausedTime = null;
        this.totalWorkTime = 0;
        this.totalBreakTime = 0;
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.startTime = Date.now() - (this.pausedTime || 0);
        this.timer = setInterval(() => {
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.complete();
            } else {
                this.updateCallback(this.formatTime(), {
                    isBreak: this.isBreak,
                    pomodorosCompleted: this.pomodorosCompleted,
                    totalWorkTime: this.totalWorkTime,
                    totalBreakTime: this.totalBreakTime
                });
            }
        }, 1000);

        notificationManager.notify(
            this.isBreak ? 'Pause démarrée' : 'Pomodoro démarré',
            { 
                body: `Durée: ${this.formatTime()}`,
                icon: '/pomodoro-icon.png'
            }
        );
    }

    pause() {
        if (!this.isActive) return;
        
        clearInterval(this.timer);
        this.isActive = false;
        this.pausedTime = Date.now() - this.startTime;
        
        this.updateCallback(this.formatTime(), {
            isBreak: this.isBreak,
            pomodorosCompleted: this.pomodorosCompleted,
            isPaused: true
        });
    }

    reset() {
        clearInterval(this.timer);
        this.timeLeft = CONFIG.POMODORO_DURATION;
        this.isActive = false;
        this.isBreak = false;
        this.pomodorosCompleted = 0;
        this.startTime = null;
        this.pausedTime = null;
        
        this.updateCallback(this.formatTime(), {
            isBreak: false,
            pomodorosCompleted: 0,
            isReset: true
        });
    }

    complete() {
        clearInterval(this.timer);
        this.isActive = false;
        
        if (this.isBreak) {
            this.totalBreakTime += CONFIG.BREAK_DURATION - this.timeLeft;
            notificationManager.notify('Break terminé!', {
                body: 'Temps de se remettre au travail!'
            });
            this.timeLeft = CONFIG.POMODORO_DURATION;
            this.isBreak = false;
        } else {
            this.totalWorkTime += CONFIG.POMODORO_DURATION - this.timeLeft;
            this.pomodorosCompleted++;
            
            const isLongBreak = this.pomodorosCompleted % CONFIG.POMODOROS_BEFORE_LONG_BREAK === 0;
            this.timeLeft = isLongBreak ? CONFIG.LONG_BREAK_DURATION : CONFIG.BREAK_DURATION;
            
            notificationManager.notify('Pomodoro terminé!', {
                body: `Prenez une ${isLongBreak ? 'longue ' : ''}pause bien méritée.`
            });
            this.isBreak = true;
            this.saveStats();
        }
        
        this.startTime = null;
        this.pausedTime = null;
        
        this.updateCallback(this.formatTime(), {
            isBreak: this.isBreak,
            pomodorosCompleted: this.pomodorosCompleted,
            totalWorkTime: this.totalWorkTime,
            totalBreakTime: this.totalBreakTime
        });
    }

    saveStats() {
        const stats = storageManager.get('pomodoroStats') || {
            totalCompleted: 0,
            totalWorkTime: 0,
            totalBreakTime: 0,
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {}
        };

        const today = new Date().toISOString().split('T')[0];
        const week = this.getWeekNumber();
        const month = today.substring(0, 7);

        // Mise à jour des statistiques
        stats.totalCompleted++;
        stats.totalWorkTime = (stats.totalWorkTime || 0) + this.totalWorkTime;
        stats.totalBreakTime = (stats.totalBreakTime || 0) + this.totalBreakTime;
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

    formatDuration(duration) {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

// Gestionnaire GitHub
class GitHubManager {
    constructor(token = null) {
        this.token = token;
        this.baseUrl = 'https://api.github.com';
        this.rateLimitRemaining = null;
        this.rateLimitReset = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async setToken(token) {
        this.token = token;
        this.cache.clear();
        return this.validateToken();
    }

    async validateToken() {
        try {
            const user = await this.fetchGitHub('/user');
            return !!user.login;
        } catch (error) {
            console.error('Token GitHub invalide:', error);
            return false;
        }
    }

    async fetchGitHub(endpoint, options = {}) {
        if (!this.token) {
            throw new Error('Token GitHub non défini');
        }

        // Vérifier le cache
        const cacheKey = `${endpoint}${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

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

        const data = await response.json();
        
        // Mettre en cache
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }
    // Suite de la classe GitHubManager
    async getStats() {
        try {
            const [user, events, repositories] = await Promise.all([
                this.fetchGitHub('/user'),
                this.fetchGitHub(`/users/${user.login}/events`),
                this.fetchGitHub('/user/repos?per_page=100&sort=updated')
            ]);

            // Stats quotidiennes
            const today = new Date();
            const todayEvents = events.filter(event => {
                const eventDate = new Date(event.created_at);
                return eventDate.toDateString() === today.toDateString();
            });

            // Analyse des langages
            const languages = await this.analyzeLanguages(repositories);

            const stats = {
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
                    languages: languages,
                    top: this.getTopRepositories(repositories)
                },
                activity: this.processActivityData(events)
            };

            return stats;
        } catch (error) {
            console.error('Erreur de récupération des stats GitHub:', error);
            return null;
        }
    }

    getTopRepositories(repositories) {
        return repositories
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 5)
            .map(repo => ({
                name: repo.name,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                url: repo.html_url,
                language: repo.language,
                description: repo.description
            }));
    }

    processActivityData(events) {
        const activityData = new Array(30).fill(0);
        const today = new Date();
        
        events.forEach(event => {
            const eventDate = new Date(event.created_at);
            const daysDiff = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < 30) {
                activityData[daysDiff]++;
            }
        });

        return activityData.reverse();
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

        const total = Object.values(languages).reduce((a, b) => a + b, 0);
        const percentages = {};
        Object.entries(languages).forEach(([lang, bytes]) => {
            percentages[lang] = (bytes / total * 100).toFixed(1);
        });

        return percentages;
    }

    async calculateStreak(events) {
        const dates = new Set();
        const today = new Date().toDateString();
        let currentDate = new Date();
        let streak = 0;
        
        events.forEach(event => {
            if (event.type === 'PushEvent') {
                const date = new Date(event.created_at).toDateString();
                dates.add(date);
            }
        });

        // Vérifier aujourd'hui
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
        this.lastCursorPosition = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoSave();
        this.loadDrafts();
        this.setupMarkdownSupport();
    }

    setupEventListeners() {
        const { editor, previewButton, formatButtons } = this.elements;

        editor.addEventListener('input', () => {
            this.updateCharCount();
            this.unsavedChanges = true;
            this.saveState();
            this.lastCursorPosition = editor.selectionStart;
        });

        editor.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        previewButton?.addEventListener('click', () => this.togglePreview());

        formatButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.applyFormat(format);
            });
        });

        // Support du drag and drop
        editor.addEventListener('dragover', (e) => {
            e.preventDefault();
            editor.classList.add('dragover');
        });

        editor.addEventListener('dragleave', () => {
            editor.classList.remove('dragover');
        });

        editor.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleKeyDown(e) {
        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
            return;
        }

        // Raccourcis de formatage
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'b':
                    e.preventDefault();
                    this.applyFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.applyFormat('italic');
                    break;
                case 'k':
                    e.preventDefault();
                    this.applyFormat('code');
                    break;
                case 'l':
                    e.preventDefault();
                    this.applyFormat('link');
                    break;
            }
        }

        // Auto-complétion des listes
        if (e.key === 'Enter') {
            const { value, selectionStart } = this.elements.editor;
            const currentLine = value.substring(0, selectionStart).split('\n').pop();
            const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
            
            if (listMatch) {
                e.preventDefault();
                if (currentLine.trim() === listMatch[0].trim()) {
                    // Ligne vide, terminer la liste
                    this.replaceSelection('\n', -listMatch[0].length);
                } else {
                    // Continuer la liste
                    const prefix = listMatch[1]; // Espaces d'indentation
                    const marker = listMatch[2];
                    const newMarker = /^\d+/.test(marker) ? 
                        (parseInt(marker) + 1) + '.' : 
                        marker;
                    this.insertText(`\n${prefix}${newMarker} `);
                }
            }
        }
    }
    // Suite de la classe EditorManager
    async handleDrop(e) {
        e.preventDefault();
        this.elements.editor.classList.remove('dragover');

        const items = Array.from(e.dataTransfer.items);
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file.type.startsWith('image/')) {
                    await this.handleImageUpload(file);
                }
            }
        }
    }

    async handleImageUpload(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                this.insertText(`![${file.name}](${base64})`);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'image:', error);
            showNotification('Erreur', 'Impossible de charger l\'image', 'error');
        }
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

    saveDraft() {
        const content = this.elements.editor.value;
        if (!content.trim()) return;

        const drafts = storageManager.get('drafts') || [];
        drafts.unshift({
            id: Date.now().toString(),
            content: content,
            timestamp: new Date().toISOString()
        });

        // Garder seulement les 10 derniers brouillons
        if (drafts.length > 10) drafts.length = 10;
        
        storageManager.set('drafts', drafts);
    }

    loadDrafts() {
        const drafts = storageManager.get('drafts') || [];
        if (drafts.length > 0) {
            const lastDraft = drafts[0];
            const timeDiff = new Date() - new Date(lastDraft.timestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                this.elements.editor.value = lastDraft.content;
                this.updateCharCount();
                this.saveState();
            }
        }
    }

    setupMarkdownSupport() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: (code, lang) => {
                if (Prism && lang && Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            }
        });
    }

    saveState() {
        const currentContent = this.elements.editor.value;
        
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(currentContent);
        this.historyIndex++;
        
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
            case 'image':
                insertion = `![${selectedText || 'description'}](url)`;
                break;
            case 'heading':
                insertion = `## ${selectedText || 'Titre'}`;
                break;
            case 'quote':
                insertion = selectedText
                    ? selectedText.split('\n').map(line => `> ${line}`).join('\n')
                    : '> ';
                break;
            case 'list':
                insertion = selectedText
                    ? selectedText.split('\n').map(line => `- ${line}`).join('\n')
                    : '- ';
                break;
            case 'olist':
                insertion = selectedText
                    ? selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
                    : '1. ';
                break;
            case 'checklist':
                insertion = selectedText
                    ? selectedText.split('\n').map(line => `- [ ] ${line}`).join('\n')
                    : '- [ ] ';
                break;
            case 'table':
                insertion = `| En-tête 1 | En-tête 2 |\n|-----------|------------|\n| Contenu 1 | Contenu 2 |`;
                break;
        }

        this.insertText(insertion, selectionStart, selectionEnd);
    }

    insertText(text, start = null, end = null) {
        const editor = this.elements.editor;
        const selStart = start ?? editor.selectionStart;
        const selEnd = end ?? editor.selectionEnd;

        editor.value = editor.value.substring(0, selStart) +
                      text +
                      editor.value.substring(selEnd);

        editor.focus();
        editor.selectionStart = editor.selectionEnd = selStart + text.length;
        
        this.updateCharCount();
        this.saveState();
    }

    togglePreview() {
        const { editor, previewPanel } = this.elements;
        this.isPreviewMode = !this.isPreviewMode;
        
        if (this.isPreviewMode) {
            const content = editor.value;
            const html = marked.parse(content);
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
        this.elements.charCount.textContent = count.toLocaleString();
        
        if (count > this.options.maxLength * 0.9) {
            this.elements.charCount.classList.add('text-red-500');
        } else {
            this.elements.charCount.classList.remove('text-red-500');
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

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', init);

// Export pour utilisation dans la console de développement
window.app = {
    state,
    storageManager,
    notificationManager,
    githubManager,
    pomodoroTimer,
    editorManager
};
