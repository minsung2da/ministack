"""
Canonical service taxonomy for the MiniStack web console.

Single source of truth for:
- Sidebar grouping (category)
- Display name (AWS canonical capitalization per UI-SPEC)
- Alias canonicalization (cognito-idp + cognito-identity -> cognito)

Per 01-UI-SPEC.md "Service Categories" (locked) and 01-RESEARCH.md "Open Question 3".
"""
from __future__ import annotations

# Category display order matches UI-SPEC "Service Categories" table.
CATEGORY_ORDER: tuple[str, ...] = (
    "Compute",
    "Storage",
    "Database",
    "Networking & Content Delivery",
    "Application Integration",
    "Management & Governance",
    "Security, Identity & Compliance",
    "Other",
)

# Maps a canonical service key -> (display_name, category).
# Canonical key = the slug used in URLs (/_console/services/{key}).
# Handlers from SERVICE_HANDLERS that are not listed here fall into category="Other"
# with display_name=key.title(). Add to this table when a new service gets a dedicated UI.
SERVICE_TAXONOMY: dict[str, tuple[str, str]] = {
    # Compute
    "ec2":                  ("EC2",                 "Compute"),
    "lambda":               ("Lambda",              "Compute"),
    "ecs":                  ("ECS",                 "Compute"),
    "ecr":                  ("ECR",                 "Compute"),
    "elasticmapreduce":     ("EMR",                 "Compute"),
    # Storage
    "s3":                   ("S3",                  "Storage"),
    "elasticfilesystem":    ("EFS",                 "Storage"),
    # Database
    "dynamodb":             ("DynamoDB",            "Database"),
    "rds":                  ("RDS",                 "Database"),
    "elasticache":          ("ElastiCache",         "Database"),
    # Networking & Content Delivery
    "cloudfront":           ("CloudFront",          "Networking & Content Delivery"),
    "route53":              ("Route 53",            "Networking & Content Delivery"),
    "elasticloadbalancing": ("ELB",                 "Networking & Content Delivery"),
    "apigateway":           ("API Gateway",         "Networking & Content Delivery"),
    "appsync":              ("AppSync",             "Networking & Content Delivery"),
    # Application Integration
    "sqs":                  ("SQS",                 "Application Integration"),
    "sns":                  ("SNS",                 "Application Integration"),
    "events":               ("EventBridge",         "Application Integration"),
    "states":               ("Step Functions",      "Application Integration"),
    "kinesis":              ("Kinesis",             "Application Integration"),
    "firehose":             ("Kinesis Firehose",    "Application Integration"),
    # Management & Governance
    "monitoring":           ("CloudWatch",          "Management & Governance"),
    "logs":                 ("CloudWatch Logs",     "Management & Governance"),
    "cloudformation":       ("CloudFormation",      "Management & Governance"),
    "ssm":                  ("Systems Manager",     "Management & Governance"),
    "iam":                  ("IAM",                 "Management & Governance"),
    "sts":                  ("STS",                 "Management & Governance"),
    # Security, Identity & Compliance
    "kms":                  ("KMS",                 "Security, Identity & Compliance"),
    "secretsmanager":       ("Secrets Manager",     "Security, Identity & Compliance"),
    "acm":                  ("Certificate Manager", "Security, Identity & Compliance"),
    "wafv2":                ("WAF",                 "Security, Identity & Compliance"),
    "cognito":              ("Cognito",             "Security, Identity & Compliance"),
    # Other
    "glue":                 ("Glue",                "Other"),
    "athena":               ("Athena",              "Other"),
    "ses":                  ("SES",                 "Other"),
}

# Aliases that must collapse to a single canonical key.
# Maps SERVICE_HANDLERS key -> canonical key (if different).
HANDLER_TO_CANONICAL: dict[str, str] = {
    "cognito-idp":      "cognito",
    "cognito-identity": "cognito",
}


def canonical_key(handler_key: str) -> str:
    """Collapse SERVICE_HANDLERS key to canonical console service key."""
    return HANDLER_TO_CANONICAL.get(handler_key, handler_key)


def display_name(canonical: str) -> str:
    """Return the AWS-canonical display name for a service key."""
    entry = SERVICE_TAXONOMY.get(canonical)
    if entry:
        return entry[0]
    # Unknown service -- Title-case the key as a fallback
    return canonical.replace("-", " ").replace("_", " ").title()


def category(canonical: str) -> str:
    """Return the UI category for a service key."""
    entry = SERVICE_TAXONOMY.get(canonical)
    if entry:
        return entry[1]
    return "Other"


def build_registry(handler_keys: list[str]) -> list[dict[str, str]]:
    """
    Build the /_console/api/services payload from a list of SERVICE_HANDLERS keys.

    Collapses aliases, de-duplicates, sorts by (category order, display name).
    Returns [{key, name, category}, ...].
    """
    seen: set[str] = set()
    entries: list[dict[str, str]] = []
    for raw in handler_keys:
        key = canonical_key(raw)
        if key in seen:
            continue
        seen.add(key)
        entries.append({
            "key": key,
            "name": display_name(key),
            "category": category(key),
        })

    def sort_key(entry: dict[str, str]) -> tuple[int, str]:
        try:
            cat_idx = CATEGORY_ORDER.index(entry["category"])
        except ValueError:
            cat_idx = len(CATEGORY_ORDER)
        return (cat_idx, entry["name"].lower())

    entries.sort(key=sort_key)
    return entries
