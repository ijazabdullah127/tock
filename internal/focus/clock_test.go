package focus

import (
	"testing"

	"tock/internal/classify"
	"tock/internal/clockfmt"
	"tock/internal/config"
)

// TestClock12hNotices checks that the away and slot notices follow the
// 12-hour clock when the input asks for it.
func TestClock12hNotices(t *testing.T) {
	abs := &classify.Interval{From: at(12, 10, 0), To: at(12, 45, 0)}
	in := input(at(12, 46, 0), vw{from: at(12, 0, 0), to: at(12, 10, 0)}, vw{from: at(12, 45, 0), to: at(12, 46, 0)})
	in.Absence, in.Clock = abs, clockfmt.H12
	notes := only(Step(in), Notify)
	if len(notes) != 1 || notes[0].Body != "Away 35m (12:10pm–12:45pm). What was it? Run tock away or open tock." {
		t.Fatalf("away notes = %+v", notes)
	}

	for now, want := range map[int64]string{
		at(14, 25, 0):  "2:30pm Standup (Work) · in 5 min",
		at(14, 30, 10): "2:30pm–3:00pm Standup (Work)",
	} {
		in := input(now)
		in.Plan, in.Clock = config.DefaultPlan(), clockfmt.H12
		s := standupSlot("Work")
		s.SeenMS = 0
		in.Slots = []Slot{s}
		evs := only(Step(in), SlotDue)
		if len(evs) != 1 || evs[0].Body != want {
			t.Errorf("slot events = %+v, want body %q", evs, want)
		}
	}
}
