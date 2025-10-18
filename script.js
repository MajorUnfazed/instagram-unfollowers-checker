// Global variables to store data
let followersData = null;
let followingData = null;
let unfollowersList = [];

// DOM elements
const followersInput = document.getElementById('followers-file');
const followingInput = document.getElementById('following-file');
const followersNameSpan = document.getElementById('followers-name');
const followingNameSpan = document.getElementById('following-name');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const searchInput = document.getElementById('search-input');
const downloadBtn = document.getElementById('download-btn');

// File upload handlers
followersInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        followersNameSpan.textContent = file.name;
        readJSONFile(file, 'followers');
    }
});

followingInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        followingNameSpan.textContent = file.name;
        readJSONFile(file, 'following');
    }
});

// Read JSON file
function readJSONFile(file, type) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (type === 'followers') {
                followersData = data;
            } else {
                followingData = data;
            }
            
            // Enable analyze button if both files are loaded
            if (followersData && followingData) {
                analyzeBtn.disabled = false;
            }
        } catch (error) {
            alert(`Error reading ${type} file: ${error.message}`);
        }
    };
    
    reader.readAsText(file);
}

// Analyze button click handler
analyzeBtn.addEventListener('click', () => {
    analyzeData();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterUnfollowers(searchTerm);
});

// Download button click handler
downloadBtn.addEventListener('click', () => {
    downloadCSV();
});

// Main analysis function
function analyzeData() {
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Extract usernames from followers and following
            const followers = extractUsernames(followersData, false);
            const following = extractUsernames(followingData, true);
            
            // Find users who don't follow back
            unfollowersList = following.filter(user => !followers.includes(user));
            
            // Update stats
            document.getElementById('followers-count').textContent = followers.length;
            document.getElementById('following-count').textContent = following.length;
            document.getElementById('unfollowers-count').textContent = unfollowersList.length;
            
            // Display unfollowers
            displayUnfollowers(unfollowersList);
            
            // Show results
            loadingDiv.classList.add('hidden');
            resultsDiv.classList.remove('hidden');
        } catch (error) {
            alert(`Error analyzing data: ${error.message}`);
            loadingDiv.classList.add('hidden');
        }
    }, 500);
}

// Extract usernames from Instagram JSON format
function extractUsernames(data, isFollowing = false) {
    const usernames = [];
    
    // Handle following.json format (object with relationships_following array)
    if (isFollowing && data.relationships_following) {
        data.relationships_following.forEach(item => {
            if (item.title) {
                usernames.push(item.title);
            }
        });
    }
    // Handle followers_1.json format (direct array)
    else if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.string_list_data && Array.isArray(item.string_list_data)) {
                item.string_list_data.forEach(user => {
                    if (user.value) {
                        usernames.push(user.value);
                    }
                });
            }
        });
    }
    
    return usernames;
}

// Display unfollowers list
function displayUnfollowers(unfollowers) {
    const listContainer = document.getElementById('unfollowers-list');
    listContainer.innerHTML = '';
    
    if (unfollowers.length === 0) {
        listContainer.innerHTML = '<div class="no-results"><p>🎉 Everyone you follow is following you back!</p></div>';
        return;
    }
    
    unfollowers.sort().forEach(username => {
        const item = document.createElement('div');
        item.className = 'unfollower-item';
        
        item.innerHTML = `
            <span class="username">@${username}</span>
            <a href="https://instagram.com/${username}" target="_blank" class="profile-link">View Profile</a>
        `;
        
        listContainer.appendChild(item);
    });
}

// Filter unfollowers based on search
function filterUnfollowers(searchTerm) {
    const filtered = unfollowersList.filter(username => 
        username.toLowerCase().includes(searchTerm)
    );
    
    displayUnfollowers(filtered);
    
    const noResults = document.getElementById('no-results');
    if (filtered.length === 0 && searchTerm !== '') {
        document.getElementById('unfollowers-list').innerHTML = '';
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
    }
}

// Download results as CSV
function downloadCSV() {
    if (unfollowersList.length === 0) {
        alert('No data to download!');
        return;
    }
    
    let csv = 'Username,Profile URL\n';
    unfollowersList.forEach(username => {
        csv += `${username},https://instagram.com/${username}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instagram_unfollowers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
