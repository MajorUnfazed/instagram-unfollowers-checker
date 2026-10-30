const assert = require('assert');
const fs = require('fs');

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

global.runTest = function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(error);
        testsFailed++;
    }
}

// Set up mocks
global.document = {
    getElementById: (id) => ({
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} },
        textContent: '',
        disabled: true
    }),
    createElement: () => ({}),
    body: { appendChild: () => {}, removeChild: () => {} }
};

global.alertMessages = [];
global.alert = (msg) => { global.alertMessages.push(msg); };

global.window = {
    URL: { createObjectURL: () => {}, revokeObjectURL: () => {} }
};

global.FileReader = class {
    readAsText(file) {
        if (this.onload) {
            this.onload({ target: { result: file.content } });
        }
    }
};

global.assert = assert;

// Load script and append tests
const scriptContent = fs.readFileSync('./script.js', 'utf8');

const testCode = `
runTest('readJSONFile should handle invalid JSON and alert the user', () => {
    global.alertMessages = [];
    followersData = null;

    readJSONFile({ content: 'invalid json data' }, 'followers');

    assert.strictEqual(global.alertMessages.length, 1, 'Expected one alert message');
    assert.ok(global.alertMessages[0].startsWith('Error reading followers file:'), 'Alert message should indicate a followers file read error');
    assert.strictEqual(followersData, null, 'followersData should remain null when parsing fails');
});

runTest('readJSONFile should handle valid JSON correctly', () => {
    global.alertMessages = [];
    followersData = null;

    const validFollowersJSON = JSON.stringify([
        { string_list_data: [{ value: "user1" }, { value: "user2" }] }
    ]);

    readJSONFile({ content: validFollowersJSON }, 'followers');

    assert.strictEqual(global.alertMessages.length, 0, 'Should not have any alert messages');
    assert.notStrictEqual(followersData, null, 'followersData should not be null');
    assert.ok(Array.isArray(followersData), 'followersData should be an array');
});

runTest('readJSONFile should handle valid JSON correctly for following', () => {
    global.alertMessages = [];
    followingData = null;

    const validFollowingJSON = JSON.stringify({
        relationships_following: [
            { string_list_data: [{ value: "user1" }] }
        ]
    });

    readJSONFile({ content: validFollowingJSON }, 'following');

    assert.strictEqual(global.alertMessages.length, 0, 'Should not have any alert messages');
    assert.notStrictEqual(followingData, null, 'followingData should not be null');
    assert.ok(typeof followingData === 'object', 'followingData should be an object');
});
`;

eval(scriptContent + '\n\n' + testCode);

console.log(`\nTest Summary: ${testsPassed} passed, ${testsFailed} failed`);
if (testsFailed > 0) {
    process.exit(1);
}
