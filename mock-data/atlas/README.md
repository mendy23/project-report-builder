# Atlas Migration mock data

One fictional project, "Atlas Migration" (moving a customer data platform to a cloud
warehouse, go-live 30 Nov 2026), spread over several input types so every part of the
app gets exercised. All names and numbers are invented.

## Files

| File | Type | What it tests |
|---|---|---|
| `weekly-notes.txt` | notes | the main input: summary, figures, highlights, risks, next steps |
| `standup-notes.txt` | notes | messy lowercase phone notes, ticket id, a blocker |
| `email-legal.txt` | notes | an email with dates, a deadline and a contingency cost |
| `notes-no-numbers.txt` | notes | qualitative only, so no KPI figures to extract |
| `notes-short.txt` | notes | one line, the minimum input |
| `sprint-velocity.csv` | CSV | two numeric columns, so a **line** chart with two series |
| `weekly-active-users.csv` | CSV | time-like labels, so a **line** chart |
| `budget-breakdown.csv` | CSV | two columns, "budget" in the header, so a **pie** chart |
| `service-status.csv` | CSV | text columns before the numeric one, so a **bar** chart |
| `dashboard-screenshot.png` | image | OCR of metric tiles (180 ms, 0.3%, 12.4K req/s, 99.95%, 91%, 9 of 14) |
| `slack-thread-screenshot.png` | image | OCR of a chat: disk at 91%, 2 TB resize, 41 questions due Oct 21, Oct 28 signature |
| `roadmap-screenshot.png` | image | OCR of phase names and dates |

## Facts to look for in the card

- Status: at risk (unsigned contract blocks billing cutover)
- Summary: phase 2 finished a day early; 9 of 14 services live
- Figures: p95 latency 320 ms to 180 ms (44%), error rate 0.3%, 1.4M records migrated,
  2,300 manual fixes, $480K approved and $312K spent, 37 bugs closed and 12 open
- Highlights: dashboard widget shipped, budget signed off, 2 engineers onboarded
- Risks: DataBridge contract unsigned until Oct 28 at the earliest, bus factor on the
  legacy billing job (Mei), staging disk at 91%
- Next steps: phase 3 starts Mon 19 Oct with notifications-api, resize staging by
  Wednesday, escalate the contract on Friday, load test again on 26 Oct

## Suggested runs

1. Notes only: paste `weekly-notes.txt`.
2. Notes plus all four CSVs: expect a pie, a bar and three line series in the palette.
3. Everything: add the three screenshots and `email-legal.txt`; OCR text should join the notes.
4. `notes-no-numbers.txt`: the KPI block should end up empty and be removed.
5. `notes-short.txt`: a card with very little content.
6. Warnings check: edit a number in `weekly-notes.txt` after the first run (for example
   say 180 ms was 150 ms) and confirm the model's text gets a warning.
