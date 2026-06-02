#!/usr/bin/env python3
# MALWARE-SCAN-SELF-IGNORE
"""
Heuristic scanner for recently-surfaced malicious-code patterns in JS/TS repos.

Targets the threat classes that have driven the 2025-2026 npm/CI supply-chain
wave (Shai-Hulud / Shai-Hulud 2.0 / "Mini" Shai-Hulud, the chalk/debug
crypto-clipper, S1ngularity/Nx, etc.):

  * obfuscation            - eval(atob()), Function() constructors, hex-name
                             identifiers from javascript-obfuscator, giant
                             base64 blobs, \\x-escape walls
  * code execution         - child_process exec of curl|wget|bash -c, vm module
  * token / cred theft     - JSON.stringify(process.env), reads of ~/.npmrc,
                             ~/.aws/credentials, ssh keys, .git/config, TruffleHog
  * exfiltration sinks     - webhook.site / requestbin / pipedream / interactsh
                             and the worm's GitHub repo-enumeration query string
  * worm IOCs              - "shai-hulud", bun_environment.js / setup_bun,
                             runtime writes into .github/workflows, curl | bash
  * crypto clipper         - window.fetch / XMLHttpRequest.open overrides,
                             hardcoded wallet addresses used with .replace()
  * lifecycle scripts      - pre/post/install hooks in package.json (the primary
                             supply-chain execution vector)

It is deliberately tuned to avoid the normal patterns of a Next.js +
Supabase + Stripe + Sentry app (plain `process.env.FOO`, ordinary `fetch()`).

Exit code is non-zero when any finding at or above the fail threshold is
present, so it can gate CI. Tune with env vars / CLI flags or an allowlist.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict

# --- severity model -------------------------------------------------------

SEV_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}
SEV_LABEL = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}

# Directories never worth scanning (deps, build output, vcs, the scanner itself)
DEFAULT_EXCLUDE_DIRS = {
    "node_modules", ".git", ".next", ".turbo", ".vercel", ".cache",
    "dist", "build", "out", "coverage", ".pnpm-store", ".yarn",
    "vendor", "__pycache__", ".github/scripts",
}

# Only these extensions are inspected; everything else (images, fonts) skipped.
SCAN_EXTENSIONS = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".yml", ".yaml", ".sh", ".bash", ".mts", ".cts",
}

# Files larger than this are read only up to the cap (giant minified blobs
# are themselves suspicious and handled by the base64/hex heuristics).
MAX_BYTES = 4 * 1024 * 1024

# Sentinel: files under .github/ that contain this string are skipped so the
# scanner and its own workflow do not flag themselves.
SELF_IGNORE = "MALWARE-SCAN-SELF-IGNORE"


@dataclass
class Finding:
    rule_id: str
    severity: int
    category: str
    description: str
    path: str
    line: int
    snippet: str


@dataclass
class Rule:
    id: str
    severity: int
    category: str
    description: str
    pattern: re.Pattern
    # optional: restrict to files whose path matches this regex
    path_filter: re.Pattern | None = None


def rx(p: str) -> re.Pattern:
    return re.compile(p)


# --- single-line regex rules ----------------------------------------------
# Each pattern is written to match the *malicious shape*, not the benign one.

RULES: list[Rule] = [
    # ---- worm / supply-chain IOCs ----
    Rule("worm.shai_hulud", 4, "supply-chain",
         "Reference to the Shai-Hulud npm worm family",
         rx(r"(?i)shai[\s_-]?hulud")),
    Rule("worm.repo_enum_query", 4, "exfiltration",
         "GitHub repo-enumeration query string used by the worm to find writable repos",
         rx(r"affiliation=owner,collaborator,organization_member")),
    Rule("worm.bun_environment", 3, "supply-chain",
         "Reference to bun_environment.js / setup_bun (worm 2.x dropper)",
         rx(r"(?i)\b(bun_environment\.js|setup_bun(\.js)?)\b")),
    Rule("worm.trufflehog", 3, "token-theft",
         "Invocation of TruffleHog (worm uses it to harvest secrets)",
         rx(r"(?i)\btrufflehog\b")),
    Rule("worm.runtime_workflow_write", 3, "supply-chain",
         "Code writes a file into .github/workflows at runtime (CI persistence)",
         rx(r"(?i)(writeFile|writeFileSync|outputFile|createWriteStream)\s*\([^)]*\.github/workflows")),

    # ---- obfuscation ----
    Rule("obf.eval_decode", 4, "obfuscation",
         "eval() of a decoded payload (atob/Buffer.from/unescape/fromCharCode)",
         rx(r"\beval\s*\(\s*(atob|Buffer\.from|decodeURIComponent|unescape|String\.fromCharCode)\b")),
    Rule("obf.function_iife", 3, "obfuscation",
         "Function() constructor built from a string literal and immediately invoked",
         rx(r"\b(new\s+)?Function\s*\(\s*[\"'`][^\"'`]*[\"'`]\s*\)\s*\(")),
    Rule("obf.eval_generic", 2, "obfuscation",
         "Use of eval() (rare and risky in application source)",
         rx(r"(?<![\w.])eval\s*\(")),
    Rule("obf.new_function", 2, "obfuscation",
         "new Function(...) dynamic code construction",
         rx(r"\bnew\s+Function\s*\(")),
    Rule("obf.charcode_chain", 2, "obfuscation",
         "String.fromCharCode chain (string hiding)",
         rx(r"String\.fromCharCode\(\s*\d+\s*,\s*\d+\s*,\s*\d+")),

    # ---- code execution ----
    Rule("exec.shell_fetch", 4, "code-execution",
         "child_process executing a remote-fetch-and-run (curl|wget piped to a shell, base64 -d, node -e)",
         rx(r"(exec|execSync|spawn|spawnSync)\s*\(\s*[\"'`][^\"'`]*"
            r"(curl\s|wget\s|\|\s*(sh|bash)|base64\s+-d|node\s+-e\b)")),
    Rule("exec.vm_module", 2, "code-execution",
         "Use of the Node 'vm' module (sandboxed code execution)",
         rx(r"require\(\s*[\"']vm[\"']\s*\)|from\s+[\"']vm[\"']")),

    # ---- token / credential theft ----
    Rule("cred.env_dump", 4, "token-theft",
         "Serializing the entire process.env (classic env exfiltration)",
         rx(r"JSON\.stringify\(\s*process\.env\b|\.\.\.process\.env\b")),
    Rule("cred.env_enumerate", 3, "token-theft",
         "Enumerating all environment variables (Object.keys/entries/values(process.env))",
         rx(r"Object\.(keys|entries|values)\(\s*process\.env\b")),
    Rule("cred.sensitive_read", 3, "token-theft",
         "Reading a credential file (.npmrc/.aws/.ssh/.git config/.netrc/etc)",
         rx(r"(readFile|readFileSync|createReadStream|openSync|cat\s)[^\n]*"
            r"(\.npmrc|\.aws/credentials|\.ssh/id_[a-z]+|/etc/passwd|\.git/config|\.netrc|\.docker/config\.json|\.kube/config)")),
    Rule("cred.sensitive_path", 2, "token-theft",
         "Reference to a sensitive credential path",
         rx(r"(\.aws/credentials|\.ssh/id_rsa|/etc/passwd|\.npmrc|\.netrc|\.kube/config)")),

    # ---- exfiltration sinks ----
    Rule("exfil.canary_host", 3, "exfiltration",
         "Outbound reference to a known exfil / canary host",
         rx(r"(?i)(webhook\.site|requestbin|requestcatcher\.com|\.pipedream\.net|"
            r"burpcollaborator|interactsh|oast\.(live|fun|pro|site|me)|dnslog\.cn|"
            r"\.ngrok\.(io|app)|pipedream\.com/workflows)")),
    Rule("exfil.hardcoded_ip", 2, "exfiltration",
         "HTTP request to a hardcoded IP address",
         rx(r"(fetch|axios|https?\.request|got|XMLHttpRequest)[^\n]{0,40}"
            r"https?://\d{1,3}(\.\d{1,3}){3}")),

    # ---- crypto clipper ----
    Rule("clip.fetch_override", 3, "crypto-clipper",
         "Overriding window.fetch / XMLHttpRequest.open (network interception)",
         rx(r"(window\.fetch\s*=|XMLHttpRequest\.prototype\.(open|send)\s*=|"
            r"const\s+_?\w*[Ff]etch\s*=\s*window\.fetch)")),
    Rule("clip.wallet_swap", 3, "crypto-clipper",
         "Hardcoded crypto wallet address used with a string replace (address swap)",
         rx(r"[\"'](0x[a-fA-F0-9]{40}|(bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,39})[\"'][^\n]{0,80}\.replace\(")),
    Rule("clip.ethereum_hook", 2, "crypto-clipper",
         "Hook into window.ethereum (unexpected outside a dapp)",
         rx(r"window\.ethereum\b")),

    # ---- curl|bash in shell scripts / workflows ----
    Rule("sh.curl_pipe_shell", 3, "code-execution",
         "Remote script piped straight into a shell (curl/wget | sh|bash)",
         rx(r"(curl|wget)\s+[^|\n]*\|\s*(sudo\s+)?(sh|bash)\b"),
         path_filter=rx(r"\.(sh|bash|ya?ml)$")),
]

# Identifiers like _0x1a2b3c are the signature of javascript-obfuscator output.
HEX_ID_RE = re.compile(r"_0x[0-9a-fA-F]{4,}")
# A long run of base64 characters inside a string literal.
B64_RE = re.compile(r"[\"'`]([A-Za-z0-9+/]{200,}={0,2})[\"'`]")
# A wall of \xNN escapes.
HEX_ESCAPE_RE = re.compile(r"(\\x[0-9a-fA-F]{2}){8,}")

SUSPICIOUS_SCRIPT_TOKENS = re.compile(
    r"(curl\s|wget\s|node\s+-e\b|base64\s+-d|eval\b|\|\s*(sh|bash)\b|"
    r"https?://|child_process|\.js\b.*&&)")


def iter_files(root: str, exclude_dirs: set[str]):
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root).replace(os.sep, "/")
        # prune excluded directories
        dirnames[:] = [
            d for d in dirnames
            if d not in exclude_dirs
            and f"{rel_dir}/{d}".lstrip("./") not in exclude_dirs
        ]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext not in SCAN_EXTENSIONS:
                continue
            yield os.path.join(dirpath, name)


def read_text(path: str) -> str | None:
    try:
        with open(path, "rb") as fh:
            raw = fh.read(MAX_BYTES)
    except OSError:
        return None
    return raw.decode("utf-8", errors="replace")


def scan_package_json(rel: str, text: str) -> list[Finding]:
    out: list[Finding] = []
    if os.path.basename(rel) != "package.json":
        return out
    try:
        data = json.loads(text)
    except ValueError:
        return out
    scripts = data.get("scripts", {})
    if not isinstance(scripts, dict):
        return out
    for hook in ("preinstall", "install", "postinstall", "prepare", "prepublish"):
        if hook not in scripts:
            continue
        value = str(scripts[hook])
        suspicious = bool(SUSPICIOUS_SCRIPT_TOKENS.search(value))
        sev = 3 if suspicious else 2
        out.append(Finding(
            rule_id=f"pkg.lifecycle.{hook}",
            severity=sev,
            category="supply-chain",
            description=(f"package.json '{hook}' lifecycle script"
                         + (" containing a remote-fetch/exec pattern" if suspicious
                            else " present (lifecycle hooks are the main supply-chain exec vector)")),
            path=rel,
            line=1,
            snippet=f'"{hook}": "{value[:160]}"',
        ))
    return out


def scan_file(path: str, root: str) -> list[Finding]:
    rel = os.path.relpath(path, root).replace(os.sep, "/")
    text = read_text(path)
    if text is None:
        return []
    # self-ignore for files under .github (scanner + its own workflow)
    if rel.startswith(".github/") and SELF_IGNORE in text:
        return []

    findings: list[Finding] = []
    lines = text.splitlines()

    # package.json lifecycle hooks
    findings.extend(scan_package_json(rel, text))

    # per-line single-pattern rules
    for rule in RULES:
        if rule.path_filter and not rule.path_filter.search(rel):
            continue
        for i, line in enumerate(lines, start=1):
            if rule.pattern.search(line):
                findings.append(Finding(
                    rule_id=rule.id, severity=rule.severity, category=rule.category,
                    description=rule.description, path=rel, line=i,
                    snippet=line.strip()[:200],
                ))

    # whole-file heuristics

    # javascript-obfuscator hex identifiers (needs density to avoid FPs)
    hex_hits = HEX_ID_RE.findall(text)
    if len(hex_hits) >= 5:
        first = next((i for i, l in enumerate(lines, 1) if HEX_ID_RE.search(l)), 1)
        findings.append(Finding(
            "obf.hex_identifiers", 3, "obfuscation",
            f"Dense hex-style identifiers ({len(hex_hits)}x _0x....) — javascript-obfuscator signature",
            rel, first, lines[first - 1].strip()[:200] if lines else ""))

    # giant base64 blobs (skip css/svg/data-uri contexts)
    if not rel.endswith((".css", ".svg")):
        for i, line in enumerate(lines, 1):
            if "base64," in line or "data:" in line:
                continue
            m = B64_RE.search(line)
            if m:
                blen = len(m.group(1))
                sev = 3 if blen >= 800 else 2
                findings.append(Finding(
                    "obf.base64_blob", sev, "obfuscation",
                    f"Large embedded base64 string literal ({blen} chars)",
                    rel, i, line.strip()[:120] + "..."))

    # \x escape walls
    for i, line in enumerate(lines, 1):
        if HEX_ESCAPE_RE.search(line):
            findings.append(Finding(
                "obf.hex_escapes", 2, "obfuscation",
                "Long run of \\xNN escape sequences (string obfuscation)",
                rel, i, line.strip()[:120] + "..."))

    return findings


def load_allowlist(path: str) -> list[str]:
    if not path or not os.path.isfile(path):
        return []
    entries = []
    with open(path, encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.strip()
            if line and not line.startswith("#"):
                entries.append(line)
    return entries


def is_allowlisted(f: Finding, allow: list[str]) -> bool:
    # entry forms:  <path>::<rule_id>  |  <path>  |  ::<rule_id>  |  <rule_id>
    for entry in allow:
        if "::" in entry:
            ep, er = entry.split("::", 1)
            ep, er = ep.strip(), er.strip()
            if (not ep or f.path.startswith(ep)) and (not er or f.rule_id == er):
                return True
        else:
            if f.path.startswith(entry) or f.rule_id == entry:
                return True
    return False


def write_step_summary(findings: list[Finding], fail_level: int, failed: bool):
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary:
        return
    by_sev: dict[int, int] = {}
    for f in findings:
        by_sev[f.severity] = by_sev.get(f.severity, 0) + 1
    lines = ["## Malicious-code scan", ""]
    if not findings:
        lines.append("No suspicious patterns detected.")
    else:
        lines.append("| Severity | Count |")
        lines.append("|----------|-------|")
        for sev in sorted(by_sev, reverse=True):
            lines.append(f"| {SEV_LABEL[sev]} | {by_sev[sev]} |")
        lines.append("")
        lines.append(f"**Result:** {'FAILED' if failed else 'passed'} "
                     f"(fail threshold = {SEV_LABEL[fail_level]})")
        lines.append("")
        lines.append("| Severity | Rule | File:Line | Detail |")
        lines.append("|----------|------|-----------|--------|")
        for f in sorted(findings, key=lambda x: -x.severity)[:200]:
            detail = f.description.replace("|", "\\|")
            lines.append(f"| {SEV_LABEL[f.severity]} | `{f.rule_id}` | "
                         f"`{f.path}:{f.line}` | {detail} |")
    with open(summary, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(description="Heuristic malicious-code scanner")
    ap.add_argument("root", nargs="?", default=".", help="directory to scan")
    ap.add_argument("--fail-on", default=os.environ.get("MALWARE_SCAN_FAIL_ON", "high"),
                    choices=list(SEV_ORDER), help="minimum severity that fails the run")
    ap.add_argument("--allowlist", default=".github/malware-scan-allowlist.txt",
                    help="path to allowlist file")
    ap.add_argument("--json", dest="json_out", default="", help="write JSON findings to this path")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    fail_level = SEV_ORDER[args.fail_on]
    allow = load_allowlist(os.path.join(root, args.allowlist))

    findings: list[Finding] = []
    for path in iter_files(root, DEFAULT_EXCLUDE_DIRS):
        findings.extend(scan_file(path, root))

    findings = [f for f in findings if not is_allowlisted(f, allow)]
    findings.sort(key=lambda f: (-f.severity, f.path, f.line))

    # ---- report ----
    print("=" * 72)
    print(" Malicious-code heuristic scan")
    print(f" root: {root}")
    print(f" files matched extensions; fail threshold: {args.fail_on.upper()}")
    print("=" * 72)

    if not findings:
        print("\n  No suspicious patterns detected.\n")
    else:
        current = None
        for f in findings:
            if f.severity != current:
                current = f.severity
                print(f"\n[{SEV_LABEL[f.severity]}]")
            print(f"  {f.path}:{f.line}  ({f.rule_id} / {f.category})")
            print(f"      {f.description}")
            if f.snippet:
                print(f"      > {f.snippet}")

    counts: dict[int, int] = {}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    print("\n" + "-" * 72)
    print(" Summary: " + (", ".join(
        f"{SEV_LABEL[s]}={counts[s]}" for s in sorted(counts, reverse=True))
        or "clean"))

    blocking = [f for f in findings if f.severity >= fail_level]
    failed = bool(blocking)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump([asdict(f) for f in findings], fh, indent=2)

    write_step_summary(findings, fail_level, failed)

    if failed:
        print(f"\n FAILED: {len(blocking)} finding(s) at or above "
              f"{args.fail_on.upper()}. See details above.")
        print(" If a finding is a confirmed false positive, add it to "
              f"{args.allowlist} (form: path::rule_id).")
        print("-" * 72)
        return 1

    print("\n PASSED: no findings at or above the fail threshold.")
    print("-" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
