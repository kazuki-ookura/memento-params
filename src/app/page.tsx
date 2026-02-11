'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Menu, Sparkles, X, Activity, User, Settings, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDatabase, type MyDatabase } from '@/lib/db';
import { type Subscription } from 'rxjs';
import { toPng } from 'html-to-image';

// --- Types ---
interface Field {
  id: string;
  name: string;
  min: number;
  max: number;
  unit: string;
}

interface Profile {
  id: string;
  name: string;
  color: string;
}

interface Entry {
  id: string;
  profileId: string;
  label: string; // e.g. "13y", "Lv10"
  values: Record<string, number>; // fieldId -> value
  visible: boolean;
}

const COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];

const TEMPLATES = [
  {
    name: 'ビジネススキル',
    fields: [
      { name: '企画力', min: 0, max: 5, unit: 'pt' },
      { name: '実行力', min: 0, max: 5, unit: 'pt' },
      { name: '技術力', min: 0, max: 5, unit: 'pt' },
      { name: '交渉力', min: 0, max: 5, unit: 'pt' },
      { name: 'チームワーク', min: 0, max: 5, unit: 'pt' },
    ],
  },
  {
    name: 'RPGキャラ',
    fields: [
      { name: 'HP', min: 0, max: 999, unit: 'pt' },
      { name: '攻撃力', min: 0, max: 255, unit: 'pt' },
      { name: '防御力', min: 0, max: 255, unit: 'pt' },
      { name: '素早さ', min: 0, max: 255, unit: 'pt' },
      { name: '知力', min: 0, max: 255, unit: 'pt' },
    ],
  },
  {
    name: 'ワイン評価',
    fields: [
      { name: '香り', min: 0, max: 5, unit: '★' },
      { name: '酸味', min: 0, max: 5, unit: '★' },
      { name: '渋み', min: 0, max: 5, unit: '★' },
      { name: 'ボディ', min: 0, max: 5, unit: '★' },
      { name: '余韻', min: 0, max: 5, unit: '★' },
    ],
  },
  {
    name: 'サッカー選手能力',
    fields: [
      { name: 'オフェンス', min: 0, max: 99, unit: '' },
      { name: 'ドリブル', min: 0, max: 99, unit: '' },
      { name: 'パス', min: 0, max: 99, unit: '' },
      { name: 'スピード', min: 0, max: 99, unit: '' },
      { name: 'スタミナ', min: 0, max: 99, unit: '' },
      { name: 'ディフェンス', min: 0, max: 99, unit: '' },
    ],
  },
  {
    name: '健康バランス',
    fields: [
      { name: '睡眠', min: 0, max: 5, unit: '点' },
      { name: '食事', min: 0, max: 5, unit: '点' },
      { name: '運動', min: 0, max: 5, unit: '点' },
      { name: 'メンタル', min: 0, max: 5, unit: '点' },
      { name: '節制', min: 0, max: 5, unit: '点' },
    ],
  },
];

import { Suspense } from 'react';

export default function BodyDataComparisonPage() {
  return (
    <Suspense
      fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
    >
      <BodyDataComparison />
    </Suspense>
  );
}

