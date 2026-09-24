"""Public works. No employment history."""

GROUPS = [
    ("selected", "精选", "从这里开始。每件都能打开站点，或直接看源码。"),
    ("tool", "工具", "有明确用途，可以装上或读源码。"),
    ("experiment", "实验", "原型、工作流和小站点。"),
]

PROJECTS = [
    {
        "slug": "idea-platform",
        "name": "Idea Platform",
        "group": "selected",
        "number": "01",
        "kind": "想法与 Agent",
        "problem": "让一个想法可以被别人独立实现，并把结果留在同一条链路上。",
        "summary": "发布想法，独立承接，再把完成的东西发布成作品。Agent 可以顺着这条分支往下做。",
        "stack": "TypeScript · Next.js",
        "diagram": "idea",
        "links": [
            ("打开线上站", "https://idea-platform.z-agent.ccwu.cc/"),
            ("Vercel 地址", "https://idea-platform-delta.vercel.app"),
            ("GitHub", "https://github.com/CengSin/idea-platform"),
        ],
        "source": "依据仓库说明和线上站点。",
        "sections": [
            ("它解决什么问题", [
                ["p", "想法如果只被收藏，就不会变成别人的作品。这里让想法被看见，让不同的人各自承接实现，再把结果放回同一条关系里。"],
            ]),
            ("访客如何使用", [
                ["p", "不登录也可以浏览公开想法。登录之后可以写下想法、承接一条实现，并把完成的东西发布成作品。"],
            ]),
            ("关键交互", [
                ["ul", [
                    "发现页把想法、作品，以及从作品长出来的新想法连在一起。",
                    "承接时可以拿到一份给 Agent 的说明。里面的凭证只能改这一条分支。",
                    "配套插件用 MCP 读取公开内容，不必去爬网页。",
                ]],
            ]),
            ("我做的取舍", [
                ["ul", [
                    "公开阅读不需要账号。写入必须由人确认，并使用这条分支自己的凭证。",
                    "草稿在发布前只对作者可见。",
                    "生产数据放在 Turso。本地开发也可以写在文件里。",
                ]],
            ]),
        ],
        "related": ["idea-platform-plugin", "toubar-replace"],
    },
    {
        "slug": "toubar-replace",
        "name": "ToubarReplace",
        "group": "selected",
        "number": "02",
        "kind": "macOS",
        "problem": "把 Touch Bar 变成 Agent 项目启动入口。",
        "summary": "把 Touch Bar 变成 Agent 项目启动入口。",
        "stack": "Swift",
        "diagram": "touch",
        "links": [
            ("打开官网", "https://toubarreplace.z-agent.ccwu.cc/"),
            ("GitHub", "https://github.com/CengSin/toubar-replace"),
        ],
        "source": "依据官网 toubarreplace.z-agent.ccwu.cc 上的产品说明。官网当前写出的版本是 2.0.1。",
        "sections": [
            ("它解决什么问题", [
                ["p", "把 Touch Bar 变成 Agent 项目启动入口。"],
            ]),
            ("访客如何使用", [
                ["p", "官网提供 macOS 14 及以上的 Universal 安装包。装好后，在设置里勾选要看的订阅，并钉上常用 App。用量来自本机的 OpenUsage。"],
            ]),
            ("关键交互", [
                ["ul", [
                    "一条栏分成两个区。左侧是订阅用量，每个订阅三根竖柱：短时、周剩余、下次重置。订阅多了可以左右滑。",
                    "浪费风险最高的订阅会描边，额度柱呈琥珀色。点那一列，打开对应应用。",
                    "右侧最多钉五个常用 App。点图标只负责打开，齿轮进入设置。",
                    "有物理 Touch Bar 的 Intel Mac 上，工作区出现在物理栏上，桌面窗口镜像当前画面。没有物理栏时，同一条工作区画在桌面上，可以直接点。Apple Silicon 使用软件工作区。",
                ]],
            ]),
            ("我做的取舍", [
                ["p", "用量不在应用里另行采集，只读本机 OpenUsage。点图标不做打开以外的事。"],
            ]),
        ],
        "related": ["resource-steward", "idea-platform"],
    },
    {
        "slug": "resource-steward",
        "name": "ResourceSteward",
        "group": "selected",
        "number": "03",
        "kind": "macOS",
        "problem": "在菜单栏看清 CPU、内存和 GPU，再决定要不要处理某个后台应用。",
        "summary": "按负载建议降低优先级，或请求应用正常退出。不压缩内存，不读取窗口和剪贴板。",
        "stack": "Swift",
        "diagram": "resource",
        "links": [("查看源码", "https://github.com/CengSin/ContextAwareResourceManager")],
        "source": "依据仓库 README。仓库描述用 ContextAwareResourceManager，README 标题是资源管家（ResourceSteward）。",
        "sections": [
            ("它解决什么问题", [
                ["p", "机器变慢时，需要先看清是谁在占用，再选择要不要处理。建议应该可以被拒绝。"],
            ]),
            ("访客如何使用", [
                ["p", "从仓库构建。需要 macOS 13 或更新版本，以及 Swift 6。应用数据在 ~/Library/Application Support/ResourceSteward/。"],
            ]),
            ("关键交互", [
                ["ul", [
                    "菜单栏里看 CPU、内存和 GPU。",
                    "Level 0 在确认后执行建议。Level 1 自动执行，并给出通知。",
                    "建议来自 README 中称为 Jev 的决策：候选、模型评估、保护规则和节流。",
                ]],
            ]),
            ("我做的取舍", [
                ["ul", [
                    "降低优先级不会回收内存。退出之后的回收交给系统。",
                    "不直接压缩内存或清理显存，也不读取窗口内容和剪贴板。",
                    "启用模型评估后，候选应用和负载会发到你自己配置的模型服务。诊断日志留在本机。",
                ]],
            ]),
        ],
        "related": ["toubar-replace"],
    },
    {
        "slug": "gorm-oracle",
        "name": "gorm-oracle",
        "group": "selected",
        "number": "04",
        "kind": "开源 · Go",
        "problem": "让 GORM 连上 Oracle。",
        "summary": "让 GORM 连上 Oracle。",
        "stack": "Go",
        "diagram": "mark",
        "links": [("查看源码", "https://github.com/CengSin/oracle")],
        "source": "依据仓库 README。实现基于 stevefan1999-personal/gorm-driver-oracle。",
        "sections": [
            ("它解决什么问题", [
                ["p", "GORM 没有现成的 Oracle 用法时，需要一个能打开连接、跟着 GORM 走的驱动。"],
            ]),
            ("访客如何使用", [
                ["p", "安装是 go get github.com/cengsin/oracle。打开数据库用 gorm.Open(oracle.Open(连接串), &gorm.Config{})。需要 Oracle 12c 或更新版本、Go 1.13 或更新版本，以及 ODPI-C。"],
            ]),
            ("我做的取舍", [
                ["p", "仓库 README 写明不建议用于生产。驱动在另一份实现上继续适配，而不是从零重写 Oracle 协议。"],
            ]),
        ],
        "related": [],
    },
    {
        "slug": "idea-platform-plugin",
        "name": "Idea Platform Plugin",
        "group": "tool",
        "number": "05",
        "kind": "Agent 插件",
        "problem": "让编辑器里的 Agent 读取 Idea Platform，而不是去爬网页。",
        "summary": "Cursor 插件。用 MCP 列出公开想法、读取上下文；只有带上分支凭证才写回进展。",
        "stack": "JavaScript",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/idea-platform-plugin")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "Agent 要参与一个想法，应该读站点准备好的上下文，而不是把网页刮下来。"],
            ]),
            ("访客如何使用", [
                ["p", "可以装进 Cursor，也可以直接跑这个 stdio MCP。默认请求 Idea Platform 的线上站，也可以用环境变量改基址。"],
            ]),
            ("关键交互", [
                ["p", "公开工具可以搜索想法、读取想法和作品。设置了分支凭证之后，才会出现写入。未确认的写入会被拒绝。"],
            ]),
            ("我做的取舍", [
                ["p", "没有分支凭证时，不向 Agent 宣传写接口。许可是 MIT。"],
            ]),
        ],
        "related": ["idea-platform"],
    },
    {
        "slug": "fishaudio-mcp",
        "name": "Fish Audio MCP",
        "group": "tool",
        "number": "06",
        "kind": "MCP",
        "problem": "把文字交给 Fish Audio，接进支持 MCP 的客户端。",
        "summary": "一个 Python MCP 服务。可以做基本合成，也可以指定格式和比特率。",
        "stack": "Python",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/fishaudio-mcp")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "支持 MCP 的客户端需要一个文字转语音的工具，而不是单独打开 Fish Audio 的网站。"],
            ]),
            ("访客如何使用", [
                ["p", "安装依赖后，在本地 .env 写入自己的 API key 和模型 ID，再启动服务。"],
            ]),
            ("我做的取舍", [
                ["p", "没有公开的托管实例。密钥留在使用者自己的机器上，没有密钥就不能合成。"],
            ]),
        ],
        "related": ["idea-platform-plugin"],
    },
    {
        "slug": "dirmap",
        "name": "DirMap",
        "group": "tool",
        "number": "07",
        "kind": "Agent 工具",
        "problem": "目录一变，就给 Agent 一份带简短说明的结构。",
        "summary": "监听目录变化，调用兼容 Claude 的接口，为每个文件夹写一行说明，输出 Markdown。",
        "stack": "Go",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/DirMap")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "Agent 要看懂一个项目，不该每次都重新扫一遍没有说明的目录树。"],
            ]),
            ("访客如何使用", [
                ["p", "配置要监视的路径、输出目录，以及兼容 Claude 的接口。可以本地运行，也可以用 Docker。"],
            ]),
            ("我做的取舍", [
                ["p", "macOS 上的 Docker 收不到可靠的文件系统事件，所以提供轮询。说明写多长、准不准，取决于你配置的模型。"],
            ]),
        ],
        "related": ["idea-platform"],
    },
    {
        "slug": "weread-reading-recommender",
        "name": "weread-reading-recommender",
        "group": "tool",
        "number": "08",
        "kind": "本地工具",
        "problem": "在自己的机器上，根据微信读书记录想下一本读什么。",
        "summary": "读取本机记录，整理成适合推荐的 JSON，再按阅读史和当前想学的主题推荐。",
        "stack": "Python",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/weread-reading-recommender")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "下一本读什么，应该能对照自己已经读过的书，而不是只看一个公共榜单。"],
            ]),
            ("访客如何使用", [
                ["p", "在本机读取微信读书的 cookie，导出阅读数据，归一化成 JSON，再按历史和当前的学习主题推荐。"],
            ]),
            ("我做的取舍", [
                ["p", "它停在你的机器上。不做云同步，不代管 cookie，也不是一个远程服务。"],
            ]),
        ],
        "related": [],
    },
    {
        "slug": "crawl-online",
        "name": "Crawler Skill Studio",
        "group": "tool",
        "number": "09",
        "kind": "实验工具",
        "problem": "在网页上点选字段，生成一份爬虫 skill。",
        "summary": "输入网址，在预览里点元素，导出包含字段、预览和脚本的 JSON。",
        "stack": "TypeScript",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/crawl-online")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "写爬虫之前，先在页面上指出要的字段，看提取结果对不对，再把这一步收成可复用的 skill。"],
            ]),
            ("访客如何使用", [
                ["p", "需要 Node.js 22 或更新版本。本地打开工作台，输入网址，在预览里点元素，确认提取结果后导出 JSON。"],
            ]),
            ("我做的取舍", [
                ["p", "预览用的是抓到的静态 HTML。强依赖脚本、登录或反爬的页面，不保证能点到。配置了 Gemini 密钥才会让模型写脚本，否则使用本地模板。"],
            ]),
        ],
        "related": [],
    },
    {
        "slug": "fold-studio",
        "name": "Fold Studio",
        "group": "experiment",
        "number": "10",
        "kind": "交互原型",
        "problem": "看清双屏折叠时，两面的内容应该怎样交接。",
        "summary": "A 屏绕中线向 B 屏折叠。角度改变时，半幅内容、投影和失焦跟着变。",
        "stack": "JavaScript",
        "diagram": None,
        "links": [
            ("打开原型", "https://iphone-duo-ui.vercel.app"),
            ("GitHub", "https://github.com/CengSin/iphone-Duo-UI"),
        ],
        "source": "依据仓库 README。仓库名是 iphone-Duo-UI。",
        "sections": [
            ("它解决什么问题", [
                ["p", "折叠不是把界面挤扁。不同角度下，哪一面显示半幅、哪一面承接投影，需要能直接试。"],
            ]),
            ("访客如何使用", [
                ["p", "打开线上原型，或直接打开仓库里的 index.html。可以拖动、指定角度、往返播放，也可以换背景。"],
            ]),
            ("关键交互", [
                ["ul", [
                    "0–10° 时，A 仍显示自己的一半，和 B 拼成完整界面。",
                    "10–42°，半幅淡出，完整画布作为投影压到 A 面。",
                    "42–90°，投影失焦变暗，90° 为黑场。90–180° 再过渡到 B。",
                    "图片只在浏览器里处理，刷新后回到默认背景。",
                ]],
            ]),
            ("我做的取舍", [
                ["p", "没有构建步骤。超过 90° 之后用 A 的背面作为显示面，这是不受硬件限制的模拟。光影是视觉近似，不是光线追踪。MIT。"],
            ]),
        ],
        "related": [],
    },
    {
        "slug": "develop-workflow",
        "name": "develop-workflow",
        "group": "experiment",
        "number": "11",
        "kind": "工作流",
        "problem": "把开发和 Agent 的步骤编排成失败后可以单独重试的流程。",
        "summary": "用 Temporal 串起 worker、命令行和 Agent。本地依赖用 Docker Compose 拉起。",
        "stack": "Go",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/develop-workflow")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "一步失败就整段重来，开发和 Agent 的流程都很难改。步骤应该能单独重试。"],
            ]),
            ("访客如何使用", [
                ["p", "仓库里有 Temporal worker、命令行和 Docker Compose。本地会起 Temporal、它的界面和 Redis。"],
            ]),
            ("我做的取舍", [
                ["p", "这是一套可以在自己机器上跑起来的结构，不是一个公开的在线服务。"],
            ]),
        ],
        "related": ["temporal-openclaw-research-agent"],
    },
    {
        "slug": "temporal-openclaw-research-agent",
        "name": "temporal-openclaw-research-agent",
        "group": "experiment",
        "number": "12",
        "kind": "工作流",
        "problem": "一次要走很多步的 Agent 任务，中间失败不该从头再来。",
        "summary": "用 Temporal 编排本地 OpenClaw。示例是把新能源行业的材料收成一篇脱水稿。",
        "stack": "Go",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/temporal-openclaw-research-agent")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "直接调用模型时，中间某一步失败，整次任务就得重头开始，也看不清是哪一步出了问题。"],
            ]),
            ("访客如何使用", [
                ["p", "示例从一句话开始：写一篇新能源行业的脱水稿。流程分成检索、清洗和成文。编排在 Temporal，执行用本地 OpenClaw。"],
            ]),
            ("我做的取舍", [
                ["p", "用一个具体题目把步骤拆开，方便单独重试。它演示的是这种结构，不是一份持续更新的研报服务。"],
            ]),
        ],
        "related": ["develop-workflow", "idea-platform"],
    },
    {
        "slug": "clawd-hands",
        "name": "Clawd Hands",
        "group": "experiment",
        "number": "13",
        "kind": "技能目录",
        "problem": "集中查看、开关和分享 OpenClaw 的技能包。",
        "summary": "在网页上管理技能要不要启用，本机定时同步；也可以把技能包交给别人下载。",
        "stack": "JavaScript",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/clawd-hands")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "技能散落在本机时，不容易看清哪些开着，也不容易把一个技能包交给别人。"],
            ]),
            ("访客如何使用", [
                ["p", "网页上可以注册、查看共享区、管理自己的技能，以及上传或下载技能包。本机用定时任务和站点同步。"],
            ]),
            ("关键交互", [
                ["p", "本机大约每 5 秒询问配置有没有变化。没有变化就不再拉取全量状态。skill.md 是接入说明。"],
            ]),
            ("我做的取舍", [
                ["p", "开关放在网页上，真正执行仍在本机。站点记的是目标状态，不是替你跑技能。"],
            ]),
        ],
        "related": ["temporal-openclaw-research-agent"],
    },
    {
        "slug": "baby-toy",
        "name": "敲敲小世界",
        "group": "experiment",
        "number": "14",
        "kind": "前端玩具",
        "problem": "给喜欢敲键盘的孩子一块画纸，按键不离开这台设备。",
        "summary": "全屏蜡笔画纸。敲键留下笔触，词语会召唤动物、天气和地面。",
        "stack": "TypeScript",
        "diagram": None,
        "links": [("查看源码", "https://github.com/CengSin/baby-toy")],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "孩子敲键盘时，需要一块有回应的画纸，而不是一个会把按键传走的网页。"],
            ]),
            ("访客如何使用", [
                ["p", "用 Node.js 22.13 或更新版本在本地打开。敲键或点击留下笔触。输入生肖、天气、地面或颜色的词，画面会跟着变。"],
            ]),
            ("我做的取舍", [
                ["ul", [
                    "纯前端。不收集、不存储、不上传按键，不播放声音，不计分。",
                    "刷新或换纸就清空。",
                    "全屏保护只拦截页面能收到的按键。它不是系统级儿童锁。",
                ]],
            ]),
        ],
        "related": ["my-face"],
    },
    {
        "slug": "my-face",
        "name": "今天的天气",
        "group": "experiment",
        "number": "15",
        "kind": "个人站点",
        "problem": "留一个只记心情的小站。",
        "summary": "打开就能看。内容在 Cloudflare D1，应用是 Worker。",
        "stack": "TypeScript",
        "diagram": None,
        "links": [
            ("打开站点", "https://mood.z-agent.ccwu.cc/"),
            ("GitHub", "https://github.com/CengSin/my-face"),
        ],
        "source": "依据仓库 README。",
        "sections": [
            ("它解决什么问题", [
                ["p", "心情需要一个单独的地方，不和项目说明混在一起。"],
            ]),
            ("访客如何使用", [
                ["p", "打开 mood.z-agent.ccwu.cc。"],
            ]),
            ("我做的取舍", [
                ["p", "发布只更新应用和静态文件，不改线上表，也不清掉已经写下的内容。本地数据库和线上 D1 不会自动同步。"],
            ]),
        ],
        "related": ["baby-toy"],
    },
]
