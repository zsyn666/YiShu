"use client";

import {
	useEffect,
	useRef,
	useState,
} from "react";

type WillContent =
	{
		title: string;
		greeting: string;
		body: string[];
		closing: string;
	};

type AdminGetResponse =
	{
		relations: string[];
		data: Record<
			string,
			WillContent
		>;
	};

type FormState =
	{
		title: string;
		greeting: string;
		bodyText: string;
		closing: string;
	};

type AiConfigState =
	{
		apiKey: string;
		baseUrl: string;
		model: string;
		deceasedName: string;
		deceasedGender: string;
		deceasedLifeDates: string;
		styleKeywords: string;
		systemTemplate: string;
	};

type AdminActionResponse =
	{
		message: string;
		relations?: string[];
		data?: Record<
			string,
			WillContent
		>;
		content?: WillContent;
		relation?: string;
	};

type AiConfigApiResponse =
	{
		message: string;
		data?: AiConfigState;
	};

type WillStyleState =
	{
		fontFile: string;
	};

type WillStyleApiResponse =
	{
		message: string;
		data?: WillStyleState;
		fonts?: string[];
	};

type TemplateInterviewMessage =
	{
		role:
			| "user"
			| "assistant";
		content: string;
	};

type StreamErrorResponse =
	{
		message?: string;
	};

function toFormState(
	content: WillContent,
): FormState {
	return {
		title:
			content.title,
		greeting:
			content.greeting,
		bodyText:
			content.body.join(
				"\n",
			),
		closing:
			content.closing,
	};
}

function getDefaultForm(): FormState {
	return {
		title:
			"",
		greeting:
			"",
		bodyText:
			"",
		closing:
			"",
	};
}

function getDefaultAiConfig(): AiConfigState {
	return {
		apiKey:
			"",
		baseUrl:
			"https://api.openai.com/v1",
		model:
			"gpt-4o-mini",
		deceasedName:
			"{{DECEASED_NAME}}",
		deceasedGender:
			"",
		deceasedLifeDates:
			"",
		styleKeywords:
			"温柔、克制、真诚",
		systemTemplate:
			"",
	};
}

function getDefaultWillStyle(): WillStyleState {
	return {
		fontFile:
			"",
	};
}

function normalizeDateForInput(
	value: string,
): string {
	const trimmed =
		value.trim();

	if (
		!trimmed
	) {
		return "";
	}

	return trimmed
		.replaceAll(
			".",
			"-",
		)
		.replaceAll(
			"/",
			"-",
		);
}

function splitLifeDates(
	value: string,
): [
	string,
	string,
] {
	const delimiter =
		" - ";
	if (
		!value.includes(
			delimiter,
		)
	) {
		return [
			normalizeDateForInput(
				value,
			),
			"",
		];
	}

	const [
		birthRaw,
		deathRaw,
	] =
		value.split(
			delimiter,
			2,
		);

	return [
		normalizeDateForInput(
			birthRaw ??
				"",
		),
		normalizeDateForInput(
			deathRaw ??
				"",
		),
	];
}

type DateParts =
	{
		year: string;
		month: string;
		day: string;
	};

function getDateParts(
	value: string,
): DateParts {
	const normalized =
		normalizeDateForInput(
			value,
		);

	if (
		!normalized
	) {
		return {
			year: "",
			month:
				"",
			day: "",
		};
	}

	const [
		year = "",
		month = "",
		day = "",
	] =
		normalized.split(
			"-",
			3,
		);

	return {
		year,
		month,
		day,
	};
}

