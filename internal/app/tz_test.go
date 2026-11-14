package app

import (
	"testing"
	"time"

	"tock/internal/apptest"
)

// seedHourly inserts one-hour spans back to back from from to to (real
// hours, not wall-clock ones).
func seedHourly(t *testing.T, e *apptest.Env, from, to time.Time) {
	t.Helper()
	db := e.RawDB(t)
	defer db.Close()
	id := int64(1)
	for s := from; s.Before(to); s = s.Add(time.Hour) {
		if _, err := db.Exec(`INSERT INTO span(id, start, "end", bundle_id, app, title, private) VALUES(?,?,?,?,?,?,0)`,
			id, s.UnixMilli(), s.Add(time.Hour).UnixMilli(), "term", "WezTerm", "x"); err != nil {
			t.Fatal(err)
		}
		id++
	}
}

func heatTotal(h [24]int64) int64 {
	var n int64
	for _, ms := range h {
		n += ms
	}
	return n
}

// dayTotals reports the tracked time of each day from first, and the
// heatmap of each, as the day view shows them.
func dayTotals(t *testing.T, a *App, first time.Time, n int) (tracked []int64, hours [][24]int64) {
	t.Helper()
	for i := 0; i < n; i++ {
		d, err := a.Day(first.AddDate(0, 0, i))
		if err != nil {
			t.Fatal(err)
		}
		tracked = append(tracked, d.TrackedMS)
		var h [24]int64
		for _, ms := range d.Hours.MS {
			for k := range h {
				h[k] += ms[k]
			}
		}
		hours = append(hours, h)
	}
	return tracked, hours
}

// Around a DST change the day is 23 or 25 hours long. Tracked time from
// 22:00 the day before to 02:00 the day after splits 2 h, the whole day, 2 h,
// and no time is lost or counted twice, in the totals or the hour grid.
func TestDayAcrossDST(t *testing.T) {
	paris, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		t.Skip("no tzdata:", err)
	}
	for _, c := range []struct {
		name  string
		day   time.Time
		hours int64
		// the wall-clock hour that holds no time (spring) or two hours (autumn)
		odd   int
		oddMS int64
	}{
		{"clocks forward", time.Date(2026, 3, 29, 0, 0, 0, 0, paris), 23, 2, 0},
		{"clocks back", time.Date(2026, 10, 25, 0, 0, 0, 0, paris), 25, 2, 2 * 3_600_000},
	} {
		t.Run(c.name, func(t *testing.T) {
			e := apptest.New(t, apptest.Rules)
			from := c.day.Add(-2 * time.Hour)
			to := time.Date(c.day.Year(), c.day.Month(), c.day.Day()+1, 2, 0, 0, 0, paris)
			seedHourly(t, e, from, to)
			e.Clock = to.Add(time.Hour)
			a := open(t, e)

			tracked, hours := dayTotals(t, a, c.day.AddDate(0, 0, -1), 3)
			want := []int64{2 * 3_600_000, c.hours * 3_600_000, 2 * 3_600_000}
			for i := range want {
				if tracked[i] != want[i] {
					t.Errorf("day %d tracked %v, want %v", i-1, time.Duration(tracked[i])*time.Millisecond, time.Duration(want[i])*time.Millisecond)
				}
				if got := heatTotal(hours[i]); got != want[i] {
					t.Errorf("day %d hour grid holds %v, want %v", i-1, time.Duration(got)*time.Millisecond, time.Duration(want[i])*time.Millisecond)
				}
			}
			if got := hours[1][c.odd]; got != c.oddMS {
				t.Errorf("hour %02d holds %v, want %v", c.odd, time.Duration(got)*time.Millisecond, time.Duration(c.oddMS)*time.Millisecond)
			}
		})
	}
}

// Travel: a day begun in Paris and ended in New York. tock buckets days and
// hours in the zone the machine is in when you look, so the morning in Paris
// shows at its New York wall-clock time, and the days around it still add up
// to every hour recorded, once.
func TestDayAfterTravel(t *testing.T) {
	paris, err1 := time.LoadLocation("Europe/Paris")
	ny, err2 := time.LoadLocation("America/New_York")
	if err1 != nil || err2 != nil {
		t.Skip("no tzdata")
	}
	e := apptest.New(t, apptest.Rules)
	// 07:00 to 11:00 in Paris, then the flight, then 16:00 to 20:00 in New
	// York: 4 h + 4 h, and the Paris morning is 01:00 to 05:00 in New York.
	seedHourly(t, e, time.Date(2026, 10, 10, 7, 0, 0, 0, paris), time.Date(2026, 10, 10, 11, 0, 0, 0, paris))
	db := e.RawDB(t)
	for i, h := range []int{16, 17, 18, 19} {
		s := time.Date(2026, 10, 10, h, 0, 0, 0, ny)
		if _, err := db.Exec(`INSERT INTO span(id, start, "end", bundle_id, app, title, private) VALUES(?,?,?,?,?,?,0)`,
			100+i, s.UnixMilli(), s.Add(time.Hour).UnixMilli(), "term", "WezTerm", "x"); err != nil {
			t.Fatal(err)
		}
	}
	db.Close()

	for _, c := range []struct {
		name string
		loc  *time.Location
		// tracked per day from 9 to 11 Oct, and the first hour with time on the 10th
		days  []int64
		first int
	}{
		// In New York the whole trip is on the 10th, from 01:00.
		{"seen in New York", ny, []int64{0, 8 * 3_600_000, 0}, 1},
		// Seen from Paris the evening in New York runs 22:00 to 02:00:
		// two hours fall on the 11th.
		{"seen in Paris", paris, []int64{0, 6 * 3_600_000, 2 * 3_600_000}, 7},
	} {
		t.Run(c.name, func(t *testing.T) {
			e.Clock = time.Date(2026, 10, 11, 12, 0, 0, 0, c.loc)
			a := open(t, e)
			tracked, hours := dayTotals(t, a, time.Date(2026, 10, 9, 0, 0, 0, 0, c.loc), 3)
			var sum int64
			for i := range tracked {
				sum += tracked[i]
				if tracked[i] != c.days[i] {
					t.Errorf("Oct %d tracked %v, want %v", 9+i, time.Duration(tracked[i])*time.Millisecond, time.Duration(c.days[i])*time.Millisecond)
				}
			}
			if sum != 8*3_600_000 {
				t.Errorf("days add up to %v, want 8h", time.Duration(sum)*time.Millisecond)
			}
			first := -1
			for h, ms := range hours[1] {
				if ms > 0 {
					first = h
					break
				}
			}
			if first != c.first {
				t.Errorf("first hour with time on the 10th = %d, want %d", first, c.first)
			}
		})
	}
}
