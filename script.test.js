const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

describe('Instagram Unfollowers Checker', () => {
    let extractUsernames;
    let displayUnfollowers;
    let filterUnfollowers;
    let analyzeData;
    let readJSONFile;
    let downloadCSV;

    beforeEach(() => {
        document.body.innerHTML = html;
        jest.resetModules();
        const script = require('./script.js');
        extractUsernames = script.extractUsernames;
        displayUnfollowers = script.displayUnfollowers;
        filterUnfollowers = script.filterUnfollowers;
        analyzeData = script.analyzeData;
        readJSONFile = script.readJSONFile;
        downloadCSV = script.downloadCSV;
    });

    describe('extractUsernames', () => {
        it('should correctly extract usernames from followers data format', () => {
            const mockFollowers = [
                {
                    string_list_data: [{ value: 'user1' }]
                },
                {
                    string_list_data: [{ value: 'user2' }]
                }
            ];

            const result = extractUsernames(mockFollowers, false);
            expect(result).toEqual(['user1', 'user2']);
        });

        it('should correctly extract usernames from following data format', () => {
            const mockFollowing = {
                relationships_following: [
                    { title: 'user1' },
                    { title: 'user3' }
                ]
            };

            const result = extractUsernames(mockFollowing, true);
            expect(result).toEqual(['user1', 'user3']);
        });

        it('should handle empty or malformed data gracefully', () => {
            expect(extractUsernames([], false)).toEqual([]);
            expect(extractUsernames({}, true)).toEqual([]);
            expect(extractUsernames(null, false)).toEqual([]);
        });
    });

    describe('displayUnfollowers', () => {
        it('should display a success message when there are no unfollowers', () => {
            displayUnfollowers([]);
            const listContainer = document.getElementById('unfollowers-list');
            expect(listContainer.innerHTML).toContain('Everyone you follow is following you back!');
        });

        it('should render items for each unfollower', () => {
            displayUnfollowers(['user2', 'user3']);
            const listContainer = document.getElementById('unfollowers-list');

            const items = listContainer.querySelectorAll('.unfollower-item');
            expect(items.length).toBe(2);

            expect(items[0].innerHTML).toContain('@user2');
            expect(items[1].innerHTML).toContain('@user3');
        });
    });

    describe('downloadCSV', () => {
        beforeEach(() => {
            global.window.URL.createObjectURL = jest.fn();
            global.window.URL.revokeObjectURL = jest.fn();
            global.alert = jest.fn();
        });

        it('should alert if no data to download', () => {
            downloadCSV();
            expect(global.alert).toHaveBeenCalledWith('No data to download!');
        });
    });
});
