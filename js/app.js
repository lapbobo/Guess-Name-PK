/**
 * 主应用入口 (App)
 * 串联 Settings, AIService, GameEngine, Sound 模块
 * 管理所有 UI 交互
 */

const App = (() => {
    // DOM 缓存
    let DOM = {};
    let _loading = { player1: false, player2: false };
    let _playerTabs = { 1: 'ask', 2: 'ask' }; // 当前功能 Tab: 'ask' | 'guess'

    /** 初始化应用 */
    function init() {
        Settings.load();
        cacheDom();
        createBackgroundParticles();
        bindEvents();

        // 分别初始化两个 Modal 的内容
        renderPlayerSettings();
        renderGameSettings();

        updateUI();

        // 检查是否需要引导设置
        if (!Settings.hasApiKey()) {
            showInitScreen();
        } else {
            startNewGame();
        }
    }

    /** 缓存 DOM 元素 */
    function cacheDom() {
        DOM = {
            // Top bar
            btnPlayerSettings: document.getElementById('btn-player-settings'),
            btnSettings: document.getElementById('btn-settings'),
            btnRestart: document.getElementById('btn-restart'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            btnMute: document.getElementById('btn-mute'),
            gameTitle: document.getElementById('game-title'),

            // VS section
            vsSection: document.getElementById('vs-section'),
            categoryBadge: document.getElementById('category-badge'),
            p1Avatar: document.getElementById('p1-avatar'),
            p2Avatar: document.getElementById('p2-avatar'),
            p1Name: document.getElementById('p1-name'),
            p2Name: document.getElementById('p2-name'),
            p1Status: document.getElementById('p1-status'),
            p2Status: document.getElementById('p2-status'),

            // Game area
            gameArea: document.getElementById('game-area'),
            initScreen: document.getElementById('init-screen'),

            // Player panels
            p1Panel: document.getElementById('p1-panel'),
            p2Panel: document.getElementById('p2-panel'),
            // ... counter, questions, input, charCount ...
            p1Counter: document.getElementById('p1-counter'),
            p2Counter: document.getElementById('p2-counter'),
            p1Questions: document.getElementById('p1-questions'),
            p2Questions: document.getElementById('p2-questions'),
            p1Input: document.getElementById('p1-input'),
            p2Input: document.getElementById('p2-input'),
            p1CharCount: document.getElementById('p1-char-count'),
            p2CharCount: document.getElementById('p2-char-count'),

            // New Tabs & Buttons
            p1TabAsk: document.getElementById('p1-tab-ask'),
            p1TabGuess: document.getElementById('p1-tab-guess'),
            p2TabAsk: document.getElementById('p2-tab-ask'),
            p2TabGuess: document.getElementById('p2-tab-guess'),

            p1BtnSubmit: document.getElementById('p1-btn-submit'),
            p2BtnSubmit: document.getElementById('p2-btn-submit'),
            p1BtnHint: document.getElementById('p1-btn-hint'),
            p2BtnHint: document.getElementById('p2-btn-hint'),
            p1BtnGiveUp: document.getElementById('p1-btn-give-up'),
            p2BtnGiveUp: document.getElementById('p2-btn-give-up'),

            p1Reveal: document.getElementById('p1-reveal'),
            p2Reveal: document.getElementById('p2-reveal'),

            // Player Settings Modal
            playerModal: document.getElementById('player-modal'),
            playerSettingsClose: document.getElementById('player-settings-close'),
            btnSavePlayerSettings: document.getElementById('btn-save-player-settings'),
            inputP1Name: document.getElementById('input-p1-name'),
            inputP2Name: document.getElementById('input-p2-name'),
            avatarPicker1: document.getElementById('avatar-picker-1'),
            avatarPicker2: document.getElementById('avatar-picker-2'),

            // Game Settings Modal
            settingsModal: document.getElementById('settings-modal'),
            settingsClose: document.getElementById('settings-close'),
            settingsForm: document.getElementById('settings-form'),
            // Removed name/avatar inputs from here
            selectCategory: document.getElementById('select-category'),
            inputMaxQuestions: document.getElementById('input-max-questions'),
            selectAiProvider: document.getElementById('select-ai-provider'),
            inputApiKey: document.getElementById('input-api-key'),
            btnToggleKey: document.getElementById('btn-toggle-key'),
            btnResetDefaults: document.getElementById('btn-reset-defaults'),
            btnSaveSettings: document.getElementById('btn-save-settings'),

            // Result modal
            resultModal: document.getElementById('result-modal'),
            resultIcon: document.getElementById('result-icon'),
            resultTitle: document.getElementById('result-title'),
            resultDetails: document.getElementById('result-details'),
            resultBtnRestart: document.getElementById('result-btn-restart'),
            resultBtnSettings: document.getElementById('result-btn-settings'),

            // Confirm modal
            confirmModal: document.getElementById('confirm-modal'),
            confirmMessage: document.getElementById('confirm-message'),
            confirmYes: document.getElementById('confirm-yes'),
            confirmNo: document.getElementById('confirm-no'),

            // Toast
            toastContainer: document.getElementById('toast-container'),

            // Particles
            bgParticles: document.getElementById('bg-particles'),

            // Celebration
            celebrationContainer: document.getElementById('celebration-container'),
        };
    }

    /** 绑定事件 */
    function bindEvents() {
        // Top bar
        DOM.btnPlayerSettings.addEventListener('click', () => { Sound.click(); openPlayerSettings(); });
        DOM.btnSettings.addEventListener('click', () => { Sound.click(); openGameSettings(); });
        DOM.btnRestart.addEventListener('click', () => { Sound.click(); handleRestart(); });
        DOM.btnFullscreen.addEventListener('click', () => { Sound.click(); toggleFullscreen(); });
        DOM.btnMute.addEventListener('click', () => { toggleMute(); });

        // Player inputs
        [1, 2].forEach(pNum => {
            const input = DOM[`p${pNum}Input`];
            const charCount = DOM[`p${pNum}CharCount`];

            input.addEventListener('input', () => {
                if (input.value.length > 20) {
                    input.value = input.value.slice(0, 20);
                }
                const len = input.value.length;
                charCount.textContent = `${len}/20`;
                charCount.className = 'char-counter' + (len >= 18 ? ' warning' : '');
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(pNum);
                }
            });

            // Tabs
            DOM[`p${pNum}TabAsk`].addEventListener('click', () => switchTab(pNum, 'ask'));
            DOM[`p${pNum}TabGuess`].addEventListener('click', () => switchTab(pNum, 'guess'));

            // Actions
            DOM[`p${pNum}BtnSubmit`].addEventListener('click', () => { Sound.click(); handleSubmit(pNum); });
            DOM[`p${pNum}BtnHint`].addEventListener('click', () => { Sound.click(); handleHint(pNum); });
            DOM[`p${pNum}BtnGiveUp`].addEventListener('click', () => { Sound.click(); handleGiveUp(pNum); });
        });

        // Player Settings modal
        DOM.playerSettingsClose.addEventListener('click', () => { Sound.closePanel(); closePlayerSettings(); });
        DOM.playerModal.addEventListener('click', (e) => {
            if (e.target === DOM.playerModal) { Sound.closePanel(); closePlayerSettings(); }
        });
        DOM.btnSavePlayerSettings.addEventListener('click', () => { Sound.click(); savePlayerSettings(); });

        // Game Settings modal
        DOM.settingsClose.addEventListener('click', () => { Sound.closePanel(); closeGameSettings(); });
        DOM.settingsModal.addEventListener('click', (e) => {
            if (e.target === DOM.settingsModal) { Sound.closePanel(); closeGameSettings(); }
        });
        DOM.btnToggleKey.addEventListener('click', () => {
            const input = DOM.inputApiKey;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            DOM.btnToggleKey.textContent = isPassword ? '🙈' : '👁️';
        });
        DOM.btnResetDefaults.addEventListener('click', () => {
            Sound.click();
            showConfirm('确定要恢复默认设置吗？\nAPI Key 将保留不变。', () => {
                Settings.resetToDefaults();
                renderGameSettings(); // UI refresh
                showToast('已恢复默认设置', 'success');
            });
        });
        DOM.btnSaveSettings.addEventListener('click', () => { Sound.click(); saveGameSettings(); });

        // Result modal
        DOM.resultBtnRestart.addEventListener('click', () => {
            Sound.click();
            closeModal(DOM.resultModal);
            startNewGame();
        });
        DOM.resultBtnSettings.addEventListener('click', () => {
            Sound.click();
            closeModal(DOM.resultModal);
            openGameSettings();
        });

        // Game engine events
        GameEngine.on('playerWon', (data) => {
            Sound.victory();
            const s = Settings.get();
            const name = data.playerNum === 1 ? s.player1Name : s.player2Name;
            showToast(`🎉 ${name} 猜对了！`, 'success');
            triggerCelebration();
        });

        GameEngine.on('playerGaveUp', (data) => {
            Sound.fail();
        });

        GameEngine.on('playerExhausted', (data) => {
            Sound.fail();
            const s = Settings.get();
            const name = data.playerNum === 1 ? s.player1Name : s.player2Name;
            showToast(`${name} 的提问次数已用完`, 'info');
        });

        GameEngine.on('gameOver', (result) => {
            setTimeout(() => showResultModal(result), 800);
        });

        GameEngine.on('stateChange', () => {
            updateUI();
        });

        // Init screen button
        const initBtn = document.getElementById('init-btn-settings');
        if (initBtn) {
            initBtn.addEventListener('click', () => { Sound.click(); openGameSettings(); });
        }
    }

    // =========== 游戏流程 ===========

    async function startNewGame() {
        const s = Settings.get();

        if (!Settings.hasApiKey()) {
            showInitScreen();
            return;
        }

        hideInitScreen();

        // 显示加载状态
        showToast('🎲 正在出题...', 'system');

        try {
            // 生成两个人名
            const name1 = await AIService.generateName(s.category, null, s);
            const name2 = await AIService.generateName(s.category, name1, s);

            GameEngine.init({
                name1,
                name2,
                maxQuestions: s.maxQuestions,
                category: s.category,
            });

            Sound.gameStart();
            showToast('🎮 游戏开始！', 'system');
            updateUI();
        } catch (err) {
            showToast(`出题失败: ${err.message}`, 'error');
            showInitScreen();
        }
    }

    function switchTab(playerNum, type) {
        if (_playerTabs[playerNum] === type) return;
        _playerTabs[playerNum] = type;
        Sound.click();

        const input = DOM[`p${playerNum}Input`];
        input.value = ''; // 切换时清空输入
        input.focus();

        updateUI();
    }

    function handleSubmit(playerNum) {
        const type = _playerTabs[playerNum];
        if (type === 'ask') {
            handleAsk(playerNum);
        } else {
            handleGuess(playerNum);
        }
    }

    async function handleAsk(playerNum) {
        if (_loading[`player${playerNum}`]) return;

        const input = DOM[`p${playerNum}Input`];
        const text = input.value.trim();

        if (!text) {
            showToast('请输入问题', 'error');
            return;
        }

        if (!GameEngine.canAskQuestion(playerNum)) {
            showToast('提问次数已用完，请切换到"猜测结果"', 'info');
            switchTab(playerNum, 'guess');
            return;
        }

        _loading[`player${playerNum}`] = true;
        setPlayerLoading(playerNum, true);
        Sound.send();

        try {
            const secretName = GameEngine.getSecretName(playerNum);
            const s = Settings.get();
            const result = await AIService.judgeQuestion(secretName, text, s);

            GameEngine.recordQuestion(playerNum, text, 'ask', result);
            input.value = '';
            DOM[`p${playerNum}CharCount`].textContent = '0/20';

            if (result) {
                Sound.correct();
            } else {
                Sound.wrong();
            }
        } catch (err) {
            showToast(`判定失败: ${err.message}`, 'error');
        } finally {
            _loading[`player${playerNum}`] = false;
            setPlayerLoading(playerNum, false);
        }
    }

    async function handleGuess(playerNum) {
        if (_loading[`player${playerNum}`]) return;

        const input = DOM[`p${playerNum}Input`];
        const text = input.value.trim();

        if (!text) {
            showToast('请输入你猜测的人名', 'error');
            return;
        }

        if (!GameEngine.canGuess(playerNum)) {
            return;
        }

        _loading[`player${playerNum}`] = true;
        setPlayerLoading(playerNum, true);
        Sound.send();

        try {
            const secretName = GameEngine.getSecretName(playerNum);
            const s = Settings.get();
            const result = await AIService.judgeGuess(secretName, text, s);

            GameEngine.recordQuestion(playerNum, text, 'guess', result);
            input.value = '';
            DOM[`p${playerNum}CharCount`].textContent = '0/20';

            if (result) {
                Sound.correct();
            } else {
                Sound.wrong();
            }
        } catch (err) {
            showToast(`判定失败: ${err.message}`, 'error');
        } finally {
            _loading[`player${playerNum}`] = false;
            setPlayerLoading(playerNum, false);
        }
    }

    async function handleHint(playerNum) {
        if (_loading[`player${playerNum}`]) return;

        const pState = GameEngine.getPublicState()[`player${playerNum}`];
        if (pState.state !== 'playing') return;

        showConfirm('确定要使用终极提示吗？AI 将给出一个模糊的特征描述。', async () => {
            _loading[`player${playerNum}`] = true;
            setPlayerLoading(playerNum, true);

            try {
                const secretName = GameEngine.getSecretName(playerNum);
                const s = Settings.get();
                const hint = await AIService.getHint(secretName, s);

                // 将提示作为一条特殊的"正确"提问记录下来，或者直接弹窗？
                // 建议：记录在历史中，作为一条来自 AI 的消息
                // 由于 GameEngine 没设计专门的 Hint 类型，我们暂时模拟成一条"系统消息"
                // 或者简单点：弹窗显示 + 记录为 "求助：终极提示" -> "AI回复：..."

                // 这里我们暂且复用 recordQuestion，虽然不太规范，但能显示在列表里
                // 或者直接弹窗 Toast
                GameEngine.recordQuestion(playerNum, `💡 终极提示：${hint}`, 'hint', null);

                // 也在聊天记录里加一条
                // GameEngine.recordQuestion(playerNum, '请求终极提示', 'ask', true); // 占个位
                // 实际上这并未记录 AI 的回复文本，因为 recordQuestion 只存 text/result
                // 为了在列表显示，我们或许可以把提示拼在 text 里？
                // 但这会改变 recordQuestion 的语义。
                // 简单起见，我们只能弹窗，或者把提示内容强制作为一条 'ask' 记录进去（虽然有点怪）

                // 既然不能改动 GameEngine 结构，我们直接在前端显示 Toast 即可
                // 或者强行把提示作为 text 写入下一条记录（虽然有点怪）
                // "AI提示：xxx"
                // GameEngine.recordQuestion(playerNum, `AI提示：${hint}`, 'ask', true);

            } catch (err) {
                showToast(`获取提示失败: ${err.message}`, 'error');
            } finally {
                _loading[`player${playerNum}`] = false;
                setPlayerLoading(playerNum, false);
            }
        });
    }

    function handleGiveUp(playerNum) {
        const s = Settings.get();
        const name = playerNum === 1 ? s.player1Name : s.player2Name;
        showConfirm(`${name} 确定要放弃吗？\n放弃后将揭晓你的答案。`, () => {
            GameEngine.giveUp(playerNum);
        });
    }

    function handleRestart() {
        const state = GameEngine.getPublicState();
        if (state.started && !state.isGameOver) {
            showConfirm('当前游戏尚未结束，确定要重新开始吗？', () => {
                GameEngine.reset();
                startNewGame();
            });
        } else {
            GameEngine.reset();
            startNewGame();
        }
    }

    // =========== UI 更新 ===========

    function updateUI() {
        const s = Settings.get();
        const state = GameEngine.getPublicState();

        // 更新 VS 区域
        const avatar1 = Settings.getPlayerAvatar(1);
        const avatar2 = Settings.getPlayerAvatar(2);
        DOM.p1Avatar.textContent = avatar1.emoji;
        DOM.p1Avatar.style.background = `linear-gradient(135deg, ${avatar1.bg}33, ${avatar1.bg}11)`;
        DOM.p1Avatar.style.borderColor = avatar1.bg;
        DOM.p2Avatar.textContent = avatar2.emoji;
        DOM.p2Avatar.style.background = `linear-gradient(135deg, ${avatar2.bg}33, ${avatar2.bg}11)`;
        DOM.p2Avatar.style.borderColor = avatar2.bg;

        DOM.p1Name.textContent = s.player1Name;
        DOM.p2Name.textContent = s.player2Name;

        // 分类标签
        if (s.category !== 'any') {
            DOM.categoryBadge.textContent = '🎯 ' + Settings.getCategoryLabel(s.category);
            DOM.categoryBadge.style.display = 'inline-block';
        } else {
            DOM.categoryBadge.textContent = '🌍 不限人物';
            DOM.categoryBadge.style.display = 'inline-block';
        }

        if (!state.started) return;

        // 更新两个玩家面板
        [1, 2].forEach(pNum => {
            const pState = state[`player${pNum}`];
            const panel = DOM[`p${pNum}Panel`];
            const counter = DOM[`p${pNum}Counter`];
            const questionList = DOM[`p${pNum}Questions`];
            const input = DOM[`p${pNum}Input`];
            const btnSubmit = DOM[`p${pNum}BtnSubmit`]; // Shared submit button
            const btnHint = DOM[`p${pNum}BtnHint`];
            const btnGiveUp = DOM[`p${pNum}BtnGiveUp`];
            const reveal = DOM[`p${pNum}Reveal`];
            const avatar = DOM[`p${pNum}Avatar`];
            const statusEl = DOM[`p${pNum}Status`];

            // Tab Elements
            const tabAsk = DOM[`p${pNum}TabAsk`];
            const tabGuess = DOM[`p${pNum}TabGuess`];
            const currentTab = _playerTabs[pNum];

            // Update Tab Styles
            if (currentTab === 'ask') {
                tabAsk.classList.add('active');
                tabGuess.classList.remove('active');
                input.placeholder = '输入你的问题 (判断是非)...';
                btnSubmit.textContent = '❓ 确认提问';
                btnSubmit.className = 'btn btn-primary';
            } else {
                tabAsk.classList.remove('active');
                tabGuess.classList.add('active');
                input.placeholder = '输入你猜测的人名...';
                btnSubmit.textContent = '🎯 确认猜测';
                btnSubmit.className = 'btn btn-secondary';
            }

            // 计数器
            counter.textContent = `${pState.questionsUsed} / ${state.maxQuestions}`;
            counter.className = 'question-counter player' + pNum;
            if (pState.questionsUsed >= state.maxQuestions - 2) {
                counter.classList.add('warning');
            }
            if (pState.questionsUsed >= state.maxQuestions) {
                counter.classList.add('danger');
            }

            // 头像状态
            avatar.classList.remove('active', 'winner', 'lost');
            if (pState.state === 'playing') {
                avatar.classList.add('active');
                statusEl.textContent = `已提问 ${pState.questionsUsed}/${state.maxQuestions}`;
            } else if (pState.state === 'won') {
                avatar.classList.add('winner');
                statusEl.textContent = '🏆 猜对了！';
                statusEl.style.color = 'var(--color-success)';
            } else if (pState.state === 'gave_up') {
                avatar.classList.add('lost');
                statusEl.textContent = '🏳️ 已放弃';
                statusEl.style.color = 'var(--color-error)';
            } else if (pState.state === 'exhausted') {
                avatar.classList.add('lost');
                statusEl.textContent = '💫 次数用完';
                statusEl.style.color = 'var(--color-warning)';
            }

            // 问题列表
            renderQuestions(questionList, pState.questions, pNum);

            // 输入区域控制
            const isPlaying = pState.state === 'playing';
            const canAsk = isPlaying && pState.questionsUsed < state.maxQuestions;

            input.disabled = !isPlaying;

            // 如果是提问模式但次数没了 -> 不允许提交
            if (currentTab === 'ask' && !canAsk && isPlaying) {
                btnSubmit.disabled = true;
                btnSubmit.title = '次数已用完';
                input.placeholder = '次数用完，请切换到猜测结果';
            } else {
                btnSubmit.disabled = !isPlaying || _loading[`player${pNum}`];
                btnSubmit.title = '';
            }

            btnHint.disabled = !isPlaying || _loading[`player${pNum}`];
            btnGiveUp.disabled = !isPlaying;

            // 面板禁用状态
            panel.classList.toggle('disabled', !isPlaying && pState.state !== 'idle');

            // 揭晓答案
            if (pState.secretName) {
                reveal.innerHTML = `
          <div class="reveal-label">要猜的人物是</div>
          <div class="reveal-name">${pState.secretName}</div>
        `;
                reveal.style.display = 'block';
            } else {
                reveal.style.display = 'none';
            }
        });
    }

    function renderQuestions(container, questions, playerNum) {
        if (questions.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div>还没有提问</div>
          <div style="font-size: 0.7rem; color: var(--color-text-muted);">输入问题开始猜测吧！</div>
        </div>
      `;
            return;
        }

        container.innerHTML = questions.map(q => {
            if (q.type === 'hint') {
                return `
                <div class="question-item hint-msg">
                  <div class="question-text">
                    ${escapeHtml(q.text)}
                  </div>
                </div>
                `;
            }

            const isGuess = q.type === 'guess';
            const icon = q.result ? '✅' : '❌';
            const resultText = q.result ? '正确' : '错误';
            const resultClass = q.result ? 'correct' : 'wrong';
            const typeLabel = isGuess ? '🎯 猜测' : '❓ 提问';
            const itemClass = isGuess ? (q.result ? 'guess-correct' : 'guess-wrong') : resultClass;

            return `
        <div class="question-item ${itemClass}">
          <div class="question-text">
            <span class="question-label">Q${q.index} ${typeLabel}:</span>
            ${escapeHtml(q.text)}
          </div>
          <div class="answer-text ${resultClass}">
            <span class="answer-icon">${icon}</span> ${resultText}
          </div>
        </div>
      `;
        }).join('');

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    function setPlayerLoading(playerNum, loading) {
        const btnSubmit = DOM[`p${playerNum}BtnSubmit`];
        const btnHint = DOM[`p${playerNum}BtnHint`];

        if (loading) {
            btnSubmit.disabled = true;
            btnHint.disabled = true;
            const originalText = btnSubmit.textContent;
            btnSubmit.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
            // Store original text to restore later? updateUI will handle it anyway
        } else {
            // updateUI will restore text
        }
    }

    // =========== 设置面板 ===========

    // =========== Player 设置面板 ===========

    function openPlayerSettings() {
        Sound.openPanel();
        renderPlayerSettings();
        openModal(DOM.playerModal);
    }

    function closePlayerSettings() {
        closeModal(DOM.playerModal);
    }

    function renderPlayerSettings() {
        const s = Settings.get();
        DOM.inputP1Name.value = s.player1Name;
        DOM.inputP2Name.value = s.player2Name;
        renderAvatarPicker(DOM.avatarPicker1, 1, s.player1AvatarIndex, s.player2AvatarIndex);
        renderAvatarPicker(DOM.avatarPicker2, 2, s.player2AvatarIndex, s.player1AvatarIndex);
    }

    function savePlayerSettings() {
        const p1Name = DOM.inputP1Name.value.trim().slice(0, 4) || '玩家1';
        const p2Name = DOM.inputP2Name.value.trim().slice(0, 4) || '玩家2';

        Settings.save({
            player1Name: p1Name,
            player2Name: p2Name,
        });

        Sound.closePanel();
        closePlayerSettings();
        showToast('玩家信息已更新 ✅', 'success');
        updateUI();
    }

    // =========== Game 设置面板 ===========

    function openGameSettings() {
        Sound.openPanel();
        renderGameSettings();
        openModal(DOM.settingsModal);
    }

    function closeGameSettings() {
        closeModal(DOM.settingsModal);
    }

    function renderGameSettings() {
        const s = Settings.get();

        // 出题范围
        DOM.selectCategory.innerHTML = Settings.CATEGORY_OPTIONS.map(opt =>
            `<option value="${opt.value}" ${s.category === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        // 最大提问次数
        DOM.inputMaxQuestions.value = s.maxQuestions;

        // AI 提供商
        DOM.selectAiProvider.innerHTML = Settings.AI_PROVIDERS.map(opt =>
            `<option value="${opt.value}" ${s.aiProvider === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        // API Key
        DOM.inputApiKey.value = s.apiKey;
        DOM.inputApiKey.type = 'password';
        DOM.btnToggleKey.textContent = '👁️';
    }

    function saveGameSettings() {
        const category = DOM.selectCategory.value;
        const maxQuestions = Math.min(30, Math.max(5, parseInt(DOM.inputMaxQuestions.value) || 12));
        const aiProvider = DOM.selectAiProvider.value;
        const apiKey = DOM.inputApiKey.value.trim();

        if (!apiKey) {
            showToast('请输入 API Key', 'error');
            DOM.inputApiKey.focus();
            return;
        }

        Settings.save({
            category,
            maxQuestions,
            aiProvider,
            apiKey,
        });

        Sound.closePanel();
        closeGameSettings();
        showToast('游戏规则已更新 ✅', 'success');
        updateUI();

        // 总是重新开始
        GameEngine.reset();
        startNewGame();
    }

    function renderAvatarPicker(container, playerNum, selectedIndex, otherIndex) {
        container.innerHTML = Settings.AVATAR_OPTIONS.map((opt, idx) => {
            let cls = 'avatar-option';
            if (idx === selectedIndex) cls += ' selected';
            if (idx === otherIndex) cls += ' selected-other';
            return `<div class="${cls}" data-index="${idx}" data-player="${playerNum}" 
                   style="background: ${opt.bg}22" title="${opt.emoji}">${opt.emoji}</div>`;
        }).join('');

        container.querySelectorAll('.avatar-option').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                if (el.classList.contains('selected-other')) {
                    showToast('该头像已被另一位玩家选择', 'error');
                    return;
                }
                Sound.click();
                const s = Settings.get();
                if (playerNum === 1) s.player1AvatarIndex = idx;
                else s.player2AvatarIndex = idx;
                Settings.save(s);
                renderPlayerSettings(); // 只刷新玩家设置面板的头像
            });
        });
    }

    // =========== 结果弹窗 ===========

    function showResultModal(result) {
        const s = Settings.get();
        let icon, title, titleClass;

        if (result.winnerNum === 1 || result.winnerNum === 2) {
            const winnerName = result.winnerNum === 1 ? s.player1Name : s.player2Name;
            icon = '🏆';
            title = `${winnerName} 获胜！`;
            titleClass = 'win';
        } else if (result.resultType === 'both_won_tie') {
            icon = '🤝';
            title = '双方都猜对，平局！';
            titleClass = 'win';
        } else {
            icon = '😅';
            title = '双方都未猜出';
            titleClass = 'draw';
        }

        DOM.resultIcon.textContent = icon;
        DOM.resultTitle.textContent = title;
        DOM.resultTitle.className = 'result-title ' + titleClass;

        DOM.resultDetails.innerHTML = [1, 2].map(pNum => {
            const p = result[`player${pNum}`];
            const name = pNum === 1 ? s.player1Name : s.player2Name;
            const stateText = p.state === 'won' ? '✅ 猜对了' :
                p.state === 'gave_up' ? '🏳️ 放弃了' : '💫 次数用完';
            const stateClass = p.state === 'won' ? 'win' : 'lose';

            return `
        <div class="result-player">
          <div class="result-player-name" style="color: var(--color-player${pNum})">${name}</div>
          <div class="result-player-answer">答案: <span>${p.secretName}</span></div>
          <div class="result-player-answer">提问次数: <span>${p.questionsUsed}</span></div>
          <div class="result-player-status ${stateClass}">${stateText}</div>
        </div>
      `;
        }).join('');

        openModal(DOM.resultModal);

        // 如果有人获胜，播放庆祝效果
        if (result.winnerNum > 0 || result.resultType === 'both_won_tie') {
            triggerCelebration();
        }
    }

    // =========== 初始引导屏 ===========

    function showInitScreen() {
        DOM.initScreen.style.display = 'flex';
        DOM.gameArea.style.display = 'none';
    }

    function hideInitScreen() {
        DOM.initScreen.style.display = 'none';
        DOM.gameArea.style.display = 'grid';
    }

    // =========== 弹窗控制 ===========

    function openModal(modal) {
        modal.classList.add('active');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // =========== 确认弹窗 ===========

    function showConfirm(message, onConfirm) {
        DOM.confirmMessage.textContent = message;
        openModal(DOM.confirmModal);

        // 移除旧事件
        const newYes = DOM.confirmYes.cloneNode(true);
        const newNo = DOM.confirmNo.cloneNode(true);
        DOM.confirmYes.replaceWith(newYes);
        DOM.confirmNo.replaceWith(newNo);
        DOM.confirmYes = newYes;
        DOM.confirmNo = newNo;

        newYes.addEventListener('click', () => {
            Sound.click();
            closeModal(DOM.confirmModal);
            onConfirm();
        });
        newNo.addEventListener('click', () => {
            Sound.click();
            closeModal(DOM.confirmModal);
        });
    }

    // =========== Toast ===========

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // =========== 全屏 ===========

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            DOM.btnFullscreen.textContent = '⛶';
            DOM.btnFullscreen.title = '全屏显示';
        } else {
            document.documentElement.requestFullscreen().catch(() => {
                showToast('浏览器不支持全屏', 'error');
            });
            DOM.btnFullscreen.textContent = '⛶';
            DOM.btnFullscreen.title = '退出全屏';
        }
    }

    // =========== 静音 ===========

    function toggleMute() {
        const s = Settings.get();
        s.muted = !s.muted;
        Settings.save(s);
        Sound.setMuted(s.muted);
        DOM.btnMute.textContent = s.muted ? '🔇' : '🔊';
        DOM.btnMute.classList.toggle('muted', s.muted);
        if (!s.muted) Sound.click();
    }

    // =========== 背景粒子 ===========

    function createBackgroundParticles() {
        const container = DOM.bgParticles;
        const colors = ['#00d4ff', '#a855f7', '#f472b6', '#22c55e', '#f59e0b'];

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 4 + 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        background: ${color};
        box-shadow: 0 0 ${size * 2}px ${color};
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * 10}s;
      `;
            container.appendChild(particle);
        }
    }

    // =========== 庆祝撒花 ===========

    function triggerCelebration() {
        const container = DOM.celebrationContainer;
        const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#00d4ff'];
        const shapes = ['circle', 'square', 'triangle'];

        for (let i = 0; i < 60; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 6;
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const borderRadius = shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0';

            confetti.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: -10px;
        background: ${color};
        border-radius: ${borderRadius};
        animation-duration: ${Math.random() * 2 + 1.5}s;
        animation-delay: ${Math.random() * 0.5}s;
      `;

            if (shape === 'triangle') {
                confetti.style.background = 'transparent';
                confetti.style.borderLeft = `${size / 2}px solid transparent`;
                confetti.style.borderRight = `${size / 2}px solid transparent`;
                confetti.style.borderBottom = `${size}px solid ${color}`;
                confetti.style.width = '0';
                confetti.style.height = '0';
            }

            container.appendChild(confetti);
        }

        setTimeout(() => {
            container.innerHTML = '';
        }, 3500);
    }

    // =========== 工具 ===========

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init };
})();

// 启动
document.addEventListener('DOMContentLoaded', App.init);
