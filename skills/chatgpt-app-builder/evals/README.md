# Evals

Manual evaluations for the creating-chatgpt-app skill.

## Format

Each eval file is a JSON array:

```json
[
  {
    "query": "User input to test",
    "expected_behavior": "OUTCOME. What the response should do."
  }
]
```

## Running Evals

In Claude Code:

```
Run the evals in evals/<filename>.json. For each query, spawn a Sonnet agent with the relevant skill context and compare the response against expected_behavior. Report pass/fail for each.
```