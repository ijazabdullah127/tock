package clockfmt

import (
	"testing"
	"time"
)

func at(h, m int) time.Time { return time.Date(2026, 11, 15, h, m, 0, 0, time.UTC) }

func TestTime(t *testing.T) {
	cases := []struct {
		h, m       int
		h24, h12   string
		col12, hr  string
		hr24, min_ string
	}{
		{0, 0, "00:00", "12:00am", "12:00am", "12am", "00", "12:00am"},
		{0, 5, "00:05", "12:05am", "12:05am", "12am", "00", "12:05am"},
		{9, 5, "09:05", "9:05am", " 9:05am", "9am", "09", "9:05am"},
		{12, 0, "12:00", "12:00pm", "12:00pm", "12pm", "12", "12:00pm"},
		{12, 30, "12:30", "12:30pm", "12:30pm", "12pm", "12", "12:30pm"},
		{17, 20, "17:20", "5:20pm", " 5:20pm", "5pm", "17", "5:20pm"},
		{23, 59, "23:59", "11:59pm", "11:59pm", "11pm", "23", "11:59pm"},
	}
	for _, c := range cases {
		tm := at(c.h, c.m)
		if got := H24.Time(tm); got != c.h24 || got != tm.Format("15:04") {
			t.Errorf("H24.Time(%02d:%02d) = %q, want %q", c.h, c.m, got, c.h24)
		}
		if got := H12.Time(tm); got != c.h12 {
			t.Errorf("H12.Time(%02d:%02d) = %q, want %q", c.h, c.m, got, c.h12)
		}
		if got := H24.Col(tm); got != c.h24 {
			t.Errorf("H24.Col = %q", got)
		}
		if got := H12.Col(tm); got != c.col12 || len(got) != H12.Width() {
			t.Errorf("H12.Col(%02d:%02d) = %q, want %q", c.h, c.m, got, c.col12)
		}
		if got := H12.Hour(c.h); got != c.hr {
			t.Errorf("H12.Hour(%d) = %q, want %q", c.h, got, c.hr)
		}
		if got := H24.Hour(c.h); got != c.hr24 {
			t.Errorf("H24.Hour(%d) = %q, want %q", c.h, got, c.hr24)
		}
		if got := H12.Min(c.h*60 + c.m); got != c.min_ {
			t.Errorf("H12.Min = %q, want %q", got, c.min_)
		}
		if got := H24.Min(c.h*60 + c.m); got != c.h24 {
			t.Errorf("H24.Min = %q, want %q", got, c.h24)
		}
		if got := H12.MS(tm.UnixMilli(), time.UTC); got != c.h12 {
			t.Errorf("H12.MS = %q", got)
		}
	}
	if H24.Width() != 5 || H12.Width() != 7 {
		t.Fatal("widths")
	}
}

func TestStamp(t *testing.T) {
	tm := at(17, 20)
	for layout, want := range map[string][2]string{
		"Mon ":        {"Sun 17:20", "Sun 5:20pm"},
		"Mon 2 Jan ":  {"Sun 15 Nov 17:20", "Sun 15 Nov 5:20pm"},
		"2006-01-02 ": {"2026-11-15 17:20", "2026-11-15 5:20pm"},
	} {
		if got := H24.Stamp(tm, layout); got != want[0] || got != tm.Format(layout+"15:04") {
			t.Errorf("H24.Stamp(%q) = %q", layout, got)
		}
		if got := H12.Stamp(tm, layout); got != want[1] {
			t.Errorf("H12.Stamp(%q) = %q, want %q", layout, got, want[1])
		}
	}
}

func TestParse(t *testing.T) {
	for in, want := range map[string]Clock{"24h": H24, "12h": H12, " 12H ": H12} {
		c, ok := Parse(in)
		if !ok || c != want {
			t.Errorf("Parse(%q) = %v %v", in, c, ok)
		}
	}
	for _, bad := range []string{"", "12", "am/pm", "24"} {
		if _, ok := Parse(bad); ok {
			t.Errorf("Parse(%q) ok", bad)
		}
	}
	if H24.String() != "24h" || H12.String() != "12h" || Clock(0) != H24 {
		t.Fatal("names")
	}
}

func TestParseMin(t *testing.T) {
	for in, want := range map[string]int{
		"00:00": 0, "9:05": 545, "09:05": 545, "17:20": 1040, "23:59": 1439,
		"12am": 0, "12:05am": 5, "9am": 540, "9:05am": 545, "12pm": 720, "12:30pm": 750,
		"5:20pm": 1040, "5:20 PM": 1040, "11:59pm": 1439,
	} {
		if got, ok := ParseMin(in); !ok || got != want {
			t.Errorf("ParseMin(%q) = %d %v, want %d", in, got, ok, want)
		}
	}
	for _, bad := range []string{"", "24:00", "13pm", "0am", "9:60", "x", "9:5", "17"} {
		if _, ok := ParseMin(bad); ok {
			t.Errorf("ParseMin(%q) ok", bad)
		}
	}
}
