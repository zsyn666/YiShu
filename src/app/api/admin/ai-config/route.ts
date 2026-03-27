import { NextResponse } from "next/server";
import {
	getAiAdminSettings,
	updateAiAdminSettings,
	type AiAdminSettings,
} from "@/lib/ai-settings-store";

type UpdateAiConfigRequest =
	Partial<AiAdminSettings>;

function badRequest(
	message: string,
) {
	return NextResponse.json(
		{
			message,
		},
		{
			status: 400,
		},
	);
}

export async function GET() {
	return NextResponse.json(
		{
			message:
				"获取 AI 配置成功",
			data: getAiAdminSettings(),
		},
	);
}

export async function PUT(
	request: Request,
) {
	let body: UpdateAiConfigRequest;

	try {
		body =
			(await request.json()) as UpdateAiConfigRequest;
	} catch {
		return badRequest(
			"请求体必须是合法 JSON",
		);
	}

	if (
		!body ||
		typeof body !==
			"object"
	) {
		return badRequest(
			"请求参数不合法",
		);
	}

	const updated =
		updateAiAdminSettings(
			body,
		);

	return NextResponse.json(
		{
			message:
				"AI 配置保存成功",
			data: updated,
		},
	);
}
