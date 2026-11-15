package bar

import (
	"testing"
	"time"

	"tock/internal/app"
	"tock/internal/clockfmt"
	"tock/internal/focus"
	"tock/internal/report"
	"tock/internal/store"
)

// The notch and the menu follow [display] clock = "12h".
func TestClock12hNotchAndMenu(t *testing.T) {
	s := Snapshot{OK: true, BreakUntil: time.UnixMilli(t1720 + 5*60_000), Loc: islandLoc, Clock: clockfmt.H12}
	if i := s.IslandBase(t1720); i.Hover.Sub != "until 5:25pm" {
		t.Fatalf("break = %+v", i.Hover)
	}
	found := false
	for _, it := range s.recItems(t1720) {
		found = found || it.Title == "Break · until 5:25pm"
	}
	if !found {
		t.Fatalf("menu rows = %+v", s.recItems(t1720))
	}
	s = Snapshot{OK: true, Loc: islandLoc, Clock: clockfmt.H12, Slots: []focus.Slot{
		{Kind: focus.SlotEvent, StartMS: t1720 + 2*60_000, EndMS: t1720 + 15*60_000, Title: "Standup", Calendar: "Work"},
	}}
	if i := s.IslandBase(t1720); i.Hover.Sub != "5:22pm to 5:35pm · Work" {
		t.Fatalf("meet = %+v", i.Hover)
	}
	det := &report.SessionDetail{Clock: clockfmt.H12, Sess: focus.Session{ID: 7, StartMS: t1720, PlannedMS: t1720 + 25*60_000, EndMS: t1720 + 25*60_000}}
	i := DoneIsland(store.Notice{ID: 9, Topic: focus.TopicDone, Title: "Session done"}, app.NoticeData{Session: 7}, det, islandLoc, 0)
	if i.Panel.Sub != "5:20pm to 5:45pm · ended on time" {
		t.Fatalf("done = %q", i.Panel.Sub)
	}
}
