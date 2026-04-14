import React, { useState, useCallback } from 'react';
import {
  Wand2, Upload, X, Loader2,
  Info, AlertTriangle, Download,
} from 'lucide-react';
import { SlimeSkill, RANK_META, SkillRank } from './types';
import { generateSkill, computeCompatibility, mergedRank } from './engine';
import { SkillCard } from './SkillCard';
import { useAppContext } from '../store/AppContext';

// ── Parse Claude Desktop SKILL.md format: YAML frontmatter + Markdown body ──
function parseClaudeDesktopSkill(raw: string, filename: string): SlimeSkill {
  // Extract frontmatter between first --- and second ---
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('Invalid skill file: expected YAML frontmatter between --- markers.');

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  // Parse YAML frontmatter (simple key: value, handles multiline "> " blocks)
  const fm: Record<string, string> = {};
  const lines = frontmatter.split('\n');
  let currentKey = '';
  let multiline = '';
  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(>|>-|>|)?\s*(.*)$/);
    if (keyMatch) {
      if (currentKey && multiline) fm[currentKey] = multiline.trim().replace(/\s+/g, ' ');
      currentKey = keyMatch[1];
      multiline = '';
      const val = keyMatch[3].trim();
      if (keyMatch[2]) {
        // multiline block scalar — collect following indented lines
        multiline = val;
      } else {
        fm[currentKey] = val;
        currentKey = '';
      }
    } else if (currentKey && line.match(/^\s+/)) {
      multiline += ' ' + line.trim();
    } else {
      if (currentKey && multiline) { fm[currentKey] = multiline.trim().replace(/\s+/g, ' '); currentKey = ''; multiline = ''; }
    }
  }
  if (currentKey && multiline) fm[currentKey] = multiline.trim().replace(/\s+/g, ' ');

  const name = fm['name'] ?? filename.replace(/\.(skill|md|json)$/i, '');
  const description = fm['description'] ?? 'Claude Desktop skill';

  if (!name) throw new Error('Skill file missing "name" in frontmatter.');

  // Body becomes the system prompt — trim heading if it duplicates the name
  const systemPrompt = body
    .replace(/^#[^\n]*\n+/, '') // strip top-level heading
    .replace(/---\n+/g, '')      // strip horizontal rules
    .trim()
    .slice(0, 4000);             // cap at reasonable length

  // Extract abilities from markdown bullet lists (## Abilities / ## When to / ## What to sections)
  const abilityMatches = [...body.matchAll(/^[-*]\s+(.+)$/gm)].slice(0, 6).map(m => m[1].trim());

  return {
    id: `skill-imported-${Date.now()}`,
    name,
    description,
    systemPrompt: systemPrompt || description,
    icon: '📜',
    rank: 'normal',
    rankReason: 'Imported from Claude Desktop skill file. Rank assigned as Normal by default.',
    abilities: abilityMatches.length > 0 ? abilityMatches.slice(0, 4) : ['As described in system prompt'],
    limitations: ['Rank unverified — generated from external skill format'],
    createdAt: Date.now(),
    sourceFile: filename,
    level: 1,
    thumbsUp: 0,
    thumbsDown: 0,
    enabled: true,
    builtIn: false,
  };
}

// ── Parse Forge JSON export format ──
function parseForgeSkillJSON(raw: string, filename: string): SlimeSkill {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON or YAML. Expected a .skill file from Forge (JSON) or Claude Desktop (Markdown).');
  }
  if (!parsed.name) throw new Error('Missing "name" — not a valid Forge skill file.');
  if (!parsed.systemPrompt) throw new Error('Missing "systemPrompt" — not a valid Forge skill file.');
  const validRanks = ['normal', 'rare', 'unique', 'ultimate'];
  return {
    id: `skill-imported-${Date.now()}`,
    name: parsed.name,
    description: parsed.description ?? 'Imported skill',
    systemPrompt: parsed.systemPrompt,
    icon: parsed.icon ?? '📥',
    rank: validRanks.includes(parsed.rank) ? parsed.rank : 'normal',
    rankReason: parsed.rankReason ?? 'Imported from Forge export.',
    abilities: Array.isArray(parsed.abilities) ? parsed.abilities : [],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
    compatibleModels: parsed.compatibleModels,
    createdAt: Date.now(),
    sourceFile: filename,
    level: 1,
    thumbsUp: 0,
    thumbsDown: 0,
    enabled: true,
    builtIn: false,
  };
}

interface SkillDetailProps {
  skill: SlimeSkill;
  onClose: () => void;
}

