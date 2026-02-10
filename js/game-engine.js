/**
 * 游戏引擎模块 (Game Engine)
 * 管理游戏状态、胜负判定
 */

const GameEngine = (() => {
    // 玩家状态枚举
    const PlayerState = {
        IDLE: 'idle',         // 等待开始
        PLAYING: 'playing',   // 进行中
        WON: 'won',           // 猜对
        GAVE_UP: 'gave_up',   // 放弃
        EXHAUSTED: 'exhausted', // 次数耗尽且猜错
    };

    // 游戏状态
    let _state = {
        started: false,
        player1: createPlayerState(),
        player2: createPlayerState(),
        maxQuestions: 12,
        category: 'any',
    };

    // 事件监听器
    const _listeners = {};

    function createPlayerState() {
        return {
            secretName: '',
            state: PlayerState.IDLE,
            questions: [],       // { text, type, result }
            questionsUsed: 0,
        };
    }

    /** 初始化新游戏 */
    function init(options) {
        _state = {
            started: true,
            player1: {
                secretName: options.name1 || '',
                state: PlayerState.PLAYING,
                questions: [],
                questionsUsed: 0,
            },
            player2: {
                secretName: options.name2 || '',
                state: PlayerState.PLAYING,
                questions: [],
                questionsUsed: 0,
            },
            maxQuestions: options.maxQuestions || 12,
            category: options.category || 'any',
        };
        emit('stateChange', getPublicState());
    }

    /** 获取公开的游戏状态（不含答案） */
    function getPublicState() {
        return {
            started: _state.started,
            maxQuestions: _state.maxQuestions,
            category: _state.category,
            player1: {
                state: _state.player1.state,
                questions: [..._state.player1.questions],
                questionsUsed: _state.player1.questionsUsed,
                secretName: isRevealed(1) ? _state.player1.secretName : null,
            },
            player2: {
                state: _state.player2.state,
                questions: [..._state.player2.questions],
                questionsUsed: _state.player2.questionsUsed,
                secretName: isRevealed(2) ? _state.player2.secretName : null,
            },
            isGameOver: isGameOver(),
            result: isGameOver() ? getResult() : null,
        };
    }

    /** 检查答案是否应当揭晓 */
    function isRevealed(playerNum) {
        const p = playerNum === 1 ? _state.player1 : _state.player2;
        return p.state === PlayerState.WON ||
            p.state === PlayerState.GAVE_UP ||
            p.state === PlayerState.EXHAUSTED;
    }

    /** 获取玩家内部数据（含答案，仅引擎内部使用） */
    function getPlayerInternal(playerNum) {
        return playerNum === 1 ? _state.player1 : _state.player2;
    }

    /** 获取玩家的隐藏名字（用于 AI 判定） */
    function getSecretName(playerNum) {
        return getPlayerInternal(playerNum).secretName;
    }

    /** 记录一次提问结果 */
    function recordQuestion(playerNum, text, type, result) {
        const player = getPlayerInternal(playerNum);
        if (player.state !== PlayerState.PLAYING) return false;

        player.questionsUsed++;
        player.questions.push({ text, type, result, index: player.questionsUsed });

        // 猜测正确
        if (type === 'guess' && result === true) {
            player.state = PlayerState.WON;
            emit('playerWon', { playerNum });
        }

        // 检查次数耗尽
        if (player.questionsUsed >= _state.maxQuestions && player.state === PlayerState.PLAYING) {
            // 不自动判负，让前端提示只能猜测 —— 但如果已经达到上限，标记为耗尽
            // 实际上 PRD 说达到最大次数后仅允许猜测，如果猜测也失败则才判负
            // 这里我们只限制"是否提问"，猜测仍可继续但消耗次数
            // 当次数达到 maxQuestions + 几次额外猜测后自动判负？
            // 按 PRD 逻辑：达到maxQuestions后只能猜测，猜错也计次，此处我们给1次额外猜测机会
            // 简化处理：到达上限且本次还是猜错，直接判负
            if (type === 'guess' && result === false) {
                player.state = PlayerState.EXHAUSTED;
                emit('playerExhausted', { playerNum });
            }
        }

        emit('stateChange', getPublicState());

        // 检查游戏是否结束
        if (isGameOver()) {
            emit('gameOver', getResult());
        }

        return true;
    }

    /** 能否继续进行"是否提问" */
    function canAskQuestion(playerNum) {
        const player = getPlayerInternal(playerNum);
        return player.state === PlayerState.PLAYING &&
            player.questionsUsed < _state.maxQuestions;
    }

    /** 能否进行"猜测结果" */
    function canGuess(playerNum) {
        const player = getPlayerInternal(playerNum);
        return player.state === PlayerState.PLAYING;
    }

    /** 玩家放弃 */
    function giveUp(playerNum) {
        const player = getPlayerInternal(playerNum);
        if (player.state !== PlayerState.PLAYING) return false;

        player.state = PlayerState.GAVE_UP;
        emit('playerGaveUp', { playerNum, secretName: player.secretName });
        emit('stateChange', getPublicState());

        if (isGameOver()) {
            emit('gameOver', getResult());
        }

        return true;
    }

    /** 游戏是否结束 */
    function isGameOver() {
        const s1 = _state.player1.state;
        const s2 = _state.player2.state;
        return s1 !== PlayerState.PLAYING && s1 !== PlayerState.IDLE &&
            s2 !== PlayerState.PLAYING && s2 !== PlayerState.IDLE;
    }

    /** 获取游戏结果 */
    function getResult() {
        const p1Won = _state.player1.state === PlayerState.WON;
        const p2Won = _state.player2.state === PlayerState.WON;

        let resultType, winnerNum;
        if (p1Won && p2Won) {
            // 双赢，比较提问次数
            if (_state.player1.questionsUsed < _state.player2.questionsUsed) {
                resultType = 'both_won_p1_better'; winnerNum = 1;
            } else if (_state.player2.questionsUsed < _state.player1.questionsUsed) {
                resultType = 'both_won_p2_better'; winnerNum = 2;
            } else {
                resultType = 'both_won_tie'; winnerNum = 0;
            }
        } else if (p1Won) {
            resultType = 'p1_wins'; winnerNum = 1;
        } else if (p2Won) {
            resultType = 'p2_wins'; winnerNum = 2;
        } else {
            resultType = 'draw'; winnerNum = 0;
        }

        return {
            resultType,
            winnerNum,
            player1: {
                state: _state.player1.state,
                secretName: _state.player1.secretName,
                questionsUsed: _state.player1.questionsUsed,
            },
            player2: {
                state: _state.player2.state,
                secretName: _state.player2.secretName,
                questionsUsed: _state.player2.questionsUsed,
            },
        };
    }

    /** 重置游戏（保留设置参数） */
    function reset() {
        _state.started = false;
        _state.player1 = createPlayerState();
        _state.player2 = createPlayerState();
        emit('stateChange', getPublicState());
    }

    // --- 事件系统 ---
    function on(event, callback) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!_listeners[event]) return;
        _listeners[event] = _listeners[event].filter(cb => cb !== callback);
    }

    function emit(event, data) {
        if (_listeners[event]) {
            _listeners[event].forEach(cb => cb(data));
        }
    }

    return {
        PlayerState,
        init, reset,
        getPublicState, getSecretName,
        recordQuestion, canAskQuestion, canGuess,
        giveUp, isGameOver, getResult,
        on, off,
    };
})();
