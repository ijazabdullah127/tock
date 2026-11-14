//go:build e2e

package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sort"
	"strings"
	"syscall"
	"testing"
	"time"
)

// The accuracy run: a scripted session with known true times, recorded by
// the real trackd on a real desktop, compared with what `tock export`
// says. The truth is the wall clock around each focus command, not the
// planned holds.
//
//	E2E_IDLE  set to 1 to add a real idle stretch (no input for 5.5 min).
//	          tock calls input-free time idle only past 5 minutes (trackd's
//	          idle threshold, the shortest AFK window); a shorter pause in
//	          front of an app counts as that app, by design. So idle needs a
//	          long run and a desktop that reports input idle (X11, macOS),
//	          and E2E_FOCUS must give input after each switch.

// Threshold: trackd polls every 2 s and a poll may be up to 0.5 s late, so
// a switch is seen up to 2.5 s after it happens. Inside the session that
// delay moves time from one window to the next and back again, so an app's
// total is off by about one delay, not one per switch. Export truncates
// each edge to whole seconds (up to 1 s), and the focus command itself
// takes a moment to land. Twice a poll plus the truncation: 5 s.
const accuracyMaxErrS = 5.0

type segment struct {
	label      string // a title, or "idle"
	start, end time.Time
}

func TestAccuracy(t *testing.T) {
	titles := strings.Split(os.Getenv("E2E_TITLES"), ",")
	if os.Getenv("E2E_FOCUS") == "" || len(titles) < 2 {
		t.Skip("set E2E_TITLES (two or more) and E2E_FOCUS; see the package comment")
	}
	if runtime.GOOS == "windows" {
		t.Skip("trackd stops by named event on Windows; the accuracy run is for macOS and Linux")
	}
	trackd, tock, env, _ := setup(t)
	a, b := titles[0], titles[1]

	d := start(t, trackd, env)
	time.Sleep(4 * time.Second) // open the store, first poll

	var segs []segment
	hold := func(label, title string, dur time.Duration) {
		focus(t, title)
		segs = append(segs, segment{label: label, start: time.Now()})
		time.Sleep(dur)
	}
	plan := []struct {
		title string
		dur   time.Duration
	}{{a, 40 * time.Second}, {b, 30 * time.Second}, {a, 25 * time.Second}, {b, 35 * time.Second}, {a, 20 * time.Second}}
	for _, p := range plan {
		hold(p.title, p.title, p.dur)
	}
	idle := os.Getenv("E2E_IDLE") == "1"
	if idle {
		// Front window a, one input with the focus, then none for 5.5 min:
		// tock calls all of it idle, back to that input.
		hold("idle", a, 330*time.Second)
		hold(b, b, 20*time.Second)
	}
	// Each segment ends where the next begins, the last at the stop.
	stop := time.Now()
	for i := range segs {
		segs[i].end = stop
		if i+1 < len(segs) {
			segs[i].end = segs[i+1].start
		}
	}
	if err := d.cmd.Process.Signal(syscall.SIGTERM); err != nil {
		t.Fatalf("stop trackd: %v", err)
	}
	_ = d.cmd.Wait()
	t.Logf("trackd log:\n%s", d.log.String())

	rows := export(t, tock, env)
	logRows(t, rows)

	from, to := segs[0].start, stop
	truth := map[string]float64{}
	for _, s := range segs {
		truth[s.label] += s.end.Sub(s.start).Seconds()
	}
	got := map[string]float64{}
	for _, r := range rows {
		rs, err1 := time.Parse(time.RFC3339, r.Start)
		re, err2 := time.Parse(time.RFC3339, r.End)
		if err1 != nil || err2 != nil {
			t.Fatalf("row times %q %q", r.Start, r.End)
		}
		ov := overlap(rs, re, from, to)
		if ov <= 0 {
			continue
		}
		got[labelOf(r, titles)] += ov
	}
	labels := []string{}
	for l := range truth {
		labels = append(labels, l)
	}
	for l := range got {
		if _, ok := truth[l]; !ok {
			labels = append(labels, l)
		}
	}
	sort.Strings(labels)
	worst, worstLabel := 0.0, ""
	for _, l := range labels {
		e := got[l] - truth[l]
		t.Logf("accuracy: %-16s true %6.1f s  recorded %6.1f s  error %+5.1f s", l, truth[l], got[l], e)
		if e < 0 {
			e = -e
		}
		if e > worst {
			worst, worstLabel = e, l
		}
	}
	scope := "apps"
	if idle {
		scope = "apps and idle"
	}
	line := fmt.Sprintf("accuracy: %s: worst error %.1f s (%s) over %.0f s, %s; threshold %.0f s",
		desktop(), worst, worstLabel, to.Sub(from).Seconds(), scope, accuracyMaxErrS)
	t.Log(line)
	fmt.Println(line) // for the job log and summary, whatever -v says
	if s := os.Getenv("GITHUB_STEP_SUMMARY"); s != "" {
		if f, err := os.OpenFile(s, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o600); err == nil {
			fmt.Fprintln(f, line)
			f.Close()
		}
	}
	if worst > accuracyMaxErrS {
		t.Errorf("worst error %.1f s on %s, want at most %.0f s", worst, worstLabel, accuracyMaxErrS)
	}
}

// labelOf names what a row recorded: one of the titles, idle, or other.
func labelOf(r row, titles []string) string {
	if r.BundleID == "tock.idle" {
		return "idle"
	}
	for _, w := range titles {
		if strings.Contains(r.Title, w) || strings.Contains(r.App, w) {
			return w
		}
	}
	return "other"
}

func overlap(as, ae, bs, be time.Time) float64 {
	s, e := as, ae
	if bs.After(s) {
		s = bs
	}
	if be.Before(e) {
		e = be
	}
	return e.Sub(s).Seconds()
}

func desktop() string {
	if d := os.Getenv("E2E_DESKTOP"); d != "" {
		return d
	}
	return runtime.GOOS
}

func export(t *testing.T, tock string, env []string) []row {
	t.Helper()
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	cmd := exec.Command(tock, "export", "--format", "json", "--from", yesterday, "--to", today)
	cmd.Env = env
	var out, errb bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &errb
	if err := cmd.Run(); err != nil {
		t.Fatalf("tock export: %v\n%s", err, errb.String())
	}
	var rows []row
	if err := json.Unmarshal(out.Bytes(), &rows); err != nil {
		t.Fatalf("export json: %v\n%s", err, out.String())
	}
	return rows
}
