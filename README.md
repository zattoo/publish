# Publish

GitHub Action to release projects and publish packages

## Inputs

### `github_token`

`string`

Required. GitHub Token from action context

### `npm_token`

`string`

Optional. If not provided, publishing to npm will be skipped.
NPM token with publish permission.

### `sources`

`string` - glob pattern

Optional. If not provided, publish will work against project root in single mode.
Accepts glob pattern to work with multiple or other than root destinations.

### `notes`

`string`

Optional. Release notes as a string, it will take priority over changelog entries

## Usage Example

````yaml
name: Publish
jobs:
  deploy:
    name: Package
    steps:
      - uses: actions/checkout@v2
      # your stuff
      - uses: zattoo/publish@v1
        with:
          github_token: ${{github.token}}
          npm_token: ${{secrets.NPM_TOKEN}}
          sources: 'packages/*'
````

