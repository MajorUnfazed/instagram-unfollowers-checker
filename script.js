const followersInput = document.getElementById('followers-file');
const followingInput = document.getElementById('following-file');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const searchInput = document.getElementById('search-input');
const downloadBtn = document.getElementById('download-btn');
const fileError = document.getElementById('file-error');
const historyMode = document.getElementById('history-mode');
const controls = document.getElementById('import-controls');
const manualInput = document.getElementById('manual-input');
const firstZip = document.getElementById('first-zip');
const secondZip = document.getElementById('second-zip');
const filterButtons = document.querySelectorAll('#change-filters button');
const themePicker = document.getElementById('theme');

themePicker.value = document.documentElement.dataset.theme || 'system';
themePicker.addEventListener('change', () => {
    const theme = themePicker.value;
    document.documentElement.dataset.theme = theme;
    try {
        if (theme === 'system') localStorage.removeItem('unfollowers-theme');
        else localStorage.setItem('unfollowers-theme', theme);
    } catch { /* Keep the current choice for this visit. */ }
});

let resultGroups = [];
let totalResults = 0;
const pageSize = 100;
let pageStarts = [0];
let nextStart = null;
let renderVersion = 0;
let job = new AbortController();
const previousPage = document.getElementById('previous-page');
const nextPage = document.getElementById('next-page');
const loadingStatus = document.getElementById('loading-status');
let activeFilter = 'All';

function updateMode() {
    const history = historyMode.checked;
    for (const input of [followersInput, followingInput, firstZip, secondZip]) input.value = '';
    followingInput.multiple = history;
    document.getElementById('first-zip-label').textContent = history ? 'Older export' : 'Instagram export';
    document.getElementById('newer-zone').classList.toggle('hidden', !history);
    document.getElementById('zip-inputs').classList.toggle('hidden', manualInput.checked);
    document.getElementById('json-inputs').classList.toggle('hidden', !manualInput.checked);
    analyzeBtn.classList.toggle('hidden', !manualInput.checked);
    document.getElementById('change-filters').classList.toggle('hidden', !history);
    document.getElementById('first-label').textContent = history ? 'Older export' : 'Followers';
    document.getElementById('second-label').textContent = history ? 'Newer export' : 'Following';
    document.getElementById('first-hint').textContent = history
        ? 'Select all followers JSON files from the earlier export'
        : 'Select all followers JSON files from the same export';
    document.getElementById('second-hint').textContent = history
        ? 'Select all followers JSON files from the later export of the same account'
        : 'Select your following.json file';
    document.getElementById('first-stat-label').textContent = history ? 'Followers in older export' : 'Total Followers';
    document.getElementById('second-stat-label').textContent = history ? 'Followers in newer export' : 'Total Following';
    document.getElementById('follow-back-stat').classList.toggle('hidden', history);
    document.getElementById('history-note').classList.toggle('hidden', !history);
    document.getElementById('results-heading').textContent = history ? 'Follower changes' : 'People Not Following You Back';
    analyzeBtn.textContent = history ? 'Compare exports' : 'Analyze';
    updateSelection();
}

function fileSummary(files) {
    if (files.length > 1) return `${files.length} files selected`;
    return files[0]?.name || 'No file chosen';
}

function clearAnalysis() {
    job.abort();
    job = new AbortController();
    renderVersion++;
    resultGroups = [];
    totalResults = 0;
    document.getElementById('unfollowers-list').replaceChildren();
    resultsDiv.classList.add('hidden');
    loadingDiv.classList.add('hidden');
    fileError.textContent = '';
}

function updateSelection() {
    clearAnalysis();
    document.getElementById('first-zip-name').textContent = firstZip.files[0]?.name || 'Choose ZIP';
    document.getElementById('second-zip-name').textContent = secondZip.files[0]?.name || 'Choose ZIP';
    document.getElementById('followers-name').textContent = fileSummary(followersInput.files);
    document.getElementById('following-name').textContent = fileSummary(followingInput.files);
    analyzeBtn.disabled = true;
    if (!manualInput.checked) {
        analyzeBtn.classList.add('hidden');
        if (firstZip.files.length || secondZip.files.length) analyzeData();
        return;
    }
    let label = historyMode.checked ? 'Older export' : 'Followers';
    try {
        checkFollowerParts(followersInput.files);
        if (historyMode.checked) {
            label = 'Newer export';
            checkFollowerParts(followingInput.files);
        }
        analyzeBtn.disabled = !followersInput.files.length || !followingInput.files.length;
    } catch (error) {
        fileError.textContent = `${label}: ${error.message}`;
    }
}

