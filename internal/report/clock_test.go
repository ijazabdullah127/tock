package report

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"tock/internal/clockfmt"
	"tock/internal/focus"
	"tock/internal/plan"
	"tock/internal/stats"
)

// TestClock12h checks the 12-hour clock in each report text that shows a
// time of day.
func TestClock12h(t *testing.T) {
	loc := time.UTC
	day := time.Date(2026, 11, 12, 0, 0, 0, 0, loc)
	ms := func(h, m int) int64 {
		return day.Add(time.Duration(h)*time.Hour + time.Duration(m)*time.Minute).UnixMilli()
	}
	c := clockfmt.H12

	d := Day{Date: day, Clock: c, Work: stats.Hours{Set: true, EndMin: 18 * 60}, From: ms(9, 0), To: ms(18, 0)}
	if got := HoursText(d); got != "9:00am–6:00pm" {
		t.Errorf("HoursText = %q", got)
	}
	if got := OverBody(d, 65*60_000); !strings.Contains(got, "after 6:00pm.") {
		t.Errorf("OverBody = %q", got)
	}
	rows := plan.Rows([]string{"Standup due:2026-10-10 @15h05"}, "2026-10-10", "2026-10-11")
	if got := StartBody(d, rows); !strings.Contains(got, "Today: 3:05pm Standup.") {
		t.Errorf("StartBody = %q", got)
	}

	s := focus.Session{Kind: focus.KindAuto, StartMS: ms(9, 12), EndMS: ms(10, 52)}
	a, b := SessionLine(s, loc, c, false), SessionLine(focus.Session{Kind: focus.KindAuto, StartMS: ms(13, 2), EndMS: ms(14, 42)}, loc, c, false)
	if !strings.HasPrefix(a, " 9:12am  auto") || !strings.HasPrefix(b, " 1:02pm  auto") || len(a) != len(b) {
		t.Errorf("SessionLine = %q / %q", a, b)
	}
	if got := SessionLine(s, loc, c, true); !strings.HasPrefix(got, "Thu  9:12am  auto") {
		t.Errorf("SessionLine(withDay) = %q", got)
	}

	bl := Block{Start: ms(0, 0), End: ms(13, 10), ActiveMS: 3_600_000, Name: "x"}
	if got := BlockLine(bl, loc, c); !strings.HasPrefix(got, "12:00am– 1:10pm   1h00  x") {
		t.Errorf("BlockLine = %q", got)
	}

	if got := OutagesLine([]stats.Gap{{From: ms(12, 30), To: ms(13, 10)}}, loc, c); !strings.HasPrefix(got, "12:30pm–1:10pm ") {
		t.Errorf("OutagesLine = %q", got)
	}

	sd := SessionDetail{Clock: c, Sess: focus.Session{Kind: focus.KindAuto, StartMS: ms(10, 0), EndMS: ms(10, 40)}}
	if got := sd.Summary(loc); !strings.HasPrefix(got, "10:00am–10:40am · ") {
		t.Errorf("Summary = %q", got)
	}

	var buf bytes.Buffer
	if err := WriteWeekHTML(&buf, Week{Monday: day, Clock: c}, day.Add(17*time.Hour+20*time.Minute)); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), "generated 2026-11-12 5:20pm") {
		t.Error("HTML report does not show the 12-hour generated time")
	}
}
