/* ==========================================================================
   1. CORE FIREBASE SETUP & CLOUD NETWORK CONNECTIVITY
   ========================================================================== */
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
   4. EVENT LISTENERS
   ========================================================================== */
if (startAppBtn) startAppBtn.addEventListener('click', handleStudentSignIn);
if (startChapterBtn) startChapterBtn.addEventListener('click', handleChapterStart);
if (cameraInput) cameraInput.addEventListener('change', (e) => triggerFileLoad(e.target.files));
if (fileInput) fileInput.addEventListener('change', (e) => triggerFileLoad(e.target.files));
if (nextButton) nextButton.addEventListener('click', advanceArenaChallenge);
if (restartButton) restartButton.addEventListener('click', resetArenaSession);

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
   5. SIGN-IN & CHAPTER LOADER
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

async function handleChapterStart() {
    const selectedPath = chapterSelect ? chapterSelect.value : "";
    const chapterLabel = chapterSelect && chapterSelect.selectedOptions.length > 0
        ? chapterSelect.selectedOptions[0].textContent
        : "Biology Chapter";

    currentTopicTitle = chapterLabel;
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    if (loadingTitle) loadingTitle.textContent = `Loading ${chapterLabel}...`;

    broadcastStudentData(`Studying: ${chapterLabel}`);

    try {
        if (!selectedPath) throw new Error("No chapter selected");

        const safeUrl = selectedPath.split('/').map(encodeURIComponent).join('/') + `?t=${Date.now()}`;
        const response = await fetch(safeUrl);
        if (!response.ok) throw new Error("Chapter file not found");

        const rawText = await response.text();
        let parsedQuestions = [];

        // Try parsing as JSON first (works for both .json and JSON inside .txt)
        try {
            const jsonData = JSON.parse(rawText);
            if (Array.isArray(jsonData) && jsonData.length > 0) {
                parsedQuestions = jsonData;
            }
        } catch (jsonErr) {
            // If chapter 27/questions.txt is plain text, parse sentences into questions
            parsedQuestions = parsePlainTextQuestions(rawText, chapterLabel);
        }

        if (!parsedQuestions || parsedQuestions.length === 0) {
            throw new Error("Empty question list");
        }

        // Shuffle questions for variety
        quizQuestions = [...parsedQuestions].sort(() => Math.random() - 0.5);
    } catch (err) {
        console.warn("Using fallback bank:", err);
        quizQuestions = [...fallbackBank].sort(() => Math.random() - 0.5);
    }

    setTimeout(() => {
        loadingSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        currentQuestionIndex = 0;
        userScore = 0;
        answerStreak = 0;
        updateHUD();
        renderActiveChallenge();
    }, 800);
}

function parsePlainTextQuestions(rawText, topicLabel) {
    const sentences = rawText
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.split(' ').length >= 6 && s.split(' ').length <= 35);

    if (sentences.length < 2) return [...fallbackBank];

    const stopWords = new Set(["which", "their", "there", "these", "those", "where", "while", "during", "through", "between", "because", "before", "after", "about", "into", "from", "with", "that", "this", "have"]);
    const keywordPool = [];

    const items = sentences.map(sentence => {
        const words = sentence.match(/\b[A-Za-z]{5,}\b/g) || [];
        const candidates = words.filter(w => !stopWords.has(w.toLowerCase()));
        const targetWord = candidates.length > 0
            ? candidates.sort((a, b) => b.length - a.length)[0]
            : (words[0] || "biology");
        if (targetWord) keywordPool.push(targetWord);
        return { sentence, targetWord };
    });

    const uniqueKeywords = [...new Set(keywordPool.map(w => w.toLowerCase()))];

    return items.slice(0, 10).map((item, idx) => {
        const blanked = item.sentence.replace(new RegExp(`\\b${item.targetWord}\\b`, 'i'), '_________');
        if (idx % 2 === 0 && uniqueKeywords.length >= 4) {
            const distractors = uniqueKeywords