for (const radio of document.querySelectorAll('input[name="comparison"]')) radio.addEventListener('change', updateMode);
manualInput.addEventListener('change', updateMode);
for (const input of [firstZip, secondZip]) {
    input.addEventListener('change', updateSelection);
    const zone = input.closest('.drop-zone');
    zone.addEventListener('dragover', event => {
        event.preventDefault();
        if (!controls.disabled) zone.classList.add('dragging');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', event => {
        event.preventDefault();
        zone.classList.remove('dragging');
        if (controls.disabled) return;
        const files = event.dataTransfer.files;
        if (files.length !== 1 || !/\.zip$/i.test(files[0].name)) {
            input.value = '';
            document.getElementById(input.id + '-name').textContent = 'Choose ZIP';
            clearAnalysis();
            fileError.textContent = 'Drop one Instagram ZIP archive in each box.';
            return;
        }
        input.files = files;
        updateSelection();
    });
}
for (const button of filterButtons) {
    button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        resetPage();
    });
}
followersInput.addEventListener('change', updateSelection);
followingInput.addEventListener('change', updateSelection);
searchInput.addEventListener('input', resetPage);
previousPage.addEventListener('click', () => {
    pageStarts.pop();
    renderResults();
});
nextPage.addEventListener('click', () => {
    if (nextStart === null) return;
    pageStarts.push(nextStart);
    renderResults();
});
downloadBtn.addEventListener('click', downloadCSV);
analyzeBtn.addEventListener('click', () => {
    clearAnalysis();
    analyzeData();
});
document.getElementById('cancel-analysis').addEventListener('click', () => {
    clearAnalysis();
    controls.disabled = false;
    if (manualInput.checked || (firstZip.files.length && (!historyMode.checked || secondZip.files.length))) {
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('hidden');
    }
});
updateMode();

async function difference(first, second, signal) {
    const names = [];
    let checked = 0;
    for (const username of first) {
        if (!second.has(username)) names.push(username);
        if (++checked % 100000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            signal.throwIfAborted();
        }
    }
    return names.sort();
}

async function analyzeData() {
    const history = historyMode.checked;
    const {signal} = job;
    controls.disabled = manualInput.checked;
    if (!manualInput.checked) analyzeBtn.classList.add('hidden');
    loadingStatus.textContent = 'Reading export files…';
    fileError.textContent = '';
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');

    const readers = [];
    try {
        let firstFiles = followersInput.files;
        let secondFiles = followingInput.files;
        if (!manualInput.checked) {
            const earlierFile = firstZip.files[0];
            const laterFile = secondZip.files[0];
            const earlier = earlierFile && await inspectArchive(earlierFile, !history, readers, history ? 'Older export' : 'Instagram export');
            if (signal.aborted) return;
            const later = history && laterFile && await inspectArchive(laterFile, false, readers, 'Newer export');
            if (signal.aborted) return;
            if (!earlier || (history && !later)) return;
            firstFiles = earlier.followers;
            secondFiles = history ? later.followers : earlier.following;
        }
        function reportProgress(name, bytes, size) {
            if (!signal.aborted) loadingStatus.textContent = `Reading ${name} · ${size ? Math.floor(100 * bytes / size) : 0}%`;
        }
        const first = await readSelection(firstFiles, 'followers', history ? 'Older export' : 'Followers', signal, reportProgress);
        if (signal.aborted) return;
        const second = await readSelection(secondFiles, history ? 'followers' : 'following', history ? 'Newer export' : 'Following', signal, reportProgress);
        if (signal.aborted) return;
        document.getElementById('followers-count').textContent = first.size;
        document.getElementById('following-count').textContent = second.size;
        loadingStatus.textContent = 'Comparing usernames…';
        const added = await difference(second, first, signal);
        const missing = history ? await difference(first, second, signal) : [];
        if (signal.aborted) return;
        totalResults = missing.length + added.length;
        if (history) {
            resultGroups = [{change: 'Missing', names: missing}, {change: 'New', names: added}];
            const counts = {All: totalResults, Missing: missing.length, New: added.length};
            for (const button of filterButtons) {
                const name = button.dataset.filter;
                button.textContent = `${name} (${counts[name]})`;
            }
        } else {
            resultGroups = [{change: '', names: added}];
            document.getElementById('unfollowers-count').textContent = added.length;
        }
        searchInput.value = '';
        activeFilter = 'All';
        resetPage();
        downloadBtn.disabled = totalResults === 0;
        resultsDiv.classList.remove('hidden');
    } catch (error) {
        if (!signal.aborted) fileError.textContent = error.message;
    } finally {
        await Promise.allSettled(readers.map(reader => reader.close()));
        if (!signal.aborted) {
            loadingDiv.classList.add('hidden');
            controls.disabled = false;
        }
    }
}

