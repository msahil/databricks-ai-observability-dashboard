# Databricks notebook source
# MAGIC %md
# MAGIC # Drop AI Observability Schema
# MAGIC
# MAGIC Drops the Unity Catalog schema before demo data generation.
# MAGIC Run as the first task in the `demo_data` bundle job.

# COMMAND ----------

dbutils.widgets.text("catalog", "msahil")
dbutils.widgets.text("schema", "ai_observability")

catalog = dbutils.widgets.get("catalog")
schema = dbutils.widgets.get("schema")
full_name = f"{catalog}.{schema}"

spark.sql(f"DROP SCHEMA IF EXISTS {full_name} CASCADE")
print(f"✓ Dropped schema (if existed): {full_name}")
