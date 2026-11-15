// Package clockfmt writes times of day for people, as the [display] clock
// setting says: 24-hour "17:20" (the default) or 12-hour "5:20pm". It is a
// leaf package so pure packages can take a Clock in their inputs.
//
// Exports, --json, logs, file names and the text sent to a language model
// stay 24-hour and do not use it.
package clockfmt

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Clock is how a time of day is shown. The zero value is H24.
type Clock uint8

const (
	H24 Clock = iota // "17:20", "09:05"
	H12              // "5:20pm", "9:05am", "12:00am" for midnight
)

// Parse reads a config value: "24h" or "12h", any case.
func Parse(s string) (Clock, bool) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "24h":
		return H24, true
	case "12h":
		return H12, true
	}
	return H24, false
}

// String is the config value: "24h" or "12h".
func (c Clock) String() string {
	if c == H12 {
		return "12h"
	}
	return "24h"
}

// Min is a minute of the day (0–1439): "17:20" or "5:20pm".
func (c Clock) Min(m int) string {
	h, mm := m/60, m%60
	if c != H12 {
		return fmt.Sprintf("%02d:%02d", h, mm)
	}
	return strconv.Itoa(hour12(h)) + fmt.Sprintf(":%02d", mm) + ampm(h)
}

// Time is t's time of day in its own zone.
func (c Clock) Time(t time.Time) string {
	if c != H12 {
		return t.Format("15:04")
	}
	return c.Min(t.Hour()*60 + t.Minute())
}

// MS is the time of day of unix ms in loc.
func (c Clock) MS(ms int64, loc *time.Location) string {
	return c.Time(time.UnixMilli(ms).In(loc))
}

// Width is the widest Time: 5 cells for "17:20", 7 for "12:00pm".
func (c Clock) Width() int {
	if c == H12 {
		return 7
	}
	return 5
}

// Col is Time padded on the left to Width, for columns that must line up.
// With H24 it is the same as Time.
func (c Clock) Col(t time.Time) string {
	s := c.Time(t)
	if n := c.Width() - len(s); n > 0 {
		s = strings.Repeat(" ", n) + s
	}
	return s
}

// ColMS is Col of unix ms in loc.
func (c Clock) ColMS(ms int64, loc *time.Location) string {
	return c.Col(time.UnixMilli(ms).In(loc))
}

// Stamp is t formatted with the Go date layout prefix, then the time of
// day: Stamp(t, "Mon 2 Jan ") is "Sun 15 Nov 17:20" or "Sun 15 Nov 5:20pm".
func (c Clock) Stamp(t time.Time, prefix string) string {
	return t.Format(prefix) + c.Time(t)
}

// Hour is an hour-only axis tick: "17" or "5pm".
func (c Clock) Hour(h int) string {
	if c != H12 {
		return fmt.Sprintf("%02d", h)
	}
	return strconv.Itoa(hour12(h)) + ampm(h)
}

// ParseMin reads a time someone typed, in either form: "17:20", "9:05",
// "5:20pm", "5pm", "12am". It is the minute of the day.
func ParseMin(s string) (int, bool) {
	s = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
	suffix := ""
	if strings.HasSuffix(s, "am") || strings.HasSuffix(s, "pm") {
		suffix, s = s[len(s)-2:], s[:len(s)-2]
	}
	hs, ms, colon := strings.Cut(s, ":")
	if (!colon && suffix == "") || hs == "" || len(hs) > 2 || (colon && len(ms) != 2) {
		return 0, false
	}
	h, err := strconv.Atoi(hs)
	if err != nil {
		return 0, false
	}
	m := 0
	if colon {
		if m, err = strconv.Atoi(ms); err != nil || m > 59 || m < 0 {
			return 0, false
		}
	}
	switch suffix {
	case "":
		if h > 23 || h < 0 {
			return 0, false
		}
	default:
		if h < 1 || h > 12 {
			return 0, false
		}
		h %= 12
		if suffix == "pm" {
			h += 12
		}
	}
	return h*60 + m, true
}

func hour12(h int) int {
	if h%12 == 0 {
		return 12
	}
	return h % 12
}

func ampm(h int) string {
	if h < 12 {
		return "am"
	}
	return "pm"
}
