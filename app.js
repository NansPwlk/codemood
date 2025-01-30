// Configuration
const MOODS = [
    '😊', // Heureux
    '🚀', // Productif
    '💡', // Inspiré
    '🤔', // Perplexe
    '😫', // Fatigué
    '🤯', // Dépassé
    '☕️', // Café needed
    '😴'  // Endormi
];

const QUOTES = [
    "Le code est comme l'humour. Quand on doit l'expliquer, c'est mauvais.",
    "La simplicité est la sophistication suprême.",
    "Le meilleur code est celui qu'on n'a pas à écrire.",
    "Un bon développeur est celui qui regarde des deux côtés avant de traverser une rue à sens unique.",
    "Il y a deux façons d'écrire du code sans bugs. Seule la troisième fonctionne."
];

// État de l'application
let currentMood = 0;
let isDarkMode = false;
let selectedTags = new Set();

// Sélecteurs DOM
const moodDisplay = document.getElementById('current-mood');
const moodSelector = document.getElementById('mood-selector');
const themeToggle = document.getElementById('theme-toggle');
const journalEntry = document.getElementById('journal-entry');
const saveButton = document.getElementById('save-entry');
const tagButtons = document.querySelectorAll('.tag-btn');
const goalInput = document.getElementById('new-goal');
const addGoalButton = document.getElementById('add-goal');
const goalsList = document.getElementById('goals-list');
const quoteElement = document.getElementById('daily-quote');

// Configuration du sélecteur d'humeur
function setupMoodSelector() {
    // Créer les options d'humeur
    MOODS.forEach(mood => {
        const moodOption = document.createElement('div');
        moodOption.className = 'mood-option';
        moodOption.textContent = mood;
        moodOption.addEventListener('click', () => {
            moodDisplay.textContent = mood;
            moodSelector.classList.add('hidden');
            currentMood = MOODS.indexOf(mood);
            saveMoodToStorage();
        });
        moodSelector.appendChild(moodOption);
    });

    // Afficher le sélecteur au clic
    moodDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        moodSelector.classList.toggle('hidden');
    });

    // Fermer le sélecteur en cliquant ailleurs
    document.addEventListener('click', () => {
        moodSelector.classList.add('hidden');
    });

    moodSelector.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Gestionnaires d'événements
themeToggle.addEventListener('click', toggleTheme);
saveButton.addEventListener('click', saveJournalEntry);
addGoalButton.addEventListener('click', addGoal);

tagButtons.forEach(btn => {
    btn.addEventListener('click', () => toggleTag(btn));
});

// Fonctions
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
    goalElement.className = 'flex items-center gap-2 p-2 bg-gray-100 rounded dark:bg-gray-700 mb-2';
    goalElement.innerHTML = `
        <input type="checkbox" class="form-checkbox">
        <span>${goalText}</span>
        <button class="ml-auto text-red-500">&times;</button>
    `;

    goalsList.appendChild(goalElement);
    goalInput.value = '';

    const checkbox = goalElement.querySelector('input');
    const deleteBtn = goalElement.querySelector('button');
    
    checkbox.addEventListener('change', () => {
        goalElement.classList.toggle('line-through', checkbox.checked);
    });

    deleteBtn.addEventListener('click', () => {
        goalElement.remove();
    });

    saveGoals();
}

function saveGoals() {
    const goals = Array.from(goalsList.children).map(goal => ({
        text: goal.querySelector('span').textContent,
        completed: goal.querySelector('input').checked
    }));
    localStorage.setItem('goals', JSON.stringify(goals));
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

function loadGoals() {
    const savedGoals = localStorage.getItem('goals');
    if (savedGoals) {
        JSON.parse(savedGoals).forEach(goal => {
            const goalElement = document.createElement('div');
            goalElement.className = 'flex items-center gap-2 p-2 bg-gray-100 rounded dark:bg-gray-700 mb-2';
            goalElement.innerHTML = `
                <input type="checkbox" class="form-checkbox" ${goal.completed ? 'checked' : ''}>
                <span>${goal.text}</span>
                <button class="ml-auto text-red-500">&times;</button>
            `;
            
            if (goal.completed) {
                goalElement.classList.add('line-through');
            }

            goalsList.appendChild(goalElement);

            const checkbox = goalElement.querySelector('input');
            const deleteBtn = goalElement.querySelector('button');
            
            checkbox.addEventListener('change', () => {
                goalElement.classList.toggle('line-through', checkbox.checked);
                saveGoals();
            });

            deleteBtn.addEventListener('click', () => {
                goalElement.remove();
                saveGoals();
            });
        });
    }
}

function saveMoodToStorage() {
    localStorage.setItem('currentMood', currentMood.toString());
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

    setupMoodSelector();
    loadGoals();
    updateQuote();
}

// Démarrer l'application
init();
