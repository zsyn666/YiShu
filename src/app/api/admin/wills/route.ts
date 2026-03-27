import { NextResponse } from "next/server";
import {
	isNonEmptyString,
	normalizeRelation,
} from "@/lib/relations";
import {
	addRelation,
	getAllWills,
	hasRelation,
	listRelations,
	removeRelation,
	updateWillByRelation,
} from "@/lib/will-store";
import type { WillContent } from "@/lib/will-config";

type UpdateWillRequest =
	{
		relation?: string;
		content?: {
			title?: string;
			greeting?: string;
			body?: string[];
			closing?: string;
		};
	};

type CreateRelationRequest =
	{
		relation?: string;
		content?: {
			title?: string;
			greeting?: string;
			body?: string[];
			closing?: string;
		};
	};

type DeleteRelationRequest =
	{
		relation?: string;
	};

function sanitizeBodyLines(
	value: unknown,
):
	| string[]
	| null {
	if (
		!Array.isArray(
			value,
		)
	) {
		return null;
	}

	const lines =
		value
			.map(
				(
					item,
				) =>
					typeof item ===
					"string"
						? item.trim()
						: "",
			)
			.filter(
				Boolean,
			);

	return lines.length >
		0
		? lines
		: null;
}

function parseWillContent(
	rawContent: UpdateWillRequest["content"],
):
	| {
			content: WillContent;
	  }
	| {
			error: string;
	  } {
	if (
		!rawContent
	) {
		return {
			error:
				"content 不能为空",
		};
	}

	const title =
		rawContent.title?.trim();
	const greeting =
		rawContent.greeting?.trim();
	const bodyLines =
		sanitizeBodyLines(
			rawContent.body,
		);
	const closing =
		rawContent.closing?.trim();

	if (
		!title ||
		!greeting ||
		!bodyLines ||
		!closing
	) {
		return {
			error:
				"title/greeting/body/closing 均不能为空",
		};
	}

	return {
		content:
			{
				title,
				greeting,
				body: bodyLines,
				closing,
			},
	};
}

function badRequest(
	message: string,
) {
	return NextResponse.json(
		{
			message,
			relations:
				listRelations(),
		},
		{
			status: 400,
		},
	);
}

export async function GET() {
	return NextResponse.json(
		{
			relations:
				listRelations(),
			data: getAllWills(),
		},
	);
}

export async function PUT(
	request: Request,
) {
	let body: UpdateWillRequest;

	try {
		body =
			(await request.json()) as UpdateWillRequest;
	} catch {
		return badRequest(
			"请求体必须是合法 JSON",
		);
	}

	if (
		!isNonEmptyString(
			body.relation,
		)
	) {
		return badRequest(
			"relation 缺失",
		);
	}

	const relation =
		body.relation.trim();

	if (
		!hasRelation(
			relation,
		)
	) {
		return badRequest(
			"relation 不存在",
		);
	}

	const parsed =
		parseWillContent(
			body.content,
		);

	if (
		"error" in
		parsed
	) {
		return badRequest(
			parsed.error,
		);
	}

	const updated =
		updateWillByRelation(
			relation,
			parsed.content,
		);

	if (
		!updated
	) {
		return badRequest(
			"更新失败",
		);
	}

	return NextResponse.json(
		{
			message:
				"更新成功",
			relation,
			content:
				updated,
			relations:
				listRelations(),
		},
	);
}

export async function POST(
	request: Request,
) {
	let body: CreateRelationRequest;

	try {
		body =
			(await request.json()) as CreateRelationRequest;
	} catch {
		return badRequest(
			"请求体必须是合法 JSON",
		);
	}

	if (
		!isNonEmptyString(
			body.relation,
		)
	) {
		return badRequest(
			"relation 不能为空",
		);
	}

	const relation =
		normalizeRelation(
			body.relation,
		);

	if (
		!relation
	) {
		return badRequest(
			"relation 格式不合法",
		);
	}

	if (
		hasRelation(
			relation,
		)
	) {
		return badRequest(
			"relation 已存在",
		);
	}

	let parsedContent:
		| WillContent
		| undefined;

	if (
		body.content
	) {
		const parsed =
			parseWillContent(
				body.content,
			);

		if (
			"error" in
			parsed
		) {
			return badRequest(
				parsed.error,
			);
		}

		parsedContent =
			parsed.content;
	}

	const created =
		addRelation(
			relation,
			parsedContent,
		);

	if (
		!created
	) {
		return badRequest(
			"新增关系失败",
		);
	}

	return NextResponse.json(
		{
			message:
				"新增关系成功",
			relation:
				created.relation,
			content:
				created.content,
			relations:
				listRelations(),
			data: getAllWills(),
		},
	);
}

export async function DELETE(
	request: Request,
) {
	let body: DeleteRelationRequest;

	try {
		body =
			(await request.json()) as DeleteRelationRequest;
	} catch {
		return badRequest(
			"请求体必须是合法 JSON",
		);
	}

	if (
		!isNonEmptyString(
			body.relation,
		)
	) {
		return badRequest(
			"relation 不能为空",
		);
	}

	const relation =
		body.relation.trim();
	const relations =
		listRelations();

	if (
		relations.length <=
		1
	) {
		return badRequest(
			"至少保留一个关系，无法继续删除",
		);
	}

	if (
		!hasRelation(
			relation,
		)
	) {
		return badRequest(
			"relation 不存在",
		);
	}

	const removed =
		removeRelation(
			relation,
		);

	if (
		!removed
	) {
		return badRequest(
			"删除关系失败",
		);
	}

	return NextResponse.json(
		{
			message:
				"删除关系成功",
			relation,
			relations:
				listRelations(),
			data: getAllWills(),
		},
	);
}
