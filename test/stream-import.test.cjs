const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Load the same classic scripts as index.html, including the offline parser bundle.
for (const file of ['vendor/zip.js-2.25.0/zip-native.min.js', 'vendor/streamparser-json-0.0.26/jsonparser.min.js', 'imports.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {filename: file});
}

function byteStream(text) {
    const bytes = new TextEncoder().encode(text);
    return {
        name: 'part.json',
        size: bytes.length,
        stream() {
            let offset = 0;
            return new ReadableStream({
                pull(controller) {
                    if (offset === bytes.length) controller.close();
                    else controller.enqueue(bytes.subarray(offset, ++offset));
                }
            });
        }
    };
}

function read(parts, type = 'followers', signal = new AbortController().signal) {
    return readSelection(parts.map(byteStream), type, 'Test', signal, () => {});
}

test('one-byte chunks preserve wrapped records, escaped strings and UTF-8 across boundaries', async () => {
    const text = JSON.stringify({
        note: 'café 📁',
        relationships_following: [
            {title: 'ALICE', note: 'escaped "quotes" and ]}'},
            {string_list_data: [{value: 'b.ob'}, {value: 'Alice'}]}
        ]
    });
    assert.deepEqual([...await read([text], 'following')], ['alice', 'b.ob']);
});

test('legacy arrays, empty exports and split files retain the original counts', async () => {
    const row = '[{"string_list_data":[{"value":"one"}]}]';
    assert.deepEqual([...await read(['[]', row, row])], ['one']);
    assert.deepEqual([...await read([row], 'following')], ['one']);
    assert.deepEqual([...await read(['{"relationships_following":[]}'], 'following')], []);
});

test('a bad tail or incorrect shape invalidates the entire selection', async () => {
    const row = '{"string_list_data":[{"value":"first"}]}';
    for (const text of ['[' + row, '[' + row + ',]', '[' + row + ']x', '', '{}', '[null]', '[{}]']) {
        await assert.rejects(read(['[]', text]), /part\.json/);
    }
    await assert.rejects(read(['{"relationships_following":[]}']), /part\.json/);
});

test('an aborted selection stops reading', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(read(['[]'], 'followers', controller.signal), {name: 'AbortError'});
});

test('HTML follower parts must be complete, unique, and in one format', () => {
    const check = (...names) => checkFollowerParts(names.map(name => ({name})));
    assert.doesNotThrow(() => check('followers_2.HTML', 'followers_1.html'));
    assert.throws(() => check('followers_1.html', 'followers_3.html'), /Missing followers_2\.html/);
    assert.throws(() => check('followers_1.html', 'followers_1.html'), /each numbered followers file once/);
    assert.throws(() => check('followers_1.html', 'followers_2.json'), /same format/);
    assert.throws(() => check('following.html'), /Choose the followers files/);
});

test('archive inspection finds HTML lists and requires following only for follow-backs', async () => {
    const writer = new zip.ZipWriter(new zip.BlobWriter());
    const folder = 'connections/followers_and_following/';
    await writer.add(folder + 'followers_1.html', new zip.TextReader('<html></html>'), {level: 0});
    await writer.add(folder + 'followers_2.html', new zip.TextReader('<html></html>'), {level: 0});
    await writer.add('__MACOSX/' + folder + 'following.html', new zip.TextReader(''), {level: 0});
    const archive = new File([await writer.close()], 'export.zip');
    const readers = [];
    try {
        const lists = await inspectArchive(archive, false, readers, 'Test');
        assert.deepEqual(lists.followers.map(file => file.name), ['followers_1.html', 'followers_2.html']);
        await assert.rejects(inspectArchive(archive, true, readers, 'Test'), /No following file found/);
    } finally {
        await Promise.all(readers.map(reader => reader.close()));
    }
});

test('native batches and fallback preserve nested records and validate the last chunk', async () => {
    const rows = Array.from({length: 8500}, (_, i) => ({
        string_list_data: [{value: 'a' + i}, {value: 'b' + i}],
        note: 'A quoted separator },{ and a multibyte character é'
    }));
    const signal = new AbortController().signal;
    async function parse(text) {
        const file = new File([text], 'following.json');
        return readSelection([file], 'following', 'Test', signal, () => {});
    }
    for (const text of [JSON.stringify(rows), JSON.stringify({metadata: {}, relationships_following: rows})]) {
        const users = await parse(text);
        assert.equal(users.size, 17000);
        assert.ok(users.has('b8499'));
        await assert.rejects(parse(text.slice(0, -1)), /following\.json/);
    }
});
