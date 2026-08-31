"""
Synthetic loan-tape generator for the Intain Loan Data Verification Copilot (Full Stack Track).

Schema is a simplified version of the public Fannie Mae Single-Family Loan Performance
Data / Freddie Mac Single-Family Loan-Level Dataset field layouts, matching the field
names given in the problem statement (section 6).

Produces, in ./output:
  - loan_tape.csv                 (primary dataset, 1,500 rows)
  - servicer_update.csv           (partial/conflicting second source)
  - document_manifest.csv         (document availability by loan)
  - validation_rules.json         (rule config used by the validation engine)
  - users.json                    (mock users/roles for auth)
  - expected_exception_sample.csv (small known-exception sample for orientation)

Every "intentional data issue" from problem-statement section 7 is deliberately
injected at a known rate so the demo always has something to show.
"""

import csv
import json
import random
from datetime import date, timedelta

random.seed(42)  # reproducible dataset

OUTDIR = "output"
import os
os.makedirs(OUTDIR, exist_ok=True)

N_LOANS = 1500

US_STATES = ["CA", "TX", "NY", "FL", "IL", "OH", "PA", "GA", "NC", "MI",
             "WA", "AZ", "CO", "VA", "NJ", "MA", "TN", "IN", "MO", "WI"]
INVALID_STATES = ["XX", "ZZ", "QQ"]  # for invalid-state-code issue

LOAN_TYPES = ["conventional", "fha", "va", "usda"]
LOAN_PURPOSE = ["purchase", "refinance_rate_term", "refinance_cashout"]
CREDIT_GRADE = ["A", "B", "C", "D"]
INCOME_BAND = ["<40k", "40k-70k", "70k-100k", "100k-150k", "150k+"]
EMPLOYMENT_LENGTH = ["<1yr", "1-3yr", "3-5yr", "5-10yr", "10yr+"]
SERVICERS = ["Meridian Loan Servicing", "Northstar Mortgage Svc", "Coastal Capital Servicing",
             "Summit Home Loans", "BluePeak Servicing"]
SOURCE_SYSTEMS = ["LOS-Alpha", "LOS-Beta", "ManualUpload", "PartnerAPI"]
PAYMENT_STATUS = ["current", "30_dpd", "60_dpd", "90plus_dpd", "closed_paid", "closed_default"]
DOC_STATUS = ["complete", "partial", "missing", "pending_review"]

def rand_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def fmt(d):
    return d.strftime("%Y-%m-%d")

loan_rows = []
servicer_rows = []
doc_rows = []
expected_exceptions = []

used_loan_ids = set()

def new_loan_id(i):
    return f"LN{100000 + i}"

for i in range(N_LOANS):
    loan_id = new_loan_id(i)
    borrower_id = f"BR{200000 + i}"

    orig_date = rand_date(2018, 2024)
    term_months = random.choice([120, 180, 240, 360])
    maturity_date = orig_date + timedelta(days=term_months * 30)

    original_principal = round(random.uniform(80000, 650000), 2)
    # current balance normally less than original, decreasing with loan age
    age_factor = random.uniform(0.55, 0.98)
    current_balance = round(original_principal * age_factor, 2)

    interest_rate = round(random.uniform(2.5, 8.75), 3)
    borrower_state = random.choice(US_STATES)
    loan_type = random.choice(LOAN_TYPES)
    loan_purpose = random.choice(LOAN_PURPOSE)
    credit_grade = random.choice(CREDIT_GRADE)
    employment_length = random.choice(EMPLOYMENT_LENGTH)
    income_band = random.choice(INCOME_BAND)
    servicer_name = random.choice(SERVICERS)
    source_system = random.choice(SOURCE_SYSTEMS)

    payment_status = random.choices(
        PAYMENT_STATUS, weights=[70, 10, 6, 4, 8, 2], k=1
    )[0]

    if payment_status == "current":
        days_past_due = 0
    elif payment_status == "30_dpd":
        days_past_due = random.randint(1, 30)
    elif payment_status == "60_dpd":
        days_past_due = random.randint(31, 60)
    elif payment_status == "90plus_dpd":
        days_past_due = random.randint(61, 150)
    else:
        days_past_due = 0

    last_payment_date = rand_date(2024, 2026)
    last_updated_at = rand_date(2025, 2026)
    document_status = random.choices(
        DOC_STATUS, weights=[75, 12, 8, 5], k=1
    )[0]

    row = {
        "loan_id": loan_id,
        "borrower_id": borrower_id,
        "loan_type": loan_type,
        "origination_date": fmt(orig_date),
        "maturity_date": fmt(maturity_date),
        "original_principal": original_principal,
        "current_balance": current_balance,
        "interest_rate": interest_rate,
        "term_months": term_months,
        "borrower_state": borrower_state,
        "loan_purpose": loan_purpose,
        "credit_grade": credit_grade,
        "employment_length": employment_length,
        "income_band": income_band,
        "payment_status": payment_status,
        "days_past_due": days_past_due,
        "servicer_name": servicer_name,
        "last_payment_date": fmt(last_payment_date),
        "last_updated_at": fmt(last_updated_at),
        "document_status": document_status,
        "source_system": source_system,
    }
    loan_rows.append(row)
    used_loan_ids.add(loan_id)

    # servicer_update.csv: partial file, ~30% of loans appear, some with conflicting values
    if random.random() < 0.30:
        conflict = random.random() < 0.4
        servicer_rows.append({
            "loan_id": loan_id,
            "current_balance": round(current_balance * (0.9 if conflict else 1.0), 2),
            "payment_status": random.choice(PAYMENT_STATUS) if conflict else payment_status,
            "days_past_due": random.randint(0, 120) if conflict else days_past_due,
            "last_updated_at": fmt(rand_date(2025, 2026)),
            "servicer_name": servicer_name,
        })

    # document_manifest.csv
    doc_rows.append({
        "loan_id": loan_id,
        "document_status": document_status,
        "documents_on_file": random.randint(0, 6),
        "last_checked_at": fmt(rand_date(2025, 2026)),
    })

