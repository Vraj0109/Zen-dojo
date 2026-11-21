#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string minimalRotation(string s) {
        int n = s.size();
        string best = s;
        for (int i = 1; i < n; i++) {
            string rot = s.substr(i) + s.substr(0, i);
            if (rot < best) {
                best = rot;
            }
        }
        return best;
    }
};
