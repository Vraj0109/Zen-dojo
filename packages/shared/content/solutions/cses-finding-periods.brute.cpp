#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findingPeriods(string s) {
        int n = s.size();
        vector<int> periods;
        for (int p = 1; p < n; p++) {
            bool ok = true;
            for (int i = 0; i < n - p; i++) {
                if (s[i] != s[i + p]) {
                    ok = false;
                    break;
                }
            }
            if (ok) periods.push_back(p);
        }
        periods.push_back(n);
        return periods;
    }
};
