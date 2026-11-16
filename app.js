/* ==========================================================================
   1. FIREBASE & APP STATE
   ========================================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyChSMRbqSFmAE2dNlGHa6AFcc4SpWM1V7g",
    authDomain: "wayground-bioarena.firebaseapp.com",
    databaseURL: "https://wayground-bioarena-default-rtdb.firebaseio.com",
    projectId: "wayground-bioarena",
    storageBucket: "wayground-bioarena.firebasestorage.app",
    messagingSenderId: "7169528648",
    appId: "1:7169528648:web:085387e296b0ecdacf4339"
};

try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (e) { console.log("Network shielded:", e); }

let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let answerStreak = 0;
let currentPlayerName = "Player";
let currentSessionId = "";
let currentTopicTitle = "General Biology";
let questionAnswered = false;

const fallbackBank = [
    { type: "multiple-choice", question: "[Macao BAA] Which organelle is the site for the Krebs cycle and aerobic ATP production?", options: ["Endoplasmic Reticulum", "Mitochondria", "Lysosome", "Ribosome"], answer: 1 },
    { type: "true-false", question: "[Macao BAA] Eukaryotic cells have a double-membraned nucleus, while prokaryotic cells lack an enclosed nucleus.", options: ["True", "False"], answer: 0 },
    { type: "fill-blank", question: "[Macao BAA] The anaerobic breakdown of glucose into pyruvate in the cytoplasm is called _________.", answer: "glycolysis" }
];

/* ==========================================================================
   2. DOM SELECTORS & LISTENERS
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
                name: currentPlayerName, topic: currentTopicTitle, score: userScore,
                streak: answerStreak, currentQuestion: currentQuestionIndex + 1,
                totalQuestions: quizQuestions.length, lastStatus: statusMessage, timestamp: Date.now()
            }).catch(err => console.log("DB write skipped:", err));
        }
    } catch (e) { console.log("Sync shielded:", e); }
}

/* ==========================================================================
   3. SIGN-IN & 25-QUESTION CHAPTER LOADER
   ========================================================================== */
function handleStudentSignIn() {
    const formVal = formSelect ? formSelect.value : "F5";
    const letterVal = classLetterInput ? (classLetterInput.value.trim().toUpperCase() || "X") : "X";
    const numVal = classNumInput ? (classNumInput.value.trim() || "00") : "00";
    const nameVal = studentNameInput ? studentNameInput.value.trim() : "";

    if (!nameVal) { alert("Please type your name to enter the arena!"); return; }

    const classTag = `${formVal}${letterVal}_${numVal}`;
    currentPlayerName = nameVal;
    if (displayStudentName) displayStudentName.textContent = `${classTag}, ${currentPlayerName}`;
    currentSessionId = `${classTag}_${currentPlayerName.replace(/[^a-zA-Z0-9]/g, "_")}`;

    if (registrationSection) registrationSection.classList.add('hidden');
    if (uploadSection) uploadSection.classList.remove('hidden');

    broadcastStudentData("Joined Arena");
}

async function handleChapterStart() {
    const selectedFolder = (chapterSelect ? chapterSelect.value : "chapter 1").trim().toLowerCase();
    const selectedOpt = chapterSelect && chapterSelect.selectedOptions ? chapterSelect.selectedOptions.item(0) : null;
    const chapterLabel = selectedOpt ? selectedOpt.textContent : selectedFolder;

    currentTopicTitle = chapterLabel;
    if (uploadSection) uploadSection.classList.add('hidden');
    if (loadingSection) loadingSection.classList.remove('hidden');
    if (loadingTitle) loadingTitle.textContent = `Loading 25 questions for ${chapterLabel}...`;
    broadcastStudentData(`Studying: ${chapterLabel}`);

    try {
        const safeUrl = `${encodeURIComponent(selectedFolder)}/questions.json?t=${Date.now()}`;
        const response = await fetch(safeUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${safeUrl}`);

        const jsonData = await response.json();
        const rawList = Array.isArray(jsonData) ? jsonData : (jsonData.questions || []);
        if (rawList.length === 0) throw new Error("No questions in file");

        const normalized = rawList.map(q => {
            const hasOptions = Array.isArray(q.options) && q.options.length > 0;
            const qType = q.type || (hasOptions ? (q.options.length === 2 ? "true-false" : "multiple-choice") : "fill-blank");
            let resolvedAnswer = q.answer;

            if (hasOptions && typeof q.answer === "string") {
                const idx = q.options.findIndex(o => o.trim().toLowerCase() === q.answer.trim().toLowerCase());
                if (idx !== -1) resolvedAnswer = idx;
            }

            return {
                type: qType,
                question: q.question || q.prompt || "Biology Question",
                options: q.options || [],
                answer: resolvedAnswer
            };
        });

        quizQuestions = normalized.slice().sort(() => Math.random() - 0.5).slice(0, 25);
    } catch (err) {
        console.warn("Fallback triggered:", err);
        quizQuestions = fallbackBank.slice().sort(() => Math.random() - 0.5);
    }

    setTimeout(() => {
        if (loadingSection) loadingSection.classList.add('hidden');
        if (quizSection) quizSection.classList.remove('hidden');
        currentQuestionIndex = 0; userScore = 0; answerStreak = 0;
        updateHUD(); renderActiveChallenge();
    }, 600);
}

function triggerFileLoad(files) {
    const firstFile = files ? files.item(0) : null;
    if (!firstFile) return;
    if (fileNameSpan) fileNameSpan.textContent = firstFile.name;
    if (filePreview) filePreview.classList.remove('hidden');

    if (uploadSection) uploadSection.classList.add('hidden');
    if (loadingSection) loadingSection.classList.remove('hidden');

    setTimeout(() => {
        quizQuestions = fallbackBank.slice().sort(() => Math.random() - 0.5);
        if (loadingSection) loadingSection.classList.add('hidden');
        if (quizSection) quizSection.classList.remove('hidden');
        currentQuestionIndex = 0; userScore = 0; answerStreak = 0;
        updateHUD(); renderActiveChallenge();
    }, 800);
}

/* ==========================================================================
   4. QUIZ RENDERING & SCORING
   ========================================================================== */
function updateHUD() {
    const total = quizQuestions.length || 1;
    if (progressText) progressText.textContent = `Q: ${currentQuestionIndex + 1}/${total}`;
    if (streakCounter) streakCounter.textContent = answerStreak;
    if (scoreText) scoreText.textContent = `${userScore} pts`;
    if (progressBar) progressBar.style.width = `${(currentQuestionIndex / total) * 100}%`;
}

function renderActiveChallenge() {
    questionAnswered = false;
    if (nextButton) nextButton.classList.add('hidden');
    if (!quizQuestions || quizQuestions.length === 0) return;

    updateHUD();
    const activeQ = quizQuestions.at(currentQuestionIndex);
    if (!activeQ) return;
    if (questionText) questionText.innerText = activeQ.question;

    if (optionsContainer) {
        optionsContainer.innerHTML = "";
        if (activeQ.type === "multiple-choice" || activeQ.type === "true-false") {
