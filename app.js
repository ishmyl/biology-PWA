let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let answerStreak = 0;
let currentPlayerName = "Player";

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

startAppBtn.addEventListener('click', handleStudentSignIn);
cameraInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files[0]));
fileInput.addEventListener('change', (e) => triggerArenaLoad(e.target.files[0]));
nextButton.addEventListener('click', advanceArenaChallenge);
restartButton.addEventListener('click', resetArenaSession);

function handleStudentSignIn() {
    const rawName = studentNameInput.value.trim();
    if (!rawName) {
        alert("Please enter a player tag/name to join the quiz session!");
        return;
    }
    currentPlayerName = rawName;
    displayStudentName.textContent = currentPlayerName;
    
    registrationSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
}

function triggerArenaLoad(file) {
    if (!file) return;
    fileNameSpan.textContent = file.name;
    filePreview.classList.remove('hidden');

    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

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
    } else {
        selectedBtn.classList.add('incorrect');
        items[correctIdx].classList.add('correct');
        answerStreak = 0;
    }
    items.forEach(b => b.disabled = true);
    nextButton.classList.remove('hidden');
}

function scoreTextChallenge(input, subBtn) {
    const guess = input.value.trim().toLowerCase();
    const target = quizQuestions[currentQuestionIndex].answer.toLowerCase();
    input.disabled = true;
    subBtn.disabled = true;

    if (guess === target) {
        input.style.borderColor = '#10b981';
        answerStreak++;
        userScore += 100 + (answerStreak * 20);
    } else {
        input.style.borderColor = '#ef4444';
        answerStreak = 0;
        const keyLabel = document.createElement('p');
        keyLabel.className = 'neon-text';
        keyLabel.style.marginTop = '10px';
        keyLabel.textContent = `Target Keyword: ${quizQuestions[currentQuestionIndex].answer}`;
        optionsContainer.appendChild(keyLabel);
    }
    nextButton.classList.remove('hidden');
}

function revealStructuredRubric(area, subBtn, rubricText) {
    area.disabled = true;
    subBtn.disabled = true;
    answerStreak++;
    userScore += 150;

    const wrap = document.createElement('div');
    wrap.className = 'structured-feedback';
    wrap.innerHTML = `<h4>💡 Grading Rubric Guide:</h4><p style="font-size:0.85rem; color:#9ca3af; margin-top:5px; line-height:1.4;">${rubricText}</p>`;
    optionsContainer.appendChild(wrap);
    
    nextButton.classList.remove('hidden');
}

function advanceArenaChallenge() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        renderActiveChallenge();
    } else {
        progressBar.style.width = "100%";
        quizSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        finalScoreElement.textContent = `${userScore} PTS`;
    }
}

function resetArenaSession() {
    resultsSection.classList.add('hidden');
    filePreview.classList.add('hidden');
    cameraInput.value = '';
    fileInput.value = '';
    studentNameInput.value = '';
    uploadSection.classList.remove('hidden');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
    });
}
