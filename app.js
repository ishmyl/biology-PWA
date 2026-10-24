alert("🚀 BioQuiz App Loaded Successfully!");
/* ==========================================================================
   1. APP STATE VARIABLES & MULTI-TYPE QUESTIONS
   ========================================================================== */
let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;

// Upgraded Bank supporting Multiple Choice, True/False, and Fill-in-the-Blank
const classroomQuestionBank = [
    {
        type: "multiple-choice",
        question: "Which organelle is referred to as the powerhouse of the cell due to its production of ATP?",
        options: ["Golgi Apparatus", "Mitochondria", "Lysosome", "Ribosome"],
        answer: 1
    },
    {
        type: "true-false",
        question: "Plant cells contain both chloroplasts and mitochondria.",
        options: ["True", "False"],
        answer: 0 // Index 0 is True
    },
    {
        type: "fill-blank",
        question: "The green pigment in plants that absorbs light energy for photosynthesis is called _________.",
        answer: "chlorophyll" 
    },
    {
        type: "multiple-choice",
        question: "What are the structural building blocks or monomers that link together to synthesize complex proteins?",
        options: ["Monosaccharides", "Amino Acids", "Nucleotides", "Fatty Acids"],
        answer: 1
    },
    {
        type: "true-false",
        question: "Anaerobic respiration requires the presence of oxygen gas to produce energy.",
        options: ["True", "False"],
        answer: 1 // Index 1 is False
    },
    {
        type: "fill-blank",
        question: "During mitosis, the stage where chromosomes line up perfectly in the middle of the cell is called _________.",
        answer: "metaphase"
    }
];

/* ==========================================================================
   2. DOM ELEMENT SELECTORS
   ========================================================================== */
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');

const cameraInput = document.getElementById('camera-input');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileNameSpan = document.getElementById('file-name');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressText = document.getElementById('progress-text');
const scoreText = document.getElementById('score-text');
const progressBar = document.getElementById('progress-bar');
const nextButton = document.getElementById('next-btn');

const finalScoreElement = document.getElementById('final-score');
const resultsFeedback = document.getElementById('results-feedback');
const restartButton = document.getElementById('restart-btn');

/* ==========================================================================
   3. EVENT LISTENERS
   ========================================================================== */
cameraInput.addEventListener('change', (e) => handleFileSelection(e.target.files[0]));
fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files[0]));
nextButton.addEventListener('click', navigateToNextQuestion);
restartButton.addEventListener('click', resetAppToStart);

/* ==========================================================================
   4. FILE HANDLING & SYSTEM GENERATION
   ========================================================================== */
function handleFileSelection(file) {
    if (!file) return;

    fileNameSpan.textContent = file.name;
    filePreview.classList.remove('hidden');

    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    // Simulate sorting a mixed test for students
    setTimeout(() => {
        generateQuizQuestions();
    }, 2000);
}

function generateQuizQuestions() {
    // Shuffle the question types randomly so students don't get the same test order
    quizQuestions = [...classroomQuestionBank].sort(() => Math.random() - 0.5);
    
    loadingSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    
    currentQuestionIndex = 0;
    userScore = 0;
    renderCurrentQuestion();
}

/* ==========================================================================
   5. DYNAMIC QUIZ RENDER ENGINE (Handles Multiple Choice, T/F, & Text Fill)
   ========================================================================== */
