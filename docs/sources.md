## Scraper source configuration

Scrapers are configured via `SourceSpec` objects (or a JSON file passed to the CLI).

### Default config

See `config/sources.default.json` for a starting point.

### Run with a custom config

```bash
python3 -m adsim_ingestion update --db data/benchmarks.duckdb --all --sources-file config/sources.default.json
```

### Debug a URL

To check whether a page contains HTML tables that `pandas.read_html()` can detect:

```bash
python3 - <<'PY'
from adsim_ingestion.scrape_debug import debug_table_detection
print(debug_table_detection("https://example.com"))
PY
```

If `tables` is `0`, you’ll need a custom parser for that source (many benchmark reports are images/PDFs, or gated behind auth).

