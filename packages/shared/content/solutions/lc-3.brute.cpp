#include <string>
#include <unordered_set>
#include <algorithm>

class Solution {
public:
    int lengthOfLongestSubstring(std::string s) {
        int n = s.size();
        int best = 0;
        for (int i = 0; i < n; i++) {
            std::unordered_set<char> seen;
            for (int j = i; j < n; j++) {
                if (seen.count(s[j])) break;
                seen.insert(s[j]);
                best = std::max(best, j - i + 1);
            }
        }
        return best;
    }
};
