package clockfmt

import (
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// layoutRE finds a hard-coded 24-hour time of day: a Go layout with 15:04,
// or minutes of the day printed as %02d:%02d (not a "%d:%02d:%02d" length).
var layoutRE = regexp.MustCompile(`15:04|(^|[^:])%02d:%02d`)

// keep24 are the files allowed to write 24-hour times: data, keys, logs,
// parsing and the text sent to a language model, which do not follow the
// [display] clock setting.
var keep24 = map[string]string{
	"cmd/trackd/dump.go":               "dump timestamps",
	"internal/app/edit.go":             "undo journal text, stored",
	"internal/app/slots.go":            "plan slot keys",
	"internal/apptest/apptest.go":      "test clock",
	"internal/classify/learnedfile.go": "learned.toml timestamps",
	"internal/config/config.go":        "parses config times",
	"internal/suggest/summary.go":      "summary sent to the language model",
	"internal/web/settings.go":         "work-hour form values",
	"internal/clockfmt/clockfmt.go":    "the formatter itself",
}

// TestNoHardCodedClock fails when a new user-facing file writes a time of
// day without clockfmt, so the 12-hour setting is not skipped by accident.
func TestNoHardCodedClock(t *testing.T) {
	root := filepath.Join("..", "..")
	for _, dir := range []string{"cmd", "internal"} {
		err := filepath.WalkDir(filepath.Join(root, dir), func(p string, e fs.DirEntry, err error) error {
			if err != nil || e.IsDir() || !strings.HasSuffix(p, ".go") || strings.HasSuffix(p, "_test.go") {
				return err
			}
			rel, _ := filepath.Rel(root, p)
			rel = filepath.ToSlash(rel)
			if _, ok := keep24[rel]; ok {
				return nil
			}
			b, err := os.ReadFile(p)
			if err != nil {
				return err
			}
			for i, line := range strings.Split(string(b), "\n") {
				if layoutRE.MatchString(line) && !strings.HasPrefix(strings.TrimSpace(line), "//") {
					t.Errorf("%s:%d writes a 24-hour time; use clockfmt (or list the file in keep24): %s", rel, i+1, strings.TrimSpace(line))
				}
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}
}
