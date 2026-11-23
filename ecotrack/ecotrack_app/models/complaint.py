PRIORITY_RULES = {
    "Sewage": "High",
    "Garbage": "Medium",
    "Garbage overflow": "Medium",
    "Illegal Dumping": "Medium",
    "Minor litter": "Low",
}


def calculate_priority(issue_type):
    """Assign priority from issue type so admins can focus on severe issues."""
    return PRIORITY_RULES.get(issue_type, "Low")