function toDateString(
	parts: DateParts,
): string {
	if (
		!parts.year ||
		!parts.month ||
		!parts.day
	) {
		return "";
	}

	return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function AdminPage() {
	const [
		relations,
		setRelations,
	] =
		useState<
			string[]
		>(
			[],
		);

	const [
		relation,
		setRelation,
	] =
		useState(
			"",
		);

	const [
		allData,
		setAllData,
	] =
		useState<Record<
			string,
			WillContent
		> | null>(
			null,
		);

	const [
		form,
		setForm,
	] =
		useState<FormState>(
			getDefaultForm(),
		);

	const [
		newRelation,
		setNewRelation,
	] =
		useState(
			"",
		);

	const [
		aiConfig,
		setAiConfig,
	] =
		useState<AiConfigState>(
			getDefaultAiConfig(),
		);
	const [
		savingAi,
		setSavingAi,
	] =
		useState(
			false,
		);

	const [
		willStyle,
		setWillStyle,
	] =
		useState<WillStyleState>(
			getDefaultWillStyle(),
		);
	const [
		fontOptions,
		setFontOptions,
	] =
		useState<
			string[]
		>(
			[],
		);
	const [
		savingWillStyle,
		setSavingWillStyle,
	] =
		useState(
			false,
		);

	const [
		templateChatInput,
		setTemplateChatInput,
	] =
		useState(
			"",
		);
	const [
		templateChatHistory,
		setTemplateChatHistory,
	] =
		useState<
			TemplateInterviewMessage[]
		>(
			[],
		);
	const [
		templateChatLoading,
		setTemplateChatLoading,
	] =
		useState(
			false,
		);
	const [
		templateFinalizing,
		setTemplateFinalizing,
	] =
		useState(
			false,
		);
	const [
		interviewStarted,
		setInterviewStarted,
	] =
		useState(
			false,
		);
	const [
		interviewPaused,
		setInterviewPaused,
	] =
		useState(
			false,
		);
	const [
		streamingAssistantText,
		setStreamingAssistantText,
	] =
		useState(
			"",
		);

	const chatScrollRef =
		useRef<HTMLDivElement | null>(
			null,
		);
	const streamAbortRef =
		useRef<AbortController | null>(
			null,
		);

	const [
		loading,
		setLoading,
	] =
		useState(
			false,
		);
	const [
		saving,
		setSaving,
	] =
		useState(
			false,
		);
	const [
		acting,
		setActing,
	] =
		useState(
			false,
		);
	const [
		message,
		setMessage,
	] =
		useState(
			"",
		);
	const [
		error,
		setError,
	] =
		useState(
			"",
		);

	const [
		birthDate,
		deathDate,
	] =
		splitLifeDates(
			aiConfig.deceasedLifeDates,
		);

	const [
		birthDateDraft,
		setBirthDateDraft,
	] =
		useState<DateParts>(
			getDateParts(
				birthDate,
			),
		);
	const [
		deathDateDraft,
		setDeathDateDraft,
	] =
		useState<DateParts>(
			getDateParts(
				deathDate,
			),
		);

	useEffect(() => {
		setBirthDateDraft(
			getDateParts(
				birthDate,
			),
		);
		setDeathDateDraft(
			getDateParts(
				deathDate,
			),
		);
	}, [
		birthDate,
		deathDate,
	]);

	const currentYear =
		new Date().getFullYear();
	const yearOptions =
		Array.from(
			{
				length:
					currentYear -
					1899,
			},
			(
				_,
				index,
			) =>
				String(
					currentYear -
						index,
				),
		);
	const monthOptions =
		Array.from(
			{
				length: 12,
			},
			(
				_,
				index,
			) =>
				String(
					index +
						1,
				).padStart(
					2,
					"0",
				),
		);
	const dayOptions =
		Array.from(
			{
				length: 31,
			},
			(
				_,
				index,
			) =>
				String(
					index +
						1,
				).padStart(
					2,
					"0",
				),
		);

	useEffect(() => {
		const loadData =
			async () => {
				setLoading(
					true,
				);
				setError(
					"",
				);
				setMessage(
					"",
				);

				try {
					const [
						willsRes,
						aiRes,
						willStyleRes,
					] =
						await Promise.all(
							[
								fetch(
									"/api/admin/wills",
								),
								fetch(
									"/api/admin/ai-config",
								),
								fetch(
									"/api/admin/will-style",
								),
							],
						);

					const willsData =
						(await willsRes.json()) as
							| AdminGetResponse
							| {
									message: string;
							  };

					if (
						!willsRes.ok
					) {
						throw new Error(
							"message" in
								willsData
								? willsData.message
								: "加载遗书配置失败",
						);
					}

					const willPayload =
						willsData as AdminGetResponse;

					setRelations(
						willPayload.relations,
					);
					setAllData(
						willPayload.data,
					);

					const firstRelation =
						willPayload
							.relations[0] ??
						"";
					setRelation(
						firstRelation,
					);

					if (
						firstRelation &&
						willPayload
							.data[
							firstRelation
						]
					) {
						setForm(
							toFormState(
								willPayload
									.data[
									firstRelation
								],
							),
						);
					}

					const aiData =
						(await aiRes.json()) as AiConfigApiResponse;

					if (
						!aiRes.ok
					) {
						throw new Error(
							aiData.message ||
								"加载 AI 配置失败",
						);
					}

					if (
						aiData.data
					) {
						setAiConfig(
							aiData.data,
						);
					}

					const willStyleData =
						(await willStyleRes.json()) as WillStyleApiResponse;

					if (
						!willStyleRes.ok
					) {
						throw new Error(
							willStyleData.message ||
								"加载遗书样式配置失败",
						);
					}

					if (
						willStyleData.data
					) {
						setWillStyle(
							willStyleData.data,
						);
					}

					setFontOptions(
						willStyleData.fonts ??
							[],
					);
				} catch (e) {
					setError(
						e instanceof
							Error
							? e.message
							: "未知错误",
					);
				} finally {
					setLoading(
						false,
					);
				}
			};

		void loadData();
	}, []);

	useEffect(() => {
		if (
			!allData ||
			!relation
		) {
			return;
		}

		const content =
			allData[
				relation
			];
		if (
			content
		) {
			setForm(
				toFormState(
					content,
				),
			);
		}

		setMessage(
			"",
		);
		setError(
			"",
		);
	}, [
		relation,
		allData,
	]);

	const updateField =
		(
			key: keyof FormState,
			value: string,
		) => {
			setForm(
				(
					prev,
				) => ({
					...prev,
					[key]:
						value,
				}),
			);
		};

	const updateAiField =
		(
			key: keyof AiConfigState,
			value: string,
		) => {
			setAiConfig(
				(
					prev,
				) => ({
					...prev,
					[key]:
						value,
				}),
			);
		};

	const persistLifeDates =
		(
			nextBirth: DateParts,
			nextDeath: DateParts,
		) => {
			const nextBirthValue =
				toDateString(
					nextBirth,
				);
			const nextDeathValue =
				toDateString(
					nextDeath,
				);
			const nextValue =
				[
					nextBirthValue,
					nextDeathValue,
				]
					.filter(
						Boolean,
					)
					.join(
						" - ",
					);

			updateAiField(
				"deceasedLifeDates",
				nextValue,
			);
		};

	const handleBirthDatePartChange =
		(
			key: keyof DateParts,
			value: string,
		) => {
			const nextBirth =
				{
					...birthDateDraft,
					[key]:
						value,
				};

			setBirthDateDraft(
				nextBirth,
			);
			persistLifeDates(
				nextBirth,
				deathDateDraft,
			);
		};

	const handleDeathDatePartChange =
		(
			key: keyof DateParts,
			value: string,
		) => {
			const nextDeath =
				{
					...deathDateDraft,
					[key]:
						value,
				};

			setDeathDateDraft(
				nextDeath,
			);
			persistLifeDates(
				birthDateDraft,
				nextDeath,
			);
		};

	const applyApiState =
		(
			data: AdminActionResponse,
		) => {
			if (
				data.relations
			) {
				setRelations(
					data.relations,
				);

				if (
					!data.relations.includes(
						relation,
					)
				) {
					setRelation(
						data
							.relations[0] ??
							"",
					);
				}
			}

			if (
				data.data
			) {
				setAllData(
					data.data,
				);
			}
		};

	const handleSave =
		async () => {
			if (
				!relation
			) {
				setError(
					"请先选择关系",
				);
				return;
			}

			setSaving(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);

			const lines =
				form.bodyText
					.split(
						"\n",
					)
					.map(
						(
							line,
						) =>
							line.trim(),
					)
					.filter(
						Boolean,
					);

			try {
				const res =
					await fetch(
						"/api/admin/wills",
						{
							method:
								"PUT",
							headers:
								{
									"Content-Type":
										"application/json",
								},
							body: JSON.stringify(
								{
									relation,
									content:
										{
											title:
												form.title,
											greeting:
												form.greeting,
											body: lines,
											closing:
												form.closing,
										},
								},
							),
						},
					);

				const data =
					(await res.json()) as AdminActionResponse;

				if (
					!res.ok
				) {
					throw new Error(
						data.message ||
							"保存失败",
					);
				}

				applyApiState(
					data,
				);

				if (
					data.content
				) {
					setAllData(
						(
							prev,
						) =>
							prev
								? {
										...prev,
										[relation]:
											data.content!,
									}
								: prev,
					);

					setForm(
						toFormState(
							data.content,
						),
					);
				}

				setMessage(
					`${relation} 内容已保存`,
				);
			} catch (e) {
				setError(
					e instanceof
						Error
						? e.message
						: "未知错误",
				);
			} finally {
				setSaving(
					false,
				);
			}
		};

	const handleSaveAiConfig =
		async () => {
			setSavingAi(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);

			try {
				const res =
					await fetch(
						"/api/admin/ai-config",
						{
							method:
								"PUT",
							headers:
								{
									"Content-Type":
										"application/json",
								},
							body: JSON.stringify(
								aiConfig,
							),
						},
					);

				const data =
					(await res.json()) as AiConfigApiResponse;

				if (
					!res.ok
				) {
					throw new Error(
						data.message ||
							"AI 配置保存失败",
					);
				}

				if (
					data.data
				) {
					setAiConfig(
						data.data,
					);
				}

				setMessage(
					"AI 配置已保存",
				);
			} catch (e) {
				setError(
					e instanceof
						Error
						? e.message
						: "未知错误",
				);
			} finally {
				setSavingAi(
					false,
				);
			}
		};

	const handleSaveWillStyle =
		async () => {
			setSavingWillStyle(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);

			try {
				const res =
					await fetch(
						"/api/admin/will-style",
						{
							method:
								"PUT",
							headers:
								{
									"Content-Type":
										"application/json",
								},
							body: JSON.stringify(
								willStyle,
							),
						},
					);

				const data =
					(await res.json()) as WillStyleApiResponse;

				if (
					!res.ok
				) {
					throw new Error(
						data.message ||
							"遗书样式保存失败",
					);
				}

				if (
					data.data
				) {
					setWillStyle(
						data.data,
					);
				}

				setFontOptions(
					data.fonts ??
						[],
				);

				setMessage(
					"遗书样式配置已保存",
				);
			} catch (e) {
				setError(
					e instanceof
						Error
						? e.message
						: "未知错误",
				);
			} finally {
				setSavingWillStyle(
					false,
				);
			}
		};

	useEffect(() => {
		if (
			!chatScrollRef.current
		) {
			return;
		}

		chatScrollRef.current.scrollTo(
			{
				top: chatScrollRef
					.current
					.scrollHeight,
				behavior:
					"smooth",
			},
		);
	}, [
		templateChatHistory,
		streamingAssistantText,
	]);

	const parseQuestionIndex =
		(
			text: string,
		) => {
			const match =
				text.match(
					/问题\s*(\d+)\s*\/\s*30/i,
				);

			if (
				!match
			) {
				return null;
			}

			const value =
				Number.parseInt(
					match[1],
					10,
				);

			return Number.isFinite(
				value,
			)
				? value
				: null;
		};

	const streamTemplateReply =
		async (
			payload: Record<
				string,
				unknown
			>,
		): Promise<string> => {
			const controller =
				new AbortController();
			streamAbortRef.current =
				controller;

			const res =
				await fetch(
					"/api/admin/ai-config/template-chat",
					{
						method:
							"POST",
						headers:
							{
								"Content-Type":
									"application/json",
							},
						body: JSON.stringify(
							payload,
						),
						signal:
							controller.signal,
					},
				);

			if (
				!res.ok
			) {
				const errJson =
					(await res
						.json()
						.catch(
							() =>
								({}) as StreamErrorResponse,
						)) as StreamErrorResponse;

				throw new Error(
					errJson.message ||
						"访谈请求失败",
				);
			}

			if (
				!res.body
			) {
				throw new Error(
					"响应体为空",
				);
			}

			const reader =
				res.body.getReader();
			const decoder =
				new TextDecoder();
			let fullText =
				"";

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

				const chunk =
					decoder.decode(
						value,
						{
							stream: true,
						},
					);

				if (
					chunk
				) {
					fullText +=
						chunk;
					setStreamingAssistantText(
						(
							prev,
						) =>
							prev +
							chunk,
					);
				}
			}

			return fullText.trim();
		};

	const handleTemplateFinalize =
		async (
			historyOverride?: TemplateInterviewMessage[],
		) => {
			const historyForFinalize =
				historyOverride ??
				templateChatHistory;

			if (
				historyForFinalize.length ===
				0
			) {
				return;
			}

			setTemplateFinalizing(
				true,
			);
			setTemplateChatLoading(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);
			setStreamingAssistantText(
				"",
			);

			try {
				const finalText =
					await streamTemplateReply(
						{
							finalize: true,
							history:
								historyForFinalize,
						},
					);

				if (
					!finalText
				) {
					throw new Error(
						"AI 未返回有效模板内容",
					);
				}

				setTemplateChatHistory(
					(
						prev,
					) => [
						...prev,
						{
							role: "assistant",
							content:
								finalText,
						},
					],
				);

				setAiConfig(
					(
						prev,
					) => ({
						...prev,
						systemTemplate:
							finalText,
					}),
				);

				setMessage(
					"30问已完成，系统已自动生成并回填 System Template，请点击“保存 AI 配置”。",
				);
			} catch (e) {
				if (
					e instanceof
						DOMException &&
					e.name ===
						"AbortError"
				) {
					setMessage(
						"已暂停当前请求",
					);
				} else {
					setError(
						e instanceof
							Error
							? e.message
							: "未知错误",
					);
				}
			} finally {
				streamAbortRef.current =
					null;
				setTemplateChatLoading(
					false,
				);
				setTemplateFinalizing(
					false,
				);
				setStreamingAssistantText(
					"",
				);
			}
		};

	const handleStartInterview =
		async () => {
			setTemplateChatLoading(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);
			setStreamingAssistantText(
				"",
			);

			try {
				const firstQuestion =
					await streamTemplateReply(
						{
							startInterview: true,
							history:
								[],
						},
					);

				if (
					!firstQuestion
				) {
					throw new Error(
						"AI 未返回首个问题",
					);
				}

				setTemplateChatHistory(
					[
						{
							role: "assistant",
							content:
								firstQuestion,
						},
					],
				);
				setInterviewStarted(
					true,
				);
				setInterviewPaused(
					false,
				);
				setTemplateChatInput(
					"",
				);
			} catch (e) {
				if (
					e instanceof
						DOMException &&
					e.name ===
						"AbortError"
				) {
					setMessage(
						"已暂停当前请求",
					);
				} else {
					setError(
						e instanceof
							Error
							? e.message
							: "未知错误",
					);
				}
			} finally {
				streamAbortRef.current =
					null;
				setTemplateChatLoading(
					false,
				);
				setStreamingAssistantText(
					"",
				);
			}
		};

	const handleTemplateChatSend =
		async () => {
			if (
				!interviewStarted
			) {
				setError(
					"请先点击“开始30问访谈（AI先提问）”",
				);
				return;
			}

			if (
				interviewPaused
			) {
				setError(
					"访谈已暂停，请先继续访谈",
				);
				return;
			}

			const userInput =
				templateChatInput.trim();

			if (
				!userInput
			) {
				setError(
					"请输入访谈内容",
				);
				return;
			}

			const historyBeforeSend =
				templateChatHistory;
			const userMessage: TemplateInterviewMessage =
				{
					role: "user",
					content:
						userInput,
				};

			setTemplateChatHistory(
				[
					...historyBeforeSend,
					userMessage,
				],
			);
			setTemplateChatInput(
				"",
			);
			setTemplateChatLoading(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);
			setStreamingAssistantText(
				"",
			);

			try {
				const replyText =
					await streamTemplateReply(
						{
							message:
								userInput,
							history:
								historyBeforeSend,
						},
					);

				if (
					!replyText
				) {
					throw new Error(
						"AI 未返回有效访谈内容",
					);
				}

				const updatedHistory =
					[
						...historyBeforeSend,
						userMessage,
						{
							role: "assistant",
							content:
								replyText,
						},
					] as TemplateInterviewMessage[];

				setTemplateChatHistory(
					updatedHistory,
				);

				const questionIndex =
					parseQuestionIndex(
						replyText,
					);

				if (
					questionIndex !==
						null &&
					questionIndex >=
						30
				) {
					await handleTemplateFinalize(
						updatedHistory,
					);
				}
			} catch (e) {
				if (
					e instanceof
						DOMException &&
					e.name ===
						"AbortError"
				) {
					setMessage(
						"已暂停当前请求",
					);
				} else {
					setError(
						e instanceof
							Error
							? e.message
							: "未知错误",
					);
				}
			} finally {
				streamAbortRef.current =
					null;
				setTemplateChatLoading(
					false,
				);
				setStreamingAssistantText(
					"",
				);
			}
		};

	const handleTogglePause =
		() => {
			if (
				templateChatLoading &&
				streamAbortRef.current
			) {
				streamAbortRef.current.abort();
			}

			setInterviewPaused(
				(
					prev,
				) =>
					!prev,
			);
		};

	const handleRestartInterview =
		() => {
			if (
				streamAbortRef.current
			) {
				streamAbortRef.current.abort();
			}

			setTemplateChatHistory(
				[],
			);
			setTemplateChatInput(
				"",
			);
			setInterviewStarted(
				false,
			);
			setInterviewPaused(
				false,
			);
			setTemplateChatLoading(
				false,
			);
			setTemplateFinalizing(
				false,
			);
			setStreamingAssistantText(
				"",
			);
			setMessage(
				"访谈已重置，可重新开始 30 问。",
			);
		};

	const handleCreateRelation =
		async () => {
			setActing(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);

			try {
				const res =
					await fetch(
						"/api/admin/wills",
						{
							method:
								"POST",
							headers:
								{
									"Content-Type":
										"application/json",
								},
							body: JSON.stringify(
								{
									relation:
										newRelation,
								},
							),
						},
					);

				const data =
					(await res.json()) as AdminActionResponse;

				if (
					!res.ok
				) {
					throw new Error(
						data.message ||
							"新增失败",
					);
				}

				applyApiState(
					data,
				);

				if (
					typeof data.relation ===
					"string"
				) {
					setRelation(
						data.relation,
					);
				}

				setNewRelation(
					"",
				);
				setMessage(
					data.message ||
						"新增关系成功",
				);
			} catch (e) {
				setError(
					e instanceof
						Error
						? e.message
						: "未知错误",
				);
			} finally {
				setActing(
					false,
				);
			}
		};

	const handleDeleteRelation =
		async () => {
			if (
				!relation
			) {
				setError(
					"请先选择关系",
				);
				return;
			}

			if (
				!window.confirm(
					`确认删除关系「${relation}」吗？该关系对应内容会一起删除。`,
				)
			) {
				return;
			}

			setActing(
				true,
			);
			setError(
				"",
			);
			setMessage(
				"",
			);

			try {
				const res =
					await fetch(
						"/api/admin/wills",
						{
							method:
								"DELETE",
							headers:
								{
									"Content-Type":
										"application/json",
								},
							body: JSON.stringify(
								{
									relation,
								},
							),
						},
					);

				const data =
					(await res.json()) as AdminActionResponse;

				if (
					!res.ok
				) {
					throw new Error(
						data.message ||
							"删除失败",
					);
				}

				applyApiState(
					data,
				);
				setMessage(
					data.message ||
						"删除成功",
				);
			} catch (e) {
				setError(
					e instanceof
						Error
						? e.message
						: "未知错误",
				);
			} finally {
				setActing(
					false,
				);
			}
		};

	return (
		<div className="min-h-screen bg-zinc-100 py-10 px-4 text-zinc-900">
			<main className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
				<header className="space-y-2">
					<h1 className="text-2xl font-bold sm:text-3xl">
						内容管理
					</h1>
					<p className="text-sm text-zinc-600 sm:text-base">
						可新增/删除关系，编辑遗书内容，并直接配置
						AI
						接口与提示词。
					</p>
				</header>

				{loading && (
					<p className="mt-6 text-sm text-zinc-500">
						正在加载...
					</p>
				)}

				{!loading && (
					<div className="mt-6 space-y-6">
						<section className="space-y-3 rounded-xl border border-zinc-200 p-4">
							<h2 className="text-base font-semibold">
								关系管理
							</h2>

							<div className="space-y-2">
								<label
									htmlFor="newRelation"
									className="text-sm font-medium text-zinc-700">
									新增关系名称
								</label>
								<input
									id="newRelation"
									value={
										newRelation
									}
									onChange={(
										e,
									) =>
										setNewRelation(
											e
												.target
												.value,
										)
									}
									placeholder="如：兄弟姐妹"
									className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<div className="flex gap-3">
								<button
									type="button"
									onClick={
										handleCreateRelation
									}
									disabled={
										acting
									}
									className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
									{acting
										? "处理中..."
										: "新增关系"}
								</button>

								<button
									type="button"
									onClick={
										handleDeleteRelation
									}
									disabled={
										acting ||
										!relation
									}
									className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300">
									删除当前关系
								</button>
							</div>
						</section>

						<section className="space-y-3 rounded-xl border border-zinc-200 p-4">
							<h2 className="text-base font-semibold">
								当前关系编辑
							</h2>

							<div className="space-y-2">
								<label
									htmlFor="relation"
									className="text-sm font-medium text-zinc-700">
									编辑关系
								</label>
								<select
									id="relation"
									value={
										relation
									}
									onChange={(
										e,
									) =>
										setRelation(
											e
												.target
												.value,
										)
									}
									className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500">
									{relations.map(
										(
											item,
										) => (
											<option
												key={
													item
												}
												value={
													item
												}>
												{
													item
												}
											</option>
										),
									)}
								</select>
							</div>
						</section>

						<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
							<h2 className="text-base font-semibold">
								遗书内容编辑（
								{relation ||
									"未选择关系"}

								）
							</h2>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									标题
								</label>
								<input
									value={
										form.title
									}
									onChange={(
										e,
									) =>
										updateField(
											"title",
											e
												.target
												.value,
										)
									}
									className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									称呼
								</label>
								<input
									value={
										form.greeting
									}
									onChange={(
										e,
									) =>
										updateField(
											"greeting",
											e
												.target
												.value,
										)
									}
									className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									正文（每行一段）
								</label>
								<textarea
									value={
										form.bodyText
									}
									onChange={(
										e,
									) =>
										updateField(
											"bodyText",
											e
												.target
												.value,
										)
									}
									className="min-h-40 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									落款
								</label>
								<input
									value={
										form.closing
									}
									onChange={(
										e,
									) =>
										updateField(
											"closing",
											e
												.target
												.value,
										)
									}
									className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<button
								type="button"
								onClick={
									handleSave
								}
								disabled={
									saving ||
									!relation
								}
								className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
								{saving
									? "保存中..."
									: "保存内容"}
							</button>
						</section>

						<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
							<h2 className="text-base font-semibold">
								遗书显示样式
							</h2>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									遗书字体（读取
									public/fonts）
								</label>
								<select
									value={
										willStyle.fontFile
									}
									onChange={(
										e,
									) =>
										setWillStyle(
											(
												prev,
											) => ({
												...prev,
												fontFile:
													e
														.target
														.value,
											}),
										)
									}
									className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500">
									<option value="">
										默认字体（系统衬线）
									</option>
									{fontOptions.map(
										(
											fontName,
										) => (
											<option
												key={
													fontName
												}
												value={
													fontName
												}>
												{
													fontName
												}
											</option>
										),
									)}
								</select>
								<p className="text-xs text-zinc-500">
									当前仅展示
									ttf/otf/woff/woff2
									文件。
								</p>
							</div>

							<button
								type="button"
								onClick={
									handleSaveWillStyle
								}
								disabled={
									savingWillStyle
								}
								className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
								{savingWillStyle
									? "保存中..."
									: "保存遗书样式"}
							</button>
						</section>

						<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
							<h2 className="text-base font-semibold">
								AI
								配置（简化）
							</h2>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									API
									Key
								</label>
								<input
									type="password"
									value={
										aiConfig.apiKey
									}
									onChange={(
										e,
									) =>
										updateAiField(
											"apiKey",
											e
												.target
												.value,
										)
									}
									placeholder="填写模型服务 API Key"
									className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium text-zinc-700">
										Base
										URL
									</label>
									<input
										value={
											aiConfig.baseUrl
										}
										onChange={(
											e,
										) =>
											updateAiField(
												"baseUrl",
												e
													.target
													.value,
											)
										}
										className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-zinc-700">
										模型名
									</label>
									<input
										value={
											aiConfig.model
										}
										onChange={(
											e,
										) =>
											updateAiField(
												"model",
												e
													.target
													.value,
											)
										}
										className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium text-zinc-700">
										逝者姓名（用于提示词变量）
									</label>
									<input
										value={
											aiConfig.deceasedName
										}
										onChange={(
											e,
										) =>
											updateAiField(
												"deceasedName",
												e
													.target
													.value,
											)
										}
										className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-zinc-700">
										逝者性别
									</label>
									<input
										value={
											aiConfig.deceasedGender
										}
										onChange={(
											e,
										) =>
											updateAiField(
												"deceasedGender",
												e
													.target
													.value,
											)
										}
										placeholder="如：男 / 女"
										className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>

								<div className="space-y-3 sm:col-span-2">
									<label className="text-sm font-medium text-zinc-700">
										生卒日期（选择）
									</label>

									<div className="grid gap-3 sm:grid-cols-2">
										<div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
											<p className="mb-2 text-xs font-medium text-zinc-600">
												出生日期
											</p>
											<div className="grid grid-cols-3 gap-2">
												<select
													value={
														birthDateDraft.year
													}
													onChange={(
														e,
													) =>
														handleBirthDatePartChange(
															"year",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														年
													</option>
													{yearOptions.map(
														(
															year,
														) => (
															<option
																key={`birth-year-${year}`}
																value={
																	year
																}>
																{
																	year
																}
															</option>
														),
													)}
												</select>

												<select
													value={
														birthDateDraft.month
													}
													onChange={(
														e,
													) =>
														handleBirthDatePartChange(
															"month",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														月
													</option>
													{monthOptions.map(
														(
															month,
														) => (
															<option
																key={`birth-month-${month}`}
																value={
																	month
																}>
																{
																	month
																}
															</option>
														),
													)}
												</select>

												<select
													value={
														birthDateDraft.day
													}
													onChange={(
														e,
													) =>
														handleBirthDatePartChange(
															"day",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														日
													</option>
													{dayOptions.map(
														(
															day,
														) => (
															<option
																key={`birth-day-${day}`}
																value={
																	day
																}>
																{
																	day
																}
															</option>
														),
													)}
												</select>
											</div>
										</div>

										<div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
											<p className="mb-2 text-xs font-medium text-zinc-600">
												离世日期
											</p>
											<div className="grid grid-cols-3 gap-2">
												<select
													value={
														deathDateDraft.year
													}
													onChange={(
														e,
													) =>
														handleDeathDatePartChange(
															"year",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														年
													</option>
													{yearOptions.map(
														(
															year,
														) => (
															<option
																key={`death-year-${year}`}
																value={
																	year
																}>
																{
																	year
																}
															</option>
														),
													)}
												</select>

												<select
													value={
														deathDateDraft.month
													}
													onChange={(
														e,
													) =>
														handleDeathDatePartChange(
															"month",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														月
													</option>
													{monthOptions.map(
														(
															month,
														) => (
															<option
																key={`death-month-${month}`}
																value={
																	month
																}>
																{
																	month
																}
															</option>
														),
													)}
												</select>

												<select
													value={
														deathDateDraft.day
													}
													onChange={(
														e,
													) =>
														handleDeathDatePartChange(
															"day",
															e
																.target
																.value,
														)
													}
													className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-zinc-500">
													<option value="">
														日
													</option>
													{dayOptions.map(
														(
															day,
														) => (
															<option
																key={`death-day-${day}`}
																value={
																	day
																}>
																{
																	day
																}
															</option>
														),
													)}
												</select>
											</div>
										</div>
									</div>

									<p className="text-xs text-zinc-500">
										下拉选择年月日后会自动保存为统一格式。
									</p>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-zinc-700">
										语气关键词
									</label>
									<input
										value={
											aiConfig.styleKeywords
										}
										onChange={(
											e,
										) =>
											updateAiField(
												"styleKeywords",
												e
													.target
													.value,
											)
										}
										className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>
							</div>

							<div className="space-y-3 rounded-lg border border-zinc-200 p-3">
								<h3 className="text-sm font-semibold text-zinc-800">
									通过对话生成
									System
									Template（推荐）
								</h3>
								<p className="text-xs text-zinc-600">
									在此与
									AI
									访谈，AI
									会先提问了解性格、语言习惯、生活轨迹，再生成完整模板并自动回填到下方
									System
									Template
									文本框。
								</p>

								<div
									ref={
										chatScrollRef
									}
									className="max-h-56 space-y-2 overflow-y-auto rounded-lg bg-zinc-50 p-3">
									{templateChatHistory.length ===
									0 ? (
										<p className="text-xs text-zinc-500">
											还没有访谈记录。先输入一句你的目标，例如：我想做一个更温柔克制、贴近真实人生经历的系统提示词。
										</p>
									) : (
										templateChatHistory.map(
											(
												item,
												index,
											) => (
												<div
													key={`${item.role}-${index}`}
													className={`rounded-md px-3 py-2 text-sm ${
														item.role ===
														"user"
															? "bg-zinc-900 text-white"
															: "bg-white text-zinc-800 border border-zinc-200"
													}`}>
													<p className="mb-1 text-[11px] opacity-70">
														{item.role ===
														"user"
															? "你"
															: "AI"}
													</p>
													<p className="whitespace-pre-wrap">
														{
															item.content
														}
													</p>
												</div>
											),
										)
									)}

									{streamingAssistantText && (
										<div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
											<p className="mb-1 text-[11px] opacity-70">
												AI（输入中）
											</p>
											<p className="whitespace-pre-wrap">
												{
													streamingAssistantText
												}
											</p>
										</div>
									)}
								</div>

								<div className="space-y-2">
									<textarea
										value={
											templateChatInput
										}
										onChange={(
											e,
										) =>
											setTemplateChatInput(
												e
													.target
													.value,
											)
										}
										onKeyDown={(
											e,
										) => {
											if (
												e.key ===
													"Enter" &&
												!e.shiftKey
											) {
												e.preventDefault();
												if (
													!templateChatLoading &&
													!templateFinalizing
												) {
													void handleTemplateChatSend();
												}
											}
										}}
										placeholder="回答 AI 当前问题（Enter 发送，Shift+Enter 换行）..."
										className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>

									<div className="flex flex-wrap gap-2">
										{!interviewStarted ? (
											<button
												type="button"
												onClick={
													handleStartInterview
												}
												disabled={
													templateChatLoading ||
													templateFinalizing
												}
												className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300">
												{templateChatLoading
													? "启动中..."
													: "开始30问访谈（AI先提问）"}
											</button>
										) : (
											<button
												type="button"
												onClick={
													handleTogglePause
												}
												className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
												disabled={
													templateFinalizing
												}>
												{interviewPaused
													? "继续访谈"
													: "暂停访谈"}
											</button>
										)}

										<button
											type="button"
											onClick={
												handleTemplateChatSend
											}
											disabled={
												templateChatLoading ||
												templateFinalizing ||
												!interviewStarted ||
												interviewPaused
											}
											className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
											{templateChatLoading
												? "AI 生成中..."
												: "发送回答（Enter）"}
										</button>

										<button
											type="button"
											onClick={
												handleRestartInterview
											}
											disabled={
												templateFinalizing
											}
											className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400">
											重新开始
										</button>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-zinc-700">
									System
									Template
								</label>
								<textarea
									value={
										aiConfig.systemTemplate
									}
									onChange={(
										e,
									) =>
										updateAiField(
											"systemTemplate",
											e
												.target
												.value,
										)
									}
									className="min-h-36 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
								/>
							</div>

							<button
								type="button"
								onClick={
									handleSaveAiConfig
								}
								disabled={
									savingAi
								}
								className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
								{savingAi
									? "保存中..."
									: "保存 AI 配置"}
							</button>
						</section>

						{message && (
							<p className="text-sm text-emerald-600">
								{
									message
								}
							</p>
						)}
						{error && (
							<p className="text-sm text-red-600">
								{
									error
								}
							</p>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
