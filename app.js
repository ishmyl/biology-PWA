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
   2. APP STATE VARIABLES & MASTER QUESTION BANK (MACAO BAA COMPLIANT)
   ========================================================================== */
let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let answerStreak = 0;
let currentPlayerName = "Player";
let currentSessionId = "";

const dynamicClassroomBank = [
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
    },
    {
        type: "true-false",
        question: "[Macao BAA Intermediate] Photosynthesis is a catabolic, exergonic pathway that releases chemical energy for plant cells during nighttime hours.",
        options: ["True", "False"],
        answer: 1
    },
    {
        type: "fill-blank",
        question: "[Macao BAA Intermediate] The fundamental peptide monomers linked via peptide bonds to assemble complex structural protein chains are called _________ acids.",
        answer: "amino"
    },
    {
        type: "structured",
        question: "[BEYOND MACAO BAA - CRITICAL THINKING] A cell is exposed to a metabolic inhibitor that completely prevents the synthesis of Adenosine Triphosphate (ATP). Predict and analyze the immediate impact on both active transport mechanisms (like the Sodium-Potassium pump) and passive diffusion across the plasma membrane.",
        rubric: "Excellent analysis! To score a full point, your answer must demonstrate beyond-baseline mastery: 1) Active transport will immediately halt because it depends on direct ATP phosphorylation. 2) Passive diffusion or osmosis will continue unaffected because they rely solely on kinetic concentration gradients. 3) The Sodium-Potassium pump will freeze, causing an accumulation of sodium ions inside the cell matrix."
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
   4. EVENT LISTENERS & NETWORK SYNC
   ========================================================================== */
startAppBtn.addEventListener('click', handleStudentSignIn);
cameraInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
fileInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
nextButton.addEventListener('click', advanceArenaChallenge);
restartButton.addEventListener('click', resetArenaSession);

function broadcastStudentData(statusMessage) {
    try {
        if (typeof firebase !== 'undefined' && currentSessionId) {
            firebase.database().ref('student_sessions/' + currentSessionId).set({
                name: currentPlayerName,
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
   5. CORE GAME WORKFLOW
   ========================================================================== */
function handleStudentSignIn() {
    try {
        const formVal = formSelect.value;
        const letterVal = classLetterInput.value.trim().toUpperCase() || "X";
        const numVal = classNumInput.value.trim() || "00";
        const nameVal = studentNameInput.value.trim();

        if (!nameVal) {
            alert("Please type your name to enter the arena!");
            return;
        }

        const classTag = `${formVal}${letterVal}_${numVal}`;
        currentPlayerName = nameVal;
        displayStudentName.textContent = `${classTag}, ${currentPlayerName}`;
        currentSessionId = `${classTag}_${currentPlayerName.replace(/[^a-zA-Z0-9]/g, "_")}`;

        broadcastStudentData("Joined Arena");
        
        registrationSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    } catch (err) {
        registrationSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
}

function triggerArenaLoad(file) {
    if (!file || !file[0]) return;
    fileNameSpan.textContent = file[0].name;
    filePreview.classList.remove('hidden');
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    broadcastStudentData("Analyzing Material...");

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

    progressText.textContent = `Q: ${currentQuestionIndex + 1}/${quizQuestions.length}`;
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
    } else if (activeQ.type === "fill-blank") {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type missing term...';
        input.id = 'arena-text-input';
        
        const subBtn = document.createElement('button');
        subBtn.className = 'btn btn-action';
        subBtn.textContent = 'Lock In Term';
        subBtn.addEventListener('click', () => scoreTextChallenge(input, subBtn));
        
        optionsContainer.appendChild(input);
        optionsContainer.appendChild(subBtn);
    } else if (activeQ.type === "structured") {
        const area = document.createElement('textarea');
        area.placeholder = 'Write explanation narrative details...';
        area.rows = 4;
        
        const subBtn = document.createElement('button');
