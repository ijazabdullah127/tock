#!/bin/sh
# perf.sh: trackd's idle CPU and memory on a CI desktop, against limits.
# Builds trackd, runs it on a fresh install in temp dirs, lets it settle,
# then measures a fixed window with scripts/trackd-usage.sh. On Linux it
# brings up Xvfb and openbox when there is no display.
#
#   PERF_MINUTES     the window (default 3)
#   PERF_CPU_MAX     fail above this CPU %, default 1 (the budget)
#   PERF_MEM_MAX_MB  fail above this memory at the end, in MB
#                    (macOS footprint, RSS elsewhere)
set -eu
mins=${PERF_MINUTES:-3}
cpu_max=${PERF_CPU_MAX:-1}
mem_max=${PERF_MEM_MAX_MB:-40}

root=$(mktemp -d)
pid=
cleanup() {
	[ -n "$pid" ] && kill "$pid" 2>/dev/null || true
	rm -rf "$root"
}
trap cleanup EXIT

if [ "$(uname)" = Linux ] && [ -z "${DISPLAY:-}" ]; then
	export DISPLAY=:98
	Xvfb :98 -screen 0 1280x800x24 &
	sleep 2
	openbox &
	sleep 1
	xterm -T tock-perf -e sleep 3600 &
	sleep 2
	export TOCK_DESKTOP=x11
fi

export TOCK_DATA_DIR="$root/data" TOCK_CONFIG_DIR="$root/config" TOCK_STATE_DIR="$root/state"
mkdir -p "$TOCK_DATA_DIR" "$TOCK_CONFIG_DIR" "$TOCK_STATE_DIR" "$root/bin"
go build -o "$root/bin/" ./cmd/trackd ./cmd/tock
"$root/bin/tock" init >/dev/null
"$root/bin/trackd" >"$root/trackd.log" 2>&1 &
pid=$!
sleep 30 # open the store, first polls, startup garbage collected

out=$(TRACKD_PID=$pid scripts/trackd-usage.sh "$mins")
echo "$out"
cpu=$(echo "$out" | awk '$1 == "cpu" { print $2 }')
mem=$(echo "$out" | awk '$4 == "at" && $5 == "start," { print $6 }')
line="perf: $(uname): trackd idle cpu ${cpu} % over ${mins} min (limit ${cpu_max} %), memory ${mem} MB (limit ${mem_max} MB)"
echo "$line"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$line" >>"$GITHUB_STEP_SUMMARY"

fail=0
awk -v c="$cpu" -v m="$cpu_max" 'BEGIN { exit !(c > m) }' && { echo "trackd idle cpu ${cpu} % is over ${cpu_max} %" >&2; fail=1; }
awk -v c="$mem" -v m="$mem_max" 'BEGIN { exit !(c > m) }' && { echo "trackd memory ${mem} MB is over ${mem_max} MB" >&2; fail=1; }
if [ "$fail" = 1 ]; then
	echo "trackd log:" >&2
	cat "$root/trackd.log" >&2
fi
exit "$fail"
