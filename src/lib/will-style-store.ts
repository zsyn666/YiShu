import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type WillStyleSettings =
	{
		fontFile: string;
	};

const DEFAULT_WILL_STYLE_SETTINGS: WillStyleSettings =
	{
		fontFile:
			"",
	};

const FONT_EXTENSIONS =
	new Set(
		[
			".ttf",
			".otf",
			".woff",
			".woff2",
		],
	);

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

db.exec(`
CREATE TABLE IF NOT EXISTS will_style_settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	font_file TEXT NOT NULL
);
`);

function getFontsDirPath() {
	return path.join(
		process.cwd(),
		"public",
		"fonts",
	);
}

export function listAvailableFontFiles(): string[] {
	const fontsDirPath =
		getFontsDirPath();

	if (
		!fs.existsSync(
			fontsDirPath,
		)
	) {
		return [];
	}

	const files =
		fs.readdirSync(
			fontsDirPath,
			{
				withFileTypes: true,
			},
		);

	return files
		.filter(
			(
				entry,
			) =>
				entry.isFile(),
		)
		.map(
			(
				entry,
			) =>
				entry.name,
		)
		.filter(
			(
				fileName,
			) =>
				FONT_EXTENSIONS.has(
					path
						.extname(
							fileName,
						)
						.toLowerCase(),
				),
		)
		.sort(
			(
				a,
				b,
			) =>
				a.localeCompare(
					b,
					"zh-Hans-CN",
				),
		);
}

function sanitizeFontFile(
	fontFile: unknown,
	availableFonts: string[],
): string {
	if (
		typeof fontFile !==
		"string"
	) {
		return "";
	}

	const value =
		fontFile.trim();

	if (
		!value
	) {
		return "";
	}

	return availableFonts.includes(
		value,
	)
		? value
		: "";
}

function seedWillStyleSettingsIfNeeded() {
	const row =
		db
			.prepare(
				"SELECT id FROM will_style_settings WHERE id = 1",
			)
			.get() as
			| {
					id: number;
			  }
			| undefined;

	if (
		row
	) {
		return;
	}

	db.prepare(
		`
		INSERT INTO will_style_settings (id, font_file)
		VALUES (?, ?)
		`,
	).run(
		1,
		DEFAULT_WILL_STYLE_SETTINGS.fontFile,
	);
}

seedWillStyleSettingsIfNeeded();

export function getWillStyleSettings(): WillStyleSettings {
	const row =
		db
			.prepare(
				`
				SELECT id, font_file
				FROM will_style_settings
				WHERE id = 1
				`,
			)
			.get() as
			| {
					id: number;
					font_file: string;
			  }
			| undefined;

	const availableFonts =
		listAvailableFontFiles();

	if (
		!row
	) {
		return {
			...DEFAULT_WILL_STYLE_SETTINGS,
		};
	}

	return {
		fontFile:
			sanitizeFontFile(
				row.font_file,
				availableFonts,
			),
	};
}

export function updateWillStyleSettings(
	input: Partial<WillStyleSettings>,
): WillStyleSettings {
	const availableFonts =
		listAvailableFontFiles();

	const next: WillStyleSettings =
		{
			fontFile:
				sanitizeFontFile(
					input.fontFile,
					availableFonts,
				),
		};

	db.prepare(
		`
		INSERT INTO will_style_settings (id, font_file)
		VALUES (?, ?)
		ON CONFLICT(id) DO UPDATE SET
			font_file = excluded.font_file
		`,
	).run(
		1,
		next.fontFile,
	);

	return next;
}