# ---- Inject intentional issues (problem statement section 7) ----

def flag_exception(loan_id, rule, severity):
    expected_exceptions.append({"loan_id": loan_id, "rule_violated": rule, "severity": severity})

# 1. Missing loan IDs (blank loan_id on a few rows)
for row in random.sample(loan_rows, 15):
    row["loan_id"] = ""
    flag_exception("(blank)", "missing_loan_id", "critical")

# 2. Duplicate loan IDs
dupe_targets = random.sample([r for r in loan_rows if r["loan_id"]], 12)
for row in dupe_targets:
    dup = dict(row)
    loan_rows.append(dup)
    flag_exception(row["loan_id"], "duplicate_loan_id", "high")

# 3. Duplicate borrower + amount + origination_date combos
combo_targets = random.sample([r for r in loan_rows if r["loan_id"]], 10)
for row in combo_targets:
    dup = dict(row)
    dup["loan_id"] = new_loan_id(N_LOANS + len(loan_rows))
    loan_rows.append(dup)
    flag_exception(dup["loan_id"], "duplicate_borrower_amount_origination", "medium")

# 4. Invalid date formats
for row in random.sample([r for r in loan_rows if r["loan_id"]], 12):
    row["origination_date"] = "13/45/2024"  # malformed
    flag_exception(row["loan_id"], "invalid_date_format", "high")

# 5. Maturity date before origination date
for row in random.sample([r for r in loan_rows if r["loan_id"] and r["origination_date"] != "13/45/2024"], 10):
    row["maturity_date"] = "2015-01-01"
    flag_exception(row["loan_id"], "maturity_before_origination", "high")

# 6. Negative principal balance
for row in random.sample([r for r in loan_rows if r["loan_id"]], 8):
    row["current_balance"] = -abs(row["current_balance"])
    flag_exception(row["loan_id"], "negative_balance", "critical")

# 7. Current balance greater than original principal
for row in random.sample([r for r in loan_rows if r["loan_id"] and r["current_balance"] > 0], 10):
    row["current_balance"] = round(row["original_principal"] * 1.25, 2)
    flag_exception(row["loan_id"], "balance_exceeds_original", "high")

# 8. Interest rate outside expected range (say 2%-9% is "expected")
for row in random.sample([r for r in loan_rows if r["loan_id"]], 10):
    row["interest_rate"] = round(random.uniform(15, 25), 3)
    flag_exception(row["loan_id"], "interest_rate_out_of_range", "medium")

# 9. Payment status inconsistent with days_past_due
for row in random.sample([r for r in loan_rows if r["loan_id"]], 12):
    row["payment_status"] = "current"
    row["days_past_due"] = random.randint(45, 90)
    flag_exception(row["loan_id"], "status_dpd_mismatch", "medium")

# 10. Missing document status
for row in random.sample([r for r in loan_rows if r["loan_id"]], 10):
    row["document_status"] = ""
    flag_exception(row["loan_id"], "missing_document_status", "low")

# 12. Stale records (last_updated_at far in the past)
for row in random.sample([r for r in loan_rows if r["loan_id"]], 10):
    row["last_updated_at"] = "2021-03-15"
    flag_exception(row["loan_id"], "stale_record", "low")

# 13. Invalid state codes
for row in random.sample([r for r in loan_rows if r["loan_id"]], 8):
    row["borrower_state"] = random.choice(INVALID_STATES)
    flag_exception(row["loan_id"], "invalid_state_code", "medium")

