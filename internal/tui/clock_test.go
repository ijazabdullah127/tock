package tui

import (
	"testing"

	"github.com/charmbracelet/x/exp/golden"
)

// With [display] clock = "12h" the today tab shows 5:20pm times and the
// timeline columns still line up.
func TestGoldenToday12h(t *testing.T) {
	m, e := seeded(t)
	e.WriteConfig(t, "[display]\nclock = \"12h\"\n")
	e.Heartbeat(t, e.Clock.UnixMilli())
	m = step(t, m, tickMsg{})
	golden.RequireEqual(t, screen(m))
}

// The score panel lists its blocks on the 12-hour clock too.
func TestGoldenScore12h(t *testing.T) {
	m, e := seeded(t)
	e.WriteConfig(t, "[display]\nclock = \"12h\"\n")
	e.Heartbeat(t, e.Clock.UnixMilli())
	m = step(t, m, tickMsg{})
	m = press(t, m, "r", "i")
	golden.RequireEqual(t, screen(m))
}
