#include <string>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

class Solution {
    bool isPalindrome(const string& s, int l, int r) {
        while (l < r) {
            if (s[l++] != s[r--]) return false;
        }
        return true;
    }

    int backtrack(const string& s, int start) {
        int n = (int)s.size();
        if (isPalindrome(s, start, n - 1)) return 0;

        int min_cuts = n - start - 1;
        for (int end = start; end < n; ++end) {
            if (isPalindrome(s, start, end)) {
                min_cuts = min(min_cuts, 1 + backtrack(s, end + 1));
            }
        }
        return min_cuts;
    }

public:
    int minCut(string s) {
        return backtrack(s, 0);
    }
};
