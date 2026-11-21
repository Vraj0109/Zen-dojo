#include <bits/stdc++.h>
using namespace std;

class Solution {
    bool check(const string& s, int idx, const unordered_set<string>& dict) {
        if (idx == (int)s.size()) return true;
        for (int end = idx + 1; end <= (int)s.size(); end++) {
            if (dict.count(s.substr(idx, end - idx))) {
                if (check(s, end, dict)) return true;
            }
        }
        return false;
    }
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        return check(s, 0, dict);
    }
};
