#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
sdk_dir="${ANDROID_HOME:-$project_dir/.android-sdk}"
export ANDROID_HOME="$sdk_dir"
export ANDROID_SDK_ROOT="$sdk_dir"
export ANDROID_USER_HOME="$project_dir/.tools/android-home"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$project_dir/.tools/gradle-home}"
mkdir -p "$project_dir/.tools" "$project_dir/artifacts"
if [[ -n "${JAVA_HOME:-}" ]]; then
  [[ -x "$JAVA_HOME/bin/javac" ]] || { printf 'JAVA_HOME must point to a full JDK 17 or later (including javac).\n' >&2; exit 1; }
else
  command -v javac >/dev/null || { printf 'Install a full JDK 17 or later, then set JAVA_HOME.\n' >&2; exit 1; }
fi
if [[ ! -x "$sdk_dir/cmdline-tools/latest/bin/sdkmanager" ]]; then
  archive="$project_dir/.tools/android-commandlinetools.zip"
  curl --fail --location --connect-timeout 15 --max-time 180 --silent --show-error \
    https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o "$archive"
  mkdir -p "$sdk_dir/cmdline-tools"
  unzip -q -o "$archive" -d "$sdk_dir/cmdline-tools"
  mv "$sdk_dir/cmdline-tools/cmdline-tools" "$sdk_dir/cmdline-tools/latest"
fi
sdkmanager="$sdk_dir/cmdline-tools/latest/bin/sdkmanager"
# Android command-line packages require their standard SDK licenses.
yes | "$sdkmanager" --sdk_root="$sdk_dir" --licenses >/dev/null || true
"$sdkmanager" --sdk_root="$sdk_dir" 'platforms;android-35' 'build-tools;35.0.0' 'platform-tools'
"$project_dir/android/gradlew" assembleDebug
cp "$project_dir/android/app/build/outputs/apk/debug/app-debug.apk" "$project_dir/artifacts/morrow-deck-lab-debug.apk"
printf 'APK: %s\n' "$project_dir/artifacts/morrow-deck-lab-debug.apk"
