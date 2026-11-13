/* ==========================================================================
   1. CORE FIREBASE & GITHUB REPOSITORY SETUP
   ========================================================================== */
const GITHUB_OWNER = "ishmyl";
const GITHUB_REPO = "biology-PWA";

const firebaseConfig = {
    apiKey: "AIzaSyChSMRbqSFmAE2dNlGHa6AFcc4SpWM1V7g",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "wayground-bioarena",
    storageBucket: "wayground-bioarena.firebasestorage.app",
    messagingSenderId: "7169528648",
    appId: "1:7169528648:web:085387e296b0ecdacf4339"
};

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        console.log("🚀 Firebase connected successfully!");
    }
} catch (e) {
    console.log("Network shielded:", e);
}

/* ==========================================================================
   2. APP STATE VARIABLES & FALLBACK BANK
   ========================================================================== */
let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let answerStreak = 0;
let currentPlayerName = "Player";
let currentSessionId = "";
let currentTopicTitle = "General Biology";
let questionAnswered = false;

const fallbackBank = [
    {
        type: "multiple-choice",
        question: "[Macao BAA Core] Which organelle contains its own unique metabolic DNA matrix and acts as the site for the Krebs cycle and electron transport chain?",
        options: ["Endoplasmic Reticulum", "Mitochondria", "Lysosome", "Ribosome"],
        answer: 1
    },
    {
        type: "true-false",
        question: "[Macao BAA Core] Eukaryotic cells segregate genetic materials inside a true double-membraned nucleus, whereas prokaryotic cells completely lack an enclosed nuclear envelope.",
        options: ["True", "False"],
        answer: 0
    },
    {
        type: "fill-blank",
        question: "[Macao BAA Intermediate] The initial anaerobic process occurring in the cellular cytoplasm that fractures one glucose molecule into two molecules of pyruvate is _________.",
        answer: "glycolysis"
    }
];

/* ==========================================================================
   3. DOM ELEMENT SELECTORS
   ========================================================================== */
const registrationSection = document.getElementById('registration-section');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');

const formSelect = document.getElementById('form-select');
const classLetterInput = document.getElementById('class-letter-input');
const classNumInput = document.getElementById('class-num-input');
const studentNameInput = document.getElementById('student-name-input');
const startAppBtn = document.getElementById('start-app-btn');
const displayStudentName = document.getElementById('display-student-name');

const chapterSelect = document.getElementById('chapter-select');
const topicSelect = document.getElementById('topic-select');
const startChapterBtn = document.getElementById('start-chapter-btn');
const cameraInput = document.getElementById('camera-input');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileNameSpan = document.getElementById('file-name');
const loadingTitle = document.getElementById('loading-title');

const progressText = document.getElementById('progress-text');
const streakCounter = document.getElementById('streak-counter');
const scoreText = document.getElementById('score-text');
const progressBar = document.getElementById('progress-bar');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextButton = document.getElementById('next-btn');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');

/* ==========================================================================
   4. EVENT LISTENERS & GITHUB FOLDER TOPIC SCANNER
   ========================================================================== */
if (startAppBtn) startAppBtn.addEventListener('click', handleStudentSignIn);
if (chapterSelect) chapterSelect.addEventListener('change', () => loadTopicsInFolder(chapterSelect.value));
if (startChapterBtn) startChapterBtn.addEventListener('click', handleTopicStart);
if (cameraInput) cameraInput.addEventListener('change', (e) => triggerFileLoad(e.target.files));
if (fileInput) fileInput.addEventListener('change', (e) => triggerFileLoad(e.target.files));
if (nextButton) nextButton.addEventListener('click', advanceArenaChallenge);
if (restartButton) restartButton.addEventListener('click', resetArenaSession);

