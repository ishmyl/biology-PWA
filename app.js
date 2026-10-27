/**
 * Wayground BioArena - Core Application Script (app.js)
 * Handles quiz state, dynamic data fetching, and camera-based routing.
 */

// Global Application State
const state = {
    currentChapter: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answersLog: [], // Tracks student performance
    isScannerActive: false,
    stream: null
};

// UI Elements Configuration
const elements = {
    chapterSelector: document.getElementById('chapter-selector'),
    quizContainer: document.getElementById('quiz-container'),
    questionArea: document.getElementById('question-area'),
    optionsArea: document.getElementById('options-area'),
    feedbackArea: document.getElementById('feedback-area'),
    nextBtn: document.getElementById('next-btn'),
    scoreDisplay: document.getElementById('score-display'),
    cameraBtn: document.getElementById('camera-btn'),
    scannerVideo: document.getElementById('scanner-video'),
    scannerContainer: document.getElementById('scanner-container')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkUrlParams();
});

// Setup Core Event Listeners
function setupEventListeners() {
    if (elements.chapterSelector) {
        elements.chapterSelector.addEventListener('change', (e) => {
            if (e.target.value) loadChapter(e.target.value);
        });
    }

    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', handleNextQuestion);
    }

    if (elements.cameraBtn) {
        elements.cameraBtn.addEventListener('click', toggleCameraScanner);
    }
}

// Check for deep links or QR code route payloads (e.g., ?chapter=25)
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const chapterParam = urlParams.get('chapter');
    if (chapterParam) {
        loadChapter(chapterParam);
        if (elements.chapterSelector) elements.chapterSelector.value = chapterParam;
    }
}

/**
 * Core Data Fetcher
 * Dynamically loads the corresponding chapter's JSON file.
 */
async function loadChapter(chapterNumber) {
    try {
        showLoadingState();
        state.currentChapter = chapterNumber;
        
        // Formulate target folder path exactly as deployed on your GitHub repository
        const targetPath = `chapter ${chapterNumber}/questions.json`;
        const response = await fetch(targetPath);
        
        if (!response.ok) {
            throw new Error(`Could not find question matrix at ${targetPath}`);
        }
        
        state.questions = await response.json();
        resetQuizState();
        renderQuestion();
    } catch (error) {
        console.error("Error updating module context:", error);
        alert(`Failed to load Chapter ${chapterNumber}. Please ensure questions.json exists in that folder layout.`);
    }
}

function resetQuizState() {
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.answersLog = [];
    if (elements.scoreDisplay) elements.scoreDisplay.textContent = "";
    if (elements.nextBtn) elements.nextBtn.style.display = "none";
}

function showLoadingState() {
    if (elements.quizContainer) {
        elements.quizContainer.innerHTML = `<div class="loading-spinner">Loading English biology modules...</div>`;
    }
}

/**
 * Question Renderer Matrix
 * Distributes rendering tasks based on the custom JSON schema fields.
 */
function renderQuestion() {
    if (!elements.quizContainer) return;
    
    // Clear old visual context
    elements.feedbackArea.innerHTML = "";
    elements.nextBtn.style.display = "none";

    // End of quiz check
    if (state.currentQuestionIndex >= state.questions.length) {
        renderQuizCompletion();
        return;
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    
    // Inject clean text header and metadata markers
    elements.questionArea.innerHTML = `
        <div class="question-header">
            <span class="badge">Question ${state.currentQuestionIndex + 1} of ${state.questions.length}</span>
        </div>
        <p class="question-text">${currentQuestion.question}</p>
    `;

    elements.optionsArea.innerHTML = "";

    // Structural Router for custom object schemas
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
        renderSelectionOptions(currentQuestion.options);
    } else if (currentQuestion.type === 'structured') {
        renderStructuredInput(currentQuestion.rubric);
    }
}

// Renders Multiple Choice and True/False option configurations
function renderSelectionOptions(options) {
    options.forEach((optionText, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.innerHTML = optionText;
        button.addEventListener('click', () => handleSelectionAnswer(index));
        elements.optionsArea.appendChild(button);
    });
}

