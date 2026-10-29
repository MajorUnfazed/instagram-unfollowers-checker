// We need to set up the DOM before requiring the script
document.body.innerHTML = `
    <input id="followers-file" type="file" />
    <input id="following-file" type="file" />
    <span id="followers-name"></span>
    <span id="following-name"></span>
    <button id="analyze-btn"></button>
    <div id="loading"></div>
    <div id="results"></div>
    <input id="search-input" />
    <button id="download-btn"></button>
    <span id="followers-count"></span>
    <span id="following-count"></span>
    <span id="unfollowers-count"></span>
    <div id="unfollowers-list"></div>
    <div id="no-results"></div>
`;

const { extractUsernames } = require('../script.js');

describe('extractUsernames', () => {
    describe('when extracting following (isFollowing = true)', () => {
        it('should extract usernames correctly from valid following.json format', () => {
            const mockData = {
                relationships_following: [
                    { title: 'johndoe', string_list_data: [{ href: '...', value: 'johndoe', timestamp: 123 }] },
                    { title: 'janedoe', string_list_data: [{ href: '...', value: 'janedoe', timestamp: 456 }] }
                ]
            };

            const result = extractUsernames(mockData, true);
            expect(result).toEqual(['johndoe', 'janedoe']);
        });

        it('should return empty array if relationships_following is empty', () => {
            const mockData = {
                relationships_following: []
            };

            const result = extractUsernames(mockData, true);
            expect(result).toEqual([]);
        });

        it('should return empty array if relationships_following is missing', () => {
            const mockData = {};

            const result = extractUsernames(mockData, true);
            expect(result).toEqual([]);
        });

        it('should handle items without a title property gracefully', () => {
            const mockData = {
                relationships_following: [
                    { title: 'johndoe' },
                    { other_prop: 'something' } // Missing title
                ]
            };

            const result = extractUsernames(mockData, true);
            expect(result).toEqual(['johndoe']);
        });
    });

    describe('when extracting followers (isFollowing = false)', () => {
        it('should extract usernames correctly from valid followers_1.json format', () => {
            const mockData = [
                {
                    title: '',
                    media_list_data: [],
                    string_list_data: [{ href: '...', value: 'alice', timestamp: 123 }]
                },
                {
                    title: '',
                    media_list_data: [],
                    string_list_data: [{ href: '...', value: 'bob', timestamp: 456 }]
                }
            ];

            const result = extractUsernames(mockData, false);
            expect(result).toEqual(['alice', 'bob']);
        });

        it('should return empty array if data is an empty array', () => {
            const mockData = [];

            const result = extractUsernames(mockData, false);
            expect(result).toEqual([]);
        });

        it('should return empty array if data is not an array', () => {
            const mockData = { some_prop: 'not an array' };

            const result = extractUsernames(mockData, false);
            expect(result).toEqual([]);
        });

        it('should handle missing string_list_data gracefully', () => {
            const mockData = [
                { string_list_data: [{ value: 'alice' }] },
                { title: 'bob_no_string_list' } // Missing string_list_data
            ];

            const result = extractUsernames(mockData, false);
            expect(result).toEqual(['alice']);
        });

        it('should handle missing value property gracefully', () => {
            const mockData = [
                { string_list_data: [{ value: 'alice' }] },
                { string_list_data: [{ href: 'link_only' }] } // Missing value
            ];

            const result = extractUsernames(mockData, false);
            expect(result).toEqual(['alice']);
        });
    });
});