// Automatically scans the chosen GitHub folder (e.g., "Chapter 1", "chapter 25") for topic files
async function loadTopicsInFolder(folderName) {
    if (!topicSelect) return;
    topicSelect.innerHTML = `<option value="">Scanning ${folderName}...</option>`;

    try {
        const encodedFolder = encodeURIComponent(folderName);
        const apiUrl = `https://github.com{GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedFolder}`;
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error("Could not read folder");
        const items = await response.json();

        // Filter for files (ignores hidden files like .DS_Store)
        const files = items.filter(item => item.type === "file" && !item.name.startsWith("."));

        if (files.length === 0) {
            topicSelect.innerHTML = `<option value="fallback">No topic files yet (Use Practice Set)</option>`;
            return;
        }

        topicSelect.innerHTML = "";
        files.forEach(file => {
            const opt = document.createElement('option');
            // Use relative path for GitHub Pages (e.g., "Chapter 1/topic1.txt")
            opt.value = `${folderName}/${file.name}`;
            // Clean display title by removing file extension
            opt.textContent = file.name.replace(/\.[^/.]+$/, "");
            topicSelect.appendChild(opt);
        });
    } catch (err) {
        console.warn("GitHub API fallback triggered:", err);
        topicSelect.innerHTML = `<option value="fallback">Macao BAA Core Biology Practice</option>`;
    }
}

// Pre-load Chapter 1 topics on startup
if (chapterSelect) {
    loadTopicsInFolder(chapterSelect.value);
}

function broadcastStudentData(statusMessage) {
    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length && currentSessionId) {
            firebase.database().ref('student_sessions/' + currentSessionId).set({
                name: currentPlayerName,
                topic: currentTopicTitle,
                score: userScore,
                streak: answerStreak,
                currentQuestion: currentQuestionIndex + 1,
                totalQuestions: quizQuestions.length,
                lastStatus: statusMessage,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.log("Broadcast network shielded:", e);
    }
}

/* ==========================================================================
   5. SIGN-IN & SMART TOPIC QUESTION GENERATOR ENGINE
   ========================================================================== */
function handleStudentSignIn() {
    const formVal = formSelect ? formSelect.value : "F5";
    const letterVal = classLetterInput ? (classLetterInput.value.trim().toUpperCase() || "X") : "X";
    const numVal = classNumInput ? (classNumInput.value.trim() || "00") : "00";
    const nameVal = studentNameInput ? studentNameInput.value.trim() : "";

    if (!nameVal) {
        alert("Please type your name to enter the arena!");
        return;
    }

    const classTag = `${formVal}${letterVal}_${numVal}`;
    currentPlayerName = nameVal;
    if (displayStudentName) {
        displayStudentName.textContent = `${classTag}, ${currentPlayerName}`;
    }
    currentSessionId = `${classTag}_${currentPlayerName.replace(/[^a-zA-Z0-9]/g, "_")}`;

    broadcastStudentData("Joined Arena");
    registrationSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
}

async function handleTopicStart() {
    const selectedChapter = chapterSelect ? chapterSelect.value : "Biology";
    const selectedPath = topicSelect ? topicSelect.value : "fallback";
    const topicName = topicSelect && topicSelect.selectedOptions
        ? topicSelect.selectedOptions.textContent
        : "Topic";

    currentTopicTitle = `${selectedChapter} — ${topicName}`;

    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    if (loadingTitle) loadingTitle.textContent = `Generating questions for ${currentTopicTitle}...`;

    broadcastStudentData(`Studying: ${currentTopicTitle}`);

    try {
        if (!selectedPath || selectedPath === "fallback") {
            throw new Error("Using fallback bank");
        }
        // Encode path segments safely (handles spaces like "Chapter 1/My Topic.txt")
        const safeUrl = selectedPath.split('/').map(encodeURIComponent).join('/') + `?t=${Date.now()}`;
        const response = await fetch(safeUrl);
        if (!response.ok) throw new Error("Topic file could not be loaded");
        const rawText = await response.text();
        quizQuestions = generateQuestionsFromContent(rawText, topicName);
    } catch (err) {
        console.warn("Falling back to default bank:", err);
        quizQuestions = [...fallbackBank].sort(() => Math.random() - 0.5);
    }

    setTimeout(() => {
        loadingSection.classList.add('hidden');
