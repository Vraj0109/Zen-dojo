#include <string>
#include <vector>
#include <algorithm>

class Solution {
public:
    std::string palindromeReorder(std::string s) {
        int cnt[26] = {0};
        for (char c : s) cnt[c - 'A']++;
        int odd = -1, oddCount = 0;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] % 2) {
                odd = i;
                oddCount++;
            }
        }
        if (oddCount > 1) return "NO SOLUTION";
        std::string half;
        for (int i = 0; i < 26; i++) {
            half += std::string(cnt[i] / 2, char('A' + i));
        }
        std::string mid = odd >= 0 ? std::string(1, char('A' + odd)) : "";
        std::string rev(half.rbegin(), half.rend());
        return half + mid + rev;
    }
};
