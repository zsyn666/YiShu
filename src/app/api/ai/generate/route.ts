import { NextResponse } from "next/server";
import {
	getWillByRelation,
	hasRelation,
	listRelations,
} from "@/lib/will-store";
import { getAiAdminSettings } from "@/lib/ai-settings-store";

type GenerateBody =
	{
		relation?: string;
		prompt?: string;
	};

type GeneratedWill =
	{
		title: string;
		greeting: string;
		body: string[];
		closing: string;
	};

type PromptTemplatePack =
	{
		systemTemplate: string;
	};

type GenerateContext =
	{
		relation: string;
		prompt: string;
		baseWill: GeneratedWill | null;
		promptTemplates: PromptTemplatePack;
	};

type OpenAiChatResponse =
	{
		choices?: Array<{
			message?: {
				content?:
					| string
					| null;
			};
		}>;
	};

const FIXED_TEMPERATURE = 0.7;
const FIXED_MAX_TOKENS = 900;
const FIXED_TIMEOUT_MS = 30000;

function applyTemplate(
	template: string,
	vars: Record<
		string,
		string
	>,
): string {
	let result =
		template;

	for (const [
		key,
		value,
	] of Object.entries(
		vars,
	)) {
		result =
			result.replaceAll(
				`{{${key}}}`,
				value,
			);
	}

	return result;
}

function safeParseGeneratedWill(
	raw: string,
): GeneratedWill | null {
	const trimmed =
		raw.trim();

	const jsonCandidate =
		trimmed.startsWith(
			"```",
		)
			? trimmed
					.replace(
						/^```(?:json)?/i,
						"",
					)
					.replace(
						/```$/,
						"",
					)
					.trim()
			: trimmed;

	try {
		const parsed =
			JSON.parse(
				jsonCandidate,
			) as Partial<GeneratedWill>;

		if (
			typeof parsed.title !==
				"string" ||
			typeof parsed.greeting !==
				"string" ||
			!Array.isArray(
				parsed.body,
			) ||
			typeof parsed.closing !==
				"string"
		) {
			return null;
		}

		const body =
			parsed.body.filter(
				(
					item,
				) =>
					typeof item ===
					"string",
			);

		if (
			body.length <
			1
		) {
			return null;
		}

		return {
			title:
				parsed.title,
			greeting:
				parsed.greeting,
			body,
			closing:
				parsed.closing,
		};
	} catch {
		return null;
	}
}

function buildPromptTemplates(
	relation: string,
	prompt: string,
	baseWill: GeneratedWill | null,
): PromptTemplatePack {
	const aiSettings =
		getAiAdminSettings();

	const baseWillJson =
		JSON.stringify(
			baseWill ?? {
				title:
					"写给你",
				greeting:
					"亲爱的你：",
				body: [
					"谢谢你曾陪我走过这段路。",
					"请带着我对你的爱继续好好生活。",
					"我会在你看不见的地方祝福你。",
				],
				closing:
					"永远牵挂你的人",
			},
			null,
			2,
		);

	const vars: Record<
		string,
		string
	> =
		{
			DECEASED_NAME:
				aiSettings.deceasedName,
			STYLE_KEYWORDS:
				aiSettings.styleKeywords,
			RELATION:
				relation,
			USER_PROMPT:
				prompt,
			BASE_WILL_JSON:
				baseWillJson,
		};

	return {
		systemTemplate:
			applyTemplate(
				aiSettings.systemTemplate,
				vars,
			),
	};
}

