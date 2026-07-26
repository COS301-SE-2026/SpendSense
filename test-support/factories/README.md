# Factories

Factories create one valid database record, with safe defaults and optional overrides. They do not make API requests, control a browser, or contain assertions.

Add a factory only when the project needs to create that record type repeatedly. Keep its inputs small, return the created record, and create unique user identifiers by default.
