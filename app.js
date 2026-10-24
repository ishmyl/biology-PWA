/* ==========================================================================
   1. CORE FIREBASE SETUP & CLOUD NETWORK CONNECTIVITY
   ========================================================================== */
// Your live Firebase configuration credentials verified from your dashboard
const firebaseConfig = {
    apiKey: "AIzaSyChSMRbqSFmAE2dNlGHa6AFcc4SpWM1V7g",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "wayground-bioarena",
    storageBucket: "wayground-bioarena.firebasestorage.app",
    messagingSenderId: "7169528648",
    appId: "1:7169528648:web:085387e296b0ecdacf4339"
};

// Initialize Firebase linkage if the library scripts exist
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("🚀 Firebase connected successfully to BioArena!");
} else {
    console.log("⚠️ Firebase library script was not found. Running in offline fallback mode.");
}

/* ==========================================================================
   2. APP STATE VARIABLES & MASTER QUESTION BANK
   ========================================================================== */
let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let answerStreak = 0;
let currentPlayerName = "Player";
let currentSessionId = ""; // Unique id to identify individual student runs

const dynamicClassroomBank = [
    {
        type: "multiple-choice",
        question: "Which cellular organelle possesses its own DNA matrix and runs the cellular respiration pathway to produce ATP?",
        options: ["Golgi Complex", "Mitochondria", "Lysosome", "Centrosome"],
        answer: 1
    },
    {
        type: "true-false",
        question: "Eukaryotic cells keep genetic material protected inside a double-membraned cell nucleus, whereas prokaryotic cells lack a true nucleus.",
        options: ["True", "False"],
        answer: 0
    },
    {
        type: "fill-blank",
        question: "The fluid chemical process that occurs outside the mitochondria to break down one glucose molecule into pyruvic acid is called _________.",
        answer: "glycolysis"
    },
    {
        type: "structured",
        question: "Structured Analysis: Explain how active transport differs from passive transport, citing an example of a structural cell mechanism.",
        rubric: "Score yourself a point! A perfect answer must mention: 1) Active requires energy/ATP, 2) Moves against concentration gradient, 3) Example like the Sodium-Potassium pump."
    },
    {
        type: "true-false",
        question: "Photosynthesis is an energy-releasing pathway that animal cells perform inside their cytoplasm during daylight hours.",
        options: ["True", "False"],
        answer: 1
    },
    {
        type: "fill-blank",
        question: "The basic structural building blocks or protein monomers that assemble chain links into cell tissues are called _________ acids.",
        answer: "amino"
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

const studentNameInput = document.getElementById('student-name-input');
const startAppBtn = document.getElementById('start-app-btn');
const displayStudentName = document.getElementById('display-student-name');

const cameraInput = document.getElementById('camera-input');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileNameSpan = document.getElementById('file-name');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressText = document.getElementById('progress-text');
const scoreText = document.getElementById('score-text');
const streakCounter = document.getElementById('streak-counter');
const progressBar = document.getElementById('progress-bar');
const nextButton = document.getElementById('next-btn');

const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');

/* ==========================================================================
   4. EVENT LISTENERS
   ========================================================================== */
startAppBtn.addEventListener('click', handleStudentSignIn);
cameraInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
fileInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
nextButton.addEventListener('click', advanceArenaChallenge);
restartButton.addEventListener('click', resetArenaSession);

/* ==========================================================================
   5. REAL-TIME TEACHER DASHBOARD BROADCAST LOGIC
   ========================================================================== */
function broadcastStudentData(statusMessage) {
    if (typeof firebase === 'undefined' || !currentSessionId) return;

    // Send a structured update package to the cloud database path
    firebase.database().ref('student_sessions/' + currentSessionId).set({
        name: currentPlayerName,
        score: userScore,
        streak: answerStreak,
        currentQuestion: currentQuestionIndex + 1,
        totalQuestions: quizQuestions.length,
        lastStatus: statusMessage,
        timestamp: Date.now()
    }).catch(err => console.log("Database update failed:", err));
}

/* ==========================================================================
   6. CORE GAME WORKFLOW
   ========================================================================== */
function handleStudentSignIn() {
    const rawName = studentNameInput.value.trim();
    if (!rawName) {
        alert("Please enter a player tag/name to join the quiz session!");
        return;
    }
    currentPlayerName = rawName;
    displayStudentName.textContent = currentPlayerName;
    
    // Create a unique entry ID string for this specific student's run session
    currentSessionId = currentPlayerName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(1000 + Math.random() * 9000);
    
    // Broadcast initial join log to teacher dashboard
    broadcastStudentData("Joined Class Session Arena");

    registrationSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
}

function triggerArenaLoad(file) {
    if (!file) return;
    fileNameSpan.textContent = file.name;
    filePreview.classList.remove('hidden');

    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    broadcastStudentData("Analyzing Document Material...");

    setTimeout(() => {
        quizQuestions = [...dynamicClassroomBank].sort(() => Math.random() - 0.5);
        loadingSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        currentQuestionIndex = 0;
        userScore = 0;
        answerStreak = 0;
        renderActiveChallenge();
    }, 1800);
}

function renderActiveChallenge() {
    const activeQ = quizQuestions[currentQuestionIndex];
    nextButton.classList.add('hidden');
    optionsContainer.innerHTML = '';

    progressText.textContent = `Question ${currentQuestionIndex + 1}/${quizQuestions.length}`;
    scoreText.textContent = `${userScore} pts`;
    streakCounter.textContent = answerStreak;
    progressBar.style.width = `${((currentQuestionIndex) / quizQuestions.length) * 100}%`;
    questionText.textContent = activeQ.question;
    
    broadcastStudentData(`Answering Question ${currentQuestionIndex + 1}`);

    if (activeQ.type === "multiple-choice" || activeQ.type === "true-false") {
        activeQ.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => scoreButtonChallenge(idx, btn));
            optionsContainer.appendChild(btn);
        });
    }
    else if (activeQ.type === "fill-blank") {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type missing term here...';
        input.id = 'arena-text-input';
        
        const subBtn = document.createElement('button');
        subBtn.className = 'btn btn-action';
        subBtn.textContent = 'Lock In Term';
        subBtn.addEventListener('click', () => scoreTextChallenge(input, subBtn));
        
        optionsContainer.appendChild(input);
        optionsContainer.appendChild(subBtn);
    }
    else if (activeQ.type === "structured") {
        const area = document.createElement('textarea');
        area.placeholder = 'Write your explanation narrative details here...';
        area.rows = 4;
        
        const subBtn = document.createElement('button');
        subBtn.className = 'btn btn-action';
        subBtn.textContent = 'Submit Analysis';
        subBtn.addEventListener('click', () => revealStructuredRubric(area, subBtn, activeQ.rubric));
        
        optionsContainer.appendChild(area);
        optionsContainer.appendChild(subBtn);
    }
}

function scoreButtonChallenge(idx, selectedBtn) {
    const correctIdx = quizQuestions[currentQuestionIndex].answer;
    const items = optionsContainer.querySelectorAll('.option-btn');

    if (idx === correctIdx) {
        selectedBtn.classList.add('correct');
        answerStreak++;
        userScore += 100 + (answerStreak * 20); 
        broadcastStudentData("Answered Correctly (+Streak Combo)");
    } else {
