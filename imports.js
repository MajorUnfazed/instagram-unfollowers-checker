const followerFile = /^followers(?:_(\d+))?\.(json|html)$/i;
const followingFile = /^following\.(json|html)$/i;

// Numbered parts reveal gaps up to the highest selected number.
function checkFollowerParts(files) {
    const numbers = [];
    let unnumbered = 0;
    let format;
    for (const {name} of files) {
        if (followingFile.test(name)) throw new Error('Choose the followers files for this list.');
        if (!/\.(json|html)$/i.test(name)) throw new Error('Choose Instagram followers files in JSON or HTML format.');
        const extension = name.split('.').pop().toLowerCase();
        if (format && extension !== format) throw new Error('Choose followers files in the same format for each export.');
        format = extension;
        const match = followerFile.exec(name);
        if (!match) continue;
        if (match[1] === undefined) unnumbered++;
        else numbers.push(Number(match[1]));
    }
    if (unnumbered > 1 || (unnumbered && numbers.length)) {
        throw new Error('Choose followers files from a single export.');
    }
    numbers.sort((a, b) => a - b);
    for (const [index, number] of numbers.entries()) {
        if (number < index + 1) throw new Error(`Choose each numbered followers file once, starting with followers_1.${format}.`);
        if (number > index + 1) throw new Error(`Missing followers_${index + 1}.${format}. Include that part and select the full set again.`);
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
            const isFollower = followerFile.test(basename);
            if (!isFollower && !(needFollowing && followingFile.test(basename))) continue;
            folders.add(path.slice(0, path.lastIndexOf('/') + 1));
            const list = isFollower ? followers : following;
            list.push({
                name: basename,
                size: entry.uncompressedSize,
                pipeTo: (sink, signal) => entry.getData(sink, {checkSignature: true, signal})
            });
        }
        if (!followers.length) throw new Error('No followers files found. Choose an Instagram ZIP with Followers and following in JSON or HTML format.');
        if (folders.size > 1 || following.length > 1) throw new Error('Multiple lists found. Choose a ZIP containing one export.');
        checkFollowerParts(followers);
        if (needFollowing && !following.length) throw new Error('No following file found. Include Followers and following in the export.');
        return {followers, following};
    } catch (error) {
        throw new Error(`${label} (${file.name}): ${error.message}`);
    }
}

async function readSelection(files, type, label, signal, onProgress) {
    const usernames = new Set();
    for (const file of files) {
        try {
            if (type === 'following' && followerFile.test(file.name)) throw new Error('Choose the following file for this list.');
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

function htmlUsernameParser(type, usernames, signal) {
    const chunks = [];
    const invalidLayout = 'Unrecognized Instagram HTML layout. Try requesting the export in JSON format.';
    const profile = /^https?:\/\/(?:www\.)?instagram\.com\/(?:_u\/)?([a-z0-9_.]+)\/?(?:[?#][^\s]*)?$/i;
    return {
        write(text) {
            chunks.push(text);
        },
        async end() {
            // Keep imported markup in inert template content so it is never rendered or loaded.
            const template = document.createElement('template');
            template.innerHTML = chunks.join('');
            chunks.length = 0;
            const main = template.content.querySelector('main, ._a706');
            const heading = (template.content.querySelector('h1') || template.content.querySelector('title'))?.textContent.trim().toLowerCase();
            if (heading === (type === 'followers' ? 'following' : 'followers')) {
                throw new Error(`Choose the ${type} HTML file for this list.`);
            }
            if (!main) throw new Error(invalidLayout);
            const rows = main.querySelectorAll('._a6-g');
            if (!rows.length && (!heading || main.textContent.trim() || main.querySelector('a'))) {
                throw new Error(invalidLayout);
            }
            for (const [index, row] of rows.entries()) {
                const link = row.querySelector('._a6-p a[href]');
                const match = profile.exec(link?.getAttribute('href').trim() ?? '');
                if (!match) throw new Error(invalidLayout);
                usernames.add(match[1].toLowerCase());
                if (index % 5000 === 4999) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    signal.throwIfAborted();
                }
            }
        }
    };
}

async function collectUsernames(file, type, usernames, signal, onProgress) {
    const parser = /\.html$/i.test(file.name) ? htmlUsernameParser(type, usernames, signal) : usernameParser(type, usernames);
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
    signal.throwIfAborted();
    parser.write(decoder.decode());
    await parser.end();
}
