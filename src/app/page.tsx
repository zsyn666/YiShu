"use client";

import {
	useEffect,
	useMemo,
	useState,
} from "react";

type WillContent =
	{
		title: string;
		greeting: string;
		body: string[];
		closing: string;
	};

type WillApiResponse =
	{
		relation: string;
		relations: string[];
		content: WillContent;
		fontFile: string;
		deceasedName: string;
	};

type ApiErrorResponse =
	{
		message: string;
		relations?: string[];
	};

type ChatMessage =
	{
		role:
			| "user"
			| "assistant";
		content: string;
	};

type ChatApiResponse =
	{
		message: string;
		reply: string;
		relation: string;
		userName: string;
	};

export default function Home() {
	const [
		step,
		setStep,
	] =
		useState<
			| 1
			| 2
			| 3
		>(
			1,
		);

	const [
		relation,
		setRelation,
	] =
		useState(
			"父母",
		);
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
		userName,
		setUserName,
	] =
		useState(
			"",
		);

	const [
		willData,
		setWillData,
	] =
		useState<WillApiResponse | null>(
			null,
		);
	const [
		deceasedName,
		setDeceasedName,
	] =
		useState(
			"TA",
		);
	const [
		willFontFile,
		setWillFontFile,
	] =
		useState(
			"",
		);
	const [
		loadingWill,
		setLoadingWill,
	] =
		useState(
			false,
		);
	const [
		willError,
		setWillError,
	] =
		useState(
			"",
		);

	const [
		messages,
		setMessages,
	] =
		useState<
			ChatMessage[]
		>(
			[],
		);
	const [
		chatInput,
		setChatInput,
	] =
		useState(
			"",
		);
	const [
		chatLoading,
		setChatLoading,
	] =
		useState(
			false,
		);
	const [
		chatError,
		setChatError,
	] =
		useState(
			"",
		);

	useEffect(() => {
		const loadWill =
			async () => {
				setLoadingWill(
					true,
				);
				setWillError(
					"",
				);

				try {
					const res =
						await fetch(
							`/api/will?relation=${encodeURIComponent(relation)}`,
						);

					const data =
						(await res.json()) as
							| WillApiResponse
							| ApiErrorResponse;

					if (
						!res.ok
					) {
						const apiError =
							data as ApiErrorResponse;

						if (
							apiError
								.relations
								?.length
						) {
							setRelations(
								apiError.relations,
							);

							const nextRelation =
								apiError
									.relations[0];

							if (
								nextRelation !==
								relation
							) {
								setRelation(
									nextRelation,
								);
								return;
							}
						}

						throw new Error(
							apiError.message ||
								"获取遗书内容失败",
						);
					}

					const payload =
						data as WillApiResponse;

					setRelations(
						payload.relations,
					);
					setWillData(
						payload,
					);
					setWillFontFile(
						payload.fontFile ??
							"",
					);
					setDeceasedName(
						payload.deceasedName?.trim() ||
							"TA",
					);
				} catch (error) {
					setWillData(
						null,
					);
					setWillFontFile(
						"",
					);
					setDeceasedName(
						"TA",
					);
					setWillError(
						error instanceof
							Error
							? error.message
							: "未知错误",
					);
				} finally {
					setLoadingWill(
						false,
					);
				}
			};

		void loadWill();
	}, [
		relation,
	]);

	const willFontUrl =
		useMemo(
			() =>
				willFontFile
					? `/fonts/${encodeURIComponent(
							willFontFile,
						)}`
					: "",
			[
				willFontFile,
			],
		);

	const stepLabel =
		useMemo(() => {
			if (
				step ===
				1
			) {
				return "步骤 1 / 3：选择关系并填写你的名字";
			}
			if (
				step ===
				2
			) {
				return "步骤 2 / 3：查看对应遗书内容";
			}
			return "步骤 3 / 3：和 AI（模拟逝者）对话";
		}, [
			step,
		]);

	const handleNextFromStep1 =
		() => {
			if (
				!relation
			) {
				setWillError(
					"请先选择关系",
				);
				return;
			}

			if (
				!userName.trim()
			) {
				setWillError(
					"请输入你的名字",
				);
				return;
			}

			setWillError(
				"",
			);
			setStep(
				2,
			);
		};

	const handleNextFromStep2 =
		() => {
			setStep(
				3,
			);

			if (
				messages.length ===
				0
			) {
				setMessages(
					[
						{
							role: "assistant",
							content: `你好，${userName}。我是${deceasedName}，别伤心了，我们来聊聊吧`,
						},
					],
				);
			}
		};

	const handleSendMessage =
		async () => {
			const text =
				chatInput.trim();

			if (
				!text
			) {
				setChatError(
					"请输入想说的话",
				);
				return;
			}

			setChatLoading(
				true,
			);
			setChatError(
				"",
			);
			setChatInput(
				"",
			);

			const nextHistory =
				[
					...messages,
					{
						role: "user" as const,
						content:
							text,
					},
				];

			setMessages(
				nextHistory,
			);

			try {
				const res =
					await fetch(
						"/api/ai/chat",
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
									relation,
									userName:
										userName.trim(),
									message:
										text,
									history:
										nextHistory.slice(
											0,
											-1,
										),
								},
							),
						},
					);

				const data =
					(await res.json()) as
						| ChatApiResponse
						| ApiErrorResponse;

				if (
					!res.ok
				) {
					throw new Error(
						"message" in
							data
							? data.message
							: "AI 对话失败",
					);
				}

				const payload =
					data as ChatApiResponse;

				setMessages(
					(
						prev,
					) => [
						...prev,
						{
							role: "assistant",
							content:
								payload.reply,
						},
					],
				);
			} catch (error) {
				setChatError(
					error instanceof
						Error
						? error.message
						: "未知错误",
				);
			} finally {
				setChatLoading(
					false,
				);
			}
		};

	return (
		<div className="min-h-screen bg-zinc-100 py-10 px-4 text-zinc-900">
			{willFontUrl && (
				<style
					jsx
					global>{`
					@font-face {
						font-family: "WillConfiguredFont";
						src: url("${willFontUrl}");
						font-display: swap;
					}
				`}</style>
			)}
			<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
				<header className="space-y-2">
					<h1 className="text-2xl font-bold sm:text-3xl">
						遗书项目
					</h1>
					<p className="text-sm text-zinc-600 sm:text-base">
						按步骤完成：先选择关系和输入名字，再查看遗书，最后与
						AI
						模拟逝者对话。
					</p>
					<p className="text-xs font-medium text-zinc-500">
						{
							stepLabel
						}
					</p>
				</header>

				{step ===
					1 && (
					<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
						<h2 className="text-lg font-semibold">
							步骤一：关系与姓名
						</h2>

						<div className="space-y-2">
							<label
								htmlFor="relation"
								className="block text-sm font-medium text-zinc-700">
								选择你与逝者的关系
							</label>
							<select
								id="relation"
								className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
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
								}>
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

						<div className="space-y-2">
							<label
								htmlFor="userName"
								className="block text-sm font-medium text-zinc-700">
								输入你的名字
							</label>
							<input
								id="userName"
								value={
									userName
								}
								onChange={(
									e,
								) =>
									setUserName(
										e
											.target
											.value,
									)
								}
								placeholder="例如：小明"
								className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
							/>
						</div>

						{willError && (
							<p className="text-sm text-red-600">
								{
									willError
								}
							</p>
						)}

						<button
							type="button"
							onClick={
								handleNextFromStep1
							}
							className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700">
							下一步
						</button>
					</section>
				)}

				{step ===
					2 && (
					<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
						<h2 className="text-lg font-semibold">
							步骤二：查看遗书
						</h2>

						<p className="text-sm text-zinc-600">
							关系：
							{
								relation
							}{" "}
							｜
							你的名字：
							{
								userName
							}
						</p>

						{loadingWill && (
							<p className="text-sm text-zinc-500">
								加载中...
							</p>
						)}
						{willError && (
							<p className="text-sm text-red-600">
								{
									willError
								}
							</p>
						)}

						{willData && (
							<article
								key={`${willData.relation}-${willData.content.title}`}
								className="will-paper will-fade-in space-y-4 rounded-lg p-6 sm:p-8"
								style={{
									fontFamily:
										willFontUrl
											? `"WillConfiguredFont", "KaiTi", "STKaiti", serif`
											: `"KaiTi", "STKaiti", "Songti SC", serif`,
								}}>
								<h3 className="text-2xl font-semibold tracking-wide text-amber-950">
									{
										willData
											.content
											.title
									}
								</h3>
								<p className="font-medium text-amber-900">
									{
										willData
											.content
											.greeting
									}
								</p>
								<div className="space-y-3 leading-8 text-amber-950/90">
									{willData.content.body.map(
										(
											paragraph,
											index,
										) => (
											<p
												key={`${index}-${paragraph}`}>
												{
													paragraph
												}
											</p>
										),
									)}
								</div>
								<p className="pt-4 font-medium text-amber-900">
									——{" "}
									{
										willData
											.content
											.closing
									}
								</p>
							</article>
						)}

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() =>
									setStep(
										1,
									)
								}
								className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
								上一步
							</button>
							<button
								type="button"
								onClick={
									handleNextFromStep2
								}
								className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700">
								下一步
							</button>
						</div>
					</section>
				)}

				{step ===
					3 && (
					<section className="space-y-4 rounded-xl border border-zinc-200 p-4">
						<h2 className="text-lg font-semibold">
							步骤三：AI
							对话（模拟逝者）
						</h2>

						<p className="text-sm text-zinc-600">
							关系：
							{
								relation
							}{" "}
							｜
							对话对象：
							{
								userName
							}
						</p>

						<div className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-zinc-50 p-3">
							{messages.length ===
								0 && (
								<p className="text-sm text-zinc-500">
									点击下方发送后开始对话。
								</p>
							)}

							{messages.map(
								(
									msg,
									index,
								) => (
									<div
										key={`${msg.role}-${index}`}
										className={`rounded-lg px-3 py-2 text-sm ${
											msg.role ===
											"user"
												? "ml-10 bg-zinc-900 text-white"
												: "mr-10 bg-white text-zinc-800 border border-zinc-200"
										}`}>
										<p className="mb-1 text-xs opacity-70">
											{msg.role ===
											"user"
												? userName
												: "AI（逝者模拟）"}
										</p>
										<p>
											{
												msg.content
											}
										</p>
									</div>
								),
							)}
						</div>

						<div className="space-y-2">
							<textarea
								value={
									chatInput
								}
								onChange={(
									e,
								) =>
									setChatInput(
										e
											.target
											.value,
									)
								}
								placeholder="想和 TA 说些什么..."
								className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
							/>

							<div className="flex gap-3">
								<button
									type="button"
									onClick={() =>
										setStep(
											2,
										)
									}
									className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
									上一步
								</button>
								<button
									type="button"
									onClick={
										handleSendMessage
									}
									disabled={
										chatLoading
									}
									className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
									{chatLoading
										? "发送中..."
										: "发送"}
								</button>
							</div>
						</div>

						{chatError && (
							<p className="text-sm text-red-600">
								{
									chatError
								}
							</p>
						)}
					</section>
				)}
			</main>
		</div>
	);
}
