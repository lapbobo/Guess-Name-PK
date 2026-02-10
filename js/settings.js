/**
 * 设置管理模块 (Settings Manager)
 * 负责读写 localStorage、管理所有游戏设置
 */

const Settings = (() => {
    const STORAGE_KEY = 'guess-name-pk3-settings';

    // 50个可选头像 with 底纹色
    const AVATAR_OPTIONS = [
        // 动物 (12)
        { emoji: '🐱', bg: '#ef4444' }, { emoji: '🐶', bg: '#f97316' },
        { emoji: '🐻', bg: '#a16207' }, { emoji: '🐼', bg: '#64748b' },
        { emoji: '🦊', bg: '#ea580c' }, { emoji: '🐰', bg: '#ec4899' },
        { emoji: '🐸', bg: '#22c55e' }, { emoji: '🐵', bg: '#92400e' },
        { emoji: '🦁', bg: '#eab308' }, { emoji: '🐧', bg: '#3b82f6' },
        { emoji: '🐨', bg: '#6b7280' }, { emoji: '🐯', bg: '#f59e0b' },
        // 更多动物 (6)
        { emoji: '🦄', bg: '#d946ef' }, { emoji: '🐲', bg: '#dc2626' },
        { emoji: '🦋', bg: '#06b6d4' }, { emoji: '🐙', bg: '#7c3aed' },
        { emoji: '🦜', bg: '#16a34a' }, { emoji: '🐳', bg: '#0284c7' },
        // 球类 (6)
        { emoji: '⚽', bg: '#374151' }, { emoji: '🏀', bg: '#ea580c' },
        { emoji: '🎾', bg: '#84cc16' }, { emoji: '🏐', bg: '#fafafa' },
        { emoji: '🎱', bg: '#1e293b' }, { emoji: '🏈', bg: '#92400e' },
        // 表情 (6)
        { emoji: '😎', bg: '#eab308' }, { emoji: '🤓', bg: '#3b82f6' },
        { emoji: '🥳', bg: '#d946ef' }, { emoji: '😈', bg: '#7c3aed' },
        { emoji: '🤖', bg: '#64748b' }, { emoji: '👻', bg: '#f1f5f9' },
        // 食物 (6)
        { emoji: '🍕', bg: '#f59e0b' }, { emoji: '🍔', bg: '#b45309' },
        { emoji: '🍩', bg: '#ec4899' }, { emoji: '🧁', bg: '#f472b6' },
        { emoji: '🍓', bg: '#ef4444' }, { emoji: '🍉', bg: '#22c55e' },
        // 工具/物品 (6)
        { emoji: '🔧', bg: '#6b7280' }, { emoji: '🎸', bg: '#b91c1c' },
        { emoji: '🎮', bg: '#7c3aed' }, { emoji: '🎯', bg: '#dc2626' },
        { emoji: '🚀', bg: '#3b82f6' }, { emoji: '💎', bg: '#06b6d4' },
        // 植物/自然 (4)
        { emoji: '🌸', bg: '#f9a8d4' }, { emoji: '🌻', bg: '#fbbf24' },
        { emoji: '🍀', bg: '#16a34a' }, { emoji: '🌈', bg: '#8b5cf6' },
        // 其他 (4)
        { emoji: '👑', bg: '#f59e0b' }, { emoji: '🔥', bg: '#ef4444' },
        { emoji: '⭐', bg: '#eab308' }, { emoji: '🎪', bg: '#d946ef' },
    ];

    // 出题范围选项
    const CATEGORY_OPTIONS = [
        { value: 'any', label: '不限' },
        { value: 'ancient_emperor', label: '中国古代皇帝' },
        { value: 'ancient_scholar', label: '中国古代文人' },
        { value: 'classic_character', label: '中国四大名著人物' },
        { value: 'entertainment_star', label: '中国娱乐圈明星' },
        { value: 'sports_star', label: '中国体育明星' },
        { value: 'entrepreneur', label: '中国知名企业家' },
        { value: 'journey_west', label: '中国西游记主角' },
    ];

    // AI 提供商选项
    const AI_PROVIDERS = [
        { value: 'zhipu', label: '智谱 AI (GLM)' },
        { value: 'gemini', label: 'Google Gemini' },
    ];

    // 默认设置
    const DEFAULTS = {
        player1Name: '甜大官',
        player2Name: '万小布',
        player1AvatarIndex: 0,  // 🐱
        player2AvatarIndex: 1,  // 🐶
        category: 'any',
        maxQuestions: 12,
        aiProvider: 'zhipu',
        apiKey: '',
        muted: false,
    };

    let _settings = null;

    /** 从 localStorage 加载设置 */
    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                _settings = { ...DEFAULTS, ...JSON.parse(saved) };
            } else {
                _settings = { ...DEFAULTS };
            }
        } catch (e) {
            console.warn('Settings load failed, using defaults:', e);
            _settings = { ...DEFAULTS };
        }
        return _settings;
    }

    /** 保存设置到 localStorage */
    function save(newSettings) {
        _settings = { ...(_settings || DEFAULTS), ...newSettings };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
        } catch (e) {
            console.error('Settings save failed:', e);
            return false;
        }
        return true;
    }

    /** 获取当前设置 */
    function get() {
        if (!_settings) load();
        return { ..._settings };
    }

    /** 恢复默认设置（保留 API Key） */
    function resetToDefaults() {
        const apiKey = _settings ? _settings.apiKey : '';
        const aiProvider = _settings ? _settings.aiProvider : DEFAULTS.aiProvider;
        _settings = { ...DEFAULTS, apiKey, aiProvider };
        save(_settings);
        return _settings;
    }

    /** 获取玩家头像信息 */
    function getPlayerAvatar(playerIndex) {
        const s = get();
        const idx = playerIndex === 1 ? s.player1AvatarIndex : s.player2AvatarIndex;
        return AVATAR_OPTIONS[idx] || AVATAR_OPTIONS[0];
    }

    /** 获取出题范围的中文标签 */
    function getCategoryLabel(value) {
        const opt = CATEGORY_OPTIONS.find(o => o.value === value);
        return opt ? opt.label : '不限';
    }

    /** 检查 API Key 是否已配置 */
    function hasApiKey() {
        const s = get();
        return s.apiKey && s.apiKey.trim().length > 0;
    }

    return {
        load, save, get, resetToDefaults,
        getPlayerAvatar, getCategoryLabel, hasApiKey,
        AVATAR_OPTIONS, CATEGORY_OPTIONS, AI_PROVIDERS, DEFAULTS,
    };
})();
