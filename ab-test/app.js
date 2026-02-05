// A/B 音频评估系统 - 主逻辑

// 全局状态
const state = {
    audioFiles: [],          // 所有可用的音频文件
    pairs: [],               // 生成的配对
    questions: [],           // 所有问题
    answers: {},             // 用户答案
    currentBatch: [],        // 当前批次的题目索引
    completedCount: 0        // 已完成题目数
};

// 12 个问题模板
const questionTemplates = [
    {
        id: 1,
        dimension: "可懂度",
        text: "哪一个的发音更清楚，更容易听懂？"
    },
    {
        id: 2,
        dimension: "可懂度",
        text: "如果你只听一遍，哪一个更不容易听错？"
    },
    {
        id: 3,
        dimension: "自然度",
        text: "闭上眼睛听，你觉得哪一个声音更像真人？"
    },
    {
        id: 4,
        dimension: "自然度",
        text: "哪一个声音听起来更不\"机器\"？"
    },
    {
        id: 5,
        dimension: "好听度",
        text: "你觉得哪个声音更好听？"
    },
    {
        id: 6,
        dimension: "好听度",
        text: "如果要连续听 10 分钟，你会选哪一个？"
    },
    {
        id: 7,
        dimension: "辨识度",
        text: "哪一个声音更有记忆点？"
    },
    {
        id: 8,
        dimension: "辨识度",
        text: "你觉得哪个声音辨识度更高？"
    },
    {
        id: 9,
        dimension: "表现力",
        text: "哪一个更符合【当前场景】的感觉？"
    },
    {
        id: 10,
        dimension: "表现力",
        text: "哪一个声音的表现力更强？"
    },
    {
        id: 11,
        dimension: "专业感",
        text: "哪一个更像是专业配音？"
    },
    {
        id: 12,
        dimension: "专业感",
        text: "哪一个更适合商用？"
    }
];

// 初始化应用
async function init() {
    console.log('初始化应用...');

    try {
        await loadAudioFiles();
        console.log('音频文件加载完成:', state.audioFiles.length, '条');

        setupEventListeners();
        console.log('事件监听器设置完成');

        // 检查是否有保存的进度
        const saved = localStorage.getItem('abtest-progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (confirm('检测到上次的测试进度，是否继续？')) {
                    state.pairs = data.pairs || [];
                    state.questions = data.questions || [];
                    state.answers = data.answers || {};
                    showQuizStage();
                } else {
                    localStorage.removeItem('abtest-progress');
                    startNewQuiz();
                }
            } catch (error) {
                console.error('加载进度失败:', error);
                localStorage.removeItem('abtest-progress');
                startNewQuiz();
            }
        } else {
            startNewQuiz();
        }
    } catch (error) {
        console.error('初始化失败:', error);
        document.getElementById('pair-info').textContent = '加载失败: ' + error.message;
    }
}

// 加载 data 目录中的音频文件
async function loadAudioFiles() {
    state.audioFiles = [
        { id: 'douyin_1', name: 'Douyin TTS', path: 'data/douyin_她在书店买了几本小说和一本文学杂志。_2026_02_04T14_17_30.mp3' },
        { id: 'luna_1', name: 'Luna TTS (1)', path: 'data/luna_她在书店买了几本小说和一本文学杂志。_2026_02_04T13_39_19.wav' },
        { id: 'luna_2', name: 'Luna TTS (2)', path: 'data/luna_她在书店买了几本小说和一本文学杂志。_2026_02_04T14_17_23.wav' },
        { id: 'minimax_1', name: 'MiniMax TTS', path: 'data/minimax_她在书店买了几本小说和一本文学杂志。_2026_02_04T14_17_31.mp3' },
        { id: 'qwen_1', name: 'Qwen TTS', path: 'data/qwen_她在书店买了几本小说和一本文学杂志。_2026_02_04T14_17_32.wav' }
    ];
}

// 开始新的测试
function startNewQuiz() {
    console.log('开始新的测试...');

    // 自动使用所有音频
    generatePairs();
    console.log('生成配对完成:', state.pairs.length, '对');

    generateQuestions();
    console.log('生成问题完成:', state.questions.length, '道');

    state.currentBatch = getNextBatch();
    console.log('获取第一批题目:', state.currentBatch.length, '道');

    // 显示配对信息
    const audioCount = state.audioFiles.length;
    const pairsCount = state.pairs.length;
    const questionsCount = state.questions.length;
    const batchesCount = Math.ceil(questionsCount / 5);

    const infoText = `已加载 ${audioCount} 条音频，生成 ${pairsCount} 对配对，共 ${questionsCount} 道题目（${batchesCount} 批）`;
    console.log(infoText);

    const pairInfoEl = document.getElementById('pair-info');
    if (pairInfoEl) {
        pairInfoEl.textContent = infoText;
    }

    // 延迟一下再进入答题界面，让用户看到配对信息
    setTimeout(() => {
        showQuizStage();
    }, 500);
}