function makeResultRow(username, change) {
    const item = document.createElement('div');
    item.className = 'unfollower-item';

    const name = document.createElement('span');
    name.className = 'username';
    name.textContent = `@${username}`;
    const details = document.createElement('div');
    details.appendChild(name);
    if (change) {
        const label = document.createElement('p');
        label.className = 'change-label';
        label.textContent = change;
        details.appendChild(label);
    }
    const link = document.createElement('a');
    link.className = 'profile-link';
    link.href = `https://instagram.com/${username}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View Profile';
    item.append(details, link);
    return item;
}

function resetPage() {
    pageStarts = [0];
    renderResults();
}

async function renderResults() {
    const version = ++renderVersion;
    const start = pageStarts.at(-1);
    const term = searchInput.value.trim().toLowerCase();
    const list = document.getElementById('unfollowers-list');
    const rows = document.createDocumentFragment();
    const groups = resultGroups.filter(group => activeFilter === 'All' || group.change === activeFilter);
    for (const button of filterButtons) button.setAttribute('aria-pressed', String(activeFilter === button.dataset.filter));
    previousPage.disabled = true;
    nextPage.disabled = true;
    nextStart = null;
    let offset = 0;
    let lastYield = performance.now();
    for (const {names, change} of groups) {
        for (let i = Math.max(0, start - offset); i < names.length; i++) {
            if (i % 32768 === 0 && performance.now() - lastYield > 24) {
                await new Promise(resolve => setTimeout(resolve, 0));
                if (version !== renderVersion) return;
                lastYield = performance.now();
            }
            if (!names[i].includes(term)) continue;
            if (rows.childElementCount === pageSize) {
                nextStart = offset + i;
                break;
            }
            rows.appendChild(makeResultRow(names[i], change));
        }
        if (nextStart !== null) break;
        offset += names.length;
    }

    list.replaceChildren(rows);
    list.scrollTop = 0;
    previousPage.disabled = pageStarts.length === 1;
    nextPage.disabled = nextStart === null;
    document.getElementById('page-number').textContent = `Page ${pageStarts.length}`;
    document.getElementById('result-pages').classList.toggle('hidden', previousPage.disabled && nextPage.disabled);
    const empty = document.getElementById('no-results');
    if (totalResults && term) empty.textContent = 'No users found matching your search.';
    else if (activeFilter === 'Missing') empty.textContent = 'No usernames are missing from the newer export.';
    else if (activeFilter === 'New') empty.textContent = 'No new usernames in the newer export.';
    else if (historyMode.checked) empty.textContent = 'Both exports contain the same follower usernames.';
    else empty.textContent = 'Every account you follow appears in your followers list.';
    empty.classList.toggle('hidden', list.childElementCount > 0);
    list.classList.toggle('hidden', list.childElementCount === 0);
}

async function downloadCSV() {
    const history = historyMode.checked;
    const groups = resultGroups;
    const {signal} = job;
    const filename = history ? 'instagram_follower_changes.csv' : 'instagram_unfollowers.csv';
    const header = history ? 'Username,Profile URL,Change\n' : 'Username,Profile URL\n';
    const chunks = [];
    let writer;
    downloadBtn.disabled = true;
    fileError.textContent = '';
    try {
        if (totalResults >= 100000 && typeof window.showSaveFilePicker === 'function') {
            let handle;
            try {
                handle = await window.showSaveFilePicker({suggestedName: filename});
            } catch (error) {
                // Embedded pages can expose the picker while disallowing its use.
                if (error.name !== 'SecurityError') throw error;
            }
            signal.throwIfAborted();
            if (handle) writer = await handle.createWritable();
        }
        if (writer) await writer.write(header);
        else chunks.push(header);
        let lastYield = performance.now();
        for (const {names, change} of groups) {
            for (let i = 0; i < names.length; i += 4096) {
                signal.throwIfAborted();
                const rows = names.slice(i, i + 4096).map(name =>
                    `${name},https://instagram.com/${name}${change ? ',' + change : ''}\n`);
                const chunk = rows.join('');
                if (writer) await writer.write(chunk);
                else chunks.push(new Blob([chunk]));
                if (performance.now() - lastYield > 25) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    lastYield = performance.now();
                }
            }
        }
        signal.throwIfAborted();
        if (writer) {
            await writer.close();
        } else {
            const url = URL.createObjectURL(new Blob(chunks, {type: 'text/csv'}));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    } catch (error) {
        if (writer) await writer.abort().catch(() => {});
        if (!signal.aborted && error.name !== 'AbortError') fileError.textContent = `Could not save CSV: ${error.message}`;
    } finally {
        if (!signal.aborted) downloadBtn.disabled = totalResults === 0;
    }
}
