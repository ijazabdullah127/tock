import { useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Explain, Sum, Why } from "@/components/Explain";
import { scoreParts, STATS } from "@/lib/explain";
import { KindsHelp } from "@/components/KindsHelp";
import { Change, Empty, Panel } from "@/components/Panel";
import { Donut } from "@/components/charts/Donut";
import { GoalRings } from "@/components/charts/GoalRings";
import { HourBars } from "@/components/charts/HourBars";
import { Timeline, type Highlight } from "@/components/charts/Timeline";
import { TimeTable } from "@/components/Tables";
import { LabelSheet, type Target } from "@/components/LabelSheet";
import { Replay } from "@/components/Replay";
import { AgentsAndBudgets } from "@/components/AgentsBudgets";
import { DayDial } from "@/components/charts/DayDial";
import { FocusPanel } from "@/components/FocusControl";
import { NextMoves } from "@/components/NextMoves";
import { useLive } from "@/lib/live";
import { moves } from "@/lib/moves";
import { Button } from "@/components/ui/button";
import { useApi, type Day } from "@/lib/api";
import { addDays, delta, dur, hhmm, parseDate } from "@/lib/format";
import { go } from "@/lib/route";
import { fit, type Win } from "@/lib/zoom";
import { byKindRows, kindColor, kindHelp, kindLabel } from "@/lib/kinds";
import { onDay } from "@/lib/outage";
import { useGroups } from "@/lib/groups";
import { cn } from "@/lib/utils";

