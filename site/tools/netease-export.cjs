const fs = require('node:fs');
const path = require('node:path');
process.umask(0o077);
for (const method of ['log', 'info', 'warn', 'error', 'debug']) console[method] = () => {};
const args = process.argv.slice(2);
const option = (name, fallback) => { const i=args.indexOf(name); return i<0 ? fallback : args[i+1]; };
const sessionPath = option('--session', 'session.json');
const out = option('--out', 'library-export.json');
const months = option('--months', '').split(',').filter(Boolean);
const emit = (x) => process.stdout.write(JSON.stringify(x)+'\n');
function cleanCover(value) {
  if (!value) return '';
  const url = new URL(value);
  return /^p\d+\.music\.126\.net$/.test(url.hostname) ? 'https://' + url.hostname + url.pathname : '';
}
function song(s) {
  return { id: String(s.id || s.songId), title: s.name || s.songName, artist: (s.ar || s.artists || []).map(a=>a.name || a.artistName).join(' / '), album: s.al?.name || s.albumName || '', cover: cleanCover(s.al?.picUrl || s.picUrl || ''), ...(s.playCount != null ? { playCount: s.playCount } : {}) };
}
async function main() {
  for(const month of months) if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)) throw new Error('月份格式需要为 YYYY-MM');
  const api = require('@neteasecloudmusicapienhanced/api');
  const { cookie } = JSON.parse(fs.readFileSync(sessionPath,'utf8'));
  if(!cookie) throw new Error('需要登录会话');
  async function call(name, input={}) {
    try {
      const response=await api[name]({ ...input, cookie, timestamp:Date.now() });
      if(response.body?.code!==200) throw new Error();
      return response.body;
    } catch { throw new Error(`${name} 请求失败，请检查登录状态后重试`); }
  }
  const account=await call('user_account');
  const uid=account.account?.id || account.profile?.userId;
  if(!uid) throw new Error('登录已过期');
  const playlists=[];
  let offset=0, more=true;
  while(more) {
    const r=await call('user_playlist',{uid,limit:100,offset});
    const items=r.playlist || [];
    for(const p of items) if(!playlists.some(x=>x.id===String(p.id))) playlists.push({id:String(p.id),title:p.name,cover:cleanCover(p.coverImgUrl),songCount:p.trackCount,songs:[]});
    offset+=items.length;
    more=!!r.more && items.length>0;
    if(playlists.length>500 || offset>1000) throw new Error('歌单分页超过安全上限');
  }
  for(const p of playlists) {
    for(let offset=0; offset<p.songCount; offset+=500) {
      const r=await call('playlist_track_all',{id:p.id,limit:500,offset});
      const songs=r.songs || [];
      p.songs.push(...songs.map(song));
      if(!songs.length) break;
      if(p.songs.length>20000) throw new Error('歌单过大，请分批导出');
    }
  }
  const r=await call('record_recent_song',{limit:300});
  const recent=(r.data?.list || []).map(x=>({...song(x.data),playTime:x.playTime}));
  const reports=[];
  for(const period of months) {
    const [y,m]=period.split('-').map(Number);
    const endTime=Date.UTC(y,m,1)-28800000-1;
    const [raw,rank]=await Promise.all([call('listen_data_report',{type:'month',endTime}),call('listen_data_song_play_rank',{type:'month',endTime})]);
    const d=raw.data;
    const returnedPeriod=new Date(d.startTime+28800000).toISOString().slice(0,7);
    if(returnedPeriod!==period) throw new Error(`请求 ${period}，服务器返回其他月份`);
    const groups=(items,name,value)=>(items || []).map(x=>({name:String(x[name] || ''),value:String(x[value] ?? '')}));
    reports.push({period,startTime:d.startTime,endTime:d.endTime,durationText:d.listenTimeBlock?.playDurationText || '',listenDays:d.listenTimeDistributionBlock?.listenDays || 0,songs:(rank.data?.songItems || []).map(song),styles:groups(d.topStyleBlock?.sections,'genreName','percent'),languages:groups(d.topLanguageBlock?.sections,'language','percent'),ages:groups(d.topAgeBlock?.sections,'age','playSongNum'),days:(d.listenTimeDistributionBlock?.durationDetails || []).map(x=>({date:String(x.period),duration:x.duration}))});
  }
  const result={version:1,observedAt:new Date().toISOString(),playlists,recent,reports};
  fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true,mode:0o700});
  const temp=out+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(result),{mode:0o600});
  fs.renameSync(temp,out);
  emit({status:'exported',playlists:playlists.length,songs:playlists.reduce((n,p)=>n+p.songs.length,0),recent:recent.length,months:reports.map(x=>x.period),incompletePlaylists:playlists.filter(p=>p.songs.length<p.songCount).length});
}
main().catch(e=>{emit({status:'failed',message:e.message});process.exitCode=1;});
