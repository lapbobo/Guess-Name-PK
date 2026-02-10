/**
 * 音效模块 (Sound Effects)
 * 使用 Web Audio API 合成音效，零外部依赖
 */

const Sound = (() => {
    let _ctx = null;
    let _muted = false;

    function getContext() {
        if (!_ctx) {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (browser autoplay policy)
        if (_ctx.state === 'suspended') {
            _ctx.resume();
        }
        return _ctx;
    }

    function setMuted(muted) {
        _muted = muted;
    }

    function isMuted() {
        return _muted;
    }

    /** 播放简单音调 */
    function playTone(freq, duration, type = 'sine', volume = 0.3) {
        if (_muted) return;
        try {
            const ctx = getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Silently fail
        }
    }

    /** 播放多个音调序列 */
    function playSequence(notes, interval = 0.15) {
        if (_muted) return;
        notes.forEach((note, i) => {
            setTimeout(() => {
                playTone(note.freq, note.duration || 0.2, note.type || 'sine', note.volume || 0.25);
            }, i * interval * 1000);
        });
    }

    // ---------- 预设音效 ----------

    /** 按钮点击 - 短促清脆 */
    function click() {
        playTone(800, 0.08, 'sine', 0.15);
    }

    /** 提交提问 - 上升音 */
    function send() {
        playSequence([
            { freq: 440, duration: 0.1 },
            { freq: 660, duration: 0.15 },
        ], 0.08);
    }

    /** 判定正确 - 清脆叮声 */
    function correct() {
        playSequence([
            { freq: 523, duration: 0.15, type: 'sine' },
            { freq: 784, duration: 0.25, type: 'sine' },
        ], 0.12);
    }

    /** 判定错误 - 低沉嗡声 */
    function wrong() {
        playSequence([
            { freq: 300, duration: 0.15, type: 'square', volume: 0.15 },
            { freq: 220, duration: 0.3, type: 'square', volume: 0.12 },
        ], 0.1);
    }

    /** 胜利号角 */
    function victory() {
        playSequence([
            { freq: 523, duration: 0.15, type: 'sine', volume: 0.3 },
            { freq: 659, duration: 0.15, type: 'sine', volume: 0.3 },
            { freq: 784, duration: 0.15, type: 'sine', volume: 0.3 },
            { freq: 1047, duration: 0.4, type: 'sine', volume: 0.35 },
        ], 0.15);
    }

    /** 放弃/失败 - 下行音 */
    function fail() {
        playSequence([
            { freq: 440, duration: 0.2, type: 'triangle', volume: 0.2 },
            { freq: 350, duration: 0.2, type: 'triangle', volume: 0.18 },
            { freq: 280, duration: 0.4, type: 'triangle', volume: 0.15 },
        ], 0.2);
    }

    /** 游戏开始 - 小鼓点 */
    function gameStart() {
        playSequence([
            { freq: 330, duration: 0.1, type: 'square', volume: 0.2 },
            { freq: 440, duration: 0.1, type: 'square', volume: 0.2 },
            { freq: 550, duration: 0.1, type: 'square', volume: 0.22 },
            { freq: 660, duration: 0.2, type: 'sine', volume: 0.3 },
        ], 0.1);
    }

    /** 打开面板 */
    function openPanel() {
        playTone(600, 0.12, 'sine', 0.12);
    }

    /** 关闭面板 */
    function closePanel() {
        playTone(400, 0.1, 'sine', 0.1);
    }

    return {
        setMuted, isMuted,
        click, send, correct, wrong,
        victory, fail, gameStart,
        openPanel, closePanel,
    };
})();
