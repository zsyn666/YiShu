import { getAiAdminSettings } from "@/lib/ai-settings-store";

type ChatMessage =
	{
		role:
			| "user"
			| "assistant";
		content: string;
	};

type TemplateChatBody =
	{
		message?: string;
		history?: ChatMessage[];
		finalize?: boolean;
		startInterview?: boolean;
	};

type OpenAiStreamChunk =
	{
		choices?: Array<{
			delta?: {
				content?: string;
			};
			finish_reason?:
				| string
				| null;
		}>;
	};

const FIXED_TEMPERATURE = 0.7;
const FIXED_MAX_TOKENS = 1200;
const FIXED_TIMEOUT_MS = 120000;

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
			-120,
		);
}

function getInterviewSystemPrompt(): string {
	return [
		"你是“逝者语气建模访谈助手”，仅在 /admin 使用。",
		"",
		"核心目标：",
		"1) 通过约 30 问（26~34 可浮动）建立“逝者人格与表达方式”模型，用于后续和访问者对话。",
		"2) 每次只问 1 个问题，必须等待用户回答后再问下一题。",
		"3) 问题分阶段推进：",
		"   - 前期（1~10）：身份关系、成长背景、价值观、说话习惯",
		"   - 中期（11~20）：关键事件、亲密关系、冲突与遗憾、情绪表达",
		"   - 后期（21~30）：死亡相关动机、临终心境、希望被记住的方式、对访问者说话边界",
		"",
		"问题风格要求：",
		"- 格式固定：问题N/30：xxx",
		"- 每次仅输出一个问题（startInterview 阶段只输出问题1/30）。",
		"- 追问要有倾向性，服务于“逝者对话语气模拟”。",
		"- 后期允许提出高敏问题，例如“你为什么选择结束生命”，但语气保持克制、尊重、非评判。",
		"- 每隔 5 题先用 1~2 句总结已知，再继续下一题。",
		"",
		"finalize 规则：",
		"- 收到 finalize 指令时，输出完整可用的 System Template 正文。",
		"- 只输出模板正文，不要解释，不要 JSON，不要 Markdown 代码块。",
		"- 模板必须覆盖：角色定位、语言习惯、情绪基调、生活轨迹使用方式、禁忌边界、应答策略。",
		"- 全程中文。",
	].join(
		"\n",
	);
}

function toErrorResponse(
	message: string,
	status = 500,
): Response {
	return Response.json(
		{
			message,
		},
		{
			status,
		},
	);
}

export async function POST(
	request: Request,
) {
	let body: TemplateChatBody;

	try {
		body =
			(await request.json()) as TemplateChatBody;
	} catch {
		return toErrorResponse(
			"请求体必须是合法 JSON",
			400,
		);
	}

	const finalize =
		Boolean(
			body.finalize,
		);
	const startInterview =
		Boolean(
			body.startInterview,
		);
	const message =
		body.message?.trim();

	if (
		!finalize &&
		!startInterview &&
		!message
	) {
		return toErrorResponse(
			"message 不能为空",
			400,
		);
	}

	const aiSettings =
		getAiAdminSettings();

	if (
		!aiSettings.apiKey.trim()
	) {
		return toErrorResponse(
			"AI API Key 未配置，请先到 /admin 保存 AI 配置。",
			500,
		);
	}

	if (
		!aiSettings.baseUrl.trim() ||
		!aiSettings.model.trim()
	) {
		return toErrorResponse(
			"AI Base URL 或模型名未配置，请先到 /admin 保存 AI 配置。",
			500,
		);
	}

	const history =
		sanitizeHistory(
			body.history,
		);

	const userInstruction =
		finalize
			? "请基于全部访谈内容，直接生成最终可用的 System Template 完整正文。只输出模板正文。"
			: startInterview
				? "请立刻开始访谈，只输出“问题1/30：...”这一句。"
				: message!;

	const controller =
		new AbortController();
	const timer =
		setTimeout(
			() =>
				controller.abort(),
			FIXED_TIMEOUT_MS,
		);

	try {
		const upstream =
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
							stream: true,
							messages:
								[
									{
										role: "system",
										content:
											getInterviewSystemPrompt(),
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
											userInstruction,
									},
								],
						},
					),
					signal:
						controller.signal,
				},
			);

		if (
			!upstream.ok
		) {
			const errText =
				await upstream.text();

			return toErrorResponse(
				`AI 调用失败：HTTP ${upstream.status} - ${errText}`,
				500,
			);
		}

		if (
			!upstream.body
		) {
			return toErrorResponse(
				"AI 未返回流式响应体",
				500,
			);
		}

		const reader =
			upstream.body.getReader();
		const decoder =
			new TextDecoder();
		const encoder =
			new TextEncoder();

		let sseBuffer =
			"";

		const stream =
			new ReadableStream<Uint8Array>(
				{
					start(
						controller,
					) {
						void (async () => {
							try {
								while (
									true
								) {
									const {
										done,
										value,
									} =
										await reader.read();

									if (
										done
									) {
										break;
									}

									const chunkText =
										decoder.decode(
											value,
											{
												stream: true,
											},
										);

									if (
										!chunkText
									) {
										continue;
									}

									sseBuffer +=
										chunkText;

									const lines =
										sseBuffer.split(
											"\n",
										);
									sseBuffer =
										lines.pop() ??
										"";

									for (const line of lines) {
										const trimmed =
											line.trim();

										if (
											!trimmed ||
											!trimmed.startsWith(
												"data:",
											)
										) {
											continue;
										}

										const payload =
											trimmed
												.slice(
													5,
												)
												.trim();

										if (
											payload ===
											"[DONE]"
										) {
											continue;
										}

										try {
											const parsed =
												JSON.parse(
													payload,
												) as OpenAiStreamChunk;

											const delta =
												parsed
													.choices?.[0]
													?.delta
													?.content;

											if (
												delta
											) {
												controller.enqueue(
													encoder.encode(
														delta,
													),
												);
											}
										} catch {
											// ignore invalid partial json line
										}
									}
								}

								controller.close();
							} catch (error) {
								if (
									error instanceof
										Error &&
									error.name ===
										"AbortError"
								) {
									controller.error(
										new Error(
											"AI 响应超时（120 秒），请重试或更换模型后再试。",
										),
									);
									return;
								}

								controller.error(
									error,
								);
							} finally {
								clearTimeout(
									timer,
								);
								reader.releaseLock();
							}
						})();
					},
					cancel() {
						controller.abort();
						clearTimeout(
							timer,
						);
					},
				},
			);

		return new Response(
			stream,
			{
				headers:
					{
						"Content-Type":
							"text/plain; charset=utf-8",
						"Cache-Control":
							"no-cache, no-transform",
						Connection:
							"keep-alive",
					},
			},
		);
	} catch (error) {
		clearTimeout(
			timer,
		);

		if (
			error instanceof
				Error &&
			error.name ===
				"AbortError"
		) {
			return toErrorResponse(
				"AI 响应超时（120 秒），请重试或更换模型后再试。",
				500,
			);
		}

		return toErrorResponse(
			error instanceof
				Error
				? error.message
				: "模板访谈失败",
			500,
		);
	}
}
