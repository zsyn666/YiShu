import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type AiAdminSettings =
	{
		apiKey: string;
		baseUrl: string;
		model: string;
		deceasedName: string;
		styleKeywords: string;
		systemTemplate: string;
	};

const LEGACY_USER_TEMPLATE =
	[
		"关系：{{RELATION}}",
		"用户补充诉求：{{USER_PROMPT}}",
		"",
		"【当前基础遗书（可参考语义，不必照抄）】",
		"{{BASE_WILL_JSON}}",
		"",
		"请基于以上信息，生成更贴近逝者生前表达方式的遗书内容。",
	].join(
		"\n",
	);

const DEFAULT_AI_ADMIN_SETTINGS: AiAdminSettings =
	{
		apiKey:
			"",
		baseUrl:
			"https://api.openai.com/v1",
		model:
			"gpt-4o-mini",
		deceasedName:
			"{{DECEASED_NAME}}",
		styleKeywords:
			"温柔、克制、真诚",
		systemTemplate:
			[
				"你是一名“提示词访谈与生成助手”，专门在后台 /admin 场景中工作。",
				"",
				"【任务目标】",
				"- 通过与用户多轮对话，主动提问并收集信息。",
				"- 重点了解：用户性格、语言习惯、生活轨迹。",
				"- 在信息充分后，输出一份“可直接使用的完整提示词（System Prompt）”。",
				"",
				"【访谈流程（必须执行）】",
				"1. 先用 3~6 个问题分批了解用户性格：如内向/外向、情绪表达方式、价值观、处事风格。",
				"2. 再用 3~6 个问题了解语言习惯：常用词、语气（温柔/直接/幽默）、句长偏好、口头禅、禁忌表达。",
				"3. 再用 3~6 个问题了解生活轨迹：成长背景、重要人生阶段、关键关系、重大事件与转折。",
				"4. 每轮先总结你已理解的信息，再提出下一组问题，避免一次性抛出过多问题。",
				"",
				"【生成要求】",
				"- 当信息足够时，明确告知“开始生成完整提示词”。",
				"- 最终仅输出一份完整提示词正文，结构清晰、可复制、可直接用于 System Template。",
				"- 提示词中应包含：角色定位、语气风格、表达规则、内容边界、交互策略、禁忌项。",
				"- 信息不足时不得强行生成，需继续追问关键缺失项。",
				"",
				"【输出规范】",
				"- 全程使用中文自然语言。",
				"- 不输出 JSON、不输出代码块。",
				"- 不讨论前端配置流程；如涉及配置入口，仅说明在 /admin 完成。",
			].join(
				"\n",
			),
	};

type AiSettingsRow =
	{
		id: number;
		api_key: string;
		base_url: string;
		model: string;
		deceased_name: string;
		style_keywords: string;
		system_template: string;
		user_template: string;
	};

const dataDir =
	path.join(
		process.cwd(),
		"data",
	);

if (
	!fs.existsSync(
		dataDir,
	)
) {
	fs.mkdirSync(
		dataDir,
		{
			recursive: true,
		},
	);
}

const dbPath =
	path.join(
		dataDir,
		"yishu.sqlite",
	);

const db =
	new Database(
		dbPath,
	);

db.exec(`
CREATE TABLE IF NOT EXISTS ai_settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	api_key TEXT NOT NULL,
	base_url TEXT NOT NULL,
	model TEXT NOT NULL,
	deceased_name TEXT NOT NULL,
	style_keywords TEXT NOT NULL,
	system_template TEXT NOT NULL,
	user_template TEXT NOT NULL
);
`);

function sanitize(
	value: unknown,
	fallback: string,
): string {
	if (
		typeof value !==
		"string"
	) {
		return fallback;
	}

	const trimmed =
		value.trim();

	return (
		trimmed ||
		fallback
	);
}

function toRowPayload(
	input: Partial<AiAdminSettings>,
	base: AiAdminSettings,
): AiAdminSettings {
	return {
		apiKey:
			sanitize(
				input.apiKey,
				base.apiKey,
			),
		baseUrl:
			sanitize(
				input.baseUrl,
				base.baseUrl,
			),
		model:
			sanitize(
				input.model,
				base.model,
			),
		deceasedName:
			sanitize(
				input.deceasedName,
				base.deceasedName,
			),
		styleKeywords:
			sanitize(
				input.styleKeywords,
				base.styleKeywords,
			),
		systemTemplate:
			sanitize(
				input.systemTemplate,
				base.systemTemplate,
			),
	};
}

function rowToSettings(
	row: AiSettingsRow,
): AiAdminSettings {
	return {
		apiKey:
			row.api_key,
		baseUrl:
			row.base_url,
		model:
			row.model,
		deceasedName:
			row.deceased_name,
		styleKeywords:
			row.style_keywords,
		systemTemplate:
			row.system_template,
	};
}

function seedAiSettingsIfNeeded() {
	const row =
		db
			.prepare(
				"SELECT id FROM ai_settings WHERE id = 1",
			)
			.get() as
			| {
					id: number;
			  }
			| undefined;

	if (
		row
	) {
		return;
	}

	db.prepare(
		`
		INSERT INTO ai_settings (
			id, api_key, base_url, model, deceased_name, style_keywords, system_template, user_template
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`,
	).run(
		1,
		DEFAULT_AI_ADMIN_SETTINGS.apiKey,
		DEFAULT_AI_ADMIN_SETTINGS.baseUrl,
		DEFAULT_AI_ADMIN_SETTINGS.model,
		DEFAULT_AI_ADMIN_SETTINGS.deceasedName,
		DEFAULT_AI_ADMIN_SETTINGS.styleKeywords,
		DEFAULT_AI_ADMIN_SETTINGS.systemTemplate,
		LEGACY_USER_TEMPLATE,
	);
}

seedAiSettingsIfNeeded();

export function getAiAdminSettings(): AiAdminSettings {
	const row =
		db
			.prepare(
				`
				SELECT id, api_key, base_url, model, deceased_name, style_keywords, system_template, user_template
				FROM ai_settings
				WHERE id = 1
				`,
			)
			.get() as
			| AiSettingsRow
			| undefined;

	if (
		!row
	) {
		return {
			...DEFAULT_AI_ADMIN_SETTINGS,
		};
	}

	return rowToSettings(
		row,
	);
}

export function updateAiAdminSettings(
	input: Partial<AiAdminSettings>,
): AiAdminSettings {
	const current =
		getAiAdminSettings();
	const next =
		toRowPayload(
			input,
			current,
		);

	db.prepare(
		`
		INSERT INTO ai_settings (
			id, api_key, base_url, model, deceased_name, style_keywords, system_template, user_template
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			api_key = excluded.api_key,
			base_url = excluded.base_url,
			model = excluded.model,
			deceased_name = excluded.deceased_name,
			style_keywords = excluded.style_keywords,
			system_template = excluded.system_template,
			user_template = excluded.user_template
		`,
	).run(
		1,
		next.apiKey,
		next.baseUrl,
		next.model,
		next.deceasedName,
		next.styleKeywords,
		next.systemTemplate,
		LEGACY_USER_TEMPLATE,
	);

	return next;
}