const SkillDetail: React.FC<SkillDetailProps> = ({ skill, onClose }) => {
  const meta = RANK_META[skill.rank];
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: meta.bg,
          border: `1px solid ${meta.color}66`,
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: `0 0 40px ${meta.glow}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 32 }}>{skill.icon}</span>
            <div>
              <h2 style={{ color: meta.color, fontSize: 18, fontWeight: 700, margin: 0 }}>{skill.name}</h2>
              <span style={{
                display: 'inline-block', marginTop: 4,
                background: meta.badge, color: meta.badgeText,
                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{meta.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(200,200,220,0.6)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <Section title="Description" color={meta.color}>
          <p style={{ fontSize: 13, color: 'rgba(200,210,220,0.8)', lineHeight: 1.6, margin: 0 }}>{skill.description}</p>
        </Section>

        <Section title="Rank Verdict" color={meta.color}>
          <p style={{ fontSize: 13, color: 'rgba(200,210,220,0.8)', lineHeight: 1.5, margin: 0 }}>{skill.rankReason}</p>
        </Section>

        <Section title="System Prompt" color={meta.color}>
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12,
            fontFamily: 'monospace', fontSize: 12,
            color: 'rgba(180,200,220,0.85)', lineHeight: 1.6,
            border: `1px solid ${meta.border}`,
          }}>
            {skill.systemPrompt}
          </div>
        </Section>

        {skill.abilities.length > 0 && (
          <Section title="Abilities" color={meta.color}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {skill.abilities.map((ab, i) => (
                <li key={i} style={{ fontSize: 13, color: 'rgba(200,210,220,0.8)', marginBottom: 4 }}>{ab}</li>
              ))}
            </ul>
          </Section>
        )}

        {skill.limitations.length > 0 && (
          <Section title="Limitations" color="#FC8181">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {skill.limitations.map((l, i) => (
                <li key={i} style={{ fontSize: 13, color: 'rgba(220,160,160,0.8)', marginBottom: 4 }}>{l}</li>
              ))}
            </ul>
          </Section>
        )}

        {skill.compatibleModels && (
          <Section title="Compatible Models" color={meta.color}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skill.compatibleModels.map((m, i) => (
                <span key={i} style={{
                  background: meta.badge, color: meta.badgeText,
                  fontSize: 12, padding: '3px 10px', borderRadius: 20,
                  border: `1px solid ${meta.border}`,
                }}>{m}</span>
              ))}
            </div>
          </Section>
        )}

        {skill.isMerged && skill.mergedFrom && (
          <Section title="Merged From" color="#B794F4">
            <p style={{ fontSize: 12, color: 'rgba(200,180,240,0.7)', margin: 0 }}>{skill.mergedFrom.join(' + ')}</p>
          </Section>
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div style={{ marginBottom: 16 }}>
    <h4 style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>{title}</h4>
    {children}
  </div>
);

const RANK_FILTERS: Array<SkillRank | 'all'> = ['all', 'normal', 'rare', 'unique', 'ultimate', 'terminal'];

export const SkillForge: React.FC = () => {
  const { providers, activeModel } = useAppContext();

  const [skills, setSkills] = useState<SlimeSkill[]>([
    {
      id: 'gluttony',
      name: 'Gluttony',
      description: 'Consumes and merges compatible skills into a unified, superior form.',
      systemPrompt: 'You are governed by the Unique Skill: Gluttony. You can absorb compatible skills and merge their capabilities. When skills are merged, synthesize their system prompts intelligently, combining the best of both into a coherent unified directive.',
      icon: '∞',
      rank: 'unique',
      rankReason: 'Default Unique Skill — Gluttony is hardcoded as Unique. It enables the merging of 2 or more compatible skills.',
      abilities: ['Skill absorption', 'Multi-skill synthesis', 'Compatibility analysis', 'Rank preservation'],
      limitations: ['Only merges skills with ≥0.95 compatibility', 'Cannot downgrade merged rank'],
      createdAt: Date.now(),
      level: 1,
      thumbsUp: 0,
      thumbsDown: 0,
      enabled: true,
      builtIn: true,
    }
  ]);

  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<SkillRank | 'all'>('all');
  const [detailSkill, setDetailSkill] = useState<SlimeSkill | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string | null>(null);
  const [gluttonyMode, setGluttonyMode] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [importError, setImportError] = useState('');

  const activeProvider = providers.find(p => activeModel?.provider === p.id);

  const compatMap = React.useMemo(() => {
    if (!selectedForMerge) return new Map<string, number>();
    const src = skills.find(s => s.id === selectedForMerge);
    if (!src) return new Map<string, number>();
    return new Map(
      skills
        .filter(s => s.id !== selectedForMerge)
        .map(s => [s.id, computeCompatibility(src, s).score])
    );
  }, [selectedForMerge, skills]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) { setError('Describe the skill first.'); return; }
    if (!activeModel) { setError('Select a model first.'); return; }
    if (!activeProvider) { setError('No active provider.'); return; }

    setGenerating(true);
    setGenLog('');
    setError('');

    const provider = activeProvider;

    try {
      setGenLog(`[${provider.name}/${activeModel.id}] Rolling rank...`);
      const result = await generateSkill(
        description,
        activeModel.id,
        provider.id,
        provider.apiKey,
        provider.baseUrl,
        chunk => setGenLog(prev => prev + chunk),
      );
      setGenLog(prev => prev + `\n✓ Rank: ${result.rank.toUpperCase()}`);

      const newSkill: SlimeSkill = {
        ...result,
        id: `skill-${Date.now()}`,
        createdAt: Date.now(),
      };

      setSkills(prev => [newSkill, ...prev]);
      setDescription('');
    } catch (e: any) {
      setError(e.message ?? 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  }, [description, activeModel, activeProvider]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['skill', 'json', 'md'].includes(ext ?? '')) {
      setImportError(`Unsupported file type ".${ext}". Accepts: .skill (Claude Desktop or Forge export), .md, .json`);
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setImportError('File too large (>1MB). Did you upload a zip?');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;

        // Detect binary / zip (PK magic bytes)
        if (raw.startsWith('PK') || (raw.charCodeAt(0) === 0x50 && raw.charCodeAt(1) === 0x4B)) {
          throw new Error('This is a zip archive, not a skill file.');
        }

        let imported: SlimeSkill;

        // ── Format A: YAML frontmatter + Markdown body (Claude Desktop .skill / SKILL.md) ──
        if (raw.trimStart().startsWith('---')) {
          imported = parseClaudeDesktopSkill(raw, file.name);
        }
        // ── Format B: JSON (Forge export) ──
        else {
          imported = parseForgeSkillJSON(raw, file.name);
        }

        setSkills(prev => [imported, ...prev]);
        setImportError('');
      } catch (err: any) {
        setImportError(err.message ?? 'Failed to parse skill file.');
      }
    };
    reader.onerror = () => setImportError('Could not read file.');
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleExport = useCallback((skill: SlimeSkill) => {
    const blob = new Blob([JSON.stringify(skill, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name.replace(/\s+/g, '-').toLowerCase()}.skill`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const toggleGluttony = () => {
    setGluttonyMode(g => !g);
    setSelectedForMerge(null);
    setMergeTargets(new Set());
  };

  const handleSelectForMerge = (id: string) => {
    if (!gluttonyMode) return;
    if (!selectedForMerge) {
      setSelectedForMerge(id);
    } else if (selectedForMerge === id) {
      setSelectedForMerge(null);
      setMergeTargets(new Set());
    } else {
      const score = computeCompatibility(
        skills.find(s => s.id === selectedForMerge)!,
        skills.find(s => s.id === id)!
      ).score;
      if (score >= 0.95) {
        setMergeTargets(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      }
    }
  };

  const handleMerge = useCallback(async () => {
    if (!selectedForMerge || mergeTargets.size === 0) return;
    setMerging(true);
    const allIds = [selectedForMerge, ...mergeTargets];
    const toMerge = allIds.map(id => skills.find(s => s.id === id)!).filter(Boolean);
    const rank = mergedRank(toMerge);
      const mergedSkill: SlimeSkill = {
        id: `skill-merged-${Date.now()}`,
        name: `${toMerge[0].name} [Devoured]`,
        description: `Merged: ${toMerge.map(s => s.name).join(' + ')}`,
        systemPrompt: `[Gluttony Synthesis]\n${toMerge.map(s => s.systemPrompt).join('\n\n')}`,
        icon: '∞',
        rank,
        rankReason: `Merged ${toMerge.length} skills via Gluttony. Rank elevated to ${rank.toUpperCase()}.`,
        abilities: [...new Set(toMerge.flatMap(s => s.abilities))],
        limitations: [...new Set(toMerge.flatMap(s => s.limitations))],
        isMerged: true,
        mergedFrom: toMerge.map(s => s.name),
        createdAt: Date.now(),
        level: 1,
        thumbsUp: 0,
        thumbsDown: 0,
        enabled: true,
        builtIn: false,
      };

    await new Promise(r => setTimeout(r, 800));
    setSkills(prev => [mergedSkill, ...prev]);
    setSelectedForMerge(null);
    setMergeTargets(new Set());
    setGluttonyMode(false);
    setMerging(false);
  }, [selectedForMerge, mergeTargets, skills]);

  const filtered = skills.filter(s => filter === 'all' || s.rank === filter);

  const rankCounts: Record<string, number> = { all: skills.length };
  skills.forEach(s => { rankCounts[s.rank] = (rankCounts[s.rank] ?? 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, #0f1723 0%, #0d1117 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚗️</span> Skill Forge
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <label
              htmlFor="skill-import"
              title="Import .skill (Claude Desktop or Forge) or .md file"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(180,200,220,0.7)',
                fontSize: 12, fontWeight: 500,
              }}
            >
              <Upload size={13} /> Import
            </label>
            <input id="skill-import" type="file" accept=".skill,.json,.md" onChange={handleImport} style={{ display: 'none' }} />

            <button
              onClick={toggleGluttony}
              title="Gluttony: merge compatible skills"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                background: gluttonyMode ? 'rgba(107,70,193,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${gluttonyMode ? '#6B46C1' : 'rgba(255,255,255,0.1)'}`,
                color: gluttonyMode ? '#D6BCFA' : 'rgba(180,200,220,0.7)',
                fontSize: 12, fontWeight: 500,
              }}
            >
              ∞ Gluttony
            </button>
          </div>
        </div>

        {/* Generator */}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe a skill… (e.g. 'analyze code for performance bottlenecks')"
            disabled={generating}
            rows={2}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 10px',
              color: '#e2e8f0', fontSize: 13,
              resize: 'none', outline: 'none', fontFamily: 'inherit',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !activeModel}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: generating ? 'rgba(99,179,237,0.15)' : 'rgba(99,179,237,0.2)',
              border: '1px solid rgba(99,179,237,0.4)',
              color: '#90CDF4', cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              flexShrink: 0, alignSelf: 'flex-end', height: 38,
            }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {generating ? 'Forging…' : 'Forge'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(220,80,80,0.1)', border: '1px solid rgba(220,80,80,0.3)', color: '#FC8181', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        {importError && (
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(220,80,80,0.1)', border: '1px solid rgba(220,80,80,0.3)', color: '#FC8181', fontSize: 12 }}>
            {importError}
          </div>
        )}
        {genLog && !generating && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(160,200,160,0.6)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {genLog}
          </div>
        )}

        {!activeModel && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(200,200,100,0.7)', display: 'flex', gap: 5, alignItems: 'center' }}>
            <Info size={12} /> Select a model to begin forging skills.
          </div>
        )}
      </div>

      {/* Gluttony banner */}
      {gluttonyMode && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(107,70,193,0.15)',
          borderBottom: '1px solid rgba(107,70,193,0.3)',
          fontSize: 12,
        }}>
          {!selectedForMerge ? (
            <span style={{ color: '#D6BCFA' }}>∞ Select a skill to be the <b>base</b> of the merge.</span>
          ) : mergeTargets.size === 0 ? (
            <span style={{ color: '#D6BCFA' }}>
              Base: <b style={{ color: '#B794F4' }}>{skills.find(s => s.id === selectedForMerge)?.name}</b> — now select compatible targets (≥95%).
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#D6BCFA' }}>
                <b>{mergeTargets.size + 1} skills</b> ready to merge.
              </span>
              <button
                onClick={handleMerge}
                disabled={merging}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8,
                  background: 'rgba(107,70,193,0.4)', border: '1px solid #6B46C1',
                  color: '#D6BCFA', cursor: merging ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {merging ? <Loader2 size={12} className="animate-spin" /> : '∞'}
                {merging ? 'Devouring…' : 'Devour & Merge'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rank filter */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {RANK_FILTERS.map(f => {
          const meta = f === 'all' ? null : RANK_META[f];
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: active ? (meta?.badge ?? 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? (meta?.color ?? 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.1)'}`,
                color: active ? (meta?.badgeText ?? '#e2e8f0') : 'rgba(180,200,220,0.5)',
                letterSpacing: '0.05em',
              }}
            >
              {f} ({rankCounts[f] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Skill list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(180,200,220,0.3)' }}>
            <Wand2 size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 13 }}>No skills forged yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(skill => {
              const compatScore = gluttonyMode && selectedForMerge ? compatMap.get(skill.id) : undefined;
              const isSelected = skill.id === selectedForMerge || mergeTargets.has(skill.id);

              return (
                <div key={skill.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <SkillCard
                      skill={skill}
                      isSelected={isSelected}
                      compatScore={compatScore}
                      onSelect={() => {
                        if (gluttonyMode) handleSelectForMerge(skill.id);
                        else setDetailSkill(skill);
                      }}
                      onDelete={skill.id === 'gluttony' ? undefined : () => setSkills(prev => prev.filter(s => s.id !== skill.id))}
                      showCompat={gluttonyMode && selectedForMerge !== null && skill.id !== selectedForMerge}
                    />
                  </div>
                  {!gluttonyMode && (
                    <button
                      title="Export skill"
                      onClick={() => handleExport(skill)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '8px 7px',
                        color: 'rgba(180,200,220,0.4)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#90CDF4')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(180,200,220,0.4)')}
                    >
                      <Download size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailSkill && <SkillDetail skill={detailSkill} onClose={() => setDetailSkill(null)} />}
    </div>
  );
};
