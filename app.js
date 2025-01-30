// Configuration
const MOODS = {
    '😊': 'Heureux',
    '🤔': 'Perplexe',
    '😫': 'Fatigué',
    '🤯': 'Dépassé',
    '🚀': 'Productif',
    '💡': 'Inspiré',
    '☕️': 'Café needed',
    '😴': 'Endormi'
};

const QUOTES = [
    "Le code est comme l'humour. Quand on doit l'expliquer, c'est mauvais.",
    "La simplicité est la sophistication suprême.",
    "Le meilleur code est celui qu'on n'a pas à écrire.",
    "Un bon développeur est celui qui regarde des deux côtés avant de traverser une rue à sens unique.",
    "Il y a deux façons d'écrire du code sans bugs. Seule la troisième fonctionne."
];

// État de l'application
let currentMood = '😊';
let darkMode = false;
let goals = [];
let journalEntries = [];

// Sélecteurs DOM
const themeToggle = document.getElementById('theme-toggle');
const moodPicker = document.getElementById('mood-picker');
const currentMoodDisplay = document.getElementById('current-mood');
const journalEntry = document.getElementById('journal-entry');
const saveEntry = document.getElementById('save-entry');
const tagContainer = document.getElementById('tag-container');
const selectedTags = document.getElementById('selected-tags');
const dailyQuote = document.getElementById('daily-quote');

// Gestionnaires d'événements
themeToggle.addEventListener('click', toggleTheme);
currentMoodDisplay.addEventListener('click', cycleMood);
saveEntry.addEventListener('click', saveJournalEntry);

// Fonctions
function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
}

function cycleMood() {
    const moodKeys = Object.keys(MOODS);
    const currentIndex = moodKeys.indexOf(currentMood);
    const nextIndex = (currentIndex + 1) % moodKeys.length;
    currentMood = moodKeys[nextIndex];
    currentMoodDisplay.textContent = currentMood;
    saveMood();
}

function saveMood() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`mood_${today}`, currentMood);
    updateMoodCalendar();
}

function saveJournalEntry() {
    const entry = {
        date: new Date().toISOString(),
        content: journalEntry.value,
        mood: currentMood,
        tags: Array.from(document.querySelectorAll('.tag-btn.selected')).map(tag => tag.dataset.tag)
    };
    
    journalEntries.push(entry);
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    journalEntry.value = '';
    updateSelectedTags();
}

function updateMoodCalendar() {
    const calendar = document.getElementById('mood-calendar');
    calendar.innerHTML = '';
    
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    
    for (let date = new Date(startDate); date <= today; date.setDate(date.getDate() + 1)) {
        const dayElement = document.createElement('div');
        const dateStr = date.toISOString().split('T')[0];
        const mood = localStorage.getItem(`mood_${dateStr}`);
        
        dayElement.className = 'day';
        dayElement.textContent = mood || '·';
        calendar.appendChild(dayElement);
    }
}

function updateQuote() {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    dailyQuote.textContent = `"${QUOTES[randomIndex]}"`;
}

// Initialisation
function init() {
    // Charger le thème
    darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark', darkMode);
    
    // Charger les entrées du journal
    const savedEntries = localStorage.getItem('journalEntries');
    if (savedEntries) {
        journalEntries = JSON.parse(savedEntries);
    }
    
    // Charger l'humeur du jour
    const today = new Date().toISOString().split('T')[0];
    const savedMood = localStorage.getItem(`mood_${today}`);
    if (savedMood) {
        currentMood = savedMood;
        currentMoodDisplay.textContent = currentMood;
    }
    
    updateMoodCalendar();
    updateQuote();
}

// Démarrer l'application
init();
