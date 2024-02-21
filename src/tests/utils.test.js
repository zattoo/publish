const {
    getBody, 
    fetchNPMVersions
} = require  ('../utils.js');
const { test } = require  ('node:test');
const assert = require  ('node:assert/strict');

const token = '5047ed13-698a-494c-9c4c-8fa26ecb66f5';

test('Obtains the versions', async () => {
    const versions = await fetchNPMVersions('react', token)

    assert.equal(versions[0], '0.0.1');
    assert.equal(versions[3], '0.1.2');
});

test('Gets the content using notes', async () => {
  const body = await getBody('src/', 'src/tests/notes');

  assert.equal(body.includes('This is foo'), true);
  assert.equal(body.includes('This is bar'), true);
})

test('Gets the content using changelog', async () => {
  const body = await getBody('CHANGELOG.md');

  assert.equal(body.includes('Updated dependencies'), true)  
})
