package web

import (
	"testing"
)

// The day carries the score's weights, so the page can show how the parts
// add up to the number, with the weights from config.toml [score].
func TestDayScoreWeights(t *testing.T) {
	f := newFixture(t)
	var d dayJSON
	f.get("/api/day", &d)
	w := d.Score.Weights
	if w.Depth != 0.5 || w.Blocks != 0.3 || w.Calm != 0.2 || w.Stretch != 0 {
		t.Fatalf("weights %+v, want the defaults", w)
	}
	f.e.WriteConfig(t, "[score]\ndepth = 0.4\nblocks = 0.3\ncalm = 0.2\nstretch = 0.1\n")
	d = dayJSON{}
	f.get("/api/day", &d)
	if w := d.Score.Weights; w.Depth != 0.4 || w.Stretch != 0.1 {
		t.Fatalf("weights %+v, want config.toml's", w)
	}
}
