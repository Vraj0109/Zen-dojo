#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findingBorders(string s) {
        int n = s.size();
        vector<int> borders;
        for (int len = 1; len < n; len++) {
            if (s.compare(0, len, s, n - len, len) == 0) {
                borders.push_back(len);
            }
        }
        return borders;
    }
};
