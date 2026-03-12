# Domesday

Budget CSV viewer and linker.

## CSV layout

`Domesday.csv` uses two header rows:
- Row 1: date slots (a date can appear multiple times).
- Row 2: `Description` / `Amount` column pairs for each date slot.

If a date needs more transaction space, another `Description` / `Amount` pair is appended for that date.

## Link transactions into Domesday.csv

Run the linker directly:

```bash
python Domesday/link_transactions.py \
  --transactions Domesday/Jan-Feb_Transactions.csv \
  --domesday Domesday/Domesday.csv \
  --mode add
```

Modes:
- `add`: append imported transactions into open date slots.
- `set`: clear touched category/date slots, then write imported transactions.

## Web upload flow (auto-runs linker)

Start the local server from repo root:

```bash
python Domesday/domesday_server.py
```

Open `http://127.0.0.1:8000/Domesday/index.html`, select a transactions CSV, and the page will call the API to run the linker and update `Domesday.csv`.
