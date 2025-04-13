// DOM Elements
const quizContent = document.getElementById('quiz-content');
const progressBar = document.getElementById('progress-bar');
const timerElement = document.getElementById('timer');
const currentScoreElement = document.getElementById('current-score');
const totalQuestionsElement = document.getElementById('total-questions');

// Game State
let quizState = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    selectedAnswers: [],
    timer: null,
    timeLeft: 30,
    quizConfig: {
        amount: 10,
        category: '',
        difficulty: '',
        type: 'multiple'
    }
};

// Initialize the quiz
function initQuiz() {
    renderStartScreen();
    updateScoreDisplay();
}

// Render Start Screen
function renderStartScreen() {
    quizContent.innerHTML = `
        <div class="start-screen">
            <h2>Test Your Knowledge</h2>
            <p>Challenge yourself with this interactive quiz game featuring questions from various categories.</p>
            
            <div class="quiz-config">
                <div class="config-group">
                    <label for="amount">Number of Questions:</label>
                    <select id="amount">
                        <option value="5">5</option>
                        <option value="10" selected>10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                    </select>
                </div>
                
                <div class="config-group">
                    <label for="difficulty">Difficulty:</label>
                    <select id="difficulty">
                        <option value="">Any Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
            </div>
            
            <button id="start-btn" class="btn">
                <i class="fas fa-play"></i> Start Quiz
            </button>
        </div>
    `;

    document.getElementById('start-btn').addEventListener('click', startQuiz);

    // Store config when changed
    document.getElementById('amount').addEventListener('change', (e) => {
        quizState.quizConfig.amount = parseInt(e.target.value);
    });

    document.getElementById('difficulty').addEventListener('change', (e) => {
        quizState.quizConfig.difficulty = e.target.value;
    });
}

// Start the quiz
async function startQuiz() {
    try {
        renderLoading();

        // Build API URL based on config
        const { amount, category, difficulty, type } = quizState.quizConfig;
        let apiUrl = `https://opentdb.com/api.php?amount=${amount}&type=${type}`;

        if (difficulty) apiUrl += `&difficulty=${difficulty}`;
        if (category) apiUrl += `&category=${category}`;

        // Fetch questions
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.response_code !== 0) {
            throw new Error('Failed to load questions. Please try again later.');
        }

        // Process questions
        quizState.questions = data.results.map(question => ({
            ...question,
            options: shuffleArray([
                ...question.incorrect_answers,
                question.correct_answer
            ])
        }));

        // Reset game state
        quizState.currentQuestionIndex = 0;
        quizState.score = 0;
        quizState.selectedAnswers = [];
        quizState.timeLeft = 30;

        updateScoreDisplay();
        renderQuestion();
    } catch (error) {
        renderError(error.message);
    }
}

// Render loading state
function renderLoading() {
    quizContent.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading questions...</p>
        </div>
    `;
}

// Render error state
function renderError(message) {
    quizContent.innerHTML = `
        <div class="start-screen">
            <h2>Error</h2>
            <p>${message}</p>
            <button id="retry-btn" class="btn">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;

    document.getElementById('retry-btn').addEventListener('click', startQuiz);
}

// Render current question
function renderQuestion() {
    if (quizState.currentQuestionIndex >= quizState.questions.length) {
        renderResults();
        return;
    }

    const question = quizState.questions[quizState.currentQuestionIndex];
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;

    // Clear existing timer
    if (quizState.timer) {
        clearInterval(quizState.timer);
        quizState.timer = null;
    }

    // Reset timer for this question
    quizState.timeLeft = 30;
    timerElement.textContent = quizState.timeLeft;

    // Update progress bar
    progressBar.style.width = `${progress}%`;

    quizContent.innerHTML = `
        <div class="question-container">
            <h2>Question ${quizState.currentQuestionIndex + 1}</h2>
            <div class="question-text">${decodeHtml(question.question)}</div>
            
            <div class="options-container" id="options-container">
                ${question.options.map((option, index) => `
                    <div class="option" data-index="${index}">
                        <div class="option-label">${String.fromCharCode(65 + index)}</div>
                        ${decodeHtml(option)}
                    </div>
                `).join('')}
            </div>
            
            <button id="next-btn" class="btn" disabled>
                <i class="fas fa-arrow-right"></i> Next Question
            </button>
        </div>
    `;

    // Start timer
    startTimer();

    // Add event listeners
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', selectAnswer);
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
}