# 14. Suspiciously repeated borrower records (same borrower_id, many loans)
repeat_borrower = "BR900000"
for j in range(6):
    lid = new_loan_id(N_LOANS + len(loan_rows) + 1)
    base = dict(loan_rows[0])
    base.update({"loan_id": lid, "borrower_id": repeat_borrower})
    loan_rows.append(base)
    flag_exception(lid, "suspicious_repeated_borrower", "medium")

# 15. Loans marked closed but still showing positive balance
for row in random.sample([r for r in loan_rows if r["loan_id"] and r["current_balance"] > 0], 8):
    row["payment_status"] = "closed_paid"
    row["current_balance"] = round(abs(row["current_balance"]) or 5000.0, 2)
    flag_exception(row["loan_id"], "closed_loan_positive_balance", "high")

random.shuffle(loan_rows)

# ---- Write files ----

loan_fields = ["loan_id","borrower_id","loan_type","origination_date","maturity_date",
               "original_principal","current_balance","interest_rate","term_months",
               "borrower_state","loan_purpose","credit_grade","employment_length",
               "income_band","payment_status","days_past_due","servicer_name",
               "last_payment_date","last_updated_at","document_status","source_system"]

with open(f"{OUTDIR}/loan_tape.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=loan_fields)
    w.writeheader()
    w.writerows(loan_rows)

servicer_fields = ["loan_id","current_balance","payment_status","days_past_due",
                    "last_updated_at","servicer_name"]
with open(f"{OUTDIR}/servicer_update.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=servicer_fields)
    w.writeheader()
    w.writerows(servicer_rows)

doc_fields = ["loan_id","document_status","documents_on_file","last_checked_at"]
with open(f"{OUTDIR}/document_manifest.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=doc_fields)
    w.writeheader()
    w.writerows(doc_rows)

exc_fields = ["loan_id","rule_violated","severity"]
with open(f"{OUTDIR}/expected_exception_sample.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=exc_fields)
    w.writeheader()
    w.writerows(expected_exceptions[:60])  # small orientation sample

validation_rules = {
    "rules": [
        {"id": "missing_loan_id", "description": "loan_id must not be blank", "severity": "critical"},
        {"id": "duplicate_loan_id", "description": "loan_id must be unique across the tape", "severity": "high"},
        {"id": "duplicate_borrower_amount_origination", "description": "borrower_id + original_principal + origination_date combination must not repeat", "severity": "medium"},
        {"id": "invalid_date_format", "description": "origination_date and maturity_date must be valid ISO dates (YYYY-MM-DD)", "severity": "high"},
        {"id": "maturity_before_origination", "description": "maturity_date must be after origination_date", "severity": "high"},
        {"id": "negative_balance", "description": "current_balance must not be negative", "severity": "critical"},
        {"id": "balance_exceeds_original", "description": "current_balance must not exceed original_principal", "severity": "high"},
        {"id": "interest_rate_out_of_range", "description": "interest_rate must fall between 2.0 and 9.0", "severity": "medium", "min": 2.0, "max": 9.0},
        {"id": "status_dpd_mismatch", "description": "payment_status must be consistent with days_past_due thresholds", "severity": "medium"},
        {"id": "missing_document_status", "description": "document_status must not be blank", "severity": "low"},
        {"id": "servicer_conflict", "description": "loan_tape and servicer_update values must match for overlapping fields", "severity": "high"},
        {"id": "stale_record", "description": "last_updated_at must be within the last 12 months", "severity": "low"},
        {"id": "invalid_state_code", "description": "borrower_state must be a valid two-letter US state code", "severity": "medium"},
        {"id": "suspicious_repeated_borrower", "description": "flag borrower_ids appearing on an unusually high number of loans", "severity": "medium", "threshold": 5},
        {"id": "closed_loan_positive_balance", "description": "loans with payment_status closed_paid or closed_default must have current_balance == 0", "severity": "high"},
    ]
}
with open(f"{OUTDIR}/validation_rules.json", "w") as f:
    json.dump(validation_rules, f, indent=2)

users = {
    "users": [
        {"username": "operator1", "password": "operator123", "role": "data_operator", "display_name": "Data Operator"},
        {"username": "reviewer1", "password": "reviewer123", "role": "reviewer", "display_name": "Loan Reviewer"},
        {"username": "consumer1", "password": "consumer123", "role": "data_consumer", "display_name": "Data Consumer"},
    ]
}
with open(f"{OUTDIR}/users.json", "w") as f:
    json.dump(users, f, indent=2)

print(f"Generated {len(loan_rows)} loan rows, {len(servicer_rows)} servicer rows, "
      f"{len(doc_rows)} document rows, {len(expected_exceptions)} known exceptions.")
print(f"Files written to ./{OUTDIR}/")