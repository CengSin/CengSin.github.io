import { useEffect, useState } from "react";
import { ArrowUpRight, MusicNotes } from "@phosphor-icons/react";

export function Music({ compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const base = location.origin === "http://127.0.0.1:8787" ? "" : "https://cengsin.de5.net";
    setError(false);
    fetch(`${base}/music/public`, { cache: "no-store", signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(e => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (compact && (!data?.enabled || !data.memories.length)) return null;
  if (error) return compact ? null : <div className="music-message"><p role="status">音乐暂时无法加载。</p><button className="button secondary" onClick={() => setAttempt(attempt + 1)}>重新加载</button></div>;
  if (!data) return compact ? null : <div className="music-loading" role="status">加载音乐…</div>;
  if (!data.enabled || !data.memories.length) return compact ? null : <div className="music-message"><p>还没有公开的音乐回忆。</p><a href="/">回到首页</a></div>;
  const Heading = compact ? "h3" : "h2";
  const memories = compact ? data.memories.slice(0, 2) : data.memories;
  return <section className="soundtrack-section" aria-labelledby={compact ? "music-home-title" : undefined}>
    {compact && <><h2 id="music-home-title">人生原声带</h2><a className="soundtrack-all" href="/music/">所有音乐回忆 <ArrowUpRight/></a></>}
    <div className="soundtrack-grid">{memories.map(m => <article className="soundtrack" key={m.id}>
      <div className="soundtrack-art">{m.song.cover ? <img src={m.song.cover} alt={`${m.song.album || m.song.title} 封面`} loading="lazy" width="320" height="320" referrerPolicy="no-referrer"/> : <MusicNotes size={64}/>}</div>
      <div className="soundtrack-story"><p className="soundtrack-period">{m.period}</p><Heading>{m.title || m.song.title}</Heading><p className="soundtrack-song"><a href={`https://music.163.com/#/song?id=${m.song.id}`} target="_blank" rel="noopener noreferrer">{m.song.title} <ArrowUpRight size={14}/></a><span>{m.song.artist}</span></p><p className="soundtrack-memory">{m.memory}</p>{m.sourceUrl && <a className="soundtrack-source" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">{m.sourceTitle || "关联记录"} <ArrowUpRight size={14}/></a>}</div>
    </article>)}</div>
  </section>;
}
