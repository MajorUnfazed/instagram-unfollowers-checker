# 🧪 Add tests for extractUsernames function

## 🎯 What
Added unit tests for the pure function `extractUsernames` which was previously untested. Configured Jest with `jsdom` environment to test the DOM-dependent script file properly while isolating the pure function.

## 📊 Coverage
- `following.json` format (`relationships_following` structure)
- `followers_1.json` format (direct array with `string_list_data`)
- Empty objects/arrays and missing fields
- Edge cases where expected structures are missing

## ✨ Result
Ensured `extractUsernames` behaves correctly for all possible Instagram data exports without crashing.
