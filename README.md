# Publish

GitHub Action to release projects and publish packages

## Inputs

### `github_token`

`string`

Required. GitHub Token from action context

### `publish_package`

`string`

Optional. If not provided, publishing to the registry will be skipped.

### `sources`

`string` - glob pattern

Optional. If not provided, publish will work against project root in single mode.
Accepts glob pattern to work with multiple or other than root destinations.

### `notes`

`string` - path

Optional. Path to Release notes file, it will take priority over changelog entries

## Usage Example

````yaml
name: Publish
jobs:
  deploy:
    name: Package
    steps:
      - uses: actions/checkout@v4
      # your stuff
      - uses: zattoo/publish@v1
        with:
          github_token: ${{github.token}}
          sources: 'packages/*'
````
