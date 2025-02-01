// Configuration
const MOODS = {
  '😊': 'Heureux',
  '🚀': 'Productif',
  '💡': 'Inspiré',
  '🤔': 'Perplexe',
  '😫': 'Fatigué',
  '🤯': 'Dépassé',
  '☕️': 'Besoin de café',
  '😴': 'Endormi'
};

const QUOTES = [
  "Le code est comme l'humeur. Quand on doit l'expliquer, c'est mauvais.",
  "La simplicité est la sophistication suprême.",
  "Le meilleur code est celui qu'on n'a pas à écrire.",
  "Un bon développeur est celui qui regarde des deux côtés avant de traverser une rue à sens unique.",
  "Il y a deux façons d'écrire du code sans bugs. Seule la troisième fonctionne."
];

// Sélecteurs DOM
const elements = {
  moodDisplay: document.getElementById('mood-display'),
  moodSelector: document.getElementById('mood-selector'),
  currentMood: document.getElementById('current-mood'),
  themeToggle: document.getElementById('theme-toggle'),
  journalEntry: document.getElementById('journal-entry'),
  saveButton: document.getElementById('save-entry'),
  tagButtons: document.querySelectorAll('.tag-btn'),
  goalInput: document.getElementById('new-goal'),
  addGoalButton: document.getElementById('add-goal'),
  goalsList: document.getElementById('goals-list'),
  journalEntries: document.getElementById('journal-entries'),
  quoteElement: document.getElementById('daily-quote'),
  githubConnect: document.getElementById('github-connect'),
  commitsCount: document.getElementById('commits-count'),
  streakCount: document.getElementById('streak-count')
};

// État de l'application
let currentMood = '😊';
let selectedTags = new Set();
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// Configuration du sélecteur d'humeur
function setupMoodSelector() {
  Object.entries(MOODS).forEach(([emoji, description]) => {
    const moodOption = document.createElement('div');
    moodOption.className = 'mood-option';
    moodOption.textContent = emoji;
    moodOption.title = description;
    moodOption.addEventListener('click', (e) => {
      e.stopPropagation();
      currentMood = emoji;
      elements.currentMood.textContent = emoji;
      elements.moodSelector.classList.add('hidden');
      localStorage.setItem('currentMood', emoji);
    });
    elements.moodSelector.appendChild(moodOption);
  });

  elements.currentMood.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.moodSelector.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    elements.moodSelector.classList.add('hidden');
  });
}

// Gestion des tags
function setupTags() {
  elements.tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      const tag = btn.dataset.tag;
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
    });
  });
}

// Gestion du journal technique
function saveEntry() {
  const content = elements.journalEntry.value.trim();
  if (!content) return;

  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  entries.unshift({
    id: Date.now(),
    content,
    mood: currentMood,
    tags: Array.from(selectedTags),
    timestamp: new Date().toISOString()
  });

  localStorage.setItem('entries', JSON.stringify(entries));

  // Réinitialisation
  elements.journalEntry.value = '';
  selectedTags.clear();
  elements.tagButtons.forEach(btn => btn.classList.remove('selected'));

  loadJournalEntries();
}

function loadJournalEntries() {
  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  elements.journalEntries.innerHTML = '';

  entries.forEach(entry => {
    const entryElement = document.createElement('div');
    entryElement.className = 'journal-entry';
    entryElement.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="mood-emoji">${entry.mood}</span>
          ${entry.tags.map(tag => `<span class="tag-btn selected">${tag}</span>`).join(' ')}
        </div>
        <small>${new Date(entry.timestamp).toLocaleString()}</small>
      </div>
      <p>${entry.content}</p>
    `;
    elements.journalEntries.appendChild(entryElement);
  });
}

// Gestion des objectifs
function setupGoals() {
  loadGoals();
  elements.addGoalButton.addEventListener('click', addGoal);
  elements.goalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addGoal();
    }
  });
}

function addGoal() {
  const goalText = elements.goalInput.value.trim();
  if (!goalText) return;

  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  goals.push({
    id: Date.now(),
    text: goalText,
    completed: false
  });

  localStorage.setItem('goals', JSON.stringify(goals));
  elements.goalInput.value = '';
  loadGoals();
}

function loadGoals() {
  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  elements.goalsList.innerHTML = '';

  goals.forEach(goal => {
    const goalElement = document.createElement('div');
    goalElement.className = 'goal-item';
    goalElement.innerHTML = `
      <input type="checkbox" ${goal.completed ? 'checked' : ''}>
      <span class="${goal.completed ? 'line-through' : ''}">${goal.text}</span>
      <button class="ml-auto text-red-500">&times;</button>
    `;

    const checkbox = goalElement.querySelector('input');
    const deleteBtn = goalElement.querySelector('button');

    checkbox.addEventListener('change', () => {
      goal.completed = checkbox.checked;
      goalElement.querySelector('span').classList.toggle('line-through', checkbox.checked);
      updateGoalsFromDOM();
    });

    deleteBtn.addEventListener('click', () => {
      goalElement.remove();
      updateGoalsFromDOM();
    });

    elements.goalsList.appendChild(goalElement);
  });
}

function updateGoalsFromDOM() {
  const goals = Array.from(elements.goalsList.children).map(goalEl => ({
    text: goalEl.querySelector('span').textContent,
    completed: goalEl.querySelector('input').checked
  }));
  localStorage.setItem('goals', JSON.stringify(goals));
}

// Gestion du thème (mode sombre)
function setupTheme() {
  document.body.classList.toggle('dark', isDarkMode);
  elements.themeToggle.innerHTML = isDarkMode ? '☀️' : '🌙';

  elements.themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    elements.themeToggle.innerHTML = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
  });
}

// Gestion des citations
function updateQuote() {
  const randomIndex = Math.floor(Math.random() * QUOTES.length);
  elements.quoteElement.textContent = `"${QUOTES[randomIndex]}"`;
}

// Simulation de connexion GitHub
function setupGitHub() {
  elements.githubConnect.addEventListener('click', async () => {
    // Simulation de données GitHub
    elements.commitsCount.textContent = Math.floor(Math.random() * 10);
    elements.streakCount.textContent = Math.floor(Math.random() * 30) + 'j';
  });
}

// Initialisation de l'application
function init() {
  setupMoodSelector();
  setupTags();
  setupGoals();
  setupTheme();
  setupGitHub();
  updateQuote();
  loadJournalEntries();

  // Charger l'humeur sauvegardée
  const savedMood = localStorage.getItem('currentMood');
  if (savedMood && MOODS[savedMood]) {
    currentMood = savedMood;
    elements.currentMood.textContent = currentMood;
  }

  // Gestion de la sauvegarde du journal
  elements.saveButton.addEventListener('click', saveEntry);
}

document.addEventListener('DOMContentLoaded', init);
