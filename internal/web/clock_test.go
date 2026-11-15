package web

import "testing"

// /api/status says which clock the dashboard shows times in.
func TestClockStatus(t *testing.T) {
	f := newFixture(t)
	var st statusJSON
	f.get("/api/status", &st)
	if st.Clock != "24h" {
		t.Fatalf("default clock = %q, want 24h", st.Clock)
	}
	f.e.WriteConfig(t, "[display]\nclock = \"12h\"\n")
	st = statusJSON{}
	f.get("/api/status", &st)
	if st.Clock != "12h" {
		t.Fatalf("clock = %q, want 12h", st.Clock)
	}
}
