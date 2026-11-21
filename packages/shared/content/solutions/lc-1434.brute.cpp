#include <bits/stdc++.h>
using namespace std;

class Solution {
    int n;
    int ways = 0;
    const int MOD = 1e9 + 7;

    void backtrack(const vector<vector<int>>& hats, int person, unordered_set<int>& usedHats) {
        if (person == n) {
            ways = (ways + 1) % MOD;
            return;
        }
        for (int h : hats[person]) {
            if (usedHats.find(h) == usedHats.end()) {
                usedHats.insert(h);
                backtrack(hats, person + 1, usedHats);
                usedHats.erase(h);
            }
        }
    }

public:
    int numberWays(vector<vector<int>>& hats) {
        n = hats.size();
        ways = 0;
        unordered_set<int> usedHats;
        backtrack(hats, 0, usedHats);
        return ways;
    }
};
