// Configuration et constantes
const CONFIG = {
    MAX_ENTRIES: 1000,
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 heures
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    POMODORO_DURATION: 25 * 60, // 25 minutes
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
    "La perfection est atteinte non pas lorsqu'il n'y a plus rien à ajouter, mais lorsqu'il n'y a plus rien à retirer."
];

// État de l'application
const state = {
    currentMood: '😊',
    isDarkMode: false,
    selectedTags: new Set(),
    pomodoroTimer: null,
    pomodoroTimeLeft: CONFIG.POMODORO_DURATION,
    isPomodoroActive: false,
    isBreakTime: false,
    githubData: null,
    searchQuery: '',
    currentFilter: 'all',
    dateRange: { start: null, end: null }
};

// Classe pour la gestion du stockage
class StorageManager {
    constructor() {
        this.storage = localStorage;
        this.initBackupSystem();
    }

    set(key, value) {
        try {
            const serialized = JSON.stringify(value);
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
            return item ? JSON.parse(item) : null;
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

    cleanOldEntries() {
        const entries = this.get('journalEntries') || [];
        const sortedEntries = entries.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        if (sortedEntries.length > CONFIG.MAX_ENTRIES) {
            sortedEntries.splice(CONFIG.MAX_ENTRIES);
            this.set('journalEntries', sortedEntries);
        }
    }

    async exportData() {
        const data = {
            entries: this.get('journalEntries'),
            goals: this.get('goals'),
            settings: {
                darkMode: this.get('darkMode'),
                currentMood: this.get('currentMood')
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
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validation des données
            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Format de données invalide');
            }

            // Import des données
            this.set('journalEntries', data.entries);
            if (data.goals) this.set('goals', data.goals);
            if (data.settings) {
                this.set('darkMode', data.settings.darkMode);
                this.set('currentMood', data.settings.currentMood);
            }

            return true;
        } catch (error) {
            console.error('Erreur d\'import:', error);
            return false;
        }
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
}

// Classe pour la gestion des notifications
class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.init();
    }

    async init() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === 'granted';
        }
    }

    async notify(title, options = {}) {
        if (!this.hasPermission) return;
        
        try {
            const notification = new Notification(title, {
                icon: '/icon.png',
                badge: '/badge.png',
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } catch (error) {
            console.error('Erreur de notification:', error);
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
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.timer = setInterval(() => {
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.complete();
            } else {
                this.updateCallback(this.formatTime());
            }
        }, 1000);
    }

    pause() {
        if (!this.isActive) return;
        
        clearInterval(this.timer);
        this.isActive = false;
        this.updateCallback(this.formatTime());
    }

    reset() {
        clearInterval(this.timer);
        this.timeLeft = CONFIG.POMODORO_DURATION;
        this.isActive = false;
        this.isBreak = false;
        this.updateCallback(this.formatTime());
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
            notificationManager.notify('Pomodoro terminé!', {
                body: 'Prenez une pause bien méritée.'
            });
            this.timeLeft = 5 * 60; // 5 minutes de pause
            this.isBreak = true;
        }
        
        this.updateCallback(this.formatTime());
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

    async fetchGitHub(endpoint) {
        if (!this.token) throw new Error('Token GitHub non défini');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur GitHub: ${response.statusText}`);
        }

        return response.json();
    }

    async getStats() {
        try {
            const [user, events] = await Promise.all([
                this.fetchGitHub('/user'),
                this.fetchGitHub('/users/${user.login}/events')
            ]);

            const today = new Date();
            const todayEvents = events.filter(event => {
                const eventDate = new Date(event.created_at);
                return eventDate.toDateString() === today.toDateString();
            });

            return {
                totalCommits: todayEvents.filter(e => e.type === 'PushEvent').length,
                streak: await this.calculateStreak(events),
                repositories: await this.fetchGitHub('/user/repos?per_page=100'),
                user: user
            };
        } catch (error) {
            console.error('Erreur de récupération des stats GitHub:', error);
            return null;
        }
    }

    async calculateStreak(events) {
        const dates = new Set();
        events.forEach(event => {
            if (event.type === 'PushEvent') {
                dates.add(new Date(event.created_at).toDateString());
            }
        });

        let streak = 0;
        let currentDate = new Date();

        while (dates.has(currentDate.toDateString())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }
}

// Initialisation des gestionnaires
const storageManager = new StorageManager();
const notificationManager = new NotificationManager();
const githubManager = new GitHubManager();
const pomodoroTimer = new PomodoroTimer(updatePomodoroDisplay);

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
    githubConnect: document.getElementById('github-connect')
};

// Gestionnaires d'événements
function setupEventListeners() {
    // Configuration du sélecteur d'humeur
    setupMoodSelector();

    // Écouteurs d'événements existants
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.saveButton.addEventListener('click', saveJournalEntry);
    elements.addGoalButton.addEventListener('click', addGoal);
    elements.tagButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleTag(btn));
    });

    // Nouveaux écouteurs d'événements
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });
    elements.dateRangePicker.addEventListener('change', handleDateRangeChange);
    elements.exportButton.addEventListener('click', () => storageManager.exportData());
    elements.importButton.addEventListener('change', handleDataImport);
    elements.githubConnect.addEventListener('click', handleGitHubConnect);

    // Gestionnaires du Pomodoro
    document.getElementById('pomodoro-start').addEventListener('click', () => pomodoroTimer.start());
    document.getElementById('pomodoro-pause').addEventListener('click', () => pomodoroTimer.pause());
    document.getElementById('pomodoro-reset').addEventListener('click', () => pomodoroTimer.reset());

    // Gestion des raccourcis clavier
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Fonctions utilitaires
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

function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + S pour sauvegarder
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveJournalEntry();
    }
    
    // Ctrl/Cmd + F pour rechercher
    if ((event.ctrlKey || event.// Suite du code précédent...

    function handleKeyboardShortcuts(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            elements.searchInput.focus();
        }
    }
}

// Fonctions de gestion des données
async function handleSearch() {
    const query = elements.searchInput.value.toLowerCase();
    const entries = storageManager.get('journalEntries') || [];
    
    const filteredEntries = entries.filter(entry => {
        return entry.content.toLowerCase().includes(query) ||
               entry.tags.some(tag => tag.toLowerCase().includes(query));
    });

    displayEntries(filteredEntries);
}

function handleFilter(filterType) {
    state.currentFilter = filterType;
    const entries = storageManager.get('journalEntries') || [];
    
    let filteredEntries = entries;
    if (filterType !== 'all') {
        filteredEntries = entries.filter(entry => entry.tags.includes(filterType));
    }

    if (state.dateRange.start && state.dateRange.end) {
        filteredEntries = filteredEntries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= state.dateRange.start && 
                   entryDate <= state.dateRange.end;
        });
    }

    displayEntries(filteredEntries);
}

function handleDateRangeChange(event) {
    const [start, end] = event.target.value.split(',');
    state.dateRange = {
        start: start ? new Date(start) : null,
        end: end ? new Date(end) : null
    };
    handleFilter(state.currentFilter);
}

async function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const success = await storageManager.importData(file);
    if (success) {
        showNotification('Import réussi', 'Les données ont été importées avec succès.');
        loadData();
    } else {
        showNotification('Erreur d\'import', 'Une erreur est survenue lors de l\'import.', 'error');
    }
}

async function handleGitHubConnect() {
    const token = prompt('Entrez votre token GitHub:');
    if (!token) return;

    const isValid = await githubManager.setToken(token);
    if (isValid) {
        storageManager.set('githubToken', token);
        updateGitHubStats();
        showNotification('Connexion réussie', 'Connecté à GitHub avec succès.');
    } else {
        showNotification('Erreur de connexion', 'Token GitHub invalide.', 'error');
    }
}

// Fonctions d'affichage et de mise à jour UI
function displayEntries(entries) {
    const container = document.getElementById('entries-container');
    container.innerHTML = '';

    entries.forEach(entry => {
        const entryElement = createEntryElement(entry);
        container.appendChild(entryElement);
    });
}

function createEntryElement(entry) {
    const element = document.createElement('div');
    element.className = 'entry-card card mb-4';
    
    const date = new Date(entry.timestamp).toLocaleString();
    const tagsHtml = entry.tags.map(tag => 
        `<span class="tag-badge">${tag}</span>`
    ).join('');

    element.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
                <span class="text-2xl mr-2">${entry.mood}</span>
                <span class="text-gray-600">${date}</span>
            </div>
            <div class="flex gap-2">
                <button class="edit-btn" data-id="${entry.id}">✏️</button>
                <button class="delete-btn" data-id="${entry.id}">🗑️</button>
            </div>
        </div>
        <div class="mb-2">${marked.parse(entry.content)}</div>
        <div class="flex flex-wrap gap-2">${tagsHtml}</div>
    `;

    // Ajout des gestionnaires d'événements
    element.querySelector('.edit-btn').addEventListener('click', () => 
        editEntry(entry)
    );
    element.querySelector('.delete-btn').addEventListener('click', () => 
        deleteEntry(entry.id)
    );

    return element;
}

function updatePomodoroDisplay(timeString) {
    const display = document.getElementById('pomodoro-time');
    if (display) display.textContent = timeString;
}

async function updateGitHubStats() {
    const stats = await githubManager.getStats();
    if (!stats) return;

    document.getElementById('commits-today').textContent = stats.totalCommits;
    document.getElementById('streak-count').textContent = `${stats.streak}j`;
    
    // Mise à jour du graphique d'activité
    updateActivityGraph(stats.repositories);
}

function updateActivityGraph(repositories) {
    const svgContainer = document.getElementById('activity-graph');
    if (!svgContainer) return;

    const data = processRepositoryData(repositories);
    
    // Création du graphique avec D3.js
    // ... (code du graphique)
}

function showNotification(title, message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Fonctions de manipulation des entrées
async function editEntry(entry) {
    elements.journalEntry.value = entry.content;
    state.selectedTags = new Set(entry.tags);
    state.currentMood = entry.mood;
    
    elements.tagButtons.forEach(btn => {
        btn.classList.toggle('selected', 
            state.selectedTags.has(btn.dataset.tag)
        );
    });
    
    elements.moodDisplay.textContent = state.currentMood;
    elements.saveButton.dataset.editId = entry.id;
    elements.saveButton.textContent = 'Mettre à jour';
}

async function deleteEntry(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette entrée ?')) return;

    const entries = storageManager.get('journalEntries') || [];
    const updatedEntries = entries.filter(entry => entry.id !== id);
    storageManager.set('journalEntries', updatedEntries);
    
    handleFilter(state.currentFilter);
    showNotification('Entrée supprimée', 'L\'entrée a été supprimée avec succès.');
}

// Fonctions d'initialisation
async function loadData() {
    // Chargement des entrées
    const entries = storageManager.get('journalEntries') || [];
    displayEntries(entries);

    // Chargement des objectifs
    loadGoals();

    // Mise à jour de la citation
    updateQuote();

    // Connexion GitHub si token existant
    const githubToken = storageManager.get('githubToken');
    if (githubToken) {
        githubManager.setToken(githubToken).then(isValid => {
            if (isValid) updateGitHubStats();
        });
    }
}

// Template pour les nouvelles entrées
function createNewEntry() {
    return {
        id: Date.now().toString(),
        content: elements.journalEntry.value,
        mood: state.currentMood,
        tags: Array.from(state.selectedTags),
        timestamp: new Date().toISOString()
    };
}

// Initialisation de l'application
function init() {
    // Chargement du thème
    state.isDarkMode = storageManager.get('darkMode') === true;
    document.body.classList.toggle('dark', state.isDarkMode);

    // Chargement de l'humeur
    const savedMood = storageManager.get('currentMood');
    if (savedMood && MOODS[savedMood]) {
        state.currentMood = savedMood;
        elements.moodDisplay.textContent = state.currentMood;
    }

    setupMoodSelector();
    setupEventListeners();
    loadData();
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', init);
         