function BodyDataComparison() {
  // --- States ---
  const [fields, setFields] = useState<Field[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [activeView, setActiveView] = useState<'chart' | 'data' | 'settings'>('chart');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null
  );

  const [db, setDb] = useState<MyDatabase | null>(null);
  const chartCardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- Initialization & Database Sync ---
  useEffect(() => {
    let subFields: Subscription;
    let subProfiles: Subscription;
    let subEntries: Subscription;

    const initDb = async () => {
      const _db = await getDatabase();
      setDb(_db);

      // Subscribe to collections
      subFields = _db.fields.find().$.subscribe((docs) => {
        if (docs.length > 0) {
          setFields(docs.map((d) => d.toJSON()));
        }
      });
      subProfiles = _db.profiles.find().$.subscribe((docs) => {
        setProfiles(docs.map((d) => d.toJSON()));
      });
      subEntries = _db.entries.find().$.subscribe((docs) => {
        setEntries(docs.map((d) => d.toJSON()));
      });
    };

    initDb();

    return () => {
      if (subFields) subFields.unsubscribe();
      if (subProfiles) subProfiles.unsubscribe();
      if (subEntries) subEntries.unsubscribe();
    };
  }, []);

  // --- Actions (DB-backed) ---
  const addField = async () => {
    if (!db) return;
    const newField: Field = {
      id: `f-${crypto.randomUUID().slice(0, 8)}`,
      name: '新しい項目',
      min: 0,
      max: 100,
      unit: '',
    };
    await db.fields.insert(newField);
  };

  const updateField = async (id: string, updates: Partial<Field>) => {
    if (!db) return;
    const doc = await db.fields.findOne(id).exec();
    if (doc) {
      await doc.patch(updates);
    }
  };

  const deleteField = async (id: string) => {
    if (!db) return;
    const doc = await db.fields.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }
  };

  const applyTemplate = async (templateFields: Omit<Field, 'id'>[]) => {
    if (!db) return;

    // 現在のデータをクリア (FieldとEntry)
    const allFields = await db.fields.find().exec();
    const allEntries = await db.entries.find().exec();
    
    // 一括削除
    await Promise.all([
      ...allFields.map((f) => f.remove()),
      ...allEntries.map((e) => e.remove())
    ]);

    // 新しい項目を生成して挿入
    const newFields: Field[] = templateFields.map((tf) => ({
      ...tf,
      id: `f-${crypto.randomUUID().slice(0, 8)}`,
    }));

    for (const nf of newFields) {
      await db.fields.insert(nf);
    }
  };

  const addProfile = async () => {
    if (!db || !newProfileName) return;
    const profile: Profile = {
      id: `p-${crypto.randomUUID().slice(0, 8)}`,
      name: newProfileName,
      color: COLORS[profiles.length % COLORS.length],
    };
    await db.profiles.insert(profile);
    setNewProfileName('');
    setIsAddingProfile(false);
  };

  const addEntry = async (profileId: string) => {
    if (!db) return;
    const lastEntry = [...entries].reverse().find((e) => e.profileId === profileId);
    let nextLabel = '';
    if (lastEntry) {
      const match = lastEntry.label.match(/(\d+)/);
      if (match) {
        nextLabel = lastEntry.label.replace(match[0], (parseInt(match[0]) + 1).toString());
      }
    }

    const entry: Entry = {
      id: `e-${crypto.randomUUID().slice(0, 8)}`,
      profileId,
      label: nextLabel || '新規記録',
      values: lastEntry ? { ...lastEntry.values } : {},
      visible: true,
    };
    await db.entries.insert(entry);
  };

  const updateEntry = async (id: string, updates: Partial<Entry>) => {
    if (!db) return;
    if (updates.visible === true) {
      const visibleCount = entries.filter((e) => e.visible).length;
      if (visibleCount >= 5) {
        alert('比較できるデータは5つまでです。');
        return;
      }
    }
    const doc = await db.entries.findOne(id).exec();
    if (doc) {
      await doc.patch(updates);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!db) return;
    const doc = await db.entries.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }
  };

  const exportImage = async () => {
    if (!chartCardRef.current) return;
    setIsExporting(true);
    try {
      // 少し待機してレンダリングを確実にする
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(chartCardRef.current, {
        backgroundColor: '#f8fafc',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `parameter-comparison-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('画像の生成に失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Charts ---
  const radarOption = useMemo(() => {
    return {
      title: { text: 'プロファイル比較 (Radar Chart)', left: 'center' },
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      radar: {
        indicator: fields.map((f) => ({ name: f.name, max: f.max })),
        center: ['50%', '50%'],
        radius: '65%',
      },
      series: [
        // ユーザー登録データ
        ...profiles.map((p) => ({
          type: 'radar',
          data: entries
            .filter((e) => e.profileId === p.id && e.visible)
            .map((e) => ({
              name: `${p.name} (${e.label})`,
              value: fields.map((f) => e.values[f.id] || 0),
              itemStyle: { color: p.color },
              areaStyle: { opacity: 0.2 },
              lineStyle: { width: 2, type: 'dashed' },
            })),
        })),
      ],
    };
  }, [fields, profiles, entries]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-50">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">
          MEMENTO PARAMS
        </h1>
        <div className="flex items-center gap-2">
          {activeView === 'chart' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-2 rounded-full border-blue-100 hover:bg-blue-50 text-blue-600"
              onClick={exportImage}
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 size={14} />
              )}
              <span className="hidden sm:inline">シェア</span>
            </Button>
          )}
          <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold px-3 py-1 text-[10px] uppercase tracking-widest">
            {activeView}
          </Badge>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto h-full p-4 lg:p-8">
          {/* 1. CHART VIEW */}
          {activeView === 'chart' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
              <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/80 backdrop-blur-sm overflow-hidden" ref={chartCardRef}>
                <CardContent className="p-2 sm:p-6">
                  <ReactECharts 
                    option={radarOption} 
                    style={{ height: '500px', width: '100%' }} 
                    notMerge={true}
                    opts={{ renderer: 'svg' }} 
                  />
                </CardContent>
              </Card>

              {/* Stats Summary (Mobile Only) */}
              <div className="grid grid-cols-2 gap-4 lg:hidden">
                {profiles.map(p => {
                  const visibleEntries = entries.filter(e => e.profileId === p.id && e.visible);
                  if (visibleEntries.length === 0) return null;
                  return (
                    <Card key={p.id} className="p-3 border-none bg-white shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[10px] font-bold truncate">{p.name}</span>
                      </div>
                      <div className="text-lg font-black">{visibleEntries.length} entries</div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. DATA VIEW */}
          {activeView === 'data' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Activity size={20} className="text-blue-500" />
                  DATA ENTRIES
                </h2>
                <div className="flex gap-2">
                  {profiles.length > 0 && (
                    <Button 
                      size="sm" 
                      className="rounded-full h-8 px-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                      onClick={() => addEntry(profiles[0].id)}
                    >
                      <Plus size={16} /> New Entry
                    </Button>
                  )}
                </div>
              </div>

              {profiles.map(profile => (
                <div key={profile.id} className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 mt-6 flex items-center gap-2 uppercase tracking-widest">
                    <div className="w-4 h-1 rounded-full" style={{ backgroundColor: profile.color }} />
                    {profile.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {entries.filter(e => e.profileId === profile.id).map(entry => (
                      <Card key={entry.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="flex flex-col p-4 bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={entry.visible}
                                onCheckedChange={(c) => updateEntry(entry.id, { visible: !!c })}
                                className="border-slate-200"
                              />
                              <Input
                                value={entry.label}
                                onChange={(e) => updateEntry(entry.id, { label: e.target.value })}
                                className="h-8 font-black border-none bg-slate-50 group-hover:bg-white focus:bg-white text-sm w-32 px-2 transition-colors"
                              />
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-300 hover:text-red-500"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2">
                            {fields.map(f => (
                              <div key={f.id} className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase font-bold text-slate-400 truncate">
                                  {f.name}
                                  {f.unit && ` (${f.unit})`}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={entry.values[f.id] || ''}
                                    onChange={(e) => {
                                      const newValues = { ...entry.values, [f.id]: parseFloat(e.target.value) || 0 };
                                      updateEntry(entry.id, { values: newValues });
                                    }}
                                    className="h-9 font-bold bg-slate-50 border-none text-xs text-center focus:ring-1 focus:ring-blue-100"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <User size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">まずは「設定」からプロファイルを登録してください</p>
                </div>
              )}
            </div>
          )}

          {/* 3. SETTINGS VIEW */}
          {activeView === 'settings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Profiles Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-800">PROFILES</h2>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full bg-slate-100" onClick={() => setIsAddingProfile(true)}>
                    <Plus size={16} />
                  </Button>
                </div>
                
                {isAddingProfile && (
                  <Card className="p-4 mb-4 border-dashed border-blue-200 bg-blue-50/30">
                    <div className="flex gap-2">
                       <Input 
                        autoFocus
                        placeholder="名前 (例: メッシ)" 
                        value={newProfileName} 
                        onChange={e => setNewProfileName(e.target.value)}
                        className="h-9 text-sm"
                       />
                       <Button size="sm" onClick={addProfile}>追加</Button>
                       <Button size="sm" variant="ghost" onClick={() => setIsAddingProfile(false)}>キャンセル</Button>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profiles.map((p, idx) => (
                    <Card key={p.id} className="p-4 border-none shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-50" style={{ color: p.color }}>
                          <User size={18} />
                        </div>
                        <span className="font-bold">{p.name}</span>
                      </div>
                      <Badge className="bg-slate-50 text-slate-400 group-hover:bg-red-50 cursor-pointer" onClick={async () => {
                         const doc = await db?.profiles.findOne(p.id).exec();
                         await doc?.remove();
                      }}>
                        <Trash2 size={12} />
                      </Badge>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Fields Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-800">FIELD SETTINGS (軸)</h2>
                  <Button size="sm" className="h-8 rounded-full bg-slate-800" onClick={addField}>
                    <Plus size={16} /> 項目追加
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fields.map(f => (
                    <Card key={f.id} className="p-4 border-none shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <Input 
                          value={f.name} 
                          onChange={e => updateField(f.id, { name: e.target.value })}
                          className="h-8 font-black border-none bg-slate-50 w-32 px-2"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => deleteField(f.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Min</label>
                          <Input type="number" value={f.min} onChange={e => updateField(f.id, { min: parseInt(e.target.value) || 0 })} className="h-8 text-xs px-2" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Max</label>
                          <Input type="number" value={f.max} onChange={e => updateField(f.id, { max: parseInt(e.target.value) || 0 })} className="h-8 text-xs px-2" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Unit</label>
                          <Input value={f.unit} onChange={e => updateField(f.id, { unit: e.target.value })} className="h-8 text-xs px-2 px-2" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">テンプレートからリセット</h3>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map(t => (
                      <Button key={t.name} variant="outline" size="sm" className="rounded-full text-xs h-9 px-4 border-slate-200 hover:border-blue-300 transition-all" onClick={() => {
                        if (confirm('全てのデータが上書きされます。よろしいですか？')) applyTemplate(t.fields);
                      }}>
                        <Sparkles size={14} className="mr-2 text-amber-500" /> {t.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* --- Memento Style Bottom Navigation --- */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-t flex items-center justify-around px-6 pb-4 pt-2 z-50">
        <NavButton active={activeView === 'chart'} onClick={() => setActiveView('chart')} icon={<Activity size={24} />} label="Chart" />
        <NavButton active={activeView === 'data'} onClick={() => setActiveView('data')} icon={<Menu size={24} />} label="Data" />
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<Settings size={24} />} label="Settings" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${active ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
    >
      <div className={`p-1 ${active ? 'bg-blue-50 rounded-xl' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>
        {label}
      </span>
      {active && <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full animate-in zoom-in" />}
    </button>
  );
}
