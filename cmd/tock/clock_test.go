package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// With [display] clock = "12h" the commands show times as 5:20pm and take
// either form when you type one.
func TestClock12hCommands(t *testing.T) {
	te := newTestEnv(t, testRules)
	te.seed(t, daySpans()...)
	if err := os.WriteFile(filepath.Join(te.ConfigDir, "config.toml"), []byte("[display]\nclock = \"12h\"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if code, out := te.run(t, "", "session", "start", "50"); code != 0 || out != "session started: 50 min, ends 3:50pm\n" {
		t.Fatalf("start: %d %q %s", code, out, te.errb)
	}
	if code, out := te.run(t, "", "session", "stop"); code != 0 || out != "stopped: 3:00pm  manual    0s  deep   0%  0 int\n" {
		t.Fatalf("stop: %d %q %s", code, out, te.errb)
	}
	if code, out := te.run(t, "", "edit", "add", "12:30pm-1:30pm", "Code/tock"); code != 0 || !strings.Contains(out, "added 12:30pm–1:30pm (1h00) → Code / tock") {
		t.Fatalf("add: %d %q %s", code, out, te.errb)
	}
	if code, out := te.run(t, "", "edit", "delete", "09:00-09:15"); code != 0 || !strings.Contains(out, "deleted 9:00am–9:15am") {
		t.Fatalf("delete: %d %q %s", code, out, te.errb)
	}
	code, out := te.run(t, "", "edit")
	if code != 0 || !strings.Contains(out, "add    12:30pm– 1:30pm   1h00") || !strings.Contains(out, "delete  9:00am– 9:15am    15m") {
		t.Fatalf("list: %d %q", code, out)
	}
}