async function callAiModel(
	context: GenerateContext,
): Promise<GeneratedWill> {
	const aiSettings =
		getAiAdminSettings();

	if (
		!aiSettings.apiKey.trim()
	) {
		throw new Error(
			"AI API Key 未配置，请先到 /admin 保存 AI 配置。",
		);
	}

	if (
		!aiSettings.baseUrl.trim() ||
		!aiSettings.model.trim()
	) {
		throw new Error(
			"AI Base URL 或模型名未配置，请先到 /admin 保存 AI 配置。",
		);
	}

	const controller =
		new AbortController();
	const timer =
		setTimeout(
			() =>
				controller.abort(),
			FIXED_TIMEOUT_MS,
		);

	try {
		const response =
			await fetch(
				`${aiSettings.baseUrl}/chat/completions`,
				{
					method:
						"POST",
					headers:
						{
							"Content-Type":
								"application/json",
							Authorization: `Bearer ${aiSettings.apiKey}`,
						},
					body: JSON.stringify(
						{
							model:
								aiSettings.model,
							temperature:
								FIXED_TEMPERATURE,
							max_tokens:
								FIXED_MAX_TOKENS,
							response_format:
								{
									type: "json_object",
								},
							messages:
								[
									{
										role: "system",
										content:
											context
												.promptTemplates
												.systemTemplate,
									},
									{
										role: "user",
										content:
											[
												`关系：${context.relation}`,
												`用户补充诉求：${context.prompt}`,
												"",
												"【当前基础遗书（可参考语义，不必照抄）】",
												JSON.stringify(
													context.baseWill ?? {
														title:
															"写给你",
														greeting:
															"亲爱的你：",
														body: [
															"谢谢你曾陪我走过这段路。",
															"请带着我对你的爱继续好好生活。",
															"我会在你看不见的地方祝福你。",
														],
														closing:
															"永远牵挂你的人",
													},
													null,
													2,
												),
												"",
												"请基于以上信息，生成更贴近逝者生前表达方式的遗书内容。",
											].join(
												"\n",
											),
									},
								],
						},
					),
					signal:
						controller.signal,
				},
			);

		if (
			!response.ok
		) {
			const errText =
				await response.text();
			throw new Error(
				`AI 调用失败：HTTP ${response.status} - ${errText}`,
			);
		}

		const json =
			(await response.json()) as OpenAiChatResponse;

		const content =
			json
				.choices?.[0]
				?.message
				?.content;

		if (
			typeof content !==
				"string" ||
			!content.trim()
		) {
			throw new Error(
				"AI 返回内容为空",
			);
		}

		const parsed =
			safeParseGeneratedWill(
				content,
			);

		if (
			!parsed
		) {
			throw new Error(
				"AI 返回内容不是合法的遗书 JSON 结构",
			);
		}

		return parsed;
	} finally {
		clearTimeout(
			timer,
		);
	}
}

export async function POST(
	request: Request,
) {
	let body: GenerateBody;

	try {
		body =
			(await request.json()) as GenerateBody;
	} catch {
		return NextResponse.json(
			{
				message:
					"请求体必须是合法 JSON",
			},
			{
				status: 400,
			},
		);
	}

	const relation =
		body.relation?.trim();
	const prompt =
		body.prompt?.trim();
	const relations =
		listRelations();

	if (
		!relation ||
		!hasRelation(
			relation,
		)
	) {
		return NextResponse.json(
			{
				message:
					"relation 缺失或不合法",
				relations,
			},
			{
				status: 400,
			},
		);
	}

	if (
		!prompt
	) {
		return NextResponse.json(
			{
				message:
					"prompt 不能为空",
			},
			{
				status: 400,
			},
		);
	}

	const baseWill =
		getWillByRelation(
			relation,
		);

	const promptTemplates =
		buildPromptTemplates(
			relation,
			prompt,
			baseWill,
		);

	try {
		const generated =
			await callAiModel(
				{
					relation,
					prompt,
					baseWill,
					promptTemplates,
				},
			);

		const suggestion =
			[
				`已按「${relation}」关系模拟逝者生前说话方式。`,
				`你的核心诉求：${prompt}`,
				"已返回结构化遗书结果，可直接预览或二次编辑。",
			];

		return NextResponse.json(
			{
				relation,
				prompt,
				relations,
				message:
					"AI 生成成功（使用 /admin 配置）。",
				suggestion,
				generated,
				promptTemplates,
			},
		);
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof
					Error
						? error.message
						: "AI 生成失败",
			},
			{
				status: 500,
			},
		);
	}
}
