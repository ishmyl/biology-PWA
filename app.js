/* ==========================================================================
   1. FIREBASE & APP STATE
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
    if (typeof firebase !== 'undefined') firebase.initializeApp(firebaseConfig);
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
            });
        }
    } catch (e) { console.log("Sync shielded:", e); }
}

/* ==========================================================================
   3. SIGN-IN & CHAPTER LOADER
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

    broadcastStudentData("Joined Arena");
    registrationSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
}

async function handleChapterStart() {
    const selectedPath = chapterSelect ? chapterSelect.value : "";
    const chapterLabel = chapterSelect && chapterSelect.selectedOptions.length > 0
        ? chapterSelect.selectedOptions[0].textContent : "Biology Chapter";

    currentTopicTitle = chapterLabel;
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    if (loadingTitle) loadingTitle.textContent = `Loading ${chapterLabel}...`;
    broadcastStudentData(`Studying: ${chapterLabel}`);

    try {
        if (!selectedPath) throw new Error("No chapter");
        const safeUrl = selectedPath.split('/').map(encodeURIComponent).join('/') + `?t=${Date.now()}`;
        const response = await fetch(safeUrl);
        if (!response.ok) throw new Error("File missing");
        const rawText = await response.text();

        let parsed = [];
        try {
            const jsonData = JSON.parse(rawText);
            if (Array.isArray(jsonData) && jsonData.length > 0) parsed = jsonData;
        } catch (err) {
            parsed = parsePlainTextQuestions(rawText, chapterLabel);
        }
        quizQuestions = (parsed.length > 0 ? parsed : fallbackBank).slice().sort(() => Math.random() - 0.5);
    } catch (err) {
        quizQuestions = fallbackBank.slice().sort(() => Math.random() - 0.5);
    }

    setTimeout(() => {
        loadingSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        currentQuestionIndex = 0; userScore = 0; answerStreak = 0;
        updateHUD(); renderActiveChallenge();
    }, 700);
}

function parsePlainTextQuestions(rawText, topicLabel) {
    const sentences = rawText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
        .map(s => s.trim()).filter(s => s.split(' ').length >= 6 && s.split(' ').length <= 35);
    if (sentences.length < 2) return fallbackBank;

    const stop = new Set(["which","their","there","these","those","where","while","during","through","between","because","before","after","about","into","from","with","that","this","have"]);
    const items = sentences.map(sentence => {
        const words = (sentence.match(/\b[A-Za-z]{5,}\b/g) || []).filter(w => !stop.has(w.toLowerCase()));
        const target = words.sort((a, b) => b.length - a.length)[0] || "biology";
        return { sentence, target };
    });

    return items.slice(0, 10).map(item => ({
        type: "fill-blank",
        question: `[${topicLabel}] Fill in the missing term:\n"${item.sentence.replace(new RegExp(`\\b${item.target}\\b`, 'i'), '_________')}"`,
        answer: item.target
    }));
}

function triggerFileLoad(files) {
    if (!files || !files[0]) return;
    if (fileNameSpan) fileNameSpan.textContent = files[0].name;
    if (filePreview) filePreview.classList.remove('hidden');
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    setTimeout(() => {
        quizQuestions = fallbackBank.slice().sort(() => Math.random() - 0.5);
        loadingSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        currentQuestionIndex = 0; userScore = 0; answerStreak = 0;
        updateHUD(); renderActiveChallenge();
    }, 800);
}

/* ==========================================================================
   4. QUIZ ENGINE & SCORING
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
    if (!quizQuestions.length) return;
    updateHUD();

    const q = quizQuestions[currentQuestionIndex];
    if (questionText) questionText.innerText = q.question;
    if (!optionsContainer) return;
    optionsContainer.innerHTML = "";

    if (q.type === "multiple-choice" || q.type === "true-false") {
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.type = "button"; btn.className = "option-btn"; btn.innerText = opt;
            btn.onclick = () => verifyUserAnswer(idx, btn);
            optionsContainer.appendChild(btn);
        });
    } else {
        const input = document.createElement('input');
        input.type = "text"; input.id = "fill-blank-input"; input.placeholder = "Type your answer here...";
        const submit = document.createElement('button');
        submit.type = "button"; submit.className = "btn btn-action"; submit.innerText = "Submit Answer ✅";
        submit.onclick = () => verifyUserAnswer(input.value.trim(), submit);
        optionsContainer.appendChild(input); optionsContainer.appendChild(submit);
    }
}

function verifyUserAnswer(choice, el) {
    if (questionAnswered) return;
    questionAnswered = true;
    const q = quizQuestions[currentQuestionIndex];
    let correct = false;

    if (q.type === "multiple-choice" || q.type === "true-false") {
        correct = (choice === q.answer);
        optionsContainer.querySelectorAll('.option-btn').forEach((b, i) => {
            b.disabled = true;
            if (i === q.answer) b.classList.add('correct');
            else if (i === choice && !correct) b.classList.add('incorrect');
        });
    } else {
        correct = (String(choice).toLowerCase() === String(q.answer).toLowerCase());
        const inputEl = document.getElementById('fill-blank-input');
        if (inputEl) {
            inputEl.disabled = true;
            inputEl.style.borderColor = correct ? "var(--correct-glow)" : "var(--incorrect-glow)";
            if (!correct) inputEl.value = `${choice} (Correct: ${q.answer})`;
        }
        if (el) {
            el.disabled = true; el.innerText = correct ? "Correct! 🎉" : `Answer: ${q.answer}`;
            el.style.backgroundColor = correct ? "var(--correct-glow)" : "var(--incorrect-glow)";
        }
    }

    if (correct) { answerStreak++; userScore += 100 + (answerStreak * 10); broadcastStudentData("Correct 🔥"); }
    else { answerStreak = 0; broadcastStudentData("Missed"); }
    updateHUD();
    if (nextButton) nextButton.classList.remove('hidden');
}

function advanceArenaChallenge() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) renderActiveChallenge();
    else {
        if (progressBar) progressBar.style.width = "100%";
        quizSection.classList.add('hidden'); resultsSection.classList.remove('hidden');
        if (finalScoreElement) finalScoreElement.textContent = `${userScore} pts`;
        broadcastStudentData("Completed 🏆");
    }
}

function resetArenaSession() {
    currentQuestionIndex = 0; userScore = 0; answerStreak = 0;
    resultsSection.classList.add('hidden'); uploadSection.classList.remove('hidden');
    broadcastStudentData("Choosing Chapter");
}
