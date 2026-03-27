export type WillContent =
	{
		title: string;
		greeting: string;
		body: string[];
		closing: string;
	};

export const DEFAULT_RELATIONS: string[] =
	[
		"父母",
		"配偶",
		"子女",
		"朋友",
		"同事",
	];

export const WILL_CONTENT_BY_RELATION: Record<
	string,
	WillContent
> =
	{
		父母: {
			title:
				"写给父母",
			greeting:
				"亲爱的爸妈：",
			body: [
				"感谢你们给了我生命，也教会我如何善良与坚强。",
				"如果有来生，我还愿意做你们的孩子。",
				"请不要太过悲伤，替我好好看看这个世界的春夏秋冬。",
			],
			closing:
				"你们永远的孩子",
		},
		配偶: {
			title:
				"写给爱人",
			greeting:
				"我最爱的你：",
			body: [
				"谢谢你陪我走过人生最重要的时光。",
				"和你在一起的每一天，都是我最珍贵的记忆。",
				"愿你未来被温柔以待，也请替我继续热爱生活。",
			],
			closing:
				"永远爱你的人",
		},
		子女: {
			title:
				"写给孩子",
			greeting:
				"亲爱的孩子：",
			body: [
				"你是我生命里最骄傲、最明亮的礼物。",
				"未来的路也许不易，但请记住你一直被深深爱着。",
				"勇敢做自己，善待他人，也别忘了照顾好自己。",
			],
			closing:
				"爱你的家人",
		},
		朋友: {
			title:
				"写给朋友",
			greeting:
				"亲爱的朋友：",
			body: [
				"谢谢你在我人生里留下那么多笑声与回忆。",
				"你曾在我低谷时拉我一把，这份情谊我永远记得。",
				"请继续替我拥抱生活，也记得偶尔想起我。",
			],
			closing:
				"你永远的朋友",
		},
		同事: {
			title:
				"写给同事",
			greeting:
				"亲爱的同事们：",
			body: [
				"感谢与你们并肩工作的日子，让平凡时光有了意义。",
				"谢谢你们的支持、理解与包容。",
				"愿你们在工作与生活中都能平安顺遂，前路光明。",
			],
			closing:
				"曾与你们共事的人",
		},
	};

export const DEFAULT_WILL_CONTENT: WillContent =
	{
		title:
			"写给你",
		greeting:
			"亲爱的你：",
		body: [
			"谢谢你出现在我的生命中。",
			"愿你往后的日子平安顺遂，仍能看见生活的光。",
		],
		closing:
			"永远牵挂你的人",
	};
