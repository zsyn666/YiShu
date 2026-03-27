import { NextResponse } from "next/server";
import {
	getWillByRelation,
	hasRelation,
	listRelations,
} from "@/lib/will-store";

export async function GET(
	request: Request,
) {
	const {
		searchParams,
	} =
		new URL(
			request.url,
		);

	const relationParam =
		searchParams
			.get(
				"relation",
			)
			?.trim();

	const relations =
		listRelations();

	if (
		!relationParam
	) {
		return NextResponse.json(
			{
				message:
					"缺少 relation 参数",
				relations,
			},
			{
				status: 400,
			},
		);
	}

	if (
		!hasRelation(
			relationParam,
		)
	) {
		return NextResponse.json(
			{
				message:
					"relation 参数不合法",
				relations,
			},
			{
				status: 400,
			},
		);
	}

	const content =
		getWillByRelation(
			relationParam,
		);

	if (
		!content
	) {
		return NextResponse.json(
			{
				message:
					"未找到关系对应内容",
				relations,
			},
			{
				status: 404,
			},
		);
	}

	return NextResponse.json(
		{
			relation:
				relationParam,
			relations,
			content,
		},
	);
}
