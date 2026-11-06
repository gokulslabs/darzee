import type { MeasurementDraft } from '../data/shop.ts'

const keys = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'inseam', 'length'] as const

export function MeasureForm({
  draft,
  onChange,
}: {
  draft: MeasurementDraft
  onChange: (next: MeasurementDraft) => void
}) {
  return (
    <div className="fields">
      <label className="field">
        <span>Set name</span>
        <input value={draft.label} onChange={event => onChange({ ...draft, label: event.target.value })} placeholder="Sherwani, blouse, suit…" />
      </label>
      <div className="measures">
        {keys.map(key => (
          <label className="field" key={key}>
            <span>{key} (in)</span>
            <input inputMode="decimal" value={draft[key]} onChange={event => onChange({ ...draft, [key]: event.target.value })} />
          </label>
        ))}
      </div>
      <label className="field">
        <span>Note</span>
        <textarea rows={3} value={draft.note} onChange={event => onChange({ ...draft, note: event.target.value })} />
      </label>
    </div>
  )
}
