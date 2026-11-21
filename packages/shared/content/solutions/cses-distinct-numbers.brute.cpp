#include <vector>

class Solution {
public:
    int distinctNumbers(std::vector<int>& arr) {
        std::vector<int> unique;
        for (int x : arr) {
            bool found = false;
            for (int u : unique) {
                if (u == x) {
                    found = true;
                    break;
                }
            }
            if (!found) unique.push_back(x);
        }
        return unique.size();
    }
};
