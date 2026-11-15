package config

import (
	"fmt"
	"strings"
	"time"

	"tock/internal/clockfmt"
)

// Display is the [display] section: how dates and times are laid out.
type Display struct {
	// WeekStart is the first day of a week as config.toml names it:
	// "monday" (also the zero value), "sunday" or "saturday".
	WeekStart string
	// Clock is how times of day are shown to people: "24h" (also the zero
	// value) or "12h".
	Clock string
}

type displayTOML struct {
	WeekStart *string `toml:"week_start"`
	Clock     *string `toml:"clock"`
}

// weekStarts are the accepted week_start values.
var weekStarts = map[string]time.Weekday{"monday": time.Monday, "sunday": time.Sunday, "saturday": time.Saturday}

// FirstDay is the weekday weeks start on.
func (d Display) FirstDay() time.Weekday {
	if w, ok := weekStarts[d.WeekStart]; ok {
		return w
	}
	return time.Monday
}

// WeekStartName is FirstDay as written in config.toml: "monday", "sunday"
// or "saturday".
func (d Display) WeekStartName() string {
	return strings.ToLower(d.FirstDay().String())
}

// ClockFormat is the clock setting for clockfmt; 24-hour unless set to 12h.
func (d Display) ClockFormat() clockfmt.Clock {
	c, _ := clockfmt.Parse(d.Clock)
	return c
}

func decodeDisplay(f displayTOML, d *Display) error {
	if f.WeekStart != nil {
		w := strings.ToLower(strings.TrimSpace(*f.WeekStart))
		if _, ok := weekStarts[w]; !ok {
			return fmt.Errorf(`[display] week_start = %q, want "monday", "sunday" or "saturday"`, *f.WeekStart)
		}
		d.WeekStart = w
	}
	if f.Clock != nil {
		c, ok := clockfmt.Parse(*f.Clock)
		if !ok {
			return fmt.Errorf(`[display] clock = %q, want "24h" or "12h"`, *f.Clock)
		}
		d.Clock = c.String()
	}
	return nil
}
