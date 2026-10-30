const fs = require('fs');
const assert = require('assert');

// Simple DOM mock
global.document = {
    _elements: {},
    getElementById: function(id) {
        if (!this._elements[id]) {
            this._elements[id] = {
                id: id,
                innerHTML: '',
                textContent: '',
                classList: {
                    add: () => {},
                    remove: () => {}
                },
                appendChild: function(child) {
                },
                addEventListener: () => {}
            };
        }
        return this._elements[id];
    },
    createElement: function(tag) {
        return {
            className: '',
            innerHTML: ''
        };
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.window = {
    URL: {
        createObjectURL: () => '',
        revokeObjectURL: () => ''
    }
};

global.alert = () => {};
global.Blob = class Blob {};
global.FileReader = class FileReader {};

// Load and evaluate script.js
const scriptCode = fs.readFileSync('script.js', 'utf8');
eval(scriptCode);

function runTests() {
    let passed = 0;
    let failed = 0;

    console.log("🧪 Running tests...\n");

    try {
        console.log("Test: displayUnfollowers handles empty array");
        const container = document.getElementById('unfollowers-list');

        displayUnfollowers([]);

        const expectedHTML = '<div class="no-results"><p>🎉 Everyone you follow is following you back!</p></div>';
        assert.strictEqual(container.innerHTML, expectedHTML);

        console.log("✅ Passed");
        passed++;
    } catch (e) {
        console.error("❌ Failed");
        console.error(e);
        failed++;
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests();
