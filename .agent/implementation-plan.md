# 猜人名PK3 实施计划

## 项目架构
```
guess-name-pk3/
├── index.html          # 主页面
├── css/
│   └── style.css       # 全局样式（设计系统 + 组件 + 动画）
├── js/
│   ├── app.js          # 主应用入口，协调各模块
│   ├── game-engine.js  # 游戏状态管理，胜负判定
│   ├── ai-service.js   # AI API 调用（智谱/Gemini）
│   ├── settings.js     # 设置管理（读写 localStorage）
│   └── sound.js        # 音效系统（Web Audio API）
└── Product-Spec.md     # PRD
```

## 任务清单

### 阶段 1：基础架构 ✅
- [x] Task 1.1: 创建项目文件结构
- [x] Task 1.2: 构建 HTML 主结构
- [x] Task 1.3: 构建 CSS 设计系统（变量、基础样式、深色主题）

### 阶段 2：核心模块
- [x] Task 2.1: 实现 settings.js（设置管理模块）
- [x] Task 2.2: 实现 ai-service.js（AI 调用模块）
- [x] Task 2.3: 实现 game-engine.js（游戏引擎模块）
- [x] Task 2.4: 实现 sound.js（音效模块）

### 阶段 3：UI 组件与交互
- [x] Task 3.1: 实现设置弹窗 UI 与交互
- [x] Task 3.2: 实现游戏主界面 UI 与交互
- [x] Task 3.3: 实现游戏结果弹窗

### 阶段 4：整合与联调
- [x] Task 4.1: 实现 app.js 主入口，串联所有模块
- [ ] Task 4.2: 浏览器测试与调试
- [ ] Task 4.3: 细节打磨与优化

## 设计令牌
- 主背景：#0a0a1a → #1a0a2e
- 主色：#00d4ff
- 辅色：#a855f7
- 成功色：#22c55e
- 失败色：#ef4444
- 卡片：rgba(255,255,255,0.05) + backdrop-filter: blur(12px)
- 圆角：12px~16px
- 字体：'Inter', 'Noto Sans SC', sans-serif
