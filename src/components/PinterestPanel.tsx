import { Search, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

interface PinterestPanelProps { open: boolean; }
interface PinterestProfile { username?: string; business_name?: string; profile_image?: string; }
interface PinterestPin { id: string; title?: string; media?: { images?: { '600x'?: { url?: string } } }; }
interface PinterestBoard { id: string; name?: string; image_cover_url?: string; pin_count?: number; }

export default function PinterestPanel({ open }: PinterestPanelProps) {
  const [profile, setProfile] = useState<PinterestProfile | null>(null);
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadContent = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pinterest/content');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pinterest 内容加载失败。');
      setProfile(data.profile);
      setBoards(data.boards || []);
      setPins(data.pins || []);
    } catch (reason) {
      setProfile(null);
      setError(reason instanceof Error ? reason.message : 'Pinterest 内容加载失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadContent(); }, []);

  const login = async () => {
    window.location.assign('/api/pinterest/login');
  };

  const logout = async () => { await fetch('/api/pinterest/logout', { method: 'POST' }); setProfile(null); setPins([]); setBoards([]); };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !query.trim()) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/pinterest/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pinterest 搜索失败。');
      setPins(data.items || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Pinterest 搜索失败。'); }
    finally { setLoading(false); }
  };

  return (
    <aside className={`absolute left-[76px] top-0 bottom-0 z-[30] w-[420px] overflow-visible rounded-r-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col overflow-hidden rounded-r-2xl bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><img src="/pinterest-mark.png" alt="Pinterest" className="h-7 w-7 object-contain" /><span className="text-[15px] font-black text-slate-900">Pinterest</span>{profile && <button type="button" onClick={() => void logout()} className="ml-auto text-slate-400 hover:text-slate-800" title="退出登录" aria-label="退出登录"><UserRound className="h-4 w-4" /></button>}</div>
        <form onSubmit={search} className="px-5 pt-4"><div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Pinterest" className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" /></div></form>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!profile ? <div className="flex min-h-full flex-col items-center justify-center text-center"><img src="/pinterest-mark.png" alt="Pinterest" className="mb-4 h-16 w-16 object-contain" /><h2 className="text-lg font-black text-slate-900">登录 Pinterest</h2><p className="mt-2 max-w-[250px] text-xs leading-relaxed text-slate-400">登录你的 Pinterest 账户后，可查看主页、画板和 Pin 内容。</p><button type="button" onClick={() => void login()} className="mt-6 rounded-full bg-[#e60023] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#c8001f]">使用 Pinterest 登录</button>{error && <p className="mt-3 max-w-[260px] text-[11px] text-red-500">{error}</p>}</div> : <><div className="mb-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">{profile.profile_image ? <img src={profile.profile_image} alt="" className="h-11 w-11 rounded-full object-cover" /> : <img src="/pinterest-mark.png" alt="" className="h-11 w-11 object-contain" />}<div><div className="text-sm font-black text-slate-900">{profile.business_name || profile.username || '你的主页'}</div><div className="mt-1 text-[11px] text-slate-400">{loading ? '正在加载 Pinterest 内容...' : `已连接 · ${boards.length} 个画板 · ${pins.length} 个 Pin`}</div></div></div>{error && <p className="mb-3 text-[11px] text-red-500">{error}</p>}<h3 className="mb-3 text-sm font-black text-slate-900">我的画板</h3><div className="mb-6 flex gap-3 overflow-x-auto">{boards.map((board) => <div key={board.id} className="w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">{board.image_cover_url && <img src={board.image_cover_url} alt="" className="h-20 w-full object-cover" />}<div className="p-2"><div className="truncate text-[11px] font-bold text-slate-700">{board.name || '未命名画板'}</div><div className="mt-1 text-[10px] text-slate-400">{board.pin_count ?? 0} Pins</div></div></div>)}</div><h3 className="mb-3 text-sm font-black text-slate-900">{loading ? '加载中...' : query ? `搜索：${query}` : '我的 Pins'}</h3><div className="columns-2 gap-3">{pins.map((pin) => { const image = pin.media?.images?.['600x']?.url; return image ? <div key={pin.id} className="mb-3 overflow-hidden rounded-xl bg-slate-100"><img src={image} alt={pin.title || 'Pinterest pin'} className="block w-full object-cover" /><span className="block px-2.5 py-2 text-[11px] font-semibold text-slate-700">{pin.title || 'Pinterest Pin'}</span></div> : null; })}</div></>}
        </div>
      </div>
    </aside>
  );
}
