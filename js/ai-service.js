/**
 * AI 服务模块 (AI Service)
 * 封装智谱AI / Gemini API 调用
 */

const AIService = (() => {
    const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const REQUEST_TIMEOUT = 15000; // 15秒超时

    // 出题范围 → Prompt 描述映射
    const CATEGORY_PROMPTS = {
        any: '任何知名人物（真实或虚拟皆可），请广泛选择。',
        ancient_emperor: '中国古代皇帝（请从不同朝代中随机选择）。',
        ancient_scholar: '中国古代文人（诗人、词人、文学家等）。',
        classic_character: '中国四大名著中的知名人物（红楼梦、三国演义、水浒传、西游记）。',
        entertainment_star: '中国娱乐圈知名明星（演员、歌手等）。',
        sports_star: '中国知名体育明星（奥运冠军、职业运动员等）。',
        entrepreneur: '中国知名企业家。',
        journey_west: '西游记中的主要角色（师徒四人等）。',
    };

    /** 调用 AI 接口通用方法 */
    async function callAI(prompt, settings, temperature = 0.7) {
        const { aiProvider, apiKey } = settings;

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('请先在游戏设置中配置 API Key');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            let response;

            if (aiProvider === 'zhipu') {
                response = await fetch(ZHIPU_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey.trim()}`,
                    },
                    body: JSON.stringify({
                        model: 'glm-4-flash',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: temperature,
                        max_tokens: 100,
                    }),
                    signal: controller.signal,
                });
            } else if (aiProvider === 'gemini') {
                const url = `${GEMINI_API_URL}?key=${apiKey.trim()}`;
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: temperature, maxOutputTokens: 100 },
                    }),
                    signal: controller.signal,
                });
            } else {
                throw new Error(`未知的AI提供商: ${aiProvider}`);
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                if (response.status === 401 || response.status === 403) {
                    throw new Error('API Key 无效或已过期，请检查设置');
                }
                if (response.status === 429) {
                    throw new Error('API 调用次数超限，请稍后再试');
                }
                throw new Error(`AI 请求失败 (${response.status}): ${errText.slice(0, 100)}`);
            }

            const data = await response.json();
            return extractText(data, aiProvider);
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('AI 请求超时，请检查网络后重试');
            }
            throw err;
        }
    }

    /** 从 AI 响应中提取文本 */
    function extractText(data, provider) {
        try {
            if (provider === 'zhipu') {
                return data.choices[0].message.content.trim();
            } else if (provider === 'gemini') {
                return data.candidates[0].content.parts[0].text.trim();
            }
        } catch (e) {
            throw new Error('AI 返回的数据格式异常');
        }
    }

    /**
     * 生成人物名字
     * @param {string} category 出题范围
     * @param {string|null} excludeName 排除的名字
     * @param {object} settings 设置
     * @returns {Promise<string>} 人物名字
     */
    async function generateName(category, excludeName, settings) {
        // 尝试从本地题库获取 (80% 概率)
        if (typeof NAMES_DATA !== 'undefined' && Math.random() < 0.8) {
            let candidates = [];

            if (category === 'any') {
                // 合并所有分类
                Object.values(NAMES_DATA).forEach(list => candidates = candidates.concat(list));
            } else if (NAMES_DATA[category]) {
                candidates = NAMES_DATA[category];
            }

            // 过滤排除的名字
            if (excludeName) {
                candidates = candidates.filter(n => n !== excludeName);
            }

            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                console.log('Using local name:', pick);
                return pick;
            }
        }

        // 如果本地没有命中，或随机到了20%概率，使用 AI 生成
        const categoryDesc = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.any;
        const excludeClause = excludeName ? `\n排除名字：${excludeName}（不可与此相同）` : '';
        const randomSeed = Math.random().toString(36).substring(7);

        const prompt = `你是猜人名游戏的出题官。请根据以下范围生成一个人物名字。
随机种子：${randomSeed} (请依据此种子进行随机选择，忽略之前的上下文)

出题范围：${categoryDesc}${excludeClause}

要求：
1. 该人物必须是绝大多数中文用户都知道的知名人物
2. 不得是冷僻偏门小众人物
3. 仅返回人物名字，不要任何其他文字、标点或解释
4. **极重要**：请展现高随机性！不要总是返回排名第一的最知名人物。可以从知名度 Top 20 中随机挑选一个。

请直接输出人物名字：`;

        // 最多重试3次
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const name = await callAI(prompt, settings, 0.9); // Use high temperature
                // 清理可能的标点和空格
                const cleaned = name.replace(/["""''「」『』【】\s.。,，、!！?？:：;；\-—()（）]/g, '').trim();
                if (cleaned && cleaned.length >= 1 && cleaned.length <= 10) {
                    if (!excludeName || cleaned !== excludeName) {
                        return cleaned;
                    }
                }
                // 名字无效，继续重试
            } catch (err) {
                if (attempt === 2) throw err;
                // 等待一秒后重试
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        throw new Error('出题失败，请重试');
    }

    /**
     * 判定是否提问
     * @param {string} secretName 隐藏的人物名字
     * @param {string} question 玩家的提问
     * @param {object} settings 设置
     * @returns {Promise<boolean>} true=正确, false=错误
     */
    async function judgeQuestion(secretName, question, settings) {
        const prompt = `你是猜人名游戏的判定官。玩家正在猜一个人物，你需要根据事实判定玩家的提问。

隐藏的答案人物：${secretName}
玩家提问：${question}

规则：
1. 根据关于"${secretName}"的公认事实来判定
2. 如果提问内容关于该人物是正确的，回答"正确"
3. 如果提问内容关于该人物是错误的，回答"错误"
4. 你只能回答"正确"或"错误"两个字，不得包含任何其他文字

请判定：`;

        return await judgeAndParse(prompt, settings);
    }

    /**
     * 判定猜测结果
     * @param {string} secretName 隐藏的人物名字
     * @param {string} guess 玩家猜测的名字
     * @param {object} settings 设置
     * @returns {Promise<boolean>} true=正确, false=错误
     */
    async function judgeGuess(secretName, guess, settings) {
        const prompt = `你是猜人名游戏的判定官。请判断玩家猜测的人名是否正确。

正确答案：${secretName}
玩家猜测：${guess}

规则：
1. 核心原则：只要意思一致、指向同一人物即判定为"正确"。
2. 模糊匹配：
   - 包含关系：如答案"李世民" vs 猜测"唐太宗" -> 正确
   - 别名/称号：如答案"孙悟空" vs 猜测"齐天大圣" -> 正确
   - 英文/译名：如答案"钢铁侠" vs 猜测"Iron Man" -> 正确
3. 如果明显不是同一人物，回答"错误"
4. 你只能回答"正确"或"错误"两个字，严禁输出其他内容

请判定：`;

        return await judgeAndParse(prompt, settings);
    }

    /**
     * 获取终极提示
     * @param {string} secretName 隐藏的人物名字
     * @param {object} settings 设置
     * @returns {Promise<string>} 提示文本
     */
    async function getHint(secretName, settings) {
        const prompt = `你是猜人名游戏的提示官。玩家猜不出"${secretName}"了，请给出一个终极提示。

要求：
1. 用一句话简短描述该人物的一个显著特征（外貌、事迹、身份等）。
2. 必须模棱两可、带有神秘感，**绝对不能**直接包含名字中的任何字。
3. 字数控制在15字以内。
4. 风格要调皮一点。

例如答案是"这是蜘蛛侠"，提示可以是："被一直变异的小虫子咬了一口的倒霉蛋。"

请生成"${secretName}"的提示：`;

        return await callAI(prompt, settings);
    }

    /** 调用 AI 并解析判定结果 */
    async function judgeAndParse(prompt, settings) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await callAI(prompt, settings);
                const cleaned = result.replace(/\s/g, '');
                if (cleaned.includes('正确')) return true;
                if (cleaned.includes('错误')) return false;
                // 无法解析，重试
                if (attempt === 0) continue;
            } catch (err) {
                if (attempt === 1) throw err;
                await new Promise(r => setTimeout(r, 500));
            }
        }
        throw new Error('AI 返回了无法识别的结果，请重试');
    }

    return {
        generateName,
        judgeQuestion,
        judgeGuess,
        getHint,
        CATEGORY_PROMPTS,
    };
})();
