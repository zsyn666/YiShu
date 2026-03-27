import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
	DEFAULT_RELATIONS,
	DEFAULT_WILL_CONTENT,
	WILL_CONTENT_BY_RELATION,
	type WillContent,
} from "@/lib/will-config";

type WillRow =
	{
		relation: string;
		title: string;
		greeting: string;
		body_json: string;
		closing: string;
	};

const dataDir =
	path.join(
		process.cwd(),
		"data",
	);

if (
	!fs.existsSync(
		dataDir,
	)
) {
	fs.mkdirSync(
		dataDir,
		{
			recursive: true,
		},
	);
}

const dbPath =
	path.join(
		dataDir,
		"yishu.sqlite",
	);

const db =
	new Database(
		dbPath,
	);

db.pragma(
	"foreign_keys = ON",
);

db.exec(`
CREATE TABLE IF NOT EXISTS relations (
	relation TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS wills (
	relation TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	greeting TEXT NOT NULL,
	body_json TEXT NOT NULL,
	closing TEXT NOT NULL,
	FOREIGN KEY (relation) REFERENCES relations(relation) ON DELETE CASCADE
);
`);

function cloneWill(
	content: WillContent,
): WillContent {
	return structuredClone(
		content,
	);
}

function parseWillRow(
	row: WillRow,
): WillContent {
	let body: string[] =
		[];

	try {
		const parsed =
			JSON.parse(
				row.body_json,
			);
		if (
			Array.isArray(
				parsed,
			)
		) {
			body =
				parsed.filter(
					(
						item,
					) =>
						typeof item ===
						"string",
				);
		}
	} catch {
		body =
			DEFAULT_WILL_CONTENT.body;
	}

	return {
		title:
			row.title,
		greeting:
			row.greeting,
		body,
		closing:
			row.closing,
	};
}

function seedIfNeeded() {
	const insertRelationStmt =
		db.prepare(
			"INSERT OR IGNORE INTO relations (relation) VALUES (?)",
		);

	const insertWillStmt =
		db.prepare(`
			INSERT OR IGNORE INTO wills (relation, title, greeting, body_json, closing)
			VALUES (?, ?, ?, ?, ?)
		`);

	const tx =
		db.transaction(
			() => {
				for (const relation of DEFAULT_RELATIONS) {
					const content =
						WILL_CONTENT_BY_RELATION[
							relation
						] ??
						DEFAULT_WILL_CONTENT;

					insertRelationStmt.run(
						relation,
					);

					insertWillStmt.run(
						relation,
						content.title,
						content.greeting,
						JSON.stringify(
							content.body,
						),
						content.closing,
					);
				}
			},
		);

	tx();
}

seedIfNeeded();

export function listRelations(): string[] {
	const rows =
		db
			.prepare(
				"SELECT relation FROM relations ORDER BY rowid ASC",
			)
			.all() as Array<{
			relation: string;
		}>;

	return rows.map(
		(
			item,
		) =>
			item.relation,
	);
}

export function hasRelation(
	relation: string,
): boolean {
	const row =
		db
			.prepare(
				"SELECT 1 as ok FROM relations WHERE relation = ?",
			)
			.get(
				relation,
			) as
			| {
					ok: number;
			  }
			| undefined;

	return Boolean(
		row?.ok,
	);
}

export function getWillByRelation(
	relation: string,
): WillContent | null {
	const row =
		db
			.prepare(
				`
				SELECT relation, title, greeting, body_json, closing
				FROM wills
				WHERE relation = ?
				`,
			)
			.get(
				relation,
			) as
			| WillRow
			| undefined;

	if (
		!row
	) {
		return null;
	}

	return parseWillRow(
		row,
	);
}

export function getAllWills(): Record<
	string,
	WillContent
> {
	const rows =
		db
			.prepare(
				`
				SELECT relation, title, greeting, body_json, closing
				FROM wills
				ORDER BY rowid ASC
				`,
			)
			.all() as WillRow[];

	const result: Record<
		string,
		WillContent
	> =
		{};

	for (const row of rows) {
		result[
			row.relation
		] =
			parseWillRow(
				row,
			);
	}

	return result;
}

export function updateWillByRelation(
	relation: string,
	content: WillContent,
): WillContent | null {
	if (
		!hasRelation(
			relation,
		)
	) {
		return null;
	}

	db.prepare(
		`
		INSERT INTO wills (relation, title, greeting, body_json, closing)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(relation) DO UPDATE SET
			title = excluded.title,
			greeting = excluded.greeting,
			body_json = excluded.body_json,
			closing = excluded.closing
		`,
	).run(
		relation,
		content.title,
		content.greeting,
		JSON.stringify(
			content.body,
		),
		content.closing,
	);

	return cloneWill(
		content,
	);
}

export function addRelation(
	relation: string,
	initialContent?: WillContent,
): {
	relation: string;
	content: WillContent;
} | null {
	if (
		hasRelation(
			relation,
		)
	) {
		return null;
	}

	const content =
		cloneWill(
			initialContent ??
				DEFAULT_WILL_CONTENT,
		);

	const tx =
		db.transaction(
			() => {
				db.prepare(
					"INSERT INTO relations (relation) VALUES (?)",
				).run(
					relation,
				);

				db.prepare(
					`
					INSERT INTO wills (relation, title, greeting, body_json, closing)
					VALUES (?, ?, ?, ?, ?)
					`,
				).run(
					relation,
					content.title,
					content.greeting,
					JSON.stringify(
						content.body,
					),
					content.closing,
				);
			},
		);

	tx();

	return {
		relation,
		content,
	};
}

export function removeRelation(
	relation: string,
): boolean {
	const beforeCount =
		listRelations()
			.length;

	if (
		beforeCount <=
		1
	) {
		return false;
	}

	const info =
		db
			.prepare(
				"DELETE FROM relations WHERE relation = ?",
			)
			.run(
				relation,
			);

	return (
		info.changes >
		0
	);
}
