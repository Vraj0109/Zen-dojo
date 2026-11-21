#include <vector>
#include <string>

class Solution {
    bool isAnagram(const std::string& a, const std::string& b) {
        if (a.size() != b.size()) return false;
        int count[26] = {0};
        for (char c : a) count[c - 'a']++;
        for (char c : b) {
            if (--count[c - 'a'] < 0) return false;
        }
        return true;
    }
public:
    std::vector<std::vector<std::string>> groupAnagrams(std::vector<std::string>& strs) {
        int n = strs.size();
        std::vector<bool> visited(n, false);
        std::vector<std::vector<std::string>> res;
        for (int i = 0; i < n; i++) {
            if (visited[i]) continue;
            std::vector<std::string> group = {strs[i]};
            visited[i] = true;
            for (int j = i + 1; j < n; j++) {
                if (!visited[j] && isAnagram(strs[i], strs[j])) {
                    visited[j] = true;
                    group.push_back(strs[j]);
                }
            }
            res.push_back(group);
        }
        return res;
    }
};