// Start timer for current question
function startTimer() {
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        timerElement.textContent = quizState.timeLeft;

        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            handleTimeout();
        }
    }, 1000);
}

// Handle timeout
function handleTimeout() {
    const question = quizState.questions[quizState.currentQuestionIndex];

    quizState.selectedAnswers[quizState.currentQuestionIndex] = {
        selected: null,
        isCorrect: false,
        timedOut: true
    };

    // Highlight correct answer
    highlightCorrectAnswer();
    enableNextButton();
}

// Select an answer
function selectAnswer(e) {
    // Stop the timer
    clearInterval(quizState.timer);
    quizState.timer = null;

    const selectedOption = e.currentTarget;
    const selectedIndex = parseInt(selectedOption.dataset.index);
    const question = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = question.options[selectedIndex] === question.correct_answer;

    // Store the selected answer
    quizState.selectedAnswers[quizState.currentQuestionIndex] = {
        selected: question.options[selectedIndex],
        isCorrect,
        timedOut: false
    };

    // Update score if correct
    if (isCorrect) {
        quizState.score++;
        updateScoreDisplay();
    }

    // Highlight selected answer
    selectedOption.classList.add(isCorrect ? 'correct' : 'incorrect');

    // Highlight correct answer if wrong was selected
    if (!isCorrect) {
        highlightCorrectAnswer();
    }

    // Disable all options
    document.querySelectorAll('.option').forEach(option => {
        option.style.pointerEvents = 'none';
    });

    // Enable next button
    enableNextButton();
}

// Highlight correct answer
function highlightCorrectAnswer() {
    const question = quizState.questions[quizState.currentQuestionIndex];

    document.querySelectorAll('.option').forEach(option => {
        const optionIndex = parseInt(option.dataset.index);
        if (question.options[optionIndex] === question.correct_answer) {
            option.classList.add('correct');
        }
    });
}

// Enable next button
function enableNextButton() {
    const nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = false;
}

// Move to next question
function nextQuestion() {
    quizState.currentQuestionIndex++;
    renderQuestion();
}

// Update score display
function updateScoreDisplay() {
    currentScoreElement.textContent = quizState.score;
    totalQuestionsElement.textContent = quizState.questions.length || '0';
}

// Render results screen
function renderResults() {
    quizContent.innerHTML = `
        <div class="results-screen">
            <h2>Quiz Completed!</h2>
            <div class="final-score">
                Your Score: ${quizState.score}/${quizState.questions.length}
                (${Math.round((quizState.score / quizState.questions.length) * 100)}%)
            </div>
            
            <div class="results-details">
                <h3>Question Breakdown:</h3>
                
                ${quizState.questions.map((question, index) => {
        const userAnswer = quizState.selectedAnswers[index];
        const isCorrect = userAnswer?.isCorrect;
        const correctAnswer = question.correct_answer;
        const userSelected = userAnswer?.selected;

        return `
                        <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                            <div class="result-question">
                                <strong>Q${index + 1}:</strong> ${decodeHtml(question.question)}
                            </div>
                            
                            ${!isCorrect ? `
                                <div class="result-answer">
                                    <strong>Your answer:</strong> 
                                    ${userSelected ? decodeHtml(userSelected) : 'Time expired'}
                                </div>
                            ` : ''}
                            
                            <div class="result-answer">
                                <strong>Correct answer:</strong> ${decodeHtml(correctAnswer)}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
            
            <div class="actions">
                <button id="restart-btn" class="btn">
                    <i class="fas fa-redo"></i> Play Again
                </button>
                <button id="new-quiz-btn" class="btn btn-outline">
                    <i class="fas fa-home"></i> New Quiz
                </button>
            </div>
        </div>
    `;

    // Set up event listeners
    document.getElementById('restart-btn').addEventListener('click', restartQuiz);
    document.getElementById('new-quiz-btn').addEventListener('click', newQuiz);
}

// Restart the same quiz
function restartQuiz() {
    quizState.currentQuestionIndex = 0;
    quizState.score = 0;
    quizState.selectedAnswers = [];
    quizState.timeLeft = 30;

    updateScoreDisplay();
    renderQuestion();
}

// Start a new quiz with new questions
function newQuiz() {
    renderStartScreen();
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Helper function to decode HTML entities
function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

// Initialize the quiz when the page loads
document.addEventListener('DOMContentLoaded', initQuiz);