// 显示答题阶段
function showQuizStage() {
    document.getElementById('selection-stage').style.display = 'none';
    document.getElementById('quiz-stage').style.display = 'block';
    renderQuestions();
}
// 生成配对
function generatePairs() {
    state.pairs = [];
    const allAudioIds = state.audioFiles.map(a => a.id);

    for (let i = 0; i < allAudioIds.length; i++) {
        for (let j = i + 1; j < allAudioIds.length; j++) {
            state.pairs.push({
                audioA: allAudioIds[i],
                audioB: allAudioIds[j]
            });
        }
    }
}

// 生成所有问题
function generateQuestions() {
    state.questions = [];
    let questionIndex = 0;

    state.pairs.forEach((pair, pairIndex) => {
        questionTemplates.forEach(template => {
            state.questions.push({
                index: questionIndex++,
                pairIndex: pairIndex,
                audioA: pair.audioA,
                audioB: pair.audioB,
                questionId: template.id,
                dimension: template.dimension,
                question: template.text
            });
        });
    });
}

// 洗牌算法
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 获取下一批题目
function getNextBatch() {
    const unanswered = state.questions.filter(q => !state.answers[q.index]);
    const batchSize = Math.min(5, unanswered.length);
    const shuffled = shuffle(unanswered);
    return shuffled.slice(0, batchSize).map(q => q.index);
}

// 渲染题目
function renderQuestions() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    state.currentBatch.forEach((questionIndex, i) => {
        const q = state.questions[questionIndex];
        const audioA = state.audioFiles.find(a => a.id === q.audioA);
        const audioB = state.audioFiles.find(a => a.id === q.audioB);

        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        quizItem.dataset.questionIndex = questionIndex;

        quizItem.innerHTML = `
            <span class="quiz-item-number">第 ${state.completedCount + i + 1} 题</span>
            <div class="quiz-question">${q.question}</div>
            <div class="quiz-audios">
                <div class="quiz-audio">
                    <span class="quiz-audio-label">音频 A</span>
                    <audio controls src="${audioA.path}"></audio>
                </div>
                <div class="quiz-audio">
                    <span class="quiz-audio-label">音频 B</span>
                    <audio controls src="${audioB.path}"></audio>
                </div>
            </div>
            <div class="quiz-options">
                <button class="quiz-option" data-value="A">A</button>
                <button class="quiz-option" data-value="B">B</button>
                <button class="quiz-option" data-value="TIE">差不多</button>
            </div>
        `;

        // 恢复已保存的答案
        if (state.answers[questionIndex]) {
            const selectedOption = quizItem.querySelector(
                `.quiz-option[data-value="${state.answers[questionIndex].answer}"]`
            );
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }
        }

        container.appendChild(quizItem);

        // 添加选项点击事件
        quizItem.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', () => {
                quizItem.querySelectorAll('.quiz-option').forEach(o =>
                    o.classList.remove('selected')
                );
                option.classList.add('selected');
                updateSubmitButton();
            });
        });

        // 添加音频播放互斥事件
        quizItem.querySelectorAll('audio').forEach(audio => {
            audio.addEventListener('play', () => {
                // 暂停页面上所有其他音频
                document.querySelectorAll('audio').forEach(otherAudio => {
                    if (otherAudio !== audio) {
                        otherAudio.pause();
                    }
                });
            });
        });
    });

    updateSubmitButton();
    updateProgress();
}

// 更新提交按钮状态
function updateSubmitButton() {
    const container = document.getElementById('quiz-container');
    const answered = container.querySelectorAll('.quiz-option.selected').length;
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.textContent = `提交本批（${answered}/5）`;
    submitBtn.disabled = answered !== 5;
}

// 更新进度显示
function updateProgress() {
    const total = state.questions.length;
    const completed = Object.keys(state.answers).length;
    state.completedCount = completed;

    const percentage = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent =
        `进度: ${completed}/${total} (${Math.round(percentage)}%)`;
}

