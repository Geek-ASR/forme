import { ChevronDown, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Page, Pill, Segmented, cx } from '../../components/ui'
import { PHRASES, SHEETS } from '../../data/german'
import { speak } from '../../lib/speech'

export default function Grammar() {
  const [tab, setTab] = useState<'grammar' | 'phrases'>('grammar')
  const [open, setOpen] = useState<string | null>(SHEETS[0].id)
  return (
    <Page accent="de" back="/deutsch" title="Grammar & phrases">
      <div className="mt-1">
        <Segmented
          options={[
            { value: 'grammar', label: 'Cheat sheets' },
            { value: 'phrases', label: 'Life in Germany' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'grammar' ? (
        <div className="mt-4 space-y-2.5">
          {SHEETS.map((s) => {
            const isOpen = open === s.id
            return (
              <div key={s.id} className="overflow-hidden rounded-3xl border border-line bg-card">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15.5px] font-semibold">{s.title}</div>
                  </div>
                  <Pill tone="muted">{s.level}</Pill>
                  <ChevronDown size={18} className={cx('text-ink3 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="space-y-4 px-4 pb-4">
                    {s.intro && <p className="text-[14px] leading-relaxed text-ink2">{s.intro}</p>}
                    {s.tables?.map((t, i) => (
                      <div key={i}>
                        {t.caption && <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink3">{t.caption}</div>}
                        <div className="overflow-x-auto rounded-2xl border border-line">
                          <table className="w-full text-[13.5px]">
                            <thead>
                              <tr className="bg-card2">
                                {t.head.map((h, j) => (
                                  <th key={j} className="px-2.5 py-2 text-left font-semibold whitespace-nowrap text-ink2">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {t.rows.map((r, j) => (
                                <tr key={j} className="border-t border-line">
                                  {r.map((c, k) => (
                                    <td key={k} className={cx('px-2.5 py-2 align-top', k === 0 ? 'font-semibold whitespace-nowrap text-ink2' : 'num')}>
                                      {c}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {s.points && (
                      <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink2">
                        {s.points.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    )}
                    {s.examples?.map(([de, en]) => (
                      <button key={de} onClick={() => speak(de.replace(/\(.*?\)/g, ''))} className="press flex w-full items-start gap-3 rounded-2xl bg-acc-soft px-3 py-2.5 text-left">
                        <Volume2 size={16} className="mt-0.5 shrink-0 text-acc" />
                        <span>
                          <span className="block text-[14.5px] font-medium italic">{de}</span>
                          <span className="block text-[13px] text-ink3">{en}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {PHRASES.map((g) => (
            <div key={g.group}>
              <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink3">{g.group}</div>
              <div className="overflow-hidden rounded-3xl border border-line bg-card">
                {g.items.map(([de, en]) => (
                  <button key={de} onClick={() => speak(de)} className="press flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
                    <Volume2 size={16} className="mt-1 shrink-0 text-acc" />
                    <span>
                      <span className="block text-[15px] font-medium">{de}</span>
                      <span className="block text-[13px] text-ink3">{en}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="px-1 text-[12.5px] text-ink3">Tap any phrase to hear it. Pronunciation uses your phone's built-in German voice.</p>
        </div>
      )}
    </Page>
  )
}
