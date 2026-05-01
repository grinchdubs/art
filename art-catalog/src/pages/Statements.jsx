import { useState, useEffect } from 'react';
import { statementAPI } from '../utils/api';

const VERSION_SUGGESTIONS = ['General', 'Grant Application', 'Gallery Submission', 'Exhibition', 'Website', 'Press Kit'];

function wordCount(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

const EMPTY_FORM = { version_name: '', statement_text: '', bio_text: '', is_active: true };

function StatementForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.version_name.trim() || !form.statement_text.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const wc = wordCount(form.statement_text);

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Version Name *</label>
          <input
            list="version-suggestions"
            className="form-control"
            value={form.version_name}
            onChange={e => set('version_name', e.target.value)}
            placeholder="e.g. Grant Application"
            required
          />
          <datalist id="version-suggestions">
            {VERSION_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
            />
            <span style={{ fontSize: '14px' }}>Active</span>
          </label>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>Artist Statement *</label>
          <span style={{ fontSize: '12px', color: wc > 500 ? 'var(--warning)' : 'var(--text-muted)' }}>
            {wc} word{wc !== 1 ? 's' : ''}
          </span>
        </div>
        <textarea
          className="form-control"
          rows={8}
          value={form.statement_text}
          onChange={e => set('statement_text', e.target.value)}
          placeholder="Write your artist statement here…"
          required
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>Bio <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {wordCount(form.bio_text)} words
          </span>
        </div>
        <textarea
          className="form-control"
          rows={4}
          value={form.bio_text}
          onChange={e => set('bio_text', e.target.value)}
          placeholder="Short artist bio for portfolios and press kits…"
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving || !form.version_name.trim() || !form.statement_text.trim()}>
          {saving ? 'Saving…' : 'Save Statement'}
        </button>
      </div>
    </form>
  );
}

function StatementCard({ statement, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function copyToClipboard() {
    const text = [
      statement.bio_text ? `BIO\n${statement.bio_text}\n\n` : '',
      `STATEMENT\n${statement.statement_text}`,
    ].join('');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${statement.is_active ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      marginBottom: '12px',
    }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
              {statement.version_name}
            </span>
            {statement.is_active && (
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '3px', padding: '1px 6px' }}>
                Active
              </span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {statement.word_count} word{statement.word_count !== 1 ? 's' : ''}
            {statement.bio_text ? '  ·  bio included' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Collapse' : 'Preview'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={copyToClipboard}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(statement)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(statement.id)}>Delete</button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
          {statement.bio_text && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Bio</div>
              <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>{statement.bio_text}</p>
            </>
          )}
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Statement</div>
          <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{statement.statement_text}</p>
        </div>
      )}
    </div>
  );
}

function Statements() {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStatement, setEditingStatement] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await statementAPI.getAll();
      setStatements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(form) {
    if (editingStatement) {
      await statementAPI.update(editingStatement.id, form);
    } else {
      await statementAPI.create(form);
    }
    await load();
    setShowForm(false);
    setEditingStatement(null);
  }

  function handleEdit(statement) {
    setEditingStatement(statement);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this statement?')) return;
    await statementAPI.delete(id);
    await load();
  }

  function handleCancel() {
    setShowForm(false);
    setEditingStatement(null);
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>Artist Statements</h2>
        <button className="btn btn-primary" onClick={() => { setEditingStatement(null); setShowForm(true); }}>
          + New Statement
        </button>
      </div>

      {(showForm || editingStatement) && (
        <StatementForm
          initial={editingStatement || EMPTY_FORM}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {statements.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-state-icon">✍️</div>
          <h3>No statements yet</h3>
          <p>Save multiple versions of your artist statement for grants, galleries, and press.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Write Your First Statement
          </button>
        </div>
      ) : (
        <div>
          {statements.map(s => (
            <StatementCard
              key={s.id}
              statement={s}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Statements marked Active will be offered as defaults in the Portfolio Builder.
      </div>
    </div>
  );
}

export default Statements;
