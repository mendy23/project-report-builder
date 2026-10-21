# Harbor Campus Rollout mock data

One fictional project, "Harbor Campus Rollout" (a campus network, security and facilities
programme, go-live 15 Dec 2026), run by a PM who aligns five teams: network, security,
software, maintenance and accounting. The sources mix all teams, so it is the demo for the
**Focus** field ("network", "network, security", or empty for everything). All names and
numbers are invented.

## Files

| File | Type | What it tests |
|---|---|---|
| `cross-team-notes.txt` | notes | the main input: one section per team, figures, risks, next steps |
| `standup-notes.txt` | notes | messy lowercase phone notes, a ticket id, a blocker, on-call window |
| `email-carrier.txt` | notes | procurement email: carrier dates, a $38K fee, an accepted-risk deadline |
| `email-finance.txt` | notes | finance email: budget figures, net $265K over, steering group on 30 Oct |
| `notes-no-numbers.txt` | notes | qualitative only, so no KPI figures to extract |
| `notes-short.txt` | notes | one line, the minimum input |
| `network-latency.csv` | CSV | time-like labels, so a **line** chart |
| `sprint-velocity.csv` | CSV | two numeric columns, so a **line** chart with two series |
| `budget-by-team.csv` | CSV | "budget" in the header, so a **pie** chart |
| `wifi-rollout.csv` | CSV | text labels, one numeric column, so a **bar** chart |
| `pentest-findings.csv` | CSV | open findings by severity, a **bar** chart |
| `workstream-status.csv` | CSV | text columns before the numeric one, 14 rows, a **bar** chart |
| `dashboard-screenshot.png` | image | OCR of network metric tiles (18 ms, 10 Gbps, 112 of 160, 0.2%, 99.9%, 78%) |
| `chat-screenshot.png` | image | OCR of a team chat: retest Oct 29, fibre route Nov 3, $38K fee |
| `roadmap-screenshot.png` | image | OCR of phase names and dates |

## Facts to look for in the card (no focus)

- Status: at risk (no WAN failover, high pen-test findings open, cooling near capacity)
- Summary: core and WAN phase done, latency 42 ms to 18 ms, 112 of 160 access points live
- Figures: 1 Gbps to 10 Gbps, 3 high / 9 medium findings (1 high fixed, 2 still open), MFA 85%, firewall
  review 60%, 14 bugs closed and 6 open, p95 210 ms, $2.4M budget and $1.52M spent,
  $310K network overrun, $45K licence saving, cooling 78%
- Risks: second fibre route unconfirmed (no failover before 6 Nov), SOC 2 audit window opens
  2 Nov, HVAC part back-ordered (2 weeks), sprint velocity down to 28
- Next steps: confirm the fibre route by 30 Oct, sign off VLAN segmentation before 2 Nov,
  badge app v2.4 on 6 Nov, order the second cooling unit this week, capex forecast 23 Oct

## Suggested runs

1. **Focus "network"**: paste `cross-team-notes.txt`. Expect only network items (latency,
   access points, fibre route, the Wi-Fi 7 overrun) and nothing about HVAC, badge app or capex.
2. **Focus "network, security"**: same notes. Expect both teams, still no maintenance or
   accounting items except cost or schedule effects on those two.
3. **No focus**: expect a blend of all five teams.
4. **Everything**: add all six CSVs, the three screenshots and both emails; expect a pie, a
   bar and line series in the palette, and OCR text joined to the notes.
5. `standup-notes.txt` with focus "maintenance": expect the HVAC part and cooling only.
6. `notes-no-numbers.txt`: the KPI block should end up empty and be removed.
7. `notes-short.txt`: a card with very little content.
8. Warnings check: change a figure (for example say 18 ms was 15 ms) and confirm the
   model's text gets a warning. Note that the model may also compute figures such as
   "70% installed" from 112 of 160, which the checker flags.
