#include <vector>
#include <algorithm>

class Solution {
public:
    int towers(std::vector<int>& cubes) {
        std::vector<int> tops;
        for (int c : cubes) {
            auto it = std::upper_bound(tops.begin(), tops.end(), c);
            if (it == tops.end()) {
                tops.push_back(c);
            } else {
                *it = c;
            }
        }
        return (int)tops.size();
    }
};
