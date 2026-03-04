import argparse
import os
from datetime import datetime

from persona_generator import (
    PersonaGenerationConfig,
    PersonaGenerator,
    personas_to_duckdb,
    personas_to_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic ad-response personas."
    )
    parser.add_argument(
        "-n",
        "--n-personas",
        type=int,
        default=1000,
        help="Number of personas to generate (recommended 500–2000).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility.",
    )
    parser.add_argument(
        "--json-out",
        type=str,
        default=None,
        help="Path to JSON output file. "
        "If omitted, a timestamped file is created under ./data/",
    )
    parser.add_argument(
        "--duckdb-out",
        type=str,
        default=None,
        help="Path to DuckDB database file. "
        "If omitted, a timestamped file is created under ./data/",
    )
    parser.add_argument(
        "--table-name",
        type=str,
        default="personas",
        help="DuckDB table name for personas.",
    )
    return parser.parse_args()


def _default_paths() -> tuple[str, str]:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    base_dir = os.path.join(os.path.dirname(__file__), "data")
    json_path = os.path.join(base_dir, f"personas_{ts}.json")
    duckdb_path = os.path.join(base_dir, f"personas_{ts}.duckdb")
    return json_path, duckdb_path


def main() -> None:
    args = parse_args()

    if args.n_personas < 1:
        raise ValueError("n-personas must be at least 1.")

    json_out, duckdb_out = args.json_out, args.duckdb_out
    if json_out is None or duckdb_out is None:
        auto_json, auto_duckdb = _default_paths()
        json_out = json_out or auto_json
        duckdb_out = duckdb_out or auto_duckdb

    config = PersonaGenerationConfig(
        n_personas=args.n_personas,
        random_seed=args.seed,
    )
    generator = PersonaGenerator(config)
    df = generator.generate()

    personas_to_json(df, json_out)
    personas_to_duckdb(df, duckdb_out, table_name=args.table_name)

    print(f"Generated {len(df)} personas.")
    print(f"JSON written to: {json_out}")
    print(f"DuckDB written to: {duckdb_out} (table: {args.table_name})")


if __name__ == "__main__":
    main()

