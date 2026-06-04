import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass(frozen=True)
class Settings:
    catalog: str
    schema: str
    warehouse_id: str
    host: str | None

    @property
    def table_prefix(self) -> str:
        return f"{self.catalog}.{self.schema}"


def get_settings() -> Settings:
    return Settings(
        catalog=os.environ.get("CATALOG") or "msahil",
        schema=os.environ.get("SCHEMA") or "ai_observability",
        warehouse_id=os.environ.get("DATABRICKS_WAREHOUSE_ID") or "",
        host=os.environ.get("DATABRICKS_HOST"),
    )


def scenario_windows(start_date: datetime) -> dict[str, dict[str, datetime]]:
    """Resolve hero scenario time windows from data start date."""
    base = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "a": {
            "start": base + timedelta(days=24, hours=9, minutes=15),
            "end": base + timedelta(days=24, hours=9, minutes=45),
        },
        "b": {
            "start": base + timedelta(days=7),
            "end": base + timedelta(days=10, hours=23, minutes=59),
        },
        "c": {
            "start": base + timedelta(days=19),
            "end": base + timedelta(days=27, hours=23, minutes=59),
        },
    }


def default_time_range(days: int = 30) -> tuple[datetime, datetime]:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    return start, end