export default function Today({ date, tick }: { date: string; tick: number }) {
  const { data: d, error, loading, reload } = useApi<Day>(`/api/day?date=${date}`, tick);
  const [target, setTarget] = useState<Target | null>(null);
  const { focus } = useGroups();
  const { inboxMS } = useLive();
  // The timeline's zoom and what it picks out, both cleared on another day.
  const [win, setWin] = useState<{ date: string; w: Win } | null>(null);
  const [hl, setHl] = useState<{ date: string; h: Highlight } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [replay, setReplay] = useState<string | null>(null); // the date being replayed

  const apps = useMemo(() => {
    if (!d) return [];
    const m = new Map<string, { ms: number; kind: string }>();
    const day0 = parseDate(d.date).getTime(), day1 = addDays(parseDate(d.date), 1).getTime();
    for (const r of d.timeline) {
      if (r.idle) continue;
      const ms = Math.min(r.end, day1) - Math.max(r.start, day0); // a run from before midnight counts from midnight
      if (ms <= 0) continue;
      const a = m.get(r.app) ?? { ms: 0, kind: r.kind };
      a.ms += ms;
      m.set(r.app, a);
    }
    return [...m.entries()].map(([name, a]) => ({ name, ...a })).sort((a, b) => b.ms - a.ms);
  }, [d]);

  if (error) return <Empty>Couldn't load this day: {error}</Empty>;
  if (loading && !d) return <TodaySkeleton />;
  if (!d) return null;
  if (d.firstRun) return <Empty>Nothing recorded yet. Leave tock running for a few minutes and this page fills in.</Empty>;

  const u = d.usual;
  const now = Date.now();
  const day0 = parseDate(d.date).getTime();
  // A new entry starts as the half hour before now, or 09:00–10:00 on a past day.
  const addTime = () => {
    const to = d.today ? Math.floor(now / 60_000) * 60_000 : day0 + 10 * 3_600_000;
    const from = Math.max(day0, to - (d.today ? 1_800_000 : 3_600_000));
    setTarget({ title: "Add time", sub: "Time tock didn't see: a meeting, a call, paper.", range: { date: d.date, from, to, mode: "add" } });
  };
  const kindRows = byKindRows(d.byKind);
  const kinds = kindRows.map((k) => ({ name: kindLabel(k.kind), ms: k.ms, color: kindColor(k.kind), kind: k.kind, hint: kindHelp(k.kind) }));
  const zoom = win?.date === d.date ? win.w : null;
  const highlight = hl?.date === d.date ? hl.h : null;
  const bounds = { from: day0 + d.hourFirst * 3_600_000, to: day0 + (d.hourLast + 1) * 3_600_000 };
  // zoomTo points the timeline at a range and brings it into view.
  const zoomTo = (from: number, to: number) => {
    setWin({ date: d.date, w: fit(from, to, bounds) });
    timelineRef.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const pickOut = (h: Highlight) => setHl((x) => (x?.date === d.date && x.h.label === h.label ? null : { date: d.date, h }));
  const sph = d.score.switchesPerHour;
  const notRec = onDay(d.outages, day0, day0 + 86_400_000).ms;
  const help = statHelp(d);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel className="anim-rise" label={d.today ? "Your day so far" : "Around the clock"} aside="click an hour">
          <DayDial d={d} onHour={(h) => zoomTo(day0 + h * 3_600_000, day0 + (h + 1) * 3_600_000)} />
        </Panel>
        <Panel className="anim-rise [animation-delay:60ms]" label={focus ? "Focus score" : "The day"} aside={focus ? <ScoreHelp d={d} /> : undefined}>
          {focus && (
          <>
          <div className="num text-[56px] font-semibold leading-none tracking-[-0.03em]">{d.score.value}</div>
          <div className="mt-1.5 text-sm">
            {u ? (
              <>
                <Change v={d.score.value - u.score} text={`${d.score.value - u.score >= 0 ? "+" : "−"}${Math.abs(d.score.value - u.score)}`} />{" "}
                <span className="text-muted-foreground">vs your usual {new Date(d.date).toLocaleDateString("en-GB", { weekday: "long" })} ({u.score})</span>
              </>
            ) : (
              <span className="text-muted-foreground">No usual day to compare with yet</span>
            )}
          </div>
          </>
          )}
          <dl className={cn("grid grid-cols-[1fr_auto_auto] gap-x-3.5 gap-y-2", focus && "mt-5")}>
            <Stat k="Focus time" v={dur(d.stats.focusMS)} c={u ? d.stats.focusMS - u.focusMS : null} help={help.focus} />
            <Stat k="Longest block" v={dur(d.stats.longestMS)} c={u ? d.stats.longestMS - u.longestMS : null} help={help.longest} />
            <Stat k="Distracting" v={dur(d.stats.distractMS)} c={u ? d.stats.distractMS - u.distractMS : null} lowerIsGood help={help.distract} />
            <dt><Explain title="Switches / hour" label="Switches / hour">{help.switches}</Explain></dt>
            <dd className="num text-right">{sph.toFixed(1)}</dd>
            <dd className="num text-right text-xs">{u ? <Change v={sph - u.switchesPerHour} text={(sph - u.switchesPerHour >= 0 ? "+" : "−") + Math.abs(sph - u.switchesPerHour).toFixed(1)} lowerIsGood /> : null}</dd>
          </dl>
        </Panel>

        {d.today && focus ? (
          <Panel className="anim-rise [animation-delay:120ms] lg:col-span-2 xl:col-span-1" label="Focus" aside={<kbd className="rounded border bg-secondary px-1 font-sans text-[10px]">f</kbd>}>
            <FocusPanel />
          </Panel>
        ) : (
        <Panel className="anim-rise [animation-delay:120ms] lg:col-span-2 xl:col-span-1" label="Kinds of time" aside={<KindsHelp />}>
          {kinds.length ? (
            <Donut data={kinds} center={dur(kinds.reduce((s, k) => s + k.ms, 0))} sub="tracked" active={highlight?.kind !== undefined ? highlight.label : null}
              onSelect={(name) => { const k = kindRows.find((x) => kindLabel(x.kind) === name); if (k) pickOut({ kind: k.kind, label: name }); }} />
          ) : <Empty>Nothing labelled yet.</Empty>}
        </Panel>
        )}
      </div>

      <NextMoves moves={moves({ inboxMS, goals: d.goals, today: d.today })} />

      <div ref={timelineRef} className="scroll-mt-4">
      <Panel
        label="Timeline"
        aside={
          <span className="flex items-center gap-3">
            {highlight && (
              <button className="flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground hover:bg-accent" onClick={() => setHl(null)} title="Show everything">
                Showing {highlight.label} <X className="h-3 w-3" />
              </button>
            )}
            <TotalsHelp d={d} notRec={notRec} />
            {d.timeline.length > 0 && (
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setReplay(replay === d.date ? null : d.date)}>Replay</Button>
            )}
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={addTime}>Add time</Button>
          </span>
        }
      >
        {d.timeline.length || notRec > 0 ? (
          <>
            <Timeline rows={d.timeline} outages={d.outages} date={d.date} first={d.hourFirst} last={d.hourLast} today={d.today}
              win={zoom} onWin={(w) => setWin(w ? { date: d.date, w } : null)} highlight={highlight}
              onPick={(r) => setTarget({
                title: r.idle ? "Away" : r.app,
                sub: r.idle ? "Label it to count it as worked." : `${r.text ? r.text + " · " : ""}${hhmm(r.start)}–${hhmm(r.end)}${r.invoice ? ` · on invoice ${r.invoice}` : ""}`,
                ids: r.idle ? undefined : r.ids,
                range: { date: d.date, from: Math.max(r.start, day0), to: Math.min(r.end, now, day0 + 86_400_000) },
              })}
              onRange={(from, to) => setTarget({ title: "Edit the timeline", range: { date: d.date, from, to } })} />
            <p className="mt-3 text-xs text-faint">
              Click a bar to label or delete it, drag across the lanes to pick a range. ⌘-scroll or pinch to zoom, or click a lane's name.
              {d.billedMS ? ` Underlined: ${dur(d.billedMS)} on issued invoices, which stay as issued.` : ""}
            </p>
          </>
        ) : (
          <Empty>No activity on this day.</Empty>
        )}
      </Panel>
      </div>

      {replay === d.date && (
        <Replay key={d.date} rows={d.timeline} from={bounds.from} to={d.today ? Math.min(now, bounds.to) : bounds.to} onClose={() => setReplay(null)} />
      )}

      <div className={cn("grid gap-5", d.today && focus && "lg:grid-cols-2")}>
        <Panel label="Minutes per hour" aside="click an hour to zoom">
          <HourBars hours={d.hours} first={d.hourFirst} last={d.hourLast} onHour={(h) => zoomTo(day0 + h * 3_600_000, day0 + (h + 1) * 3_600_000)} />
        </Panel>

        {d.today && focus && (
        <Panel label="Kinds of time" aside={<KindsHelp />}>
          {kinds.length ? (
            <Donut data={kinds} center={dur(kinds.reduce((s, k) => s + k.ms, 0))} sub="tracked" active={highlight?.kind !== undefined ? highlight.label : null}
              onSelect={(name) => { const k = kindRows.find((x) => kindLabel(x.kind) === name); if (k) pickOut({ kind: k.kind, label: name }); }} />
          ) : <Empty>Nothing labelled yet.</Empty>}
        </Panel>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel label="Goals" aside={
          <span className="flex items-center gap-3">
            {d.goals.length > 0 && <GoalsHelp goals={d.goals} />}
            <button className="underline-offset-2 hover:text-foreground hover:underline" onClick={() => go({ view: "library", sub: "goals" })}>Edit</button>
          </span>
        }>
          {d.goals.length ? <GoalRings goals={d.goals} /> : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No goals yet: set a time to reach, or a limit, for a category or a project.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => go({ view: "library", sub: "goals" })}>Add a goal</Button>
            </div>
          )}
        </Panel>
        <Panel label="Categories">
          <TimeTable head="Category" rows={d.categories.map((c) => ({ name: c.name || "Unlabelled", ms: c.ms, kind: c.kind }))}
            rowHint="Show it on the timeline" active={highlight?.category ?? null}
            onRow={(r) => pickOut({ category: r.name, label: r.name })} />
        </Panel>
        <Panel label="Apps">
          <TimeTable head="App" rows={apps} rowHint="Show it on the timeline" active={highlight?.app ?? null}
            onRow={(r) => pickOut({ app: r.name, label: r.name })} />
        </Panel>
      </div>

      {d.blocks.length > 0 && (
        <Panel label="Work blocks" aside={
          <span className="flex items-center gap-3">
            <Explain title="Work blocks" label="What a block is" align="end">
              <Why>A stretch of work on one thing, named for its project, else its category, with the apps and sites that took most of it.</Why>
              <Why>The first time is all the activity in the block; the second is the Deep time in it.</Why>
            </Explain>
            <span>click one to see it on the timeline</span>
          </span>
        }>
          <ul className="divide-y">
            {d.blocks.map((b) => (
              <li key={b.start}>
                <button className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => zoomTo(b.start, b.end)}>
                <span className="num w-28 shrink-0 text-muted-foreground">{hhmm(b.start)}–{hhmm(b.end)}</span>
                <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: kindColor(b.kind) }} />
                <span className="min-w-0 flex-1 truncate">
                  {b.name}
                  <span className="ml-2 text-muted-foreground">{b.top.slice(0, 3).map((t) => t.name).join(", ")}</span>
                </span>
                <span className="num">{dur(b.activeMS)}</span>
                <span className="num w-20 text-right text-muted-foreground">{dur(b.deepMS)} deep</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <AgentsAndBudgets date={d.date} tick={tick} />
      <LabelSheet target={target} onClose={() => setTarget(null)} onDone={reload} />
    </div>
  );
}

/** ScoreHelp opens what the score is made of, as tock explain score does:
 *  each weighted part and its points, their sum, and the distraction penalty. */
function ScoreHelp({ d }: { d: Day }) {
  const p = scoreParts(d.score);
  const pc = (v: number) => `${Math.round(v * 100)} %`;
  const pts = (v: number) => (Math.round(v * 10) / 10).toString();
  const browse = d.byKind.browse ?? 0;
  return (
    <Explain title={`Focus score ${p.value}`} label="How it's scored" align="end" wide>
      <Why>Each part is scored 0–100 %, weighted (config.toml [score]) and added up. Distraction then takes points off.</Why>
      <table className="w-full text-left">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="pb-1 font-normal">Part</th><th className="pb-1 pl-3 text-right font-normal">Weight</th><th className="pb-1 pl-3 text-right font-normal">Scored</th><th className="pb-1 pl-3 text-right font-normal">Points</th></tr>
        </thead>
        <tbody>
          {p.parts.map((x) => (
            <tr key={x.key} className="align-top">
              <td className="py-0.5 pr-2">{x.name}<div className="text-xs text-muted-foreground">{x.detail}</div></td>
              <td className="num whitespace-nowrap py-0.5 pl-3 text-right">{pc(x.weight)}</td>
              <td className="num whitespace-nowrap py-0.5 pl-3 text-right">{pc(x.value)}</td>
              <td className="num whitespace-nowrap py-0.5 pl-3 text-right">{pts(x.points)}</td>
            </tr>
          ))}
          <tr className="border-t"><td className="pt-1" colSpan={3}>Sum, rounded</td><td className="num pt-1 text-right">{p.rounded}</td></tr>
          <tr className="align-top">
            <td className="py-0.5 pr-2" colSpan={3}>
              Distraction
              <div className="text-xs text-muted-foreground">
                {dur(d.stats.distractMS)} distracting{browse ? ` and a third of ${dur(browse)} browsing` : ""}: a point for every {STATS.penaltyPerMin} minutes, at most {STATS.penaltyCap}
              </div>
            </td>
            <td className="num py-0.5 text-right">{p.penalty ? `−${p.penalty}` : "0"}</td>
          </tr>
          <tr className="border-t font-medium"><td className="pt-1" colSpan={3}>Score</td><td className="num pt-1 text-right">{p.value}</td></tr>
        </tbody>
      </table>
      <Usual d={d} />
    </Explain>
  );
}

/** Usual says what the changes are against. */
function Usual({ d }: { d: Day }) {
  const wd = parseDate(d.date).toLocaleDateString("en-GB", { weekday: "long" });
  if (!d.usual) return <Why>Changes appear once two past {wd}s have time tracked.</Why>;
  return <Why>Changes are against your usual {wd}: the median of {d.usual.days} past {wd}s with time tracked, from the last {STATS.usualWeeks} weeks.</Why>;
}

function Stat({ k, v, c, lowerIsGood, help }: { k: string; v: string; c: number | null; lowerIsGood?: boolean; help: ReactNode }) {
  return (
    <>
      <dt><Explain title={k} label={k}>{help}</Explain></dt>
      <dd className="num text-right">{v}</dd>
      <dd className="num text-right text-xs">{c === null ? null : <Change v={c} text={delta(c)} lowerIsGood={lowerIsGood} />}</dd>
    </>
  );
}

/** statHelp is what each of the day's numbers counts. */
function statHelp(d: Day): Record<"focus" | "longest" | "distract" | "switches", ReactNode> {
  const s = d.stats;
  const distracting = d.categories.filter((c) => c.kind === "distract" && c.ms > 0);
  return {
    focus: (
      <>
        <Why>Deep time in focus blocks: runs of Deep time that hold at least {STATS.blockMinMin}m of it, where a break shorter than {STATS.toleranceS / 60}m does not end the run. Deep time outside a block does not count.</Why>
        <Sum rows={[["All Deep time", dur(s.deepMS)], ["Outside a block", dur(Math.max(0, s.deepMS - s.focusMS))]]} total={["Focus time", dur(s.focusMS)]} />
        <Usual d={d} />
      </>
    ),
    longest: (
      <>
        <Why>The longest focus block of the day, counting only the Deep time in it. Idle time, or a break of {STATS.toleranceS / 60}m or more, ends a block.</Why>
        <Usual d={d} />
      </>
    ),
    distract: (
      <>
        <Why>Time in categories of the Distracting kind. Every {STATS.penaltyPerMin} minutes cost the focus score a point, at most {STATS.penaltyCap}.</Why>
        {distracting.length > 0 && <Sum rows={distracting.map((c) => [c.name, dur(c.ms)])} total={["Distracting", dur(s.distractMS)]} />}
        <Usual d={d} />
      </>
    ),
    switches: (
      <>
        <Why>A switch is a move to another kind of time that lasts at least {STATS.switchMinS}s; shorter visits are ignored. Idle time, or a gap of {STATS.resetGapMin}m, starts the count afresh.</Why>
        <Sum rows={[["Switches", String(s.switches)], ["Active time", dur(s.activeMS)]]} total={["Per active hour", d.score.switchesPerHour.toFixed(1)]} />
        <Usual d={d} />
      </>
    ),
  };
}

/** TotalsHelp is how the timeline's totals add up. */
function TotalsHelp({ d, notRec }: { d: Day; notRec: number }) {
  const kinds = byKindRows(d.byKind);
  return (
    <Explain title="Tracked, away and not recorded" align="end"
      label={<span className="num">{dur(d.trackedMS)} tracked · {dur(d.idleMS)} away{notRec > 0 && ` · ${dur(notRec)} not recorded`}</span>}>
      <Why>Tracked is the time tock saw you at the computer, labelled or not, by kind of time:</Why>
      <Sum rows={kinds.map((k) => [kindLabel(k.kind), dur(k.ms)])} total={["Tracked", dur(d.trackedMS)]} />
      <Why>Away is time with no keyboard or mouse input. It is left out of the totals until you label it as work.</Why>
      {notRec > 0 && <Why>Not recorded is time trackd was not running or could not see the screen. It is never part of the totals.</Why>}
    </Explain>
  );
}

/** GoalsHelp says what "on track" counts. */
function GoalsHelp({ goals }: { goals: Day["goals"] }) {
  const on = goals.filter((g) => g.state !== "short" && g.state !== "over").length;
  const word: Record<string, string> = { met: "reached", short: "not reached yet", ok: "under its limit", over: "past its limit" };
  return (
    <Explain title="Goals on track" label={`${on} of ${goals.length} on track`} align="end">
      <Why>A goal is on track once its time is reached, or while a limit is not passed.</Why>
      <Sum rows={goals.map((g) => [g.text || g.name, word[g.state] ?? g.state])} />
    </Explain>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <Skeleton className="h-[318px]" />
        <Skeleton className="h-[318px]" />
        <Skeleton className="h-[318px]" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
