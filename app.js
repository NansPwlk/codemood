// Configuration
const MOODS = ['😊', '🤔', '😫', '🤯', '🚀', '💡', '☕️', '😴'];
const QUOTES = [
    "Le code est comme l'humour. Quand on doit l'expliquer, c'est mauvais.",
    "La simplicité est la sophistication suprême.",
    "Le meilleur code est celui qu'on n'a pas à écrire.",
    "Un bon développeur est celui qui regarde des deux côtés avant de traverser une rue à sens unique.",
    "Il y a deux façons d'écrire du code sans bugs. Seule la troisième fonctionne."
];

// État de l'application
let currentMood = 0; // Index dans MOODS
let isDarkMode = false;
let selectedTags = new Set();

// Sélecteurs DOM
const moodDisplay = document.getElementById('current-mood');
const themeToggle = document.getElementById('theme-toggle');
const journalEntry = document.getElementById('journal-entry');
const saveButton = document.getElementById('save-entry');
const tagButtons = document.querySelectorAll('.tag-btn');
const goalInput = document.getElementById('new-goal');
const addGoalButton = document.getElementById('add-goal');
const goalsList = document.getElementById('goals-list');
const quoteElement = document.getElementById('daily-quote');

// Gestionnaires d'événements
moodDisplay.addEventListener('click', cycleMood);
themeToggle.addEventListener('click', toggleTheme);
saveButton.addEventListener('click', saveJournalEntry);
addGoalButton.addEventListener('click', addGoal);

tagButtons.forEach(btn => {
    btn.addEventListener('click', () => toggleTag(btn));
});

// Fonctions
function cycleMood() {
    currentMood = (currentMood + 1) % MOODS.length;
    moodDisplay.textContent = MOODS[currentMood];
    saveMoodToStorage();
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
}

function toggleTag(button) {
    button.classList.toggle('selected');
    const tag = button.dataset.tag;
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
}

function saveJournalEntry() {
    if (!journalEntry.value.trim()) return;

    const entry = {
        content: journalEntry.value,
        mood: MOODS[currentMood],
        tags: Array.from(selectedTags),
        timestamp: new Date().toISOString()
    };

    const entries = getJournalEntries();
    entries.push(entry);
    localStorage.setItem('journalEntries', JSON.stringify(entries));

    // Reset form
    journalEntry.value = '';
    selectedTags.clear();
    tagButtons.forEach(btn => btn.classList.remove('selected'));

    showSaveSuccess();
}

function addGoal() {
    const goalText = goalInput.value.trim();
    if (!goalText) return;

    const goalElement = document.createElement('div');
    goalElement.className = 'flex items-center gap-2 p-2 bg-gray-100 rounded';
    goalElement.innerHTML = `
        <input type="checkbox" class="form-checkbox">
        <span>${goalText}</span>
        <button class="ml-auto text-red-500">&times;</button>
    `;

    goalsList.appendChild(goalElement);
    goalInput.value = '';

    // Event listeners pour le nouveau goal
    const checkbox = goalElement.querySelector('input');
    const deleteBtn = goalElement.querySelector('button');
    
    checkbox.addEventListener('change', () => {
        goalElement.classList.toggle('line-through', checkbox.checked);
    });

    deleteBtn.addEventListener('click', () => {
        goalElement.remove();
    });
}

function showSaveSuccess() {
    saveButton.textContent = 'Sauvegardé ✓';
    saveButton.disabled = true;
    setTimeout(() => {
        saveButton.textContent = 'Sauvegarder';
        saveButton.disabled = false;
    }, 2000);
}

function getJournalEntries() {
    const stored = localStorage.getItem('journalEntries');
    return stored ? JSON.parse(stored) : [];
}

function updateQuote() {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    quoteElement.textContent = `"${QUOTES[randomIndex]}"`;
}

// Initialisation
function init() {
    // Charger le thème
    isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark', isDarkMode);

    // Charger l'humeur
    const savedMood = localStorage.getItem('currentMood');
    if (savedMood !== null) {
        currentMood = parseInt(savedMood);
        moodDisplay.textContent = MOODS[currentMood];
    }

    updateQuote();
}

// Démarrer l'application
init();
