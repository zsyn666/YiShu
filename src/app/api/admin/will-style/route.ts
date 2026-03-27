import { NextResponse } from "next/server";
import {
	getWillStyleSettings,
	listAvailableFontFiles,
	updateWillStyleSettings,
	type WillStyleSettings,
} from "@/lib/will-style-store";

type UpdateWillStyleRequest =
	Partial<WillStyleSettings>;

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
				"获取遗书样式配置成功",
			data: getWillStyleSettings(),
			fonts:
				listAvailableFontFiles(),
		},
	);
}

export async function PUT(
	request: Request,
) {
	let body: UpdateWillStyleRequest;

	try {
		body =
			(await request.json()) as UpdateWillStyleRequest;
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
		updateWillStyleSettings(
			body,
		);

	return NextResponse.json(
		{
			message:
				"遗书样式配置保存成功",
			data: updated,
			fonts:
				listAvailableFontFiles(),
		},
	);
}
