(function () {
  window.renderMusic = async function (container, helpers) {
    const { el, api, field, checkbox } = helpers;
    let library, mode = "reports", selected = "", query = "", limit = 30;
    const status = el("p", { role: "status", class: "status" });
    const view = el("div");
    const root = el("div", { class: "music-admin" }, [status, view]);
    container.append(root);
    const request = (path, method, body) => api("/admin/api/music" + path, { method, body: JSON.stringify(body) });
    const button = (label, action, primary) => el("button", { type: "button", class: "button" + (primary ? " primary" : ""), onclick: action }, [label]);
    const artist = (s) => el("span", { class: "music-muted" }, [s.artist]);
    const image = (s) => s.cover ? el("img", { src: s.cover, alt: "", loading: "lazy", width: 48, height: 48, referrerpolicy: "no-referrer" }) : el("span", { class: "music-cover-fallback", "aria-hidden": true }, ["♪"]);
    async function perform(action, refresh = true) {
      if (root.dataset.busy === "true") return;
      root.dataset.busy = "true";
      status.textContent = "处理中…";
      try {
        const result = await action();
        status.textContent = result.message || "已保存";
        if (refresh) await load();
      } catch (error) { status.textContent = error.message; }
      finally { root.dataset.busy = "false"; }
    }
    async function load() {
      library = await api("/admin/api/music");
      draw();
    }
    function songList(songs) {
      const input = el("input", { type: "search", placeholder: "搜索歌名、歌手", "aria-label": "搜索歌曲" });
      input.value = query;
      const rows = el("div", { class: "music-song-list" });
      const update = () => {
        const filtered = songs.filter(s => (s.title + " " + s.artist).toLowerCase().includes(query.toLowerCase()));
        rows.replaceChildren(...filtered.slice(0, limit).map(s => el("div", { class: "music-song-row" }, [image(s), el("div", {}, [el("strong", {}, [s.title]), artist(s)]), s.playCount != null ? el("span", { class: "music-count" }, [String(s.playCount) + " 次"]) : el("span"), button("写回忆", () => edit({ song: s, period: selected && /^20\d\d-\d\d$/.test(selected) ? selected : "" }))])));
        if (filtered.length > limit) rows.append(button("显示更多", () => { limit += 30; update(); }));
        if (!filtered.length) rows.append(el("p", { class: "music-empty" }, ["没有找到歌曲"]));
      };
      input.addEventListener("input", () => { query = input.value; limit = 30; update(); });
      update();
      return el("div", { class: "music-browser" }, [input, rows]);
    }
    function preview(item, saved) {
      if (item.sourceUrl) {
        try {
          const url = new URL(item.sourceUrl);
          if (url.origin !== "https://idea-platform.z-agent.ccwu.cc" || url.username || url.password) throw new Error();
        } catch { status.textContent = "请选择 Idea Platform 的记录链接"; return; }
      }
      const dialog = el("dialog", { class: "music-preview", "aria-label": "回忆预览" });
      const content = el("article", {}, [image(item.song), el("p", { class: "kicker" }, [item.period || "未填写时期"]), el("h2", {}, [item.title || item.song.title]), el("p", { class: "music-muted" }, [item.song.title + " · " + item.song.artist]), el("p", { class: "music-memory-text" }, [item.memory || "未填写回忆"])]);
      if (item.sourceUrl) content.append(el("p", {}, [el("a", { href: item.sourceUrl, target: "_blank", rel: "noopener noreferrer" }, [item.sourceTitle || "关联记录"])]));
      const close = button("关闭预览", () => { dialog.close(); dialog.remove(); });
      dialog.append(content, el("div", { class: "row" }, [close]));
      if (saved && !item.published) dialog.lastChild.append(button("发布这段回忆", async () => { dialog.close(); dialog.remove(); await perform(() => request("/publish", "POST", { id: item.id, published: true, revision: item.revision })); }, true));
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      root.append(dialog);
      dialog.showModal();
      close.focus();
    }
    function edit(item) {
      const draft = { ...item, song: { ...item.song } };
      const editor = el("div", { class: "music-editor editor" });
      editor.append(el("h2", {}, [draft.song.title]), artist(draft.song),
        field("时期", draft.period, v => { draft.period = v; }),
        field("标题", draft.title, v => { draft.title = v; }),
        field("我的回忆", draft.memory, v => { draft.memory = v; }, true),
        field("Idea Platform 记录链接", draft.sourceUrl, v => { draft.sourceUrl = v; }),
        field("关联记录标题", draft.sourceTitle, v => { draft.sourceTitle = v; }),
        el("div", { class: "row" }, [
          button("保存为私人草稿", () => perform(async () => { const result = await request("/memory", "PUT", draft); mode = "memories"; return result; }), true),
          button("预览", () => preview(draft, false)),
          button("取消", draw),
        ])
      );
      view.replaceChildren(editor);
    }
    function draw() {
      view.replaceChildren();
      const upload = el("input", { type: "file", accept: ".json,application/json", hidden: true, "aria-label": "音乐数据文件" });
      upload.addEventListener("change", () => {
        const file = upload.files[0];
        if (!file) return;
        perform(async () => {
          if (file.size > 8 * 1024 * 1024) throw new Error("文件不能超过 8 MB");
          return request("/import", "POST", JSON.parse(await file.text()));
        });
      });
      view.append(el("div", { class: "music-toolbar" }, [el("div", { class: "row" }, [button("导入音乐数据", () => upload.click(), true), button("刷新", () => perform(async () => ({ message: "已刷新" }))), upload]), checkbox("公开音乐名片", library.publicEnabled, value => perform(() => request("/settings", "PUT", { publicEnabled: value })))]));
      const tabs = el("div", { class: "music-tabs", role: "group", "aria-label": "音乐资料" });
      for (const [key,label] of [["reports","月份"],["playlists","歌单"],["recent","最近播放"],["memories","我的回忆"]]) tabs.append(el("button", { type: "button", "aria-pressed": mode === key ? "true" : "false", onclick: () => { mode = key; selected = ""; query = ""; limit = 30; draw(); } }, [label]));
      view.append(tabs);
      if (mode === "memories") {
        if (!library.memories.length) view.append(el("p", { class: "music-empty" }, ["还没有回忆。选一首歌，写下它对你的意义。"]));
        for (const m of library.memories) view.append(el("article", { class: "music-memory-card" }, [el("p", { class: "music-muted" }, [m.period + " · " + (m.published ? "已发布" : "私人草稿")]), el("h2", {}, [m.title || m.song.title]), el("p", {}, [m.song.title + " · " + m.song.artist]), el("p", { class: "music-memory-text" }, [m.memory]), el("div", { class: "row" }, [button("编辑", () => edit(m)), button("预览", () => preview(m, true)), ...(m.published ? [button("撤回公开", () => perform(() => request("/publish", "POST", { id: m.id, published: false })))] : [])])]));
        return;
      }
      const snapshots = library.snapshots;
      if (mode === "reports") {
        const reports = snapshots.filter(s => s.kind === "report").sort((a,b) => b.period.localeCompare(a.period));
        if (!reports.length) return view.append(el("p", { class: "music-empty" }, ["还没有月度报告"]));
        if (!reports.some(s => s.period === selected)) selected = reports[0].period;
        const select = el("select", { "aria-label": "选择月份", onchange: e => { selected = e.target.value; draw(); } }, reports.map(r => el("option", { value: r.period, selected: r.period === selected }, [r.period])));
        const report = reports.find(s => s.period === selected).payload;
        view.append(select, el("div", { class: "music-metrics" }, [el("div", {}, [el("span", {}, ["听歌时长排名"]), el("strong", {}, [report.durationText || "暂无数据"])]), el("div", {}, [el("span", {}, ["听歌天数"]), el("strong", {}, [String(report.listenDays) + " 天"])])]));
        const groups = el("div", { class: "music-groups" });
        for (const [name,items] of [["风格",report.styles],["语言",report.languages],["年代",report.ages]]) groups.append(el("section", {}, [el("h3", {}, [name]), ...items.map(x => el("p", {}, [el("span", {}, [x.name]), el("span", { class: "music-muted" }, [x.value + (name === "年代" ? " 首" : "%")])]))]));
        view.append(groups, el("h2", {}, ["这个月的歌曲"]), songList(report.songs));
      } else if (mode === "playlists") {
        const lists = snapshots.find(s => s.kind === "playlists")?.payload || [];
        if (!lists.length) return view.append(el("p", { class: "music-empty" }, ["还没有歌单"]));
        if (!lists.some(p => p.id === selected)) selected = lists[0].id;
        const select = el("select", { "aria-label": "选择歌单", onchange: e => { selected = e.target.value; draw(); } }, lists.map(p => el("option", { value: p.id, selected: p.id === selected }, [p.title + " · " + p.songs.length + (p.songs.length < p.songCount ? "/" + p.songCount : "") + " 首"])));
        view.append(select, songList(lists.find(p => p.id === selected).songs));
      } else {
        const recent = snapshots.find(s => s.kind === "recent");
        view.append(songList(recent?.payload || []));
      }
    }
    status.textContent = "加载音乐资料…";
    try { await load(); status.textContent = ""; }
    catch (e) { status.textContent = e.message; }
  };
})();