// 提交本批答案
function submitBatch() {
    const container = document.getElementById('quiz-container');
    const quizItems = container.querySelectorAll('.quiz-item');

    quizItems.forEach(item => {
        const questionIndex = parseInt(item.dataset.questionIndex);
        const selectedOption = item.querySelector('.quiz-option.selected');

        if (selectedOption) {
            const q = state.questions[questionIndex];
            state.answers[questionIndex] = {
                audioA: q.audioA,
                audioB: q.audioB,
                dimension: q.dimension,
                questionId: q.questionId,
                answer: selectedOption.dataset.value,
                timestamp: new Date().toISOString()
            };
        }
    });

    saveProgress();

    // 自动保存本批结果到文件
    autoSaveResults();

    // 检查是否还有未完成的题目
    const unansweredCount = state.questions.length - Object.keys(state.answers).length;

    if (unansweredCount === 0) {
        showResultStage();
    } else {
        state.currentBatch = getNextBatch();
        renderQuestions();

        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 保存进度到 localStorage
function saveProgress() {
    const progressData = {
        pairs: state.pairs,
        questions: state.questions,
        answers: state.answers,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('abtest-progress', JSON.stringify(progressData));
}


// 显示结果页面
function showResultStage() {
    document.getElementById('quiz-stage').style.display = 'none';
    document.getElementById('result-stage').style.display = 'block';

    const total = state.questions.length;
    const completed = Object.keys(state.answers).length;
    const percentage = Math.round((completed / total) * 100);

    document.getElementById('total-questions').textContent = total;
    document.getElementById('completed-questions').textContent = completed;
    document.getElementById('completion-rate').textContent = `${percentage}%`;

    localStorage.removeItem('abtest-progress');
}

// 自动保存结果（每批提交后自动下载）
function autoSaveResults() {
    // 计算每个音频在每个维度上的得分
    const scores = {};
    const dimensions = ['可懂度', '自然度', '好听度', '辨识度', '表现力', '专业感'];

    // 初始化得分结构
    state.audioFiles.forEach(audio => {
        scores[audio.id] = {};
        dimensions.forEach(dim => {
            scores[audio.id][dim] = 0;
        });
    });

    // 计算得分
    Object.values(state.answers).forEach(answer => {
        const { audioA, audioB, dimension, answer: choice } = answer;

        if (choice === 'A') {
            scores[audioA][dimension]++;
        } else if (choice === 'B') {
            scores[audioB][dimension]++;
        }
    });

    // 格式化得分结果
    const formattedScores = {};
    Object.entries(scores).forEach(([audioId, dimScores]) => {
        const audio = state.audioFiles.find(a => a.id === audioId);
        formattedScores[audio.name] = dimScores;
    });

    const results = {
        exportTime: new Date().toISOString(),
        audioCount: state.audioFiles.length,
        totalQuestions: state.questions.length,
        completedQuestions: Object.keys(state.answers).length,
        batchNumber: Math.floor(Object.keys(state.answers).length / 5),
        scores: formattedScores,
        answers: {}
    };

    // 格式化详细答案
    Object.entries(state.answers).forEach(([questionIndex, answer]) => {
        results.answers[questionIndex] = {
            question: state.questions[questionIndex].question,
            dimension: answer.dimension,
            answer: answer.answer,
            timestamp: answer.timestamp
        };
    });

    // 自动下载文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abtest-batch-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✓ 已自动保存第 ${Math.floor(Object.keys(state.answers).length / 5)} 批结果`);
}

// 导出结果
function exportResults() {
    // 计算每个音频在每个维度上的得分
    const scores = {};
    const dimensions = ['可懂度', '自然度', '好听度', '辨识度', '表现力', '专业感'];

    // 初始化得分结构
    state.audioFiles.forEach(audio => {
        scores[audio.id] = {};
        dimensions.forEach(dim => {
            scores[audio.id][dim] = 0;
        });
    });

    // 计算得分
    Object.values(state.answers).forEach(answer => {
        const { audioA, audioB, dimension, answer: choice } = answer;

        if (choice === 'A') {
            scores[audioA][dimension]++;
        } else if (choice === 'B') {
            scores[audioB][dimension]++;
        }
        // 如果选择 'TIE'，双方都不得分
    });

    // 格式化得分结果
    const formattedScores = {};
    Object.entries(scores).forEach(([audioId, dimScores]) => {
        const audio = state.audioFiles.find(a => a.id === audioId);
        formattedScores[audio.name] = dimScores;
    });

    const results = {
        exportTime: new Date().toISOString(),
        audioCount: state.audioFiles.length,
        totalQuestions: state.questions.length,
        completedQuestions: Object.keys(state.answers).length,
        scores: formattedScores,
        answers: {}
    };

    // 格式化详细答案（盲测，不显示音频名称）
    Object.entries(state.answers).forEach(([questionIndex, answer]) => {
        results.answers[questionIndex] = {
            question: state.questions[questionIndex].question,
            dimension: answer.dimension,
            answer: answer.answer,
            timestamp: answer.timestamp
        };
    });

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abtest-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 重新开始
function restart() {
    state.pairs = [];
    state.questions = [];
    state.answers = {};
    state.currentBatch = [];
    state.completedCount = 0;

    localStorage.removeItem('abtest-progress');
    startNewQuiz();
}

// 设置事件监听器
function setupEventListeners() {
    document.getElementById('submit-btn').addEventListener('click', submitBatch);
    document.getElementById('exit-btn').addEventListener('click', () => {
        if (confirm('确定要退出测试吗？进度将自动保存。')) {
            saveProgress();
            location.reload();
        }
    });
    document.getElementById('export-btn').addEventListener('click', exportResults);
    document.getElementById('download-btn').addEventListener('click', exportResults);
    document.getElementById('restart-btn').addEventListener('click', restart);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
