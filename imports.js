// Numbered parts reveal gaps up to the highest selected number.
function checkFollowerParts(files) {
    const numbers = [];
    let unnumbered = 0;
    for (const {name} of files) {
        const match = /^followers_(\d+)\.json$/i.exec(name);
        if (match) numbers.push(Number(match[1]));
        if (/^followers\.json$/i.test(name)) unnumbered++;
        if (/^following\.json$/i.test(name)) throw new Error('Choose the followers files for this list.');
    }
    if (unnumbered > 1 || (unnumbered && numbers.length)) {
        throw new Error('Choose followers files from a single export.');
    }
    numbers.sort((a, b) => a - b);
    for (const [index, number] of numbers.entries()) {
        if (number < index + 1) throw new Error('Choose each numbered followers file once, starting with followers_1.json.');
        if (number > index + 1) throw new Error(`Missing followers_${index + 1}.json. Include that part and select the full set again.`);
    }
}

async function inspectArchive(file, needFollowing, readers, label) {
    try {
        const reader = new zip.ZipReader(new zip.BlobReader(file));
        readers.push(reader);
        const entries = await reader.getEntries();
        const folders = new Set();
        const followers = [];
        const following = [];
        for (const entry of entries) {
            if (entry.directory) continue;
            const path = entry.filename.replaceAll('\\', '/');
            if (path.split('/').includes('__MACOSX')) continue;
            const basename = path.slice(path.lastIndexOf('/') + 1);
            const isFollower = /^followers(?:_\d+)?\.json$/i.test(basename);
            if (!isFollower && !(needFollowing && /^following\.json$/i.test(basename))) continue;
            folders.add(path.slice(0, path.lastIndexOf('/') + 1));
            const list = isFollower ? followers : following;
            list.push({
                name: basename,
                size: entry.uncompressedSize,
                pipeTo: (sink, signal) => entry.getData(sink, {checkSignature: true, signal})
            });
        }
        if (!followers.length) throw new Error('No followers JSON files found. Choose an Instagram export in JSON format.');
        if (folders.size > 1 || following.length > 1) throw new Error('Multiple lists found. Choose a ZIP containing one export.');
        checkFollowerParts(followers);
        if (needFollowing && !following.length) throw new Error('Missing following.json. Include followers and following in the export.');
        return {followers, following};
    } catch (error) {
        throw new Error(`${label} (${file.name}): ${error.message}`);
    }
}

async function readSelection(files, type, label, signal, onProgress) {
    const usernames = new Set();
    for (const file of files) {
        try {
            await collectUsernames(file, type, usernames, signal, onProgress);
        } catch (error) {
            if (signal.aborted) throw signal.reason;
            throw new Error(`${label}: could not read ${file.name} as an Instagram ${type} list. ${error.message}`);
        }
    }
    return usernames;
}

function usernameParser(type, usernames) {
    function add(value) {
        if (typeof value !== 'string' || !/^[a-z0-9_.]+$/i.test(value.trim())) {
            throw new Error('Invalid username in export.');
        }
        usernames.add(value.trim().toLowerCase());
    }
    function addRecord(row, wrapped) {
        if (wrapped && row?.title) {
            add(row.title);
        } else {
            if (!Array.isArray(row?.string_list_data) || !row.string_list_data.length) {
                throw new Error('Missing username in export record.');
            }
            for (const entry of row.string_list_data) add(entry?.value);
        }
    }

    let buffer = '';
    let prefix = '';
    let parser;
    let validRoot = false;
    function switchToStreaming() {
        parser = new StreamingJSON.default({paths: ['$', '$.*', '$.relationships_following.*']});
        parser.onValue = ({value, parent, stack}) => {
            if (stack.length === 0) {
                validRoot = Array.isArray(value) || (type === 'following' && Array.isArray(value?.relationships_following));
            } else if (Array.isArray(parent)) {
                addRecord(value, stack.length === 2 && type === 'following');
                parent.length = 0;
            }
        };
        parser.write(prefix + buffer);
        buffer = '';
    }

    return {
        write(text) {
            if (parser) {
                parser.write(text);
                return;
            }
            buffer += text;
            if (buffer.length < 256 * 1024) return;
            if (!prefix) {
                const start = /^[\t\r\n ]*(\[|\{[\t\r\n ]*"relationships_following"[\t\r\n ]*:[\t\r\n ]*\[)/.exec(buffer);
                if (!start || (start[1] !== '[' && type !== 'following')) return switchToStreaming();
                prefix = start[1];
                buffer = buffer.slice(start[0].length);
            }

            // A candidate separator may be nested or quoted. Only commit a batch
            // when native JSON parsing proves the preceding records are complete.
            let boundary;
            for (const match of buffer.matchAll(/}[\t\r\n ]*,[\t\r\n ]*(?=\{)/g)) boundary = match;
            if (!boundary) return switchToStreaming();
            let rows;
            try {
                rows = JSON.parse('[' + buffer.slice(0, boundary.index + 1) + ']');
            } catch {
                return switchToStreaming();
            }
            for (const row of rows) addRecord(row, prefix !== '[');
            buffer = buffer.slice(boundary.index + boundary[0].length);
        },
        end() {
            if (parser) {
                if (!parser.isEnded) parser.end();
                if (!validRoot) throw new Error('Unexpected JSON structure.');
                return;
            }
            const root = JSON.parse(prefix + buffer);
            const wrapped = type === 'following' && Array.isArray(root?.relationships_following);
            const rows = wrapped ? root.relationships_following : root;
            if (!Array.isArray(rows)) throw new Error('Unexpected JSON structure.');
            for (const row of rows) addRecord(row, wrapped);
        }
    };
}

async function collectUsernames(file, type, usernames, signal, onProgress) {
    const parser = usernameParser(type, usernames);
    const decoder = new TextDecoder();
    let lastYield = performance.now();
    let consumed = 0;
    let lastReport = 0;
    onProgress(file.name, 0, file.size);
    const sink = new WritableStream({
        async write(bytes) {
            for (let i = 0; i < bytes.length; i += 65536) {
                signal.throwIfAborted();
                parser.write(decoder.decode(bytes.subarray(i, i + 65536), {stream: true}));
                if (performance.now() - lastYield > 25) {
                    if (performance.now() - lastReport > 300) {
                        onProgress(file.name, consumed + Math.min(i + 65536, bytes.length), file.size);
                        lastReport = performance.now();
                    }
                    await new Promise(resolve => setTimeout(resolve, 0));
                    lastYield = performance.now();
                }
            }
            consumed += bytes.length;
        }
    });
    if (file.stream) await file.stream().pipeTo(sink, {signal});
    else await file.pipeTo(sink, signal);
    parser.write(decoder.decode());
    parser.end();
}