function renderCurrentQuestion() {
    const activeQuestion = quizQuestions[currentQuestionIndex];
    nextButton.classList.add('hidden');

    // Update Text Trackers
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    scoreText.textContent = `Score: ${userScore}`;
    
    const progressPercent = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    questionText.textContent = activeQuestion.question;
    optionsContainer.innerHTML = ''; // Wipe old containers clear

    // CONDITIONAL LAYOUT GENERATION BASED ON QUESTION TYPE
    if (activeQuestion.type === "multiple-choice" || activeQuestion.type === "true-false") {
        // Draw standard buttons for multiple choice or True/False options
        activeQuestion.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'option-btn';
            optionBtn.textContent = option;
            optionBtn.addEventListener('click', () => evaluateButtonAnswer(index, optionBtn));
            optionsContainer.appendChild(optionBtn);
        });
    } 
    else if (activeQuestion.type === "fill-blank") {
        // Create a text box and submit layout dynamically for Fill-in-the-blanks
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = 'Type your answer here...';
        inputField.id = 'blank-input';
        inputField.style.width = '100%';
        inputField.style.padding = '14px';
        inputField.style.fontSize = '1rem';
        inputField.style.borderRadius = '12px';
        inputField.style.border = '2px solid #e0e0e0';
        inputField.style.marginBottom = '12px';
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Submit Answer';
        submitBtn.addEventListener('click', () => evaluateTextAnswer(inputField, submitBtn));
        
        optionsContainer.appendChild(inputField);
        optionsContainer.appendChild(submitBtn);
    }
}

/* ==========================================================================
   6. ANSWER EVALUATION LOGIC
   ========================================================================== */
function evaluateButtonAnswer(selectedIndex, clickedBtn) {
    const correctAnswerIndex = quizQuestions[currentQuestionIndex].answer;
    const allOptionButtons = optionsContainer.querySelectorAll('.option-btn');

    if (selectedIndex === correctAnswerIndex) {
        clickedBtn.classList.add('correct');
        userScore++;
        scoreText.textContent = `Score: ${userScore}`;
    } else {
        clickedBtn.classList.add('incorrect');
        allOptionButtons[correctAnswerIndex].classList.add('correct');
    }

    allOptionButtons.forEach(btn => btn.disabled = true);
    nextButton.classList.remove('hidden');
}

function evaluateTextAnswer(inputField, submitBtn) {
    const studentAnswer = inputField.value.trim().toLowerCase();
    const correctAnswer = quizQuestions[currentQuestionIndex].answer.toLowerCase();

    inputField.disabled = true;
    submitBtn.disabled = true;

    // Direct text equality comparison
    if (studentAnswer === correctAnswer) {
        inputField.style.borderColor = '#4caf50';
        inputField.style.backgroundColor = '#e8f5e9';
        userScore++;
        scoreText.textContent = `Score: ${userScore}`;
    } else {
        inputField.style.borderColor = '#f44336';
        inputField.style.backgroundColor = '#ffebee';
        
        // Show correct answer indicator below input
        const correctLabel = document.createElement('p');
        correctLabel.style.color = '#4caf50';
        correctLabel.style.fontWeight = '700';
        correctLabel.style.marginTop = '8px';
        correctLabel.textContent = `Correct Answer: ${quizQuestions[currentQuestionIndex].answer}`;
        optionsContainer.appendChild(correctLabel);
    }

    nextButton.classList.remove('hidden');
}

function navigateToNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        renderCurrentQuestion();
    } else {
        displayFinalResults();
    }
}

/* ==========================================================================
   7. RESULTS SCOREBOARD & RESET
   ========================================================================== */
function displayFinalResults() {
    quizSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    finalScoreElement.textContent = `${userScore} / ${quizQuestions.length}`;

    const scorePercentage = (userScore / quizQuestions.length) * 100;
    if (scorePercentage === 100) {
        resultsFeedback.textContent = "Excellent! Perfect understanding of classroom concepts!";
    } else if (scorePercentage >= 70) {
        resultsFeedback.textContent = "Nice work! You passed your biological concepts check.";
    } else {
        resultsFeedback.textContent = "Keep practicing! Review your notes and try the questions again.";
    }
}

function resetAppToStart() {
    resultsSection.classList.add('hidden');
    filePreview.classList.add('hidden');
    cameraInput.value = '';
    fileInput.value = '';
Use code with caution.
uploadSection.classList.remove('hidden');
}
/* ==========================================================================
8. REGISTER PWA SERVICE WORKER
========================================================================== */
if ('serviceWorker' in navigator) {
window.addEventListener('load', () => {
navigator.serviceWorker.register('sw.js')
.then(reg => console.log('Service Worker registered!'))
.catch(err => console.log('Worker crashed:', err));
});
}
