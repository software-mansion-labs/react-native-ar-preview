#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../ios"

device_id=$(xcrun simctl list devices available -j | python3 -c '
import json
import sys

data = json.load(sys.stdin)

def runtime_version(key):
    parts = key.rsplit("iOS-", 1)[-1].split("-")
    return tuple(int(p) for p in parts if p.isdigit())

ios_runtimes = sorted(
    (item for item in data["devices"].items() if ".iOS-" in item[0]),
    key=lambda item: runtime_version(item[0]),
    reverse=True,
)

for _, devices in ios_runtimes:
    for device in devices:
        if device.get("isAvailable") and device["name"].startswith("iPhone"):
            print(device["udid"])
            sys.exit(0)

sys.exit(1)
')

if [ -z "$device_id" ]; then
  echo "No available iPhone simulator found" >&2
  exit 1
fi

device_name=$(xcrun simctl list devices | grep "$device_id" | sed -E 's/^ *//; s/ \(.*$//')
echo "Running tests on simulator: $device_name ($device_id)"

xcodebuild test -scheme ArPreviewImpl-Package -destination "platform=iOS Simulator,id=$device_id"