// Renders Written Long Answer / Structured questions with dynamic rubric verification toggle
function renderStructuredInput(rubricText) {
    const container = document.createElement('div');
    container.className = 'structured-container';
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = "Type your comprehensive answer here...";
    textarea.className = 'structured-input';
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = "Reveal Grading Rubric";
    submitBtn.className = 'submit-structured-btn';
    
    submitBtn.addEventListener('click', () => {
        if (!textarea.value.trim()) {
            alert("Please type a response before checking the system rubric markers.");
            return;
        }
        textarea.disabled = true;
        submitBtn.disabled = true;
        
        // Display official evaluation rubric guidelines
        elements.feedbackArea.innerHTML = `
            <div class="rubric-box">
                <h4>Official Grading Criteria (Rubric Verification Required):</h4>
                <p>${rubricText}</p>
                <div class="self-assess-actions">
                    <p>Did your answer hit the required benchmarks?</p>
                    <button class="score-choice-btn correct" onclick="logStructuredResult(true)">Yes, Full Points</button>
                    <button class="score-choice-btn incorrect" onclick="logStructuredResult(false)">No, Needs Revision</button>
                </div>
            </div>
        `;
    });

    container.appendChild(textarea);
    container.appendChild(submitBtn);
    elements.optionsArea.appendChild(container);
}

/**
 * Evaluation and Grading Logic
 */
function handleSelectionAnswer(selectedIndex) {
    const currentQuestion = state.questions[state.currentQuestionIndex];
    const optionButtons = elements.optionsArea.querySelectorAll('.option-btn');
    
    // Freeze layout selections
    optionButtons.forEach(btn => btn.disabled = true);
    
    const isCorrect = (selectedIndex === currentQuestion.answer);
    if (isCorrect) {
        state.score++;
        optionButtons[selectedIndex].classList.add('correct');
        elements.feedbackArea.innerHTML = `<div class="feedback-msg alert-success">✅ Correct answer! Excellent work.</div>`;
    } else {
        optionButtons[selectedIndex].classList.add('incorrect');
        optionButtons[currentQuestion.answer].classList.add('correct');
        elements.feedbackArea.innerHTML = `<div class="feedback-msg alert-danger">❌ Incorrect. The correct configuration is marked above.</div>`;
    }
    
    state.answersLog.push({ question: currentQuestion.question, correct: isCorrect });
    elements.nextBtn.style.display = "block";
}

window.logStructuredResult = function(isCorrect) {
    if (isCorrect) state.score++;
    state.answersLog.push({ question: state.questions[state.currentQuestionIndex].question, correct: isCorrect });
    elements.nextBtn.style.display = "block";
};

function handleNextQuestion() {
    state.currentQuestionIndex++;
    renderQuestion();
}

function renderQuizCompletion() {
    elements.questionArea.innerHTML = `<h3>Module Completed!</h3>`;
    elements.optionsArea.innerHTML = `
        <div class="summary-box">
            <p>You scored <strong>${state.score}</strong> out of <strong>${state.questions.length}</strong> available questions matrix points.</p>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${(state.score / state.questions.length) * 100}%"></div>
            </div>
        </div>
    `;
    elements.nextBtn.style.display = "none";
}

/**
 * 📷 Dynamic Camera Routing Engine
 * Automatically interprets text payloads from QR or barcode configurations 
 * and targets matching dynamic local folder indices.
 */
async function toggleCameraScanner() {
    if (state.isScannerActive) {
        stopCameraScanner();
        return;
    }

    try {
        state.isScannerActive = true;
        elements.scannerContainer.style.display = "block";
        elements.cameraBtn.textContent = "Close Scanner Camera";

        // Access laptop or smartphone hardware camera stream
        state.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        
        elements.scannerVideo.srcObject = state.stream;
        elements.scannerVideo.setAttribute("playsinline", true);
        elements.scannerVideo.play();

        // Initialize Native Barcode / QR Detection loop if supported by browser environment
        if ('BarcodeDetector' in window) {
            const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
            startNativeDetectionLoop(detector);
        } else {
            // Polyfill / Simulated scanner fallback mode for local staging environments
            setupFallbackScannerSimulation();
        }

    } catch (err) {
