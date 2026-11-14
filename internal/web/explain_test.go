package web

import (
	"os"
	"regexp"
	"strconv"
	"testing"

	"tock/internal/app"
	"tock/internal/stats"
)

// The page explains its numbers with copies of the stats constants
// (web/src/lib/explain.ts); they must say what the code does.
func TestExplainMirrorsStats(t *testing.T) {
	src, err := os.ReadFile("../../web/src/lib/explain.ts")
	if err != nil {
		t.Skip("no web sources:", err)
	}
	want := map[string]int64{
		"blockMinMin":     stats.BlockMinMS / 60_000,
		"longBlockMin":    stats.LongBlockMS / 60_000,
		"toleranceS":      stats.ToleranceMS / 1000,
		"switchMinS":      stats.SwitchMinMS / 1000,
		"resetGapMin":     stats.ResetGapMS / 60_000,
		"workdayMinMin":   stats.WorkdayMinMS / 60_000,
		"calmZeroPerHour": stats.CalmZeroPerHour,
		"penaltyPerMin":   stats.PenaltyPerMin,
		"penaltyCap":      stats.PenaltyCap,
		"browseWeight":    stats.BrowseWeight,
		"stretchFullMin":  stats.StretchFullMS / 60_000,
		"usualWeeks":      app.UsualWeeks,
	}
	for k, v := range want {
		m := regexp.MustCompile(`\b` + k + `: (\d+),`).FindSubmatch(src)
		if m == nil {
			t.Errorf("explain.ts has no %s", k)
			continue
		}
		if got, _ := strconv.ParseInt(string(m[1]), 10, 64); got != v {
			t.Errorf("explain.ts %s = %d, stats says %d", k, got, v)
		}
	}
	d := stats.DefaultWeights
	re := regexp.MustCompile(`DEFAULT_WEIGHTS = \{ depth: ([\d.]+), blocks: ([\d.]+), calm: ([\d.]+), stretch: ([\d.]+) \}`)
	m := re.FindSubmatch(src)
	if m == nil {
		t.Fatal("explain.ts has no DEFAULT_WEIGHTS")
	}
	for i, w := range []float64{d.Depth, d.Blocks, d.Calm, d.Stretch} {
		if got, _ := strconv.ParseFloat(string(m[i+1]), 64); got != w {
			t.Errorf("DEFAULT_WEIGHTS[%d] = %v, stats says %v", i, got, w)
		}
	}
}
