// Configuration
const MOODS = ['😊', '🤔', '😫', '🤯', '🚀', '💡', '☕️', '😴'];
const QUOTES = [
    'Le code est comme l\'humour. Quand on doit l\'expliquer, c\'est mauvais.',
    'La simplicité est la sophistication suprême.',
    'Le meilleur code est celui qu\'on n\'a pas à écrire.'
];

// Sélecteurs DOM
const moodPicker = document.getElementById('mood-picker');

// État de l'application
let currentMood = MOODS[0];
let journalEntries = [];

// Gestionnaires d'événements
moodPicker.addEventListener('click', () => {
    const currentIndex = MOODS.indexOf(currentMood);
    const nextIndex = (currentIndex + 1) % MOODS.length;
    currentMood = MOODS[nextIndex];
    moodPicker.textContent = currentMood;
    saveMood(currentMood);
});

// Fonctions de sauvegarde
function saveMood(mood) {
    localStorage.setItem('currentMood', mood);
}

// Initialisation
function init() {
    // Charger l'humeur sauvegardée
    const savedMood = localStorage.getItem('currentMood');
    if (savedMood) {
        currentMood = savedMood;
        moodPicker.textContent = currentMood;
    }
}

// Démarrer l'application
init();
