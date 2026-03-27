import { NextResponse } from "next/server";
import {
	getWillByRelation,
	hasRelation,
	listRelations,
} from "@/lib/will-store";
import { getAiAdminSettings } from "@/lib/ai-settings-store";

type ChatMessage =
	{
		role:
			| "user"
			| "assistant";
		content: string;
	};

type ChatBody =
	{
		relation?: string;
		userName?: string;
		message?: string;
		history?: ChatMessage[];
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

type GeneratedWillShape =
	{
		title?: string;
		greeting?: string;
		body?: string[];
		closing?: string;
	};

const FIXED_TEMPERATURE = 0.7;
const FIXED_MAX_TOKENS = 800;
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

function normalizeAssistantReply(
	raw: string,
): string {
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
			) as GeneratedWillShape;

		if (
			typeof parsed.greeting ===
				"string" &&
			Array.isArray(
				parsed.body,
			)
		) {
			const lines: string[] =
				[
					parsed.greeting.trim(),
					...parsed.body.filter(
						(
							item,
						) =>
							typeof item ===
							"string",
					),
					typeof parsed.closing ===
					"string"
						? `—— ${parsed.closing.trim()}`
						: "",
				].filter(
					Boolean,
				);

			return lines.join(
				"\n",
			);
		}
	} catch {
		// ignore
	}

	return trimmed;
}

function sanitizeHistory(
	history: unknown,
): ChatMessage[] {
	if (
		!Array.isArray(
			history,
		)
	) {
		return [];
	}

	return history
		.filter(
			(
				item,
			): item is ChatMessage =>
				typeof item ===
					"object" &&
				item !==
					null &&
				(
					item as ChatMessage
				)
					.role !==
					undefined &&
				(
					item as ChatMessage
				)
					.content !==
					undefined,
		)
		.map(
			(
				item,
			): ChatMessage => ({
				role:
					item.role ===
					"assistant"
						? "assistant"
						: "user",
				content:
					typeof item.content ===
					"string"
						? item.content.trim()
						: "",
			}),
		)
		.filter(
			(
				item,
			) =>
				Boolean(
					item.content,
				),
		)
		.slice(
			-10,
		);
}

export async function POST(
	request: Request,
) {
	let body: ChatBody;

	try {
		body =
			(await request.json()) as ChatBody;
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
	const userName =
		body.userName?.trim();
	const message =
		body.message?.trim();
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
		!userName
	) {
		return NextResponse.json(
			{
				message:
					"userName 不能为空",
			},
			{
				status: 400,
			},
		);
	}

	if (
		!message
	) {
		return NextResponse.json(
			{
				message:
					"message 不能为空",
			},
			{
				status: 400,
			},
		);
	}

	const aiSettings =
		getAiAdminSettings();

	if (
		!aiSettings.apiKey.trim()
	) {
		return NextResponse.json(
			{
				message:
					"AI API Key 未配置，请先到 /admin 保存 AI 配置。",
			},
			{
				status: 500,
			},
		);
	}

	const baseWill =
		getWillByRelation(
			relation,
		);

	const history =
		sanitizeHistory(
			body.history,
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
			USER_PROMPT: `对话对象：${userName}`,
			BASE_WILL_JSON:
				JSON.stringify(
					baseWill,
					null,
					2,
				),
		};

	const basePersona =
		applyTemplate(
			aiSettings.systemTemplate,
			vars,
		);

	const systemContent =
		[
			"你是“逝者模拟对话助手”，只做聊天回复。",
			"严禁输出 JSON、代码块、键值结构、标题/落款格式。",
			"你不能生成遗书模板，不能返回 {title,greeting,body,closing} 这类结构。",
			"请只输出自然语言中文回复，像真人说话一样，长度 2-5 句。",
			`被模拟者姓名：${aiSettings.deceasedName}`,
			`关系：${relation}`,
			`说话风格关键词：${aiSettings.styleKeywords}`,
			"可参考以下背景信息，但最终输出必须是纯文本聊天：",
			basePersona,
			"",
			"【当前任务】",
			"现在你正在与亲友聊天，请根据对方输入进行安慰、回应和陪伴。",
		].join(
			"\n",
		);

	const userIntro =
		[
			`对方姓名：${userName}`,
			`关系：${relation}`,
			`对方刚刚说：${message}`,
		].join(
			"\n",
		);

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
							messages:
								[
									{
										role: "system",
										content:
											systemContent,
									},
									...history.map(
										(
											item,
										) => ({
											role: item.role,
											content:
												item.content,
										}),
									),
									{
										role: "user",
										content:
											userIntro,
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

			return NextResponse.json(
				{
					message: `AI 调用失败：HTTP ${response.status} - ${errText}`,
				},
				{
					status: 500,
				},
			);
		}

		const json =
			(await response.json()) as OpenAiChatResponse;

		const rawReply =
			json.choices?.[0]?.message?.content?.trim();

		if (
			!rawReply
		) {
			return NextResponse.json(
				{
					message:
						"AI 未返回有效回复",
				},
				{
					status: 500,
				},
			);
		}

		const reply =
			normalizeAssistantReply(
				rawReply,
			);

		if (
			!reply
		) {
			return NextResponse.json(
				{
					message:
						"AI 未返回有效回复",
				},
				{
					status: 500,
				},
			);
		}

		return NextResponse.json(
			{
				message:
					"对话成功",
				reply,
				relation,
				userName,
			},
		);
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof
					Error
						? error.message
						: "AI 对话失败",
			},
			{
				status: 500,
			},
		);
	} finally {
		clearTimeout(
			timer,
		);
	}
}
