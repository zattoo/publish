const {
    getBody,
    fetchVersions
} = require  ('../utils.js');
const { test } = require  ('node:test');
const assert = require  ('node:assert/strict');

test('Obtains the versions', async () => {
    const versions = await fetchVersions('lodash');

    assert.equal(versions[0], '0.1.0');
    assert.equal(versions[3], '0.2.2');
});

test('Gets the content using notes', async () => {
  const body = await getBody('src/', 'src/tests/assets/notes');

  assert.equal(body.includes('This is foo'), true);
  assert.equal(body.includes('This is bar'), true);
})

test('Gets the content using changelog', async () => {
  const body = await getBody('src/tests/assets/CHANGELOG.md');

  assert.equal(body.includes('Initial release'), true)
})
