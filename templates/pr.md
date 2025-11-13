# Pull Request Template

## Summary

{{summary}}

## Changes

{{#changes}}
- {{.}}
{{/changes}}

{{#breaking_changes}}
## Breaking Changes

{{breaking_changes}}
{{/breaking_changes}}

{{#migration_steps}}
## Migration Steps

{{#steps}}
{{index}}. {{.}}
{{/steps}}
{{/migration_steps}}

## Testing

{{#testing}}
{{testing}}
{{/testing}}

{{^testing}}
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
{{/testing}}

## Screenshots

{{#screenshots}}
{{screenshots}}
{{/screenshots}}

{{^screenshots}}
_No screenshots_
{{/screenshots}}

## Additional Notes

{{#notes}}
{{notes}}
{{/notes}}

---

{{#issue}}
Closes #{{issue}}
{{/issue}}
