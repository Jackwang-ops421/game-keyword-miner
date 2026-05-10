# Game Keyword Miner

H5小游戏出海新词挖掘工具 - 基于 Vercel 部署的 Web 应用

## 功能

- 🎯 候选词管理（增删改查）
- 🔄 平台自动同步（itch.io、Scratch、Game Jolt）
- ⏰ 定时任务（每日自动同步）
- 📊 自动评分系统
- 📤 CSV/Markdown 导出
- 🔗 快捷核查链接（YouTube/Reddit/TikTok/Trends/SERP）
- 🌐 Neon PostgreSQL 数据库

## 快速部署

### 1. 创建 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/game-keyword-miner.git
git push -u origin main
```

### 2. Vercel 导入

1. 访问 [vercel.com](https://vercel.com)
2. Add New → Project
3. 导入你的 GitHub 仓库
4. 添加环境变量：

| Name | Value |
|------|-------|
| DATABASE_URL | 你的 Neon 数据库连接字符串 |

5. 点击 Deploy

### 3. 初始化数据库

部署完成后，访问：

```
https://your-project.vercel.app/api/init-db
```

这会创建所有必要的数据库表并插入默认平台数据。

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Vercel Serverless Functions
- **数据库**: Neon PostgreSQL
- **部署**: Vercel

## 本地开发

```bash
npm install
npm run dev
```

## 项目结构

```
├── api/                    # Serverless Functions
│   ├── candidates/         # 候选词 CRUD
│   ├── platforms/         # 平台管理
│   ├── sync/              # 同步接口
│   ├── cron/              # 定时任务
│   └── lib/               # 公共库
├── src/
│   ├── api/               # 前端 API 客户端
│   ├── components/        # React 组件
│   ├── pages/             # 页面
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
└── vercel.json            # Vercel 配置
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/candidates | 获取候选词列表 |
| POST | /api/candidates/import | 批量导入 |
| POST | /api/sync | 触发同步 |
| GET | /api/sync/logs | 获取同步日志 |
| GET | /api/platforms | 获取平台列表 |
| POST | /api/cron/sync | 定时同步（自动） |

## 需求文档

见 [需求.md](./需求.md)