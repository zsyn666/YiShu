# 遗书项目（Next.js 全栈）

这是一个基于 **Next.js App Router** 的全栈项目，前后端都使用 Next.js 实现。

## 创作背景

这个项目最初是为了表达“临终告白”这一特殊场景下，不同关系对象之间的情感差异。  
相比通用文本生成，本项目更强调“关系驱动内容”的结构化表达，目标是让遗书内容在语气、称谓和重点上更贴近真实沟通语境。  
在实现上，先通过可配置文案打通前后端流程，再逐步预留并接入 AI 能力，以支持后续更个性化的生成体验。

## 功能概览

1. **关系选择驱动内容变化（前端）**  
   页面可选择与逝者的关系（父母、配偶、子女、朋友、同事），并根据选择动态展示对应遗书内容。

2. **后端可配置不同遗书内容**  
   后端通过统一配置文件管理不同关系的遗书文案，可按需随时调整。

3. **AI 对话功能已实现（模拟逝者语气）**  
   已实现 AI 对话接口，可基于关系、历史消息和人物设定，模拟逝者语气与用户进行对话。

---

## 项目结构（关键文件）

```text
src/
  app/
    api/
      will/route.ts            # 根据 relation 返回遗书内容
      ai/chat/route.ts         # AI 对话接口（POST，模拟逝者语气）
      ai/generate/route.ts     # AI 文案生成接口（POST）
    page.tsx                   # 前端主页面（关系选择 + 内容展示 + AI功能调用）
  lib/
    relations.ts               # 关系枚举与校验
    will-config.ts             # 遗书内容配置（后端可改）
```

---

## 快速启动

```bash
npm install
npm run dev
```

打开浏览器访问：

- http://localhost:3000

---

## API 说明

### 1) 获取遗书内容

**GET** `/api/will?relation=parent`

- relation 可选值：`parent | spouse | child | friend | colleague`
- 成功返回示例：

```json
{
	"relation": "parent",
	"content": {
		"title": "写给父母",
		"greeting": "亲爱的爸妈：",
		"body": [
			"..."
		],
		"closing": "你们永远的孩子"
	}
}
```

---

### 2) AI 对话接口（已实现）

**POST** `/api/ai/chat`

请求体示例：

```json
{
	"relation": "friend",
	"userName": "小林",
	"message": "我还是很想你",
	"history": [
		{
			"role": "user",
			"content": "最近过得好吗"
		},
		{
			"role": "assistant",
			"content": "我一直都在惦记你"
		}
	]
}
```

该接口会结合关系设定、遗书基础内容和管理端 AI 配置，生成“模拟逝者语气”的自然语言回复，用于与用户进行连续对话。

---

## 如何修改后端遗书内容

编辑文件：

- `src/lib/will-config.ts`

在 `WILL_CONTENT_BY_RELATION` 中修改不同关系对应的文案即可。

---
