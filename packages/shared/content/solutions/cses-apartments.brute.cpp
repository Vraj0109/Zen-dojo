#include <vector>
#include <algorithm>
#include <cmath>

class Solution {
public:
    int apartments(std::vector<int>& applicants, std::vector<int>& apartments, int k) {
        std::sort(applicants.begin(), applicants.end());
        std::sort(apartments.begin(), apartments.end());
        int i = 0, j = 0, count = 0;
        while (i < applicants.size() && j < apartments.size()) {
            if (std::abs(applicants[i] - apartments[j]) <= k) {
                count++;
                i++;
                j++;
            } else if (applicants[i] < apartments[j]) {
                i++;
            } else {
                j++;
            }
        }
        return count;
    }
};
