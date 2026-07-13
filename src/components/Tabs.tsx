/** Onglets partagés des modules : segmentation légère pour aérer les pages denses. */
export interface TabDef<T extends string> { key: T; label: string; }

export function Tabs<T extends string>({ tabs, active, onChange }: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mod-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`mod-tab ${active === t.key ? 'on' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
