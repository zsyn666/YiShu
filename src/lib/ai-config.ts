type AiProviderConfig =
	{
		apiKey: string;
		baseUrl: string;
		model: string;
		temperature: number;
		maxTokens: number;
		timeoutMs: number;
	};

type PersonaTemplateConfig =
	{
		deceasedName: string;
		ageRange: string;
		styleKeywords: string;
		catchphrases: string;
		values: string;
	};

export type ServerAiConfig =
	{
		provider: AiProviderConfig;
		persona: PersonaTemplateConfig;
		promptTemplates: {
			systemTemplate: string;
		};
	};

function readNumberEnv(
	key: string,
	defaultValue: number,
): number {
	const raw =
		process
			.env[
			key
		];

	if (
		!raw
	) {
		return defaultValue;
	}

	const parsed =
		Number(
			raw,
		);

	if (
		Number.isNaN(
			parsed,
		)
	) {
		return defaultValue;
	}

	return parsed;
}

export function getServerAiConfig(): ServerAiConfig {
	const provider: AiProviderConfig =
		{
			apiKey:
				process
					.env
					.AI_API_KEY ??
				"",
			baseUrl:
				process
					.env
					.AI_BASE_URL ??
				"https://api.openai.com/v1",
			model:
				process
					.env
					.AI_MODEL ??
				"gpt-4o-mini",
			temperature:
				readNumberEnv(
					"AI_TEMPERATURE",
					0.7,
				),
			maxTokens:
				readNumberEnv(
					"AI_MAX_TOKENS",
					900,
				),
			timeoutMs:
				readNumberEnv(
					"AI_TIMEOUT_MS",
					30000,
				),
		};

	const persona: PersonaTemplateConfig =
		{
			deceasedName:
				process
					.env
					.AI_DECEASED_NAME ??
				"{{DECEASED_NAME}}",
			ageRange:
				process
					.env
					.AI_AGE_RANGE ??
				"{{AGE_RANGE}}",
			styleKeywords:
				process
					.env
					.AI_STYLE_KEYWORDS ??
				"{{STYLE_KEYWORDS}}",
			catchphrases:
				process
					.env
					.AI_CATCHPHRASES ??
				"{{CATCHPHRASES}}",
			values:
				process
					.env
					.AI_VALUES ??
				"{{VALUES}}",
		};

	const promptTemplates =
		{
			systemTemplate:
				process
					.env
					.AI_SYSTEM_TEMPLATE ??
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

	return {
		provider,
		persona,
		promptTemplates,
	};
}

export function ensureAiConfigReady(
	config: ServerAiConfig,
): void {
	if (
		!config
			.provider
			.apiKey
	) {
		throw new Error(
			"缺少 AI_API_KEY，请在后端环境变量中配置。",
		);
	}
}
