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
const nextButton = document.getElementById('next-btn');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');

/* ==========================================================================
   4. EVENT LISTENERS & NETWORK SYNC
   ========================================================================== */
if (startAppBtn) startAppBtn.addEventListener('click', handleStudentSignIn);
if (cameraInput) cameraInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
if (fileInput) fileInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files));
if (nextButton) nextButton.addEventListener('click', advanceArenaChallenge);
if (restartButton) restartButton.addEventListener('click', resetArenaSession);

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
    // Prompt the teacher for the key once so it stays completely private and secure
    if (!localStorage.getItem('gemini_api_key')) {
        const key = prompt("Please enter your Google Gemini API Key to activate the AI Camera scanner:");
        if (key) localStorage.setItem('gemini_api_key', key);
    }

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

// 🟢 LIVE FIX: Directly calling Google's official Gemini AI Flash Endpoint
async function triggerArenaLoad(files) {
    if (!files || !files[0]) return;
    const targetFile = files[0];
    fileNameSpan.textContent = targetFile.name;
    filePreview.classList.remove('hidden');
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    broadcastStudentData("AI Reading Textbook Matrix... 🧬");

    const apiKey = localStorage.getItem('gemini_api_key') || "NO_KEY";

    try {
        const base64Raw = await parseImageToBase64(targetFile);
        // Clean out the meta prefix (e.g. data:image/jpeg;base64,) to leave just the pure image text data
        const pureBase64 = base64Raw.split(',')[1];

        // Official Google Gemini API Endpoint url
        const url = `https://googleapis.com{apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType: targetFile.type || "image/jpeg", data: pureBase64 } },
                        { text: "Analyze this biology textbook worksheet camera scan. Generate ONE single question matching the Macao Basic Academic Attainments (BAA) guidelines for Senior Secondary Biology. Return your response strictly as a single clean JSON object string with no markdown formatting tags. The JSON must contain these exact keys: 'type' (set to 'multiple-choice'), 'question' (starting with the tag '[Macao BAA Dynamic]'), 'options' (an array of 4 distinct answers), and 'answer' (the zero-based index integer of the correct option)." }
                    ]
                }]
            })
        });

        if (!response.ok) throw new Error("Google Gemini API rejected request");
        const jsonResult = await response.json();
        
        // Extract out text and parse it into our quiz array layout
        const aiTextRaw = jsonResult.candidates[0].content.parts[0].text.trim();
        const cleanJsonString = aiTextRaw.replace(/^```json|```$/g, '');
        const aiQuestion = JSON.parse(cleanJsonString);
        
        quizQuestions = [aiQuestion];
        
    } catch (error) {
        console.log("Falling back to local matrix bank:", error);
        quizQuestions = [...dynamicClassroomBank].sort(() => Math.random() - 0.5);
    } finally {
        loadingSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        currentQuestionIndex = 0;
        userScore = 0;
        answerStreak = 0;
        renderActiveChallenge();
    }
}

function renderActiveChallenge() {
    if (nextButton) nextButton.classList.remove('hidden');
    if (!quizQuestions || quizQuestions.length === 0) return;
    
    const activeQ = quizQuestions[currentQuestionIndex];
    if (questionText) {
        questionText.innerText = activeQ.question;
    }
    
    if (optionsContainer) {
        optionsContainer.innerHTML = "";
        if (activeQ.type === "multiple-choice" || activeQ.type === "true-false") {
            activeQ.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "option-btn-style";
                btn.innerText = opt;
                btn.onclick = () => verifyUserAnswer(idx);
                optionsContainer.appendChild(btn);
            });
        } else {
            const inputBox = document.createElement('input');
            inputBox.type = "text";
