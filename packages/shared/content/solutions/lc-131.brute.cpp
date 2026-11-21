#include <vector>
#include <string>

using namespace std;

class Solution {
    bool isPalindrome(const string& str, int l, int r) {
        while (l < r) {
            if (str[l++] != str[r--]) return false;
        }
        return true;
    }

    void backtrack(const string& s, int start, vector<string>& cur, vector<vector<string>>& res) {
        if (start == (int)s.size()) {
            res.push_back(cur);
            return;
        }
        for (int end = start; end < (int)s.size(); ++end) {
            if (isPalindrome(s, start, end)) {
                cur.push_back(s.substr(start, end - start + 1));
                backtrack(s, end + 1, cur, res);
                cur.pop_back();
            }
        }
    }

public:
    vector<vector<string>> partition(string s) {
        vector<vector<string>> res;
        vector<string> cur;
        backtrack(s, 0, cur, res);
        return res;
    }
};
